import { expect, test } from '@playwright/test';
import { clicarProvincia, fecharBatalhas } from './apoio';

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
  /** Desliga a IA: este arquivo mede a TELA, não o adversário. */
  congelarIA: () => void;
  /** Tira a comida do caminho: este arquivo mede a TELA, não a despensa. */
  saciar: () => void;
  darOuro: (valor: number) => void;
  construir: (idProvincia: string, idConstrucao: string) => void;
  passarTurno: () => void;
  declararGuerra: (contra: string, porPoder?: string) => void;
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
    i.congelarIA();
    i.saciar();
    // O mapa abre EM PAZ: a guarnição eleusina de que este teste fala é plantada por ele.
    i.plantarHoste('eleusis', 'eleusis', 500);
    i.darOuro(60_000);
    // ⚠️ A guerra que a marcha passou a exigir em 29/08: sem ela a pergunta do destino vira
    // "declare antes de marchar" e o botão de assalto nunca aparece. Este teste é da CRÔNICA.
    i.declararGuerra('eleusis');
    i.recrutar('atenas', 2000);
    i.passarTurno();
  });
  await fecharBatalhas(page);

  // Assalto sobre Elêusis, que é cidade aberta: batalha de campo, milícia derrotada e
  // conquista na mesma virada.
  await page.locator('.hostes__marca[data-provincia="atenas"]').click();
  await page.getByRole('button', { name: 'Mover' }).click();
  await clicarProvincia(page, 'eleusis');
  await page.getByRole('button', { name: /Assaltar/ }).click();
  await page.getByRole('button', { name: 'Passar o turno' }).click();

  const cronica = page.locator('.cronica');
  await expect(cronica).toBeVisible();
  await expect(cronica.locator('.cronica__titulo')).toContainText('Rodada');
  // ⚠️ A janela de batalha abre por cima de tudo e é MODAL: o jogador assiste ao que houve
  // antes de voltar ao mapa. E ela vem em FILA — um assalto produz duas batalhas na mesma
  // província (o campo e a muralha), e fechar a primeira abre a segunda.
  await expect(page.locator('.batalha')).toBeVisible();
  for (let i = 0; i < 6 && (await page.locator('.batalha').isVisible()); i++) {
    await page.locator('.batalha__botao', { hasText: 'Deixar correr' }).click();
    await expect(page.locator('.batalha__botao--fim')).toBeVisible({ timeout: 20_000 });
    await page.locator('.batalha__botao--fim').click();
  }
  await expect(page.locator('.batalha')).toBeHidden();

  await expect(cronica).toContainText('Batalha em Elêusis');
  await expect(cronica).toContainText('Atenas venceu');
  await expect(cronica).toContainText('Elêusis passou de Elêusis para Atenas');
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
    i.congelarIA();
    i.saciar();
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
    // ⚠️ A guerra que a marcha passou a exigir. Este teste é de INTERFACE — o que ele guarda é
    // o painel, o marcador e a ordem —, e a diplomacia tem os testes dela em
    // `testes/diplomacia.test.ts`. Sem esta linha, a ordem seria recusada e o teste morreria
    // falando de outra coisa.
    i.declararGuerra('eleusis');
    i.ordenarMarcha(deles.id, 'atenas', 500, 'eleusis', 'sitiar');
    i.passarTurno();
  });
  await fecharBatalhas(page);

  const minha = page.locator('.hostes__marca[data-provincia="atenas"][data-minha="sim"]');
  await expect(minha).toHaveAttribute('data-marchando', 'nao');
  await minha.click();
  await page.getByRole('button', { name: /Surtida contra Elêusis/ }).click();
  await page.getByRole('button', { name: 'Passar o turno' }).click();

  // 300 contra 500: o jogador perde a hoste inteira. A peça some do mapa — e agora a
  // crônica diz por quê, que é a coisa que faltava.
  const cronica = page.locator('.cronica');
  await expect(cronica).toContainText('Batalha em Atenas');
  await expect(cronica).toContainText('Elêusis venceu Atenas');
  await expect(cronica.locator('.cronica__linha[data-tom="perda"]').first()).toBeVisible();
  expect(erros).toEqual([]);
});

