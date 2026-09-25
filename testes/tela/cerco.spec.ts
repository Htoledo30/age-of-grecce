import { expect, test } from '@playwright/test';
import { clicarProvincia, fecharBatalhas } from './apoio';

/**
 * O cerco visto de fora: escolher a postura, ver a cidade resistir, trocar de ideia.
 *
 * O que este teste guarda é o estado INTERMEDIÁRIO — o que não existia antes do cerco.
 * Entrar em terra alheia deixou de ser o mesmo que ficar com ela.
 */

interface Ganchos {
  /** Desliga a IA: este arquivo mede a TELA, não o adversário. */
  congelarIA: () => void;
  /** Tira a comida do caminho: ver a nota acima de `test`. */
  saciar: () => void;
  populacaoDe: (idProvincia: string) => number;
  crescimentoDe: (idProvincia: string) => number;
  disponivelParaLevaEm: (idProvincia: string) => number;
  economiaDe: (idProvincia: string) => {
    impostos: number;
    producao: number;
    transito: number;
    total: number;
  } | null;
  campanha: () => { tesouro: number; renda: number };
  darOuro: (valor: number) => void;
  construir: (idProvincia: string, idConstrucao: string) => void;
  passarTurno: () => void;
  declararGuerra: (contra: string, porPoder?: string) => void;
  recrutar: (idProvincia: string, homens: number) => void;
  donoDe: (idProvincia: string) => string;
  forcaEm: (idProvincia: string, idPoder?: string) => number;
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

/**
 * ⚠️ **`saciar()` antes de plantar tropa, e a razão é de 31/08/2026.** Com
 * `subsistenciaPorReino` em 1, Atenas abre com saldo alimentar ZERO e não sustenta um soldado
 * antes de erguer comida: 900 homens plantados viravam 855 na tela — 5%, uma virada de fome —
 * e este arquivo passava a medir despensa em vez do que ele veio medir. É o mesmo andaime que
 * `ajustesFartos` é para os testes de unidade. Quem TESTA comida não chama.
 */
test('sitiar Elêusis: a cidade resiste, a renda dela cai e a postura troca', async ({ page }) => {
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
    i.darOuro(60_000);
    // ⚠️ **NADA de esperar obra ficar pronta aqui, e a razão é o jogo estar mais duro.** Este
    // bloco erguia um Quartel e virava QUATRO turnos antes de recrutar. Medido: com o jogador
    // parado, Atenas cai na virada 3 ou 4 — para Tanagra no balanço de ontem, para Mégara no
    // de hoje — e o teste morria em "esta província não é sua", que não diz nada sobre cerco.
    // `correrIA` já avisa com todas as letras: jogador imóvel PERDE a capital, e isso é o jogo
    // funcionando. Este arquivo veio falar de cerco, não de invasão, e o Quartel nunca fez
    // falta: nenhuma afirmação daqui é sobre arma ou treino.
    i.plantarHoste('eleusis', 'eleusis', 500);
    // ⚠️ A guerra que a marcha passou a exigir em 29/08. Este arquivo é de INTERFACE — o que
    // ele guarda é o painel, o marcador e a ordem —, e sem esta linha a pergunta do destino
    // vira "declare antes de marchar", que não é sobre cerco.
    i.declararGuerra('eleusis');
    i.recrutar('atenas', 700);
    i.passarTurno(); // a leva leva uma rodada para virar hoste
  });
  await fecharBatalhas(page);

  await page.locator('.hostes__marca[data-provincia="atenas"]').click();
  await page.getByRole('button', { name: 'Mover' }).click();

  // ⚠️ A pergunta só existe DEPOIS de o alvo hostil ser apontado. Antes disso não há
  // sobre o que decidir — e num destino do próprio território não há decisão nenhuma.
  await expect(page.locator('.exercito__pergunta')).toBeHidden();
  await expect(page.locator('.exercito__botao--postura').first()).toBeHidden();

  await clicarProvincia(page, 'eleusis');
  await expect(page.locator('.exercito__pergunta')).toContainText(
    'Elêusis: o que fazer ao chegar?',
  );
  await expect(page.locator('.exercito__botao--postura')).toHaveCount(2);

  // Sitiar: nada se move no clique, e a ordem fica registrada como qualquer outra.
  await page.getByRole('button', { name: /Sitiar/ }).click();
  await expect(page.locator('.exercito__ordem')).toBeVisible();
  await page.getByRole('button', { name: 'Passar o turno' }).click();

  // Elêusis abre a partida com 500 homens e eles CONTINUAM DE PÉ: sitiar não engaja o
  // exército de dentro. A cidade também continua de pé — antes do cerco, a província
  // teria trocado de dono aqui.
  expect(
    await page.evaluate(() => {
      const i = (window as unknown as { inspecao: Ganchos }).inspecao;
    i.congelarIA();
    i.saciar();
      return { dono: i.donoDe('eleusis'), forca: i.forcaEm('eleusis') };
    }),
  ).toMatchObject({ dono: 'eleusis' });

