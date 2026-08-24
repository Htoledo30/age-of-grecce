import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

interface Balanco {
  subsistencia: number;
  producao: number;
  populacao: number;
  exercito: number;
  saldo: number;
  categoria: string;
}

interface Ganchos {
  darOuro: (valor: number) => void;
  passarTurno: () => void;
  plantarHoste: (idProvincia: string, idPoder: string, homens: number) => string;
  alimentacao: () => Balanco;
}

async function campanha(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForSelector('body[data-pronto="sim"]');
  await page.getByRole('button', { name: 'Iniciar jogo' }).click();
  await page.waitForTimeout(600);
  await page.mouse.click(960, 540);
  await page.getByRole('button', { name: 'Começar campanha' }).click();
  await page.waitForSelector('.barra-turno');
}

test('a barra mostra o saldo inteiro e a categoria ao lado do ouro', async ({ page }) => {
  await campanha(page);

  const comida = page.locator('.barra-turno__contas .barra-turno__folego');
  await expect(comida).toBeVisible();
  await expect(comida).toContainText('+3');
  await expect(comida).toContainText('Abastecido');
  await expect(comida).toHaveAttribute('data-tom', 'folga');
  await expect(comida).not.toContainText(',');

  await page.evaluate(() => {
    const i = (window as unknown as { inspecao: Ganchos }).inspecao;
    i.plantarHoste('atenas', 'atenas', 1001);
  });

  await expect(comida).toContainText('+1');
  await expect(comida).toContainText('Abastecido');
});

test('déficit só do exército fica vermelho, diz o nome certo e não mata civil', async ({
  page,
}) => {
  const erros: string[] = [];
  page.on('console', (mensagem) => {
    if (mensagem.type() === 'error') erros.push(mensagem.text());
  });
  await campanha(page);
  await page.evaluate(() => {
    const i = (window as unknown as { inspecao: Ganchos }).inspecao;
    i.darOuro(200_000);
    i.plantarHoste('atenas', 'atenas', 4001);
  });

  // O povo comeu; o aperto é só da tropa — e a barra diz exatamente isso, em vermelho.
  const comida = page.locator('.barra-turno__folego');
  await expect(comida).toHaveAttribute('data-tom', 'fome');
  await expect(comida).toContainText('−2');
  await expect(comida).toContainText('Exército sem mantimentos');

  await page.getByRole('button', { name: 'Passar o turno' }).click();
  // Sem fome civil não há "Fome no reino" nem cidade que "passou fome": a notícia é a
  // perda da tropa, e só ela.
  await expect(page.locator('.cronica')).not.toContainText('Fome no reino');
  await expect(page.locator('.cronica')).not.toContainText('passou fome');
  await expect(page.locator('.cronica')).toContainText('Sem mantimento');
  await expect(page.locator('.cronica__linha[data-tom="perda"]').first()).toBeVisible();
  expect(erros).toEqual([]);
});

test('o Governo decompõe a mesma conta e mostra o papel de cada terra', async ({ page }) => {
  await campanha(page);
  const dados = await page.evaluate(() => {
    const i = (window as unknown as { inspecao: Ganchos }).inspecao;
    return i.alimentacao();
  });

  await page.getByRole('button', { name: 'Governo' }).click();
  await page.getByRole('button', { name: 'Alimentação' }).click();
  const aba = page.locator('[data-aba="alimentacao"]');
  const resumo = aba.locator('.balanco__resumo');
  await expect(resumo).toContainText(`subsistência +${dados.subsistencia}`);
  await expect(resumo).toContainText(`alimentos +${dados.producao}`);
  await expect(resumo).toContainText(`população −${dados.populacao}`);
  await expect(resumo).toContainText('civil +3');
  await expect(resumo).toContainText(`exército −${dados.exercito}`);
  await expect(resumo).toContainText('+3 · Abastecido');

  const sounion = aba.locator('tbody tr', { hasText: 'Sunião' });
  await expect(sounion).toHaveAttribute('data-tom', 'deficit');
  await expect(sounion.locator('td').nth(1)).toHaveText('nenhum');
  await expect(sounion.locator('td').nth(2)).toHaveText('+0');
  await expect(sounion.locator('td').nth(5)).toHaveText('Dependente');

  const maratona = aba.locator('tbody tr', { hasText: 'Maratona' });
  await expect(maratona).toContainText('Grãos 2 · Gado 1');
  await expect(maratona.locator('td').nth(4)).toHaveText('+2');
  await expect(maratona.locator('td').nth(5)).toHaveText('Sustentadora');
  await expect(maratona.locator('td').nth(5)).toHaveAttribute(
    'data-tooltip-corpo',
    /\+3 alimentos\n−1 população\n= \+2/,
  );
});
