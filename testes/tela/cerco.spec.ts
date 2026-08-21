import { expect, test } from '@playwright/test';

/**
 * O cerco visto de fora: escolher a postura, ver a cidade resistir, trocar de ideia.
 *
 * O que este teste guarda é o estado INTERMEDIÁRIO — o que não existia antes do cerco.
 * Entrar em terra alheia deixou de ser o mesmo que ficar com ela.
 */

interface Ganchos {
  darOuro: (valor: number) => void;
  construir: (idProvincia: string, idConstrucao: string) => void;
  passarTurno: () => void;
  recrutar: (idProvincia: string, homens: number) => void;
  donoDe: (idProvincia: string) => string;
}

test('sitiar Elêusis: a cidade resiste, a renda dela cai e a postura troca', async ({ page }) => {
  const erros: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(m.text());
  });

  await page.goto('/');
  await page.waitForSelector('body[data-pronto="sim"]');
  await page.getByRole('button', { name: 'Iniciar jogo' }).click();
  await page.waitForTimeout(600);
  await page.mouse.click(960, 540);
  await page.getByRole('button', { name: 'Começar campanha' }).click();
  await page.waitForSelector('.barra-turno');

  await page.evaluate(() => {
    const i = (window as unknown as { inspecao: Ganchos }).inspecao;
    i.darOuro(60_000);
    i.construir('atenas', 'quartel');
    for (let n = 0; n < 4; n++) i.passarTurno();
    i.recrutar('atenas', 700);
    i.passarTurno(); // a leva leva uma rodada para virar hoste
  });

  await page.locator('.hostes__marca[data-provincia="atenas"]').click();
  await page.getByRole('button', { name: 'Mover' }).click();

  // ⚠️ A pergunta só existe DEPOIS de o alvo hostil ser apontado. Antes disso não há
  // sobre o que decidir — e num destino do próprio território não há decisão nenhuma.
  await expect(page.locator('.exercito__pergunta')).toBeHidden();
  await expect(page.locator('.exercito__botao--postura').first()).toBeHidden();

  await page.locator('.destinos__marca[data-provincia="eleusis"]').click();
  await expect(page.locator('.exercito__pergunta')).toContainText('Elêusis: o que fazer ao chegar?');
  await expect(page.locator('.exercito__botao--postura')).toHaveCount(2);

  // Sitiar: nada se move no clique, e a ordem fica registrada como qualquer outra.
  await page.getByRole('button', { name: /Sitiar/ }).click();
  await expect(page.locator('.exercito__ordem')).toBeVisible();
  await page.getByRole('button', { name: 'Passar o turno' }).click();

  // Elêusis abre a partida com 500 homens: o choque de campo aconteceu, e a CIDADE
  // continua de pé. Antes do cerco, a província teria trocado de dono aqui.
  expect(
    await page.evaluate(() =>
      (window as unknown as { inspecao: Ganchos }).inspecao.donoDe('eleusis'),
    ),
  ).toBe('eleusis');

  await page.locator('.hostes__marca[data-provincia="eleusis"]').click();
  await expect(page.locator('.exercito__cerco')).toContainText('Sitiando Elêusis');
  // A classe vai no `dt` e no `dd`: o valor é o `dd`.
  await expect(page.locator('dd.ficha__cerco')).toContainText('por Atenas');

  // A cidade sitiada perde produção e comércio e mantém só o imposto: 59 em vez de 119.
  await expect(page.locator('.ficha')).toContainText('rende 59 por turno');

  await page.getByRole('button', { name: /Passar ao assalto/ }).click();
  await page.getByRole('button', { name: 'Passar o turno' }).click();

  expect(
    await page.evaluate(() =>
      (window as unknown as { inspecao: Ganchos }).inspecao.donoDe('eleusis'),
    ),
  ).toBe('atenas');
  expect(erros).toEqual([]);
});
