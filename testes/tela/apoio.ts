import type { Page } from '@playwright/test';

/**
 * O que todo teste de tela precisa fazer antes de falar do que ele veio falar.
 *
 * ⚠️ **Nasceu quando a IA começou a atacar.** Antes, virar cinco turnos no começo de um teste
 * não produzia nada: o mundo era um jardim de estátuas. Agora o vizinho declara guerra, marcha
 * e assalta — e a JANELA DE BATALHA abre por cima do mapa e engole todo clique seguinte. O
 * sintoma era um teste de marcador de hoste morrendo por timeout com a mensagem
 * *"batalha__nome intercepts pointer events"*, que não diz nada sobre marcador de hoste.
 *
 * Fechar a fila de batalhas é parte de jogar, e por isso mora aqui e não numa gambiarra por
 * arquivo: quem virou o turno olha o que aconteceu e volta ao mapa.
 */

/** Fecha a janela de batalha quantas vezes ela abrir. A fila pode ter mais de uma. */
export async function fecharBatalhas(page: Page): Promise<void> {
  const fechar = page.getByRole('button', { name: 'Fechar' });
  // Teto de segurança: uma rodada com dez batalhas do jogador já é um mundo estranho, e um
  // laço sem fim aqui esconderia esse mundo atrás de um timeout.
  for (let i = 0; i < 10; i++) {
    const janela = page.locator('.batalha');
    if (!(await janela.isVisible())) return;
    await fechar.click();
    await page.waitForTimeout(50);
  }
}

/**
 * Clica NUMA PROVÍNCIA do mapa, pelo id — do jeito que o jogador clica.
 *
 * ⚠️ **Nasceu quando os botões de destino deixaram de existir.** A marcha era ordenada
 * clicando num `.destinos__marca`, um botão de DOM por destino alcançável; com um Porto de pé
 * eram cento e noventa e nove deles, e desenhá-los junto com as rotas derrubava o jogo para
 * 2,4 quadros por segundo. Agora o mapa inteiro é o alvo, e o teste precisa clicar no mapa.
 *
 * ⚠️ **E `centroDe` NÃO serve para mirar.** O centro guardado é o centroide dos dados, e o de
 * uma água côncava cai em terra: o do Golfo Sarônico está a 151 unidades do centro de Atenas.
 * Um teste que mirasse ali clicaria na península ática achando que clicou no golfo — foi assim
 * que `mapa.spec` ficou vermelho afirmando outra coisa. `pontoDentroDe` pergunta à mesma
 * textura de índices que o clique consulta e devolve um ponto que pertence mesmo à província.
 */
export async function clicarProvincia(page: Page, idProvincia: string): Promise<void> {
  const ponto = await page.evaluate((id: string) => {
    const i = (window as unknown as {
      inspecao: { pontoDentroDe: (id: string) => { x: number; y: number } | null };
    }).inspecao;
    return i.pontoDentroDe(id);
  }, idProvincia);
  if (!ponto) throw new Error(`província fora do mapa desenhado: ${idProvincia}`);
  await page.evaluate(
    (alvo: { x: number; y: number }) => {
      (window as unknown as {
        inspecao: { posicionar: (x: number, y: number, z: number) => void };
      }).inspecao.posicionar(alvo.x, alvo.y, 2.2);
    },
    ponto,
  );
  await page.waitForTimeout(80);
  // O clique no CANVAS, e não num botão: é o caminho de verdade, o mesmo que a mão do jogador
  // percorre — `pointerdown` no canvas, leitura da textura de índices, `aoSelecionar`.
  await page.locator('#mundo').click({ position: { x: 960, y: 540 } });
  await page.waitForTimeout(120);
}

/** Passa o ponteiro sobre uma província, para a rota aparecer sob ele. */
export async function apontarProvincia(page: Page, idProvincia: string): Promise<void> {
  const ponto = await page.evaluate((id: string) => {
    const i = (window as unknown as {
      inspecao: { pontoDentroDe: (id: string) => { x: number; y: number } | null };
    }).inspecao;
    return i.pontoDentroDe(id);
  }, idProvincia);
  if (!ponto) throw new Error(`província fora do mapa desenhado: ${idProvincia}`);
  await page.evaluate(
    (alvo: { x: number; y: number }) => {
      (window as unknown as {
        inspecao: { posicionar: (x: number, y: number, z: number) => void };
      }).inspecao.posicionar(alvo.x, alvo.y, 2.2);
    },
    ponto,
  );
  await page.waitForTimeout(80);
  await page.mouse.move(600, 300);
  await page.mouse.move(960, 540);
  await page.waitForTimeout(120);
}
