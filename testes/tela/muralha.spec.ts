import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { clicarProvincia, fecharBatalhas } from './apoio';

/**
 * A muralha vista pelo jogador: a cidade que dá para assaltar hoje e a que faz esperar.
 *
 * ⚠️ Arquivo próprio, e não mais um teste no do cerco, porque o que ele guarda é outra
 * coisa: o cerco é o estado intermediário; aqui a pergunta é **quando** o assalto pode
 * acontecer. A região de teste tem um alvo de cada tipo — Tanagra murada, Elêusis aberta —
 * e é essa diferença que o teste percorre de ponta a ponta.
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
}

/** Campanha de Atenas com Quartel, ouro e 2.000 homens em pé prontos para marchar. */
async function comExercito(page: Page): Promise<void> {
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
    i.construir('atenas', 'quartel');
    for (let n = 0; n < 4; n++) i.passarTurno();
    i.recrutar('atenas', 2000);
    i.passarTurno(); // a leva vira hoste
    // ⚠️ A guerra que a marcha passou a exigir, declarada contra o mapa simulado inteiro. Este
    // teste é de INTERFACE — o que ele guarda é o painel, o marcador e a ordem —, e a
    // diplomacia tem os testes dela em `testes/diplomacia.test.ts`. Sem esta linha, a ordem
    // seria recusada e o teste morreria falando de outra coisa.
    for (const vizinho of ['eleusis', 'megara', 'tanagra', 'tebas', 'plateia']) {
      i.declararGuerra(vizinho);
    }
  });
  await fecharBatalhas(page);
}

test('contra a cidade murada o assalto não é escolha do dia; contra a aberta é', async ({
  page,
}) => {
  const erros: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(m.text());
  });

  await comExercito(page);
  await page.locator('.hostes__marca[data-provincia="atenas"]').click();
  await page.getByRole('button', { name: 'Mover' }).click();

  // Tanagra tem Muralha desde 700 a.C.: o botão de assaltar continua na tela, mas
  // desabilitado, e a pergunta em cima diz por quê. Sumir com ele faria a diferença entre
  // as duas cidades parecer defeito da interface.
  await clicarProvincia(page, 'tanagra');
  await expect(page.locator('.exercito__pergunta')).toContainText(
    'Tanagra é murada: exige 2 rodadas de cerco antes de um assalto',
  );
  await expect(page.getByRole('button', { name: /Assaltar/ })).toBeDisabled();

  // Elêusis é aberta: a mesma hoste, o mesmo turno, e a escolha existe.
  await clicarProvincia(page, 'eleusis');
  await expect(page.locator('.exercito__pergunta')).toContainText(
    'Elêusis: o que fazer ao chegar?',
  );
  await expect(page.getByRole('button', { name: /Assaltar/ })).toBeEnabled();

  // ⚠️ **A ordem de batalha nomeia o PRÊMIO, nunca a derrota.** Ela já se chamou "Recuar se
  // virar" e ninguém escolheria isso — decisão de Henrique. As duas ordens atacam; o que
  // muda é o que se leva quando dá errado, o chão ou o exército.
  const ordem = page.locator('.exercito__botao--recuo');
  await expect(ordem).toHaveText(/Lutar até o fim/);
  await ordem.click();
  await expect(ordem).toHaveText(/Poupar o exército/);
  await expect(ordem).not.toHaveText(/[Rr]ecuar/);

  expect(erros).toEqual([]);
});

test('sentado duas rodadas diante da muralha, o assalto libera e a cidade cai', async ({
  page,
}) => {
  const erros: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(m.text());
  });

  await comExercito(page);
  await page.locator('.hostes__marca[data-provincia="atenas"]').click();
  await page.getByRole('button', { name: 'Mover' }).click();
  await clicarProvincia(page, 'tanagra');
  await page.getByRole('button', { name: /Sitiar/ }).click();
  await page.getByRole('button', { name: 'Passar o turno' }).click();

  // A peça do sitiante, e não a da guarnição tanagrea: as duas estão na mesma província.
  const acampado = page.locator('.hostes__marca[data-provincia="tanagra"][data-sitiando="sim"]');
  await expect(acampado).toHaveAttribute('data-marchando', 'nao');
  await acampado.click();

  // A rodada da chegada conta zero: faltam as duas inteiras.
  const trocar = page.getByRole('button', { name: /Passar ao assalto/ });
  await expect(trocar).toBeDisabled();
  await expect(trocar).toContainText('faltam 2');

  await page.getByRole('button', { name: 'Passar o turno' }).click();
  await acampado.click();
  await expect(trocar).toContainText('faltam 1');

  await page.getByRole('button', { name: 'Passar o turno' }).click();
  await acampado.click();
  await expect(trocar).toBeEnabled();
  await expect(trocar).toHaveText(/^\s*Passar ao assalto\s*$/);

  await trocar.click();
  await page.getByRole('button', { name: 'Passar o turno' }).click();

  expect(
    await page.evaluate(() => {
      const i = (window as unknown as { inspecao: Ganchos }).inspecao;
    i.congelarIA();
    i.saciar();
      return i.donoDe('tanagra');
    }),
  ).toBe('atenas');
  expect(erros).toEqual([]);
});
