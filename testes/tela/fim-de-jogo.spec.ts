import { expect, test } from '@playwright/test';

/**
 * O fim da campanha visto pelo jogador: dominar a Grécia central inteira abre a tela de
 * vitória — uma vez —, e fechá-la devolve o mapa vivo para quem quiser ficar olhando.
 */

interface Ganchos {
  conquistar: (idProvincia: string, idPoder: string) => void;
  provinciasSimuladas: () => readonly string[];
  resultado: () => 'vitoria' | 'derrota' | null;
  passarTurno: () => void;
}

test('dominar a Grécia central mostra a vitória, e fechar devolve o mapa', async ({ page }) => {
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

  // Nenhum resultado no começo — e nenhuma tela de fim na frente do mapa.
  await expect(page.locator('.fim-de-jogo')).toBeHidden();

  // A mão do desenvolvedor entrega a região inteira; a régua da vitória é derivada.
  await page.evaluate(() => {
    const i = (window as unknown as { inspecao: Ganchos }).inspecao;
    for (const id of i.provinciasSimuladas()) i.conquistar(id, 'atenas');
  });

  const titulo = page.locator('.fim-de-jogo__titulo');
  await expect(titulo).toBeVisible();
  await expect(titulo).toHaveText('Vitória');
  await expect(titulo).toHaveAttribute('data-resultado', 'vitoria');

  // Fechar devolve o mapa vivo: a barra continua e o turno ainda passa.
  await page.getByRole('button', { name: 'Continuar observando' }).click();
  await expect(page.locator('.fim-de-jogo')).toBeHidden();
  await page.getByRole('button', { name: 'Passar o turno' }).click();
  await expect(page.locator('.barra-turno')).toBeVisible();
  // E a tela NÃO volta: o resultado é anunciado uma vez.
  await expect(page.locator('.fim-de-jogo')).toBeHidden();

  expect(erros, erros.join('\n')).toHaveLength(0);
});
