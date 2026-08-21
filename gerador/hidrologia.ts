/**
 * Hidrologia fixa do mapa.
 *
 * Reduzimos o campo de altitude para uma malha de drenagem, preenchemos depressões
 * numéricas com Priority Flood e acumulamos a chuva de cada célula até o mar. O
 * resultado são cursos que obedecem ao relevo e podem virar travessias, pontes e
 * modificadores de marcha mais tarde.
 */

import type { Terreno } from './pintar-terreno';

type Ponto = [number, number];

interface Rio {
  pontos: Ponto[];
  /** Área de contribuição aproximada na malha, usada como força relativa do rio. */
  vazao: number;
  /** Largura máxima em pixels da arte do terreno. */
  largura: number;
}

export interface Hidrologia {
  versao: 1;
  resolucaoCalculo: number;
  rios: Rio[];
  lagoas: Array<{ contorno: Ponto[] }>;
}

const RESOLUCAO_DRENAGEM = 1024;
const VAZAO_MINIMA_FOZ = 820;
const VAZAO_MINIMA_NASCENTE = 18;
const MAXIMO_RIOS = 22;
const DISTANCIA_MINIMA_FOZ = 30;
/** Folga que impede uma nascente ou trecho de morrer na borda artificial do mapa. */
const FOLGA_MOLDURA = 14;

const VIZINHOS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];

class FilaPrioridade {
  private readonly indices: number[] = [];
  private readonly valores: number[] = [];

  get vazia(): boolean {
    return this.indices.length === 0;
  }

  inserir(indice: number, valor: number): void {
    let posicao = this.indices.length;
    this.indices.push(indice);
    this.valores.push(valor);
    while (posicao > 0) {
      const pai = (posicao - 1) >> 1;
      if (this.valores[pai]! <= valor) break;
      this.indices[posicao] = this.indices[pai]!;
      this.valores[posicao] = this.valores[pai]!;
      posicao = pai;
    }
    this.indices[posicao] = indice;
    this.valores[posicao] = valor;
  }

  retirar(): [number, number] {
    const indice = this.indices[0]!;
    const valor = this.valores[0]!;
    const ultimoIndice = this.indices.pop()!;
    const ultimoValor = this.valores.pop()!;
    if (this.indices.length === 0) return [indice, valor];

    let posicao = 0;
    while (true) {
      const esquerda = posicao * 2 + 1;
      if (esquerda >= this.indices.length) break;
      const direita = esquerda + 1;
      const filho =
        direita < this.indices.length && this.valores[direita]! < this.valores[esquerda]!
          ? direita
          : esquerda;
      if (this.valores[filho]! >= ultimoValor) break;
      this.indices[posicao] = this.indices[filho]!;
      this.valores[posicao] = this.valores[filho]!;
      posicao = filho;
    }
    this.indices[posicao] = ultimoIndice;
    this.valores[posicao] = ultimoValor;
    return [indice, valor];
  }
}

function indiceVizinho(x: number, y: number, dx: number, dy: number, lado: number): number {
  const nx = x + dx;
  const ny = y + dy;
  return nx < 0 || ny < 0 || nx >= lado || ny >= lado ? -1 : ny * lado + nx;
}

function reduzirTerreno(terreno: Terreno): {
  terra: Uint8Array;
  altitude: Float32Array;
} {
  const terra = new Uint8Array(RESOLUCAO_DRENAGEM * RESOLUCAO_DRENAGEM);
  const altitude = new Float32Array(terra.length);
  for (let y = 0; y < RESOLUCAO_DRENAGEM; y++) {
    const sy = Math.min(
      terreno.resolucao - 1,
      Math.floor(((y + 0.5) / RESOLUCAO_DRENAGEM) * terreno.resolucao),
    );
    for (let x = 0; x < RESOLUCAO_DRENAGEM; x++) {
      const sx = Math.min(
        terreno.resolucao - 1,
        Math.floor(((x + 0.5) / RESOLUCAO_DRENAGEM) * terreno.resolucao),
      );
      const origem = sy * terreno.resolucao + sx;
      const destino = y * RESOLUCAO_DRENAGEM + x;
      terra[destino] = terreno.terra[origem]!;
      altitude[destino] = terreno.altitude[origem]!;
    }
  }
  return { terra, altitude };
}

