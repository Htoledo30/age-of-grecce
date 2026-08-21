import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * A marcha, de ponta a ponta: escolher a hoste, dizer quantos vão, pedir para mover, ver
 * os destinos no mapa, escolher um — e **o mapa não mudar**.
 *
 * O que este teste guarda é justamente o que não acontece no clique. Mover registra uma
 * ORDEM; a marcha só ocorre na virada do turno, junto com as de todo mundo. É isso que
 * impede quem age primeiro de tomar uma fronteira vazia antes de o outro lado ter chance
 * de mandar reforço. Ver `documentacao/design/resolucao-da-rodada.md`.
 */

interface Ganchos {
  darOuro: (valor: number) => void;
  construir: (idProvincia: string, idConstrucao: string) => void;
  passarTurno: () => void;
  recrutar: (idProvincia: string, homens: number) => void;
  forcaEm: (idProvincia: string) => number;
  alcanceDaHoste: (idProvincia: string) => string[];
  conquistar: (idProvincia: string, idPoder: string) => void;
  ordens: () => { origem: string; rota: string[]; homens: number }[];
}

async function comHoste(page: Page, homens: number) {
  await page.goto('/');
  await page.waitForSelector('body[data-pronto="sim"]');
  await page.getByRole('button', { name: 'Iniciar jogo' }).click();
  await page.waitForTimeout(600);
  await page.mouse.click(960, 540);
  await page.getByRole('button', { name: 'Começar campanha' }).click();
  await page.waitForSelector('.barra-turno');
  await page.evaluate((quantos: number) => {
    const i = (window as unknown as { inspecao: Ganchos }).inspecao;
    i.darOuro(60_000);
    i.construir('atenas', 'quartel');
    for (let n = 0; n < 4; n++) i.passarTurno();
    i.recrutar('atenas', quantos);
  }, homens);
  await page.locator('.hostes__marca').click();
}

test('escolher destino registra a ordem, e a marcha só acontece na virada', async ({ page }) => {
  const erros: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(m.text());
  });
  page.on('pageerror', (e) => erros.push(e.message));

  await comHoste(page, 1500);

  // O campo nasce com a força inteira: mandar tudo é o caso comum.
  await expect(page.locator('.exercito__valor')).toHaveValue('1500');
  await expect(page.locator('.destinos__marca')).toHaveCount(0);

  await page.getByRole('button', { name: 'Mover' }).click();

  // Atenas alcança Maratona e Sunião, e só elas, dentro dos pontos da rodada.
  await expect(page.locator('.destinos__marca')).toHaveCount(2);
  await page.locator('.destinos__marca[data-provincia="maratona"]').click();

  // ⚠️ O MAPA NÃO MUDOU. É o ponto inteiro da resolução simultânea.
  expect(await page.evaluate(() => (window as unknown as { inspecao: Ganchos }).inspecao.forcaEm('atenas'))).toBe(1500);
  expect(await page.evaluate(() => (window as unknown as { inspecao: Ganchos }).inspecao.forcaEm('maratona'))).toBe(0);

  // A ordem está registrada, visível e desfazível.
  await expect(page.locator('.exercito__ordem')).toContainText('1.500 marcham para Maratona');
  await expect(page.getByRole('button', { name: 'Cancelar ordem' })).toBeVisible();
  await expect(page.locator('.destinos__marca')).toHaveCount(0);

  await page.getByRole('button', { name: 'Passar o turno' }).click();

  expect(
    await page.evaluate(() => ({
      atenas: (window as unknown as { inspecao: Ganchos }).inspecao.forcaEm('atenas'),
      maratona: (window as unknown as { inspecao: Ganchos }).inspecao.forcaEm('maratona'),
      ordens: (window as unknown as { inspecao: Ganchos }).inspecao.ordens().length,
    })),
  ).toEqual({ atenas: 0, maratona: 1500, ordens: 0 });

  expect(erros, erros.join('\n')).toHaveLength(0);
});

test('cancelar a ordem devolve a hoste ao estado de quem não decidiu nada', async ({ page }) => {
  await comHoste(page, 1000);
  await page.getByRole('button', { name: 'Mover' }).click();
  await page.locator('.destinos__marca[data-provincia="sounion"]').click();
  await expect(page.locator('.exercito__ordem')).toBeVisible();

  await page.getByRole('button', { name: 'Cancelar ordem' }).click();

  await expect(page.locator('.exercito__ordem')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Mover' })).toBeVisible();
  await page.getByRole('button', { name: 'Passar o turno' }).click();
  expect(await page.evaluate(() => (window as unknown as { inspecao: Ganchos }).inspecao.forcaEm('atenas'))).toBe(1000);
});

test('só parte da hoste marcha, e o resto fica defendendo', async ({ page }) => {
  await comHoste(page, 1000);
  await page.locator('.exercito__valor').fill('400');
  await page.getByRole('button', { name: 'Mover' }).click();
  await page.locator('.destinos__marca[data-provincia="maratona"]').click();
  await expect(page.locator('.exercito__ordem')).toContainText('400 marcham');

  await page.getByRole('button', { name: 'Passar o turno' }).click();

  expect(
    await page.evaluate(() => ({
      atenas: (window as unknown as { inspecao: Ganchos }).inspecao.forcaEm('atenas'),
      maratona: (window as unknown as { inspecao: Ganchos }).inspecao.forcaEm('maratona'),
    })),
  ).toEqual({ atenas: 600, maratona: 400 });
});

test('clicar fora dos destinos cancela a escolha em vez de reclamar', async ({ page }) => {
  await comHoste(page, 1000);
  await page.getByRole('button', { name: 'Mover' }).click();
  await expect(page.locator('.destinos__marca')).toHaveCount(2);

  await page.mouse.click(1500, 800); // mar aberto

  await expect(page.locator('.destinos__marca')).toHaveCount(0);
  await expect(page.locator('.exercito__ordem')).toBeHidden();
});

/**
 * ⚠️ O botão fica na tela mesmo quando não dá pra marchar, dizendo o motivo. Esconder o
 * controle esconderia a mecânica, e o jogador não teria como descobrir que a marcha só
 * passa por território dele.
 */
test('sem caminho pelo próprio território, o botão explica em vez de sumir', async ({ page }) => {
  await comHoste(page, 1000);
  await page.evaluate(() => {
    const i = (window as unknown as { inspecao: Ganchos }).inspecao;
    i.conquistar('maratona', 'megara');
    i.conquistar('sounion', 'megara');
  });
  await page.locator('.hostes__marca').click();

  const mover = page.locator('.exercito__botao', { hasText: 'Mover' });
  await expect(mover).toContainText('sem caminho pelo seu território');
  await expect(mover).toBeDisabled();
  expect(await page.evaluate(() => (window as unknown as { inspecao: Ganchos }).inspecao.alcanceDaHoste('atenas'))).toEqual([]);
});
