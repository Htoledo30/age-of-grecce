import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';

import { Provincias } from '../src/dados/esquema';

const mundo = Provincias.parse(
  JSON.parse(readFileSync(resolve('assets/mundo/provincias.json'), 'utf8')),
);
const mapa = JSON.parse(readFileSync(resolve('assets/mundo/mapa.json'), 'utf8')) as {
  dimensoes: { largura: number; altura: number };
  limitesReferencia: { oeste: number; leste: number; sul: number; norte: number };
};
const mascara = PNG.sync.read(readFileSync(resolve('assets/mundo/provincias.png')));
const MARGEM = 48;

function pixelDe(lon: number, lat: number): { x: number; y: number } {
  const { oeste, leste, sul, norte } = mapa.limitesReferencia;
  const unidadesPorPixel = mapa.dimensoes.largura / mascara.width;
  const xMundo = MARGEM + ((lon - oeste) / (leste - oeste)) * (mapa.dimensoes.largura - MARGEM * 2);
  const yMundo = MARGEM + ((norte - lat) / (norte - sul)) * (mapa.dimensoes.altura - MARGEM * 2);
  return { x: Math.round(xMundo / unidadesPorPixel), y: Math.round(yMundo / unidadesPorPixel) };
}

function indiceEm(lon: number, lat: number): number {
  const centro = pixelDe(lon, lat);
  for (let raio = 0; raio <= 24; raio++) {
    for (let dy = -raio; dy <= raio; dy++) {
      for (let dx = -raio; dx <= raio; dx++) {
        if (raio > 0 && Math.abs(dx) !== raio && Math.abs(dy) !== raio) continue;
        const x = centro.x + dx;
        const y = centro.y + dy;
        if (x < 0 || y < 0 || x >= mascara.width || y >= mascara.height) continue;
        const i = (y * mascara.width + x) * 4;
        const indice = mascara.data[i]! | (mascara.data[i + 1]! << 8);
        if (indice > 0) return indice;
      }
    }
  }
  return 0;
}

describe('as Cíclades agrupadas continuam inteiras e clicáveis', () => {
  const casos: Array<[string, Array<[number, number]>]> = [
    ['andros', [[25.16, 37.56], [25.35, 37.45], [24.34, 37.62], [24.42, 37.41]]],
    ['naxos', [[25.15, 37.08], [25.29, 36.72], [25.9, 36.83]]],
    ['melos', [[24.71, 36.98], [25.43, 36.42]]],
  ];

  for (const [id, ilhas] of casos) {
    it(`cada ilha de ${id} aponta para o índice do arquipélago`, () => {
      const provincia = mundo.provincias.find((p) => p.id === id);
      expect(provincia).toBeDefined();
      for (const [lon, lat] of ilhas) expect(indiceEm(lon, lat)).toBe(provincia?.indice);
    });
  }
});
