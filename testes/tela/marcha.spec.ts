import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * A marcha, de ponta a ponta: escolher a hoste, dizer quantos vão, pedir para mover, ver
 * os destinos no mapa, escolher um — e **o mapa não mudar**.
 *
 * O que este teste guarda é justamente o que não acontece no clique. Mover registra uma
 * ORDEM; a marcha só ocorre na virada do turno, junto com as de todo mundo. É isso que
 * impede quem age primeiro de tomar uma fronteira vazia antes de o outro lado ter chance
 * de mandar reforço.
 */

interface Ganchos {
  darOuro: (valor: number) => void;
  construir: (idProvincia: string, idConstrucao: string) => void;
  passarTurno: () => void;
  recrutar: (idProvincia: string, homens: number) => void;
  forcaEm: (idProvincia: string) => number;
  alcanceDaHoste: (idHoste: string) => string[];
  hostesEm: (idProvincia: string) => { id: string; poder: string; forca: number }[];
  conquistar: (idProvincia: string, idPoder: string) => void;
  ordens: () => { origem: string; rota: string[]; homens: number }[];
  ordenarMarcha: (idHoste: string, destino: string, homens: number, porPoder?: string) => void;
}

async function comHoste(page: Page, homens: number) {
  await page.goto('/');
  await page.waitForSelector('body[data-pronto="sim"]');
  await page.getByRole('button', { name: 'Iniciar jogo' }).click();
  await page.waitForTimeout(600);
  await page.mouse.click(960, 540);
  await page.getByRole('button', { name: 'Começar campanha' }).click();
  await page.waitForSelector('.barra-turno');
  await page.evaluate((quantos: number) => {
    const i = (window as unknown as { inspecao: Ganchos }).inspecao;
    i.darOuro(60_000);
    i.construir('atenas', 'quartel');
    for (let n = 0; n < 4; n++) i.passarTurno();
    i.recrutar('atenas', quantos);
    i.passarTurno(); // recrutas só recebem ordens a partir da rodada seguinte
  }, homens);
  // ⚠️ Por província, e não `.hostes__marca` sozinho: Elêusis e Tanagra abrem a partida
  // com 500 homens cada, então há três peças no mapa desde o turno 1.
  await page.locator('.hostes__marca[data-provincia="atenas"]').click();
}

