import { expect, test } from '@playwright/test';

/**
 * A capital vista pelo jogador: a ficha marca a sede, a queda trava o botão de turno com
 * o motivo escrito, e assentar outra — de graça, porque foi forçada — destrava a virada.
 */

interface Ganchos {
  /** Tira a comida do caminho: ver a nota acima de `test`. */
  saciar: () => void;
  conquistar: (idProvincia: string, idPoder: string) => void;
  capitalDe: (idPoder: string) => string | undefined;
  centroDe: (idProvincia: string) => { x: number; y: number };
  posicionar: (x: number, y: number, zoom: number) => void;
  campanha: () => { tesouro: number };
}

/**
 * ⚠️ **`saciar()` antes de plantar tropa, e a razão é de 31/08/2026.** Com
 * `subsistenciaPorReino` em 1, Atenas abre com saldo alimentar ZERO e não sustenta um soldado
 * antes de erguer comida: 900 homens plantados viravam 855 na tela — 5%, uma virada de fome —
 * e este arquivo passava a medir despensa em vez do que ele veio medir. É o mesmo andaime que
 * `ajustesFartos` é para os testes de unidade. Quem TESTA comida não chama.
 */
test('a capital caída trava o turno até o jogador assentar outra', async ({ page }) => {
  const erros: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(m.text());
  });
  page.on('pageerror', (e) => erros.push(e.message));

  await page.goto('/');
  await page.waitForSelector('body[data-pronto="sim"]');
  await page.getByRole('button', { name: 'Iniciar jogo' }).click();
  await page.waitForTimeout(600);
  await page.mouse.click(960, 540);
  await page.getByRole('button', { name: 'Começar campanha' }).click();
  await page.waitForSelector('.barra-turno');

  // Atenas nasce como sede, e o painel de ações diz isso em vez de oferecer o botão.
  await page.mouse.click(960, 540);
  await expect(page.locator('.ficha__selo[data-tom="ouro"]')).toHaveText('capital');
  await expect(page.locator('.acoes__capital')).toBeHidden();

  // Tanagra toma Atenas: a barra trava a virada e diz por quê.
  await page.evaluate(() => {
    const i = (window as unknown as { inspecao: Ganchos }).inspecao;
    i.saciar();
    i.conquistar('atenas', 'tanagra');
  });
  const passar = page.getByRole('button', { name: /Passar o turno/ });
  await expect(passar).toBeDisabled();
  await expect(page.locator('.barra-turno')).toHaveAttribute('data-capital-perdida', 'sim');

  // O jogador aponta a câmera pra Maratona, que ainda é dele, e assenta a nova sede.
  const tesouroAntes = await page.evaluate(() => {
    const i = (window as unknown as { inspecao: Ganchos }).inspecao;
    i.saciar();
    const centro = i.centroDe('maratona');
    i.posicionar(centro.x, centro.y, 0.4);
    return i.campanha().tesouro;
  });
  await page.mouse.click(960, 540);
  const assentar = page.getByRole('button', { name: 'Assentar a capital aqui' });
  await expect(assentar).toBeVisible();
  await expect(assentar).toHaveAttribute('data-urgente', 'sim');
  await assentar.click();

  // Destravou, de graça — a escolha forçada não é castigo.
  await expect(passar).toBeEnabled();
  await expect(page.locator('.barra-turno')).toHaveAttribute('data-capital-perdida', 'nao');
  await expect(page.locator('.ficha__selo[data-tom="ouro"]')).toHaveText('capital');
  const estadoFinal = await page.evaluate(() => {
    const i = (window as unknown as { inspecao: Ganchos }).inspecao;
    i.saciar();
    return { capital: i.capitalDe('atenas'), tesouro: i.campanha().tesouro };
  });
  expect(estadoFinal.capital).toBe('maratona');
  expect(estadoFinal.tesouro).toBe(tesouroAntes);
  expect(erros).toEqual([]);
});
