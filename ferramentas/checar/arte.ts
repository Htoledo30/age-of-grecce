/**
 * A arte do mapa é grande e demora a gerar: **meio caminho gerado é falha silenciosa.**
 *
 * O jogo sobe, o terreno aparece esticado ou faltando, e nada no console explica por quê.
 * Conferir aqui transforma isso numa linha de erro com o nome do arquivo.
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import type { MapaGerado } from './mapa-gerado';
import { reclamar } from './problemas';

const ESPERADOS = [
  'terreno.png',
  'navegacao.png',
  'biomas.png',
  'altitude.png',
  'altitude.f32',
  'detalhes.json',
  'hidrologia.json',
];

export function checarArte(mapa: MapaGerado | null): void {
  if (!mapa) return;
  for (const arquivo of ESPERADOS) {
    const caminho = resolve('assets/mundo', arquivo);
    if (!existsSync(caminho)) {
      reclamar(`assets/mundo/${arquivo} não existe — rode \`npm run gerar-mapa\``);
      continue;
    }
    if (statSync(caminho).size === 0) reclamar(`assets/mundo/${arquivo} está vazio`);
  }

  const terreno = resolve('assets/mundo/terreno.png');
  if (!existsSync(terreno)) return;
  const png = PNG.sync.read(readFileSync(terreno));
  const alturaEsperada = Math.round(
    (mapa.resolucaoTerreno * mapa.dimensoes.altura) / mapa.dimensoes.largura,
  );
  if (png.width !== mapa.resolucaoTerreno || png.height !== alturaEsperada) {
    reclamar(
      `terreno.png é ${png.width}x${png.height} mas mapa.json pede ` +
        `${mapa.resolucaoTerreno}x${alturaEsperada}`,
    );
  } else {
    console.log(`arte: terreno ${png.width}x${png.height}, ${mapa.regiaoReferencia}`);
  }
}
