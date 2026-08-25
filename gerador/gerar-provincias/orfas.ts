/**
 * Terra que ninguém reivindicou — e a sugestão de a quem ela poderia pertencer.
 *
 * ⚠️ **A sugestão é ponto de partida para revisão humana, nunca decisão automática.** Ela
 * anda em anéis a partir do centro da ilha até esbarrar em pixel com dono, sobre a água
 * inclusive, porque a pergunta aqui é de VIZINHANÇA no mapa, não de caminho por terra.
 */

import { desprojetar } from './grade';
import type { Grade } from './grade';
import type { SementePlantada } from './sementes';

interface Orfa {
  km2: number;
  lon: number;
  lat: number;
  pixel: number;
}

/** As ilhas sem dono, da maior para a menor. */
export function acharOrfas(grade: Grade, dono: Uint16Array): Orfa[] {
  const { largura: L, altura: A, celulas, custo } = grade;
  const visitado = new Uint8Array(celulas);
  const orfas: Orfa[] = [];
  const pilha: number[] = [];

  for (let inicio = 0; inicio < celulas; inicio++) {
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
    const { lon, lat } = desprojetar(grade, somaX / contagem, somaY / contagem);
    orfas.push({ km2: contagem * grade.km2PorPixel, lon, lat, pixel: inicio });
  }

  orfas.sort((a, b) => b.km2 - a.km2);
  return orfas;
}

export function relatarOrfas(
  grade: Grade,
  dono: Uint16Array,
  sementes: readonly SementePlantada[],
  orfas: readonly Orfa[],
  sugerir: boolean,
): void {
  if (orfas.length === 0) return;
  const total = orfas.reduce((s, o) => s + o.km2, 0);
  console.warn(`\n${orfas.length} pedaços de terra sem dono (${total.toFixed(0)} km² no total).`);

  if (!sugerir) {
    console.warn('Rode com --sugerir pra ver a que província cada uma pertenceria.');
    for (const o of orfas.slice(0, 12)) {
      console.warn(
        `  ${o.km2.toFixed(0).padStart(6)} km²   lon ${o.lon.toFixed(2)}, lat ${o.lat.toFixed(2)}`,
      );
    }
    return;
  }

  console.warn(
    'Sugestão de anexo, por província — REVISE antes de colar em dados/provincias.json:\n',
  );
  const porProvincia = new Map<string, Array<{ lon: number; lat: number; km2: number }>>();
  for (const o of orfas) {
    const indice = provinciaMaisProxima(grade, dono, o.pixel);
    const nome = indice === 0 ? '(nenhuma perto)' : sementes[indice - 1]!.semente.id;
    if (!porProvincia.has(nome)) porProvincia.set(nome, []);
    porProvincia.get(nome)!.push({ lon: o.lon, lat: o.lat, km2: o.km2 });
  }
  for (const [id, lista] of [...porProvincia].sort((a, b) => b[1].length - a[1].length)) {
    const marcadores = lista
      .map((i) => `{ "lon": ${i.lon.toFixed(3)}, "lat": ${i.lat.toFixed(3)} }`)
      .join(', ');
    console.warn(
      `  ${id}  (${lista.length}, ${lista.reduce((s, i) => s + i.km2, 0).toFixed(0)} km²)`,
    );
    console.warn(`    "anexos": [${marcadores}]\n`);
  }
}

function provinciaMaisProxima(grade: Grade, dono: Uint16Array, pixel: number): number {
  const { largura: L, altura: A } = grade;
  const x0 = pixel % L;
  const y0 = (pixel - x0) / L;
  const MAXIMO = Math.round(200 / grade.unidadesPorPixel);
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
