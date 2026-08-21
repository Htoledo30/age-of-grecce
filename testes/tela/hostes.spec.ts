import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * A hoste tem que EXISTIR no mundo, não só nas regras.
 *
 * Antes desta fatia, mil homens existiam no estado e no painel, e o mapa continuava
 * vazio: o jogador não sentia que tinha posto gente em campo. O marcador é HTML por cima
 * do canvas, posicionado pela câmera — e é por isso que ele carrega o número em texto de
 * verdade, com tooltip e foco de teclado, sem custar arte nenhuma.
 */

interface Ganchos {
  comecar: (idPoder: string) => void;
  darOuro: (valor: number) => void;
  construir: (idProvincia: string, idConstrucao: string) => void;
  passarTurno: () => void;
  recrutar: (idProvincia: string, homens: number) => void;
  forcaEm: (idProvincia: string) => number;
  populacaoDe: (idProvincia: string) => number;
  posicionar: (x: number, y: number, zoom: number) => void;
}

async function campanhaComTropa(page: Page, homens: number) {
  await page.goto('/');
  await page.waitForSelector('body[data-pronto="sim"]');
  await page.getByRole('button', { name: 'Iniciar jogo' }).click();
  await page.waitForTimeout(600);
  await page.mouse.click(960, 540);
  await page.getByRole('button', { name: 'Começar campanha' }).click();
  await page.waitForSelector('.barra-turno');
  await page.evaluate((quantos: number) => {
    const i = (window as unknown as { inspecao: Ganchos }).inspecao;
    i.darOuro(30_000);
    i.construir('atenas', 'quartel');
    for (let n = 0; n < 4; n++) i.passarTurno();
    i.recrutar('atenas', quantos);
  }, homens);
}

test('a hoste aparece no mapa, e clicar nela abre a ficha dela', async ({ page }) => {
  const erros: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(m.text());
  });
  page.on('pageerror', (e) => erros.push(e.message));

  await campanhaComTropa(page, 1500);

  const marca = page.locator('.hostes__marca');
  await expect(marca).toHaveCount(1);
  await expect(marca).toHaveText('1.500');
  // Traço grosso é como o jogador acha a tropa dele num mapa de 148 poderes.
  await expect(marca).toHaveAttribute('data-minha', 'sim');
  await expect(marca).toHaveAttribute('data-selecionada', 'nao');
  // Enquanto ninguém a escolheu, a ficha do exército não existe na tela.
  await expect(page.locator('.exercito')).toBeHidden();

  await marca.click();

  await expect(marca).toHaveAttribute('data-selecionada', 'sim');
  await expect(page.locator('.exercito')).toBeVisible();
  await expect(page.locator('.exercito__titulo')).toHaveText('Exército em Atenas');
  await expect(page.locator('.exercito__forca')).toHaveText('1.500 homens');
  await expect(page.locator('.exercito__custo')).toHaveText('custa 300 por turno');
  // De onde vieram: é o que torna dispensar uma decisão, e não um botão.
  await expect(page.locator('.exercito__origens')).toContainText('Atenas');
  // Em casa, sem aviso de terra alheia.
  await expect(page.locator('.exercito__aviso')).toBeHidden();

  // Clicar no marcador escolhe as DUAS coisas: a tropa e o chão sob ela.
  await expect(page.locator('.ficha__nome')).toHaveText('Atenas');

  expect(erros, erros.join('\n')).toHaveLength(0);
});

test('clicar no mapa solta a hoste, e dispensar tira o marcador do mundo', async ({ page }) => {
  await campanhaComTropa(page, 1000);

  await page.locator('.hostes__marca').click();
  await expect(page.locator('.exercito')).toBeVisible();

  // Clicar no mapa é escolher CHÃO: a ficha do exército sai.
  await page.mouse.click(500, 900);
  await expect(page.locator('.exercito')).toBeHidden();

  await page.locator('.hostes__marca').click();
  await page.getByRole('button', { name: /Dispensar/ }).click();

  // Sem hoste, sem marcador e sem ficha — e ninguém fica descrevendo tropa que não existe.
  await expect(page.locator('.hostes__marca')).toHaveCount(0);
  await expect(page.locator('.exercito')).toBeHidden();
  await expect(page.locator('dd.ficha__populacao')).toContainText('35.000');
  // E a manutenção some da barra junto com a tropa.
  await expect(page.locator('.barra-turno__ouro')).not.toContainText('−');
});

/**
 * ⚠️ A camada dos marcadores cobre a tela inteira. Se ela ligar `pointer-events`, come
 * TODOS os cliques do mapa — e o sintoma é mudo: arrastar, dar zoom e selecionar
 * província simplesmente param, sem erro nenhum no console. Aconteceu de verdade, porque
 * `base.css` tem `#ui > * { pointer-events: auto }` e um seletor de id vence o de classe.
 */
test('a camada de marcadores não rouba o clique do mapa', async ({ page }) => {
  await campanhaComTropa(page, 1000);

  // Aponta pra Mégara e clica no centro: se a camada estivesse comendo o clique, a ficha
  // continuaria em Atenas.
  await page.evaluate(() =>
    (window as unknown as { inspecao: Ganchos }).inspecao.posicionar(4102, 4203, 1),
  );
  await page.waitForTimeout(300);
  await page.mouse.click(960, 540);
  await expect(page.locator('.ficha__nome')).toHaveText('Mégara');
});
