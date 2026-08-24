/**
 * Recorta o mundo em províncias.
 *
 * Ferramenta de autoria: roda na mão, nada disso acontece durante uma partida.
 *
 * O método, em uma frase: **cada província cresce da sua semente até esbarrar na
 * vizinha, e subir serra custa caro.** A semente é um lugar real — Atenas, Tebas,
 * Sardes — em longitude e latitude de verdade, escrita em `dados/provincias.json`.
 * O resultado não é uma grade nem um sorteio: é território, e a fronteira cai onde o
 * terreno dificulta a passagem, que é onde ela caía de verdade.
 *
 * Por que Dijkstra com custo de terreno e não Voronoi simples: Voronoi mede distância
 * em linha reta e não sabe que existe montanha nem que existe mar. Ele cortaria o Pindo
 * pelo meio e deixaria uma província pular o estreito pra do outro lado. Espalhar com
 * custo, só por terra, dá fronteira em cumeeira e ilha inteira pra um dono só — de graça.
 *
 * uso:  npx tsx --max-old-space-size=8192 gerador/gerar-provincias.ts
 * saída: assets/mundo/provincias.png   índice da província em cada pixel
 *        assets/mundo/provincias.json  nome, dono, centro, área e vizinhas
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';

import { BIOMAS } from './pintar-terreno';

/**
 * `--sugerir` não escreve mapa nenhum: só lista as ilhas órfãs com a província mais
 * próxima, em JSON pronto pra colar. A sugestão é apenas um ponto de partida para
 * revisão humana, nunca uma decisão automática.
 */
const SUGERIR = process.argv.includes('--sugerir');

const PASTA = resolve('assets/mundo');
const SEMENTES = resolve('dados/provincias.json');

/**
 * Custo de atravessar um pixel de cada bioma.
 *
 * É a régua que decide onde a fronteira cai. Planície é barata, serra é cara — então
 * duas províncias separadas por uma cordilheira se encontram EM CIMA dela, e não do
 * outro lado. Mexer nestes números é mexer no desenho do mapa político inteiro.
 */
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

const CUSTO_MAXIMO = Math.max(...Object.values(CUSTO));

interface MapaGerado {
  dimensoes: { largura: number; altura: number };
  resolucaoTerreno: number;
  limitesReferencia: { oeste: number; leste: number; sul: number; norte: number };
}

interface Semente {
  id: string;
  nome: string;
  regiao: string;
  lon: number;
  lat: number;
  dono: string;
  /**
   * Ilhas que pertencem a esta província mas não se tocam por terra.
   *
   * Cada marcador é um ponto dentro de uma ilha SEM semente própria: o gerador acha o
   * pedaço de terra ali e pinta o pedaço inteiro com o índice desta província.
   *
   * Por que marcador explícito e não "a província mais perto": proximidade não é
   * pertencimento. A ilhota entre duas ilhas grandes fica com quem faz sentido, e a
   * decisão fica escrita e versionada em vez de emergir de um desempate invisível.
   */
  anexos?: Array<{ lon: number; lat: number; nome?: string }>;
}

interface Poder {
  id: string;
  nome: string;
  povo: string;
  cor: string;
}

function exigir(caminho: string, dica: string): void {
  if (!existsSync(caminho)) throw new Error(`${caminho} não existe — ${dica}`);
}

exigir(resolve(PASTA, 'mapa.json'), 'rode `npm run gerar-mapa`');
exigir(resolve(PASTA, 'biomas.png'), 'rode `npm run gerar-mapa`');
exigir(SEMENTES, 'o arquivo de sementes é conteúdo, escrito à mão');

const mapa = JSON.parse(readFileSync(resolve(PASTA, 'mapa.json'), 'utf8')) as MapaGerado;
const dados = JSON.parse(readFileSync(SEMENTES, 'utf8')) as {
  epoca: string;
  poderes: Poder[];
  provincias: Semente[];
};

const png = PNG.sync.read(readFileSync(resolve(PASTA, 'biomas.png')));
const L = png.width;
const A = png.height;
const CELULAS = L * A;
const MARGEM = 48; // a mesma do gerador de mapa: a projeção vive dentro dela

