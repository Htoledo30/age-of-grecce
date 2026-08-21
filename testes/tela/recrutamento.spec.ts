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
  campanha: () => { tesouro: number };
  darOuro: (valor: number) => void;
  construir: (idProvincia: string, idConstrucao: string) => void;
  passarTurno: () => void;
  forcaEm: (idProvincia: string) => number;
  formacaoEm: (idProvincia: string) => { homens: number; prontaNoTurno: number } | undefined;
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
  // jogador descobre que existe Quartel, sem tutorial — mas só depois de pedir os detalhes.
  await expect(page.locator('.recrutamento')).toBeVisible();
  const abrir = page.getByRole('button', { name: 'Recrutar' });
  await expect(abrir).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('.recrutamento__corpo')).toBeHidden();
  await abrir.click();
  await expect(abrir).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.recrutamento__alvo')).toContainText('Quartel');
  await expect(page.locator('.recrutamento__valor')).toBeHidden();

  // A população aparece na ficha, e é ela que decide se a Ágora vale a pena.
  await expect(page.locator('dd.ficha__populacao')).toContainText('35.000');
  await expect(page.locator('dd.ficha__crescimento')).toHaveText('+175 por turno');

  await page.evaluate(() => {
    const i = (window as unknown as { inspecao: Ganchos }).inspecao;
    i.darOuro(20_000);
    i.construir('atenas', 'quartel');
    for (let n = 0; n < 4; n++) i.passarTurno(); // 4 turnos de obra
  });
  await page.mouse.click(960, 540);

  await expect(page.locator('.recrutamento__alvo')).toContainText('35.697 habitantes');
  await expect(page.locator('.recrutamento__alvo')).toContainText('33.697 disponíveis');
  const seletor = page.getByRole('slider', { name: 'Quantidade de soldados para recrutar' });
  await expect(seletor).toHaveAttribute('type', 'range');
  const tesouro = await page.evaluate(
    () => (window as unknown as { inspecao: Ganchos }).inspecao.campanha().tesouro,
  );
  await expect(seletor).toHaveAttribute('max', String(Math.floor(tesouro / 3)));
  await expect(page.locator('.recrutamento__previsao')).toContainText('Arraste a barra');
  await expect(page.getByRole('button', { name: 'Reunir leva' })).toBeDisabled();

  // O teste move a barra como o jogador faria; nenhum campo numérico digitável existe.
  await seletor.evaluate((elemento) => {
    const barra = elemento as HTMLInputElement;
    barra.value = '1000';
    barra.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(page.locator('.recrutamento__previsao')).toContainText('3.000 moedas agora');
  await expect(page.locator('.recrutamento__previsao')).toContainText('300 por turno');
  await expect(page.getByRole('button', { name: 'Reunir 1.000' })).toBeEnabled();

  await page.getByRole('button', { name: 'Reunir 1.000' }).click();

  const depois = await page.evaluate(() => {
    const i = (window as unknown as { inspecao: Ganchos }).inspecao;
    return {
      forca: i.forcaEm('atenas'),
      formacao: i.formacaoEm('atenas')?.homens ?? 0,
      populacao: i.populacaoDe('atenas'),
    };
  });
  expect(depois).toEqual({ forca: 0, formacao: 1000, populacao: 34_697 });

  // A leva já está no mapa, mas visualmente exausta e fora da força que pode marchar.
  const formacao = page.locator('.hostes__marca[data-provincia="atenas"]');
  await expect(formacao).toHaveText('1.000');
  await expect(formacao).toHaveAttribute('data-somente-formacao', 'sim');
  await expect(formacao).toHaveAttribute('data-em-formacao', 'sim');

  // Os painéis contam a mesma história.
  await expect(page.locator('dd.ficha__populacao')).toContainText('34.697');
  await expect(page.locator('.recrutamento__alvo')).toContainText('32.697 disponíveis');
  await expect(seletor).toHaveValue('0');
  await expect(page.locator('.barra-turno__ouro')).toContainText('+691');
  await expect(page.locator('.barra-turno__ouro')).not.toContainText('−300');

  await page.evaluate(() => (window as unknown as { inspecao: Ganchos }).inspecao.passarTurno());
  const pronta = await page.evaluate(() => {
    const i = (window as unknown as { inspecao: Ganchos }).inspecao;
    return { forca: i.forcaEm('atenas'), formacao: i.formacaoEm('atenas') };
  });
  expect(pronta).toEqual({ forca: 1000, formacao: undefined });
  await expect(formacao).toHaveAttribute('data-somente-formacao', 'nao');
  await expect(page.locator('.barra-turno__ouro')).toContainText('−300');

  // Ver e dispensar a tropa NÃO moram mais aqui: mudaram para a ficha do exército, que
  // se abre clicando no marcador. Ver testes/tela/hostes.spec.ts.
  await expect(page.locator('.recrutamento')).not.toContainText('Dispensar');

  // Pode ser recolhido outra vez sem esconder a existência da ação.
  await abrir.click();
  await expect(page.locator('.recrutamento__corpo')).toBeHidden();
  await expect(abrir).toBeVisible();

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
  const dica = await quartel.getAttribute('data-tooltip-corpo');
  expect(dica).toContain('Permite reunir e recrutar');
  // "nunca se paga" seria verdade aritmética e mentira sobre o que ele é
  expect(dica).not.toContain('paga-se em');
  expect(dica).not.toContain('por turno,');
});
