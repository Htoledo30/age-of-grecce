/**
 * Encontra os sítios que a geografia JUSTIFICA — não sorteia lugar nenhum.
 *
 * Cidade não nasce em coordenada aleatória. Nasce onde o terreno obriga: na foz de um
 * rio, numa baía abrigada, no gargalo entre duas serras, na margem de um estreito. Esta
 * ferramenta lê a máscara de navegação, os rios e os biomas, e lista os candidatos com o
 * MOTIVO de cada um. A escolha final de quais viram cidade é feita à mão, olhando a lista.
 *
 * uso: npm run sitios
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';

const LARGURA = 8192;
const ALTURA = 7168;

interface Sitio {
  motivo: string;
  x: number;
  y: number;
  /** Quanto o terreno justifica esse lugar. Serve pra ordenar a lista, não pra decidir. */
  peso: number;
  detalhe: string;
}

const nav = PNG.sync.read(readFileSync(resolve('assets/mundo/navegacao.png')));
const biomasPng = PNG.sync.read(readFileSync(resolve('assets/mundo/biomas.png')));
const hidrologia = JSON.parse(readFileSync(resolve('assets/mundo/hidrologia.json'), 'utf8')) as {
  rios: Array<{ pontos: Array<[number, number]>; vazao: number }>;
};

function terra(x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= LARGURA || y >= ALTURA) return false;
  const px = Math.min(nav.width - 1, Math.floor((x / LARGURA) * nav.width));
  const py = Math.min(nav.height - 1, Math.floor((y / ALTURA) * nav.height));
  return (nav.data[(py * nav.width + px) * 4] ?? 0) >= 200;
}

/** Índice do bioma: 0 mar fundo, 1 mar raso, 2 praia, 3 planície, 4 estepe, 5 floresta,
 *  6 colina, 7 montanha, 8 pico. */
function bioma(x: number, y: number): number {
  const px = Math.min(
    biomasPng.width - 1,
    Math.max(0, Math.floor((x / LARGURA) * biomasPng.width)),
  );
  const py = Math.min(
    biomasPng.height - 1,
    Math.max(0, Math.floor((y / ALTURA) * biomasPng.height)),
  );
  return biomasPng.data[(py * biomasPng.width + px) * 4] ?? 0;
}

/** Terra firme com folga: nada de sítio pendurado na linha de costa. */
function firme(x: number, y: number, folga = 26): boolean {
  if (!terra(x, y)) return false;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    if (!terra(x + Math.cos(a) * folga, y + Math.sin(a) * folga)) return false;
  }
  return true;
}

/** Quanta água existe num anel em volta — mede o quanto o lugar é litorâneo. */
function aguaEmVolta(x: number, y: number, raio: number): number {
  let agua = 0;
  const amostras = 32;
  for (let i = 0; i < amostras; i++) {
    const a = (i / amostras) * Math.PI * 2;
    if (!terra(x + Math.cos(a) * raio, y + Math.sin(a) * raio)) agua++;
  }
  return agua / amostras;
}

const sitios: Sitio[] = [];

// --- 1. Fozes de rio ---------------------------------------------------------
//
// O sítio urbano mais forte que existe: água doce, saída pro mar, e o rio como estrada
// pro interior. Quase toda cidade antiga de porte começou numa foz.

for (const rio of hidrologia.rios) {
  const foz = rio.pontos.at(-1);
  if (!foz) continue;
  // recua pela margem até achar chão firme: a foz em si é água
  for (let recuo = 40; recuo <= 260; recuo += 20) {
    const i = Math.max(0, rio.pontos.length - 1 - Math.round(recuo / 12));
    const p = rio.pontos[i];
    if (!p) break;
    for (const lado of [-1, 1]) {
      for (let desvio = 30; desvio <= 90; desvio += 20) {
        const x = Math.round(p[0] + lado * desvio);
        const y = Math.round(p[1]);
        if (!firme(x, y)) continue;
        if (aguaEmVolta(x, y, 120) < 0.12) continue;
        sitios.push({
          motivo: 'foz de rio',
          x,
          y,
          peso: rio.vazao,
          detalhe: `vazão ${Math.round(rio.vazao)}, saída pro mar com rio até o interior`,
        });
        recuo = 999;
        break;
      }
      if (recuo === 999) break;
    }
  }
}

