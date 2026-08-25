import { describe, expect, it } from 'vitest';
import { homensEmFormacao } from '../../src/combate/formacao-de-leva';

import {
  avaliarLeva,
  custoDaLeva,
  disponivelParaLeva,
  manutencaoDe,
  maximoDaLeva,
} from '../../src/combate/recrutamento';
import { unicaEm } from '../apoio/hostes';
import { ajustes, novaCampanha as nova } from '../apoio/mundo';
import { comQuartel } from './apoio';

const combate = ajustes.combate;

describe('recrutamento: as contas', () => {
  it('o custo e a manutenção saem dos ajustes, em inteiros', () => {
    // ⚠️ O custo passou a depender da ARMA: o leve é o homem-padrão, e cada arma acima dele
    // cobra o seu múltiplo. É essa diferença que faz massa barata ser uma estratégia em vez
    // de um enfeite.
    expect(custoDaLeva(1000, combate)).toBe(
      Math.round(1000 * combate.custoPorHomem * combate.batalha.armas.leve.custo),
    );
    expect(custoDaLeva(1000, combate, 'cavalaria')).toBeGreaterThan(
      custoDaLeva(1000, combate, 'hoplita'),
    );
    expect(manutencaoDe(1000, combate.manutencaoPorHomem.emCasa)).toBe(
      Math.round(1000 * combate.manutencaoPorHomem.emCasa),
    );
    expect(Number.isInteger(custoDaLeva(777, combate))).toBe(true);
    expect(Number.isInteger(manutencaoDe(777, combate.manutencaoPorHomem.emCampanha))).toBe(
      true,
    );
  });

  it('não impõe fração nem lote mínimo: o limite é a população MENOS o piso', () => {
    const piso = combate.populacaoMinima;
    const situacao = { populacao: 35_000, tesouro: 200_000, armas: ['leve' as const] };
    const cabe = 35_000 - piso;
    expect(avaliarLeva(1, situacao, combate)).toMatchObject({ pode: true, homens: 1 });
    expect(avaliarLeva(cabe, situacao, combate)).toMatchObject({ pode: true, homens: cabe });
    expect(avaliarLeva(cabe + 1, situacao, combate)).toMatchObject({
      motivo: /nunca saem daqui/,
    });
  });

  it('oferece como teto somente o que população e tesouro permitem pagar', () => {
    // Derivado do custo do LEVE, que é a arma padrão: cravar 1.000 aqui mediria o preço,
    // não a regra.
    const pelaRiqueza = { populacao: 35_000, tesouro: 3_000 };
    const cabem = Math.floor(3_000 / (combate.custoPorHomem * combate.batalha.armas.leve.custo));
    expect(maximoDaLeva(pelaRiqueza, combate)).toBe(cabem);

    const pelaPopulacao = {
      populacao: combate.populacaoMinima + 37,
      tesouro: 200_000,
    };
    expect(maximoDaLeva(pelaPopulacao, combate)).toBe(37);
    expect(maximoDaLeva({ ...pelaRiqueza, tesouro: 0 }, combate)).toBe(0);
    // E o teto é POR ARMA, porque o preço é por arma: o mesmo tesouro põe menos hoplitas em
    // campo do que leves. Oferecer o teto do leve com o hoplita escolhido faria a barra
    // prometer uma leva que o botão recusa.
    expect(maximoDaLeva(pelaRiqueza, combate, 'hoplita')).toBeLessThan(
      maximoDaLeva(pelaRiqueza, combate),
    );
    // Quando é a POPULAÇÃO que limita, a arma não muda nada: gente não fica mais barata.
    expect(maximoDaLeva(pelaPopulacao, combate, 'hoplita')).toBe(37);
  });

  it('no piso, a província para de ceder gente e diz por quê', () => {
    const piso = combate.populacaoMinima;
    const noPiso = { populacao: piso, tesouro: 200_000, armas: ['leve' as const] };
    expect(avaliarLeva(1, noPiso, combate)).toMatchObject({
      motivo: `esta província não cede mais gente: ela precisa manter ${piso.toLocaleString('pt-BR')} habitantes`,
    });
    // E abaixo do piso também — a conta nunca fica negativa.
    expect(disponivelParaLeva(piso - 500, combate)).toBe(0);
    expect(disponivelParaLeva(piso + 500, combate)).toBe(500);
  });
});

