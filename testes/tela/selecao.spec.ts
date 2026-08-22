import { expect, test } from '@playwright/test';

interface Ganchos {
  campanha: () => { tesouro: number; renda: number };
  economiaDe: (idProvincia: string) => { total: number } | null;
}

/**
 * Clicar num painel não pode mexer no mapa.
 *
 * O aperto do mouse é escutado no canvas e a soltura na janela — a soltura precisa ser
 * na janela pra não se perder quando o jogador arrasta o mapa e solta fora dela. Sem
 * guarda, isso produzia um clique fantasma: apertar um botão de painel gerava uma
 * soltura sem aperto, e a cena lia como clique no mapa, selecionando a província que
 * estivesse debaixo do painel ou limpando a seleção se ali fosse mar.
 *
 * É regressão de interface, então o teste é de interface: só clicando de verdade dá pra
 * saber se o evento chegou onde não devia.
 */
test('clicar no painel de ações não troca a província selecionada', async ({ page }) => {
  const erros: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(m.text());
  });
  page.on('pageerror', (e) => erros.push(e.message));

  await page.goto('/');
  await page.waitForSelector('body[data-pronto="sim"]');

  await page.getByRole('button', { name: 'Iniciar jogo' }).click();
  await page.waitForTimeout(600);
  // a escolha aponta a câmera pra Atenas; o centro da tela é ela
  await page.mouse.click(960, 540);
  await page.getByRole('button', { name: 'Começar campanha' }).click();
  await page.waitForSelector('.barra-turno');

  await page.mouse.click(960, 540);
  await expect(page.locator('.ficha__nome')).toHaveText('Atenas');
  await expect(page.locator('.acoes__valor')).toHaveAttribute('type', 'range');

  // Passar o cursor pelo MAPA antes de ir ao painel é o que arma a armadilha: a posição
  // do mouse só é atualizada sobre o canvas, então o clique fantasma acontecia no último
  // ponto pisado no mapa — não em cima do painel. Sem este passo o teste passa mesmo com
  // o bug presente, porque o fantasma reselecionaria a própria Atenas.
  await page.mouse.move(900, 900); // mar aberto: o fantasma esconderia a ficha
  await page.locator('.acoes__valor').click();
  await expect(page.locator('.ficha')).toBeVisible();
  await expect(page.locator('.ficha__nome')).toHaveText('Atenas');

  await page.mouse.move(500, 900); // Esparta: o fantasma trocaria a província
  await page.getByRole('button', { name: /^Investir 250$/ }).click();
  await expect(page.locator('.ficha__nome')).toHaveText('Atenas');
  await expect(page.locator('.ficha')).toBeVisible();

  // e o investimento realmente aconteceu, em vez de virar clique no mapa
  await expect(page.locator('.acoes__alvo')).toContainText('Incentivo de');

  expect(erros, erros.join('\n')).toHaveLength(0);
});

/**
 * O ciclo econômico inteiro numa passada: construir muda a renda na barra, aparece na
 * ficha, e a linha vira "construída" em vez de sumir.
 */
test('construir uma Ágora muda a renda, a ficha e a própria linha', async ({ page }) => {
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
  await page.mouse.click(960, 540);
  await expect(page.locator('.ficha__nome')).toHaveText('Atenas');

  const renda = await page.evaluate(
    () => (window as unknown as { inspecao: Ganchos }).inspecao.campanha().renda,
  );
  await expect(page.locator('.barra-turno')).toContainText(`3000 moedas (+${renda})`);
  // o detalhe agora vive no tooltip, pra lista dar pra varrer com o olho
  await expect(page.getByRole('button', { name: /^Ágora/ })).toHaveAttribute(
    'data-tooltip-corpo',
    /paga-se em \d+ turnos/,
  );
  await expect(page.getByRole('button', { name: /^Celeiro público/ })).toHaveAttribute(
    'data-tooltip-corpo',
    /\+\d+ → \+\d+ habitantes por turno/,
  );

  await page.getByRole('button', { name: /^Ágora/ }).click();

  // paga à vista e ENTREGA DEPOIS: o tesouro zerou, mas a renda ainda não subiu
  await expect(page.locator('.barra-turno')).toContainText(`0 moedas (+${renda})`);
  await expect(page.locator('.ficha__obra')).toContainText('Ágora em obra · 3 turnos');
  await expect(page.getByRole('button', { name: /^Ágora/ })).toContainText('em obra, 3 turnos');
  // as outras continuam visíveis, dizendo por que não dá
  await expect(page.getByRole('button', { name: /^Oficina/ })).toContainText('em obra aqui');

  // três turnos depois a obra está de pé e a renda subiu
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: /Passar o turno/ }).click();
  }
  const rendaComAgora = await page.evaluate(
    () => (window as unknown as { inspecao: Ganchos }).inspecao.campanha().renda,
  );
  expect(rendaComAgora).toBeGreaterThan(renda); // a Ágora entregou
  await expect(page.locator('.barra-turno')).toContainText(`(+${rendaComAgora})`);
  await expect(page.locator('.ficha__construcoes')).toHaveText('Ágora');
  await expect(page.getByRole('button', { name: /^Ágora/ })).toContainText('construída');
  // a ficha mostra UMA linha de dinheiro; a decomposição mora no Governo
  const deAtenas = await page.evaluate(
    () => (window as unknown as { inspecao: Ganchos }).inspecao.economiaDe('atenas')?.total,
  );
  await expect(page.locator('.ficha__renda')).toHaveText(`rende ${deAtenas} por turno`);

  expect(erros.join(' | ')).toBe('');
});

/**
 * A janela de governo é o único lugar onde impostos, produção e comércio aparecem
 * separados — e o único onde existe um total do reino.
 */
test('o Governo mostra o balanço de cada província e o total', async ({ page }) => {
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

  await expect(page.locator('.governo')).toBeHidden();
  await page.getByRole('button', { name: 'Governo' }).click();
  await expect(page.locator('.governo')).toBeVisible();

  // uma linha por província do jogador, mais o rodapé de totais
  await expect(page.locator('.balanco__tabela tbody tr')).toHaveCount(3);
  const total = await page.evaluate(
    () => (window as unknown as { inspecao: Ganchos }).inspecao.campanha().renda,
  );
  await expect(page.locator('.balanco__tabela tfoot')).toContainText(String(total));
  await expect(page.locator('.balanco__resumo')).toContainText('3.000 moedas');

  // Esc fecha
  await page.keyboard.press('Escape');
  await expect(page.locator('.governo')).toBeHidden();

  expect(erros.join(' | ')).toBe('');
});
