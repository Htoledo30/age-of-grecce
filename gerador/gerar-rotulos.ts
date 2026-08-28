/**
 * Onde escrever o NOME de cada província no mapa — e quanto espaço ele tem.
 *
 * Ferramenta de autoria: roda na mão, nada disso acontece durante uma partida.
 *
 * Pedido de Henrique: *"o nome de cada província deve ser escrito diretamente no mapa dentro
 * de cada província"*. A pergunta parece boba e não é: **num polígono torto, o centro não fica
 * dentro dele.** O `centro` que o mapa já guarda é a média das coordenadas — o centroide —, e
 * numa Ática em forma de gancho, num arquipélago ou numa costa em crescente ele cai no mar, no
 * vizinho, ou no vão entre duas ilhas. Escrever o nome ali põe "Mégara" em cima de Corinto.
 *
 * ## O ponto certo é o PÓLO DE INACESSIBILIDADE
 *
 * É o ponto mais distante da borda da forma — o centro do maior círculo que cabe dentro dela.
 * Sempre está dentro, mesmo que a forma seja um C. A cartografia digital chegou nisso pelo
 * mesmo caminho: é o que o `polylabel` da Mapbox calcula, com uma busca em grade sobre o
 * polígono, e é o que o Mapbox GL usa para rotular país e estado.
 *
 * ⚠️ **Aqui sai de graça e exato, porque o nosso mapa é RASTER e não polígono.** O
 * `provincias.png` guarda o índice da província em cada pixel; o pólo é simplesmente o pixel
 * com a maior distância até a borda, e a distância até a borda é uma transformada de
 * distância — dois passes de varredura sobre a imagem. Nada de busca em grade, nada de
 * geometria, nada de aproximação.
 *
 * ## E o RAIO é a metade útil da resposta
 *
 * Junto com o ponto vai o raio do maior círculo inscrito, e é ele que resolve a poluição que
 * todo jogo do gênero tem. A regra da cartografia é: **rótulo de área só se desenha se ele
 * COUBER dentro da área naquele zoom** — e o raio é o que deixa a tela responder isso sem
 * adivinhar. Zoom baixo, só as províncias grandes têm nome; zoom alto, todas cabem. É nível de
 * detalhe automático, sem um único limiar escrito à mão.
 *
 * ⚠️ **ADITIVO, como o gerador de mares.** Lê o `provincias.png` pronto e escreve SÓ o
 * `provincias.json` de volta, com um campo novo por província. Nenhum pixel muda, nenhum id
 * muda, nenhum salvamento quebra — e não é preciso re-assar o mapa para ter os rótulos.
 *
 * uso:  npx tsx --max-old-space-size=8192 gerador/gerar-rotulos.ts [--seco]
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';

const PASTA = resolve('assets/mundo');
const SECO = process.argv.includes('--seco');

/** Pesos do chanfro 5-7: aproximam a euclidiana com dois passes de varredura. */
const RETO = 5;
const DIAGONAL = 7;
const LONGE = 0x3fffffff;

interface ProvinciaAssada {
  indice: number;
  id: string;
  nome: string;
  centro: { x: number; y: number };
  rotulo?: { x: number; y: number; raio: number };
  mar?: boolean;
  [k: string]: unknown;
}

const mapa = JSON.parse(readFileSync(resolve(PASTA, 'mapa.json'), 'utf8')) as {
  dimensoes: { largura: number; altura: number };
};
const assado = JSON.parse(readFileSync(resolve(PASTA, 'provincias.json'), 'utf8')) as {
  provincias: ProvinciaAssada[];
  [k: string]: unknown;
};
const png = PNG.sync.read(readFileSync(resolve(PASTA, 'provincias.png')));
const L = png.width;
const A = png.height;
const celulas = L * A;
const unidadesPorPixel = mapa.dimensoes.largura / L;

const indice = new Uint16Array(celulas);
for (let i = 0; i < celulas; i++) {
  indice[i] = png.data[i * 4]! | (png.data[i * 4 + 1]! << 8);
}

// ── a distância até a borda mais próxima ──────────────────────────────────────────────
/**
 * A semente é a BORDA: todo pixel que encosta em outro índice, e a moldura da imagem.
 *
 * ⚠️ A moldura entra porque uma província cortada pela beirada do mapa não tem borda
 * desenhada ali — sem isto, o pólo dela fugiria para fora da tela.
 */
