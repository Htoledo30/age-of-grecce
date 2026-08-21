import { expect, test } from '@playwright/test';

test('o mapa da Grécia sobe sem erro e desenha em 1920x1080', async ({ page }) => {
  const erros: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(m.text());
  });
  page.on('pageerror', (e) => erros.push(e.message));

  await page.goto('/');
  await page.waitForSelector('body[data-pronto="sim"]');

  const palco = page.locator('#palco');
  await expect(palco).toHaveCSS('width', '1920px');
  await expect(palco).toHaveCSS('height', '1080px');

  await expect(page.locator('.cartela')).toHaveCount(0);
  await expect(page.locator('.painel-diagnostico')).toBeHidden();

  const canvas = page.locator('#mundo');
  await expect(canvas).toBeVisible();

  await expect(page.locator('body')).toHaveAttribute('data-fase-jogo', 'menu');
  await expect(page.getByRole('button', { name: 'Iniciar jogo' })).toBeVisible();

  expect(erros, erros.join('\n')).toHaveLength(0);
});

test('inicia uma campanha escolhendo Atenas no mapa', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('body[data-pronto="sim"]');

  await page.getByRole('button', { name: 'Iniciar jogo' }).click();
  await expect(page.locator('body')).toHaveAttribute('data-fase-jogo', 'escolha');
  await expect(page.getByRole('heading', { name: 'Escolha seu poder' })).toBeVisible();

  const comecar = page.getByRole('button', { name: 'Começar campanha' });
  await expect(comecar).toBeDisabled();

  await page.locator('#mundo').click({ position: { x: 960, y: 540 } });
  await expect(page.getByRole('heading', { name: 'Atenas' })).toBeVisible();
  await expect(comecar).toBeEnabled();

  await comecar.click();
  await expect(page.locator('body')).toHaveAttribute('data-fase-jogo', 'campanha');
  await expect(page.locator('body')).toHaveAttribute('data-poder-jogador', 'atenas');
  await expect(page.locator('.inicio-jogo')).toBeHidden();
  await expect(page.locator('.painel-diagnostico')).toBeVisible();
});