  // Fogo é sempre fogo: a bandeira não herda a cor territorial de quem está sitiando.
  await expect(page.locator('.cercos__marca[data-provincia="eleusis"] .cercos__chama')).toHaveCSS(
    'color',
    'rgb(239, 125, 34)',
  );

  // ⚠️ **Há DUAS peças em Elêusis** — a guarnição eleusina e o acampamento ateniense — e
  // por isso o marcador não pode mais ser endereçado só pela província. Aqui interessa
  // abrir a ficha da CIDADE, então o clique vai na peça de quem mora nela.
  await page.locator('.hostes__marca[data-provincia="eleusis"][data-minha="nao"]').click();
  // O sítio é a primeira linha de alarme do painel, acima das medidas.
  await expect(page.locator('.ficha__aviso[data-tom="perigo"]')).toContainText(
    'Sitiada por Atenas',
  );

  // A cidade sitiada perde produção e comércio e mantém só o imposto.
  const sitiada = await page.evaluate(() => {
    const i = (window as unknown as { inspecao: Ganchos }).inspecao;
    i.congelarIA();
    i.saciar();
    return i.economiaDe('eleusis');
  });
  expect(sitiada?.producao).toBe(0);
  expect(sitiada?.transito).toBe(0);
  expect(sitiada?.impostos).toBeGreaterThan(0);
  await expect(page.locator('.ficha__medida[data-medida="saldo"]')).toHaveText(
    /saldo[−+][\d.]+por turno/,
  );
  expect(erros).toEqual([]);
});

/**
 * Dois exércitos inimigos na mesma província, e o jogador comandando o SEU.
 *
 * Este teste esteve pendente enquanto a interface endereçava hoste por província: em
 * Elêusis o primeiro id é o da guarnição eleusina, então clicar no marcador selecionava o
 * exército do inimigo e o painel do sitiante nunca aparecia — o jogador conseguia mandar
 * sitiar, mas não conseguia mandar assaltar depois. Com o marcador por hoste, cada peça
 * responde por si.
 *
 * ⚠️ É o caso que a **surtida** vai precisar: escolher entre duas hostes no mesmo lugar.
 */
test('com duas hostes na mesma província, cada marcador comanda a sua', async ({ page }) => {
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

  // Elêusis mantém a guarnição de pé de propósito: é ela que faz a segunda peça existir.
  await page.evaluate(() => {
    const i = (window as unknown as { inspecao: Ganchos }).inspecao;
    i.congelarIA();
    i.saciar();
    i.darOuro(60_000);
    // ⚠️ **NADA de esperar obra ficar pronta aqui, e a razão é o jogo estar mais duro.** Este
    // bloco erguia um Quartel e virava QUATRO turnos antes de recrutar. Medido: com o jogador
    // parado, Atenas cai na virada 3 ou 4 — para Tanagra no balanço de ontem, para Mégara no
    // de hoje — e o teste morria em "esta província não é sua", que não diz nada sobre cerco.
    // `correrIA` já avisa com todas as letras: jogador imóvel PERDE a capital, e isso é o jogo
    // funcionando. Este arquivo veio falar de cerco, não de invasão, e o Quartel nunca fez
    // falta: nenhuma afirmação daqui é sobre arma ou treino.
    i.plantarHoste('eleusis', 'eleusis', 500);
    i.declararGuerra('eleusis');
    i.recrutar('atenas', 900);
    i.passarTurno();
  });
  await fecharBatalhas(page);

  await page.locator('.hostes__marca[data-provincia="atenas"]').click();
  await page.getByRole('button', { name: 'Mover' }).click();
  await clicarProvincia(page, 'eleusis');
  await page.getByRole('button', { name: /Sitiar/ }).click();
  await page.getByRole('button', { name: 'Passar o turno' }).click();

  // Duas peças no mesmo lugar, e são de poderes diferentes.
  const emElêusis = page.locator('.hostes__marca[data-provincia="eleusis"]');
  await expect(emElêusis).toHaveCount(2);

  // A do defensor abre a ficha do exército DELE: é do inimigo, então não aceita comando.
  await page.locator('.hostes__marca[data-provincia="eleusis"][data-minha="nao"]').click();
  await expect(page.locator('.exercito__nome-do-poder')).toHaveText('Elêusis');
  await expect(page.getByRole('button', { name: 'Passar ao assalto' })).toBeHidden();

  // A do sitiante abre a ficha da hoste ateniense, com o comando do cerco em pé. Antes,
  // este era o painel inalcançável.
  await page.locator('.hostes__marca[data-provincia="eleusis"][data-sitiando="sim"]').click();
  await expect(page.locator('.exercito__nome-do-poder')).toHaveText('Atenas');
  await expect(page.locator('.exercito__cerco')).toContainText('Acampado diante de Elêusis');
  await page.getByRole('button', { name: 'Passar ao assalto' }).click();
  await page.getByRole('button', { name: 'Passar o turno' }).click();

  // A cidade cai: o assalto que o jogador não conseguia mandar agora sai pelo marcador.
  expect(
    await page.evaluate(() => {
      const i = (window as unknown as { inspecao: Ganchos }).inspecao;
    i.congelarIA();
    i.saciar();
      return i.donoDe('eleusis');
    }),
  ).toBe('atenas');
  expect(erros).toEqual([]);
});

