import { expect, test } from '@playwright/test';

interface Inspecao {
  comecar: (idPoder: string) => void;
}

test('Esc abre a pausa, as opções guardam os volumes e o menu preserva a campanha', async ({
  page,
}) => {
  const erros: string[] = [];
  page.on('pageerror', (erro) => erros.push(erro.message));

  // Guarda a produção REAL do Web Audio. O teste anterior protegia os sliders, mas alguém
  // ainda podia apagar os osciladores e deixar uma tela de volume controlando silêncio.
  await page.addInitScript(() => {
    const original = Object.getOwnPropertyDescriptor(
      BaseAudioContext.prototype,
      'createOscillator',
    )?.value as () => OscillatorNode;
    let criados = 0;
    BaseAudioContext.prototype.createOscillator = function criarOscilador() {
      criados += 1;
      return Reflect.apply(original, this, []);
    };
    Object.defineProperty(window, '__osciladoresDoJogo', { get: () => criados });
  });

  await page.goto('/');
  await page.waitForSelector('body[data-pronto="sim"]');
  await page.evaluate(() =>
    (window as unknown as { inspecao: Inspecao }).inspecao.comecar('atenas'),
  );

  await expect(page.locator('.controle-audio')).toHaveCount(0);
  const antesDoClique = await page.evaluate(
    () => (window as unknown as { __osciladoresDoJogo: number }).__osciladoresDoJogo,
  );
  await page.getByRole('button', { name: 'Governo' }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { __osciladoresDoJogo: number }).__osciladoresDoJogo,
      ),
    )
    .toBeGreaterThan(antesDoClique);
  await expect(page.locator('.governo')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.governo')).toBeHidden();
  await expect(page.locator('.menu-pausa')).toBeHidden();

  await page.keyboard.press('Escape');
  const pausa = page.locator('.menu-pausa');
  await expect(pausa).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continuar jogo' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sair para o menu principal' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sair para a área de trabalho' })).toBeVisible();

  await page.getByRole('button', { name: 'Opções' }).click();
  const musica = page.getByLabel('Música');
  const efeitos = page.getByLabel('Efeitos');
  await musica.fill('47');
  await efeitos.fill('63');
  await expect(musica).toHaveValue('47');
  await expect(efeitos).toHaveValue('63');
  expect(
    await page.evaluate(() => ({
      musica: localStorage.getItem('age-of-grecce:volume-musica'),
      efeitos: localStorage.getItem('age-of-grecce:volume-efeitos'),
    })),
  ).toEqual({ musica: '47', efeitos: '63' });

  // O primeiro Esc volta das opções; o segundo devolve o mapa.
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Continuar jogo' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(pausa).toBeHidden();

  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Sair para o menu principal' }).click();
  await expect(page.locator('body')).toHaveAttribute('data-fase-jogo', 'menu');
  await expect(page.getByRole('button', { name: 'Continuar campanha' })).toBeVisible();

  await page.reload();
  await page.waitForSelector('body[data-pronto="sim"]');
  await page.getByRole('button', { name: 'Continuar campanha' }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Opções' }).click();
  await expect(page.getByLabel('Música')).toHaveValue('47');
  await expect(page.getByLabel('Efeitos')).toHaveValue('63');

  expect(erros, erros.join('\n')).toHaveLength(0);
});