function drenar(
  terra: Uint8Array,
  altitude: Float32Array,
): {
  jusante: Int32Array;
  saidaMar: Int32Array;
  acumulacao: Float32Array;
} {
  const lado = RESOLUCAO_DRENAGEM;
  const visitado = new Uint8Array(terra.length);
  const nivel = new Float32Array(terra.length);
  const jusante = new Int32Array(terra.length);
  const saidaMar = new Int32Array(terra.length);
  jusante.fill(-2);
  saidaMar.fill(-1);
  const ordem = new Int32Array(terra.length);
  let tamanhoOrdem = 0;
  const fila = new FilaPrioridade();

  // Toda célula costeira é uma saída possível. O algoritmo descobre qual bacia chega a ela.
  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      const i = y * lado + x;
      if (!terra[i]) continue;
      let mar = -1;
      for (const [dx, dy] of VIZINHOS) {
        const vizinho = indiceVizinho(x, y, dx, dy, lado);
        if (vizinho < 0 || !terra[vizinho]) {
          mar = vizinho;
          if (vizinho >= 0) break;
        }
      }
      if (mar === -1) continue;
      visitado[i] = 1;
      nivel[i] = altitude[i]!;
      jusante[i] = -1;
      saidaMar[i] = mar;
      fila.inserir(i, nivel[i]);
    }
  }

  while (!fila.vazia) {
    const [i, alturaAtual] = fila.retirar();
    ordem[tamanhoOrdem++] = i;
    const x = i % lado;
    const y = (i / lado) | 0;
    for (const [dx, dy] of VIZINHOS) {
      const vizinho = indiceVizinho(x, y, dx, dy, lado);
      if (vizinho < 0 || !terra[vizinho] || visitado[vizinho]) continue;
      visitado[vizinho] = 1;
      // O epsilon impede planícies perfeitamente empatadas de virarem ciclos.
      nivel[vizinho] = Math.max(altitude[vizinho]!, alturaAtual + 0.000002);
      jusante[vizinho] = i;
      fila.inserir(vizinho, nivel[vizinho]);
    }
  }

  const acumulacao = new Float32Array(terra.length);
  for (let i = 0; i < terra.length; i++) if (terra[i]) acumulacao[i] = 1;
  for (let o = tamanhoOrdem - 1; o >= 0; o--) {
    const i = ordem[o]!;
    const destino = jusante[i]!;
    if (destino >= 0) acumulacao[destino] = acumulacao[destino]! + acumulacao[i]!;
  }
  return { jusante, saidaMar, acumulacao };
}

function distanciaQuadrada(a: number, b: number, lado: number): number {
  const ax = a % lado;
  const ay = (a / lado) | 0;
  const bx = b % lado;
  const by = (b / lado) | 0;
  return (ax - bx) ** 2 + (ay - by) ** 2;
}

function simplificar(pontos: Ponto[], tolerancia: number): Ponto[] {
  if (pontos.length <= 2) return pontos;
  const inicio = pontos[0]!;
  const fim = pontos.at(-1)!;
  const dx = fim[0] - inicio[0];
  const dy = fim[1] - inicio[1];
  const quadrado = dx * dx + dy * dy;
  let maior = 0;
  let indice = 0;
  for (let i = 1; i < pontos.length - 1; i++) {
    const p = pontos[i]!;
    const t = quadrado === 0 ? 0 : ((p[0] - inicio[0]) * dx + (p[1] - inicio[1]) * dy) / quadrado;
    const px = inicio[0] + Math.max(0, Math.min(1, t)) * dx;
    const py = inicio[1] + Math.max(0, Math.min(1, t)) * dy;
    const distancia = Math.hypot(p[0] - px, p[1] - py);
    if (distancia > maior) {
      maior = distancia;
      indice = i;
    }
  }
  if (maior <= tolerancia) return [inicio, fim];
  const esquerda = simplificar(pontos.slice(0, indice + 1), tolerancia);
  const direita = simplificar(pontos.slice(indice), tolerancia);
  return [...esquerda.slice(0, -1), ...direita];
}

