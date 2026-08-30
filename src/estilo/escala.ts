/**
 * Regra de resolução do projeto.
 *
 * TODO layout é desenhado em 1920x1080. O palco tem esse tamanho em CSS e é escalado pra
 * caber na tela do jogador, mantendo proporção. Consequência: o que eu desenho é exatamente
 * o que aparece, em qualquer monitor.
 *
 * A ÚNICA coisa que mexe nesse tamanho é a acessibilidade: escolher uma interface maior
 * ENCOLHE o palco, o que faz a escala subir e tudo ser redesenhado maior — ver
 * `TAMANHOS_DA_INTERFACE`. Quem precisa do tamanho de agora chama `larguraDoPalco()` e
 * `alturaDoPalco()`; ninguém guarda 1920 numa constante própria.
 *
 * Nenhum outro arquivo do projeto deve ler `window.innerWidth` ou lidar com resolução.
 */

/** O tamanho em que a interface é DESENHADA. Não é o tamanho em que ela aparece. */
const LARGURA_DESENHO = 1920;
const ALTURA_DESENHO = 1080;

/**
 * Os tamanhos de interface que o jogador pode escolher, e o que cada um faz.
 *
 * ⚠️ **O truque é ENCOLHER O PALCO, não esticar o texto.** O palco tem tamanho fixo em CSS e é
 * ajustado à janela por `zoom`; se a base encolhe, o `zoom` sobe na mesma proporção e tudo é
 * **redesenhado maior** — inclusive o texto, que é rasterizado no corpo em que aparece, com
 * hinting e subpixel. É a diferença entre aumentar e ampliar: ampliar borra, aumentar não.
 *
 * A conta fecha sozinha: `escala = min(janela / base)`, e dividir a base por 1,3 multiplica a
 * escala por 1,3. O palco continua cabendo exatamente na janela, então nada é cortado — o que
 * muda é quanto de MUNDO cabe nela, que é o preço honesto de uma interface maior.
 */
export const TAMANHOS_DA_INTERFACE = {
  pequena: 0.9,
  normal: 1,
  grande: 1.15,
  maior: 1.3,
} as const;

export type TamanhoDaInterface = keyof typeof TAMANHOS_DA_INTERFACE;

export type OuvinteEscala = (escala: number) => void;

let escala = 1;
let fator: number = TAMANHOS_DA_INTERFACE.normal;
let palco: HTMLElement | null = null;
const ouvintes = new Set<OuvinteEscala>();

/** A largura do palco AGORA, já com o tamanho de interface escolhido. */
export function larguraDoPalco(): number {
  return Math.round(LARGURA_DESENHO / fator);
}

/** A altura do palco AGORA. */
export function alturaDoPalco(): number {
  return Math.round(ALTURA_DESENHO / fator);
}

/**
 * Troca o tamanho da interface e refaz o palco.
 *
 * ⚠️ **Os ouvintes são avisados SEMPRE**, mesmo que a escala final coincida: quem depende do
 * tamanho do palco — o renderizador do mapa, a câmera — precisa refazer as contas mesmo quando
 * o número da escala, por acaso, não mudou.
 */
export function definirTamanhoDaInterface(tamanho: TamanhoDaInterface): void {
  fator = TAMANHOS_DA_INTERFACE[tamanho];
  recalcular(true);
}

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
 * no corpo em que aparece, com hinting e subpixel. O palco continua tendo o mesmo tamanho
 * para quem desenha, e `paraPalco()` continua valendo — `getBoundingClientRect()` já devolve
 * pixels de tela, e dividir pela escala volta ao espaço do palco como antes.
 *
 * A posição é calculada aqui porque `zoom` multiplica as coordenadas CSS: para plantar o
 * palco em X pixels de tela, escreve-se X/escala.
 */
function aplicarTransformacao(): void {
  if (!palco) return;
  const largura = larguraDoPalco();
  const altura = alturaDoPalco();
  palco.style.width = `${largura}px`;
  palco.style.height = `${altura}px`;
  palco.style.zoom = String(escala);
  palco.style.left = `${(window.innerWidth - largura * escala) / 2 / escala}px`;
  palco.style.top = `${(window.innerHeight - altura * escala) / 2 / escala}px`;
  // ⚠️ **O CSS precisa do tamanho do PALCO, e `100vw` não serve.** Dentro de um elemento com
  // `zoom`, `vw` continua devolvendo o pixel da janela, que está numa escala diferente da do
  // conteúdo. As travas de `max-width` das janelas ficariam generosas demais justamente no
  // tamanho grande, que é quando elas importam.
  const raiz = document.documentElement.style;
  raiz.setProperty('--palco-largura', `${largura}px`);
  raiz.setProperty('--palco-altura', `${altura}px`);
}

function recalcular(sempre = false): void {
  const nova = Math.min(
    window.innerWidth / larguraDoPalco(),
    window.innerHeight / alturaDoPalco(),
  );
  // ⚠️ Reposiciona SEMPRE, mesmo com a escala igual: uma janela que cresce só na largura,
  // com a escala presa pela altura, muda a margem lateral e não mudaria mais nada aqui.
  const mesma = nova === escala;
  escala = nova;
  aplicarTransformacao();
  if (mesma && !sempre) return;
  for (const ouvinte of ouvintes) ouvinte(escala);
}

/** Liga a escala ao elemento do palco. Chamar uma vez, no início. */
export function iniciarEscala(elemento: HTMLElement): void {
  palco = elemento;
  recalcular();
  // sempre aplicar na inicialização: recalcular() sai cedo quando a escala já é 1
  aplicarTransformacao();
  window.addEventListener('resize', () => recalcular());
  // devicePixelRatio muda quando a janela troca de monitor
  window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`).addEventListener('change', () => {
    for (const ouvinte of ouvintes) ouvinte(escala);
  });
}
