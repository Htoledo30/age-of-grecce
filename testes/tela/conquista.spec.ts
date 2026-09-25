import { expect, test } from '@playwright/test';

/**
 * A ficha tem que dizer de quem a província é AGORA, não de quem ela era em 700 a.C.
 *
 * É regressão de raiz, e vale um teste de tela porque o bug era exatamente uma verdade
 * duplicada entre camadas: `ProvinciasMapa` montava a ficha da província a partir do dono
 * **assado**, no construtor. Nas regras a conquista funcionava; na tela, a primeira
 * província a trocar de mãos passava a mentir para sempre — e mentia com um nome de poder
 * plausível, que é o tipo de erro que ninguém vê.
 *
 * O conserto foi de raiz em vez de remendo: a camada de mapa devolve o ÍNDICE da
 * província e parou de saber quem manda nela. Quem monta a ficha junta atlas (o que ela
 * é) e campanha (de quem ela é hoje).
 */
test('conquistar uma província muda a cor no mapa e o dono na ficha', async ({ page }) => {
  const erros: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(m.text());
  });
  page.on('pageerror', (e) => erros.push(e.message));

  await page.goto('/');
  await page.waitForSelector('body[data-pronto="sim"]');

  await page.getByRole('button', { name: 'Iniciar jogo' }).click();
  await page.waitForTimeout(600);
  await page.mouse.click(960, 540); // a câmera já aponta pra Atenas
  await page.getByRole('button', { name: 'Começar campanha' }).click();
  await page.waitForSelector('.barra-turno');

  const inspecao = () =>
    page.evaluate(() => {
      const i = (
        window as unknown as {
          inspecao: {
            donoDe: (id: string) => string;
            campanha: () => { provincias: number; poderesVivos: number };
          };
        }
      ).inspecao;
      return { dono: i.donoDe('megara'), ...i.campanha() };
    });

  const antes = await inspecao();
  expect(antes.dono).toBe('megara');
  expect(antes.provincias).toBe(3); // a Ática: Atenas, Maratona e Sunião

  // Mégara tem DUAS províncias (Mégara e Salamina): tomar uma não a elimina, e é isso
  // que separa "perdeu território" de "morreu".
  await page.evaluate(() =>
    (
      window as unknown as { inspecao: { conquistar: (a: string, b: string) => void } }
    ).inspecao.conquistar('megara', 'atenas'),
  );

  const depois = await inspecao();
  expect(depois.dono).toBe('atenas');
  expect(depois.provincias).toBe(4);
  expect(depois.poderesVivos).toBe(antes.poderesVivos); // ainda tem Salamina

  // A barra de turno acompanha sem ninguém mandar: quem muda o estado avisa, e quem
  // desenha se redesenha inteiro.
  await expect(page.locator('.barra-turno')).toContainText('4');

  // E agora o que o bug arruinava: a ficha da província conquistada.
  await page.evaluate(() =>
    (
      window as unknown as { inspecao: { posicionar: (x: number, y: number, z: number) => void } }
    ).inspecao.posicionar(4102, 4203, 1),
  );
  await page.waitForTimeout(300);
  await page.mouse.click(960, 540);
  await expect(page.locator('.ficha__nome')).toHaveText('Mégara');
  await expect(page.locator('.ficha__reino')).toContainText('Atenas');

  // Sendo dela, Mégara passa a aceitar ação — e como a Grécia central inteira tem
  // economia configurada, o painel abre com os slots e a lista de construções.
  // ⚠️ O painel deixou de escrever a palavra "slots": ele diz "Construções 1/4", que é a mesma
  // informação em números. O que este teste guarda é que a ficha ABRE com as ações da província
  // depois da conquista, e não o vocabulário de um rótulo.
  await expect(page.locator('.acoes')).toContainText('Construções');

  expect(erros, erros.join('\n')).toHaveLength(0);
});

/**
 * Perder a última província é a eliminação, e ela é DERIVADA da tabela de donos — não há
 * um segundo lugar onde alguém possa marcar "morto" e discordar do mapa.
 */
test('tomar tudo de um poder o elimina da contagem', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('body[data-pronto="sim"]');
  await page.getByRole('button', { name: 'Iniciar jogo' }).click();
  await page.waitForTimeout(600);
  await page.mouse.click(960, 540);
  await page.getByRole('button', { name: 'Começar campanha' }).click();
  await page.waitForSelector('.barra-turno');

  const vivos = () =>
    page.evaluate(
      () =>
        (
          window as unknown as { inspecao: { campanha: () => { poderesVivos: number } } }
        ).inspecao.campanha().poderesVivos,
    );

  expect(await vivos()).toBe(139);

  // Caristo: uma província só e nenhuma guarnição em pé — a eliminação é limpa. Mégara
  // deixou de servir aqui: ela tem tropa, e perder o chão a deixaria no exílio, viva.
  await page.evaluate(() => {
    const i = (window as unknown as { inspecao: { conquistar: (a: string, b: string) => void } })
      .inspecao;
    i.conquistar('caristo', 'atenas');
  });

  expect(await vivos()).toBe(138);
});
