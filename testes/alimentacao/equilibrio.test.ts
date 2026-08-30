import { describe, expect, it } from 'vitest';

import type { Campanha } from '../../src/campanha/campanha';
import { ajustes } from '../apoio/mundo';
import { nova } from './apoio';

describe('o equilíbrio alimentar: crescer nunca pode virar fome', () => {
  it('Atenas abre APERTADA: muita gente numa terra pobre em cereal', () => {
    // ⚠️ É o retrato que os próprios dados pediam. A Ática tem 63.000 pessoas e produz 5
    // pontos de alimento; com a faixa de população pesando o tamanho de cada terra, ela
    // abre com a menor folga do mapa. O motivo de Maratona no economia.json diz por quê:
    // "a Ática era POBRE em cereal". Conquistar Elêusis passa a ser pão, não renda.
    const c = nova();
    const comida = c.alimentacao;
    const custo = c
      .provinciasDe('atenas')
      .reduce((soma, id) => soma + c.nivelPopulacionalEm(id), 0);

    expect(comida.subsistencia).toBe(ajustes.alimento.subsistenciaPorReino);
    expect(comida.populacao).toBe(custo);
    expect(comida.exercito).toBe(0);
    expect(comida.saldoCivil).toBe(comida.subsistencia + comida.producao - comida.populacao);
    expect(comida.saldo).toBe(comida.saldoCivil);
    // ⚠️ **No fio virou ZERO em 31/08/2026**, quando Henrique baixou `subsistenciaPorReino`
    // para 1: Atenas come exatamente o que a terra dá. Continua sendo a mais apertada do mapa —
    // a comparação com Argos, abaixo, é que guarda isso — mas agora sem um grão de folga, o que
    // significa que ela não cresce nem sustenta um soldado antes de erguer comida.
    expect(comida.saldo).toBe(0);
    expect(comida.saldo).toBeLessThan(c.balancoAlimentarDe('argos').saldo);
  });

  it('crescer nunca vira fome: 500 turnos de paz sem um único saldo negativo', () => {
    // É a trava preventiva em ação: o povo cresce até onde a comida alcança e PARA —
    // pode estacionar em 0 (No limite) ou num resto positivo que não dá pra ocupar sem
    // afundar (limitado pela alimentação). Nunca atravessa pro negativo sozinho.
    const campanha = nova();
    let menorSaldo = campanha.alimentacao.saldo;
    let mortes = 0;

    for (let turno = 0; turno < 500; turno++) {
      campanha.passarTurno();
      menorSaldo = Math.min(menorSaldo, campanha.alimentacao.saldo);
      mortes += campanha.fome.provincias.reduce((soma, p) => soma + p.mortos, 0);
    }

    expect(menorSaldo).toBeGreaterThanOrEqual(0);
    expect(mortes).toBe(0);
    expect(campanha.alimentacao.saldo).toBeGreaterThanOrEqual(0);
  });

  it('Fazenda NUNCA piora a fome: cem turnos com e sem, lado a lado', () => {
    // O critério que derrubou a regra antiga: a simulação mostrava 11 anos de fome e
    // 10.403 mortos POR CAUSA de uma Fazenda. Com a trava, ela só pode ajudar.
    const povoDe = (c: Campanha) =>
      c.provinciasDe('atenas').reduce((soma, id) => soma + c.populacaoDe(id), 0);
    const sem = nova();
    const com = nova();
    com.construir('atenas', 'fazenda');

    let turnosDeFomeSem = 0;
    let turnosDeFomeCom = 0;
    let mortesCom = 0;
    for (let turno = 0; turno < 100; turno++) {
      sem.passarTurno();
      com.passarTurno();
      if (sem.alimentacao.saldoCivil < 0) turnosDeFomeSem++;
      if (com.alimentacao.saldoCivil < 0) turnosDeFomeCom++;
      mortesCom += com.fome.provincias.reduce((soma, p) => soma + p.mortos, 0);
    }

    expect(turnosDeFomeCom).toBeLessThanOrEqual(turnosDeFomeSem);
    expect(mortesCom).toBe(0);
    // E ela entrega o que promete: mais gente vivendo da mesma terra.
    expect(povoDe(com)).toBeGreaterThanOrEqual(povoDe(sem));
  });

  it('conta alimento principal e secundário pelo nível natural', () => {
    const campanha = nova();
    expect(campanha.produtosAlimentaresEm('atenas')).toEqual([
      { id: 'graos', nome: 'Grãos', nivel: 2 },
    ]);
    expect(campanha.contribuicaoAlimentarEm('maratona')).toBe(3); // Grãos II + Gado I
    expect(campanha.contribuicaoAlimentarEm('sounion')).toBe(0);
  });

  it('o custo de várias hostes é calculado pelo total mobilizado', () => {
    // ⚠️ Somado ANTES de arredondar: dez hostes pequenas não pagam dez vezes. O degrau vem
    // do ajuste, não de um número decorado — mudar `soldadosPorPonto` não quebra o teste.
    const porPonto = ajustes.alimento.soldadosPorPonto;
    const campanha = nova();
    campanha.plantarHoste('atenas', 'atenas', Math.floor(porPonto / 2));
    campanha.plantarHoste('maratona', 'atenas', porPonto - Math.floor(porPonto / 2));
    expect(campanha.alimentacao.exercito).toBe(1);
    campanha.plantarHoste('sounion', 'atenas', 1);
    expect(campanha.alimentacao.exercito).toBe(2);
  });

});
