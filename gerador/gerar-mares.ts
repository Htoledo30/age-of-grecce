/**
 * Recorta o MAR em zonas navegáveis — o segundo tabuleiro do jogo.
 *
 * Ferramenta de autoria: roda na mão, nada disso acontece durante uma partida.
 *
 * Pedido de Henrique, e o desenho é dele: *"não precisa criar frota, o exército anda pela
 * água (pelas zonas) como um exército normal; caso se encontre no mar com outro exército em
 * alguma zona, se for inimigo eles batalham sem conquistar nada, só se matam"*. É o modelo do
 * Age of History 2, e ele é bem mais barato que frota — porque o jogo **já** sabe fazer quase
 * tudo: a marcha anda por vizinhança, a batalha acontece sozinha quando duas forças se
 * encontram, e a conquista é um passo separado que a zona de mar simplesmente não tem.
 *
 * ## O método é o mesmo das províncias, com a máscara invertida
 *
 * Cada zona nasce de uma semente em longitude e latitude reais (`dados/mares.json`) e cresce
 * sobre a água até esbarrar na vizinha. A diferença para a terra é que **no mar não há
 * serra**: a fronteira entre duas zonas cai no meio do caminho, e não num acidente do
 * terreno — por isso o crescimento aqui é uma onda uniforme, e não um Dijkstra por custo.
 *
 * ⚠️ **ADITIVO, e é a decisão que protege o mapa.** Este gerador não mexe num pixel de terra:
 * ele lê o `provincias.png` pronto, pinta as zonas SÓ onde o índice é zero e o bioma é água,
 * e devolve o arquivo com as duas coisas dentro. As 196 províncias e os índices delas ficam
 * exatamente como estavam — nenhum id muda, nenhum salvamento quebra, `economia.json`
 * continua apontando para as mesmas terras.
 *
 * uso:  npx tsx --max-old-space-size=8192 gerador/gerar-mares.ts [--seco]
 *       `--seco` mede e relata sem escrever arquivo nenhum.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';

const PASTA = resolve('assets/mundo');
const MARGEM = 48;
const KM_POR_UNIDADE = 0.0983;
/**
 * Índice em que o mar começa.
 *
 * Bem longe das 196 terras de propósito: quem lê um índice sabe na hora se está olhando chão
 * ou água, e uma província nova de terra nunca vai esbarrar numa zona de mar por acidente.
 */
const PRIMEIRO_INDICE_DE_MAR = 1000;
/** Bioma 0 e 1 são mar-fundo e mar-raso; daí para cima é terra. */
const AGUA_ATE = 1;

const SECO = process.argv.includes('--seco');

interface Mapa {
  dimensoes: { largura: number; altura: number };
  limitesReferencia: { oeste: number; leste: number; sul: number; norte: number };
}

interface SementeDeMar {
  id: string;
  nome: string;
  lon: number;
  lat: number;
}

interface ProvinciaAssada {
  indice: number;
  id: string;
  nome: string;
  regiao: string;
  dono: string;
  areaKm2: number;
  centro: { x: number; y: number };
  vizinhas: string[];
  mar?: boolean;
}

const mapa = JSON.parse(readFileSync(resolve(PASTA, 'mapa.json'), 'utf8')) as Mapa;
const assado = JSON.parse(readFileSync(resolve(PASTA, 'provincias.json'), 'utf8')) as {
  provincias: ProvinciaAssada[];
  [k: string]: unknown;
};
const mares = (
  JSON.parse(readFileSync(resolve('dados/mares.json'), 'utf8')) as { mares: SementeDeMar[] }
).mares;

const biomas = PNG.sync.read(readFileSync(resolve(PASTA, 'biomas.png')));
const indices = PNG.sync.read(readFileSync(resolve(PASTA, 'provincias.png')));
const L = indices.width;
const A = indices.height;
const celulas = L * A;
const unidadesPorPixel = mapa.dimensoes.largura / L;
const km2PorPixel = (unidadesPorPixel * KM_POR_UNIDADE) ** 2;

