import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * A economia física vista pelo jogador: o que a terra dá por ano e o que já está guardado.
 *
 * O que este teste guarda é a corrente que o teste manual percorre:
 * **estoque antes → passar turno → colheita → estoque depois.**
 */

interface Ganchos {
  darOuro: (valor: number) => void;
  construir: (idProvincia: string, idConstrucao: string) => void;
  passarTurno: () => void;
  recrutar: (idProvincia: string, homens: number) => void;
  producaoFisicaEm: (
    idProvincia: string,
  ) => { produto: string; nivel: number; unidades: number; principal: boolean }[];
  estoqueEm: (idProvincia: string) => Record<string, number>;
}

async function campanha(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForSelector('body[data-pronto="sim"]');
  await page.getByRole('button', { name: 'Iniciar jogo' }).click();
  await page.waitForTimeout(600);
  await page.mouse.click(960, 540);
  await page.getByRole('button', { name: 'Começar campanha' }).click();
  await page.waitForSelector('.barra-turno');
  // A ficha só existe com província selecionada: sem este clique não há o que ler.
  await page.mouse.click(960, 540);
  await expect(page.locator('.ficha__nome')).toHaveText('Atenas');
}

test('a ficha diz o que a província colhe, e o estoque sobe ao passar o turno', async ({
  page,
}) => {
  const erros: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(m.text());
  });

  await campanha(page);

  const antes = await page.evaluate(() => {
    const i = (window as unknown as { inspecao: Ganchos }).inspecao;
    return { colheita: i.producaoFisicaEm('atenas'), estoque: i.estoqueEm('atenas') };
  });
  // Atenas dá azeite e grãos: os dois produzem, o principal mais que o secundário.
  expect(antes.colheita).toHaveLength(2);
  expect(antes.colheita[0]?.unidades).toBeGreaterThan(antes.colheita[1]?.unidades ?? 0);

  // A linha da ficha usa as mesmas unidades que a regra devolve — a tela não recalcula.
  await expect(page.locator('.ficha__colheita')).toContainText(
    `${antes.colheita[0]?.unidades.toLocaleString('pt-BR')}`,
  );
  await expect(page.locator('.ficha__colheita')).toContainText(
    `${antes.colheita[1]?.unidades.toLocaleString('pt-BR')}`,
  );

  await page.getByRole('button', { name: 'Passar o turno' }).click();

  const depois = await page.evaluate(() => {
    const i = (window as unknown as { inspecao: Ganchos }).inspecao;
    return i.estoqueEm('atenas');
  });
  for (const recurso of antes.colheita) {
    expect(depois[recurso.produto]).toBe((antes.estoque[recurso.produto] ?? 0) + recurso.unidades);
  }
  expect(erros).toEqual([]);
});

test('recrutar encolhe a colheita da província, e a ficha mostra isso', async ({ page }) => {
  const erros: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(m.text());
  });

  await campanha(page);
  await page.evaluate(() => {
    const i = (window as unknown as { inspecao: Ganchos }).inspecao;
    i.darOuro(60_000);
    i.construir('atenas', 'quartel');
    for (let n = 0; n < 4; n++) i.passarTurno();
  });

  const antes = await page.locator('.ficha__colheita').textContent();
  const colhiaAntes = await page.evaluate(() => {
    const i = (window as unknown as { inspecao: Ganchos }).inspecao;
    return i.producaoFisicaEm('atenas')[0]?.unidades ?? 0;
  });

  // 5.000 homens saem da população, e quem sai da população sai da lavoura junto.
  await page.evaluate(() => {
    const i = (window as unknown as { inspecao: Ganchos }).inspecao;
    i.recrutar('atenas', 5000);
  });

  const colhiaDepois = await page.evaluate(() => {
    const i = (window as unknown as { inspecao: Ganchos }).inspecao;
    return i.producaoFisicaEm('atenas')[0]?.unidades ?? 0;
  });
  expect(colhiaDepois).toBeLessThan(colhiaAntes);
  await expect(page.locator('.ficha__colheita')).not.toHaveText(antes ?? '');
  expect(erros).toEqual([]);
});
