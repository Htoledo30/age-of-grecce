/**
 * Plantar as sementes: cada província começa num LUGAR REAL, em longitude e latitude.
 *
 * A semente que cai na água é puxada para a terra mais próxima, e o gerador avisa quando teve
 * que andar muito — aí a coordenada está errada, e é melhor saber disso agora.
 *
 * **Semente impossível de plantar interrompe tudo**: um mapa com uma província faltando é
 * pior que um mapa que não foi gerado.
 */

import { KM_POR_UNIDADE, projetar, terraMaisProxima } from './grade';
import type { Grade, Semente } from './grade';

export interface SementePlantada {
  semente: Semente;
  /** 1..n. Zero é reservado: mar, e a terra que ninguém reivindicou. */
  indice: number;
  pixel: number;
}

export function plantarSementes(grade: Grade): SementePlantada[] {
  const plantadas: SementePlantada[] = [];
  const problemas: string[] = [];

  for (const [ordem, s] of grade.dados.provincias.entries()) {
    const { x, y } = projetar(grade, s.lon, s.lat);
    if (x < 0 || y < 0 || x >= grade.largura || y >= grade.altura) {
      problemas.push(`${s.nome} (${s.lon}, ${s.lat}) cai fora da moldura do mapa`);
      continue;
    }
    const pixel = terraMaisProxima(grade, x, y, grade.raioDeBusca);
    if (pixel === null) {
      problemas.push(
        `${s.nome} (${s.lon}, ${s.lat}) não achou terra por perto — está no mar aberto`,
      );
      continue;
    }
    const distancia = Math.hypot(
      (pixel % grade.largura) - x,
      Math.floor(pixel / grade.largura) - y,
    );
    if (distancia > 3) {
      const km = (distancia * grade.unidadesPorPixel * KM_POR_UNIDADE).toFixed(1);
      console.warn(`  ${s.nome}: semente puxada ${km} km pra achar terra — confira a coordenada`);
    }
    plantadas.push({ semente: s, indice: ordem + 1, pixel });
  }

  if (problemas.length > 0) {
    for (const p of problemas) console.error(`  ${p}`);
    throw new Error(`${problemas.length} semente(s) impossível(is) de plantar`);
  }
  console.log(`${plantadas.length} sementes plantadas`);
  return plantadas;
}
