/**
 * Escrever PNG, e a máscara que impede árvore de nascer dentro de um rio.
 *
 * ⚠️ A hidrologia é desenhada DEPOIS dos detalhes, então sem este bloqueio uma árvore
 * espalhada sobre o leito de um rio ficaria boiando na água na arte final.
 */

import { writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';

import type { Hidrologia } from '../hidrologia/malha';
import { RESOLUCAO_ALTURA, RESOLUCAO_TERRENO } from './moldura';

export function escreverPng(caminho: string, pixels: Uint8Array, largura: number, altura: number): void {
  const png = new PNG({ width: largura, height: altura });
  png.data = Buffer.from(pixels.buffer, pixels.byteOffset, pixels.byteLength);
  writeFileSync(caminho, PNG.sync.write(png));
}

/** As linhas superiores são contíguas em memória; não há reamostragem nem deformação. */
export function recortarRgba(pixels: Uint8Array): Uint8Array {
  return pixels.subarray(0, RESOLUCAO_TERRENO * RESOLUCAO_ALTURA * 4);
}


/**
 * Apaga da máscara de navegação tudo que é água corrente ou parada.
 *
 * A largura bloqueada acompanha a largura desenhada do rio, com um piso: um curso fino
 * demais na arte continuaria vazando o personagem pelo meio dele, o que pareceria bug.
 */
export function bloquearHidrologia(
  navegacao: Uint8Array,
  hidrologia: Hidrologia,
  resolucao: number,
  tamanhoMundo: number,
): void {
  const paraPixel = resolucao / tamanhoMundo;
  const LARGURA_MINIMA = 5;

  const apagar = (cx: number, cy: number, raio: number): void => {
    const inicioX = Math.max(0, Math.floor(cx - raio));
    const fimX = Math.min(resolucao - 1, Math.ceil(cx + raio));
    const inicioY = Math.max(0, Math.floor(cy - raio));
    const fimY = Math.min(resolucao - 1, Math.ceil(cy + raio));
    for (let y = inicioY; y <= fimY; y++) {
      for (let x = inicioX; x <= fimX; x++) {
        if ((x - cx) ** 2 + (y - cy) ** 2 > raio * raio) continue;
        const i = (y * resolucao + x) * 4;
        navegacao[i] = 0;
        navegacao[i + 1] = 0;
        navegacao[i + 2] = 0;
      }
    }
  };

  let bloqueados = 0;
  for (const rio of hidrologia.rios) {
    const raio = Math.max(LARGURA_MINIMA, rio.largura) / 2;
    for (let i = 1; i < rio.pontos.length; i++) {
      const a = rio.pontos[i - 1]!;
      const b = rio.pontos[i]!;
      const ax = a[0] * paraPixel;
      const ay = a[1] * paraPixel;
      const bx = b[0] * paraPixel;
      const by = b[1] * paraPixel;
      const passos = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay)));
      for (let p = 0; p <= passos; p++) {
        const t = p / passos;
        apagar(ax + (bx - ax) * t, ay + (by - ay) * t, raio);
      }
      bloqueados++;
    }
  }

  console.log(`hidrologia bloqueada na navegação: ${bloqueados} trechos de rio`);
}