if (biomas.width !== L || biomas.height !== A) {
  throw new Error(`biomas ${biomas.width}x${biomas.height} != provincias ${L}x${A}`);
}

// ── quem já é terra, e onde há água livre ─────────────────────────────────────────────
const dono = new Uint16Array(celulas);
const agua = new Uint8Array(celulas);
let livres = 0;
for (let i = 0; i < celulas; i++) {
  const atual = indices.data[i * 4]! | (indices.data[i * 4 + 1]! << 8);
  dono[i] = atual;
  // Água livre é bioma de mar E índice zero: pixel já reivindicado por uma província —
  // ilha anexada, praia pintada — continua sendo dela.
  if (atual === 0 && biomas.data[i * 4]! <= AGUA_ATE) {
    agua[i] = 1;
    livres += 1;
  }
}
console.log(`mapa ${L}x${A} · ${livres.toLocaleString('pt-BR')} pixels de água livre`);

// ── plantar ───────────────────────────────────────────────────────────────────────────
function projetar(lon: number, lat: number): number {
  const { oeste, leste, sul, norte } = mapa.limitesReferencia;
  const u = (lon - oeste) / (leste - oeste);
  const v = (norte - lat) / (norte - sul);
  const x = Math.round((MARGEM + u * (mapa.dimensoes.largura - MARGEM * 2)) / unidadesPorPixel);
  const y = Math.round((MARGEM + v * (mapa.dimensoes.altura - MARGEM * 2)) / unidadesPorPixel);
  return y * L + x;
}

/**
 * A água livre mais próxima, em anéis crescentes.
 *
 * Espelha o `terraMaisProxima` do gerador de províncias, e existe pela mesma razão: a costa
 * da Natural Earth não passa onde o dedo do autor apontou. Uma semente de estreito cai meio
 * pixel na praia com facilidade, e morrer afogada em terra firme seria um jeito bobo de
 * perder uma zona.
 */
function aguaMaisProxima(pixel: number, raioMaximo = 120): number | null {
  if (agua[pixel] === 1) return pixel;
  const x0 = pixel % L;
  const y0 = (pixel - x0) / L;
  for (let raio = 1; raio <= raioMaximo; raio++) {
    for (let dy = -raio; dy <= raio; dy++) {
      const y = y0 + dy;
      if (y < 0 || y >= A) continue;
      const borda = Math.abs(dy) === raio;
      for (let dx = -raio; dx <= raio; dx += borda ? 1 : 2 * raio) {
        const x = x0 + dx;
        if (x < 0 || x >= L) continue;
        const i = y * L + x;
        if (agua[i] === 1) return i;
      }
    }
  }
  return null;
}

interface Plantada {
  semente: SementeDeMar;
  indice: number;
  pixel: number;
}

const plantadas: Plantada[] = [];
const problemas: string[] = [];
for (const [ordem, s] of mares.entries()) {
  const alvo = projetar(s.lon, s.lat);
  const x = alvo % L;
  const y = (alvo - x) / L;
  if (x < 0 || y < 0 || x >= L || y >= A) {
    problemas.push(`${s.nome} cai fora da moldura`);
    continue;
  }
  const pixel = aguaMaisProxima(alvo);
  if (pixel === null) {
    problemas.push(`${s.nome} (${s.lon}, ${s.lat}) não achou água por perto`);
    continue;
  }
  const puxou = Math.hypot((pixel % L) - x, Math.floor(pixel / L) - y);
  if (puxou > 3) {
    const km = (puxou * unidadesPorPixel * KM_POR_UNIDADE).toFixed(1);
    console.warn(`  ${s.nome}: semente puxada ${km} km para achar água`);
  }
  plantadas.push({ semente: s, indice: PRIMEIRO_INDICE_DE_MAR + ordem, pixel });
}
if (problemas.length > 0) {
  for (const p of problemas) console.error(`  ${p}`);
  throw new Error(`${problemas.length} semente(s) de mar impossível(is) de plantar`);
}
console.log(`${plantadas.length} zonas plantadas`);

