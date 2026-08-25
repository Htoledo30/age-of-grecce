import { expect, test } from '@playwright/test';

/**
 * A JANELA DE BATALHA: o jogador vê a batalha acontecer.
 *
 * O que este teste guarda não é a aparência — é a promessa que faz a janela existir: **ela
 * reproduz a matemática que decidiu, e não uma animação por cima de outro cálculo.** Se o
 * último round da tela não bater com o que o mapa diz, a janela está mentindo, e mentir aqui
 * é pior que não ter janela nenhuma.
 */

interface Ganchos {
  darOuro: (valor: number) => void;
  construir: (idProvincia: string, idConstrucao: string) => void;
  passarTurno: () => void;
  recrutar: (idProvincia: string, homens: number) => void;
  forcaEm: (idProvincia: string, idPoder?: string) => number;
  plantarHoste: (
    idProvincia: string,
    idPoder: string,
    homens: number,
    arma?: 'leve' | 'hoplita' | 'arqueiro' | 'cavalaria',
  ) => void;
  hostesEm: (idProvincia: string) => { id: string; poder: string; forca: number }[];
  ordenarMarcha: (
    idHoste: string,
    destino: string,
    homens: number,
    porPoder?: string,
    postura?: 'assaltar' | 'sitiar',
  ) => void;
}

test('a batalha do jogador abre uma janela, e ela reproduz o que a regra decidiu', async ({
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

  // Nenhuma batalha ainda: a janela não existe na tela.
  await expect(page.locator('.batalha')).toBeHidden();

  // Elêusis manda uma hoste contra Atenas. O mapa abre em paz, então quem quer uma batalha
  // planta os dois lados dela.
  await page.evaluate(() => {
    const i = (window as unknown as { inspecao: Ganchos }).inspecao;
    i.darOuro(60_000);
    i.plantarHoste('atenas', 'atenas', 900);
    i.plantarHoste('eleusis', 'eleusis', 800);
    const deles = i.hostesEm('eleusis').find((h) => h.poder === 'eleusis');
    if (!deles) throw new Error('a hoste de Elêusis não subiu');
    i.ordenarMarcha(deles.id, 'atenas', 800, 'eleusis', 'assaltar');
  });
  await page.getByRole('button', { name: 'Passar o turno' }).click();

  // A janela abre sozinha: é batalha do jogador.
  await expect(page.locator('.batalha')).toBeVisible();
  await expect(page.locator('.batalha__titulo')).toContainText('Atenas');
  // Os dois lados aparecem, cada um com o tamanho de partida.
  await expect(page.locator('.batalha__lado')).toHaveCount(2);
  await expect(page.locator('.batalha__conta').first()).toContainText('900');

  // Round zero: ninguém perdeu ninguém ainda, e a narração apresenta os dois.
  await expect(page.locator('.batalha__placar')).toContainText('round 0');
  const contaInicial = await page.locator('.batalha__conta').first().textContent();

  // Avança um round: alguém encolheu.
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.locator('.batalha__placar')).toContainText('round 1');
  expect(await page.locator('.batalha__conta').first().textContent()).not.toBe(contaInicial);

  // Deixa correr até o fim.
  await page.getByRole('button', { name: 'Deixar correr' }).click();
  await expect(page.locator('.batalha__botao--fim')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.batalha__placar')).toContainText('fim');

  // ⚠️ **O teste que justifica a janela existir.** O último round da TELA tem que ser
  // exatamente o que sobrou no MAPA. Se divergirem, existem duas contas para a mesma batalha.
  const naTela = await page.evaluate(() => {
    const contas = [...document.querySelectorAll('.batalha__conta')].map(
      (n) => Number((n.textContent ?? '').replace(/\D/g, '').slice(0, -3) || '0'),
    );
    return contas;
  });
  const naRegra = await page.evaluate(() => {
    const i = (window as unknown as { inspecao: Ganchos }).inspecao;
    return [i.forcaEm('atenas', 'atenas'), i.forcaEm('atenas', 'eleusis')];
  });
  // A conta da tela é "X de Y"; o primeiro número é o que sobrou.
  expect(naTela[0]).toBe(naRegra[0]);

  // Fechar devolve o mapa, e não muda nada — a batalha já tinha acontecido.
  const donoAntes = await page.evaluate(
    () => (window as unknown as { inspecao: Ganchos }).inspecao.forcaEm('atenas', 'atenas'),
  );
  await page.locator('.batalha__botao--fim').click();
  await expect(page.locator('.batalha')).toBeHidden();
  expect(
    await page.evaluate(
      () => (window as unknown as { inspecao: Ganchos }).inspecao.forcaEm('atenas', 'atenas'),
    ),
  ).toBe(donoAntes);

  expect(erros).toEqual([]);
});

/**
 * A janela mostra DE QUE é feito cada lado, e não só quantos são.
 *
 * Sem isto, duas batalhas com o mesmo número de homens ficam idênticas na tela — e a decisão
 * de composição, que é a mais interessante que o jogador toma antes de marchar, não aparece
 * em lugar nenhum depois dela.
 */
test('a janela mostra as armas de cada lado, e as faixas encolhem com a barra', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForSelector('body[data-pronto="sim"]');
  await page.getByRole('button', { name: 'Iniciar jogo' }).click();
  await page.waitForTimeout(600);
  await page.mouse.click(960, 540);
  await page.getByRole('button', { name: 'Começar campanha' }).click();
  await page.waitForSelector('.barra-turno');

  await page.evaluate(() => {
    const i = (window as unknown as { inspecao: Ganchos }).inspecao;
    i.darOuro(60_000);
    // Atenas põe em campo um exército MISTO; Elêusis vem só com hoplitas.
    i.plantarHoste('atenas', 'atenas', 600, 'leve');
    i.plantarHoste('eleusis', 'eleusis', 800, 'hoplita');
    const deles = i.hostesEm('eleusis').find((h) => h.poder === 'eleusis');
    if (!deles) throw new Error('a hoste de Elêusis não subiu');
    i.ordenarMarcha(deles.id, 'atenas', 800, 'eleusis', 'assaltar');
  });
  await page.getByRole('button', { name: 'Passar o turno' }).click();

  await expect(page.locator('.batalha')).toBeVisible();
  // Cada lado escreve a própria composição ao lado do nome. Sem depender da ORDEM: quem é o
  // lado A sai da força de cada um, e cravar isso aqui seria cravar balanço.
  await expect(page.locator('.batalha__armas')).toHaveCount(2);
  await expect(page.locator('.batalha__barras')).toContainText('leves');
  await expect(page.locator('.batalha__barras')).toContainText('hoplitas');

  // E ela acompanha a batalha: depois de um round, os números da composição caem junto.
  const antes = await page.locator('.batalha__armas').first().textContent();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.locator('.batalha__armas').first()).not.toHaveText(antes ?? '');
});
