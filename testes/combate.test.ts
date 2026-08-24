import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { Ajustes, Construcoes, Economia, Exercitos, Provincias } from '../src/dados/esquema';
import { Campanha } from '../src/campanha/campanha';
import { Atlas } from '../src/mundo/atlas';
import { exercitoVazio, forcaDe, retirar, somarLeva } from '../src/combate/exercito';
import {
  avaliarLeva,
  custoDaLeva,
  disponivelParaLeva,
  manutencaoDe,
  maximoDaLeva,
} from '../src/combate/recrutamento';
import { unicaEm } from './apoio/hostes';

function ler<T>(esquema: { parse: (v: unknown) => T }, caminho: string): T {
  return esquema.parse(JSON.parse(readFileSync(resolve(caminho), 'utf8')));
}

const provincias = ler(Provincias, 'assets/mundo/provincias.json');
const economia = ler(Economia, 'dados/economia.json');
const construcoes = ler(Construcoes, 'dados/construcoes.json');
const exercitos = ler(Exercitos, 'dados/exercitos.json');
const ajustes = ler(Ajustes, 'dados/ajustes.json').jogo;
const combate = ajustes.combate;

function nova(): Campanha {
  return new Campanha(new Atlas(provincias), economia, construcoes, ajustes, exercitos);
}

/**
 * Atenas com o Quartel de pé e tesouro pra recrutar.
 *
 * Os oito turnos extras não são folga de teste: com 5.000 no Quartel e 2 moedas por
 * homem, Atenas sai da obra com ~2.900 no caixa e não põe em campo nem metade do que a
 * cidade comporta. Exército é caro de propósito — é ele o ralo de dinheiro que o
 * incentivo e a construção não conseguem ser.
 */
function comQuartel(): Campanha {
  const c = nova();
  c.comecar('atenas');
  for (let i = 0; i < 3; i++) c.passarTurno(); // junta as 5.000 do Quartel
  c.construir('atenas', 'quartel');
  for (let i = 0; i < 4; i++) c.passarTurno(); // 4 turnos de obra
  for (let i = 0; i < 8; i++) c.passarTurno(); // e o caixa pra uma leva de verdade
  c.darOuro(2_000);
  return c;
}

describe('exército: a força é derivada da origem', () => {
  it('somar levas soma a força, e a origem lembra de onde cada um veio', () => {
    const e = exercitoVazio('h1', 'atenas', 'atenas');
    expect(forcaDe(e)).toBe(0);
    somarLeva(e, 'atenas', 600);
    somarLeva(e, 'maratona', 400);
    somarLeva(e, 'atenas', 100);
    expect(forcaDe(e)).toBe(1100);
    expect(e.origem).toEqual({ atenas: 700, maratona: 400 });
  });

  it('retirar tira proporcionalmente de cada origem e a soma fecha exata', () => {
    const e = exercitoVazio('h1', 'atenas', 'atenas');
    somarLeva(e, 'atenas', 700);
    somarLeva(e, 'maratona', 300);

    const saiu = retirar(e, 500);
    // metade de cada, não 500 da primeira da lista: a ordem das levas não pode virar
    // uma regra escondida
    expect(saiu).toEqual({ atenas: 350, maratona: 150 });
    expect(forcaDe(e)).toBe(500);
    // nenhum homem sumiu nem foi inventado no arredondamento
    expect(Object.values(saiu).reduce((a, b) => a + b, 0)).toBe(500);
  });

  it('retirar mais do que existe leva só o que existe', () => {
    const e = exercitoVazio('h1', 'atenas', 'atenas');
    somarLeva(e, 'atenas', 100);
    expect(retirar(e, 999)).toEqual({ atenas: 100 });
    expect(forcaDe(e)).toBe(0);
  });

  it('o resto do arredondamento não perde nem cria homem', () => {
    const e = exercitoVazio('h1', 'atenas', 'atenas');
    somarLeva(e, 'a', 33);
    somarLeva(e, 'b', 33);
    somarLeva(e, 'c', 34);
    const saiu = retirar(e, 50);
    expect(Object.values(saiu).reduce((a, b) => a + b, 0)).toBe(50);
    expect(forcaDe(e)).toBe(50);
  });
});

