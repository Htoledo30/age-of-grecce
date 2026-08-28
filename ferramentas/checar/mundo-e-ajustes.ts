/**
 * O mundo do jogo contra o mundo gerado, e os ajustes contra si mesmos.
 *
 * O alvo é a incoerência ENTRE arquivos: cada um sozinho já é validado pelo esquema Zod; o
 * que escapa é a moldura do jogo divergindo da moldura do mapa gerado.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Ajustes, Mundo } from '../../src/dados/esquema';
import type { MapaGerado } from './mapa-gerado';
import { reclamar } from './problemas';

export function checarMundo(mapa: MapaGerado | null): void {
  const bruto: unknown = JSON.parse(readFileSync(resolve('dados/mundo.json'), 'utf8'));

  const r = Mundo.safeParse(bruto);
  if (!r.success) {
    for (const i of r.error.issues) {
      reclamar(`mundo.json ${i.path.join('.') || '(raiz)'}: ${i.message}`);
    }
    return;
  }
  const mundo = r.data;
  if (!mapa) return;

  const d = mapa.dimensoes;
  if (mundo.dimensoes.largura !== d.largura || mundo.dimensoes.altura !== d.altura) {
    reclamar(
      `mundo.json diz ${mundo.dimensoes.largura}x${mundo.dimensoes.altura} mas o mapa ` +
        `gerado tem ${d.largura}x${d.altura} — o terreno sairia esticado`,
    );
  }
  const { oeste, leste, sul, norte } = mapa.limitesReferencia;
  console.log(
    `mundo: "${mundo.nome}" em ${d.largura}x${d.altura} unidades — ` +
      `janela ${oeste}°–${leste}°E, ${sul}°–${norte}°N`,
  );
}

export function checarAjustes(): void {
  const bruto: unknown = JSON.parse(readFileSync(resolve('dados/ajustes.json'), 'utf8'));
  const r = Ajustes.safeParse(bruto);
  if (!r.success) {
    for (const i of r.error.issues) {
      reclamar(`ajustes.json ${i.path.join('.') || '(raiz)'}: ${i.message}`);
    }
    return;
  }
  const a = r.data;
  if (a.detalhes.graoInicio >= a.detalhes.graoFim) {
    reclamar('ajustes.json: detalhes.graoInicio precisa ser menor que graoFim');
  }
  console.log(`ajustes: zoom até ${a.camera.zoomMaximo}x, roda de ${a.camera.passoDaRoda}`);
}
