/**
 * A EXPEDIÇÃO ESCOLHE PELA VIAGEM, e a casa em chamas só tranca o CAIS.
 *
 * Fase 2 do naval. Duas regras pequenas, e as duas saíram de medição: o alvo da travessia passou
 * a ser o melhor POR TRECHO em vez do mais rico do mapa, e a trava da casa em chamas voltou a
 * ser o que o texto dela sempre disse — *"o pior momento possível para ZARPAR"* — em vez de
 * cancelar a frota que já estava no meio do Egeu.
 *
 * ⚠️ **Nenhum número de balanço mora aqui.** O que se prende são as RELAÇÕES: a frota escolhe o
 * que alcança, o primeiro trecho é sempre uma ordem que a tela também daria, e o inimigo em
 * casa fecha o cais sem afundar a viagem.
 */

import { describe, expect, it } from 'vitest';

import { estiloDe } from '../../src/ia/estilo';
import { travessiasEscolhidas } from '../../src/ia/guerra/marchar';
import { ajustes, ia, novaCampanha } from '../apoio/mundo';

const combate = ajustes.combate;
const semOrdens = new Set<string>();

/** Mégara com Porto de pé e guerra com Cálcis, que só se alcança embarcando. */
function megaraComPorto(): ReturnType<typeof novaCampanha> {
  const c = novaCampanha();
  c.comecar('atenas');
  c.darOuro(90_000, 'megara');
  c.construir('megara', 'porto', 'megara');
  for (let i = 0; i < 4; i++) c.passarTurno();
  if (!c.emGuerra('megara', 'calcis')) c.declararGuerra('calcis', 'megara');
  return c;
}

/** A água que encosta na ilha — tirada do mapa, não escrita à mão. */
function aguaDeCalcis(c: ReturnType<typeof novaCampanha>): string {
  const zona = c.vizinhasDe('calcis').find((v) => c.ehMar(v));
  expect(zona).toBeDefined();
  return zona!;
}

describe('a travessia põe a VIAGEM na conta do alvo', () => {
  it('o primeiro trecho é uma ordem legal, e ele encosta em casa', () => {
    const c = megaraComPorto();
    const estilo = estiloDe(ia, 'megara');
    c.plantarHoste('megara', 'megara', 6000);
    const ordens = travessiasEscolhidas(c, 'megara', estilo, combate, semOrdens);
    expect(ordens.length).toBeGreaterThan(0);
    const ordem = ordens[0]!;
    // A decisão passa pela mesma porta que a tela: nada de rota que a marcha recusaria.
    expect(c.podeOrdenarMarcha(ordem.hoste, ordem.destino, ordem.homens, 'megara').pode).toBe(
      true,
    );
    // E ela não zarpa para o outro lado do mapa: o destino de hoje encosta na terra de onde saiu.
    expect(c.vizinhasDe(ordem.destino)).toContain('megara');
  });
});

describe('casa em chamas fecha o cais, não afunda a viagem', () => {
  it('com inimigo pisando em casa, quem está na água SEGUE e quem está no cais FICA', () => {
    const c = megaraComPorto();
    const estilo = estiloDe(ia, 'megara');
    const noCais = c.plantarHoste('megara', 'megara', 6000);
    const naAgua = c.plantarHoste(aguaDeCalcis(c), 'megara', 6000);
    // Um inimigo pisando em terra de Mégara: a casa está pegando fogo.
    c.plantarHoste('megara', 'calcis', 400);

    const ordens = travessiasEscolhidas(c, 'megara', estilo, combate, semOrdens);
    expect(ordens.some((o) => o.hoste === naAgua)).toBe(true);
    expect(ordens.some((o) => o.hoste === noCais)).toBe(false);
  });
});