describe('recrutamento: as contas', () => {
  it('o custo e a manutenção saem dos ajustes, em inteiros', () => {
    expect(custoDaLeva(1000, combate)).toBe(1000 * combate.custoPorHomem);
    expect(manutencaoDe(1000, combate)).toBe(Math.round(1000 * combate.manutencaoPorHomem));
    expect(Number.isInteger(custoDaLeva(777, combate))).toBe(true);
    expect(Number.isInteger(manutencaoDe(777, combate))).toBe(true);
  });

  it('não impõe fração nem lote mínimo: o limite é a população MENOS o piso', () => {
    const piso = combate.populacaoMinima;
    const situacao = { populacao: 35_000, tesouro: 200_000, temQuartel: true };
    const cabe = 35_000 - piso;
    expect(avaliarLeva(1, situacao, combate)).toMatchObject({ pode: true, homens: 1 });
    expect(avaliarLeva(cabe, situacao, combate)).toMatchObject({ pode: true, homens: cabe });
    expect(avaliarLeva(cabe + 1, situacao, combate)).toMatchObject({
      motivo: /nunca saem daqui/,
    });
  });

  it('oferece como teto somente o que população e tesouro permitem pagar', () => {
    const pelaRiqueza = { populacao: 35_000, tesouro: 3_000 };
    expect(maximoDaLeva(pelaRiqueza, combate)).toBe(1000);

    const pelaPopulacao = {
      populacao: combate.populacaoMinima + 37,
      tesouro: 200_000,
    };
    expect(maximoDaLeva(pelaPopulacao, combate)).toBe(37);
    expect(maximoDaLeva({ ...pelaRiqueza, tesouro: 0 }, combate)).toBe(0);
  });

  it('no piso, a província para de ceder gente e diz por quê', () => {
    const piso = combate.populacaoMinima;
    const noPiso = { populacao: piso, tesouro: 200_000, temQuartel: true };
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
    expect(c.retornoDaConstrucaoEm('atenas', 'quartel')?.ganhoPorTurno).toBe(
      -construcoes.construcoes['quartel']!.manutencao[0],
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
      homens: 1000,
      prontaNoTurno: c.turno + 1,
    });

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
    const cabe = Math.floor(c.tesouro / combate.custoPorHomem);
    const demais = cabe + 1;
    expect(c.podeRecrutar('atenas', demais)).toMatchObject({ motivo: /faltam .* moedas/ });
  });
});