/** Unidades de mundo por pixel do mapa de biomas. */
const UNIDADES_POR_PIXEL = mapa.dimensoes.largura / L;
const KM_POR_UNIDADE = 0.0983;
const KM2_POR_PIXEL = (UNIDADES_POR_PIXEL * KM_POR_UNIDADE) ** 2;

console.log(`biomas: ${L} x ${A} px, ${UNIDADES_POR_PIXEL} unidades por pixel`);

// ---------------------------------------------------------------------------
// custo por pixel
// ---------------------------------------------------------------------------

const custo = new Uint8Array(CELULAS);
let pixelsDeTerra = 0;
for (let i = 0; i < CELULAS; i++) {
  const bioma = BIOMAS[png.data[i * 4]!];
  const c = bioma ? CUSTO[bioma] : 0;
  custo[i] = c;
  if (c > 0) pixelsDeTerra++;
}
console.log(`terra: ${(pixelsDeTerra * KM2_POR_PIXEL).toFixed(0)} km² em ${pixelsDeTerra} pixels`);

// ---------------------------------------------------------------------------
// sementes: longitude e latitude reais → pixel
// ---------------------------------------------------------------------------

const { oeste, leste, sul, norte } = mapa.limitesReferencia;

function projetar(lon: number, lat: number): { x: number; y: number } {
  const u = (lon - oeste) / (leste - oeste);
  const v = (norte - lat) / (norte - sul);
  const xMundo = MARGEM + u * (mapa.dimensoes.largura - MARGEM * 2);
  const yMundo = MARGEM + v * (mapa.dimensoes.altura - MARGEM * 2);
  return { x: Math.round(xMundo / UNIDADES_POR_PIXEL), y: Math.round(yMundo / UNIDADES_POR_PIXEL) };
}

/**
 * A costa da Natural Earth não passa exatamente pelo sítio arqueológico: um porto cai
 * meio pixel na água e a semente morre afogada. Então a semente procura a terra mais
 * próxima — e avisa quando teve que andar muito, porque aí a coordenada está errada.
 */
function terraMaisProxima(x: number, y: number, raioMaximo: number): number | null {
  for (let raio = 0; raio <= raioMaximo; raio++) {
    for (let dy = -raio; dy <= raio; dy++) {
      for (let dx = -raio; dx <= raio; dx++) {
        if (raio > 0 && Math.abs(dx) !== raio && Math.abs(dy) !== raio) continue;
        const px = x + dx;
        const py = y + dy;
        if (px < 0 || py < 0 || px >= L || py >= A) continue;
        const i = py * L + px;
        if (custo[i]! > 0) return i;
      }
    }
  }
  return null;
}

const RAIO_BUSCA = Math.max(4, Math.round(12 / UNIDADES_POR_PIXEL) * 4);
const sementes: Array<{ semente: Semente; indice: number; pixel: number }> = [];
const problemas: string[] = [];

for (const [ordem, s] of dados.provincias.entries()) {
  const { x, y } = projetar(s.lon, s.lat);
  if (x < 0 || y < 0 || x >= L || y >= A) {
    problemas.push(`${s.nome} (${s.lon}, ${s.lat}) cai fora da moldura do mapa`);
    continue;
  }
  const pixel = terraMaisProxima(x, y, RAIO_BUSCA);
  if (pixel === null) {
    problemas.push(`${s.nome} (${s.lon}, ${s.lat}) não achou terra por perto — está no mar aberto`);
    continue;
  }
  const distancia = Math.hypot((pixel % L) - x, Math.floor(pixel / L) - y);
  if (distancia > 3) {
    const km = (distancia * UNIDADES_POR_PIXEL * KM_POR_UNIDADE).toFixed(1);
    console.warn(`  ${s.nome}: semente puxada ${km} km pra achar terra — confira a coordenada`);
  }
  sementes.push({ semente: s, indice: ordem + 1, pixel });
}

if (problemas.length > 0) {
  for (const p of problemas) console.error(`  ${p}`);
  throw new Error(`${problemas.length} semente(s) impossível(is) de plantar`);
}
console.log(`${sementes.length} sementes plantadas`);

