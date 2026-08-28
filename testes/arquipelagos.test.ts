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

/** O índice EXATAMENTE neste pixel — sem procurar em volta. Zero é água sem dono. */
function indiceCruEm(lon: number, lat: number): number {
  const { x, y } = pixelDe(lon, lat);
  const i = (y * mascara.width + x) * 4;
  return mascara.data[i]! | (mascara.data[i + 1]! << 8);
}

describe('a água do arquipélago: o grupo é UM território, e não confete', () => {
  const grupos = ['andros', 'naxos', 'melos', 'esporades', 'calimno'];

  it('nenhum arquipélago ganhou vizinha por TERRA', () => {
    // ⚠️ **É a prova de que reivindicar água é desenho e não regra.** Se a mancha de um
    // arquipélago encostasse na de outra província, as duas seriam vizinhas — e um exército
    // andaria da Eubeia até Andros sem Porto e sem embarcar, porque o mapa passaria a dizer
    // que dá. O canal de mar entre territórios existe exatamente para isto não acontecer.
    const porId = new Map(mundo.provincias.map((p) => [p.id, p]));
    for (const id of grupos) {
      const p = porId.get(id);
      expect(p, id).toBeDefined();
      const terrestres = p!.vizinhas.filter((v) => porId.get(v)?.mar !== true);
      expect(terrestres, `${id} encostou em terra`).toEqual([]);
      expect(p!.vizinhas.length, `${id} sem vizinha nenhuma`).toBeGreaterThan(0);
    }
  });

  it('o mar ENTRE as ilhas de um grupo é do grupo, e o mar aberto não', () => {
    const naxos = mundo.provincias.find((p) => p.id === 'naxos');
    // O estreito entre Naxos e Paros: água, e água das Cíclades Centrais.
    expect(indiceCruEm(25.345, 37.075)).toBe(naxos?.indice);
    // E o canal ENTRE as Cíclades do Norte e as Centrais continua sendo mar de ninguém: é
    // ele que impede os dois territórios de se encostarem e virarem vizinhos por terra.
    const canal = mundo.provincias.find((p) => p.indice === indiceCruEm(25.0, 37.35));
    expect(canal?.mar).toBe(true);
  });

  it('a área continua contando só o CHÃO', () => {
    // A água reivindicada não pode inflar a área: é ela que escolhe a capital quando um reino
    // perde a sede, e um arquipélago virando capital por ter mar em volta seria regra
    // decidida por engano de medição.
    const porId = new Map(mundo.provincias.map((p) => [p.id, p]));
    expect(porId.get('naxos')!.areaKm2).toBeLessThan(2000);
    expect(porId.get('andros')!.areaKm2).toBeLessThan(2000);
  });
});

describe('as Cíclades agrupadas continuam inteiras e clicáveis', () => {
  const casos: Array<[string, Array<[number, number]>]> = [
    ['andros', [[25.16, 37.56], [25.35, 37.45], [24.34, 37.62], [24.42, 37.41]]],
    // Tera e Anafi passaram das Ocidentais para as CENTRAIS: elas ficam 70 km a leste do
    // resto do grupo ocidental, e era por causa delas que aquele arquipélago nunca fechava
    // numa mancha só. Ver `agua-do-arquipelago.ts`.
    ['naxos', [[25.15, 37.08], [25.29, 36.72], [25.9, 36.83], [25.43, 36.42]]],
    ['melos', [[24.71, 36.98], [24.49, 37.15]]],
  ];

  for (const [id, ilhas] of casos) {
    it(`cada ilha de ${id} aponta para o índice do arquipélago`, () => {
      const provincia = mundo.provincias.find((p) => p.id === id);
      expect(provincia).toBeDefined();
      for (const [lon, lat] of ilhas) expect(indiceEm(lon, lat)).toBe(provincia?.indice);
    });
  }
});
