import { expect, test } from '@playwright/test';

interface Ganchos {
  /** Desliga a IA: este arquivo mede a TELA, não o adversário. */
  congelarIA: () => void;
  /** Tira a comida do caminho: este arquivo mede a TELA, não a despensa. */
  saciar: () => void;
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
  await expect(page.locator('.barra-turno__saldo')).toHaveText(tesouro.toLocaleString('pt-BR'));
  await expect(page.locator(".barra-turno__variacao[data-tom='ganho']")).toHaveText(
    `+${renda.toLocaleString('pt-BR')}`,
  );
  // O catálogo é uma lista de leitura rápida; a primeira batida escolhe e a segunda, no
  // detalhe, compra. Efeito, custo e prazo continuam visíveis antes do gasto.
  const agora = page.locator('.construcoes__cartao', {
    has: page.locator('.construcoes__nome', { hasText: /^Ágora$/ }),
  });
  const fazenda = page.locator('.construcoes__cartao', {
    has: page.locator('.construcoes__nome', { hasText: /^Fazenda$/ }),
  });
  const armaria = page.locator('.construcoes__cartao', {
    has: page.locator('.construcoes__nome', { hasText: /^Armaria$/ }),
  });
  const detalhe = page.locator('.construcoes__detalhe');
  const arte = detalhe.locator('.construcoes__arte');
  await page.getByRole('button', { name: /^Construções/ }).click();
  await expect(agora).toHaveAttribute('aria-pressed', 'true');
  await expect(agora).toHaveAttribute('data-categoria', 'cidade');
  await expect(arte).toHaveAttribute('src', /agora-v1\.webp$/);
  await expect
    .poll(() =>
      arte.evaluate((imagem: HTMLImageElement) => [imagem.naturalWidth, imagem.naturalHeight]),
    )
    .toEqual([1200, 900]);
  await expect(detalhe).toContainText(/Retorno\s*\d+ turnos/);
  await expect(detalhe).toContainText('−40% corrupção por tamanho');
  await expect(armaria).toHaveAttribute('data-estado', 'sem-ouro');
  await armaria.click();
  await expect(detalhe.getByRole('button', { name: 'Erguer nível I' })).toBeDisabled();
  await expect(detalhe).not.toContainText('faltam');
  await expect(fazenda).toContainText(/\+1\s*alimento do reino/);
  await expect(fazenda).toHaveAttribute('data-categoria', 'terra');

  await fazenda.click();
  await expect(detalhe.getByRole('heading', { name: 'Fazenda' })).toBeVisible();
  await expect(arte).toHaveAttribute('src', /fazenda-v1\.webp$/);
  await expect(page.locator('.barra-turno__saldo')).toHaveText(tesouro.toLocaleString('pt-BR'));
  await agora.click();
  await expect(arte).toHaveAttribute('src', /agora-v1\.webp$/);

  await detalhe.getByRole('button', { name: /^Erguer nível I$/ }).click();
  await expect(page.locator('.construcoes__patrimonio')).toContainText('1/4');
  await expect(page.locator('.acoes__portao-contador').first()).toHaveText('1/4');
  const faixaDaAgora = page.locator('.construcoes__slot[data-construcao="agora"]');
  await expect(faixaDaAgora).toHaveAttribute('data-estado', 'obra');
  await expect(faixaDaAgora).toHaveAttribute('data-fase', 'nova');
  await expect(faixaDaAgora.locator('.construcoes__slot-imagem')).toHaveAttribute(
    'src',
    /agora-v1\.webp$/,
  );
  await page.keyboard.press('Escape');