describe('manter tropa é o ralo de dinheiro', () => {
  it('a manutenção sai do tesouro todo turno, depois da arrecadação', () => {
    const c = comQuartel();
    c.recrutar('atenas', 1000);
    // Em formação, a leva ainda não é hoste e não cobra folha militar.
    expect(c.manutencao).toBe(0);
    c.passarTurno();

    const tesouro = c.tesouro;
    const renda = c.renda;
    const manutencao = c.manutencao;

    expect(manutencao).toBe(Math.round(1000 * combate.manutencaoPorHomem));
    expect(c.saldoPorTurno).toBe(renda - manutencao);

    c.passarTurno();
    expect(c.tesouro).toBe(tesouro + renda - manutencao);
  });

  it('sem tropa não há manutenção', () => {
    const c = comQuartel();
    expect(c.manutencao).toBe(0);
    expect(c.saldoPorTurno).toBe(c.renda);
  });

  it('uma mobilização grande pode custar mais que a renda de Atenas', () => {
    // A leva põe o reino em fome; antes da folha seguinte, 5% dos homens são perdidos.
    const c = comQuartel();
    c.recrutar('atenas', 3500);
    c.passarTurno();
    const sobreviventes = 3500 - Math.floor(3500 * ajustes.alimento.mortePorFomeNaTropa);
    expect(c.manutencao).toBe(Math.round(sobreviventes * combate.manutencaoPorHomem));
    expect(c.saldoPorTurno).toBeLessThan(0);
  });

  it('o aperto drena o tesouro e a tropa deserta aos poucos, sem colapso', () => {
    const c = comQuartel();
    c.recrutar('atenas', 3500);
    c.passarTurno();
    const forcaInicial = c.forcaEm('atenas');

    // O tesouro escorre até não cobrir a folha, e aí começa a desertar. Não existe
    // instante de colapso, existe uma corda esticando.
    for (let i = 0; i < 300; i++) c.passarTurno();

    expect(c.forcaEm('atenas')).toBeLessThan(forcaInicial); // desertou
    expect(c.forcaEm('atenas')).toBeGreaterThan(0); // proporcional, nunca aniquilação
    expect(c.tesouro).toBeGreaterThanOrEqual(0); // tesouro nunca fica negativo
    // A corda para de esticar onde a renda volta a sustentar a folha: o exército
    // encolhe até caber no que o reino paga, e ali estabiliza.
    expect(c.manutencao).toBeLessThanOrEqual(c.renda);
  });

  it('quem deserta volta pra casa em vez de sumir do mundo', () => {
    const c = comQuartel();
    // Leva pequena de propósito: o reino continua alimentando todo mundo, e o único
    // aperto em cima da tropa é o do soldo. Assim a soma mede só a deserção.
    // 2.500 homens: a folha passa da renda, mas o saldo alimentar fecha em zero; ninguém
    // passa fome e a soma mede somente a deserção.
    c.recrutar('atenas', 2500);
    c.passarTurno();
    c.darOuro(-c.tesouro);

    // O controle é a mesma campanha com o cofre cheio: mesma tropa, mesma comida, mesma
    // demografia — só que sem deserção. A diferença entre as duas é o que este teste mede.
    const pago = comQuartel();
    pago.recrutar('atenas', 2500);
    pago.passarTurno();
    pago.darOuro(50_000);

    const forca = c.forcaEm('atenas');
    c.passarTurno();
    pago.passarTurno();

    expect(c.fome.provincias).toEqual([]); // ninguém passou fome nesta janela
    expect(c.forcaEm('atenas')).toBeLessThan(forca); // desertou
    expect(pago.forcaEm('atenas')).toBe(forca); // e o controle não
    // O que saiu do exército reapareceu na província: o mundo continua com a mesma gente.
    // A margem de um punhado é arredondamento — o exército menor come um pouco menos, e o
    // crescimento do turno cai noutro inteiro.
    expect(c.populacaoDe('atenas') + c.homensEmArmasDe('atenas')).toBeGreaterThanOrEqual(
      pago.populacaoDe('atenas') + pago.homensEmArmasDe('atenas') - 5,
    );
  });

  it('a conta fecha em inteiros mesmo depois de desertar', () => {
    const c = comQuartel();
    c.recrutar('atenas', 3500);
    for (let i = 0; i < 300; i++) c.passarTurno();
    expect(Number.isInteger(c.tesouro)).toBe(true);
    expect(Number.isInteger(c.forcaEm('atenas'))).toBe(true);
    expect(Number.isInteger(c.populacaoDe('atenas'))).toBe(true);
  });
});