/** Chaikin aberto: arredonda a malha de oito direções sem mover nascente nem foz. */
function suavizar(pontos: Ponto[], passos: number): Ponto[] {
  let atual = pontos;
  for (let passo = 0; passo < passos; passo++) {
    if (atual.length < 3) break;
    const proximo: Ponto[] = [atual[0]!];
    for (let i = 1; i < atual.length; i++) {
      const a = atual[i - 1]!;
      const b = atual[i]!;
      proximo.push(
        [a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25],
        [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75],
      );
    }
    proximo.push(atual.at(-1)!);
    atual = proximo;
  }
  return atual;
}

function tracarMontante(
  foz: number,
  melhorMontante: Int32Array,
  acumulacao: Float32Array,
): number[] {
  const celulas: number[] = [foz];
  let atual = foz;
  while (true) {
    const montante = melhorMontante[atual]!;
    if (montante < 0 || acumulacao[montante]! < VAZAO_MINIMA_NASCENTE) break;
    celulas.push(montante);
    atual = montante;
  }
  return celulas;
}

function tocaMoldura(celulas: number[], lado: number): boolean {
  return celulas.some((celula) => {
    const x = celula % lado;
    const y = (celula / lado) | 0;
    return (
      x < FOLGA_MOLDURA ||
      y < FOLGA_MOLDURA ||
      x >= lado - FOLGA_MOLDURA ||
      y >= lado - FOLGA_MOLDURA
    );
  });
}

export function gerarHidrologia(terreno: Terreno, tamanhoMundo: number): Hidrologia {
  const { terra, altitude } = reduzirTerreno(terreno);
  const { jusante, saidaMar, acumulacao } = drenar(terra, altitude);
  const lado = RESOLUCAO_DRENAGEM;

  const melhorMontante = new Int32Array(terra.length);
  melhorMontante.fill(-1);
  for (let i = 0; i < terra.length; i++) {
    const destino = jusante[i]!;
    if (destino < 0) continue;
    const atual = melhorMontante[destino]!;
    if (atual < 0 || acumulacao[i]! > acumulacao[atual]!) melhorMontante[destino] = i;
  }

  const candidatos: number[] = [];
  for (let i = 0; i < terra.length; i++) {
    const x = i % lado;
    const y = (i / lado) | 0;
    const longeDaMoldura = x >= 8 && y >= 8 && x < lado - 8 && y < lado - 8;
    if (longeDaMoldura && jusante[i] === -1 && acumulacao[i]! >= VAZAO_MINIMA_FOZ) {
      candidatos.push(i);
    }
  }
  candidatos.sort((a, b) => acumulacao[b]! - acumulacao[a]!);

  const escolhidos: number[] = [];
  for (const candidato of candidatos) {
    const trajeto = tracarMontante(candidato, melhorMontante, acumulacao);
    if (trajeto.length < 14 || tocaMoldura(trajeto, lado)) continue;
    if (
      escolhidos.every(
        (outro) => distanciaQuadrada(candidato, outro, lado) >= DISTANCIA_MINIMA_FOZ ** 2,
      )
    ) {
      escolhidos.push(candidato);
    }
    if (escolhidos.length >= MAXIMO_RIOS) break;
  }

  const escala = tamanhoMundo / lado;
  const rios: Rio[] = [];
  for (const foz of escolhidos) {
    const celulas = tracarMontante(foz, melhorMontante, acumulacao);
    celulas.reverse();
    const pontos = celulas.map<Ponto>((i) => [
      ((i % lado) + 0.5) * escala,
      (((i / lado) | 0) + 0.5) * escala,
    ]);

    // Termina no meio da aresta entre a última célula de terra e o mar.
    const mar = saidaMar[foz]!;
    if (mar >= 0) {
      const mx = ((mar % lado) + 0.5) * escala;
      const my = (((mar / lado) | 0) + 0.5) * escala;
      const ultimo = pontos.at(-1)!;
      pontos.push([(ultimo[0] + mx) / 2, (ultimo[1] + my) / 2]);
    }

    const vazao = acumulacao[foz]!;
    rios.push({
      pontos: suavizar(simplificar(pontos, escala * 0.85), 2),
      vazao: Math.round(vazao),
      largura: Math.min(3.2, 1.15 + Math.log2(vazao / VAZAO_MINIMA_FOZ + 1) * 0.58),
    });
  }

  return {
    versao: 1,
    resolucaoCalculo: RESOLUCAO_DRENAGEM,
    rios,
    // A geografia egeia pede rios curtos; não forçamos lagos onde o relevo não os sustenta.
    lagoas: [],
  };
}