test('escolher destino registra a ordem, e a marcha só acontece na virada', async ({ page }) => {
  const erros: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(m.text());
  });
  page.on('pageerror', (e) => erros.push(e.message));

  await comHoste(page, 1500);

  // A barra nasce com a força inteira: mandar tudo é o caso comum, sem digitar.
  await expect(page.locator('.exercito__valor')).toHaveAttribute('type', 'range');
  await expect(page.locator('.exercito__valor')).toHaveValue('1500');
  await expect(page.locator('.destinos__marca')).toHaveCount(0);

  await page.getByRole('button', { name: 'Mover' }).click();

  // Terras próprias e inimigas adjacentes aparecem; terra inimiga é destino terminal.
  await expect(page.locator('.destinos__marca')).toHaveCount(4);
  await expect(page.locator('.destinos__nome')).toHaveText([
    'Elêusis',
    'Maratona',
    'Sunião',
    'Tanagra',
  ]);
  await expect(page.locator('.marchas__previsao')).toHaveCount(4);
  await expect(page.locator('.marchas__origem')).toBeVisible();
  await expect(page.locator('.destinos__marca[data-provincia="maratona"]')).toHaveAttribute(
    'data-hostil',
    'nao',
  );
  await expect(page.locator('.destinos__marca[data-provincia="tanagra"]')).toHaveAttribute(
    'data-hostil',
    'sim',
  );
  await expect(page.locator('.destinos__marca[data-provincia="tanagra"]')).toHaveAttribute(
    'aria-label',
    'Atacar Tanagra',
  );
  await expect(page.locator('.hostes__marca[data-provincia="atenas"]')).toHaveAttribute(
    'data-escolhendo-destino',
    'sim',
  );

  // Apontar um destino engrossa exatamente a rota correspondente.
  await page.locator('.destinos__marca[data-provincia="maratona"]').hover();
  await expect(page.locator('.marchas__previsao[data-destino="maratona"]')).toHaveAttribute(
    'data-destacada',
    'sim',
  );
  await page.locator('.destinos__marca[data-provincia="maratona"]').click();

  // ⚠️ O MAPA NÃO MUDOU. É o ponto inteiro da resolução simultânea.
  expect(
    await page.evaluate(() =>
      (window as unknown as { inspecao: Ganchos }).inspecao.forcaEm('atenas'),
    ),
  ).toBe(1500);
  expect(
    await page.evaluate(() =>
      (window as unknown as { inspecao: Ganchos }).inspecao.forcaEm('maratona'),
    ),
  ).toBe(0);

  // A ordem está registrada, visível e desfazível.
  await expect(page.locator('.exercito__ordem')).toContainText('1.500 marcham para Maratona');
  await expect(page.getByRole('button', { name: 'Cancelar ordem' })).toBeVisible();
  await expect(page.locator('.destinos__marca')).toHaveCount(0);
  await expect(page.locator('.marchas__previsao')).toHaveCount(0);
  await expect(page.locator('.marchas__ordem[data-destino="maratona"]')).toHaveCount(1);
  await expect(page.locator('.marchas__seta[data-minha="sim"]')).toHaveCount(1);
  await expect(page.locator('.marchas__quantidade')).toHaveText('1.500');
  await expect(page.locator('.hostes__marca[data-provincia="atenas"]')).toHaveAttribute(
    'data-ordem',
    'sim',
  );

  await page.getByRole('button', { name: 'Passar o turno' }).click();

  expect(
    await page.evaluate(() => ({
      atenas: (window as unknown as { inspecao: Ganchos }).inspecao.forcaEm('atenas'),
      maratona: (window as unknown as { inspecao: Ganchos }).inspecao.forcaEm('maratona'),
      ordens: (window as unknown as { inspecao: Ganchos }).inspecao.ordens().length,
    })),
  ).toEqual({ atenas: 0, maratona: 1500, ordens: 0 });
  await expect(page.locator('.marchas__ordem')).toHaveCount(0);
  await expect(page.locator('.hostes__marca[data-provincia="maratona"]')).toHaveAttribute(
    'data-chegada',
    'sim',
  );

  expect(erros, erros.join('\n')).toHaveLength(0);
});

test('cancelar a ordem devolve a hoste ao estado de quem não decidiu nada', async ({ page }) => {
  await comHoste(page, 1000);
  await page.getByRole('button', { name: 'Mover' }).click();
  await page.locator('.destinos__marca[data-provincia="sounion"]').click();
  await expect(page.locator('.exercito__ordem')).toBeVisible();

  await page.getByRole('button', { name: 'Cancelar ordem' }).click();

  await expect(page.locator('.exercito__ordem')).toBeHidden();
  await expect(page.locator('.marchas__ordem')).toHaveCount(0);
  await expect(page.locator('.hostes__marca[data-provincia="atenas"]')).toHaveAttribute(
    'data-ordem',
    'nao',
  );
  await expect(page.getByRole('button', { name: 'Mover' })).toBeVisible();
  await page.getByRole('button', { name: 'Passar o turno' }).click();
  expect(
    await page.evaluate(() =>
      (window as unknown as { inspecao: Ganchos }).inspecao.forcaEm('atenas'),
    ),
  ).toBe(1000);
});

