import { expect, test } from '@playwright/test';

/**
 * O ciclo militar inteiro numa passada: o recrutamento básico tira a leva da
 * população, e a barra de turno passa a mostrar a manutenção.
 *
 * Vale um teste de tela porque as três verdades moram em painéis diferentes e precisam
 * concordar: a ficha (população de agora), o bloco de recrutar (teto restante) e a barra
 * (renda menos tropa). Se uma delas ler de outro lugar, o jogador vê números que não
 * fecham — e é assim que a economia perde a credibilidade inteira.
 */

interface Ganchos {
  crescimentoDe: (idProvincia: string) => number;
  disponivelParaLevaEm: (idProvincia: string) => number;
  economiaDe: (idProvincia: string) => {
    impostos: number;
    producao: number;
    comercio: number;
    total: number;
  } | null;
  comecar: (idPoder: string) => void;
  campanha: () => { tesouro: number; renda: number };
  darOuro: (valor: number) => void;
  construir: (idProvincia: string, idConstrucao: string) => void;
  passarTurno: () => void;
  forcaEm: (idProvincia: string) => number;
  formacaoEm: (idProvincia: string) => { homens: number; prontaNoTurno: number } | undefined;
  populacaoDe: (idProvincia: string) => number;
}

test('sem Quartel a leva já pode sair da população', async ({ page }) => {
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

  // Recrutamento é básico: abrir o bloco já mostra população e disponibilidade.
  await expect(page.locator('.recrutamento')).toBeVisible();
  const abrir = page.getByRole('button', { name: 'Recrutar' });
  await expect(abrir).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('.recrutamento__corpo')).toBeHidden();
  await abrir.click();
  await expect(abrir).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.recrutamento__alvo')).toContainText('disponíveis para recrutar');
  await expect(page.locator('.recrutamento__valor')).toBeVisible();

  // A população aparece na ficha, e é ela que decide se a Ágora vale a pena.
  const inicial = await page.evaluate(() => {
    const i = (window as unknown as { inspecao: Ganchos }).inspecao;
    return { populacao: i.populacaoDe('atenas'), crescimento: i.crescimentoDe('atenas') };
  });
  const populacaoNaFicha = page.locator('dd.ficha__populacao');
  await expect(populacaoNaFicha).toContainText(comoNaTela(inicial.populacao));
  if (inicial.crescimento === 0) {
    await expect(populacaoNaFicha).toHaveAttribute(
      'data-tooltip-titulo',
      /Sem crescimento líquido|População mantida/,
    );
  } else {
    await expect(populacaoNaFicha).toHaveAttribute('data-tooltip-titulo', 'População subindo');
    await expect(populacaoNaFicha).toHaveAttribute(
      'data-tooltip-corpo',
      `+${comoNaTela(inicial.crescimento)} no próximo turno.`,
    );
  }

  const comQuartel = await page.evaluate(() => {
    const i = (window as unknown as { inspecao: Ganchos }).inspecao;
    return { populacao: i.populacaoDe('atenas'), disponivel: i.disponivelParaLevaEm('atenas') };
  });
  await expect(page.locator('.recrutamento__alvo')).toContainText(
    `${comoNaTela(comQuartel.populacao)} habitantes`,
  );
  await expect(page.locator('.recrutamento__alvo')).toContainText(
    `${comoNaTela(comQuartel.disponivel)} disponíveis`,
  );
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
  // 1.000 × 0,1: a leva nasce e fica EM CASA. O tooltip mostra ao lado o que os mesmos
  // homens custariam em terra alheia, que é o preço de ir à guerra.
  await expect(page.locator('.recrutamento__previsao')).toContainText('100 por turno');
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
  // Os mil recrutas já saíram da população e já foram pagos, mas ainda não são hoste.
  expect(depois).toEqual({
    forca: 0,
    formacao: 1000,
    populacao: comQuartel.populacao - 1000,
  });

  // A leva já está no mapa, mas visualmente exausta e fora da força que pode marchar.
  const formacao = page.locator('.hostes__marca[data-provincia="atenas"]');
  await expect(formacao).toHaveText('1.000');
  await expect(formacao).toHaveAttribute('data-somente-formacao', 'sim');
  await expect(formacao).toHaveAttribute('data-em-formacao', 'sim');

  // Os painéis contam a mesma história.
  const aposLeva = await page.evaluate(() => {
    const i = (window as unknown as { inspecao: Ganchos }).inspecao;
    return {
      populacao: i.populacaoDe('atenas'),
      disponivel: i.disponivelParaLevaEm('atenas'),
      renda: i.campanha().renda,
    };
  });
  // Os mil recrutas saíram da população, e os painéis contam a mesma história.
  expect(aposLeva.populacao).toBe(comQuartel.populacao - 1000);
  await expect(page.locator('dd.ficha__populacao')).toContainText(comoNaTela(aposLeva.populacao));
  await expect(page.locator('.recrutamento__alvo')).toContainText(
    `${comoNaTela(aposLeva.disponivel)} disponíveis`,
  );
  await expect(seletor).toHaveValue('0');
  await expect(page.locator('.barra-turno__ouro')).toContainText(`+${aposLeva.renda}`);
  await expect(page.locator('.barra-turno__ouro')).not.toContainText('−300');

  await page.evaluate(() => (window as unknown as { inspecao: Ganchos }).inspecao.passarTurno());
  const pronta = await page.evaluate(() => {
    const i = (window as unknown as { inspecao: Ganchos }).inspecao;
    return { forca: i.forcaEm('atenas'), formacao: i.formacaoEm('atenas') };
  });
  expect(pronta).toEqual({ forca: 1000, formacao: undefined });
  await expect(formacao).toHaveAttribute('data-somente-formacao', 'nao');
  // A barra cobra a folha da tropa em pé: 1.000 homens à taxa de CASA, porque eles
  // continuam em Atenas. Marchá-los para fora do reino triplicaria esta linha.
  await expect(page.locator('.barra-turno__ouro')).toContainText('−100');

  // Ver e dispensar a tropa NÃO moram mais aqui: mudaram para a ficha do exército, que
  // se abre clicando no marcador. Ver testes/tela/hostes.spec.ts.
  await expect(page.locator('.recrutamento')).not.toContainText('Dispensar');

  // Pode ser recolhido outra vez sem esconder a existência da ação.
  await abrir.click();
  await expect(page.locator('.recrutamento__corpo')).toBeHidden();
  await expect(abrir).toBeVisible();

  expect(erros, erros.join('\n')).toHaveLength(0);
});

