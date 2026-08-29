/**
 * AS TRÊS RAZÕES DE GOSTAR DE ALGUÉM — e por que elas tiveram de existir.
 *
 * ⚠️ **A regressão que este arquivo existe para impedir tem número.** Medido antes delas:
 * **250 dos 306 pares de poderes ficavam em opinião ZERO para sempre**, 82% da mesa. A conta
 * do alvo tinha três parcelas positivas — comércio, pacto, tributo — e as três só chegam por
 * ASSINATURA; ninguém assina com quem não conhece. A única parcela que a geografia produzia
 * sozinha era *fronteira comum*, e ela é negativa. Resultado: quem não te encostava não tinha
 * como ter opinião nenhuma sobre ti, e a IA nunca fez uma proposta ao jogador em 150 turnos.
 *
 * O que se guarda aqui são as PROPRIEDADES, nunca os números: a régua de balanço vive em
 * `dados/ajustes.json` e Henrique a afina pelo editor.
 */

import { describe, expect, it } from 'vitest';

import { parcelasDaRelacao } from '../../src/campanha/diplomacia/relacao';
import type { SituacaoDaRelacao } from '../../src/campanha/diplomacia/relacao';
import { poderesDaIa } from '../../src/ia/ia';
import { ajustes, novaCampanha } from '../apoio/mundo';

const diplomacia = ajustes.diplomacia;

/** Dois reinos que não se conhecem: nenhum fato entre eles. */
const NEUTROS: SituacaoDaRelacao = {
  emGuerra: false,
  tregoa: 0,
  fronteira: 0,
  terrasTomadas: 0,
  temPacto: false,
  temAlianca: false,
  temAcordo: false,
  temTributo: false,
  reputacao: 0,
  mesmoPovo: false,
  inimigosComuns: 0,
  turnosDePaz: 0,
  diferencaDePorte: 0,
  amigosDoMeuInimigo: 0,
};

const alvo = (mudanca: Partial<SituacaoDaRelacao>): number =>
  parcelasDaRelacao({ ...NEUTROS, ...mudanca }, diplomacia).reduce((s, p) => s + p.pontos, 0);

const rotulos = (mudanca: Partial<SituacaoDaRelacao>): string[] =>
  parcelasDaRelacao({ ...NEUTROS, ...mudanca }, diplomacia).map((p) => p.rotulo);

describe('a mesa aproxima, e não só afasta', () => {
  it('existe aproximação SEM assinar nada e SEM encostar', () => {
    // ⚠️ **A propriedade que a mesa inteira depende.** Se um dia as três parcelas novas
    // sumirem, este teste falha e diz por quê: sem elas, dois reinos que não se tocam ficam
    // presos em zero, e zero reprova a IA na hora de abrir comércio.
    expect(alvo({ mesmoPovo: true })).toBeGreaterThan(0);
    expect(alvo({ inimigosComuns: 1 })).toBeGreaterThan(0);
    expect(alvo({ turnosDePaz: 500 })).toBeGreaterThan(0);
  });

  it('a mesma gente aproxima, gente diferente não afasta', () => {
    // Ser dório não é motivo para odiar um jônio: a tribo dá razão para gostar, e a falta
    // dela é indiferença — que é o que a base já diz.
    expect(alvo({ mesmoPovo: true })).toBeGreaterThan(alvo({}));
    expect(alvo({ mesmoPovo: false })).toBe(alvo({}));
  });

  it('o inimigo em comum aproxima, e tem teto', () => {
    expect(alvo({ inimigosComuns: 2 })).toBeGreaterThan(alvo({ inimigosComuns: 1 }));
    // Sem teto, uma guerra geral faria todo mundo amar todo mundo por aritmética.
    expect(alvo({ inimigosComuns: 99 })).toBe(alvo({ inimigosComuns: 50 }));
  });

  it('a paz cicatriza a fronteira com o tempo, e para de cicatrizar', () => {
    const vizinhosNovos = { fronteira: 4, turnosDePaz: 0 };
    const vizinhosAntigos = { fronteira: 4, turnosDePaz: 1000 };
    expect(alvo(vizinhosAntigos)).toBeGreaterThan(alvo(vizinhosNovos));
    // ⚠️ E ela tem teto: paz não vira amizade infinita só por durar.
    expect(alvo({ turnosDePaz: 100_000 })).toBe(alvo({ turnosDePaz: 1000 }));
  });

  it('em guerra não há paz que conte', () => {
    // A conta não pode se contradizer na cara do jogador: "em guerra −60" ao lado de
    // "paz de 40 décadas +6" seria a ficha dizendo duas coisas opostas sobre o mesmo par.
    expect(rotulos({ emGuerra: true, turnosDePaz: 400 }).some((r) => r.startsWith('paz'))).toBe(
      false,
    );
  });

  it('e no mapa de verdade isso tira a mesa da indiferença', () => {
    // ⚠️ Contra os dados do jogo, e não contra uma situação inventada: a tribo de cada poder
    // sai das fichas autorais, e é lá que a parcela precisa encontrar pares de fato.
    const c = novaCampanha();
    c.comecar('atenas');
    const poderes = [...poderesDaIa(c), 'atenas'].sort();
    let comAlgumaCoisa = 0;
    let pares = 0;
    for (const [i, a] of poderes.entries()) {
      for (const b of poderes.slice(i + 1)) {
        pares += 1;
        // Mais que a "indiferença", que entra sempre.
        if (c.parcelasDaRelacaoEntre(a, b).length > 1) comAlgumaCoisa += 1;
      }
    }
    // Antes das parcelas novas eram 56 de 306, e o resto era zero para sempre.
    expect(comAlgumaCoisa).toBeGreaterThan(pares / 4);
  });
});
