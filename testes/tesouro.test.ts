import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { Ajustes, Construcoes, Economia, Exercitos, Provincias } from '../src/dados/esquema';
import { Campanha } from '../src/campanha/campanha';
import { Atlas } from '../src/mundo/atlas';

function ler<T>(esquema: { parse: (v: unknown) => T }, caminho: string): T {
  return esquema.parse(JSON.parse(readFileSync(resolve(caminho), 'utf8')));
}

const provincias = ler(Provincias, 'assets/mundo/provincias.json');
const economia = ler(Economia, 'dados/economia.json');
const construcoes = ler(Construcoes, 'dados/construcoes.json');
const exercitos = ler(Exercitos, 'dados/exercitos.json');
const ajustes = ler(Ajustes, 'dados/ajustes.json').jogo;

function nova(): Campanha {
  return new Campanha(new Atlas(provincias), economia, construcoes, ajustes, exercitos);
}

function emCampanha(): Campanha {
  const c = nova();
  c.comecar('atenas');
  return c;
}

/**
 * O tesouro por poder.
 *
 * ⚠️ Era um número só, o do jogador, e isso teria dado à IA um exército de graça: sem
 * cofre próprio ela recrutaria e manteria tropa sem nada sair de lugar nenhum. Ver
 * `DECISOES.md` #63 e #97 — a IA joga pelas mesmas regras, e a primeira delas é que
 * dinheiro acaba.
 */

describe('todo poder tem cofre, não só o jogador', () => {
  it('os 148 começam com o tesouro inicial', () => {
    const c = nova();
    for (const id of ['atenas', 'eleusis', 'tanagra', 'esparta', 'tebas']) {
      expect(c.tesouroDe(id)).toBe(ajustes.tesouroInicial);
    }
  });

  it('o tesouro do JOGADOR continua sendo o que a interface lê', () => {
    const c = emCampanha();
    expect(c.tesouro).toBe(c.tesouroDe('atenas'));
    // Antes de escolher um poder não há de quem falar.
    expect(nova().tesouro).toBe(0);
  });

  it('poder que nunca teve entrada vale zero, e não `undefined`', () => {
    expect(nova().tesouroDe('poder-que-nao-existe')).toBe(0);
  });
});

describe('a renda entra no cofre de cada poder', () => {
  it('Elêusis e Tanagra arrecadam sozinhas, mesmo sem ninguém jogando com elas', () => {
    const c = emCampanha();
    const antes = {
      atenas: c.tesouroDe('atenas'),
      eleusis: c.tesouroDe('eleusis'),
      tanagra: c.tesouroDe('tanagra'),
    };
    const renda = {
      atenas: c.rendaDe('atenas'),
      eleusis: c.rendaDe('eleusis'),
      tanagra: c.rendaDe('tanagra'),
    };

    c.passarTurno();

    // Cada um recebe a SUA renda. Antes só o jogador arrecadava.
    expect(c.tesouroDe('eleusis')).toBe(antes.eleusis + renda.eleusis - manutencao(c, 'eleusis'));
    expect(c.tesouroDe('tanagra')).toBe(antes.tanagra + renda.tanagra - manutencao(c, 'tanagra'));
    expect(c.tesouroDe('atenas')).toBe(antes.atenas + renda.atenas);
    expect(renda.eleusis).toBeGreaterThan(0);
  });

  it('poder sem economia configurada não arrecada nada', () => {
    const c = emCampanha();
    const antes = c.tesouroDe('esparta');
    c.passarTurno();
    expect(c.rendaDe('esparta')).toBe(0);
    expect(c.tesouroDe('esparta')).toBe(antes);
  });
});

