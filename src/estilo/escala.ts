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

/**
 * ⚠️ **`zoom`, e não `transform: scale()` — e a diferença é a NITIDEZ DO TEXTO.**
 *
 * Henrique jogando: *"não sei o que acontece com as letras, elas são muito finas, quase não
 * dá para ler, parece diferente dos jogos que eu estou acostumado."* A causa não era a
 * fonte: era isto. Sob `transform`, o Chromium promove a camada para a GPU e **desliga o
 * antialiasing de subpixel** de tudo que está dentro dela — o texto passa a ser rasterizado
 * em escala de cinza e, sobre fundo escuro, isso come o traço e deixa a letra magra e
 * lavada. Some a isso o palco encolhendo para caber na janela (~0,93 numa tela de 1080p com
 * barra de tarefas) e o corpo de 11 px vira 10 px sem hinting.
 *
 * `zoom` refaz o LAYOUT no tamanho final em vez de esticar um bitmap: o texto é rasterizado
 * no corpo em que aparece, com hinting e subpixel. O palco continua sendo 1920x1080 para
 * quem desenha, e `paraPalco()` continua valendo — `getBoundingClientRect()` já devolve
 * pixels de tela, e dividir pela escala volta ao espaço do palco como antes.
 *
 * A posição é calculada aqui porque `zoom` multiplica as coordenadas CSS: para plantar o
 * palco em X pixels de tela, escreve-se X/escala.
 */
function aplicarTransformacao(): void {
  if (!palco) return;
  palco.style.zoom = String(escala);
  palco.style.left = `${(window.innerWidth - LARGURA_BASE * escala) / 2 / escala}px`;
  palco.style.top = `${(window.innerHeight - ALTURA_BASE * escala) / 2 / escala}px`;
}

function recalcular(): void {
  const nova = Math.min(window.innerWidth / LARGURA_BASE, window.innerHeight / ALTURA_BASE);
  // ⚠️ Reposiciona SEMPRE, mesmo com a escala igual: uma janela que cresce só na largura,
  // com a escala presa pela altura, muda a margem lateral e não mudaria mais nada aqui.
  const mesma = nova === escala;
  escala = nova;
  aplicarTransformacao();
  if (mesma) return;
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
