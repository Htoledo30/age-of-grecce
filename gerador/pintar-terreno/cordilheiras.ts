/**
 * As cordilheiras autorais: o esqueleto do relevo grego, escrito à mão.
 *
 * Ruído sozinho dá montanha em lugar nenhum. O Pindo, o Olimpo e o Taígeto existem em
 * coordenadas reais, e o campo que sai daqui é o que puxa a altitude para cima onde a
 * geografia manda.
 */

interface Cordilheira {
  pontos: Array<[number, number]>;
  largura: number;
  forca: number;
}

/**
 * Espinha tectônica autoral do mundo, em coordenadas normalizadas.
 *
 * Não desenha montanha pronta: apenas diz onde o ruído de crista pode ganhar corpo.
 * As linhas seguem a gramática da região — Bálcãs, Pindo, Peloponeso, Creta e
 * Anatólia — sem obrigar o relevo a copiar elevações reais.
 */
const CORDILHEIRAS: Cordilheira[] = [
  {
    pontos: [
      [0.13, 0.08],
      [0.28, 0.1],
      [0.43, 0.12],
      [0.61, 0.1],
    ],
    largura: 0.05,
    forca: 0.76,
  },
  {
    pontos: [
      [0.21, 0.07],
      [0.25, 0.2],
      [0.31, 0.33],
      [0.38, 0.47],
    ],
    largura: 0.042,
    forca: 1,
  },
  {
    pontos: [
      [0.28, 0.5],
      [0.3, 0.59],
      [0.36, 0.67],
    ],
    largura: 0.038,
    forca: 0.76,
  },
  {
    pontos: [
      [0.36, 0.8],
      [0.49, 0.79],
      [0.62, 0.8],
    ],
    largura: 0.026,
    forca: 0.48,
  },
  {
    pontos: [
      [0.7, 0.18],
      [0.76, 0.31],
      [0.79, 0.46],
      [0.84, 0.62],
    ],
    largura: 0.055,
    forca: 0.9,
  },
  {
    pontos: [
      [0.76, 0.3],
      [0.86, 0.34],
      [0.93, 0.4],
    ],
    largura: 0.038,
    forca: 0.62,
  },
];

function distanciaSegmento(
  x: number,
  y: number,
  [ax, ay]: [number, number],
  [bx, by]: [number, number],
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const quadrado = dx * dx + dy * dy;
  if (quadrado === 0) return Math.hypot(x - ax, y - ay);
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / quadrado));
  return Math.hypot(x - (ax + dx * t), y - (ay + dy * t));
}

export function campoCordilheiras(lado: number): Float32Array {
  const saida = new Float32Array(lado * lado);
  for (let y = 0; y < lado; y++) {
    const v = y / (lado - 1);
    for (let x = 0; x < lado; x++) {
      const u = x / (lado - 1);
      let valor = 0;
      for (const cordilheira of CORDILHEIRAS) {
        let distancia = Infinity;
        for (let i = 1; i < cordilheira.pontos.length; i++) {
          distancia = Math.min(
            distancia,
            distanciaSegmento(u, v, cordilheira.pontos[i - 1]!, cordilheira.pontos[i]!),
          );
        }
        const alcance = distancia / cordilheira.largura;
        valor = Math.max(valor, Math.exp(-alcance * alcance * 1.7) * cordilheira.forca);
      }
      saida[y * lado + x] = valor;
    }
  }
  return saida;
}

/** Semente fixa: o mundo tem que sair igual toda vez que o gerador rodar. */