test('só parte da hoste marcha, e o resto fica defendendo', async ({ page }) => {
  await comHoste(page, 1000);
  await page.locator('.exercito__valor').evaluate((elemento) => {
    const barra = elemento as HTMLInputElement;
    barra.value = '400';
    barra.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.getByRole('button', { name: 'Mover' }).click();
  await page.locator('.destinos__marca[data-provincia="maratona"]').click();
  await expect(page.locator('.exercito__ordem')).toContainText('400 marcham');

  await page.getByRole('button', { name: 'Passar o turno' }).click();

  expect(
    await page.evaluate(() => ({
      atenas: (window as unknown as { inspecao: Ganchos }).inspecao.forcaEm('atenas'),
      maratona: (window as unknown as { inspecao: Ganchos }).inspecao.forcaEm('maratona'),
    })),
  ).toEqual({ atenas: 600, maratona: 400 });
});

test('clicar fora dos destinos cancela a escolha em vez de reclamar', async ({ page }) => {
  await comHoste(page, 1000);
  await page.getByRole('button', { name: 'Mover' }).click();
  await expect(page.locator('.destinos__marca')).toHaveCount(4);

  await page.mouse.click(1500, 800); // mar aberto

  await expect(page.locator('.destinos__marca')).toHaveCount(0);
  await expect(page.locator('.marchas__previsao')).toHaveCount(0);
  await expect(page.locator('.marchas__origem')).toBeHidden();
  await expect(page.locator('.exercito__ordem')).toBeHidden();
});

/**
 * ⚠️ O botão fica na tela mesmo quando não dá pra marchar, dizendo o motivo. Esconder o
 * controle esconderia a mecânica, e o jogador não teria como descobrir que a marcha só
 * passa por território dele.
 */
test('terra alheia é destino de ataque, mas não caminho para além dela', async ({ page }) => {
  await comHoste(page, 1000);
  await page.evaluate(() => {
    const i = (window as unknown as { inspecao: Ganchos }).inspecao;
    i.conquistar('maratona', 'megara');
    i.conquistar('sounion', 'megara');
  });
  await page.locator('.hostes__marca[data-provincia="atenas"]').click();

  const mover = page.getByRole('button', { name: 'Mover' });
  await expect(mover).toBeEnabled();
  const alcance = await page.evaluate(() =>
    (window as unknown as { inspecao: Ganchos }).inspecao.alcanceDaHoste(
      (window as unknown as { inspecao: Ganchos }).inspecao.hostesEm('atenas')[0]!.id,
    ),
  );
  expect(alcance).toContain('maratona');
  expect(alcance).toContain('sounion');

  await mover.click();
  await expect(page.locator('.destinos__marca[data-provincia="maratona"]')).toHaveCount(1);
  await expect(page.locator('.destinos__marca[data-provincia="sounion"]')).toHaveCount(1);
});

test('a hoste MARCHA de uma província à outra em vez de saltar', async ({ page }) => {
  // Duas coisas de uma vez, e as duas já quebraram:
  //
  // 1. A peça saía de Atenas e aparecia em Maratona no mesmo quadro. A ordem dada na
  //    rodada anterior acontecia sem o jogador ver.
  // 2. Antes disso, o marcador novo era pintado sem `transform` — em (0,0), o canto
  //    superior esquerdo do palco — e só ia pro lugar no quadro seguinte. Na tela lia
  //    como a hoste surgindo lá em cima e descendo.
  //
  // Sair do lugar certo mata as duas: em (2) a peça começaria no canto, em (1) já
  // começaria no destino.
  await comHoste(page, 1500);
  const emAtenas = await page.locator('.hostes__marca[data-provincia="atenas"]').boundingBox();
  if (!emAtenas) throw new Error('a hoste não apareceu em Atenas');

  const partida = await page.evaluate(() => {
    const i = (window as unknown as { inspecao: Ganchos }).inspecao;
    i.ordenarMarcha(i.hostesEm('atenas')[0]!.id, 'maratona', 1500);
    i.passarTurno();
    const marca = document.querySelector<HTMLElement>('.hostes__marca[data-provincia="maratona"]');
    const caixa = marca?.getBoundingClientRect();
    return {
      provincia: marca?.dataset['provincia'] ?? '',
      marchando: marca?.dataset['marchando'] ?? '',
      x: caixa?.x ?? -1,
      y: caixa?.y ?? -1,
    };
  });

  // Nas REGRAS ela já chegou: a chave do marcador é o destino. Na TELA ela ainda está em
  // Atenas, que é o ponto de onde a marcha parte.
  expect(partida.provincia).toBe('maratona');
  expect(partida.marchando).toBe('sim');
  expect(Math.abs(partida.x - emAtenas.x)).toBeLessThan(4);
  expect(Math.abs(partida.y - emAtenas.y)).toBeLessThan(4);

  await page.waitForFunction(
    () =>
      document.querySelector<HTMLElement>('.hostes__marca[data-provincia="maratona"]')?.dataset[
        'marchando'
      ] === 'nao',
    undefined,
    { timeout: 5000 },
  );
  const chegada = await page.locator('.hostes__marca[data-provincia="maratona"]').boundingBox();
  if (!chegada) throw new Error('a hoste sumiu no caminho');
  // Andou de verdade: assentou longe de onde partiu, e não no canto do palco.
  expect(Math.hypot(chegada.x - emAtenas.x, chegada.y - emAtenas.y)).toBeGreaterThan(30);
  expect(chegada.x).toBeGreaterThan(100);
  expect(chegada.y).toBeGreaterThan(100);
});
