import { describe, expect, it } from 'vitest';

import {
  avaliarLeva,
  custoDaLeva,
  disponivelParaLeva,
  manutencaoDe,
  maximoDaLeva,
} from '../../src/combate/recrutamento';
import { unicaEm } from '../apoio/hostes';
import { ajustes, novaCampanha as nova } from '../apoio/mundo';
import { comQuartel } from './apoio';

const combate = ajustes.combate;

describe('recrutamento: as contas', () => {
  it('o custo e a manutenção saem dos ajustes, em inteiros', () => {
    expect(custoDaLeva(1000, combate)).toBe(1000 * combate.custoPorHomem);
    expect(manutencaoDe(1000, combate.manutencaoPorHomem.emCasa)).toBe(
      Math.round(1000 * combate.manutencaoPorHomem.emCasa),
    );
    expect(Number.isInteger(custoDaLeva(777, combate))).toBe(true);
    expect(Number.isInteger(manutencaoDe(777, combate.manutencaoPorHomem.emCampanha))).toBe(
      true,
    );
  });

  it('não impõe fração nem lote mínimo: o limite é a população MENOS o piso', () => {
    const piso = combate.populacaoMinima;
    const situacao = { populacao: 35_000, tesouro: 200_000, temQuartel: true };
    const cabe = 35_000 - piso;
    expect(avaliarLeva(1, situacao, combate)).toMatchObject({ pode: true, homens: 1 });
    expect(avaliarLeva(cabe, situacao, combate)).toMatchObject({ pode: true, homens: cabe });
    expect(avaliarLeva(cabe + 1, situacao, combate)).toMatchObject({
      motivo: /nunca saem daqui/,
    });
  });

  it('oferece como teto somente o que população e tesouro permitem pagar', () => {
    const pelaRiqueza = { populacao: 35_000, tesouro: 3_000 };
    expect(maximoDaLeva(pelaRiqueza, combate)).toBe(1000);

    const pelaPopulacao = {
      populacao: combate.populacaoMinima + 37,
      tesouro: 200_000,
    };
    expect(maximoDaLeva(pelaPopulacao, combate)).toBe(37);
    expect(maximoDaLeva({ ...pelaRiqueza, tesouro: 0 }, combate)).toBe(0);
  });

  it('no piso, a província para de ceder gente e diz por quê', () => {
    const piso = combate.populacaoMinima;
    const noPiso = { populacao: piso, tesouro: 200_000, temQuartel: true };
    expect(avaliarLeva(1, noPiso, combate)).toMatchObject({
      motivo: `esta província não cede mais gente: ela precisa manter ${piso.toLocaleString('pt-BR')} habitantes`,
    });
    // E abaixo do piso também — a conta nunca fica negativa.
    expect(disponivelParaLeva(piso - 500, combate)).toBe(0);
    expect(disponivelParaLeva(piso + 500, combate)).toBe(500);
  });
});

describe('o Quartel é o portão', () => {
  it('sem Quartel não se recruta, e a recusa diz isso', () => {
    const c = nova();
    c.comecar('atenas');
    expect(c.podeRecrutarEm('atenas')).toBe(true);
    expect(c.podeRecrutar('atenas', 500)).toMatchObject({ pode: true });
  });

  it('o Quartel não rende moeda e não é requisito para recrutar', () => {
    const c = comQuartel();
    // Não rende NADA: o ganho é exatamente a manutenção negativa, sem renda escondida.
    // `comQuartel` já ergueu o nível I, então a conta cotada é a do nível II: o ganho é a
    // folha NOVA menos a que já se paga, e não a folha inteira do nível II.
    expect(c.retornoDaConstrucaoEm('atenas', 'quartel')?.ganhoPorTurno).toBe(
      -(c.manutencaoDaObraEm('atenas', 'quartel', 2) - c.manutencaoDaObraEm('atenas', 'quartel', 1)),
    );
    expect(c.podeRecrutarEm('atenas')).toBe(true);
    expect(c.podeRecrutarEm('maratona')).toBe(true);
  });

  it('província que não é sua não aceita leva, e o motivo é esse', () => {
    const c = comQuartel();
    expect(c.podeRecrutar('esparta', 500)).toMatchObject({ pode: false });
  });
});