/**
 * A SURTIDA vista de dentro: o jogador sitiado sai para lutar.
 *
 * ⚠️ Aqui quem está cercado é ATENAS, e é isso que o teste guarda. Sitiar não engaja,
 * então sem a surtida o exército do jogador ficaria olhando o
 * inimigo acampado na própria cidade, turno após turno, sem nada poder fazer.
 */
test('sitiado em casa, o jogador sai para atacar quem o cerca', async ({ page }) => {
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
    i.darOuro(60_000);
    // ⚠️ **NADA de esperar obra ficar pronta aqui, e a razão é o jogo estar mais duro.** Este
    // bloco erguia um Quartel e virava QUATRO turnos antes de recrutar. Medido: com o jogador
    // parado, Atenas cai na virada 3 ou 4 — para Tanagra no balanço de ontem, para Mégara no
    // de hoje — e o teste morria em "esta província não é sua", que não diz nada sobre cerco.
    // `correrIA` já avisa com todas as letras: jogador imóvel PERDE a capital, e isso é o jogo
    // funcionando. Este arquivo veio falar de cerco, não de invasão, e o Quartel nunca fez
    // falta: nenhuma afirmação daqui é sobre arma ou treino.
    i.plantarHoste('eleusis', 'eleusis', 500);
    // ⚠️ A guerra que a marcha passou a exigir em 29/08. Este arquivo é de INTERFACE — o que
    // ele guarda é o painel, o marcador e a ordem —, e sem esta linha a pergunta do destino
    // vira "declare antes de marchar", que não é sobre cerco.
    i.declararGuerra('eleusis');
    i.recrutar('atenas', 700);
    i.passarTurno(); // a leva vira hoste

    // Elêusis marcha sobre Atenas e SENTA: é o inimigo quem escolhe não lutar.
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

  // A marcha é animada, e peça em movimento não aceita clique.
  const minha = page.locator('.hostes__marca[data-provincia="atenas"][data-minha="sim"]');
  await expect(minha).toHaveAttribute('data-marchando', 'nao');
  await expect(page.locator('.cercos__marca[data-provincia="atenas"]')).toHaveCount(1);

  await minha.click();
  const surtida = page.getByRole('button', { name: /Surtida contra Elêusis/ });
  await expect(surtida).toBeVisible();
  await surtida.click();

  // Nada se move no clique: a surtida é ordem como qualquer outra.
  await expect(page.locator('.exercito__ordem')).toContainText('sai para atacar Elêusis');
  expect(
    await page.evaluate(() => {
      const i = (window as unknown as { inspecao: Ganchos }).inspecao;
    i.congelarIA();
    i.saciar();
      return i.forcaEm('atenas', 'atenas');
    }),
  ).toBe(700);

  // A surtida é desfeita pelo MESMO botão que desfaz uma marcha: para o jogador, as duas
  // são "o que esta hoste vai fazer nesta rodada".
  await page.getByRole('button', { name: 'Cancelar ordem' }).click();
  await expect(page.locator('.exercito__ordem')).toBeHidden();
  await expect(surtida).toBeVisible();
  await surtida.click();

  await page.getByRole('button', { name: 'Passar o turno' }).click();

  // A despensa de Atenas ainda aguenta (mantimentos = base + grão da terra): ninguém
  // passou fome antes da surtida, e √(700² − 500²) = 490. A cidade se solta: sem
  // sitiante em cima, não há cerco.
  expect(
    await page.evaluate(() => {
      const i = (window as unknown as { inspecao: Ganchos }).inspecao;
    i.congelarIA();
    i.saciar();
      return { meus: i.forcaEm('atenas', 'atenas'), deles: i.forcaEm('atenas', 'eleusis') };
    }),
    // ⚠️ Era `{ meus: 490 }`, um número da lei quadrada cravado aqui. Ela morreu: o que
    // sobra sai de choque, quebra e perseguição, e é balanço. O que este teste guarda é que a
    // surtida venceu — o sitiante sumiu e o defensor continua de pé.
  ).toMatchObject({ deles: 0 });
  expect(
    await page.evaluate(() =>
      (window as unknown as { inspecao: Ganchos }).inspecao.forcaEm('atenas', 'atenas'),
    ),
  ).toBeGreaterThan(0);
  await expect(page.locator('.cercos__marca[data-provincia="atenas"]')).toHaveCount(0);
  expect(erros).toEqual([]);
});