// ---------------------------------------------------------------------------
// crescimento: Dijkstra de muitas origens, só por terra
// ---------------------------------------------------------------------------

const INFINITO = 0x7fffffff;
const distancia = new Int32Array(CELULAS).fill(INFINITO);
const dono = new Uint16Array(CELULAS);

// Fila de Dial: como todo passo custa entre 1 e CUSTO_MAXIMO, um anel de baldes indexado
// pela distância ordena em tempo constante — heap binário aqui seria dez vezes mais lento.
const BALDES = CUSTO_MAXIMO + 1;
const anel: number[][] = Array.from({ length: BALDES }, () => []);
let pendentes = 0;

function enfileirar(indice: number, d: number): void {
  anel[d % BALDES]!.push(indice);
  pendentes++;
}

for (const { indice, pixel } of sementes) {
  if (distancia[pixel] !== INFINITO) {
    console.warn(`  duas sementes no mesmo pixel: ${dados.provincias[indice - 1]!.nome}`);
  }
  distancia[pixel] = 0;
  dono[pixel] = indice;
  enfileirar(pixel, 0);
}

let atual = 0;
let visitados = 0;
while (pendentes > 0) {
  const balde = anel[atual % BALDES]!;
  if (balde.length === 0) {
    atual++;
    continue;
  }
  const fila = balde.splice(0, balde.length);
  pendentes -= fila.length;
  for (const i of fila) {
    if (distancia[i]! !== atual) continue; // entrada velha, já melhorada
    visitados++;
    const x = i % L;
    const y = (i - x) / L;
    const meuDono = dono[i]!;
    for (let lado = 0; lado < 4; lado++) {
      const px = x + (lado === 0 ? -1 : lado === 1 ? 1 : 0);
      const py = y + (lado === 2 ? -1 : lado === 3 ? 1 : 0);
      if (px < 0 || py < 0 || px >= L || py >= A) continue;
      const j = py * L + px;
      const passo = custo[j]!;
      if (passo === 0) continue; // água: ninguém cresce por cima
      const nova = atual + passo;
      if (nova < distancia[j]!) {
        distancia[j] = nova;
        dono[j] = meuDono;
        enfileirar(j, nova);
      }
    }
  }
}
console.log(`crescimento terminado: ${visitados} pixels alcançados`);

// ---------------------------------------------------------------------------
// ilhas anexadas: mesma província, do outro lado da água
// ---------------------------------------------------------------------------
//
// O crescimento não atravessa o mar, e é bom que não atravesse: província pulando
// estreito seria imprevisível. Mas isso deixa toda ilha sem semente com índice zero, e
// na camada política ela vira um buraco sem cor, com cara de esquecimento.
//
// A saída é a que a especificação pede: um marcador explícito diz a que província a
// ilha pertence, e o pedaço INTEIRO recebe aquele índice. Como continua sendo um
// componente separado, nenhuma vizinhança terrestre falsa nasce disso — a varredura de
// fronteira só olha pixels que se encostam.

