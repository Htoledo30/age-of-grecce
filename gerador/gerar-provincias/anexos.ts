/**
 * Ilhas anexadas: mesma província, do outro lado da água.
 *
 * O crescimento não atravessa o mar, e é bom que não atravesse: província pulando estreito
 * seria imprevisível. Mas isso deixa toda ilha sem semente com índice zero, e na camada
 * política ela vira um buraco sem cor, com cara de esquecimento.
 *
 * A saída é um marcador explícito dizendo a que província a ilha pertence, e o pedaço INTEIRO
 * recebe aquele índice. Como continua sendo um componente separado, **nenhuma vizinhança
 * terrestre falsa nasce disso** — a varredura de fronteira só olha pixels que se encostam.
 */

import { projetar, terraMaisProxima } from './grade';
import type { Grade } from './grade';
import type { SementePlantada } from './sementes';

export function anexarIlhas(
  grade: Grade,
  dono: Uint16Array,
  sementes: readonly SementePlantada[],
): void {
  const problemas: string[] = [];
  let ilhasAnexadas = 0;
  let pixelsAnexados = 0;

  for (const { semente, indice } of sementes) {
    for (const anexo of semente.anexos ?? []) {
      const nomeDoAnexo = anexo.nome ?? `${anexo.lon}, ${anexo.lat}`;
      const { x, y } = projetar(grade, anexo.lon, anexo.lat);
      const alvo = terraMaisProxima(grade, x, y, grade.raioDeBusca);
      if (alvo === null) {
        problemas.push(`anexo "${nomeDoAnexo}" de ${semente.nome} não achou terra`);
        continue;
      }
      const pintados = pintarComponente(grade, dono, alvo, indice);
      if (pintados === 0) {
        console.warn(
          `  anexo "${nomeDoAnexo}" de ${semente.nome}: ` +
            `essa ilha já tem dono próprio — marcador ignorado`,
        );
        continue;
      }
      ilhasAnexadas++;
      pixelsAnexados += pintados;
    }
  }

  if (ilhasAnexadas > 0) {
    console.log(
      `ilhas anexadas por marcador: ${ilhasAnexadas} ` +
        `(${(pixelsAnexados * grade.km2PorPixel).toFixed(0)} km²)`,
    );
  }
  if (problemas.length > 0) {
    for (const p of problemas) console.error(`  ${p}`);
    throw new Error(`${problemas.length} anexo(s) impossível(is) de resolver`);
  }
}

/** Pinta o componente de terra que contém `pixel` com `indice`. Devolve quantos pixels. */
function pintarComponente(
  grade: Grade,
  dono: Uint16Array,
  pixel: number,
  indice: number,
): number {
  const { largura: L, altura: A, custo } = grade;
  const pilha = [pixel];
  const vistos = new Set<number>([pixel]);
  let pintados = 0;
  while (pilha.length > 0) {
    const i = pilha.pop()!;
    if (dono[i] === 0) {
      dono[i] = indice;
      pintados++;
    }
    const x = i % L;
    const y = (i - x) / L;
    for (let lado = 0; lado < 4; lado++) {
      const px = x + (lado === 0 ? -1 : lado === 1 ? 1 : 0);
      const py = y + (lado === 2 ? -1 : lado === 3 ? 1 : 0);
      if (px < 0 || py < 0 || px >= L || py >= A) continue;
      const j = py * L + px;
      if (custo[j] === 0 || vistos.has(j)) continue;
      vistos.add(j);
      pilha.push(j);
    }
  }
  return pintados;
}