// ── crescer ───────────────────────────────────────────────────────────────────────────
/**
 * Uma onda uniforme a partir de todas as sementes ao mesmo tempo.
 *
 * ⚠️ Não é o Dijkstra da terra, e é de propósito: no mar não existe serra para a fronteira
 * se apoiar. Onda uniforme parte a água ao meio entre duas sementes, que é exatamente onde a
 * divisa entre dois mares deve cair.
 */
const fila = new Int32Array(livres);
let cabeca = 0;
let cauda = 0;
for (const { indice, pixel } of plantadas) {
  if (dono[pixel] !== 0) continue;
  dono[pixel] = indice;
  fila[cauda++] = pixel;
}
while (cabeca < cauda) {
  const i = fila[cabeca++]!;
  const meu = dono[i]!;
  const x = i % L;
  const y = (i - x) / L;
  if (x > 0 && agua[i - 1] === 1 && dono[i - 1] === 0) {
    dono[i - 1] = meu;
    fila[cauda++] = i - 1;
  }
  if (x + 1 < L && agua[i + 1] === 1 && dono[i + 1] === 0) {
    dono[i + 1] = meu;
    fila[cauda++] = i + 1;
  }
  if (y > 0 && agua[i - L] === 1 && dono[i - L] === 0) {
    dono[i - L] = meu;
    fila[cauda++] = i - L;
  }
  if (y + 1 < A && agua[i + L] === 1 && dono[i + L] === 0) {
    dono[i + L] = meu;
    fila[cauda++] = i + L;
  }
}
console.log(`${cauda.toLocaleString('pt-BR')} pixels de água tomados por alguma zona`);

// ── costurar: NENHUMA ZONA PODE SAIR PARTIDA ──────────────────────────────────────────
/**
 * Uma zona em dois pedaços separados é **teleporte de graça**.
 *
 * A província é uma coisa só para o jogo: uma hoste que esteja num pedaço está "no Mar das
 * Cíclades", e o outro pedaço também é o Mar das Cíclades — então andar de um para o outro
 * não custa rodada nenhuma e não passa por lugar nenhum. É o mesmo defeito que o alcance
 * evita em terra, e ele nasce aqui, no assado, sem ninguém ver.
 *
 * ⚠️ **E ele passou a ser possível de verdade** quando os arquipélagos ganharam água: a
 * reivindicação das Cíclades corta o Mar das Cíclades ao meio. Por isso esta etapa existe e
 * por isso ela é RUIDOSA — caco pequeno é costurado na zona vizinha e dito em voz alta; caco
 * grande PARA o assado e pede uma semente nova, com a coordenada pronta para colar.
 */
const LIMITE_DO_CACO_KM2 = 400;
const rotulo = new Int32Array(celulas).fill(-1);
const tamanhoDoCaco: number[] = [];
const zonaDoCaco: number[] = [];
const pilha = new Int32Array(celulas);
for (let inicio = 0; inicio < celulas; inicio++) {
  const zona = dono[inicio]!;
  if (zona < PRIMEIRO_INDICE_DE_MAR || rotulo[inicio] !== -1) continue;
  const caco = tamanhoDoCaco.length;
  tamanhoDoCaco.push(0);
  zonaDoCaco.push(zona);
  let topo = 0;
  pilha[topo++] = inicio;
  rotulo[inicio] = caco;
  while (topo > 0) {
    const i = pilha[--topo]!;
    tamanhoDoCaco[caco]!++;
    const x = i % L;
    const y = (i - x) / L;
    const vizinhos = [x > 0 ? i - 1 : -1, x + 1 < L ? i + 1 : -1, y > 0 ? i - L : -1, y + 1 < A ? i + L : -1];
    for (const j of vizinhos) {
      if (j < 0 || rotulo[j] !== -1 || dono[j] !== zona) continue;
      rotulo[j] = caco;
      pilha[topo++] = j;
    }
  }
}

