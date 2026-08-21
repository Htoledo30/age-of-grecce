/** Laço de jogo e medição de tempo. */

export interface Relogio {
  /** Segundos desde o quadro anterior, limitado pra não explodir depois de uma pausa. */
  readonly delta: number;
  /** Segundos desde o início. */
  readonly total: number;
  /** Média móvel de quadros por segundo. */
  readonly fps: number;
}

const DELTA_MAXIMO = 1 / 15;

export function iniciarLaco(passo: (relogio: Relogio) => void): () => void {
  let anterior = performance.now();
  let total = 0;
  let fps = 0;
  let pedido = 0;
  let rodando = true;

  const quadro = (agora: number): void => {
    if (!rodando) return;
    const bruto = (agora - anterior) / 1000;
    anterior = agora;
    const delta = Math.min(bruto, DELTA_MAXIMO);
    total += delta;
    if (bruto > 0) fps += (1 / bruto - fps) * 0.1;

    passo({ delta, total, fps });
    pedido = requestAnimationFrame(quadro);
  };

  pedido = requestAnimationFrame(quadro);

  return () => {
    rodando = false;
    cancelAnimationFrame(pedido);
  };
}
