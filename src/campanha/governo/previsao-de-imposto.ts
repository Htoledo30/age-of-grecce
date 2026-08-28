/**
 * O que este decreto de imposto faz com o dinheiro DESTA terra — agora e depois.
 *
 * ⚠️ **Existe porque o botão estava mentindo.** O tooltip dizia "135% da arrecadação · humor
 * −8", e os dois números pareciam falar de coisas diferentes. Não falavam: desde que o humor
 * multiplica a renda, **cada ponto de humor vale 1% da renda inteira da província**, enquanto
 * o fator do imposto só incide sobre a PARCELA do imposto — que é 13% a 48% do total,
 * mediana 27%. Medido com os números antigos, o imposto alto era **negativo no equilíbrio em
 * 6 das 25 províncias autorais**: um botão que prometia mais dinheiro e entregava menos.
 *
 * Duas respostas porque são duas perguntas de verdade, e a diferença entre elas é a decisão:
 *
 * - **agora**: o que entra no cofre na próxima virada. O humor não se mexeu ainda.
 * - **assentado**: o que entra quando a província terminar de andar até o humor novo. É a
 *   conta que cobra o preço social — e é a que separa "cobrar mais" de "ganhar mais".
 *
 * A comparação do assentado é entre dois REGIMES ESTÁVEIS, como a das obras: o antes é esta
 * província parada no alvo de hoje, e não no humor de hoje. Comparar um regime com um
 * instante faria todo decreto parecer melhor do que é.
 */

import { rendaDaProvincia } from '../economia';
import type { BaseDaProvincia, NivelDeImposto } from '../economia';
import type { NucleoDaCampanha } from '../nucleo';
import { baseDe } from '../provincia/renda';
import { fichaDe } from '../provincia/consultas';
import { turnosAteOLevante } from '../felicidade';
import { alvoDeFelicidadeEm, fatorDoAlvoEm } from '../sociedade/humor';

/** O que um decreto muda na renda desta terra, em moedas por turno. */
export interface PrevisaoDeImposto {
  /** Na próxima virada, com o humor onde ele está hoje. */
  agora: number;
  /** Quando a província terminar de caminhar até o humor que o decreto cria. */
  assentado: number;
  /**
   * Em quantos turnos este decreto acende o levante. `null` quando ele não acende nenhum.
   *
   * ⚠️ **Sem isto o `assentado` do confisco seria ficção.** Ele responde "quanto rende quando
   * o humor parar de andar" — e sob confisco o humor não para: ele atravessa a faixa do
   * levante antes, a província pega em armas e a arrecadação vai a zero. Uma tela que
   * mostrasse só o assentado estaria prometendo um equilíbrio que nunca chega.
   */
  levanteEm: number | null;
}

export function previsaoDeImpostoEm(
  nucleo: NucleoDaCampanha,
  idProvincia: string,
  nivel: NivelDeImposto,
): PrevisaoDeImposto | null {
  const ficha = fichaDe(nucleo, idProvincia);
  if (!ficha) return null;

  const base = baseDe(nucleo, idProvincia);
  const renda = (b: BaseDaProvincia): number =>
    rendaDaProvincia(ficha, nucleo.economia.produtos, nucleo.catalogo, nucleo.ajustes.economia, b)
      .total;

  const fator = nucleo.ajustes.economia.imposto.niveis[nivel].fator;
  const noAlvoDeHoje = fatorDoAlvoEm(nucleo, idProvincia);
  const noAlvoComODecreto = fatorDoAlvoEm(nucleo, idProvincia, { comImposto: nivel });

  return {
    agora: renda({ ...base, fatorDeImposto: fator }) - renda(base),
    assentado:
      renda({ ...base, fatorDeImposto: fator, fatorDoHumor: noAlvoComODecreto }) -
      renda({ ...base, fatorDoHumor: noAlvoDeHoje }),
    levanteEm: turnosAteOLevante(
      alvoDeFelicidadeEm(nucleo, idProvincia, { comImposto: nivel }),
      nucleo.ajustes.felicidade,
    ),
  };
}
