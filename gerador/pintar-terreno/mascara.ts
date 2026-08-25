/**
 * A máscara de terra: rasterizar a costa, medir distância até ela, e CURAR o recorte.
 *
 * ⚠️ A cura é morfologia clássica feita aqui na origem: tudo mais — pintura, navegação,
 * altitude, rios, árvores — é derivado da máscara e herda a correção de graça. Corrigir
 * cada consumidor depois seria corrigir a mesma coisa cinco vezes, e mal.
 */

import { createNoise2D } from 'simplex-noise';

import { ruidoSemente } from './campos';
import type { Anel } from './terreno';

export function rasterizarTerra(aneis: Anel[], resolucao: number, tamanhoMundo: number): Uint8Array {
  const mascara = new Uint8Array(resolucao * resolucao);
  const escala = resolucao / tamanhoMundo;
  const cruzamentos: number[] = [];

  for (let linha = 0; linha < resolucao; linha++) {
    const y = (linha + 0.5) / escala;
    cruzamentos.length = 0;
    for (const anel of aneis) {
      for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
        const a = anel[i]!;
        const b = anel[j]!;
        if (a[1] > y === b[1] > y) continue;
        cruzamentos.push(a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      }
    }
    cruzamentos.sort((p, q) => p - q);
    for (let k = 0; k + 1 < cruzamentos.length; k += 2) {
      const inicio = Math.max(0, Math.ceil(cruzamentos[k]! * escala - 0.5));
      const fim = Math.min(resolucao - 1, Math.floor(cruzamentos[k + 1]! * escala - 0.5));
      for (let x = inicio; x <= fim; x++) mascara[linha * resolucao + x] = 1;
    }
  }
  return mascara;
}

/**
 * Distância até a costa, em pixels, com sinal: positiva em terra, negativa na água.
 * Duas passadas de chamfer — barato e suficiente pra praia, mar raso e linha de tinta.
 */
export function distanciaDaCosta(mascara: Uint8Array, resolucao: number): Float32Array {
  const LONGE = 1e9;
  const dentro = new Float32Array(mascara.length);
  const fora = new Float32Array(mascara.length);
  for (let i = 0; i < mascara.length; i++) {
    dentro[i] = mascara[i] ? LONGE : 0;
    fora[i] = mascara[i] ? 0 : LONGE;
  }

  const varrer = (d: Float32Array): void => {
    for (let y = 0; y < resolucao; y++) {
      for (let x = 0; x < resolucao; x++) {
        const i = y * resolucao + x;
        let melhor = d[i]!;
        if (x > 0) melhor = Math.min(melhor, d[i - 1]! + 1);
        if (y > 0) melhor = Math.min(melhor, d[i - resolucao]! + 1);
        if (x > 0 && y > 0) melhor = Math.min(melhor, d[i - resolucao - 1]! + 1.4142);
        if (x < resolucao - 1 && y > 0) melhor = Math.min(melhor, d[i - resolucao + 1]! + 1.4142);
        d[i] = melhor;
      }
    }
    for (let y = resolucao - 1; y >= 0; y--) {
      for (let x = resolucao - 1; x >= 0; x--) {
        const i = y * resolucao + x;
        let melhor = d[i]!;
        if (x < resolucao - 1) melhor = Math.min(melhor, d[i + 1]! + 1);
        if (y < resolucao - 1) melhor = Math.min(melhor, d[i + resolucao]! + 1);
        if (x < resolucao - 1 && y < resolucao - 1)
          melhor = Math.min(melhor, d[i + resolucao + 1]! + 1.4142);
        if (x > 0 && y < resolucao - 1) melhor = Math.min(melhor, d[i + resolucao - 1]! + 1.4142);
        d[i] = melhor;
      }
    }
  };

  varrer(dentro);
  varrer(fora);

  const saida = new Float32Array(mascara.length);
  for (let i = 0; i < mascara.length; i++) saida[i] = mascara[i] ? dentro[i]! : -fora[i]!;
  return saida;
}


// A cura é morfologia clássica sobre a máscara, feita aqui na origem: tudo mais (pintura,
// navegação, altitude, rios, árvores) é derivado dela e herda a correção de graça.

/** Fecha canais de água mais estreitos que 2× isto. Vira ponte de terra caminhável. */
const RAIO_FECHAMENTO = 6;
/** Remove línguas de terra mais estreitas que 2× isto. Menor que o fechamento, pra as
 *  pontes recém-criadas não serem desfeitas em seguida. */