describe('dispensar devolve cada um à sua terra', () => {
  it('aceita dispensar um único homem, sem lote mínimo', () => {
    const c = comQuartel();
    c.recrutar('atenas', 1000);
    c.passarTurno();
    const populacao = c.populacaoDe('atenas');
    c.dispensar('atenas', 1);
    expect(c.forcaEm('atenas')).toBe(999);
    expect(c.populacaoDe('atenas')).toBe(populacao + 1);
  });

  it('a população volta exatamente de onde saiu', () => {
    const c = comQuartel();
    c.recrutar('atenas', 2000);
    c.passarTurno();
    const populacao = c.populacaoDe('atenas');

    c.dispensar('atenas', 800);

    expect(c.forcaEm('atenas')).toBe(1200);
    expect(c.populacaoDe('atenas')).toBe(populacao + 800);
  });

  it('dispensar tudo apaga o exército em vez de deixar um vazio', () => {
    const c = comQuartel();
    c.recrutar('atenas', 1000);
    c.passarTurno();
    const populacao = c.populacaoDe('atenas');
    c.dispensar('atenas', 1000);
    expect(unicaEm(c, 'atenas')).toBeUndefined();
    expect(c.populacaoDe('atenas')).toBe(populacao + 1000);
    expect(c.manutencao).toBe(0);
  });

  it('a população nunca é uma catraca de sentido único', () => {
    // ⚠️ **Medido contra um CONTROLE:** a demografia se
    // mexe sozinha entre um turno e outro — e mobilizar pode trocar a categoria alimentar.
    // Comparar "depois" com "antes" mediria demografia, não a catraca. O que este
    // teste guarda é que recrutar e dispensar **não tiram nada do mundo**: três ciclos de
    // leva e dispensa têm que terminar exatamente onde três turnos parados terminariam.
    const parado = comQuartel();
    for (let i = 0; i < 3; i++) parado.passarTurno();

    const c = comQuartel();
    for (let i = 0; i < 3; i++) {
      c.recrutar('atenas', 1000);
      c.passarTurno();
      c.dispensar('atenas', 1000);
    }
    // Mobilizada, Atenas cai de Farta para Abastecida e cresce um pouco menos nesses anos.
    // A diferença é demografia, não gente engolida pela dispensa.
    expect(c.populacaoDe('atenas')).toBeLessThan(parado.populacaoDe('atenas'));
    expect(Math.abs(c.populacaoDe('atenas') - parado.populacaoDe('atenas'))).toBeLessThanOrEqual(100);
  });
});

describe('conquista e tropa', () => {
  it('perder a província não some com o exército que está nela', () => {
    const c = comQuartel();
    c.recrutar('atenas', 1000);
    c.passarTurno();
    c.trocarDono('atenas', 'megara');
    // o exército continua sendo de Atenas: quem manda no chão não manda na tropa
    expect(unicaEm(c, 'atenas')?.poder).toBe('atenas');
    // Perguntando por Atenas de propósito: sem o poder, `forcaEm` responderia por Mégara,
    // que é a nova dona da terra e não tem homem nenhum ali.
    expect(c.forcaEm('atenas', 'atenas')).toBe(1000);
  });
});

describe('perder o chão não é o mesmo que morrer', () => {
  it('um poder sem território mas com hoste continua vivo, no exílio', () => {
    const c = comQuartel();
    c.recrutar('atenas', 1000);
    expect(c.poderesVivos()).toHaveLength(148);

    // Atenas perde as três províncias, mas a hoste continua de pé.
    for (const id of [...c.provinciasDe('atenas')]) c.trocarDono(id, 'megara');

    expect(c.provinciasDe('atenas')).toHaveLength(0);
    expect(c.vivo('atenas')).toBe(true);
    expect(c.noExilio('atenas')).toBe(true);
    expect(c.poderesVivos()).toContain('atenas');
  });

  it('o exilado tem que ASSALTAR a própria capital de volta, e o relógio corre', () => {
    const c = comQuartel();
    c.recrutar('atenas', 1000);
    c.passarTurno(); // a leva leva uma rodada pra virar hoste
    for (const id of [...c.provinciasDe('atenas')]) c.trocarDono(id, 'megara');
    expect(c.renda).toBe(0); // sem província, sem arrecadação
    expect(c.noExilio('atenas')).toBe(true);

    // ⚠️ O CERCO endureceu o exílio, e a regra nova é mais dura e mais interessante: a
    // hoste está pisando na própria terra, mas a cidade tem gente dentro e não abre o
    // portão porque a bandeira mudou. Sentar na porta não devolve nada — e sem renda a
    // deserção já está comendo o exército.
    c.passarTurno();
    expect(c.noExilio('atenas')).toBe(true);
    expect(c.cercoEm('atenas')).toMatchObject({ sitiante: 'atenas', postura: 'sitiar' });

    c.mudarPostura('atenas', 'assaltar');
    c.passarTurno();

    expect(c.donoDe('atenas')).toBe('atenas');
    expect(c.noExilio('atenas')).toBe(false);
    expect(c.vivo('atenas')).toBe(true);
  });

  it('sem chão e sem tropa é eliminação, como antes', () => {
    // Esparta não tem guarnição inicial: perder o chão a elimina de vez, sem exílio.
    const c = nova();
    for (const id of [...c.provinciasDe('esparta')]) c.trocarDono(id, 'atenas');
    expect(c.vivo('esparta')).toBe(false);
    expect(c.noExilio('esparta')).toBe(false);
  });
});

