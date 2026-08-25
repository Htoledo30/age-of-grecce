/**
 * O recorte político só é confiável se três coisas fecharem: **todo dono existe, todo índice
 * é único, e toda vizinha aponta pra província que existe.**
 *
 * Índice repetido é o pior deles — duas províncias dividindo cor e caindo juntas numa
 * conquista só, sem nada no jogo dando sinal de que há um problema nos dados.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Provincias } from '../../src/dados/esquema';
import type { MapaGerado } from './mapa-gerado';
import { reclamar } from './problemas';

export function checarProvincias(mapa: MapaGerado | null): void {
  const caminho = resolve('assets/mundo/provincias.json');
  if (!existsSync(caminho)) {
    reclamar('assets/mundo/provincias.json não existe — rode `npm run gerar-provincias`');
    return;
  }
  const r = Provincias.safeParse(JSON.parse(readFileSync(caminho, 'utf8')));
  if (!r.success) {
    for (const i of r.error.issues) {
      reclamar(`provincias.json ${i.path.join('.') || '(raiz)'}: ${i.message}`);
    }
    return;
  }
  const dados = r.data;

  if (mapa && dados.resolucao.largura !== mapa.resolucaoTerreno) {
    reclamar(
      `provincias.png tem ${dados.resolucao.largura} px de largura mas o terreno tem ` +
        `${mapa.resolucaoTerreno} — as duas camadas não se sobrepõem`,
    );
  }

  const poderes = new Set(dados.poderes.map((p) => p.id));
  const ids = new Set(dados.provincias.map((p) => p.id));
  const indices = new Set<number>();
  let semArea = 0;

  for (const p of dados.provincias) {
    if (indices.has(p.indice)) {
      reclamar(`provincias.json: índice ${p.indice} repetido em "${p.nome}"`);
    }
    indices.add(p.indice);
    if (!poderes.has(p.dono)) {
      reclamar(`provincias.json: "${p.nome}" tem dono inexistente "${p.dono}"`);
    }
    for (const v of p.vizinhas) {
      if (!ids.has(v)) {
        reclamar(`provincias.json: "${p.nome}" faz fronteira com "${v}", que não existe`);
      }
    }
    if (p.areaKm2 === 0) semArea++;
  }
  if (ids.size !== dados.provincias.length) reclamar('provincias.json: id de província repetido');
  if (semArea > 0) {
    reclamar(`provincias.json: ${semArea} província(s) sem um pixel sequer no mapa`);
  }

  const donos = new Set(dados.provincias.map((p) => p.dono));
  const orfaos = [...poderes].filter((d) => !donos.has(d));
  if (orfaos.length > 0) {
    reclamar(`provincias.json: poder sem nenhuma província: ${orfaos.join(', ')}`);
  }

  const areas = dados.provincias.map((p) => p.areaKm2).sort((a, b) => a - b);
  console.log(
    `provincias: ${dados.provincias.length} em ${donos.size} poderes, época ${dados.epoca} — ` +
      `área mediana ${areas[areas.length >> 1]} km²`,
  );
}
