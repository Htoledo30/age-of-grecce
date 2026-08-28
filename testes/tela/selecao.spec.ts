import { expect, test } from '@playwright/test';

interface Ganchos {
  campanha: () => { tesouro: number; renda: number };
  custoDaObraEm: (idProvincia: string, idConstrucao: string, nivel: number) => number;
  economiaDe: (idProvincia: string) => { total: number } | null;
  rendaDeTrocas: (idPoder: string) => number;
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
  await expect(page.locator('.acoes__portao-contador').first()).toHaveText('0/4');
  // O decreto de imposto: três níveis, o vigente (Normal) marcado e desabilitado.
  await expect(page.locator('.acoes__imposto')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Normal' })).toBeDisabled();

  // Passar o cursor pelo MAPA antes de ir ao painel é o que arma a armadilha: a posição
  // do mouse só é atualizada sobre o canvas, então o clique fantasma acontecia no último
  // ponto pisado no mapa — não em cima do painel. Sem este passo o teste passa mesmo com
  // o bug presente, porque o fantasma reselecionaria a própria Atenas.
  await page.mouse.move(900, 900); // mar aberto: o fantasma esconderia a ficha
  await page.getByRole('button', { name: 'Baixo' }).click();
  await expect(page.locator('.ficha')).toBeVisible();
  await expect(page.locator('.ficha__nome')).toHaveText('Atenas');

  await page.mouse.move(500, 900); // Esparta: o fantasma trocaria a província
  await page.getByRole('button', { name: 'Alto' }).click();
  await expect(page.locator('.ficha__nome')).toHaveText('Atenas');
  await expect(page.locator('.ficha')).toBeVisible();

  // e o decreto realmente aconteceu, em vez de virar clique no mapa
  await expect(page.getByRole('button', { name: 'Alto' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Normal' })).toBeEnabled();

  expect(erros, erros.join('\n')).toHaveLength(0);
});

/**
 * O ciclo econômico inteiro numa passada: construir muda a renda na barra, aparece na
 * ficha, e a linha passa a oferecer o próximo nível em vez de sumir.
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

  const { renda, tesouro } = await page.evaluate(
    () => (window as unknown as { inspecao: Ganchos }).inspecao.campanha(),
  );
  // Pergunta às regras em vez de cravar: tesouro inicial é balanço e já mudou uma vez.
  await expect(page.locator('.barra-turno__saldo')).toHaveText(String(tesouro));
  await expect(page.locator('.barra-turno__variacao')).toHaveText(`(+${renda})`);
  // ⚠️ As construções moram numa JANELA desde a reforma do painel. O detalhe deixou de ser
  // tooltip e voltou a ser texto no cartão: com espaço de verdade, a conta que decide entre
  // duas obras cabe na tela em vez de ficar escondida atrás do cursor.
  const agora = page.locator('.construcoes__cartao', { hasText: 'Ágora' });
  await page.getByRole('button', { name: /^Construções/ }).click();
  await expect(agora).toContainText(/paga-se em\s*\d+ turnos/);
  await expect(page.locator('.construcoes__cartao', { hasText: 'Fazenda' })).toContainText(
    '+1/+2/+3 ao saldo alimentar',
  );

  await agora.getByRole('button', { name: /^Erguer/ }).click();
  await page.keyboard.press('Escape');

  // paga à vista e ENTREGA DEPOIS: sobram 1.000 moedas, mas a renda ainda não subiu
  // Deriva do custo real: o preço da obra acompanha a riqueza da terra e não é mais um
  // número fixo do catálogo.
  const custoDaAgora = await page.evaluate(
    () => (window as unknown as { inspecao: Ganchos }).inspecao.custoDaObraEm('atenas', 'agora', 1),
  );
  await expect(page.locator('.barra-turno__saldo')).toHaveText(String(tesouro - custoDaAgora));
  await expect(page.locator('.barra-turno__variacao')).toHaveText(`(+${renda})`);
  // A obra é ALARME no painel: fica acima das medidas, onde o olho entra.
  await expect(page.locator('.ficha__aviso[data-tom="obra"]')).toContainText(
    'Ágora I em obra · 2 turnos',
  );
  await page.getByRole('button', { name: /^Construções/ }).click();
  await expect(agora).toContainText('Obra em andamento');
  // as outras continuam visíveis, dizendo por que não dá
  await expect(page.locator('.construcoes__cartao', { hasText: 'Mercado' })).toContainText(
    'em obra aqui',
  );
  await page.keyboard.press('Escape');

  // dois turnos depois a obra está de pé e a renda subiu
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: /Passar o turno/ }).click();
  }
  const rendaComAgora = await page.evaluate(
    () => (window as unknown as { inspecao: Ganchos }).inspecao.campanha().renda,
  );
  expect(rendaComAgora).toBeGreaterThan(renda); // a Ágora entregou
  await expect(page.locator('.barra-turno')).toContainText(`(+${rendaComAgora})`);
  // O painel não lista as construções erguidas — o contador do portão diz quantas são, e a
  // janela diz quais. Duas listas de pastilha empilhadas confundiam produto com construção.
  await expect(page.locator('.acoes__portao-contador').first()).toHaveText('1/4');
  await page.getByRole('button', { name: /^Construções/ }).click();
  await expect(agora.getByRole('button')).toContainText('Subir para II');
  await page.keyboard.press('Escape');
  // O painel mostra o saldo COMPLETO da terra; o tooltip guarda a conta curta.
  const saldoProvincial = page.locator('.ficha__medida[data-medida="saldo"]');
  await expect(saldoProvincial).toHaveText(/saldo[−+]\d+por turno/);
  await expect(saldoProvincial).toHaveAttribute('data-tooltip-corpo', /impostos/);
  await expect(saldoProvincial).toHaveAttribute('data-tooltip-corpo', /produção/);

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

  // Pergunta às regras: tesouro inicial é balanço.
  const tesouroDoReino = await page.evaluate(
    () => (window as unknown as { inspecao: Ganchos }).inspecao.campanha().tesouro,
  );

  await expect(page.locator('.governo')).toBeHidden();
  await page.getByRole('button', { name: 'Governo' }).click();
  await expect(page.locator('.governo')).toBeVisible();

  // uma linha por província do jogador, mais o rodapé de totais
  await expect(page.locator('[data-aba="balanco"] .balanco__tabela tbody tr')).toHaveCount(3);
  const conta = await page.evaluate(() => {
    const i = (window as unknown as { inspecao: Ganchos }).inspecao;
    return { reino: i.campanha().renda, trocas: i.rendaDeTrocas('atenas') };
  });
  // ⚠️ **O rodapé soma as TERRAS; o resumo soma o REINO.** A rede de trocas é nacional e não
  // cabe numa tabela província a província — se o rodapé a incluísse, a coluna deixaria de
  // fechar com as linhas de cima.
  expect(conta.trocas).toBeGreaterThan(0);
  await expect(page.locator('[data-aba="balanco"] .balanco__tabela tfoot')).toContainText(
    String(conta.reino - conta.trocas),
  );
  const resumo = page.locator('[data-aba="balanco"] .balanco__resumo');
  await expect(resumo).toContainText(`${tesouroDoReino.toLocaleString('pt-BR')} moedas`);
  await expect(resumo).toContainText(`rede +${conta.trocas}`);
  await expect(resumo).toContainText(`+${conta.reino} por turno`);

  // Esc fecha
  await page.keyboard.press('Escape');
  await expect(page.locator('.governo')).toBeHidden();

  expect(erros.join(' | ')).toBe('');
});