describe('dispensar homem de terra perdida', () => {
  it('ele volta pra terra dele mesmo que ela seja do inimigo agora', () => {
    const c = comQuartel();
    c.recrutar('atenas', 1000);
    c.passarTurno();
    const populacao = c.populacaoDe('atenas');

    const rendaPropriaDeMegara = c.rendaDe('megara');
    c.trocarDono('atenas', 'megara');
    // Uma regra só, sem exceção: gente pertence ao chão, não a quem manda no chão.
    c.dispensar('atenas', 1000);

    expect(c.populacaoDe('atenas')).toBe(populacao + 1000);
    expect(c.donoDe('atenas')).toBe('megara');
    // E a consequência dura, de propósito: os habitantes rendem pro conquistador —
    // somados ao que Mégara já arrecadava das terras dela.
    expect(c.rendaDe('megara')).toBe(rendaPropriaDeMegara + (c.economiaDe('atenas')?.total ?? 0));
    expect(c.rendaDe('atenas')).toBe(
      (c.economiaDe('maratona')?.total ?? 0) + (c.economiaDe('sounion')?.total ?? 0),
    );
  });

  it('a mesma regra vale pra deserção por falta de pagamento', () => {
    // O exilado sem soldo: a hoste ativa fica sem pagamento e deserta INTEIRA na virada —
    // e a folha é cobrada ANTES da fome, então ninguém morre no caminho e a conta mede só
    // a deserção. Cada desertor volta à terra natal, que agora é de Mégara.
    const c = comQuartel();
    c.recrutar('atenas', 1000);
    c.passarTurno(); // a leva vira hoste
    for (const id of [...c.provinciasDe('atenas')]) c.trocarDono(id, 'megara');
    c.darOuro(-c.tesouro); // exilado e de cofre vazio

    const antes = c.populacaoDe('atenas');
    c.passarTurno();

    // Os 1.000 voltaram pra casa ANTES do crescimento do turno: a população nova é pelo
    // menos a antiga mais a tropa inteira.
    expect(c.populacaoDe('atenas')).toBeGreaterThanOrEqual(antes + 1000);
    // Sem chão e agora sem tropa, o exílio terminou em eliminação.
    expect(c.hostes().filter((h) => h.poder === 'atenas')).toEqual([]);
    expect(c.vivo('atenas')).toBe(false);
    // E quem engorda com os desertores é exatamente quem tomou a terra deles.
    expect(c.rendaDe('megara')).toBeGreaterThan(0);
  });

  it('nenhum homem some do mundo no caminho', () => {
    const c = comQuartel();
    c.recrutar('atenas', 3000);
    c.passarTurno();
    const total = c.populacaoDe('atenas') + c.homensEmArmasDe('atenas');
    c.trocarDono('atenas', 'megara');
    c.dispensar('atenas', 1200);
    expect(c.populacaoDe('atenas') + c.homensEmArmasDe('atenas')).toBe(total);
    c.dispensar('atenas', 1800);
    expect(c.populacaoDe('atenas') + c.homensEmArmasDe('atenas')).toBe(total);
  });
});
