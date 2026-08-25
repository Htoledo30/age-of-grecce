/**
 * Os dois arquivos que o jogo carrega, e o resumo que o autor lê no console.
 *
 * O índice vai em DOIS canais: vermelho é o byte baixo, verde o alto. Cabe até 65.535
 * províncias, e o jogo lê isso direto como textura pra pintar dono e fronteira — nada de
 * polígono, nada de geometria.
 */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';

import { PASTA } from './grade';
import type { Grade } from './grade';
import type { ProvinciaMedida } from './medir';

export function escreverProvincias(
  grade: Grade,
  dono: Uint16Array,
  provincias: readonly ProvinciaMedida[],
): void {
  const { largura: L, altura: A, celulas } = grade;

  const indicePng = new PNG({ width: L, height: A });
  for (let i = 0; i < celulas; i++) {
    const d = dono[i]!;
    indicePng.data[i * 4] = d & 0xff;
    indicePng.data[i * 4 + 1] = (d >> 8) & 0xff;
    indicePng.data[i * 4 + 2] = 0;
    indicePng.data[i * 4 + 3] = 255;
  }
  writeFileSync(resolve(PASTA, 'provincias.png'), PNG.sync.write(indicePng));

  writeFileSync(
    resolve(PASTA, 'provincias.json'),
    JSON.stringify(
      {
        versao: 1,
        epoca: grade.dados.epoca,
        resolucao: { largura: L, altura: A },
        dimensoes: grade.mapa.dimensoes,
        poderes: grade.dados.poderes,
        provincias,
      },
      null,
      2,
    ) + '\n',
  );
}

export function resumir(grade: Grade, provincias: readonly ProvinciaMedida[]): void {
  const porDono = new Map<string, number>();
  for (const p of provincias) porDono.set(p.dono, (porDono.get(p.dono) ?? 0) + 1);
  const ranking = [...porDono].sort((a, b) => b[1] - a[1]).slice(0, 6);

  console.log(
    `\n${provincias.length} províncias em ${porDono.size} poderes, época ${grade.dados.epoca}`,
  );
  console.log(`maiores poderes: ${ranking.map(([d, n]) => `${d} (${n})`).join(', ')}`);
  const areas = provincias.map((p) => p.areaKm2).sort((a, b) => a - b);
  console.log(
    `área: menor ${areas[0]} km², mediana ${areas[areas.length >> 1]} km², maior ${areas.at(-1)} km²`,
  );
}