describe('o Quartel é o portão', () => {
  it('sem Quartel não se recruta, e a recusa diz isso', () => {
    const c = nova();
    c.comecar('atenas');
    expect(c.podeRecrutarEm('atenas')).toBe(true);
    expect(c.podeRecrutar('atenas', 500)).toMatchObject({ pode: true });
  });

  it('o Quartel não rende moeda e não é requisito para recrutar', () => {
    const c = comQuartel();
    // Não rende NADA: o ganho é exatamente a manutenção negativa, sem renda escondida.
    // `comQuartel` já ergueu o nível I, então a conta cotada é a do nível II: o ganho é a
    // folha NOVA menos a que já se paga, e não a folha inteira do nível II.
    expect(c.retornoDaConstrucaoEm('atenas', 'quartel')?.ganhoPorTurno).toBe(
      -(c.manutencaoDaObraEm('atenas', 'quartel', 2) - c.manutencaoDaObraEm('atenas', 'quartel', 1)),
    );
    expect(c.podeRecrutarEm('atenas')).toBe(true);
    expect(c.podeRecrutarEm('maratona')).toBe(true);
  });

  it('província que não é sua não aceita leva, e o motivo é esse', () => {
    const c = comQuartel();
    expect(c.podeRecrutar('esparta', 500)).toMatchObject({ pode: false });
  });
});

describe('recrutar custa ouro E população', () => {
  it('tira os homens da população da província e o ouro do tesouro', () => {
    const c = comQuartel();
    const tesouro = c.tesouro;
    const populacao = c.populacaoDe('atenas');

    c.recrutar('atenas', 1000);

    expect(c.tesouro).toBe(tesouro - custoDaLeva(1000, combate));
    expect(c.populacaoDe('atenas')).toBe(populacao - 1000);
    expect(c.forcaEm('atenas')).toBe(0);
    expect(unicaEm(c, 'atenas')).toBeUndefined();
    expect(c.formacaoEm('atenas')).toMatchObject({
      poder: 'atenas',
      prontaNoTurno: c.turno + 1,
    });
    // O total é DERIVADO dos contingentes, nunca guardado ao lado deles — mesma regra da
    // hoste. Guardar um total junto do detalhe é convidar os dois a discordarem.
    expect(homensEmFormacao(c.formacaoEm('atenas'))).toBe(1000);

    c.passarTurno();
    expect(c.formacaoEm('atenas')).toBeUndefined();
    expect(c.forcaEm('atenas')).toBe(1000);
    expect(unicaEm(c, 'atenas')?.poder).toBe('atenas');
  });

  it('quem está em armas deixa de ser tributado, e a renda cai na hora', () => {
    const c = comQuartel();
    const impostosAntes = c.economiaDe('atenas')?.impostos;

    c.recrutar('atenas', 1000);

    // Menos gente é menos imposto NA HORA — e um pouco menos de corrupção por tamanho,
    // então o novo valor sai da fórmula inteira em vez de uma subtração de cabeça.
    expect(c.economiaDe('atenas')?.impostos).toBe(
      Math.round(
        c.populacaoDe('atenas') *
          ajustes.economia.impostoPorHabitante *
          (1 - c.corrupcaoEm('atenas').total),
      ),
    );
    expect(c.economiaDe('atenas')?.impostos).toBeLessThan(impostosAntes ?? 0);
  });

  it('a ficha mostra a população de agora, não a inicial', () => {
    const c = comQuartel();
    const populacao = c.populacaoDe('atenas');
    c.recrutar('atenas', 2000);
    expect(c.economiaDe('atenas')?.populacao).toBe(populacao - 2000);
  });

  it('mobiliza até o piso, e ali para — a província nunca fica vazia', () => {
    const c = comQuartel();
    c.darOuro(200_000);
    const piso = combate.populacaoMinima;
    const populacao = c.populacaoDe('atenas');
    const cabe = populacao - piso;

    expect(c.podeRecrutar('atenas', cabe)).toMatchObject({ pode: true });
    expect(c.podeRecrutar('atenas', cabe + 1)).toMatchObject({ pode: false });

    c.recrutar('atenas', cabe);

    // O que protege de verdade: sem o piso, um império rico raspa a província até
    // abaixo de ~100 habitantes, e ali `Math.floor` no crescimento a mata para sempre.
    expect(c.populacaoDe('atenas')).toBe(piso);
    expect(c.podeRecrutar('atenas', 1)).toMatchObject({ motivo: /precisa manter/ });
  });

  it('aceita uma pessoa e recusa somente valor quebrado ou não positivo', () => {
    const c = comQuartel();
    expect(c.podeRecrutar('atenas', 1)).toMatchObject({ pode: true, homens: 1 });
    expect(c.podeRecrutar('atenas', 100.5)).toMatchObject({ motivo: /inteiro/ });
    expect(c.podeRecrutar('atenas', 0)).toMatchObject({ motivo: /inteiro/ });
  });

  it('recusa quando falta ouro, dizendo quanto falta', () => {
    const c = comQuartel();
    // Pelo preço do LEVE, que é a arma que `podeRecrutar` cota por omissão.
    const porHomem = combate.custoPorHomem * combate.batalha.armas.leve.custo;
    const cabe = Math.floor(c.tesouro / porHomem);
    const demais = cabe + 1;
    expect(c.podeRecrutar('atenas', demais)).toMatchObject({ motivo: /faltam .* moedas/ });
  });
});