describe('a manutenção é cobrada de todos, pela mesma regra', () => {
  it('a guarnição de Elêusis sai do cofre de Elêusis', () => {
    const c = emCampanha();
    // Elêusis abre com 500 homens de guarnição: 500 × 0,3 por turno.
    expect(c.forcaEm('eleusis')).toBe(500);
    const devido = manutencao(c, 'eleusis');
    expect(devido).toBeGreaterThan(0);

    const antes = c.tesouroDe('eleusis');
    const renda = c.rendaDe('eleusis');
    c.passarTurno();

    expect(c.tesouroDe('eleusis')).toBe(antes + renda - devido);
  });

  it('quem fica sem caixa vê a tropa desertar — e não precisa ser o jogador', () => {
    const c = emCampanha();
    // Zera o cofre de Tanagra: a renda dela não cobre a folha dos 500 homens.
    c.darOuro(-c.tesouroDe('tanagra'), 'tanagra');
    expect(c.tesouroDe('tanagra')).toBe(0);
    expect(c.rendaDe('tanagra')).toBeLessThan(manutencao(c, 'tanagra'));

    c.passarTurno();

    // A mesma regra do jogador: o cofre nunca fica negativo e o exército encolhe.
    expect(c.tesouroDe('tanagra')).toBe(0);
    expect(c.forcaEm('tanagra')).toBeLessThan(500);
    expect(c.forcaEm('tanagra')).toBeGreaterThan(0); // encolhe aos poucos, não colapsa
  });

  it('o cofre do jogador não paga a folha alheia', () => {
    const c = emCampanha();
    c.darOuro(-c.tesouroDe('tanagra'), 'tanagra');
    const doJogador = c.tesouro;
    const renda = c.rendaDe('atenas');
    c.passarTurno();
    // Atenas não tem tropa e não gasta nada com a de Tanagra.
    expect(c.tesouro).toBe(doJogador + renda);
  });
});

describe('gastar cobra o cofre do DONO da província', () => {
  it('recrutar consome o tesouro de quem manda ali', () => {
    const c = emCampanha();
    c.darOuro(60_000);
    c.construir('atenas', 'quartel');
    for (let i = 0; i < 2; i++) c.passarTurno();

    const antes = c.tesouro;
    const deEleusis = c.tesouroDe('eleusis');
    c.recrutar('atenas', 100);

    expect(c.tesouro).toBeLessThan(antes);
    expect(c.tesouroDe('eleusis')).toBe(deEleusis); // o vizinho não paga a leva alheia
  });

  it('construir e investir também saem do cofre do dono', () => {
    const c = emCampanha();
    c.darOuro(60_000);
    const antes = c.tesouro;
    const deEleusis = c.tesouroDe('eleusis');

    c.construir('atenas', 'agora');
    c.investir('atenas', 250);

    const custo = construcoes.construcoes['agora']?.custo ?? 0;
    expect(c.tesouro).toBe(antes - custo - 250);
    expect(c.tesouroDe('eleusis')).toBe(deEleusis);
  });

  it('o teto da leva olha o ouro do dono, não o do jogador', () => {
    const c = emCampanha();
    c.darOuro(60_000);
    // Atenas ficou rica; Elêusis não. O teto de Elêusis não pode subir junto.
    const emAtenas = c.maximoParaLevaEm('atenas');
    const emEleusis = c.maximoParaLevaEm('eleusis');
    expect(emAtenas).toBeGreaterThan(emEleusis);
  });
});

/** A folha militar que este poder deve neste instante. */
function manutencao(c: Campanha, idPoder: string): number {
  return c.manutencaoDe(idPoder);
}

describe('recrutar não depende de a província ter economia CONFIGURADA', () => {
  it('a recusa passa a falar de requisito real, não de dado que falta', () => {
    const c = emCampanha();
    // Tebas não tem ficha econômica. Tomada por Atenas, ela vira território do jogador.
    c.trocarDono('tebas', 'atenas');

    const r = c.podeRecrutar('tebas', 100);

    expect(r.pode).toBe(false);
    // ⚠️ Antes a recusa era "esta província não tem economia configurada" — uma trava
    // conceitual errada: recrutar depende de GENTE, não de a ficha existir.
    // Ver `DECISOES.md` #89.
    expect(r.pode === false && r.motivo).not.toMatch(/economia/);
    // O que barra agora é um requisito de verdade: falta Quartel (e, atrás dele, gente).
    expect(r.pode === false && r.motivo).toMatch(/Quartel/);
  });

  it('província alheia continua barrada, e por ser alheia', () => {
    const c = emCampanha();
    const r = c.podeRecrutar('eleusis', 100);
    expect(r.pode).toBe(false);
    expect(r.pode === false && r.motivo).toMatch(/não é sua/);
  });

  it('investir e construir CONTINUAM exigindo economia: ali a trava é real', () => {
    const c = emCampanha();
    c.trocarDono('tebas', 'atenas');
    c.darOuro(60_000);
    // Sem ficha econômica não há renda para incrementar nem parcela para multiplicar.
    expect(c.podeInvestir('tebas', 250).pode).toBe(false);
    expect(c.podeAgirEm('tebas').pode).toBe(false);
  });
});
