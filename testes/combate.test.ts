import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { Ajustes, Construcoes, Economia, Provincias } from '../src/dados/esquema';
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
  c.darOuro(2_000);
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
    expect(c.podeRecrutarEm('atenas')).toBe(false);
    expect(c.podeRecrutar('atenas', 500)).toMatchObject({
      pode: false,
      motivo: 'é preciso um Quartel aqui para reunir tropa',
    });
    expect(() => c.recrutar('atenas', 500)).toThrow(/Quartel/);
  });

  it('o Quartel não rende moeda nenhuma — ele paga em capacidade', () => {
    const c = comQuartel();
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
    const populacao = c.populacaoDe('atenas');

    c.recrutar('atenas', 1000);

    expect(c.tesouro).toBe(tesouro - custoDaLeva(1000, combate));
    expect(c.populacaoDe('atenas')).toBe(populacao - 1000);
    expect(c.forcaEm('atenas')).toBe(1000);
    expect(c.exercitoEm('atenas')?.poder).toBe('atenas');
  });

  it('quem está em armas deixa de ser tributado, e a renda cai na hora', () => {
    const c = comQuartel();
    const impostosAntes = c.economiaDe('atenas')?.impostos;

    c.recrutar('atenas', 1000);

    // Mil habitantes a menos tiram cinco moedas de imposto imediatamente.
    expect(c.economiaDe('atenas')?.impostos).toBe((impostosAntes ?? 0) - 5);
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
    // Sem teto artificial, o freio continua legível: 3.500 homens custam 700 por turno
    // contra 691 de renda, porque os mesmos 3.500 também deixaram de ser tributados.
    const c = comQuartel();
    c.recrutar('atenas', 3500);
    expect(c.manutencao).toBe(Math.round(3500 * combate.manutencaoPorHomem));
    expect(c.saldoPorTurno).toBeLessThan(0);
  });

  it('o aperto drena o tesouro e a tropa deserta aos poucos, sem colapso', () => {
    const c = comQuartel();
    c.recrutar('atenas', 3500);
    const forcaInicial = c.forcaEm('atenas');
    const totalAntes = c.populacaoDe('atenas') + c.homensEmArmasDe('atenas');

    // Saldo negativo de 9 por turno: o tesouro escorre até não cobrir a folha, e aí
    // começa a desertar. Não existe instante de colapso, existe uma corda esticando.
    for (let i = 0; i < 300; i++) c.passarTurno();

    expect(c.forcaEm('atenas')).toBeLessThan(forcaInicial); // desertou
    expect(c.forcaEm('atenas')).toBeGreaterThan(0); // e não colapsou
    expect(c.tesouro).toBeGreaterThanOrEqual(0); // tesouro nunca fica negativo
    // quem desertou voltou pra casa em vez de sumir do mundo: a soma fecha sempre
    expect(c.populacaoDe('atenas') + c.homensEmArmasDe('atenas')).toBeGreaterThan(totalAntes);
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
    const populacao = c.populacaoDe('atenas');
    c.recrutar('atenas', 1000);
    c.dispensar('atenas', 1);
    expect(c.forcaEm('atenas')).toBe(999);
    expect(c.populacaoDe('atenas')).toBe(populacao - 999);
  });

  it('a população volta exatamente de onde saiu', () => {
    const c = comQuartel();
    const populacao = c.populacaoDe('atenas');
    c.recrutar('atenas', 2000);
    expect(c.populacaoDe('atenas')).toBe(populacao - 2000);

    c.dispensar('atenas', 800);

    expect(c.forcaEm('atenas')).toBe(1200);
    expect(c.populacaoDe('atenas')).toBe(populacao - 1200);
  });

  it('dispensar tudo apaga o exército em vez de deixar um vazio', () => {
    const c = comQuartel();
    const populacao = c.populacaoDe('atenas');
    c.recrutar('atenas', 1000);
    c.dispensar('atenas', 1000);
    expect(c.exercitoEm('atenas')).toBeUndefined();
    expect(c.populacaoDe('atenas')).toBe(populacao);
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

  it('o exílio dura uma rodada: a hoste retoma a terra onde está', () => {
    const c = comQuartel();
    c.recrutar('atenas', 1000);
    for (const id of [...c.provinciasDe('atenas')]) c.trocarDono(id, 'megara');
    expect(c.renda).toBe(0); // sem província, sem arrecadação
    expect(c.noExilio('atenas')).toBe(true);

    c.passarTurno();

    // ⚠️ A regra da conquista mudou isto, e o comportamento novo é o certo: uma hoste
    // parada em terra alheia SEM ninguém defendendo fica com ela. O exército no exílio
    // não espera — ele retoma o chão em que está pisando.
    expect(c.donoDe('atenas')).toBe('atenas');
    expect(c.noExilio('atenas')).toBe(false);
    expect(c.vivo('atenas')).toBe(true);
    // O caminho da deserção continua existindo e tem teste próprio: ver "o aperto drena o
    // tesouro". O que morreu foi a premissa de que o exilado fica parado.
  });

  it('sem chão e sem tropa é eliminação, como antes', () => {
    const c = nova();
    for (const id of [...c.provinciasDe('megara')]) c.trocarDono(id, 'atenas');
    expect(c.vivo('megara')).toBe(false);
    expect(c.noExilio('megara')).toBe(false);
  });
});

describe('dispensar homem de terra perdida', () => {
  it('ele volta pra terra dele mesmo que ela seja do inimigo agora', () => {
    const c = comQuartel();
    const populacao = c.populacaoDe('atenas');
    c.recrutar('atenas', 1000);
    expect(c.populacaoDe('atenas')).toBe(populacao - 1000);

    c.trocarDono('atenas', 'megara');
    // Uma regra só, sem exceção: gente pertence ao chão, não a quem manda no chão.
    c.dispensar('atenas', 1000);

    expect(c.populacaoDe('atenas')).toBe(populacao);
    expect(c.donoDe('atenas')).toBe('megara');
    // E a consequência dura, de propósito: os habitantes rendem pro conquistador.
    expect(c.rendaDe('megara')).toBe(c.economiaDe('atenas')?.total);
    expect(c.rendaDe('atenas')).toBe(
      (c.economiaDe('maratona')?.total ?? 0) + (c.economiaDe('sounion')?.total ?? 0),
    );
  });

  it('a mesma regra vale pra deserção por falta de pagamento', () => {
    const c = comQuartel();
    const antes = c.populacaoDe('atenas');
    c.recrutar('atenas', 1000);
    for (const id of [...c.provinciasDe('atenas')]) c.trocarDono(id, 'megara');

    for (let i = 0; i < 60; i++) c.passarTurno();

    // Os desertores do exílio engordam exatamente quem tomou a terra deles.
    expect(c.populacaoDe('atenas')).toBeGreaterThan(antes);
    expect(c.rendaDe('megara')).toBeGreaterThan(0);
  });

  it('nenhum homem some do mundo no caminho', () => {
    const c = comQuartel();
    const total = c.populacaoDe('atenas');
    c.recrutar('atenas', 3000);
    c.trocarDono('atenas', 'megara');
    c.dispensar('atenas', 1200);
    expect(c.populacaoDe('atenas') + c.homensEmArmasDe('atenas')).toBe(total);
    c.dispensar('atenas', 1800);
    expect(c.populacaoDe('atenas') + c.homensEmArmasDe('atenas')).toBe(total);
  });
});