  // paga à vista e ENTREGA DEPOIS: sobram 1.000 moedas, mas a renda ainda não subiu
  // Deriva do custo real: o preço da obra acompanha a riqueza da terra e não é mais um
  // número fixo do catálogo.
  const custoDaAgora = await page.evaluate(
    () => (window as unknown as { inspecao: Ganchos }).inspecao.custoDaObraEm('atenas', 'agora', 1),
  );
  await expect(page.locator('.barra-turno__saldo')).toHaveText(
    (tesouro - custoDaAgora).toLocaleString('pt-BR'),
  );
  await expect(page.locator(".barra-turno__variacao[data-tom='ganho']")).toHaveText(
    `+${renda.toLocaleString('pt-BR')}`,
  );
  // A obra é ALARME no painel: fica acima das medidas, onde o olho entra.
  await expect(page.locator('.ficha__aviso[data-tom="obra"]')).toContainText(
    'Ágora I em obra · 2 turnos',
  );
  await page.getByRole('button', { name: /^Construções/ }).click();
  await expect(agora).toHaveAttribute('data-estado', 'obra');
  await expect(detalhe.getByRole('button')).toContainText('Em obra · 2 turnos');
  // as outras continuam visíveis, dizendo por que não dá
  //
  // ⚠️ Pelo NOME do cartão, e não pelo texto dele: a descrição do Porto passou a dizer que ele
  // "leva mercadoria", e um filtro por "Mercado" casava com os dois cartões.
  await expect(
    page
      .locator('.construcoes__cartao')
      .filter({ has: page.locator('.construcoes__nome', { hasText: /^Mercado$/ }) }),
  ).toHaveAttribute('data-estado', 'bloqueada');
  await page.keyboard.press('Escape');

  // dois turnos depois a obra está de pé e a renda subiu
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: /Passar o turno/ }).click();
  }
  const rendaComAgora = await page.evaluate(
    () => (window as unknown as { inspecao: Ganchos }).inspecao.campanha().renda,
  );
  expect(rendaComAgora).toBeGreaterThan(renda); // a Ágora entregou
  await expect(page.locator('.barra-turno')).toContainText(
    `+${rendaComAgora.toLocaleString('pt-BR')}`,
  );
  // O painel não lista as construções erguidas — o contador do portão diz quantas são, e a
  // janela diz quais. Duas listas de pastilha empilhadas confundiam produto com construção.
  await expect(page.locator('.acoes__portao-contador').first()).toHaveText('1/4');
  await page.getByRole('button', { name: /^Construções/ }).click();
  await expect(agora).toContainText('I → II');
  await expect(detalhe.getByRole('button', { name: 'Ampliar para II' })).toBeVisible();
  await expect(faixaDaAgora).toHaveAttribute('data-estado', 'erguida');
  await expect(faixaDaAgora).toHaveAttribute('data-fase', 'concluida');
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
    i.congelarIA();
    i.saciar();
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

/**
 * A camada de NOMES não pode roubar o clique do mapa.
 *
 * ⚠️ **Regressão de especificidade de CSS, e ela chegou ao Henrique jogando:** `base.css` tem
 * `#ui > * { pointer-events: auto; }` — seletor de ID —, que ANULA um `pointer-events: none`
 * escrito só na classe. A camada de rótulos cobre a tela inteira; com o clique ligado nela, o
 * jogo parava de responder a clique e a arrasto assim que os nomes acendiam. *"Quando ativo o
 * botão eu não consigo clicar no mapa ou em nada, perco movimento."*
 *
 * Só um teste de tela pega isto: o TypeScript não vê CSS, e a camada existe e funciona — o
 * que quebra é o que está DEBAIXO dela.
 */
test('com os nomes no mapa ligados, o clique continua chegando na província', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('body[data-pronto="sim"]');
  await page.evaluate(() => {
    (window as unknown as { inspecao: { comecar: (p: string) => void } }).inspecao.comecar(
      'atenas',
    );
  });

  // Os nomes vêm LIGADOS de fábrica: é o pedido dele, e é a condição em que o defeito aparece.
  await expect(page.locator('.rotulos-mapa__nome').first()).toBeVisible();

  await page.evaluate(() => {
    const inspecao = window as unknown as {
      inspecao: {
        centroDe: (p: string) => { x: number; y: number };
        posicionar: (x: number, y: number, zoom: number) => void;
      };
    };
    const centro = inspecao.inspecao.centroDe('tebas');
    inspecao.inspecao.posicionar(centro.x, centro.y, 3);
  });
  await page.waitForTimeout(300);
  await page.mouse.click(960, 500);

  await expect(page.locator('.ficha__reino')).toContainText('Tebas');
});