const maiorDaZona = new Map<number, number>();
for (let c = 0; c < tamanhoDoCaco.length; c++) {
  const z = zonaDoCaco[c]!;
  const atual = maiorDaZona.get(z);
  if (atual === undefined || tamanhoDoCaco[c]! > tamanhoDoCaco[atual]!) maiorDaZona.set(z, c);
}
const soltos = new Set<number>();
for (let c = 0; c < tamanhoDoCaco.length; c++) {
  if (maiorDaZona.get(zonaDoCaco[c]!) !== c) soltos.add(c);
}

if (soltos.size > 0) {
  // Com quem cada caco solto faz mais fronteira — é para lá que ele vai.
  const encosta = new Map<number, Map<number, number>>();
  for (let i = 0; i < celulas; i++) {
    const c = rotulo[i]!;
    if (c < 0 || !soltos.has(c)) continue;
    const x = i % L;
    const y = (i - x) / L;
    const vizinhos = [x > 0 ? i - 1 : -1, x + 1 < L ? i + 1 : -1, y > 0 ? i - L : -1, y + 1 < A ? i + L : -1];
    for (const j of vizinhos) {
      if (j < 0) continue;
      const outra = dono[j]!;
      if (outra < PRIMEIRO_INDICE_DE_MAR || rotulo[j] === c) continue;
      if (!encosta.has(c)) encosta.set(c, new Map());
      const m = encosta.get(c)!;
      m.set(outra, (m.get(outra) ?? 0) + 1);
    }
  }

  const grandes: string[] = [];
  const costurados: string[] = [];
  for (const c of [...soltos].sort((a, b) => tamanhoDoCaco[b]! - tamanhoDoCaco[a]!)) {
    const km2 = tamanhoDoCaco[c]! * km2PorPixel;
    const nome = mares[zonaDoCaco[c]! - PRIMEIRO_INDICE_DE_MAR]?.nome ?? '?';
    const onde = centroEmLonLat(c, rotulo);
    if (km2 > LIMITE_DO_CACO_KM2) {
      grandes.push(
        `${nome} saiu partida: um pedaço de ${km2.toFixed(0)} km² ficou solto.
` +
          `      Plante uma zona nele:  ` +
          `{ "id": "...", "nome": "...", "lon": ${onde.lon.toFixed(2)}, "lat": ${onde.lat.toFixed(2)} }`,
      );
      continue;
    }
    // Ordenado por índice antes de escolher: com dois vizinhos empatados na fronteira, ganha
    // o de menor índice, e o mesmo mapa é assado igual em qualquer máquina.
    const vizinhas = [...(encosta.get(c) ?? new Map<number, number>())].sort(
      (a, b) => a[0] - b[0],
    );
    let destino = 0;
    let maior = 0;
    for (const [z, quanto] of vizinhas) {
      if (quanto > maior) {
        maior = quanto;
        destino = z;
      }
    }
    for (let i = 0; i < celulas; i++) if (rotulo[i] === c) dono[i] = destino;
    const paraOnde =
      destino === 0
        ? 'virou água sem nome (não encostava em zona nenhuma)'
        : `costurado em ${mares[destino - PRIMEIRO_INDICE_DE_MAR]?.nome}`;
    costurados.push(`${nome}: caco de ${km2.toFixed(0)} km² ${paraOnde}`);
  }
  for (const linha of costurados) console.log(`  ${linha}`);
  if (grandes.length > 0) {
    for (const g of grandes) console.error(`  ${g}`);
    throw new Error(
      `${grandes.length} zona(s) de mar sairiam PARTIDAS em pedaços que não se tocam — ` +
        'uma hoste andaria de um pedaço ao outro de graça. Nada foi escrito.',
    );
  }
}