describe('recrutar custa ouro E população', () => {
  it('tira os homens da população da província e o ouro do tesouro', () => {
    const c = comQuartel();
    const tesouro = c.tesouro;
    const populacao = c.populacaoDe('atenas');

    c.recrutar('atenas', 1000);

    expect(c.tesouro).toBe(tesouro - custoDaLeva(1000, combate));
    expect(c.populacaoDe('atenas')).toBe(populacao - 1000);
    expect(c.forcaEm('atenas')).toBe(0);
    expect(unicaEm(c, 'atenas')).toBeUndefined();
    expect(c.formacaoEm('atenas')).toMatchObject({
      poder: 'atenas',
      homens: 1000,
      prontaNoTurno: c.turno + 1,
    });

    c.passarTurno();
    expect(c.formacaoEm('atenas')).toBeUndefined();
    expect(c.forcaEm('atenas')).toBe(1000);
    expect(unicaEm(c, 'atenas')?.poder).toBe('atenas');
  });

  it('quem está em armas deixa de ser tributado, e a renda cai na hora', () => {
    const c = comQuartel();
    const impostosAntes = c.economiaDe('atenas')?.impostos;

    c.recrutar('atenas', 1000);

    // Menos gente é menos imposto NA HORA — e um pouco menos de corrupção por tamanho,
    // então o novo valor sai da fórmula inteira em vez de uma subtração de cabeça.
    expect(c.economiaDe('atenas')?.impostos).toBe(
      Math.round(
        c.populacaoDe('atenas') *
          ajustes.economia.impostoPorHabitante *
          (1 - c.corrupcaoEm('atenas').total),
      ),
    );
    expect(c.economiaDe('atenas')?.impostos).toBeLessThan(impostosAntes ?? 0);
  });

  it('a ficha mostra a população de agora, não a inicial', () => {
    const c = comQuartel();
    const populacao = c.populacaoDe('atenas');
    c.recrutar('atenas', 2000);
    expect(c.economiaDe('atenas')?.populacao).toBe(populacao - 2000);
  });

  it('mobiliza até o piso, e ali para — a província nunca fica vazia', () => {
    const c = comQuartel();
    c.darOuro(200_000);
    const piso = combate.populacaoMinima;
    const populacao = c.populacaoDe('atenas');
    const cabe = populacao - piso;

    expect(c.podeRecrutar('atenas', cabe)).toMatchObject({ pode: true });
    expect(c.podeRecrutar('atenas', cabe + 1)).toMatchObject({ pode: false });

    c.recrutar('atenas', cabe);

    // O que protege de verdade: sem o piso, um império rico raspa a província até
    // abaixo de ~100 habitantes, e ali `Math.floor` no crescimento a mata para sempre.
    expect(c.populacaoDe('atenas')).toBe(piso);
    expect(c.podeRecrutar('atenas', 1)).toMatchObject({ motivo: /precisa manter/ });
  });

  it('aceita uma pessoa e recusa somente valor quebrado ou não positivo', () => {
    const c = comQuartel();
    expect(c.podeRecrutar('atenas', 1)).toMatchObject({ pode: true, homens: 1 });
    expect(c.podeRecrutar('atenas', 100.5)).toMatchObject({ motivo: /inteiro/ });
    expect(c.podeRecrutar('atenas', 0)).toMatchObject({ motivo: /inteiro/ });
  });

  it('recusa quando falta ouro, dizendo quanto falta', () => {
    const c = comQuartel();
    const cabe = Math.floor(c.tesouro / combate.custoPorHomem);
    const demais = cabe + 1;
    expect(c.podeRecrutar('atenas', demais)).toMatchObject({ motivo: /faltam .* moedas/ });
  });
});
