/**
 * O crescimento: **cada província cresce da sua semente até esbarrar na vizinha, e subir
 * serra custa caro.**
 *
 * Dijkstra de muitas origens, só por terra. Por que não Voronoi simples: Voronoi mede
 * distância em linha reta e não sabe que existe montanha nem que existe mar. Ele cortaria o
 * Pindo pelo meio e deixaria uma província pular o estreito. Espalhar com custo dá fronteira
 * em cumeeira e ilha inteira pra um dono só — de graça.
 *
 * A fila é de Dial e não um heap: como todo passo custa entre 1 e `CUSTO_MAXIMO`, um anel de
 * baldes indexado pela distância ordena em tempo constante, e um heap binário aqui seria dez
 * vezes mais lento.
 */

import { CUSTO_MAXIMO } from './grade';
import type { Grade } from './grade';
import type { SementePlantada } from './sementes';

const INFINITO = 0x7fffffff;

/** Devolve o dono de cada pixel: índice da província, ou 0 para água e terra sem dono. */
export function crescerProvincias(
  grade: Grade,
  sementes: readonly SementePlantada[],
): Uint16Array {
  const { largura: L, altura: A, celulas, custo } = grade;
  const distancia = new Int32Array(celulas).fill(INFINITO);
  const dono = new Uint16Array(celulas);

  const BALDES = CUSTO_MAXIMO + 1;
  const anel: number[][] = Array.from({ length: BALDES }, () => []);
  let pendentes = 0;
  const enfileirar = (indice: number, d: number): void => {
    anel[d % BALDES]!.push(indice);
    pendentes++;
  };

  for (const { indice, pixel, semente } of sementes) {
    if (distancia[pixel] !== INFINITO) {
      console.warn(`  duas sementes no mesmo pixel: ${semente.nome}`);
    }
    distancia[pixel] = 0;
    dono[pixel] = indice;
    enfileirar(pixel, 0);
  }

  let atual = 0;
  let visitados = 0;
  while (pendentes > 0) {
    const balde = anel[atual % BALDES]!;
    if (balde.length === 0) {
      atual++;
      continue;
    }
    const fila = balde.splice(0, balde.length);
    pendentes -= fila.length;
    for (const i of fila) {
      if (distancia[i]! !== atual) continue; // entrada velha, já melhorada
      visitados++;
      const x = i % L;
      const y = (i - x) / L;
      const meuDono = dono[i]!;
      for (let lado = 0; lado < 4; lado++) {
        const px = x + (lado === 0 ? -1 : lado === 1 ? 1 : 0);
        const py = y + (lado === 2 ? -1 : lado === 3 ? 1 : 0);
        if (px < 0 || py < 0 || px >= L || py >= A) continue;
        const j = py * L + px;
        const passo = custo[j]!;
        if (passo === 0) continue; // água: ninguém cresce por cima
        const nova = atual + passo;
        if (nova < distancia[j]!) {
          distancia[j] = nova;
          dono[j] = meuDono;
          enfileirar(j, nova);
        }
      }
    }
  }
  console.log(`crescimento terminado: ${visitados} pixels alcançados`);
  return dono;
}