const RAIO_ABERTURA = 3;
/** Quanto a borda de um recorte autoral ondula, em unidades de mundo. */
const AMPLITUDE_RECORTE = 95;
/** Comprimento de onda dessa ondulação. */
const ONDA_RECORTE = 520;

/** Engorda a terra: água a menos de `raio` de terra vira terra. */
function dilatar(mascara: Uint8Array, resolucao: number, raio: number): Uint8Array {
  const d = distanciaDaCosta(mascara, resolucao);
  const saida = new Uint8Array(mascara.length);
  for (let i = 0; i < mascara.length; i++) saida[i] = d[i]! > -raio ? 1 : 0;
  return saida;
}

/** Encolhe a terra: só continua terra o que está a mais de `raio` da água. */
function erodir(mascara: Uint8Array, resolucao: number, raio: number): Uint8Array {
  const d = distanciaDaCosta(mascara, resolucao);
  const saida = new Uint8Array(mascara.length);
  for (let i = 0; i < mascara.length; i++) saida[i] = d[i]! > raio ? 1 : 0;
  return saida;
}

export function limparIstmos(mascara: Uint8Array, resolucao: number): Uint8Array {
  // fechar primeiro: engorda e volta ao tamanho, mas o que se juntou fica junto
  const fechado = erodir(dilatar(mascara, resolucao, RAIO_FECHAMENTO), resolucao, RAIO_FECHAMENTO);
  // abrir depois: encolhe e volta, mas o que era fio já morreu no encolhimento
  return dilatar(erodir(fechado, resolucao, RAIO_ABERTURA), resolucao, RAIO_ABERTURA);
}

/**
 * Recortes autorais: onde o desenhista manda ter mar, tem mar.
 *
 * O gerador produz geografia plausível, não geografia BOA. Às vezes duas massas de terra
 * se emendam num canto e o mar central deixa de ser mar; às vezes falta um estreito onde
 * o jogo precisa de um gargalo. Isto é a última palavra sobre a máscara — vem depois de
 * toda a limpeza automática, senão o fechamento de istmos refecharia o que se abriu.
 */
export function esculpirMar(
  mascara: Uint8Array,
  recortes: readonly Anel[],
  resolucao: number,
  tamanhoMundo: number,
): Uint8Array {
  if (recortes.length === 0) return mascara;
  const escala = resolucao / tamanhoMundo;

  // A borda do polígono é reta, e costa reta denuncia a mão do desenhista na hora. Em vez
  // de suavizar depois (o que refecharia o corte), a gente empurra o PONTO DE TESTE por um
  // campo de ruído: o polígono continua sendo um polígono, mas o litoral que ele produz
  // sai ondulado como qualquer outro.
  const ondaX = createNoise2D(ruidoSemente(15_881));
  const ondaY = createNoise2D(ruidoSemente(62_119));

  for (const recorte of recortes) {
    if (recorte.length < 3) continue;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const [x, y] of recorte) {
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
    const inicioX = Math.max(0, Math.floor(x0 * escala));
    const fimX = Math.min(resolucao - 1, Math.ceil(x1 * escala));
    const inicioY = Math.max(0, Math.floor(y0 * escala));
    const fimY = Math.min(resolucao - 1, Math.ceil(y1 * escala));

    for (let py = inicioY; py <= fimY; py++) {
      const y = (py + 0.5) / escala;
      for (let px = inicioX; px <= fimX; px++) {
        const bruto = (px + 0.5) / escala;
        const u = bruto / ONDA_RECORTE;
        const v = y / ONDA_RECORTE;
        const x = bruto + ondaX(u, v) * AMPLITUDE_RECORTE;
        const yOndulado = y + ondaY(u, v) * AMPLITUDE_RECORTE;
        let dentro = false;
        for (let i = 0, j = recorte.length - 1; i < recorte.length; j = i++) {
          const a = recorte[i]!;
          const b = recorte[j]!;
          if (
            a[1] > yOndulado !== b[1] > yOndulado &&
            x < ((b[0] - a[0]) * (yOndulado - a[1])) / (b[1] - a[1]) + a[0]
          ) {
            dentro = !dentro;
          }
        }
        if (dentro) mascara[py * resolucao + px] = 0;
      }
    }
  }
  return mascara;
}