/**
 * A HIERARQUIA da crônica: o que aconteceu comigo em cima, o mundo lá fora embaixo.
 *
 * ⚠️ **Nasceu de uma queixa exata**: *"a crônica mistura muita coisa pouco relevante com o
 * que é importante"*, e a referência dada foi o Total War — *"quando dois reinos entram em
 * guerra, eu recebo a informação e imediatamente entendo o que aconteceu"*. Antes, toda linha
 * era o mesmo `<li>` na ordem em que a resolução calculou, e uma briga entre dois vizinhos
 * distantes tinha o peso — e a moldura vermelha — de uma província PERDIDA por ele.
 *
 * O que este teste guarda são as duas metades da correção: **nada some** (a notícia alheia
 * continua escrita, um degrau abaixo) e **nada alheio é pintado como perda minha**.
 */
test('a crônica separa o que é meu do que é do mundo, e não pinta briga alheia de perda', async ({
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

  await page.evaluate(() => {
    const i = (window as unknown as { inspecao: Ganchos }).inspecao;
    i.congelarIA();
    i.saciar();
    // Uma guerra minha e uma guerra de terceiros na MESMA rodada: é o par que a hierarquia
    // precisa separar, e sem os dois lados não há separação para medir.
    i.declararGuerra('eleusis');
    i.declararGuerra('megara', 'corinto');
    i.plantarHoste('atenas', 'atenas', 3000);
    const meu = i.hostesEm('atenas').find((h) => h.poder === 'atenas');
    if (!meu) throw new Error('a hoste plantada devia estar em Atenas');
    i.ordenarMarcha(meu.id, 'eleusis', 3000, 'atenas', 'sitiar');
    i.plantarHoste('corinto', 'corinto', 2000);
    const dele = i.hostesEm('corinto').find((h) => h.poder === 'corinto');
    if (!dele) throw new Error('a hoste plantada devia estar em Corinto');
    i.ordenarMarcha(dele.id, 'megara', 2000, 'corinto', 'sitiar');
    i.passarTurno();
  });
  await fecharBatalhas(page);

  const cronica = page.locator('.cronica');
  await expect(cronica).toBeVisible();

  // O meu, em cima e no tamanho de leitura.
  const meus = cronica.locator('.cronica__linha[data-peso="grave"]');
  await expect(meus.filter({ hasText: 'Você declarou guerra a Elêusis' })).toHaveCount(1);
  await expect(meus.filter({ hasText: 'Atenas sitia Elêusis' })).toHaveCount(1);

  // O alheio CONTINUA ESCRITO — só que abaixo do corte, e um degrau menor. Se um dia alguém
  // resolver "limpar" a crônica jogando isto fora, é aqui que o teste reclama.
  const doMundo = cronica.locator('.cronica__linha[data-peso="normal"]');
  await expect(doMundo.filter({ hasText: 'Corinto declarou guerra a Mégara' })).toHaveCount(1);
  await expect(doMundo.filter({ hasText: 'Corinto sitia Mégara' })).toHaveCount(1);
  await expect(cronica.locator('.cronica__divisor')).toHaveText('no resto do mundo');

  // ⚠️ **E o cerco alheio é NEUTRO.** Era `perda` — a fórmula antiga pintava de vermelho tudo
  // que não fosse meu ganho —, e é essa mentira que enchia a crônica de alarme falso.
  await expect(
    cronica.locator('.cronica__linha[data-tom="neutro"]').filter({ hasText: 'Corinto sitia Mégara' }),
  ).toHaveCount(1);
  expect(erros).toEqual([]);
});
