/**
 * O traçado de um rio: subir a montante pela célula que mais contribui, simplificar e
 * suavizar.
 *
 * Simplificar antes de suavizar, e não o contrário: a curva bruta da malha tem degraus de
 * um pixel, e suavizá-los primeiro só arredondaria a escada.
 */

import { FOLGA_MOLDURA, VAZAO_MINIMA_NASCENTE } from './malha';
import type { Ponto } from './malha';

export function distanciaQuadrada(a: number, b: number, lado: number): number {
  const ax = a % lado;
  const ay = (a / lado) | 0;
  const bx = b % lado;
  const by = (b / lado) | 0;
  return (ax - bx) ** 2 + (ay - by) ** 2;
}

export function simplificar(pontos: Ponto[], tolerancia: number): Ponto[] {
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
export function suavizar(pontos: Ponto[], passos: number): Ponto[] {
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

export function tracarMontante(
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

export function tocaMoldura(celulas: number[], lado: number): boolean {
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