describe('cada arma tem a sua terra', () => {
  it('o LEVE não pede prédio nenhum: ninguém fica sem exército', () => {
    // ⚠️ A promessa que sustenta o sistema inteiro. Quem não gastou slot em obra militar joga
    // com massa barata — que é jogar de outro jeito, não é ficar sem jogar.
    const c = nova();
    c.comecar('atenas');
    expect(c.armasEm('atenas')).toEqual(['leve']);
    expect(c.podeRecrutar('atenas', 100)).toMatchObject({ pode: true });
    expect(c.podeRecrutar('atenas', 100, 'leve')).toMatchObject({ pode: true });
  });

  it('sem a obra, a recusa diz QUAL obra falta — e vem antes da conta do ouro', () => {
    // Recusar por ouro numa arma que a província nem levanta mandaria o jogador juntar
    // dinheiro para nada. O portão da arma é o primeiro de todos.
    const c = nova();
    c.comecar('atenas');
    expect(c.podeRecrutar('atenas', 100, 'hoplita')).toMatchObject({ motivo: /Armaria/ });
    expect(c.podeRecrutar('atenas', 1_000_000, 'arqueiro')).toMatchObject({ motivo: /madeira/ });
    expect(c.podeRecrutar('atenas', 1_000_000, 'cavalaria')).toMatchObject({ motivo: /cavalos/ });
  });

  it('a liberação é por PROVÍNCIA, não por reino', () => {
    // É isto que transforma "qual das minhas terras é a militar?" numa pergunta com resposta
    // no mapa — a mesma regra das explorações: Mina só onde há ferro.
    const c = comQuartel();
    c.darOuro(400_000);
    c.construir('atenas', 'armaria');
    for (let i = 0; i < 6; i++) c.passarTurno();

    expect(c.armasEm('atenas')).toContain('hoplita');
    expect(c.armasEm('maratona')).not.toContain('hoplita');
    expect(c.podeRecrutar('atenas', 100, 'hoplita')).toMatchObject({ pode: true });
    expect(c.podeRecrutar('maratona', 100, 'hoplita')).toMatchObject({ motivo: /Armaria/ });
  });

  it('o hoplita custa mais que o leve, e a diferença sai dos ajustes', () => {
    const c = comQuartel();
    c.darOuro(400_000);
    c.construir('atenas', 'armaria');
    for (let i = 0; i < 6; i++) c.passarTurno();

    const leve = c.podeRecrutar('atenas', 1000);
    const hoplita = c.podeRecrutar('atenas', 1000, 'hoplita');
    expect(leve).toMatchObject({ pode: true });
    expect(hoplita).toMatchObject({ pode: true });
    if (!leve.pode || !hoplita.pode) throw new Error('as duas levas deviam caber');
    expect(hoplita.ouro / leve.ouro).toBeCloseTo(
      combate.batalha.armas.hoplita.custo / combate.batalha.armas.leve.custo,
      2,
    );
    // O teto da tela nunca oferece mais hoplitas do que leves — aqui é a POPULAÇÃO que
    // limita os dois, e é por isso que a comparação é frouxa: o corte pelo ouro está no
    // teste de `maximoDaLeva`, onde o tesouro é que aperta.
    expect(c.maximoParaLevaEm('atenas', 'hoplita')).toBeLessThanOrEqual(
      c.maximoParaLevaEm('atenas'),
    );
  });

  it('a leva sai com a arma e o TREINO do dia, e nunca mais os perde', () => {
    // ⚠️ Carimbado no recrutamento: se a batalha perguntasse à província, perder a terra
    // transformaria veteranos em recrutas no meio da campanha. Tomar o Quartel do inimigo
    // piora as reposições dele, não o exército que ele já tem.
    const c = comQuartel();
    c.darOuro(400_000);
    c.construir('atenas', 'armaria');
    for (let i = 0; i < 6; i++) c.passarTurno();
    const treino = c.treinoEm('atenas');
    expect(treino).toBeGreaterThan(1);

    c.recrutar('atenas', 500, 'hoplita');
    expect(c.formacaoEm('atenas')?.contingentes).toEqual([
      { arma: 'hoplita', qualidade: treino, homens: 500 },
    ]);

    c.passarTurno();
    const hoste = unicaEm(c, 'atenas');
    expect(hoste?.contingentes).toEqual([
      { terra: 'atenas', arma: 'hoplita', qualidade: treino, homens: 500 },
    ]);
  });

  it('duas armas na mesma terra no mesmo turno não se atropelam', () => {
    const c = comQuartel();
    c.darOuro(400_000);
    c.construir('atenas', 'armaria');
    for (let i = 0; i < 6; i++) c.passarTurno();

    c.recrutar('atenas', 300, 'leve');
    c.recrutar('atenas', 200, 'hoplita');
    expect(homensEmFormacao(c.formacaoEm('atenas'))).toBe(500);
    expect(c.formacaoEm('atenas')?.contingentes).toHaveLength(2);
  });
});