/** O Quartel promete qualidade futura sem fingir que ainda entrega bônus de combate. */
test('o Quartel não está à venda: prédio que só promete não aparece', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('body[data-pronto="sim"]');
  await page.getByRole('button', { name: 'Iniciar jogo' }).click();
  await page.waitForTimeout(600);
  await page.mouse.click(960, 540);
  await page.getByRole('button', { name: 'Começar campanha' }).click();
  await page.waitForSelector('.barra-turno');
  await page.mouse.click(960, 540);

  // Ele explicava bem o próprio futuro e cobrava 1.500 moedas por ele. Explicar não é
  // servir: o jogador pagava, não via diferença nenhuma, e passava a duvidar do resto do
  // catálogo. Volta quando o combate existir e "qualidade de tropa" tiver onde morar.
  await expect(page.locator('.acoes__construcao', { hasText: 'Quartel' })).toHaveCount(0);
  // E o resto do catálogo continua lá — esconder um não escondeu tudo.
  await expect(page.locator('.acoes__construcao', { hasText: 'Ágora' })).toHaveCount(1);
});

/**
 * Um número como a interface o escreve — 35000 vira "35.000".
 *
 * ⚠️ Existe para os testes de tela pararem de CRAVAR números de balanço. Antes eles diziam
 * "a ficha mostra 35.280 habitantes", e qualquer ajuste de taxa ou de população quebrava
 * meia dúzia deles — descobertos um por vez, a 96 segundos por rodada. Agora eles
 * perguntam o valor às regras e conferem se a tela mostra o MESMO: guardam a ligação, que
 * é o que pode quebrar de verdade, e ignoram o número, que é balanço.
 */
function comoNaTela(valor: number): string {
  return valor.toLocaleString('pt-BR');
}
