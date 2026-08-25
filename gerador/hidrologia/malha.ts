/**
 * A malha de drenagem: a grade reduzida em que os rios são calculados, e as réguas que
 * decidem o que vira rio.
 *
 * A altitude do terreno tem resolução de arte; para acumular chuva basta muito menos, e a
 * malha menor é o que torna o Priority Flood barato.
 */

export type Ponto = [number, number];

export interface Rio {
  pontos: Ponto[];
  /** Área de contribuição aproximada na malha, usada como força relativa do rio. */
  vazao: number;
  /** Largura máxima em pixels da arte do terreno. */
  largura: number;
}

export interface Hidrologia {
  versao: 1;
  resolucaoCalculo: number;
  rios: Rio[];
  lagoas: Array<{ contorno: Ponto[] }>;
}

export const RESOLUCAO_DRENAGEM = 1024;
export const VAZAO_MINIMA_FOZ = 820;
export const VAZAO_MINIMA_NASCENTE = 18;
export const MAXIMO_RIOS = 22;
export const DISTANCIA_MINIMA_FOZ = 30;
/** Folga que impede uma nascente ou trecho de morrer na borda artificial do mapa. */
export const FOLGA_MOLDURA = 14;

export const VIZINHOS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];

export function indiceVizinho(
  x: number,
  y: number,
  dx: number,
  dy: number,
  lado: number,
): number {
  const nx = x + dx;
  const ny = y + dy;
  return nx < 0 || ny < 0 || nx >= lado || ny >= lado ? -1 : ny * lado + nx;
}
