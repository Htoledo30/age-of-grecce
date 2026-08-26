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