function centroEmLonLat(caco: number, rotulos: Int32Array): { lon: number; lat: number } {
  let n = 0;
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < celulas; i++) {
    if (rotulos[i] !== caco) continue;
    n++;
    sx += i % L;
    sy += Math.floor(i / L);
  }
  const { oeste, leste, sul, norte } = mapa.limitesReferencia;
  const u = ((sx / n) * unidadesPorPixel - MARGEM) / (mapa.dimensoes.largura - MARGEM * 2);
  const v = ((sy / n) * unidadesPorPixel - MARGEM) / (mapa.dimensoes.altura - MARGEM * 2);
  return { lon: oeste + u * (leste - oeste), lat: norte - v * (norte - sul) };
}

// ── medir ─────────────────────────────────────────────────────────────────────────────
const porIndice = new Map<number, ProvinciaAssada>();
for (const p of assado.provincias) porIndice.set(p.indice, p);
for (const { semente, indice } of plantadas) {
  porIndice.set(indice, {
    indice,
    id: semente.id,
    nome: semente.nome,
    regiao: 'mar',
    dono: '',
    areaKm2: 0,
    centro: { x: 0, y: 0 },
    vizinhas: [],
    mar: true,
  });
}

const pixelsPor = new Map<number, number>();
const somaX = new Map<number, number>();
const somaY = new Map<number, number>();
const vizinhas = new Map<number, Set<number>>();
const encostar = (a: number, b: number): void => {
  if (a === b || a === 0 || b === 0) return;
  // ⚠️ Só interessa a vizinhança que ENVOLVE mar: terra com terra já foi medida quando o
  // mapa das províncias foi assado, e recalcular aqui seria uma segunda verdade.
  const a1000 = a >= PRIMEIRO_INDICE_DE_MAR;
  const b1000 = b >= PRIMEIRO_INDICE_DE_MAR;
  if (!a1000 && !b1000) return;
  if (!vizinhas.has(a)) vizinhas.set(a, new Set());
  if (!vizinhas.has(b)) vizinhas.set(b, new Set());
  vizinhas.get(a)!.add(b);
  vizinhas.get(b)!.add(a);
};

for (let i = 0; i < celulas; i++) {
  const d = dono[i]!;
  if (d === 0) continue;
  const x = i % L;
  const y = (i - x) / L;
  if (d >= PRIMEIRO_INDICE_DE_MAR) {
    pixelsPor.set(d, (pixelsPor.get(d) ?? 0) + 1);
    somaX.set(d, (somaX.get(d) ?? 0) + x);
    somaY.set(d, (somaY.get(d) ?? 0) + y);
  }
  if (x + 1 < L) encostar(d, dono[i + 1]!);
  if (y + 1 < A) encostar(d, dono[i + L]!);
}

for (const { indice } of plantadas) {
  const zona = porIndice.get(indice)!;
  const n = pixelsPor.get(indice) ?? 0;
  zona.areaKm2 = Math.round(n * km2PorPixel);
  zona.centro =
    n > 0
      ? {
          x: Math.round((somaX.get(indice)! / n) * unidadesPorPixel),
          y: Math.round((somaY.get(indice)! / n) * unidadesPorPixel),
        }
      : { x: 0, y: 0 };
}

// A vizinhança nova entra nos DOIS lados: a zona ganha as costas, e cada costa ganha o mar.
for (const [indice, vizinhos] of vizinhas) {
  const p = porIndice.get(indice);
  if (!p) continue;
  const nomes = new Set(p.vizinhas);
  for (const v of vizinhos) {
    const outro = porIndice.get(v);
    if (outro) nomes.add(outro.id);
  }
  p.vizinhas = [...nomes].sort();
}