const distancia = new Int32Array(celulas);
for (let i = 0; i < celulas; i++) {
  const meu = indice[i]!;
  const x = i % L;
  const y = (i - x) / L;
  const naMoldura = x === 0 || y === 0 || x === L - 1 || y === A - 1;
  const naBorda =
    naMoldura ||
    (x > 0 && indice[i - 1] !== meu) ||
    (x + 1 < L && indice[i + 1] !== meu) ||
    (y > 0 && indice[i - L] !== meu) ||
    (y + 1 < A && indice[i + L] !== meu);
  distancia[i] = naBorda ? 0 : LONGE;
}

for (let y = 0; y < A; y++) {
  for (let x = 0; x < L; x++) {
    const i = y * L + x;
    let v = distancia[i]!;
    if (v === 0) continue;
    if (y > 0) {
      if (x > 0) v = Math.min(v, distancia[i - L - 1]! + DIAGONAL);
      v = Math.min(v, distancia[i - L]! + RETO);
      if (x + 1 < L) v = Math.min(v, distancia[i - L + 1]! + DIAGONAL);
    }
    if (x > 0) v = Math.min(v, distancia[i - 1]! + RETO);
    distancia[i] = v;
  }
}
for (let y = A - 1; y >= 0; y--) {
  for (let x = L - 1; x >= 0; x--) {
    const i = y * L + x;
    let v = distancia[i]!;
    if (v === 0) continue;
    if (y + 1 < A) {
      if (x + 1 < L) v = Math.min(v, distancia[i + L + 1]! + DIAGONAL);
      v = Math.min(v, distancia[i + L]! + RETO);
      if (x > 0) v = Math.min(v, distancia[i + L - 1]! + DIAGONAL);
    }
    if (x + 1 < L) v = Math.min(v, distancia[i + 1]! + RETO);
    distancia[i] = v;
  }
}

// ── o pólo de cada província: o pixel mais fundo dela ─────────────────────────────────
const melhor = new Map<number, { pixel: number; distancia: number }>();
for (let i = 0; i < celulas; i++) {
  const id = indice[i]!;
  if (id === 0) continue;
  const d = distancia[i]!;
  const atual = melhor.get(id);
  if (atual === undefined || d > atual.distancia) melhor.set(id, { pixel: i, distancia: d });
}

const semRotulo: string[] = [];
for (const provincia of assado.provincias) {
  const achado = melhor.get(provincia.indice);
  if (achado === undefined) {
    semRotulo.push(provincia.id);
    continue;
  }
  const x = achado.pixel % L;
  const y = (achado.pixel - x) / L;
  provincia.rotulo = {
    x: Math.round(x * unidadesPorPixel),
    y: Math.round(y * unidadesPorPixel),
    // O chanfro conta em quintos de pixel; de volta a pixel, e daí a unidades de mundo.
    raio: Math.round((achado.distancia / RETO) * unidadesPorPixel),
  };
}

// ── relatar ───────────────────────────────────────────────────────────────────────────
const comRotulo = assado.provincias.filter((p) => p.rotulo !== undefined);
const porRaio = [...comRotulo].sort((a, b) => (b.rotulo?.raio ?? 0) - (a.rotulo?.raio ?? 0));
console.log(`${comRotulo.length} rótulos calculados · ${semRotulo.length} sem pixel no mapa`);
if (semRotulo.length > 0) console.log(`  sem rótulo: ${semRotulo.join(', ')}`);

console.log('\nos dez com mais espaço:');
for (const p of porRaio.slice(0, 10)) {
  console.log(`  ${p.id.padEnd(22)} raio ${String(p.rotulo?.raio).padStart(5)}`);
}
console.log('\nos dez mais apertados:');
for (const p of porRaio.slice(-10)) {
  console.log(`  ${p.id.padEnd(22)} raio ${String(p.rotulo?.raio).padStart(5)}`);
}

/**
 * ⚠️ **A prova de que o pólo é melhor que o centroide**: quantos centroides caem FORA da
 * própria província. Um número maior que zero aqui é a lista de nomes que estariam escritos
 * no vizinho, ou no mar.
 */
const foraDeSi = assado.provincias.filter((p) => {
  const x = Math.round(p.centro.x / unidadesPorPixel);
  const y = Math.round(p.centro.y / unidadesPorPixel);
  if (x < 0 || y < 0 || x >= L || y >= A) return true;
  return indice[y * L + x] !== p.indice;
});
console.log(
  `\ncentroides que caem FORA da própria província: ${foraDeSi.length} de ${assado.provincias.length}`,
);
if (foraDeSi.length > 0) {
  console.log(`  ${foraDeSi.map((p) => p.id).slice(0, 20).join(', ')}`);
}

if (SECO) {
  console.log('\n--seco: nada foi escrito');
} else {
  writeFileSync(resolve(PASTA, 'provincias.json'), JSON.stringify(assado, null, 2) + '\n');
  console.log('\nprovincias.json atualizado — o PNG não foi tocado');
}
