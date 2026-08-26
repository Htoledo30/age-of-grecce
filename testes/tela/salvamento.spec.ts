import { expect, test } from '@playwright/test';
import { fecharBatalhas } from './apoio';

/**
 * O salvamento visto pelo jogador: fechar o jogo no meio da partida e voltar exatamente
 * onde estava — sem botão de salvar, porque toda mudança já foi pro disco na hora.
 *
 * O teste recarrega a página como quem fechou a janela: o menu tem que oferecer
 * "Continuar campanha" com a descrição do ponto salvo, e retomar tem que devolver a MESMA
 * campanha — turno, tesouro e tropa conferidos contra as regras, não contra texto.
 */

interface Ganchos {
  campanha: () => {
    jogador: string | null;
    ano: number;
    turno: number;
    tesouro: number;
    renda: number;
    provincias: number;
    poderesVivos: number;
  };
  darOuro: (valor: number) => void;
  recrutar: (idProvincia: string, homens: number) => void;
  passarTurno: () => void;
  forcaEm: (idProvincia: string) => number;
}

test('recarregar a página oferece continuar, e retomar devolve a mesma campanha', async ({
  page,
}) => {
  const erros: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(m.text());
  });

  await page.goto('/');
  await page.waitForSelector('body[data-pronto="sim"]');
  // Sem salvamento, o menu é o de sempre: nada de continuar, nada de aviso.
  await expect(page.getByRole('button', { name: 'Continuar campanha' })).toBeHidden();
  await page.getByRole('button', { name: 'Iniciar jogo' }).click();
  await page.waitForTimeout(600);
  await page.mouse.click(960, 540);
  await page.getByRole('button', { name: 'Começar campanha' }).click();
  await page.waitForSelector('.barra-turno');

  // Uma partida com marca própria: ouro fora do padrão, tropa em pé, dois turnos.
  const antes = await page.evaluate(() => {
    const i = (window as unknown as { inspecao: Ganchos }).inspecao;
    i.darOuro(12_345);
    i.recrutar('atenas', 700);
    i.passarTurno();
    i.passarTurno();
    return { ...i.campanha(), forca: i.forcaEm('atenas') };
  });
  await fecharBatalhas(page);
  expect(antes.turno).toBe(3);
  expect(antes.forca).toBe(700);

  // "Fecha o jogo": recarrega a página do zero.
  await page.reload();
  await page.waitForSelector('body[data-pronto="sim"]');

  const continuar = page.getByRole('button', { name: 'Continuar campanha' });
  await expect(continuar).toBeVisible();
  await expect(page.locator('.inicio-jogo__continuacao')).toContainText(`turno ${antes.turno}`);
  // Iniciar virou recomeço, e o custo está escrito.
  await expect(page.getByRole('button', { name: 'Nova campanha' })).toBeVisible();
  await expect(page.locator('.inicio-jogo__nota')).toContainText('apaga o salvamento');

  await continuar.click();
  await page.waitForSelector('.barra-turno');

  const depois = await page.evaluate(() => {
    const i = (window as unknown as { inspecao: Ganchos }).inspecao;
    return { ...i.campanha(), forca: i.forcaEm('atenas') };
  });
  expect(depois).toEqual(antes);

  // E a partida continua viva: o turno seguinte funciona como qualquer outro.
  await page.getByRole('button', { name: 'Passar o turno' }).click();
  const seguinte = await page.evaluate(
    () => (window as unknown as { inspecao: Ganchos }).inspecao.campanha().turno,
  );
  expect(seguinte).toBe(antes.turno + 1);
  expect(erros).toEqual([]);
});
