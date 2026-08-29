/**
 * A IA DISPUTA O MAR — ela sai da praia para barrar o desembarque.
 *
 * Fase 1 do naval, e a queixa que a abriu é de Henrique: *"essa ideia de ter guerras por
 * controle no mar é perfeito"*. Antes dela a batalha na água só acontecia quando duas
 * expedições se cruzavam por acaso — quem escolhia o lugar do desembarque era sempre o
 * invasor, e ele escolhia a terra mais fraca.
 *
 * ⚠️ **Nenhum número de balanço mora aqui.** O que se prende são as RELAÇÕES: sem Porto não se
 * disputa o mar; a água longe da minha costa não é problema meu; a paz não vira batalha na
 * água; e a hoste que já está defendendo em terra não é chamada duas vezes.
 */

import { describe, expect, it } from 'vitest';

import { defesasEscolhidas } from '../../src/ia/guerra/defender';
import { ajustes, novaCampanha } from '../apoio/mundo';

const batalha = ajustes.combate.batalha;

/** A água que separa Mégara de Salamina — encosta nas duas, e é por onde se invade. */
function aguaDeMegara(c: ReturnType<typeof novaCampanha>): string {
  const zona = c.vizinhasDe('salamina').find((v) => c.ehMar(v) && c.vizinhasDe(v).includes('megara'));
  expect(zona).toBeDefined();
  return zona!;
}

/** Mégara com Porto de pé — a porta do mar, e a condição de sair dele. */
function megaraComPorto(): ReturnType<typeof novaCampanha> {
  const c = novaCampanha();
  c.comecar('atenas');
  c.darOuro(90_000, 'megara');
  c.construir('megara', 'porto', 'megara');
  for (let i = 0; i < 4; i++) c.passarTurno();
  return c;
}

describe('a IA sai para o mar para barrar o desembarque', () => {
  it('expedição inimiga na água encostada na minha costa chama a guarda', () => {
    const c = megaraComPorto();
    const zona = aguaDeMegara(c);
    c.plantarHoste('megara', 'megara', 4000);
    c.plantarHoste(zona, 'atenas', 500);
    if (!c.emGuerra('megara', 'atenas')) c.declararGuerra('atenas', 'megara');

    const ordens = defesasEscolhidas(c, 'megara', batalha);
    const guarda = ordens.find((o) => o.tipo === 'intercepcao');
    expect(guarda?.destino).toBe(zona);
  });

  it('sem Porto ela vê a frota passar: quem não tem cais não disputa o mar', () => {
    const c = novaCampanha();
    c.comecar('atenas');
    const zona = aguaDeMegara(c);
    c.plantarHoste('megara', 'megara', 4000);
    c.plantarHoste(zona, 'atenas', 500);
    if (!c.emGuerra('megara', 'atenas')) c.declararGuerra('atenas', 'megara');

    expect(defesasEscolhidas(c, 'megara', batalha).some((o) => o.tipo === 'intercepcao')).toBe(
      false,
    );
  });

  it('a paz na água não vira batalha: sem guerra ela não sai', () => {
    const c = megaraComPorto();
    const zona = aguaDeMegara(c);
    c.plantarHoste('megara', 'megara', 4000);
    c.plantarHoste(zona, 'atenas', 500);
    expect(c.emGuerra('megara', 'atenas')).toBe(false);

    expect(defesasEscolhidas(c, 'megara', batalha).some((o) => o.tipo === 'intercepcao')).toBe(
      false,
    );
  });

  it('ela não sai para perder: expedição maior do que a guarda fica onde está', () => {
    const c = megaraComPorto();
    const zona = aguaDeMegara(c);
    c.plantarHoste('megara', 'megara', 300);
    c.plantarHoste(zona, 'atenas', 9000);
    if (!c.emGuerra('megara', 'atenas')) c.declararGuerra('atenas', 'megara');

    expect(defesasEscolhidas(c, 'megara', batalha).some((o) => o.tipo === 'intercepcao')).toBe(
      false,
    );
  });

  it('a ordem sai de verdade: a marcha para a água é aceita e a hoste chega lá', () => {
    const c = megaraComPorto();
    const zona = aguaDeMegara(c);
    const guarda = c.plantarHoste('megara', 'megara', 4000);
    c.plantarHoste(zona, 'atenas', 500);
    if (!c.emGuerra('megara', 'atenas')) c.declararGuerra('atenas', 'megara');

    const ordem = defesasEscolhidas(c, 'megara', batalha).find((o) => o.tipo === 'intercepcao')!;
    expect(ordem.hoste).toBe(guarda);
    c.ordenarMarcha(ordem.hoste, ordem.destino, ordem.homens, 'megara', 'sitiar');
    c.passarTurno();
    // Ela está na água, e o invasor não está mais: o encontro no mar é batalha.
    expect(c.hostes().some((h) => h.poder === 'megara' && h.posicao === zona)).toBe(true);
    expect(c.hostes().some((h) => h.poder === 'atenas' && h.posicao === zona)).toBe(false);
  });
});
