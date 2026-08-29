/**
 * O BLOQUEIO NAVAL — o cerco do mar, e a primeira razão para FICAR numa água.
 *
 * ⚠️ **Nenhum número de balanço mora aqui.** O que se prende são as RELAÇÕES: frota inimiga na
 * água que banha o cais fecha o cais; a paz não bloqueia nada; o cais fechado corta a ligação
 * marítima e o alcance do comércio; e embarcar continua livre, porque um bloqueio que também
 * trancasse o porto seria inquebrável.
 */

import { describe, expect, it } from 'vitest';

import { ajustes, ia, novaCampanha } from '../apoio/mundo';
import { estiloDe } from '../../src/ia/estilo';
import { bloqueiosEscolhidos } from '../../src/ia/guerra/bloquear';

/** A água entre Mégara e Salamina: ela banha os dois cais. */
function estreito(c: ReturnType<typeof novaCampanha>): string {
  const zona = c
    .vizinhasDe('salamina')
    .find((v) => c.ehMar(v) && c.vizinhasDe(v).includes('megara'));
  expect(zona).toBeDefined();
  return zona!;
}

/** Mégara com Porto nos dois lados: Salamina só chega à capital embarcando. */
function megaraComDoisPortos(): ReturnType<typeof novaCampanha> {
  const c = novaCampanha();
  c.comecar('atenas');
  c.darOuro(400_000, 'megara');
  c.construir('megara', 'porto', 'megara');
  c.construir('salamina', 'porto', 'megara');
  for (let i = 0; i < 6; i++) c.passarTurno();
  expect(c.temPortoEm('megara')).toBe(true);
  expect(c.temPortoEm('salamina')).toBe(true);
  return c;
}

describe('a frota inimiga na água fecha o cais', () => {
  it('em guerra ela bloqueia; em paz, é frota de passagem', () => {
    const c = megaraComDoisPortos();
    const zona = estreito(c);
    c.plantarHoste(zona, 'atenas', 800);

    // Em paz: ninguém fecha nada. É a mesma regra que deixa duas hostes dividirem uma terra.
    expect(c.emGuerra('atenas', 'megara')).toBe(false);
    expect(c.bloqueadaEm('megara')).toBe(false);

    c.declararGuerra('megara', 'atenas');
    expect(c.bloqueadaEm('megara')).toBe(true);
    expect(c.bloqueiamEm('megara')).toContain('atenas');
  });

  it('uma água só fecha os DOIS cais que ela banha', () => {
    const c = megaraComDoisPortos();
    c.plantarHoste(estreito(c), 'atenas', 800);
    c.declararGuerra('megara', 'atenas');
    expect(c.bloqueadaEm('megara')).toBe(true);
    expect(c.bloqueadaEm('salamina')).toBe(true);
  });

  it('a ilha ligada só por mar fica CORTADA quando o cais fecha', () => {
    const c = megaraComDoisPortos();
    // Com os dois portos abertos, a ilha manda o trânsito para o tesouro.
    expect(c.economiaDe('salamina')?.cortada).toBe(false);

    c.plantarHoste(estreito(c), 'atenas', 800);
    c.declararGuerra('megara', 'atenas');
    expect(c.economiaDe('salamina')?.cortada).toBe(true);
    expect(c.economiaDe('salamina')?.transito).toBe(0);
  });

  it('embarcar continua livre: um bloqueio que trancasse o cais seria inquebrável', () => {
    const c = megaraComDoisPortos();
    const zona = estreito(c);
    c.plantarHoste(zona, 'atenas', 800);
    c.declararGuerra('megara', 'atenas');
    const guarda = c.plantarHoste('megara', 'megara', 3000);
    // Sair do porto bloqueado é ATACAR quem o bloqueia, e a marcha aceita.
    expect(c.podeOrdenarMarcha(guarda, zona, 3000, 'megara').pode).toBe(true);
  });
});

describe('o cais fechado tira a mercadoria do mar', () => {
  it('o acordo que só existia por água para de render enquanto o bloqueio dura', () => {
    const c = megaraComDoisPortos();
    // Cálcis é da Eubeia: nenhuma terra dela encosta em Mégara, então a rota é só marítima.
    c.darOuro(400_000, 'calcis');
    c.construir('calcis', 'porto', 'calcis');
    for (let i = 0; i < 6; i++) c.passarTurno();
    expect(c.podeAcordarComercio('calcis', 'megara').pode).toBe(true);
    c.acordarComercio('calcis', 'megara');
    expect(c.rendaDeAcordos('megara')).toBeGreaterThan(0);

    c.plantarHoste(estreito(c), 'atenas', 800);
    c.declararGuerra('megara', 'atenas');
    // O papel continua assinado; a rota é que não existe mais.
    expect(c.acordosDe('megara')).toContain('calcis');
    expect(c.rendaDeAcordos('megara')).toBe(0);
  });
});

describe('a IA vai buscar a água que fecha cais', () => {
  it('com guerra e Porto dos dois lados, ela manda frota ao estreito', () => {
    const c = megaraComDoisPortos();
    c.darOuro(400_000, 'atenas');
    c.construir('atenas', 'porto', 'atenas');
    for (let i = 0; i < 6; i++) c.passarTurno();
    c.declararGuerra('megara', 'atenas');
    c.plantarHoste('atenas', 'atenas', 5000);

    const ordens = bloqueiosEscolhidos(c, 'atenas', estiloDe(ia, 'atenas'), ajustes.combate, new Set());
    const posta = ordens.find((o) => !o.manter);
    expect(posta).toBeDefined();
    expect(c.ehMar(posta!.destino)).toBe(true);
    expect(
      c.vizinhasDe(posta!.destino).some((v) => c.temPortoEm(v) && c.donoDe(v) === 'megara'),
    ).toBe(true);
  });

  it('e MANTÉM a frota que já está lá — sem isso o bloqueio duraria um turno', () => {
    // ⚠️ Para a retirada, hoste na água é hoste fora do reino, e "a terra deixou de ser
    // inimiga" é sempre verdade no mar: sem a reserva, ela seria chamada de volta.
    const c = megaraComDoisPortos();
    c.declararGuerra('megara', 'atenas');
    const frota = c.plantarHoste(estreito(c), 'atenas', 5000);
    const ordens = bloqueiosEscolhidos(c, 'atenas', estiloDe(ia, 'atenas'), ajustes.combate, new Set());
    expect(ordens.some((o) => o.hoste === frota && o.manter)).toBe(true);
  });
});
