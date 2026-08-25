/**
 * Da altitude à vazão: reduz o terreno para a malha, preenche as depressões numéricas com
 * Priority Flood e acumula a chuva de cada célula até o mar.
 *
 * O resultado são cursos que obedecem ao relevo — e é por isso que eles podem virar
 * travessias, pontes e modificadores de marcha mais tarde.
 */

import type { Terreno } from '../pintar-terreno/terreno';
import { FilaPrioridade } from './fila-prioridade';
import { RESOLUCAO_DRENAGEM, VIZINHOS, indiceVizinho } from './malha';

export function reduzirTerreno(terreno: Terreno): {
  terra: Uint8Array;
  altitude: Float32Array;
} {
  const terra = new Uint8Array(RESOLUCAO_DRENAGEM * RESOLUCAO_DRENAGEM);
  const altitude = new Float32Array(terra.length);
  for (let y = 0; y < RESOLUCAO_DRENAGEM; y++) {
    const sy = Math.min(
      terreno.resolucao - 1,
      Math.floor(((y + 0.5) / RESOLUCAO_DRENAGEM) * terreno.resolucao),
    );
    for (let x = 0; x < RESOLUCAO_DRENAGEM; x++) {
      const sx = Math.min(
        terreno.resolucao - 1,
        Math.floor(((x + 0.5) / RESOLUCAO_DRENAGEM) * terreno.resolucao),
      );
      const origem = sy * terreno.resolucao + sx;
      const destino = y * RESOLUCAO_DRENAGEM + x;
      terra[destino] = terreno.terra[origem]!;
      altitude[destino] = terreno.altitude[origem]!;
    }
  }
  return { terra, altitude };
}

export function drenar(
  terra: Uint8Array,
  altitude: Float32Array,
): {
  jusante: Int32Array;
  saidaMar: Int32Array;
  acumulacao: Float32Array;
} {
  const lado = RESOLUCAO_DRENAGEM;
  const visitado = new Uint8Array(terra.length);
  const nivel = new Float32Array(terra.length);
  const jusante = new Int32Array(terra.length);
  const saidaMar = new Int32Array(terra.length);
  jusante.fill(-2);
  saidaMar.fill(-1);
  const ordem = new Int32Array(terra.length);
  let tamanhoOrdem = 0;
  const fila = new FilaPrioridade();

  // Toda célula costeira é uma saída possível. O algoritmo descobre qual bacia chega a ela.
  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      const i = y * lado + x;
      if (!terra[i]) continue;
      let mar = -1;
      for (const [dx, dy] of VIZINHOS) {
        const vizinho = indiceVizinho(x, y, dx, dy, lado);
        if (vizinho < 0 || !terra[vizinho]) {
          mar = vizinho;
          if (vizinho >= 0) break;
        }
      }
      if (mar === -1) continue;
      visitado[i] = 1;
      nivel[i] = altitude[i]!;
      jusante[i] = -1;
      saidaMar[i] = mar;
      fila.inserir(i, nivel[i]);
    }
  }

  while (!fila.vazia) {
    const [i, alturaAtual] = fila.retirar();
    ordem[tamanhoOrdem++] = i;
    const x = i % lado;
    const y = (i / lado) | 0;
    for (const [dx, dy] of VIZINHOS) {
      const vizinho = indiceVizinho(x, y, dx, dy, lado);
      if (vizinho < 0 || !terra[vizinho] || visitado[vizinho]) continue;
      visitado[vizinho] = 1;
      // O epsilon impede planícies perfeitamente empatadas de virarem ciclos.
      nivel[vizinho] = Math.max(altitude[vizinho]!, alturaAtual + 0.000002);
      jusante[vizinho] = i;
      fila.inserir(vizinho, nivel[vizinho]);
    }
  }

  const acumulacao = new Float32Array(terra.length);
  for (let i = 0; i < terra.length; i++) if (terra[i]) acumulacao[i] = 1;
  for (let o = tamanhoOrdem - 1; o >= 0; o--) {
    const i = ordem[o]!;
    const destino = jusante[i]!;
    if (destino >= 0) acumulacao[destino] = acumulacao[destino]! + acumulacao[i]!;
  }
  return { jusante, saidaMar, acumulacao };
}

