/**
 * Os campos de ruído: a textura que enche o espaço entre as cordilheiras.
 *
 * `campo` é ruído fractal comum; `campoCrista` é o mesmo dobrado no zero, que é o que
 * produz espinhaço em vez de colina. `borrar` e `amostrar` são as duas ferramentas que
 * transformam grade em superfície contínua.
 */

import { createNoise2D } from 'simplex-noise';

export function ruidoSemente(semente: number): () => number {
  let estado = semente >>> 0;
  return () => {
    estado = (estado * 1_664_525 + 1_013_904_223) >>> 0;
    return estado / 4_294_967_296;
  };
}

/** Campo de ruído em várias oitavas, numa grade pequena que depois é interpolada. */
export function campo(lado: number, oitavas: number, escala: number, semente: number): Float32Array {
  const ruido = createNoise2D(ruidoSemente(semente));
  const saida = new Float32Array(lado * lado);
  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      let valor = 0;
      let amplitude = 1;
      let total = 0;
      let frequencia = escala / lado;
      for (let o = 0; o < oitavas; o++) {
        valor += ruido(x * frequencia, y * frequencia) * amplitude;
        total += amplitude;
        amplitude *= 0.5;
        frequencia *= 2;
      }
      saida[y * lado + x] = (valor / total + 1) / 2;
    }
  }
  return saida;
}

/** Ruído de cordilheira: dobra o vale pra cima e vira crista em vez de colina. */
export function campoCrista(lado: number, escala: number, semente: number): Float32Array {
  const ruido = createNoise2D(ruidoSemente(semente));
  const saida = new Float32Array(lado * lado);
  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      let valor = 0;
      let amplitude = 1;
      let total = 0;
      let frequencia = escala / lado;
      for (let o = 0; o < 4; o++) {
        valor += (1 - Math.abs(ruido(x * frequencia, y * frequencia))) * amplitude;
        total += amplitude;
        amplitude *= 0.5;
        frequencia *= 2;
      }
      saida[y * lado + x] = valor / total;
    }
  }
  return saida;
}

/**
 * Interpolação com suavização de Hermite em vez de linear pura.
 *
 * Linear é contínua no valor mas NÃO na derivada — e o sombreamento de relevo usa
 * exatamente a derivada. Resultado: o relevo aparece facetado, com listras diagonais
 * marcando as células da grade. Hermite mata isso.
 */
export function amostrar(campo: Float32Array, lado: number, u: number, v: number): number {
  const x = Math.min(lado - 1.001, Math.max(0, u * (lado - 1)));
  const y = Math.min(lado - 1.001, Math.max(0, v * (lado - 1)));
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = x - x0;
  const ty = y - y0;
  const fx = tx * tx * (3 - 2 * tx);
  const fy = ty * ty * (3 - 2 * ty);
  const a = campo[y0 * lado + x0]!;
  const b = campo[y0 * lado + x0 + 1]!;
  const c = campo[(y0 + 1) * lado + x0]!;
  const d = campo[(y0 + 1) * lado + x0 + 1]!;
  return a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy;
}

/**
 * Borrão de caixa separável, feito duas vezes (vira quase gaussiano).
 *
 * Serve pra tirar os degraus do campo de distância antes dele virar altitude. O
 * sombreamento de relevo usa a derivada da altitude, e derivada de degrau vira risco:
 * sem isso o mapa ganha um leque de listras diagonais saindo de toda a costa.
 */
export function borrar(campo: Float32Array, lado: number, raio: number): Float32Array {
  let atual = campo;
  const janela = raio * 2 + 1;
  for (let passo = 0; passo < 2; passo++) {
    const meio = new Float32Array(atual.length);
    for (let y = 0; y < lado; y++) {
      let soma = 0;
      for (let x = -raio; x <= raio; x++)
        soma += atual[y * lado + Math.min(lado - 1, Math.max(0, x))]!;
      for (let x = 0; x < lado; x++) {
        meio[y * lado + x] = soma / janela;
        const sai = Math.min(lado - 1, Math.max(0, x - raio));
        const entra = Math.min(lado - 1, Math.max(0, x + raio + 1));
        soma += atual[y * lado + entra]! - atual[y * lado + sai]!;
      }
    }
    const saida = new Float32Array(atual.length);
    for (let x = 0; x < lado; x++) {
      let soma = 0;
      for (let y = -raio; y <= raio; y++)
        soma += meio[Math.min(lado - 1, Math.max(0, y)) * lado + x]!;
      for (let y = 0; y < lado; y++) {
        saida[y * lado + x] = soma / janela;
        const sai = Math.min(lado - 1, Math.max(0, y - raio));
        const entra = Math.min(lado - 1, Math.max(0, y + raio + 1));
        soma += meio[entra * lado + x]! - meio[sai * lado + x]!;
      }
    }
    atual = saida;
  }
  return atual;
}

/** Preenchimento por varredura com regra par-ímpar — mesma dos anéis do mapa. */
