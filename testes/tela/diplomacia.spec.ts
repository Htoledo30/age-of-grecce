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
  congelarIA: () => void;
  declararGuerra: (contra: string, porPoder?: string) => void;
  proporAoJogador: (de: string, tipo: string, turnos?: number) => void;
  campanha: () => { tesouro: number };
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
  await expect(aba.locator('button[data-poder]')).not.toHaveCount(0);
  await expect(aba.locator('button[data-poder][data-relacao="guerra"]')).toHaveCount(0);
  await expect(aba.locator('[data-acao="paz"]')).toHaveCount(0);

  // Escolher o reino é o primeiro passo: a pergunta é "o que eu faço com ELE?".
  await aba.locator('button[data-poder="eleusis"]').click();
  await expect(aba.locator('.diplomacia__reino')).toHaveText('Elêusis');
  await aba.locator('[data-acao="guerra"]').click();

  // A lista troca de lado e o dossiê passa a oferecer a paz — sem perder o reino escolhido.
  // ⚠️ `button[...]`, e não `[...]` solto: desde que a mesa desenha ESTANDARTES, o mesmo
  // `data-poder` aparece também no SVG do brasão — o seletor cru casa com dois elementos.
  await expect(aba.locator('button[data-poder="eleusis"]')).toHaveAttribute(
    'data-relacao',
    'guerra',
  );
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

/**
 * A MESA LEGÍVEL: o que Henrique pediu ao ver a tela de negociação do Rome: Total War —
 * *"pouco texto e mesmo assim consigo entender o que está acontecendo"*.
 *
 * ⚠️ **O que este teste guarda são as quatro peças que respondem a isso**, e cada uma nasceu
 * de uma ausência medida na tela antiga:
 *
 * 1. **a frase do alto** — *"Em guerra há 22 turnos"*. Havia opinião, prazo de pacto, prazo de
 *    aliança e trégua, cada um num canto, e em lugar nenhum a situação por extenso;
 * 2. **o motivo de cada linha da lista** — medido na rodada 1, dezessete reinos mostravam o
 *    mesmo `0 =` em ordem alfabética, e uma guerra entre Corinto e Tebas não aparecia;
 * 3. **as fileiras de estandarte** — as relações com terceiros em escudo, para os dois lados;
 * 4. **os dois títulos da coluna de ação** — o pedido dele e as suas propostas, nomeados.
 */
test('a mesa diz em uma frase o que os dois são, e a lista diz por que cada reino está nela', async ({
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

  await page.evaluate(() => {
    const i = (window as unknown as { inspecao: Ganchos }).inspecao;
    i.congelarIA();
    // Uma guerra ENTRE TERCEIROS: é o caso que a lista antiga não mencionava de jeito nenhum.
    i.declararGuerra('tebas', 'corinto');
    i.declararGuerra('argos', 'corinto');
    // E um pedido em cima da mesa, que é a metade da diplomacia em que quem fala é o outro.
    i.proporAoJogador('eleusis', 'pacto', 20);
  });
  await page.getByRole('button', { name: /Diplomacia/ }).click();
  const aba = page.locator('[data-painel="diplomacia"]');

  // 1 · A frase do alto. Em paz e sem história de sangue, ela diz exatamente isso.
  await expect(aba.locator('.diplomacia__estado-frase')).toHaveText(/Em paz/);

  // 2 · O motivo por linha: Corinto está em duas guerras que não são suas, e a lista diz.
  await expect(
    aba.locator('button[data-poder="corinto"] .diplomacia__nome-estado'),
  ).toHaveText('Em 2 guerras');

  // 3 · Os escudos: as guerras DELE aparecem como estandartes na tira espelhada.
  await aba.locator('button[data-poder="corinto"]').click();
  const inimigosDele = aba.locator('.diplomacia__confronto-dele.diplomacia__brasoes').first();
  await expect(inimigosDele.locator('.estandarte')).toHaveCount(2);

  // 4 · Os dois títulos nomeiam a coluna: primeiro o que ELE quer, depois o que você pode.
  await aba.locator('button[data-poder="eleusis"]').click();
  await expect(aba.locator('.diplomacia__secao').first()).toHaveText('O que Elêusis pede');
  await expect(aba.locator('.diplomacia__secao').nth(1)).toHaveText('Ou proponha você');
  await expect(aba.locator('.diplomacia__pedido')).toBeVisible();

  expect(erros).toEqual([]);
});

test('o ouro que fecha o pacto aparece como custo e viaja com a proposta', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('body[data-pronto="sim"]');
  await page.getByRole('button', { name: 'Iniciar jogo' }).click();
  await page.waitForTimeout(600);
  await page.mouse.click(960, 540);
  await page.getByRole('button', { name: 'Começar campanha' }).click();
  await page.waitForSelector('.barra-turno');
  await page.evaluate(() =>
    (window as unknown as { inspecao: Ganchos }).inspecao.congelarIA(),
  );

  await page.getByRole('button', { name: 'Diplomacia' }).click();
  const aba = page.locator('[data-painel="diplomacia"]');
  await aba.locator('button[data-poder="megara"]').click();
  const pacto = aba.locator('.diplomacia__grupo[data-grupo="pacto de não-agressão"]');
  await pacto.locator('.diplomacia__ficha-topo').click();

  const proposta = pacto
    .locator('[data-acao="pacto"][data-resposta="livre"]')
    .filter({ hasText: /de ouro/ })
    .first();
  const custo = proposta.locator('.diplomacia__acao-custo');
  await expect(custo).toHaveText(/−[\d.]+ de ouro/);
  const ouro = Number((await custo.textContent())?.replace(/\D/g, ''));
  expect(ouro).toBeGreaterThan(0);
  const antes = await page.evaluate(
    () => (window as unknown as { inspecao: Ganchos }).inspecao.campanha().tesouro,
  );

  await proposta.click();
  const depois = await page.evaluate(
    () => (window as unknown as { inspecao: Ganchos }).inspecao.campanha().tesouro,
  );
  expect(depois).toBe(antes - ouro);
  await expect(pacto).toContainText('em vigor');
});

test('o pedido de um reino aparece embaixo da crônica e abre a mesa com ele', async ({ page }) => {
  // Henrique: *"quando chegam ofertas de outros reinos ainda não tem um feedback muito claro"*.
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(e.message));

  await page.goto('/');
  await page.waitForSelector('body[data-pronto="sim"]');
  await page.getByRole('button', { name: 'Iniciar jogo' }).click();
  await page.waitForTimeout(600);
  await page.mouse.click(960, 540);
  await page.getByRole('button', { name: 'Começar campanha' }).click();
  await page.waitForSelector('.barra-turno');

  const cartao = page.locator('.pedidos__cartao');
  await expect(cartao).toHaveCount(0);
  await page.evaluate(() => {
    const i = (window as unknown as { inspecao: Ganchos }).inspecao;
    i.congelarIA();
    i.proporAoJogador('eleusis', 'pacto', 20);
  });
  await expect(cartao).toHaveCount(1);
  await expect(cartao).toContainText('Elêusis');
  await expect(cartao).toContainText('propõe pacto');

  await cartao.click();
  const aba = page.locator('[data-painel="diplomacia"]');
  await expect(aba.locator('.diplomacia__pedido')).toBeVisible();
  await expect(aba.locator('.diplomacia__secao').first()).toHaveText('O que Elêusis pede');

  expect(erros).toEqual([]);
});
