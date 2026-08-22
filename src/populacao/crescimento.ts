/**
 * Crescimento populacional puro: não conhece campanha, tesouro, mapa ou interface.
 *
 * ⚠️ **NÃO existe capacidade máxima artificial.** Havia: o teto era `população inicial × 2`,
 * e a curva era logística contra ele. Saiu por decisão (`DECISOES.md` #24) — um número
 * arbitrário amarrado ao dado autoral de 700 a.C. não é um limite do mundo, é um limite
 * da planilha, e ele congelava a província justamente quando ela ia bem.
 *
 * ⚠️ **Consequência que é preciso saber: hoje o crescimento é EXPONENCIAL e não tem
 * freio.** O freio verdadeiro é o alimento, que ainda não existe — é a Etapa 4 do
 * `PATCH_ATUAL.md`. Até lá, uma partida muito longa infla a população. É estado
 * intermediário conhecido, não descuido.
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
 * A taxa é aplicada direta sobre quem está vivo, sem freio nenhum. O freio será o
 * alimento (Etapa 4).
 *
 * ⚠️ **Zero não se repovoa sozinho**, e isso é o que dá sentido ao piso de
 * `populacaoMinima` do recrutamento: `Math.floor` faz o crescimento arredondar pra zero
 * abaixo de ~101 habitantes, e dali a província nunca mais volta.
 */
export function calcularCrescimentoPopulacional(
  atual: number,
  construcoes: readonly string[],
  catalogo: Catalogo,
  ajustes: AjustesPopulacao,
): CrescimentoPopulacional {
  const populacaoAtual = Math.max(0, Math.floor(atual));
  const fatorConstrucoes = fatorDeCrescimento(construcoes, catalogo);

  const crescimento =
    populacaoAtual === 0
      ? 0
      : Math.floor(populacaoAtual * ajustes.taxaNatural * fatorConstrucoes);

  return {
    atual: populacaoAtual,
    crescimento,
    proxima: populacaoAtual + crescimento,
    fatorConstrucoes,
  };
}