function misturarCanal(
  pixels: Uint8Array,
  terra: Uint8Array,
  resolucao: number,
  x: number,
  y: number,
  raio: number,
  cor: readonly [number, number, number],
  opacidade: number,
): void {
  const minX = Math.max(0, Math.floor(x - raio - 1));
  const maxX = Math.min(resolucao - 1, Math.ceil(x + raio + 1));
  const minY = Math.max(0, Math.floor(y - raio - 1));
  const maxY = Math.min(resolucao - 1, Math.ceil(y + raio + 1));
  for (let py = minY; py <= maxY; py++) {
    for (let px = minX; px <= maxX; px++) {
      const i = py * resolucao + px;
      if (!terra[i]) continue;
      const cobertura = Math.max(
        0,
        Math.min(1, raio + 0.5 - Math.hypot(px + 0.5 - x, py + 0.5 - y)),
      );
      if (cobertura === 0) continue;
      const peso = cobertura * opacidade;
      const p = i * 4;
      pixels[p] = pixels[p]! + (cor[0] - pixels[p]!) * peso;
      pixels[p + 1] = pixels[p + 1]! + (cor[1] - pixels[p + 1]!) * peso;
      pixels[p + 2] = pixels[p + 2]! + (cor[2] - pixels[p + 2]!) * peso;
    }
  }
}

/** Assa os rios na pintura, mas conserva os vetores em hidrologia.json para o jogo. */
export function pintarHidrologia(
  terreno: Terreno,
  hidrologia: Hidrologia,
  tamanhoMundo: number,
): void {
  const paraPixel = terreno.resolucao / tamanhoMundo;
  for (const rio of hidrologia.rios) {
    for (let i = 1; i < rio.pontos.length; i++) {
      const a = rio.pontos[i - 1]!;
      const b = rio.pontos[i]!;
      const ax = a[0] * paraPixel;
      const ay = a[1] * paraPixel;
      const bx = b[0] * paraPixel;
      const by = b[1] * paraPixel;
      const comprimento = Math.hypot(bx - ax, by - ay);
      const passos = Math.max(1, Math.ceil(comprimento * 2));
      for (let passo = 0; passo <= passos; passo++) {
        const t = passo / passos;
        const progresso = (i - 1 + t) / Math.max(1, rio.pontos.length - 1);
        const raio = 0.38 + rio.largura * 0.5 * Math.pow(progresso, 0.62);
        const x = ax + (bx - ax) * t;
        const y = ay + (by - ay) * t;
        misturarCanal(
          terreno.pixels,
          terreno.terra,
          terreno.resolucao,
          x,
          y,
          raio + 0.35,
          [62, 76, 68],
          0.16,
        );
        misturarCanal(
          terreno.pixels,
          terreno.terra,
          terreno.resolucao,
          x,
          y,
          raio,
          [82, 116, 118],
          0.9,
        );
      }
    }
  }
}
