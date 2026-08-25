/**
 * Desenha os rios sobre a arte do terreno.
 *
 * O canal é misturado com a cor de baixo em vez de substituí-la: um rio pintado sólido
 * corta o relevo como uma tesoura, e a mistura deixa a margem pertencer à paisagem.
 */

import type { Terreno } from '../pintar-terreno/terreno';
import type { Hidrologia } from './malha';

function misturarCanal(
  pixels: Uint8Array,
  terra: Uint8Array,
  resolucao: number,
  x: number,
  y: number,
  raio: number,
  cor: readonly [number, number, number],
  opacidade: number,
): void {
  const minX = Math.max(0, Math.floor(x - raio - 1));
  const maxX = Math.min(resolucao - 1, Math.ceil(x + raio + 1));
  const minY = Math.max(0, Math.floor(y - raio - 1));
  const maxY = Math.min(resolucao - 1, Math.ceil(y + raio + 1));
  for (let py = minY; py <= maxY; py++) {
    for (let px = minX; px <= maxX; px++) {
      const i = py * resolucao + px;
      if (!terra[i]) continue;
      const cobertura = Math.max(
        0,
        Math.min(1, raio + 0.5 - Math.hypot(px + 0.5 - x, py + 0.5 - y)),
      );
      if (cobertura === 0) continue;
      const peso = cobertura * opacidade;
      const p = i * 4;
      pixels[p] = pixels[p]! + (cor[0] - pixels[p]!) * peso;
      pixels[p + 1] = pixels[p + 1]! + (cor[1] - pixels[p + 1]!) * peso;
      pixels[p + 2] = pixels[p + 2]! + (cor[2] - pixels[p + 2]!) * peso;
    }
  }
}

/** Assa os rios na pintura, mas conserva os vetores em hidrologia.json para o jogo. */
export function pintarHidrologia(
  terreno: Terreno,
  hidrologia: Hidrologia,
  tamanhoMundo: number,
): void {
  const paraPixel = terreno.resolucao / tamanhoMundo;
  for (const rio of hidrologia.rios) {
    for (let i = 1; i < rio.pontos.length; i++) {
      const a = rio.pontos[i - 1]!;
      const b = rio.pontos[i]!;
      const ax = a[0] * paraPixel;
      const ay = a[1] * paraPixel;
      const bx = b[0] * paraPixel;
      const by = b[1] * paraPixel;
      const comprimento = Math.hypot(bx - ax, by - ay);
      const passos = Math.max(1, Math.ceil(comprimento * 2));
      for (let passo = 0; passo <= passos; passo++) {
        const t = passo / passos;
        const progresso = (i - 1 + t) / Math.max(1, rio.pontos.length - 1);
        const raio = 0.38 + rio.largura * 0.5 * Math.pow(progresso, 0.62);
        const x = ax + (bx - ax) * t;
        const y = ay + (by - ay) * t;
        misturarCanal(
          terreno.pixels,
          terreno.terra,
          terreno.resolucao,
          x,
          y,
          raio + 0.35,
          [62, 76, 68],
          0.16,
        );
        misturarCanal(
          terreno.pixels,
          terreno.terra,
          terreno.resolucao,
          x,
          y,
          raio,
          [82, 116, 118],
          0.9,
        );
      }
    }
  }
}
