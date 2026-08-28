import { expect, test } from '@playwright/test';

test('F2 organiza cada construção numa linha com os três níveis', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('body[data-pronto="sim"]');

  await page.keyboard.press('F2');
  const editor = page.locator('.editor-balanceamento');
  await expect(editor).toBeVisible();
  await editor.getByRole('button', { name: /Construções/ }).click();

  const custoDaAgora = editor.locator('.editor-balanceamento__campo', {
    has: page.getByRole('heading', { name: 'Ágora · custo', exact: true }),
  });
  await expect(custoDaAgora).toBeVisible();
  await expect(custoDaAgora.locator('input')).toHaveCount(3);
  await expect(
    custoDaAgora.getByRole('spinbutton', { name: 'Ágora · custo · I', exact: true }),
  ).toHaveValue('2000');
  await expect(
    custoDaAgora.getByRole('spinbutton', { name: 'Ágora · custo · III', exact: true }),
  ).toHaveValue('7000');
});
