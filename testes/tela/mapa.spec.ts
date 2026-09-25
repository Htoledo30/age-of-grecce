import { expect, test } from '@playwright/test';

interface Ganchos {
  centroDe: (idProvincia: string) => { x: number; y: number };
  posicionar: (x: number, y: number, zoom: number) => void;
}

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
  // Diagnóstico continua disponível em F3, mas nunca suja a campanha por padrão.
  await expect(page.locator('.painel-diagnostico')).toBeHidden();

  // O painel da província inteiro — moldura, ficha e comandos — só existe quando há uma
  // província selecionada. Uma moldura vazia com friso no canto seria pior que nada.
  await expect(page.locator('.painel-provincia')).toBeHidden();
  await page.locator('#mundo').click({ position: { x: 960, y: 540 } });
  await expect(page.locator('.painel-provincia')).toBeVisible();
  await expect(page.locator('.acoes')).toBeVisible();
  // ⚠️ **O ponto de água vem do MUNDO, e não de um pixel escolhido a olho.** Estava cravado em
  // (1500, 800), e bastou a câmera de abertura mudar para aquele pixel cair em terra: o painel
  // não fechava e o teste acusava um defeito que não existia. Pedir o centro de uma zona de mar
  // e apontar a câmera para ela responde a mesma pergunta em qualquer enquadramento.
  await page.evaluate(() => {
    const i = (window as unknown as { inspecao: Ganchos }).inspecao;
    const centro = i.centroDe('golfo-saronico');
    // Bem de perto: no zoom de abertura o centro da tela ainda pega terra vizinha, e o teste
    // acusaria um painel que não fecha quando o que não fechou foi a mira.
    i.posicionar(centro.x, centro.y, 4);
  });
  await page.waitForTimeout(300);
  await page.locator('#mundo').click({ position: { x: 960, y: 540 } });
  await expect(page.locator('.painel-provincia')).toBeHidden();
});
