/**
 * Regra de resolução do projeto.
 *
 * TODO layout é desenhado em 1920x1080. O palco tem esse tamanho fixo em CSS e é
 * escalado pra caber na tela do jogador, mantendo proporção. Consequência: o que eu
 * desenho é exatamente o que aparece, em qualquer monitor.
 *
 * Nenhum outro arquivo do projeto deve ler `window.innerWidth` ou lidar com resolução.
 */

export const LARGURA_BASE = 1920;
export const ALTURA_BASE = 1080;

export type OuvinteEscala = (escala: number) => void;

let escala = 1;
let palco: HTMLElement | null = null;
const ouvintes = new Set<OuvinteEscala>();

/** Densidade de pixel efetiva: quantos pixels físicos existem por unidade do palco. */
export function densidadeEfetiva(): number {
  return escala * window.devicePixelRatio;
}

/** Avisa quando a escala muda (redimensionar janela, entrar em tela cheia). */
export function aoMudarEscala(ouvinte: OuvinteEscala): () => void {
  ouvintes.add(ouvinte);
  ouvinte(escala);
  return () => ouvintes.delete(ouvinte);
}

/**
 * Converte coordenada de evento do navegador (clientX/clientY) para coordenada do
 * palco. É por aqui que toda entrada de mouse deve passar.
 */
export function paraPalco(clienteX: number, clienteY: number): { x: number; y: number } {
  if (!palco) return { x: clienteX, y: clienteY };
  const caixa = palco.getBoundingClientRect();
  return {
    x: (clienteX - caixa.left) / escala,
    y: (clienteY - caixa.top) / escala,
  };
}

function aplicarTransformacao(): void {
  if (palco) palco.style.transform = `translate(-50%, -50%) scale(${escala})`;
}

function recalcular(): void {
  const nova = Math.min(window.innerWidth / LARGURA_BASE, window.innerHeight / ALTURA_BASE);
  if (nova === escala) return;
  escala = nova;
  aplicarTransformacao();
  for (const ouvinte of ouvintes) ouvinte(escala);
}

/** Liga a escala ao elemento do palco. Chamar uma vez, no início. */
export function iniciarEscala(elemento: HTMLElement): void {
  palco = elemento;
  palco.style.width = `${LARGURA_BASE}px`;
  palco.style.height = `${ALTURA_BASE}px`;
  recalcular();
  // sempre aplicar na inicialização: recalcular() sai cedo quando a escala já é 1
  aplicarTransformacao();
  window.addEventListener('resize', recalcular);
  // devicePixelRatio muda quando a janela troca de monitor
  window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`).addEventListener('change', () => {
    for (const ouvinte of ouvintes) ouvinte(escala);
  });
}
