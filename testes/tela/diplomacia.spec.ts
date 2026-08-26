import { expect, test } from '@playwright/test';

/**
 * A diplomacia vista de fora — **a única tela do jogo que é pré-requisito de outra.**
 *
 * Ela tem janela e botão próprios, ao lado do Governo: paz e guerra não são contabilidade, são
 * a decisão que abre o resto do jogo.
 *
 * Desde que marchar sobre terra alheia exige guerra declarada, um jogador sem esta aba recebe
 * a recusa da ordem de marcha — *"Elêusis não está em guerra com você"* — e não tem onde
 * resolver aquilo. O que este teste guarda é o caminho inteiro: abrir, declarar, ver a linha
 * mudar de lado, e a hoste passar a poder marchar.
 */

interface Ganchos {
  emGuerra: (a: string, b: string) => boolean;
  guerrasDe: (idPoder: string) => string[];
}

test('declarar guerra na janela libera a marcha que a paz recusava', async ({ page }) => {
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

  // ⚠️ **Botão próprio na barra, e não uma aba do Governo.** É a tela que é pré-requisito de
  // outra: sem guerra declarada a ordem de marcha recusa.
  await page.getByRole('button', { name: 'Diplomacia' }).click();
  const aba = page.locator('[data-painel="diplomacia"]');

  // O mapa começa em paz: ninguém na lista está em guerra, e a ação oferecida é declarar.
  await expect(aba.locator('[data-poder]')).not.toHaveCount(0);
  await expect(aba.locator('[data-poder][data-relacao="guerra"]')).toHaveCount(0);
  await expect(aba.locator('[data-acao="paz"]')).toHaveCount(0);

  // Escolher o reino é o primeiro passo: a pergunta é "o que eu faço com ELE?".
  await aba.locator('[data-poder="eleusis"]').click();
  await expect(aba.locator('.diplomacia__reino')).toHaveText('Elêusis');
  await aba.locator('[data-acao="guerra"]').click();

  // A lista troca de lado e o dossiê passa a oferecer a paz — sem perder o reino escolhido.
  await expect(aba.locator('[data-poder="eleusis"]')).toHaveAttribute('data-relacao', 'guerra');
  await expect(aba.locator('.diplomacia__reino')).toHaveText('Elêusis');
  await expect(aba.locator('[data-acao="paz"]')).toHaveCount(1);
  expect(
    await page.evaluate(() =>
      (window as unknown as { inspecao: Ganchos }).inspecao.emGuerra('atenas', 'eleusis'),
    ),
  ).toBe(true);

  // E a paz proposta a quem acabou de ser atacado costuma ser recusada — a resposta aparece.
  await aba.locator('[data-acao="paz"]').click();
  await expect(aba.locator('.diplomacia__aviso')).not.toBeEmpty();

  expect(erros, erros.join('\n')).toHaveLength(0);
});
