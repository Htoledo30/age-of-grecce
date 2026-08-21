import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { Ajustes, Construcoes, Economia, Provincias } from '../src/dados/esquema';
import { Campanha } from '../src/campanha/campanha';
import { Atlas } from '../src/mundo/atlas';
import { exercitoVazio, forcaDe, retirar, somarLeva } from '../src/combate/exercito';
import { custoDaLeva, manutencaoDe, tetoDeRecrutamento } from '../src/combate/recrutamento';

function ler<T>(esquema: { parse: (v: unknown) => T }, caminho: string): T {
  return esquema.parse(JSON.parse(readFileSync(resolve(caminho), 'utf8')));
}

const provincias = ler(Provincias, 'assets/mundo/provincias.json');
const economia = ler(Economia, 'dados/economia.json');
const construcoes = ler(Construcoes, 'dados/construcoes.json');
const ajustes = ler(Ajustes, 'dados/ajustes.json').jogo;
const combate = ajustes.combate;

function nova(): Campanha {
  return new Campanha(new Atlas(provincias), economia, construcoes, ajustes);
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
  return c;
}

describe('exército: a força é derivada da origem', () => {
  it('somar levas soma a força, e a origem lembra de onde cada um veio', () => {
    const e = exercitoVazio('atenas');
    expect(forcaDe(e)).toBe(0);
    somarLeva(e, 'atenas', 600);
    somarLeva(e, 'maratona', 400);
    somarLeva(e, 'atenas', 100);
    expect(forcaDe(e)).toBe(1100);
    expect(e.origem).toEqual({ atenas: 700, maratona: 400 });
  });

  it('retirar tira proporcionalmente de cada origem e a soma fecha exata', () => {
    const e = exercitoVazio('atenas');
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
    const e = exercitoVazio('atenas');
    somarLeva(e, 'atenas', 100);
    expect(retirar(e, 999)).toEqual({ atenas: 100 });
    expect(forcaDe(e)).toBe(0);
  });

  it('o resto do arredondamento não perde nem cria homem', () => {
    const e = exercitoVazio('atenas');
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

  it('o teto é uma fração da população, e o que já está em armas conta contra ele', () => {
    // 10% de 35.000 = 3.500
    expect(tetoDeRecrutamento(35_000, 0, combate)).toBe(3500);
    // com 1.000 já fora, a população caiu pra 34.000 mas o teto continua sendo sobre os
    // 35.000 originais — senão bastava recrutar em rodadas pra esvaziar a cidade
    expect(tetoDeRecrutamento(34_000, 1000, combate)).toBe(2500);
    expect(tetoDeRecrutamento(31_500, 3500, combate)).toBe(0);
  });
});

describe('o Quartel é o portão', () => {
  it('sem Quartel não se recruta, e a recusa diz isso', () => {
    const c = nova();
    c.comecar('atenas');
    expect(c.podeRecrutarEm('atenas')).toBe(false);
    expect(c.podeRecrutar('atenas', 500)).toMatchObject({
      pode: false,
      motivo: 'é preciso um Quartel aqui para reunir tropa',
    });
    expect(() => c.recrutar('atenas', 500)).toThrow(/Quartel/);
  });

  it('o Quartel não rende moeda nenhuma — ele paga em capacidade', () => {
    const antes = nova();
    antes.comecar('atenas');
    const renda = antes.rendaDe('atenas');
    const c = comQuartel();
    expect(c.rendaDe('atenas')).toBe(renda);
    expect(c.retornoDaConstrucaoEm('atenas', 'quartel')?.ganhoPorTurno).toBe(0);
    // e destrava o que nenhuma das outras destrava
    expect(c.capacidadesEm('atenas')).toEqual(['recrutar']);
    expect(c.podeRecrutarEm('atenas')).toBe(true);
    expect(c.podeRecrutarEm('maratona')).toBe(false);
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
    expect(c.populacaoDe('atenas')).toBe(35_000);

    c.recrutar('atenas', 1000);

    expect(c.tesouro).toBe(tesouro - custoDaLeva(1000, combate));
    expect(c.populacaoDe('atenas')).toBe(34_000);
    expect(c.forcaEm('atenas')).toBe(1000);
    expect(c.exercitoEm('atenas')?.poder).toBe('atenas');
  });

  it('quem está em armas deixa de ser tributado, e a renda cai na hora', () => {
    const c = comQuartel();
    const impostosAntes = c.economiaDe('atenas')?.impostos;
    expect(impostosAntes).toBe(175); // 35.000 x 0,005

    c.recrutar('atenas', 1000);

    // 34.000 x 0,005 = 170: mobilizar tem preço contínuo, não só preço de entrada
    expect(c.economiaDe('atenas')?.impostos).toBe(170);
    expect(c.rendaDe('atenas')).toBe(708 - 5);
  });

  it('a ficha mostra a população de agora, não a inicial', () => {
    const c = comQuartel();
    c.recrutar('atenas', 2000);
    expect(c.economiaDe('atenas')?.populacao).toBe(33_000);
  });

  it('respeita o teto e diz quanto ainda cabe', () => {
    const c = comQuartel();
    expect(c.tetoDeLevaEm('atenas')).toBe(3500);
    expect(c.podeRecrutar('atenas', 3501)).toMatchObject({
      motivo: /comporta mais 3\.500 homens/,
    });
    c.recrutar('atenas', 3500);
    expect(c.tetoDeLevaEm('atenas')).toBe(0);
    expect(c.podeRecrutar('atenas', 100)).toMatchObject({
      motivo: 'esta província já tem em armas tudo o que comporta',
    });
  });

  it('recusa leva miúda e valor quebrado', () => {
    const c = comQuartel();
    expect(c.podeRecrutar('atenas', 50)).toMatchObject({ motivo: /leva mínima/ });
    expect(c.podeRecrutar('atenas', 100.5)).toMatchObject({ motivo: /inteiro/ });
    expect(c.podeRecrutar('atenas', 0)).toMatchObject({ motivo: /inteiro/ });
  });

  it('recusa quando falta ouro, dizendo quanto falta', () => {
    const c = comQuartel();
    const cabe = Math.floor(c.tesouro / combate.custoPorHomem);
    const demais = cabe + combate.minimoPorLeva;
    expect(c.podeRecrutar('atenas', demais)).toMatchObject({ motivo: /faltam .* moedas/ });
  });
});

describe('manter tropa é o ralo de dinheiro', () => {
  it('a manutenção sai do tesouro todo turno, depois da arrecadação', () => {
    const c = comQuartel();
    c.recrutar('atenas', 1000);
    const tesouro = c.tesouro;
    const renda = c.renda;
    const manutencao = c.manutencao;

    expect(manutencao).toBe(200); // 1.000 x 0,2
    expect(c.saldoPorTurno).toBe(renda - 200);

    c.passarTurno();
    expect(c.tesouro).toBe(tesouro + renda - manutencao);
  });

  it('sem tropa não há manutenção', () => {
    const c = comQuartel();
    expect(c.manutencao).toBe(0);
    expect(c.saldoPorTurno).toBe(c.renda);
  });

  it('mobilização total come quase toda a renda de Atenas', () => {
    // Este é o número que o sistema existe pra produzir: com o teto em 10% da população,
    // Atenas põe 3.500 homens em campo e eles custam 700 por turno — contra 691 de renda,
    // porque os mesmos 3.500 deixaram de ser tributados. Guerra total é insustentável por
    // construção, sem nenhuma regra dizendo isso.
    const c = comQuartel();
    c.recrutar('atenas', 3500);
    expect(c.manutencao).toBe(700);
    expect(c.renda).toBe(691); // 31.500 x 0,005 = 158 de imposto, contra 175
    expect(c.saldoPorTurno).toBe(-9);
  });

  it('o aperto drena o tesouro e a tropa deserta aos poucos, sem colapso', () => {
    const c = comQuartel();
    c.recrutar('atenas', 3500);
    const forcaInicial = c.forcaEm('atenas');

    // Saldo negativo de 9 por turno: o tesouro escorre até não cobrir a folha, e aí
    // começa a desertar. Não existe instante de colapso, existe uma corda esticando.
    for (let i = 0; i < 300; i++) c.passarTurno();

    expect(c.forcaEm('atenas')).toBeLessThan(forcaInicial); // desertou
    expect(c.forcaEm('atenas')).toBeGreaterThan(0); // e não colapsou
    expect(c.tesouro).toBeGreaterThanOrEqual(0); // tesouro nunca fica negativo
    // quem desertou voltou pra casa em vez de sumir do mundo: a soma fecha sempre
    expect(c.populacaoDe('atenas') + c.homensEmArmasDe('atenas')).toBe(35_000);
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
  it('a população volta exatamente de onde saiu', () => {
    const c = comQuartel();
    c.recrutar('atenas', 2000);
    expect(c.populacaoDe('atenas')).toBe(33_000);

    c.dispensar('atenas', 800);

    expect(c.forcaEm('atenas')).toBe(1200);
    expect(c.populacaoDe('atenas')).toBe(33_800);
  });

  it('dispensar tudo apaga o exército em vez de deixar um vazio', () => {
    const c = comQuartel();
    c.recrutar('atenas', 1000);
    c.dispensar('atenas', 1000);
    expect(c.exercitoEm('atenas')).toBeUndefined();
    expect(c.populacaoDe('atenas')).toBe(35_000);
    expect(c.manutencao).toBe(0);
  });

  it('a população nunca é uma catraca de sentido único', () => {
    const c = comQuartel();
    const inicial = c.populacaoDe('atenas');
    for (let i = 0; i < 3; i++) {
      c.recrutar('atenas', 1000);
      c.dispensar('atenas', 1000);
    }
    expect(c.populacaoDe('atenas')).toBe(inicial);
  });
});

describe('conquista e tropa', () => {
  it('perder a província não some com o exército que está nela', () => {
    const c = comQuartel();
    c.recrutar('atenas', 1000);
    c.trocarDono('atenas', 'megara');
    // o exército continua sendo de Atenas: quem manda no chão não manda na tropa
    expect(c.exercitoEm('atenas')?.poder).toBe('atenas');
    expect(c.forcaEm('atenas')).toBe(1000);
  });
});
