/**
 * O DECRETO DE IMPOSTO: a alavanca precisa dizer a verdade.
 *
 * ⚠️ **Nenhum número de balanço mora aqui.** O que estes testes prendem são as RELAÇÕES que
 * fazem a alavanca ser uma alavanca: cobrar mais entra mais dinheiro hoje; cobrar menos custa
 * hoje e paga depois; e o confisco sempre marca a data do levante. Se os fatores dobrarem
 * amanhã, nada aqui deve piscar.
 *
 * A queixa que deu origem: *"mudar entre imposto baixo, médio ou alto é uma mudança muito
 * fraca"*. Medido, era pior — desde que o humor multiplica a renda, o imposto alto era
 * NEGATIVO no equilíbrio em 6 das 25 províncias autorais, porque o fator incide sobre a
 * parcela do imposto (13% a 48% da renda) e o humor cobra sobre o total.
 */

import { describe, expect, it } from 'vitest';

import type { NivelDeImposto } from '../src/campanha/economia';
import { novaCampanha } from './apoio/mundo';

const nova = (): ReturnType<typeof novaCampanha> => {
  const c = novaCampanha();
  c.comecar('atenas');
  return c;
};

describe('o decreto de imposto é uma alavanca de verdade', () => {
  it('cobrar mais entra mais dinheiro HOJE, em toda terra autoral', () => {
    const c = nova();
    for (const id of c.provinciasSimuladas) {
      const alto = c.previsaoDeImpostoEm(id, 'alto');
      const confisco = c.previsaoDeImpostoEm(id, 'confisco');
      expect(alto, id).not.toBeNull();
      expect(alto!.agora, `${id}: alto tem de render agora`).toBeGreaterThan(0);
      expect(confisco!.agora, `${id}: confisco rende mais que alto`).toBeGreaterThan(
        alto!.agora,
      );
    }
  });

  it('o imposto ALTO nunca é um prejuízo disfarçado no equilíbrio', () => {
    // ⚠️ É a regressão da queixa. Um botão que promete mais dinheiro e entrega menos é pior
    // que um botão fraco: o jogador aprende errado e o jogo não avisa.
    const c = nova();
    for (const id of c.provinciasSimuladas) {
      expect(c.previsaoDeImpostoEm(id, 'alto')!.assentado, id).toBeGreaterThanOrEqual(0);
    }
  });

  it('cobrar menos custa agora e paga quando o humor assenta', () => {
    const c = nova();
    for (const id of c.provinciasSimuladas) {
      const baixo = c.previsaoDeImpostoEm(id, 'baixo')!;
      expect(baixo.agora, `${id}: aliviar custa hoje`).toBeLessThan(0);
      expect(baixo.assentado, `${id}: e devolve depois`).toBeGreaterThan(baixo.agora);
    }
  });

  it('o CONFISCO sempre marca a data do levante; os outros não', () => {
    const c = nova();
    for (const id of c.provinciasSimuladas) {
      expect(c.previsaoDeImpostoEm(id, 'confisco')!.levanteEm, id).not.toBeNull();
      expect(c.previsaoDeImpostoEm(id, 'normal')!.levanteEm, id).toBeNull();
    }
  });

  it('o decreto muda a renda de verdade, e não só a previsão', () => {
    const c = nova();
    const antes = c.economiaDe('atenas')!.total;
    const previsto = c.previsaoDeImpostoEm('atenas', 'alto')!.agora;
    c.definirImposto('atenas', 'alto', 'atenas');
    expect(c.economiaDe('atenas')!.total - antes).toBeCloseTo(previsto, 6);
  });

  it('a régua é monótona: cada degrau cobra mais que o anterior', () => {
    const c = nova();
    const niveis: NivelDeImposto[] = ['baixo', 'normal', 'alto', 'confisco'];
    const rendas = niveis.map((n) => {
      c.definirImposto('atenas', n, 'atenas');
      return c.economiaDe('atenas')!.impostos;
    });
    for (let i = 1; i < rendas.length; i++) {
      expect(rendas[i]!, `${niveis[i]} > ${niveis[i - 1]}`).toBeGreaterThan(rendas[i - 1]!);
    }
  });
});
