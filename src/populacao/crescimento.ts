/**
 * Crescimento populacional puro: não conhece campanha, tesouro, mapa ou interface.
 *
 * ⚠️ **NÃO existe capacidade máxima artificial.** Havia: o teto era `população inicial × 2`,
 * e a curva era logística contra ele. Saiu porque um número
 * arbitrário amarrado ao dado autoral de 700 a.C. não é um limite do mundo, é um limite
 * da planilha, e ele congelava a província justamente quando ela ia bem.
 *
 * ⚠️ **O freio é o ALIMENTO, e ele chega de fora**, como `fatorAlimento`. Reino farto
 * cresce mais rápido; reino faminto não cresce; reino em fome de verdade perde gente — mas
 * a perda acontece em `alimentacao.ts`, não aqui, porque quem morreu já morreu antes de a
 * população crescer. Este arquivo só sabe multiplicar.
 *
 * Zero não se repovoa sozinho: migração, conquista ou outro sistema futuro terão que
 * trazer gente.
 */

import type { Ajustes, Construcoes } from '@/dados/esquema';

type Catalogo = Construcoes['construcoes'];
type AjustesPopulacao = Ajustes['jogo']['populacao'];

export interface CrescimentoPopulacional {
  atual: number;
  crescimento: number;
  proxima: number;
  fatorConstrucoes: number;
  /** O que a mesa posta fez: >1 com folga de comida, <1 com fome, 0 com fome de verdade. */
  fatorAlimento: number;
}

/**
 * Curva logística discreta.
 *
 * A taxa é aplicada diretamente sobre quem está vivo. A disponibilidade de alimento
 * funciona como freio demográfico.
 *
 * ⚠️ **Zero não se repovoa sozinho**, e isso é o que dá sentido ao piso de
 * `populacaoMinima` do recrutamento: `Math.floor` faz o crescimento arredondar pra zero
 * abaixo de ~101 habitantes, e dali a província nunca mais volta.
 */
export function calcularCrescimentoPopulacional(
  atual: number,
  _construcoes: Readonly<Record<string, number>>,
  _catalogo: Catalogo,
  ajustes: AjustesPopulacao,
  fatorAlimento = 1,
): CrescimentoPopulacional {
  const populacaoAtual = Math.max(0, Math.floor(atual));
  const fatorConstrucoes = 1;

  const crescimento =
    populacaoAtual === 0
      ? 0
      : Math.floor(populacaoAtual * ajustes.taxaNatural * fatorConstrucoes * fatorAlimento);

  return {
    atual: populacaoAtual,
    crescimento,
    proxima: populacaoAtual + crescimento,
    fatorConstrucoes,
    fatorAlimento,
  };
}