// --- 2. Enseadas abrigadas ---------------------------------------------------
//
// Ponto de costa onde o mar entra pela terra: muita água por perto e pouca no alcance
// maior significa baía fechada, não costa aberta. Abrigo é o que faz um porto.

for (let y = 200; y < ALTURA - 200; y += 60) {
  for (let x = 200; x < LARGURA - 200; x += 60) {
    if (!firme(x, y)) continue;
    const perto = aguaEmVolta(x, y, 70);
    const longe = aguaEmVolta(x, y, 300);
    if (perto < 0.3) continue; // não é litoral
    if (longe > perto) continue; // costa aberta: o mar só aumenta, não abriga
    const abrigo = perto - longe;
    if (abrigo < 0.18) continue;
    sitios.push({
      motivo: 'enseada abrigada',
      x,
      y,
      peso: abrigo * 1000,
      detalhe: `mar em ${Math.round(perto * 100)}% do entorno próximo e só ${Math.round(longe * 100)}% do distante — baía, não costa aberta`,
    });
  }
}

// --- 3. Passagens de montanha ------------------------------------------------
//
// Terreno baixo cercado de alto nos dois lados: o único jeito de atravessar a serra.
// Quem senta na passagem controla quem passa — e cobra por isso.

const ALTO = 6; // colina pra cima

for (let y = 300; y < ALTURA - 300; y += 70) {
  for (let x = 300; x < LARGURA - 300; x += 70) {
    if (!firme(x, y)) continue;
    if (bioma(x, y) >= ALTO) continue; // a passagem é o vão, não o cume

    let melhor = 0;
    for (const [dx, dy] of [
      [1, 0],
      [0, 1],
      [0.7, 0.7],
      [0.7, -0.7],
    ] as const) {
      let altoUmLado = false;
      let altoOutro = false;
      for (let d = 90; d <= 300; d += 30) {
        if (bioma(x + dx * d, y + dy * d) >= ALTO) altoUmLado = true;
        if (bioma(x - dx * d, y - dy * d) >= ALTO) altoOutro = true;
      }
      if (altoUmLado && altoOutro) melhor++;
    }
    if (melhor === 0) continue;
    sitios.push({
      motivo: 'passagem de montanha',
      x,
      y,
      peso: melhor * 100,
      detalhe: 'vão baixo com terreno alto dos dois lados — quem senta aqui controla a travessia',
    });
  }
}

// --- 4. Margens de estreito ---------------------------------------------------
//
// Terra firme com terra firme do outro lado a curta distância: dali se vê e se bloqueia
// quem passa. É o sítio das fechaduras do mundo.

for (let y = 200; y < ALTURA - 200; y += 80) {
  for (let x = 200; x < LARGURA - 200; x += 80) {
    if (!firme(x, y)) continue;
    if (aguaEmVolta(x, y, 80) < 0.2) continue;

    for (const [dx, dy] of [
      [1, 0],
      [0, 1],
      [0.7, 0.7],
      [0.7, -0.7],
    ] as const) {
      let atravessouAgua = false;
      for (let d = 100; d <= 700; d += 25) {
        const px = x + dx * d;
        const py = y + dy * d;
        if (!terra(px, py)) {
          atravessouAgua = true;
          continue;
        }
        if (atravessouAgua && firme(px, py, 20)) {
          sitios.push({
            motivo: 'margem de estreito',
            x,
            y,
            peso: 1000 - d,
            detalhe: `outra margem a ${Math.round(d * 0.14)} km — daqui se bloqueia a passagem`,
          });
        }
        break;
      }
    }
  }
}

// --- 5. Um sítio garantido por massa de terra ---------------------------------
//
// Os critérios acima são de continente: dependem de rio grande, serra ou estreito. Ilha
// pequena não tem nada disso e ficaria vazia — e ilha vazia é o defeito que a gente já
// combateu quando engordou as ilhas do centro. Então cada massa de terra ganha, por
// construção, os dois sítios que qualquer ilha real tem:
//
//   - o melhor ABRIGO da costa (onde o porto nasce)
//   - o CORAÇÃO, o ponto mais distante do mar (onde a aldeia do interior nasce)

interface Massa {
  pontos: number[];
  area: number;
}

