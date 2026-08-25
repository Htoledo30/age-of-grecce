import { expect, test } from '@playwright/test';

/**
 * A crônica da rodada: o jogo passou a dizer o que aconteceu na virada.
 *
 * ⚠️ O que este teste guarda é que a guerra deixou de ser resolvida em SILÊNCIO. Antes, a
 * hoste sumia do mapa e o jogador tinha que deduzir que houve batalha — e é justamente o
 * caso da surtida perdida, em que a peça some sem deixar nada no lugar.
 *
 * Não é o futuro visor de batalha: aqui não há barra nem playback.
 */

interface Ganchos {
  darOuro: (valor: number) => void;
  construir: (idProvincia: string, idConstrucao: string) => void;
  passarTurno: () => void;
  recrutar: (idProvincia: string, homens: number) => void;
  donoDe: (idProvincia: string) => string;
  hostesEm: (idProvincia: string) => { id: string; poder: string; forca: number }[];
  plantarHoste: (idProvincia: string, idPoder: string, homens: number) => void;
  ordenarMarcha: (
    idHoste: string,
    destino: string,
    homens: number,
    porPoder?: string,
    postura?: 'assaltar' | 'sitiar',
  ) => void;
}

test('a rodada sem notícia não escreve nada; a com batalha conta o que houve', async ({
  page,
}) => {
  const erros: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(m.text());
  });

  await page.goto('/');
  await page.waitForSelector('body[data-pronto="sim"]');
  await page.getByRole('button', { name: 'Iniciar jogo' }).click();
  await page.waitForTimeout(600);
  await page.mouse.click(960, 540);
  await page.getByRole('button', { name: 'Começar campanha' }).click();
  await page.waitForSelector('.barra-turno');

  // ⚠️ **A rodada quieta é medida ANTES de levantar tropa**, e isso mudou quando o saldo
  // alimentar passou a avisar: 2.000 homens comem o dobro de 2.000 habitantes e põem o
  // reino no vermelho, o que É notícia. Reino parado de verdade é este aqui.
  await page.getByRole('button', { name: 'Passar o turno' }).click();
  await expect(page.locator('.cronica')).toBeHidden();

  await page.evaluate(() => {
    const i = (window as unknown as { inspecao: Ganchos }).inspecao;
    // O mapa abre EM PAZ: a guarnição eleusina de que este teste fala é plantada por ele.
    i.plantarHoste('eleusis', 'eleusis', 500);
    i.darOuro(60_000);
    i.construir('atenas', 'quartel');
    for (let n = 0; n < 4; n++) i.passarTurno();
    i.recrutar('atenas', 2000);
    i.passarTurno();
  });

  // Assalto sobre Elêusis, que é cidade aberta: batalha de campo, milícia derrotada e
  // conquista na mesma virada.
  await page.locator('.hostes__marca[data-provincia="atenas"]').click();
  await page.getByRole('button', { name: 'Mover' }).click();
  await page.locator('.destinos__marca[data-provincia="eleusis"]').click();
  await page.getByRole('button', { name: /Assaltar/ }).click();
  await page.getByRole('button', { name: 'Passar o turno' }).click();

  const cronica = page.locator('.cronica');
  await expect(cronica).toBeVisible();
  await expect(cronica.locator('.cronica__titulo')).toContainText('Rodada');
  await expect(cronica).toContainText('Batalha em Elêusis');
  await expect(cronica).toContainText('Atenas venceu');
  await expect(cronica).toContainText('Elêusis passou de Eleusis para Atenas');
  // Vitória do jogador é ganho; a crônica diz isso pela cor da borda, não só pelo texto.
  await expect(cronica.locator('.cronica__linha[data-tom="ganho"]').first()).toBeVisible();

  // Fechar é do jogador: a notícia não pode ficar em cima do mapa contra a vontade dele.
  await cronica.getByRole('button', { name: 'Fechar a crônica' }).click();
  await expect(cronica).toBeHidden();
  expect(erros).toEqual([]);
});

test('a surtida perdida é contada: a hoste não some mais em silêncio', async ({ page }) => {
  const erros: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(m.text());
  });

  await page.goto('/');
  await page.waitForSelector('body[data-pronto="sim"]');
  await page.getByRole('button', { name: 'Iniciar jogo' }).click();
  await page.waitForTimeout(600);
  await page.mouse.click(960, 540);
  await page.getByRole('button', { name: 'Começar campanha' }).click();
  await page.waitForSelector('.barra-turno');

  await page.evaluate(() => {
    const i = (window as unknown as { inspecao: Ganchos }).inspecao;
    // O mapa abre EM PAZ: a guarnição eleusina de que este teste fala é plantada por ele.
    i.plantarHoste('eleusis', 'eleusis', 500);
    i.darOuro(60_000);
    i.construir('atenas', 'quartel');
    for (let n = 0; n < 4; n++) i.passarTurno();
    i.recrutar('atenas', 300);
    i.passarTurno();
    // Elêusis manda 500 homens sentar diante de Atenas: o jogador é o sitiado.
    const deles = i.hostesEm('eleusis').find((h) => h.poder === 'eleusis');
    if (!deles) throw new Error('Elêusis devia começar com guarnição');
    i.ordenarMarcha(deles.id, 'atenas', 500, 'eleusis', 'sitiar');
    i.passarTurno();
  });

  const minha = page.locator('.hostes__marca[data-provincia="atenas"][data-minha="sim"]');
  await expect(minha).toHaveAttribute('data-marchando', 'nao');
  await minha.click();
  await page.getByRole('button', { name: /Surtida contra Eleusis/ }).click();
  await page.getByRole('button', { name: 'Passar o turno' }).click();

  // 300 contra 500: o jogador perde a hoste inteira. A peça some do mapa — e agora a
  // crônica diz por quê, que é a coisa que faltava.
  const cronica = page.locator('.cronica');
  await expect(cronica).toContainText('Batalha em Atenas');
  await expect(cronica).toContainText('Eleusis venceu Atenas');
  await expect(cronica.locator('.cronica__linha[data-tom="perda"]').first()).toBeVisible();
  expect(erros).toEqual([]);
});
