/**
 * A grade de biomas lida do disco, e as duas contas que todo o resto usa: projetar uma
 * coordenada real em pixel, e achar a terra mais próxima de um ponto.
 *
 * O CUSTO por bioma é a régua que decide onde a fronteira cai. Planície é barata, serra é
 * cara — então duas províncias separadas por uma cordilheira se encontram EM CIMA dela, e
 * não do outro lado. **Mexer nestes números é mexer no desenho do mapa político inteiro.**
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';

import { BIOMAS } from '../pintar-terreno/terreno';

export const PASTA = resolve('assets/mundo');
const SEMENTES = resolve('dados/provincias.json');

const CUSTO: Record<(typeof BIOMAS)[number], number> = {
  'mar-fundo': 0, // 0 = intransponível; província nenhuma cresce pela água
  'mar-raso': 0,
  praia: 10,
  planicie: 10,
  estepe: 11,
  floresta: 14,
  colina: 19,
  montanha: 32,
  pico: 48,
};

export const CUSTO_MAXIMO = Math.max(...Object.values(CUSTO));

const MARGEM = 48; // a mesma do gerador de mapa: a projeção vive dentro dela
export const KM_POR_UNIDADE = 0.0983;

interface MapaGerado {
  dimensoes: { largura: number; altura: number };
  resolucaoTerreno: number;
  limitesReferencia: { oeste: number; leste: number; sul: number; norte: number };
}

export interface Semente {
  id: string;
  nome: string;
  regiao: string;
  lon: number;
  lat: number;
  dono: string;
  /**
   * Ilhas que pertencem a esta província mas não se tocam por terra.
   *
   * Cada marcador é um ponto dentro de uma ilha SEM semente própria: o gerador acha o pedaço
   * de terra ali e pinta o pedaço inteiro com o índice desta província.
   *
   * Por que marcador explícito e não "a província mais perto": proximidade não é
   * pertencimento. A ilhota entre duas ilhas grandes fica com quem faz sentido, e a decisão
   * fica escrita e versionada em vez de emergir de um desempate invisível.
   */
  anexos?: Array<{ lon: number; lat: number; nome?: string }>;
}

interface Poder {
  id: string;
  nome: string;
  povo: string;
  cor: string;
}

interface DadosDeSementes {
  epoca: string;
  poderes: Poder[];
  provincias: Semente[];
}

export interface Grade {
  readonly mapa: MapaGerado;
  readonly dados: DadosDeSementes;
  readonly largura: number;
  readonly altura: number;
  readonly celulas: number;
  /** Custo de atravessar cada pixel. Zero é água: intransponível. */
  readonly custo: Uint8Array;
  readonly unidadesPorPixel: number;
  readonly km2PorPixel: number;
  readonly raioDeBusca: number;
}

function exigir(caminho: string, dica: string): void {
  if (!existsSync(caminho)) throw new Error(`${caminho} não existe — ${dica}`);
}

export function carregarGrade(): Grade {
  exigir(resolve(PASTA, 'mapa.json'), 'rode `npm run gerar-mapa`');
  exigir(resolve(PASTA, 'biomas.png'), 'rode `npm run gerar-mapa`');
  exigir(SEMENTES, 'o arquivo de sementes é conteúdo, escrito à mão');

  const mapa = JSON.parse(readFileSync(resolve(PASTA, 'mapa.json'), 'utf8')) as MapaGerado;
  const dados = JSON.parse(readFileSync(SEMENTES, 'utf8')) as DadosDeSementes;

  const png = PNG.sync.read(readFileSync(resolve(PASTA, 'biomas.png')));
  const largura = png.width;
  const altura = png.height;
  const celulas = largura * altura;

  const unidadesPorPixel = mapa.dimensoes.largura / largura;
  const km2PorPixel = (unidadesPorPixel * KM_POR_UNIDADE) ** 2;
  console.log(`biomas: ${largura} x ${altura} px, ${unidadesPorPixel} unidades por pixel`);

  const custo = new Uint8Array(celulas);
  let pixelsDeTerra = 0;
  for (let i = 0; i < celulas; i++) {
    const bioma = BIOMAS[png.data[i * 4]!];
    const c = bioma ? CUSTO[bioma] : 0;
    custo[i] = c;
    if (c > 0) pixelsDeTerra++;
  }
  console.log(
    `terra: ${(pixelsDeTerra * km2PorPixel).toFixed(0)} km² em ${pixelsDeTerra} pixels`,
  );

  return {
    mapa,
    dados,
    largura,
    altura,
    celulas,
    custo,
    unidadesPorPixel,
    km2PorPixel,
    raioDeBusca: Math.max(4, Math.round(12 / unidadesPorPixel) * 4),
  };
}

/** Longitude e latitude reais → pixel da grade. */
export function projetar(grade: Grade, lon: number, lat: number): { x: number; y: number } {
  const { oeste, leste, sul, norte } = grade.mapa.limitesReferencia;
  const u = (lon - oeste) / (leste - oeste);
  const v = (norte - lat) / (norte - sul);
  const xMundo = MARGEM + u * (grade.mapa.dimensoes.largura - MARGEM * 2);
  const yMundo = MARGEM + v * (grade.mapa.dimensoes.altura - MARGEM * 2);
  return {
    x: Math.round(xMundo / grade.unidadesPorPixel),
    y: Math.round(yMundo / grade.unidadesPorPixel),
  };
}

/** O caminho de volta: pixel → longitude e latitude, para relatar uma ilha órfã. */
export function desprojetar(grade: Grade, x: number, y: number): { lon: number; lat: number } {
  const { oeste, leste, sul, norte } = grade.mapa.limitesReferencia;
  const u = (x * grade.unidadesPorPixel - MARGEM) / (grade.mapa.dimensoes.largura - MARGEM * 2);
  const v = (y * grade.unidadesPorPixel - MARGEM) / (grade.mapa.dimensoes.altura - MARGEM * 2);
  return { lon: oeste + u * (leste - oeste), lat: norte - v * (norte - sul) };
}

/**
 * A costa da Natural Earth não passa exatamente pelo sítio arqueológico: um porto cai meio
 * pixel na água e a semente morre afogada. Então a semente procura a terra mais próxima — e
 * quem chama avisa quando teve que andar muito, porque aí a coordenada está errada.
 */
export function terraMaisProxima(
  grade: Grade,
  x: number,
  y: number,
  raioMaximo: number,
): number | null {
  for (let raio = 0; raio <= raioMaximo; raio++) {
    for (let dy = -raio; dy <= raio; dy++) {
      for (let dx = -raio; dx <= raio; dx++) {
        if (raio > 0 && Math.abs(dx) !== raio && Math.abs(dy) !== raio) continue;
        const px = x + dx;
        const py = y + dy;
        if (px < 0 || py < 0 || px >= grade.largura || py >= grade.altura) continue;
        const i = py * grade.largura + px;
        if (grade.custo[i]! > 0) return i;
      }
    }
  }
  return null;
}
