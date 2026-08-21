/**
 * Crescimento populacional puro: não conhece campanha, tesouro, mapa ou interface.
 *
 * A população inicial autoral define a capacidade da terra. Recrutamento altera a
 * população atual, não essa âncora; por isso uma província reduzida pode se recuperar,
 * mas não transforma investimento militar em capacidade infinita.
 */

import type { Ajustes, Construcoes } from '@/dados/esquema';

type Catalogo = Construcoes['construcoes'];
type AjustesPopulacao = Ajustes['jogo']['populacao'];

export interface CrescimentoPopulacional {
  atual: number;
  capacidade: number;
  crescimento: number;
  proxima: number;
  fatorConstrucoes: number;
}

/** Multiplicador combinado das obras que fortalecem o crescimento natural. */
function fatorDeCrescimento(construcoes: readonly string[], catalogo: Catalogo): number {
  let fator = 1;
  for (const id of construcoes) {
    const construcao = catalogo[id];
    if (!construcao) throw new Error(`construção inexistente na província: ${id}`);
    if (construcao.efeito.tipo === 'populacao') {
      fator *= construcao.efeito.fatorCrescimento;
    }
  }
  return fator;
}

/**
 * Curva logística discreta.
 *
 * Perto da capacidade, falta de espaço e alimento reduz o crescimento. Zero não se
 * repovoa sozinho: migração, conquista ou outro sistema futuro terão que trazer gente.
 */
export function calcularCrescimentoPopulacional(
  atual: number,
  inicial: number,
  construcoes: readonly string[],
  catalogo: Catalogo,
  ajustes: AjustesPopulacao,
): CrescimentoPopulacional {
  const capacidade = Math.floor(inicial * ajustes.fatorCapacidade);
  const populacaoAtual = Math.max(0, Math.min(Math.floor(atual), capacidade));
  const fatorConstrucoes = fatorDeCrescimento(construcoes, catalogo);

  if (populacaoAtual === 0 || populacaoAtual >= capacidade) {
    return {
      atual: populacaoAtual,
      capacidade,
      crescimento: 0,
      proxima: populacaoAtual,
      fatorConstrucoes,
    };
  }

  const espacoRelativo = 1 - populacaoAtual / capacidade;
  const bruto = populacaoAtual * ajustes.taxaNatural * espacoRelativo * fatorConstrucoes;
  const crescimento = Math.min(capacidade - populacaoAtual, Math.floor(bruto));

  return {
    atual: populacaoAtual,
    capacidade,
    crescimento,
    proxima: populacaoAtual + crescimento,
    fatorConstrucoes,
  };
}