function componentesDeTerra(): Massa[] {
  const L = nav.width;
  const A = nav.height;
  const visto = new Uint8Array(L * A);
  const massas: Massa[] = [];
  const ehTerra = (i: number): boolean => (nav.data[i * 4] ?? 0) >= 200;

  for (let inicio = 0; inicio < L * A; inicio++) {
    if (visto[inicio] || !ehTerra(inicio)) continue;
    const pilha = [inicio];
    visto[inicio] = 1;
    const pontos: number[] = [];
    while (pilha.length > 0) {
      const i = pilha.pop()!;
      pontos.push(i);
      const x = i % L;
      const y = (i / L) | 0;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= L || ny >= A) continue;
        const j = ny * L + nx;
        if (visto[j] || !ehTerra(j)) continue;
        visto[j] = 1;
        pilha.push(j);
      }
    }
    massas.push({ pontos, area: pontos.length });
  }
  return massas.sort((a, b) => b.area - a.area);
}

const KM2_POR_PIXEL = (LARGURA / nav.width) * (ALTURA / nav.height) * 0.0196;

for (const massa of componentesDeTerra()) {
  const km2 = Math.round(massa.area * KM2_POR_PIXEL);
  if (km2 < 900) continue; // ilhota de paisagem: não comporta assentamento

  let coracao = { x: 0, y: 0, distancia: -1 };
  let abrigo = { x: 0, y: 0, qualidade: -1 };

  // amostra: percorrer milhões de pixels ponto a ponto seria desperdício
  const passo = Math.max(1, Math.floor(massa.pontos.length / 4000));
  for (let k = 0; k < massa.pontos.length; k += passo) {
    const i = massa.pontos[k]!;
    const x = ((i % nav.width) / nav.width) * LARGURA;
    const y = (((i / nav.width) | 0) / nav.height) * ALTURA;
    if (!firme(x, y)) continue;

    let distancia = 0;
    for (let raio = 40; raio <= 900; raio += 40) {
      if (aguaEmVolta(x, y, raio) > 0.02) break;
      distancia = raio;
    }
    if (distancia > coracao.distancia) coracao = { x: Math.round(x), y: Math.round(y), distancia };

    const perto = aguaEmVolta(x, y, 70);
    const longe = aguaEmVolta(x, y, 260);
    if (perto >= 0.28) {
      const qualidade = perto - longe;
      if (qualidade > abrigo.qualidade) {
        abrigo = { x: Math.round(x), y: Math.round(y), qualidade };
      }
    }
  }

  if (abrigo.qualidade > -1) {
    sitios.push({
      motivo: 'melhor abrigo da terra',
      x: abrigo.x,
      y: abrigo.y,
      peso: km2,
      detalhe: `a costa mais abrigada de uma massa de ${km2} km² — é aqui que o porto dela nasce`,
    });
  }
  if (coracao.distancia > 0) {
    sitios.push({
      motivo: 'coração da terra',
      x: coracao.x,
      y: coracao.y,
      peso: km2,
      detalhe: `o ponto mais longe do mar numa massa de ${km2} km² (${Math.round(coracao.distancia * 0.14)} km de costa)`,
    });
  }
}

// --- saída --------------------------------------------------------------------

const porMotivo = new Map<string, Sitio[]>();
for (const s of sitios) {
  const lista = porMotivo.get(s.motivo) ?? [];
  lista.push(s);
  porMotivo.set(s.motivo, lista);
}

/** Tira os vizinhos: dois sítios a 200 unidades um do outro são o mesmo lugar. */
function ralear(lista: Sitio[], distancia: number): Sitio[] {
  const ordenada = [...lista].sort((a, b) => b.peso - a.peso);
  const saida: Sitio[] = [];
  for (const s of ordenada) {
    if (saida.some((o) => Math.hypot(o.x - s.x, o.y - s.y) < distancia)) continue;
    saida.push(s);
  }
  return saida;
}

console.log('sítios que a geografia justifica:\n');
for (const [motivo, lista] of porMotivo) {
  const limpa = ralear(lista, 260);
  console.log(`${motivo} — ${limpa.length} lugares (de ${lista.length} brutos)`);
  for (const s of limpa.slice(0, 14)) {
    console.log(`   ${String(s.x).padStart(4)}, ${String(s.y).padStart(4)}   ${s.detalhe}`);
  }
  console.log('');
}
