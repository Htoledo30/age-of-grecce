/**
 * O `mapa.json` que o gerador escreve — a moldura contra a qual tudo o mais é conferido.
 *
 * Sem ele não há como saber se o mundo do jogo e a arte do mapa falam das mesmas dimensões,
 * e por isso a ausência dele é o primeiro problema a ser reclamado.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { reclamar } from './problemas';

export interface MapaGerado {
  dimensoes: { largura: number; altura: number };
  resolucaoTerreno: number;
  regiaoReferencia: string;
  limitesReferencia: { oeste: number; leste: number; sul: number; norte: number };
}

export function lerMapaGerado(): MapaGerado | null {
  const caminho = resolve('assets/mundo/mapa.json');
  if (!existsSync(caminho)) {
    reclamar('assets/mundo/mapa.json não existe — rode `npm run gerar-mapa`');
    return null;
  }
  return JSON.parse(readFileSync(caminho, 'utf8')) as MapaGerado;
}
