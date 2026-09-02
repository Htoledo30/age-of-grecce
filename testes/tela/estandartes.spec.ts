import { expect, test } from '@playwright/test';
import { fecharBatalhas } from './apoio';

interface Ganchos {
  saciar: () => void;
  darOuro: (valor: number) => void;
  construir: (idProvincia: string, idConstrucao: string) => void;
  passarTurno: () => void;
  recrutar: (idProvincia: string, homens: number) => void;
  forcaEm: (idProvincia: string) => number;
}

test('o estandarte acompanha Atenas da escolha até a hoste no mapa', async ({ page }) => {
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

  await expect(page.locator('.inicio-jogo__nome-poder')).toHaveText('Atenas');
  await expect(
    page.locator('.inicio-jogo__estandarte .estandarte[data-poder="atenas"]'),
  ).toBeVisible();
  const caixaDoEmblema = await page
    .locator(
      '.inicio-jogo__estandarte .estandarte[data-poder="atenas"] .estandarte__emblema path[d]',
    )
    .evaluate((caminho: SVGGraphicsElement) => {
      const { width, height } = caminho.getBBox();
      return { width, height };
    });
  expect(caixaDoEmblema.width).toBeGreaterThan(0);
  expect(caixaDoEmblema.height).toBeGreaterThan(0);

  await page.getByRole('button', { name: 'Começar campanha' }).click();
  await page.waitForSelector('.barra-turno');
  await expect(
    page.locator('.barra-turno__estandarte .estandarte[data-poder="atenas"]'),
  ).toBeVisible();

  await page.mouse.click(960, 540);
  await expect(page.locator('.ficha__nome')).toHaveText('Atenas');
  await expect(page.locator('.ficha__estandarte .estandarte[data-poder="atenas"]')).toBeVisible();

  await page.evaluate(() => {
    const inspecao = (window as unknown as { inspecao: Ganchos }).inspecao;
    inspecao.saciar();
    inspecao.darOuro(30_000);
    inspecao.construir('atenas', 'quartel');
    for (let turno = 0; turno < 4; turno++) inspecao.passarTurno();
    inspecao.recrutar('atenas', 1_500);
    inspecao.passarTurno();
  });
  await fecharBatalhas(page);

  const forca = await page.evaluate(() =>
    (window as unknown as { inspecao: Ganchos }).inspecao.forcaEm('atenas'),
  );
  const quantidade = forca.toLocaleString('pt-BR');
  const marcador = page.locator('.hostes__marca[data-provincia="atenas"][data-poder="atenas"]');

  await expect(marcador).toHaveCount(1);
  await expect(marcador.locator('.estandarte[data-poder="atenas"]')).toBeVisible();
  await expect(marcador.locator('.hostes__forca')).toBeVisible();
  await expect(marcador).toHaveText(quantidade);
  await expect(marcador).toHaveAttribute('aria-label', `Hoste de Atenas, ${quantidade} homens`);

  expect(erros, erros.join('\n')).toHaveLength(0);
});
