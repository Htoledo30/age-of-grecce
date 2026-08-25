/**
 * O que o terreno É: a máscara de terra, a altitude e o bioma de cada célula.
 *
 * A ideia é a do Mount & Blade traduzida pra 2D: o mapa não é um documento político liso, é
 * o mundo visto de cima. Floresta, serra, planície e mar raso — e mais tarde essas mesmas
 * regiões são o que decide velocidade de marcha e qual campo de batalha aparece.
 *
 * Nada disso roda em partida. É arte assada uma vez.
 */

export type Anel = Array<[number, number]>;

export interface Terreno {
  /** RGBA pronto pra virar PNG. */
  pixels: Uint8Array;
  /** Índice de bioma por pixel — vira o mapa de dados que o jogo lê depois. */
  biomas: Uint8Array;
  /** Máscara 0/1 usada para pintar a costa e para bloquear movimento. */
  terra: Uint8Array;
  /** Altitude linear e suavizada, preservada para drenagem e rios. */
  altitude: Float32Array;
  resolucao: number;
}

/** Ordem importa: é o índice gravado em `biomas`. */
export const BIOMAS = [
  'mar-fundo',
  'mar-raso',
  'praia',
  'planicie',
  'estepe',
  'floresta',
  'colina',
  'montanha',
  'pico',
] as const;

export const COR: Record<(typeof BIOMAS)[number], [number, number, number]> = {
  'mar-fundo': [88, 111, 112],
  'mar-raso': [103, 126, 126],
  praia: [205, 191, 156],
  planicie: [186, 180, 132],
  estepe: [199, 186, 140],
  floresta: [108, 130, 94],
  colina: [156, 146, 105],
  montanha: [138, 128, 110],
  pico: [176, 168, 152],
};

export const INDICE = new Map((BIOMAS as readonly string[]).map((n, i) => [n, i]));
