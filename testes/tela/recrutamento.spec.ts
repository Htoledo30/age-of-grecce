import { expect, test } from '@playwright/test';

/**
 * O ciclo militar inteiro numa passada: o Quartel destrava o recrutamento, a leva sai da
 * população, e a barra de turno passa a mostrar a manutenção.
 *
 * Vale um teste de tela porque as três verdades moram em painéis diferentes e precisam
 * concordar: a ficha (população de agora), o bloco de recrutar (teto restante) e a barra
 * (renda menos tropa). Se uma delas ler de outro lugar, o jogador vê números que não
 * fecham — e é assim que a economia perde a credibilidade inteira.
 */

interface Ganchos {
  comecar: (idPoder: string) => void;
  darOuro: (valor: number) => void;
  construir: (idProvincia: string, idConstrucao: string) => void;
  passarTurno: () => void;
  forcaEm: (idProvincia: string) => number;
  populacaoDe: (idProvincia: string) => number;
}

test('sem Quartel o painel diz o motivo, e com ele a leva sai da população', async ({ page }) => {
  const erros: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(m.text());
  });
  page.on('pageerror', (e) => erros.push(e.message));

  await page.goto('/');
  await page.waitForSelector('body[data-pronto="sim"]');
  await page.getByRole('button', { name: 'Iniciar jogo' }).click();
  await page.waitForTimeout(600);
  await page.mouse.click(960, 540); // a câmera aponta pra Atenas
  await page.getByRole('button', { name: 'Começar campanha' }).click();
  await page.waitForSelector('.barra-turno');
  await page.mouse.click(960, 540);

  // Nada de sumir em silêncio: o bloco fica na tela dizendo o que falta. É assim que o
  // jogador descobre que existe Quartel, sem tutorial.
  await expect(page.locator('.recrutamento')).toBeVisible();
  await expect(page.locator('.recrutamento__alvo')).toContainText('Quartel');
  await expect(page.locator('.recrutamento__valor')).toBeHidden();

  // A população aparece na ficha, e é ela que decide se a Ágora vale a pena.
  await expect(page.locator('dd.ficha__populacao')).toContainText('35.000');

  await page.evaluate(() => {
    const i = (window as unknown as { inspecao: Ganchos }).inspecao;
    i.darOuro(20_000);
    i.construir('atenas', 'quartel');
    for (let n = 0; n < 4; n++) i.passarTurno(); // 4 turnos de obra
  });
  await page.mouse.click(960, 540);

  await expect(page.locator('.recrutamento__alvo')).toContainText('35.000 habitantes');
  await expect(page.locator('.recrutamento__alvo')).toContainText('cabem mais 3.500');
  await expect(page.locator('.recrutamento__previsao')).toContainText('2.000 moedas agora');
  await expect(page.locator('.recrutamento__previsao')).toContainText('200 por turno');

  await page.getByRole('button', { name: 'Reunir leva' }).click();

  const depois = await page.evaluate(() => {
    const i = (window as unknown as { inspecao: Ganchos }).inspecao;
    return { forca: i.forcaEm('atenas'), populacao: i.populacaoDe('atenas') };
  });
  expect(depois).toEqual({ forca: 1000, populacao: 34_000 });

  // Os três painéis contam a mesma história.
  await expect(page.locator('dd.ficha__populacao')).toContainText('34.000');
  await expect(page.locator('.recrutamento__guarnicao')).toContainText('1.000 homens em armas');
  await expect(page.locator('.recrutamento__alvo')).toContainText('cabem mais 2.500');
  // 34.000 x 0,005 = 170 de imposto, contra 175: quem está em armas não é tributado.
  await expect(page.locator('.barra-turno__ouro')).toContainText('+703');
  await expect(page.locator('.barra-turno__ouro')).toContainText('−200');

  // E dispensar desfaz tudo, pra que população não seja catraca de sentido único.
  await page.getByRole('button', { name: /Dispensar/ }).click();
  await expect(page.locator('dd.ficha__populacao')).toContainText('35.000');
  await expect(page.locator('.recrutamento__guarnicao')).toBeHidden();
  await expect(page.locator('.barra-turno__ouro')).not.toContainText('−');

  expect(erros, erros.join('\n')).toHaveLength(0);
});

/** O Quartel é a primeira construção que não paga em ouro, e a tela precisa dizer isso. */
test('o Quartel promete capacidade, não retorno', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('body[data-pronto="sim"]');
  await page.getByRole('button', { name: 'Iniciar jogo' }).click();
  await page.waitForTimeout(600);
  await page.mouse.click(960, 540);
  await page.getByRole('button', { name: 'Começar campanha' }).click();
  await page.waitForSelector('.barra-turno');
  await page.mouse.click(960, 540);

  const quartel = page.locator('.acoes__construcao', { hasText: 'Quartel' });
  const dica = await quartel.getAttribute('title');
  expect(dica).toContain('Permite reunir e recrutar');
  // "nunca se paga" seria verdade aritmética e mentira sobre o que ele é
  expect(dica).not.toContain('paga-se em');
  expect(dica).not.toContain('por turno,');
});
