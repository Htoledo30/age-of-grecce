import { expect, test } from '@playwright/test';

/** A explicação pertence ao jogo: nenhuma janela nativa do navegador deve reaparecer. */
test('a tooltip militar substitui title, respeita o palco e fecha ao sair', async ({ page }) => {
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
  await page.getByRole('button', { name: 'Começar campanha' }).click();
  await page.waitForSelector('.barra-turno');
  await page.mouse.click(960, 540);

  const agora = page.getByRole('button', { name: /^Ágora/ });
  await expect(agora).not.toHaveAttribute('title', /.+/);
  await expect(agora).toHaveAttribute('data-tooltip', 'sim');

  await agora.hover();
  const tooltip = page.locator('.tooltip-jogo');
  await expect(tooltip).toBeVisible();
  await expect(page.locator('.tooltip-jogo__titulo')).toHaveText('Ágora');
  await expect(page.locator('.tooltip-jogo__corpo')).toContainText('moedas');
  await expect(tooltip).toHaveAttribute('data-tom', 'custo');

  const caixa = await tooltip.boundingBox();
  expect(caixa).not.toBeNull();
  expect((caixa?.x ?? -1) + (caixa?.width ?? 0)).toBeLessThanOrEqual(1920);
  expect((caixa?.y ?? -1) + (caixa?.height ?? 0)).toBeLessThanOrEqual(1080);

  await page.mouse.move(960, 540);
  await expect(tooltip).toBeHidden();

  // Informação provincial: resultado na ficha, conta curta no tooltip.
  const renda = page.locator('.ficha__renda');
  await expect(renda).toHaveText(/saldo [−+]\d+ por turno/);
  await expect(renda).toHaveAttribute('data-tooltip-corpo', /\+\d+ impostos/);
  await expect(renda).toHaveAttribute('data-tooltip-corpo', /= [−+]\d+ por turno/);

  const populacao = page.locator('.ficha__populacao').last();
  await expect(populacao).toHaveAttribute(
    'data-tooltip-titulo',
    /População subindo|População caindo|População mantida|Sem crescimento líquido/,
  );
  await expect(populacao).not.toHaveAttribute('data-tooltip-corpo', /.{180,}/);

  const humor = page.locator('.ficha__humor').last();
  await expect(humor).toHaveText(/\d+ · /);
  await expect(humor).toHaveAttribute('data-tooltip-corpo', /= \d+$/);

  // O custo da tropa nascida aqui entra no número visível, não fica escondido no Governo.
  await page.evaluate(() => {
    const inspecao = (
      window as unknown as {
        inspecao: {
          plantarHoste: (provincia: string, poder: string, homens: number) => string;
        };
      }
    ).inspecao;
    inspecao.plantarHoste('atenas', 'atenas', 4_001);
  });
  await expect(renda).toHaveAttribute('data-tom', 'negativo');
  await expect(renda).toHaveText(/saldo −\d+ por turno/);
  await expect(renda).toHaveAttribute('data-tooltip-corpo', /−[\d.]+ tropas/);
  expect(erros, erros.join('\n')).toHaveLength(0);
});
