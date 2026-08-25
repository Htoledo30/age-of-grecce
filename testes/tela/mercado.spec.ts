import { expect, test } from '@playwright/test';

/**
 * O mercado visto de fora: a lista do que o reino ALCANÇA e a do que ele não alcança.
 *
 * O que este teste guarda é a segunda lista. A primeira é contabilidade; a segunda é o mapa
 * do que ainda há para conquistar — e é ela que faz tomar a terra do vinho valer mais do que
 * tomar a segunda terra de grão.
 */

interface Ganchos {
  rendaDeTrocas: (idPoder: string) => number;
  bensEmCirculacao: (idPoder: string) => string[];
  conquistar: (idProvincia: string, idPoder: string) => void;
}

test('o Mercado lista o que circula, o que falta, e a conquista move um do outro', async ({
  page,
}) => {
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

  await page.getByRole('button', { name: 'Governo' }).click();
  await page.getByRole('button', { name: 'Mercado' }).click();
  const aba = page.locator('[data-aba="mercado"]');

  // Uma linha por bem DISTINTO — não uma por província que o dá.
  const circulando = await page.evaluate(() =>
    (window as unknown as { inspecao: Ganchos }).inspecao.bensEmCirculacao('atenas'),
  );
  await expect(aba.locator('tbody tr')).toHaveCount(circulando.length);

  const total = await page.evaluate(() =>
    (window as unknown as { inspecao: Ganchos }).inspecao.rendaDeTrocas('atenas'),
  );
  await expect(aba.locator('.balanco__resumo')).toContainText(`+${total} por turno`);
  await expect(aba.locator('.balanco__resumo')).toContainText('bens circulam');

  // O grão vem de duas terras da Ática e aparece UMA vez, com as duas na coluna de origem.
  const graos = aba.locator('tbody tr', { hasText: 'Grãos' });
  await expect(graos).toHaveCount(1);
  await expect(graos).toContainText('Atenas');
  await expect(graos).toContainText('Maratona');

  // E o que falta está escrito, com o que valeria: é a lista de alvos.
  const ausentes = aba.locator('.mercado__ausentes');
  await expect(ausentes).toContainText('fora do alcance');
  await expect(ausentes).toContainText('Vinho');

  // Tomar Tanagra traz o vinho: ele sai da lista do que falta e entra na tabela, e a renda da
  // rede sobe. Conquistar deixa de ser sempre a mesma soma — e a aba se atualiza SEM fechar,
  // porque a janela de governo se redesenha inteira a cada mudança de estado.
  await page.evaluate(() =>
    (window as unknown as { inspecao: Ganchos }).inspecao.conquistar('tanagra', 'atenas'),
  );

  await expect(aba.locator('tbody tr', { hasText: 'Vinho' })).toHaveCount(1);
  await expect(ausentes).not.toContainText('Vinho');
  const depois = await page.evaluate(() =>
    (window as unknown as { inspecao: Ganchos }).inspecao.rendaDeTrocas('atenas'),
  );
  expect(depois).toBeGreaterThan(total);
  await expect(aba.locator('.balanco__resumo')).toContainText(`+${depois} por turno`);

  expect(erros, erros.join('\n')).toHaveLength(0);
});
