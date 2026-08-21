import { expect, test } from '@playwright/test';

/** A explicação pertence ao jogo: nenhuma janela nativa do navegador deve reaparecer. */
test('a tooltip militar substitui title, respeita o palco e fecha ao sair', async ({ page }) => {
  const erros: string[] = [];
  page.on('console', (mensagem) => {
    if (mensagem.type() === 'error') erros.push(mensagem.text());
  });
  page.on('pageerror', (erro) => erros.push(erro.message));

  await page.goto('/');
  await page.waitForSelector('body[data-pronto="sim"]');
  await page.getByRole('button', { name: 'Iniciar jogo' }).click();
  await page.waitForTimeout(600);
  await page.mouse.click(960, 540);
  await page.getByRole('button', { name: 'Começar campanha' }).click();
  await page.waitForSelector('.barra-turno');
  await page.mouse.click(960, 540);

  const agora = page.getByRole('button', { name: /^Ágora/ });
  await expect(agora).not.toHaveAttribute('title', /.+/);
  await expect(agora).toHaveAttribute('data-tooltip', 'sim');

  await agora.hover();
  const tooltip = page.locator('.tooltip-jogo');
  await expect(tooltip).toBeVisible();
  await expect(page.locator('.tooltip-jogo__titulo')).toHaveText('Ágora');
  await expect(page.locator('.tooltip-jogo__corpo')).toContainText('moedas');
  await expect(tooltip).toHaveAttribute('data-tom', 'custo');

  const caixa = await tooltip.boundingBox();
  expect(caixa).not.toBeNull();
  expect((caixa?.x ?? -1) + (caixa?.width ?? 0)).toBeLessThanOrEqual(1920);
  expect((caixa?.y ?? -1) + (caixa?.height ?? 0)).toBeLessThanOrEqual(1080);

  await page.mouse.move(960, 540);
  await expect(tooltip).toBeHidden();
  expect(erros, erros.join('\n')).toHaveLength(0);
});
