/**
 * O PONTO DO RÓTULO: onde o nome de cada província é escrito no mapa.
 *
 * ⚠️ **A regressão que este arquivo existe para impedir tem nome e número.** O ponto óbvio
 * seria o `centro` — o centroide, a média das coordenadas —, e ele **cai fora da própria
 * província em 15 das 244**: Ítaca, Melos, o Estreito de Salamina, o Helesponto. Escrever o
 * nome ali põe "Mégara" em cima de Corinto.
 *
 * O `rotulo` é o pólo de inacessibilidade — o ponto mais distante da borda —, e a propriedade
 * que ele garante é uma só e é esta: **está sempre dentro da forma.** É o que se testa aqui,
 * para as 244, contra o PNG de verdade.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';

import { Provincias } from '../src/dados/esquema';

const mundo = Provincias.parse(
  JSON.parse(readFileSync(resolve('assets/mundo/provincias.json'), 'utf8')),
);
const mapa = JSON.parse(readFileSync(resolve('assets/mundo/mapa.json'), 'utf8')) as {
  dimensoes: { largura: number };
};
const mascara = PNG.sync.read(readFileSync(resolve('assets/mundo/provincias.png')));
const unidadesPorPixel = mapa.dimensoes.largura / mascara.width;

/** O índice gravado EXATAMENTE neste ponto do mundo. */
function indiceEm(x: number, y: number): number {
  const px = Math.round(x / unidadesPorPixel);
  const py = Math.round(y / unidadesPorPixel);
  if (px < 0 || py < 0 || px >= mascara.width || py >= mascara.height) return 0;
  const i = (py * mascara.width + px) * 4;
  return mascara.data[i]! | (mascara.data[i + 1]! << 8);
}

describe('o nome de cada província cai dentro dela', () => {
  it('todas têm ponto de rótulo, e ele tem espaço', () => {
    for (const p of mundo.provincias) {
      expect(p.rotulo, p.id).toBeDefined();
      expect(p.rotulo!.raio, `${p.id} sem espaço para o nome`).toBeGreaterThan(0);
    }
  });

  it('o ponto do rótulo está SEMPRE dentro da própria província', () => {
    const fora = mundo.provincias.filter(
      (p) => indiceEm(p.rotulo!.x, p.rotulo!.y) !== p.indice,
    );
    expect(fora.map((p) => p.id)).toEqual([]);
  });

  it('e o centroide não estaria — é por isso que o rótulo existe', () => {
    // ⚠️ Guarda a MOTIVAÇÃO: se um dia o centroide passar a servir, este teste avisa que a
    // peça extra virou peso morto. Enquanto ele falhar em alguma, o rótulo se justifica.
    const fora = mundo.provincias.filter((p) => indiceEm(p.centro.x, p.centro.y) !== p.indice);
    expect(fora.length).toBeGreaterThan(0);
  });

  it('o raio é o círculo que cabe: ele não estoura a própria província', () => {
    // Anda meio raio em cada direção a partir do ponto e continua dentro. Meio, e não um
    // inteiro, porque o chanfro aproxima a distância e a borda tem um pixel de espessura.
    for (const p of mundo.provincias) {
      const { x, y, raio } = p.rotulo!;
      const passo = raio / 2;
      for (const [dx, dy] of [
        [passo, 0],
        [-passo, 0],
        [0, passo],
        [0, -passo],
      ] as const) {
        expect(indiceEm(x + dx, y + dy), `${p.id} estoura para ${dx},${dy}`).toBe(p.indice);
      }
    }
  });
});