/** Pinta o componente de terra que contém `pixel` com `indice`. Devolve quantos pixels. */
function pintarComponente(pixel: number, indice: number): { pixels: number; jaTinhaDono: number } {
  const pilha = [pixel];
  const vistos = new Set<number>([pixel]);
  let pintados = 0;
  let jaTinhaDono = 0;
  while (pilha.length > 0) {
    const i = pilha.pop()!;
    if (dono[i] !== 0) jaTinhaDono++;
    else {
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
  return { pixels: pintados, jaTinhaDono };
}

let ilhasAnexadas = 0;
let pixelsAnexados = 0;
for (const { semente, indice } of sementes) {
  for (const anexo of semente.anexos ?? []) {
    const { x, y } = projetar(anexo.lon, anexo.lat);
    const alvo = terraMaisProxima(x, y, RAIO_BUSCA);
    if (alvo === null) {
      problemas.push(
        `anexo "${anexo.nome ?? `${anexo.lon}, ${anexo.lat}`}" de ${semente.nome} não achou terra`,
      );
      continue;
    }
    const r = pintarComponente(alvo, indice);
    if (r.pixels === 0) {
      console.warn(
        `  anexo "${anexo.nome ?? `${anexo.lon}, ${anexo.lat}`}" de ${semente.nome}: ` +
          `essa ilha já tem dono próprio — marcador ignorado`,
      );
      continue;
    }
    ilhasAnexadas++;
    pixelsAnexados += r.pixels;
  }
}
if (ilhasAnexadas > 0) {
  console.log(
    `ilhas anexadas por marcador: ${ilhasAnexadas} ` +
      `(${(pixelsAnexados * KM2_POR_PIXEL).toFixed(0)} km²)`,
  );
}
if (problemas.length > 0) {
  for (const p of problemas) console.error(`  ${p}`);
  throw new Error(`${problemas.length} anexo(s) impossível(is) de resolver`);
}

// ---------------------------------------------------------------------------
// terra que ninguém reivindicou
// ---------------------------------------------------------------------------

const visitado = new Uint8Array(CELULAS);
const orfas: Array<{ km2: number; lon: number; lat: number; pixel: number }> = [];
const pilha: number[] = [];

for (let inicio = 0; inicio < CELULAS; inicio++) {
  if (custo[inicio] === 0 || dono[inicio] !== 0 || visitado[inicio]) continue;
  pilha.length = 0;
  pilha.push(inicio);
  visitado[inicio] = 1;
  let contagem = 0;
  let somaX = 0;
  let somaY = 0;
  while (pilha.length > 0) {
    const i = pilha.pop()!;
    contagem++;
    const x = i % L;
    const y = (i - x) / L;
    somaX += x;
    somaY += y;
    for (let lado = 0; lado < 4; lado++) {
      const px = x + (lado === 0 ? -1 : lado === 1 ? 1 : 0);
      const py = y + (lado === 2 ? -1 : lado === 3 ? 1 : 0);
      if (px < 0 || py < 0 || px >= L || py >= A) continue;
      const j = py * L + px;
      if (custo[j] === 0 || dono[j] !== 0 || visitado[j]) continue;
      visitado[j] = 1;
      pilha.push(j);
    }
  }
  const cx = somaX / contagem;
  const cy = somaY / contagem;
  const uMundo = (cx * UNIDADES_POR_PIXEL - MARGEM) / (mapa.dimensoes.largura - MARGEM * 2);
  const vMundo = (cy * UNIDADES_POR_PIXEL - MARGEM) / (mapa.dimensoes.altura - MARGEM * 2);
  orfas.push({
    km2: contagem * KM2_POR_PIXEL,
    lon: oeste + uMundo * (leste - oeste),
    lat: norte - vMundo * (norte - sul),
    pixel: inicio,
  });
}

orfas.sort((a, b) => b.km2 - a.km2);

/**
 * Qual província está mais perto desta ilha órfã?
 *
 * Anda em anéis a partir do centro da ilha até esbarrar em pixel com dono — sobre a água
 * inclusive, porque a pergunta aqui é de VIZINHANÇA no mapa, não de caminho por terra.
 * A resposta é sugestão pra revisão humana e nunca vira decisão sozinha.
 */
function provinciaMaisProxima(pixel: number): number {
  const x0 = pixel % L;
  const y0 = (pixel - x0) / L;
  const MAXIMO = Math.round(200 / UNIDADES_POR_PIXEL);
  for (let raio = 1; raio <= MAXIMO; raio++) {
    for (let dy = -raio; dy <= raio; dy++) {
      for (let dx = -raio; dx <= raio; dx++) {
        if (Math.abs(dx) !== raio && Math.abs(dy) !== raio) continue;
        const x = x0 + dx;
        const y = y0 + dy;
        if (x < 0 || y < 0 || x >= L || y >= A) continue;
        const d = dono[y * L + x]!;
        if (d !== 0) return d;
      }
    }
  }
  return 0;
}

if (orfas.length > 0) {
  const total = orfas.reduce((s, o) => s + o.km2, 0);
  console.warn(`\n${orfas.length} pedaços de terra sem dono (${total.toFixed(0)} km² no total).`);
  if (SUGERIR) {
    console.warn('Sugestão de anexo, por província — REVISE antes de colar em dados/provincias.json:\n');
    const porProvincia = new Map<string, Array<{ lon: number; lat: number; km2: number }>>();
    for (const o of orfas) {
      const indice = provinciaMaisProxima(o.pixel);
      const nome = indice === 0 ? '(nenhuma perto)' : sementes[indice - 1]!.semente.id;
      if (!porProvincia.has(nome)) porProvincia.set(nome, []);
      porProvincia.get(nome)!.push({ lon: o.lon, lat: o.lat, km2: o.km2 });
    }
    for (const [id, lista] of [...porProvincia].sort((a, b) => b[1].length - a[1].length)) {
      const marcadores = lista
        .map((i) => `{ "lon": ${i.lon.toFixed(3)}, "lat": ${i.lat.toFixed(3)} }`)
        .join(', ');
      console.warn(`  ${id}  (${lista.length}, ${lista.reduce((s, i) => s + i.km2, 0).toFixed(0)} km²)`);
      console.warn(`    "anexos": [${marcadores}]\n`);
    }
  } else {
    console.warn('Rode com --sugerir pra ver a que província cada uma pertenceria.');
    for (const o of orfas.slice(0, 12)) {
      console.warn(`  ${o.km2.toFixed(0).padStart(6)} km²   lon ${o.lon.toFixed(2)}, lat ${o.lat.toFixed(2)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// medidas e vizinhança
// ---------------------------------------------------------------------------

const total = sementes.length + 1;
const pixels = new Int32Array(total);
const somaX = new Float64Array(total);
const somaY = new Float64Array(total);
const vizinhas: Array<Set<number>> = Array.from({ length: total }, () => new Set<number>());

for (let i = 0; i < CELULAS; i++) {
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
    areaKm2: Math.round(n * KM2_POR_PIXEL),
    centro:
      n > 0
        ? {
            x: Math.round((somaX[indice]! / n) * UNIDADES_POR_PIXEL),
            y: Math.round((somaY[indice]! / n) * UNIDADES_POR_PIXEL),
          }
        : { x: 0, y: 0 },
    vizinhas: [...vizinhas[indice]!]
      .map((v) => sementes[v - 1]!.semente.id)
      .sort(),
  };
});

const vazias = saida.filter((p) => p.areaKm2 === 0);
if (vazias.length > 0) {
  console.warn(`\n${vazias.length} província(s) sem um pixel sequer: ${vazias.map((p) => p.nome).join(', ')}`);
}

// ---------------------------------------------------------------------------
// arquivos
// ---------------------------------------------------------------------------

if (SUGERIR) {
  console.log('\nmodo sugestão: nada foi gravado.');
  process.exit(0);
}

// O índice vai em dois canais: vermelho é o byte baixo, verde o alto. Cabe até 65.535
// províncias, e o jogo lê isso direto como textura pra pintar dono e fronteira.
const indicePng = new PNG({ width: L, height: A });
for (let i = 0; i < CELULAS; i++) {
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
      epoca: dados.epoca,
      resolucao: { largura: L, altura: A },
      dimensoes: mapa.dimensoes,
      poderes: dados.poderes,
      provincias: saida,
    },
    null,
    2,
  ) + '\n',
);

const porDono = new Map<string, number>();
for (const p of saida) porDono.set(p.dono, (porDono.get(p.dono) ?? 0) + 1);
const ranking = [...porDono].sort((a, b) => b[1] - a[1]).slice(0, 6);

console.log(`\n${saida.length} províncias em ${porDono.size} poderes, época ${dados.epoca}`);
console.log(`maiores poderes: ${ranking.map(([d, n]) => `${d} (${n})`).join(', ')}`);
const areas = saida.map((p) => p.areaKm2).sort((a, b) => a - b);
console.log(
  `área: menor ${areas[0]} km², mediana ${areas[areas.length >> 1]} km², maior ${areas.at(-1)} km²`,
);
