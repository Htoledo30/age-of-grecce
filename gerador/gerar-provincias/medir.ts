/**
 * Medidas e vizinhança: quanto cada província ocupa, onde fica o centro dela, e quem faz
 * fronteira com quem.
 *
 * A vizinhança sai da varredura de pixels que se ENCOSTAM — é por isso que uma ilha anexada
 * não vira vizinha de ninguém: ela é um componente separado, e nenhum pixel dela toca o
 * continente.
 */

import type { Grade } from './grade';
import type { SementePlantada } from './sementes';

export interface ProvinciaMedida {
  indice: number;
  id: string;
  nome: string;
  regiao: string;
  dono: string;
  areaKm2: number;
  centro: { x: number; y: number };
  vizinhas: string[];
}

export function medirProvincias(
  grade: Grade,
  dono: Uint16Array,
  sementes: readonly SementePlantada[],
): ProvinciaMedida[] {
  const { largura: L, altura: A, celulas } = grade;
  const total = sementes.length + 1;
  const pixels = new Int32Array(total);
  const somaX = new Float64Array(total);
  const somaY = new Float64Array(total);
  const vizinhas: Array<Set<number>> = Array.from({ length: total }, () => new Set<number>());

  for (let i = 0; i < celulas; i++) {
    const d = dono[i]!;
    if (d === 0) continue;
    const x = i % L;
    const y = (i - x) / L;
    pixels[d]!++;
    somaX[d]! += x;
    somaY[d]! += y;
    if (x + 1 < L) {
      const outro = dono[i + 1]!;
      if (outro !== 0 && outro !== d) {
        vizinhas[d]!.add(outro);
        vizinhas[outro]!.add(d);
      }
    }
    if (y + 1 < A) {
      const outro = dono[i + L]!;
      if (outro !== 0 && outro !== d) {
        vizinhas[d]!.add(outro);
        vizinhas[outro]!.add(d);
      }
    }
  }

  const saida = sementes.map(({ semente, indice }) => {
    const n = pixels[indice]!;
    return {
      indice,
      id: semente.id,
      nome: semente.nome,
      regiao: semente.regiao,
      dono: semente.dono,
      areaKm2: Math.round(n * grade.km2PorPixel),
      centro:
        n > 0
          ? {
              x: Math.round((somaX[indice]! / n) * grade.unidadesPorPixel),
              y: Math.round((somaY[indice]! / n) * grade.unidadesPorPixel),
            }
          : { x: 0, y: 0 },
      vizinhas: [...vizinhas[indice]!].map((v) => sementes[v - 1]!.semente.id).sort(),
    };
  });

  const vazias = saida.filter((p) => p.areaKm2 === 0);
  if (vazias.length > 0) {
    console.warn(
      `\n${vazias.length} província(s) sem um pixel sequer: ${vazias.map((p) => p.nome).join(', ')}`,
    );
  }
  return saida;
}