// ── relatar ───────────────────────────────────────────────────────────────────────────
const zonas = plantadas.map(({ indice }) => porIndice.get(indice)!);
const vazias = zonas.filter((z) => z.areaKm2 === 0);
console.log(`\n${zonas.length} zonas medidas, ${vazias.length} vazias`);
for (const z of [...zonas].sort((a, b) => b.areaKm2 - a.areaKm2)) {
  const costas = z.vizinhas.filter((v) => !porIndice.get(indiceDe(v))?.mar).length;
  const mares = z.vizinhas.length - costas;
  console.log(
    `  ${z.id.padEnd(22)} ${String(z.areaKm2).padStart(7)} km²` +
      ` · ${String(mares).padStart(2)} zonas · ${String(costas).padStart(2)} costas`,
  );
}
function indiceDe(id: string): number {
  for (const [i, p] of porIndice) if (p.id === id) return i;
  return 0;
}

const ilhas = assado.provincias.filter(
  (p) => !p.mar && p.vizinhas.every((v) => porIndice.get(indiceDe(v))?.mar === true),
);
console.log(`\nilhas que agora encostam SÓ no mar: ${ilhas.length}`);
const orfas = assado.provincias.filter((p) => !p.mar && p.vizinhas.length === 0);
console.log(`províncias ainda sem vizinha nenhuma: ${orfas.length}`);
if (orfas.length > 0) console.log(`  ${orfas.map((p) => p.id).join(', ')}`);

// ── as travessias: quantos saltos custa ir daqui até lá ───────────────────────────────
/**
 * ⚠️ **É o relatório que calibra o número de zonas.** Henrique quer que a viagem CUSTE:
 * *"tem que ter muita área para andar no mar para ter mais tempo de viagem de um local a
 * outro"*. Com um salto por rodada, o número de saltos É o número de turnos — então este
 * bloco é a régua do ritmo naval, e ele roda no ensaio seco, antes de assar coisa nenhuma.
 */
const grafo = new Map<string, string[]>();
for (const p of porIndice.values()) grafo.set(p.id, p.vizinhas);

function saltos(de: string, para: string): number {
  if (de === para) return 0;
  const visto = new Set([de]);
  let borda = [de];
  for (let passo = 1; passo <= 60; passo++) {
    const proxima: string[] = [];
    for (const atual of borda) {
      for (const v of grafo.get(atual) ?? []) {
        if (visto.has(v)) continue;
        if (v === para) return passo;
        visto.add(v);
        proxima.push(v);
      }
    }
    if (proxima.length === 0) return -1;
    borda = proxima;
  }
  return -1;
}

console.log('\ntravessias, em saltos (com 1 salto por rodada, é o número de turnos):');
for (const [de, para] of [
  ['atenas', 'salamina'],
  ['atenas', 'egina'],
  ['atenas', 'andros'],
  ['atenas', 'naxos'],
  ['atenas', 'melos'],
  ['atenas', 'quios'],
  ['atenas', 'samos'],
  ['atenas', 'rodes'],
  ['atenas', 'corcira'],
  ['atenas', 'lemnos'],
] as const) {
  const n = saltos(de, para);
  console.log(`  ${de} -> ${para.padEnd(10)} ${n < 0 ? 'SEM CAMINHO' : String(n) + ' saltos'}`);
}

// ── escrever ──────────────────────────────────────────────────────────────────────────
if (SECO) {
  console.log('\n--seco: nada foi escrito');
} else {
  const png = new PNG({ width: L, height: A });
  for (let i = 0; i < celulas; i++) {
    const d = dono[i]!;
    png.data[i * 4] = d & 0xff;
    png.data[i * 4 + 1] = (d >> 8) & 0xff;
    png.data[i * 4 + 2] = 0;
    png.data[i * 4 + 3] = 255;
  }
  writeFileSync(resolve(PASTA, 'provincias.png'), PNG.sync.write(png));
  assado.provincias = [...assado.provincias, ...zonas];
  writeFileSync(
    resolve(PASTA, 'provincias.json'),
    JSON.stringify(assado, null, 2) + '\n',
  );
  console.log('\nprovincias.png e provincias.json atualizados');
}
