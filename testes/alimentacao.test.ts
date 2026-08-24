import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { Ajustes, Construcoes, Economia, Exercitos, Provincias } from '../src/dados/esquema';
import { Campanha } from '../src/campanha/campanha';
import { lerSalvamento } from '../src/campanha/salvamento';
import { Atlas } from '../src/mundo/atlas';
import {
  balancoAlimentar,
  categoriaAlimentar,
  custoMilitar,
  mortosPelaFome,
  nivelPopulacional,
} from '../src/producao/alimentacao';
import { ordenar } from './apoio/hostes';

function ler<T>(esquema: { parse: (v: unknown) => T }, caminho: string): T {
  return esquema.parse(JSON.parse(readFileSync(resolve(caminho), 'utf8')));
}

const provincias = ler(Provincias, 'assets/mundo/provincias.json');
const economia = ler(Economia, 'dados/economia.json');
const construcoes = ler(Construcoes, 'dados/construcoes.json');
const exercitos = ler(Exercitos, 'dados/exercitos.json');
const ajustes = ler(Ajustes, 'dados/ajustes.json').jogo;

function nova(jogador = 'atenas'): Campanha {
  const campanha = new Campanha(new Atlas(provincias), economia, construcoes, ajustes, exercitos);
  campanha.comecar(jogador);
  return campanha;
}

describe('a conta curta da alimentação', () => {
  it('faz a população subir e descer de nível em faixas de 25%', () => {
    expect(nivelPopulacional(0, 10_000, 0.25)).toBe(0);
    expect(nivelPopulacional(1, 10_000, 0.25)).toBe(1);
    expect(nivelPopulacional(12_499, 10_000, 0.25)).toBe(1);
    expect(nivelPopulacional(12_500, 10_000, 0.25)).toBe(2);
    expect(nivelPopulacional(15_000, 10_000, 0.25)).toBe(3);
    expect(nivelPopulacional(20_000, 10_000, 0.25)).toBe(5);
    expect(nivelPopulacional(11_000, 10_000, 0.25)).toBe(1);
  });

  it('arredonda o exército total uma vez, não cada hoste', () => {
    expect(custoMilitar(0, 1000)).toBe(0);
    expect(custoMilitar(500, 1000)).toBe(1);
    expect(custoMilitar(1000, 1000)).toBe(1);
    expect(custoMilitar(1001, 1000)).toBe(2);
    expect(custoMilitar(2800, 1000)).toBe(3);
  });

  it('as duas contas: civil primeiro, exército depois — e a sitiada fora de ambas', () => {
    const resultado = balancoAlimentar(
      [
        { populacaoAtual: 10_000, populacaoInicial: 10_000, producaoAlimentar: 4, sitiada: false },
        { populacaoAtual: 10_000, populacaoInicial: 10_000, producaoAlimentar: 0, sitiada: false },
        // A sitiada não contribui, não pesa e não conta: vive da própria despensa.
        { populacaoAtual: 9_000, populacaoInicial: 9_000, producaoAlimentar: 7, sitiada: true },
      ],
      1001,
      ajustes.alimento,
    );
    expect(resultado).toMatchObject({
      subsistencia: 1,
      producao: 4,
      populacao: 2,
      exercito: 2,
      saldoCivil: 3,
      saldo: 1,
      categoria: 'abastecido',
    });
  });

  it('não dá subsistência a poder sem província simulada', () => {
    expect(balancoAlimentar([], 0, ajustes.alimento).saldo).toBe(0);
    expect(nova().balancoAlimentarDe('esparta')).toMatchObject({ subsistencia: 0, saldo: 0 });
  });

  it('a categoria sai do PAR de saldos: quem não comeu decide o nome', () => {
    // Civil negativo é Fome de gente, não importa o final.
    expect(categoriaAlimentar(-1, -3)).toBe('fome');
    // Civil fechado com final negativo: o povo comeu; o aperto é só do exército.
    expect(categoriaAlimentar(0, -2)).toBe('exercito-sem-mantimentos');
    expect(categoriaAlimentar(3, -1)).toBe('exercito-sem-mantimentos');
    expect(categoriaAlimentar(2, 0)).toBe('no-limite');
    expect(categoriaAlimentar(5, 4)).toBe('abastecido');
  });

  it('cobra uma fração fixa, com mínimo de uma morte', () => {
    expect(mortosPelaFome(10_000, 0.01)).toBe(100);
    expect(mortosPelaFome(10_000, 0.05)).toBe(500);
    expect(mortosPelaFome(3, 0.01)).toBe(1);
    expect(mortosPelaFome(0, 0.01)).toBe(0);
  });
});

describe('a alimentação dentro da campanha', () => {
  it('Atenas começa em +3, abastecida, por uma conta que fecha inteira', () => {
    const comida = nova().alimentacao;
    expect(comida).toMatchObject({
      subsistencia: 1,
      producao: 5,
      populacao: 3,
      exercito: 0,
      saldoCivil: 3,
      saldo: 3,
      categoria: 'abastecido',
    });
  });

  it('crescer nunca vira fome: 500 turnos de paz sem um único saldo negativo', () => {
    // É a trava preventiva em ação: o povo cresce até onde a comida alcança e PARA —
    // pode estacionar em 0 (No limite) ou num resto positivo que não dá pra ocupar sem
    // afundar (limitado pela alimentação). Nunca atravessa pro negativo sozinho.
    const campanha = nova();
    let menorSaldo = campanha.alimentacao.saldo;
    let mortes = 0;

    for (let turno = 0; turno < 500; turno++) {
      campanha.passarTurno();
      menorSaldo = Math.min(menorSaldo, campanha.alimentacao.saldo);
      mortes += campanha.fome.provincias.reduce((soma, p) => soma + p.mortos, 0);
    }

    expect(menorSaldo).toBeGreaterThanOrEqual(0);
    expect(mortes).toBe(0);
    expect(campanha.alimentacao.saldo).toBeGreaterThanOrEqual(0);
  });

  it('Fazenda NUNCA piora a fome: cem turnos com e sem, lado a lado', () => {
    // O critério que derrubou a regra antiga: a simulação mostrava 11 anos de fome e
    // 10.403 mortos POR CAUSA de uma Fazenda. Com a trava, ela só pode ajudar.
    const povoDe = (c: Campanha) =>
      c.provinciasDe('atenas').reduce((soma, id) => soma + c.populacaoDe(id), 0);
    const sem = nova();
    const com = nova();
    com.construir('atenas', 'fazenda');

    let turnosDeFomeSem = 0;
    let turnosDeFomeCom = 0;
    let mortesCom = 0;
    for (let turno = 0; turno < 100; turno++) {
      sem.passarTurno();
      com.passarTurno();
      if (sem.alimentacao.saldoCivil < 0) turnosDeFomeSem++;
      if (com.alimentacao.saldoCivil < 0) turnosDeFomeCom++;
      mortesCom += com.fome.provincias.reduce((soma, p) => soma + p.mortos, 0);
    }

    expect(turnosDeFomeCom).toBeLessThanOrEqual(turnosDeFomeSem);
    expect(mortesCom).toBe(0);
    // E ela entrega o que promete: mais gente vivendo da mesma terra.
    expect(povoDe(com)).toBeGreaterThanOrEqual(povoDe(sem));
  });

  it('conta alimento principal e secundário pelo nível natural', () => {
    const campanha = nova();
    expect(campanha.produtosAlimentaresEm('atenas')).toEqual([
      { id: 'graos', nome: 'Grãos', nivel: 2 },
    ]);
    expect(campanha.contribuicaoAlimentarEm('maratona')).toBe(3); // Grãos II + Gado I
    expect(campanha.contribuicaoAlimentarEm('sounion')).toBe(0);
  });

  it('o custo de várias hostes é calculado pelo total mobilizado', () => {
    const campanha = nova();
    campanha.plantarHoste('atenas', 'atenas', 400);
    campanha.plantarHoste('maratona', 'atenas', 400);
    expect(campanha.alimentacao.exercito).toBe(1);
    campanha.plantarHoste('sounion', 'atenas', 201);
    expect(campanha.alimentacao.exercito).toBe(2);
  });

  it('déficit causado SÓ pelo exército não mata civil nenhum: o povo come primeiro', () => {
    const campanha = nova();
    campanha.darOuro(200_000);
    campanha.plantarHoste('atenas', 'atenas', 4001);
    // Civil fecha (+3); o exército de 5 pontos derruba só o saldo final.
    expect(campanha.alimentacao.saldoCivil).toBeGreaterThanOrEqual(0);
    expect(campanha.alimentacao.saldo).toBeLessThan(0);
    expect(campanha.alimentacao.categoria).toBe('exercito-sem-mantimentos');
    expect(campanha.crescimentoDe('atenas')?.crescimento).toBe(0);
    const povoAntes = campanha.populacaoDe('atenas');
    const tropaAntes = campanha.forcaEm('atenas');

    campanha.passarTurno();

    // Nenhum civil morre; a tropa perde os 5% dela.
    expect(campanha.populacaoDe('atenas')).toBe(povoAntes);
    expect(campanha.fome.provincias).toEqual([]);
    expect(campanha.forcaEm('atenas')).toBe(tropaAntes - Math.floor(tropaAntes * 0.05));
    expect(campanha.fome.tropas).toContainEqual({ poder: 'atenas', homens: 200 });
  });

  it('civil negativo é Fome: morrem as DEPENDENTES, nunca as sustentadoras', () => {
    // O caminho oficial de forjar o cenário: salvar, engordar Atenas, restaurar. Com
    // 90.000 habitantes o nível dela vai a VII e o saldo civil do reino afunda.
    const campanha = nova();
    const salvo = lerSalvamento(campanha.serializar());
    salvo.populacao['atenas'] = 90_000;
    campanha.restaurar(salvo);

    const balanco = campanha.alimentacao;
    expect(balanco.saldoCivil).toBeLessThan(0);
    expect(balanco.categoria).toBe('fome');
    // Atenas (come mais do que planta) depende; Maratona sustenta; Sunião depende.
    expect(campanha.estadoAlimentarLocalEm('atenas')).toBe('dependente');
    expect(campanha.estadoAlimentarLocalEm('maratona')).toBe('sustentadora');
    expect(campanha.estadoAlimentarLocalEm('sounion')).toBe('dependente');

    const atenas = campanha.populacaoDe('atenas');
    const maratona = campanha.populacaoDe('maratona');
    const sounion = campanha.populacaoDe('sounion');
    campanha.passarTurno();

    expect(campanha.populacaoDe('atenas')).toBe(
      atenas - mortosPelaFome(atenas, ajustes.alimento.mortePorFome),
    );
    expect(campanha.populacaoDe('sounion')).toBe(
      sounion - mortosPelaFome(sounion, ajustes.alimento.mortePorFome),
    );
    // Quem planta pra dois não morre porque o vizinho não planta pra um.
    expect(campanha.populacaoDe('maratona')).toBe(maratona);
  });

  it('a leva em formação já come, e a fome a alcança antes de ela virar hoste', () => {
    // ⚠️ É a brecha que a regra fecha: se a leva só contasse ao virar hoste, recrutar na
    // véspera da fome sairia de graça por um turno inteiro.
    const campanha = nova();
    campanha.darOuro(20_000);
    campanha.recrutar('atenas', 4001);

    // Ainda não é hoste — mas já pesa no balanço.
    expect(campanha.forcaEm('atenas')).toBe(0);
    expect(campanha.alimentacao.exercito).toBe(
      custoMilitar(4001, ajustes.alimento.soldadosPorPonto),
    );
    expect(campanha.alimentacao.saldo).toBeLessThan(0);

    campanha.passarTurno();

    const perdidos = mortosPelaFome(4001, ajustes.alimento.mortePorFomeNaTropa);
    expect(perdidos).toBeGreaterThan(0);
    expect(campanha.fome.tropas).toContainEqual({ poder: 'atenas', homens: perdidos });
    // A leva concluiu já desfalcada: a fome cobrou dela, não da população.
    expect(campanha.forcaEm('atenas')).toBe(4001 - perdidos);
  });

  it('a fome reparte as baixas proporcionalmente entre as hostes do poder', () => {
    const campanha = nova();
    campanha.darOuro(200_000);
    campanha.plantarHoste('atenas', 'atenas', 3000);
    campanha.plantarHoste('maratona', 'atenas', 1000);
    expect(campanha.alimentacao.saldo).toBeLessThan(0);

    campanha.passarTurno();

    const total = mortosPelaFome(4000, ajustes.alimento.mortePorFomeNaTropa);
    expect(campanha.fome.tropas).toContainEqual({ poder: 'atenas', homens: total });
    // Cada hoste perde a sua fatia proporcional (a menos do resto do arredondamento):
    // a grande não blinda a pequena nem o contrário, e a soma fecha exata.
    const perdaGrande = 3000 - campanha.forcaEm('atenas');
    const perdaPequena = 1000 - campanha.forcaEm('maratona', 'atenas');
    expect(perdaGrande + perdaPequena).toBe(total);
    expect(perdaGrande).toBeGreaterThanOrEqual(Math.floor((3000 * total) / 4000));
    expect(perdaGrande).toBeLessThanOrEqual(Math.floor((3000 * total) / 4000) + 1);
    expect(perdaPequena).toBeGreaterThanOrEqual(Math.floor((1000 * total) / 4000));
    expect(perdaPequena).toBeLessThanOrEqual(Math.floor((1000 * total) / 4000) + 1);
  });

  it('o cerco zera também os pontos das construções alimentares, não só os da terra', () => {
    const campanha = nova();
    campanha.darOuro(100_000);
    campanha.construir('atenas', 'fazenda');
    const prazo = construcoes.construcoes['fazenda']!.turnos[0];
    for (let i = 0; i < prazo; i++) campanha.passarTurno();
    const comFazenda = campanha.contribuicaoAlimentarEm('atenas');
    expect(comFazenda).toBeGreaterThan(0);

    // A guarnição de Tanagra senta diante de Atenas.
    ordenar(campanha, 'tanagra', 'atenas', 500, 'tanagra', 'sitiar');
    campanha.passarTurno();

    expect(campanha.cercoEm('atenas')).toBeDefined();
    expect(campanha.contribuicaoAlimentarEm('atenas')).toBe(0);
  });

  it('a terra alimenta o dono ATUAL: a conquista move produção e custo de reino', () => {
    const campanha = nova();
    const antes = campanha.alimentacao;
    const producaoDeEleusis = campanha.contribuicaoAlimentarEm('eleusis');
    const custoDeEleusis = campanha.nivelPopulacionalEm('eleusis');
    expect(producaoDeEleusis).toBeGreaterThan(0);

    campanha.trocarDono('eleusis', 'atenas');

    const depois = campanha.alimentacao;
    expect(depois.producao).toBe(antes.producao + producaoDeEleusis);
    expect(depois.populacao).toBe(antes.populacao + custoDeEleusis);
    // Quem perdeu o último chão simulado perde a subsistência — e a tropa que sobrou
    // passa fome no exílio, que é o relógio que a regra da deserção completa.
    expect(campanha.balancoAlimentarDe('eleusis')).toMatchObject({
      subsistencia: 0,
      producao: 0,
      populacao: 0,
      exercito: custoMilitar(campanha.forcaEm('eleusis', 'eleusis'), ajustes.alimento.soldadosPorPonto),
    });
    expect(campanha.balancoAlimentarDe('eleusis').saldo).toBeLessThan(0);
  });

  it('cidade sitiada não fabrica fome nacional: ela sai da conta, e só ela sofre', () => {
    // O critério da auditoria: 500 homens diante de Atenas não podem derrubar o balanço
    // do reino nem derreter o exército do jogador no mapa todo. A sitiada sai da
    // circulação — não contribui, não pesa — e paga só o próprio relógio.
    const campanha = nova();
    campanha.plantarHoste('sounion', 'atenas', 2000);
    campanha.plantarHoste('tanagra', 'tanagra', 500);
    ordenar(campanha, 'tanagra', 'atenas', 500, 'tanagra', 'sitiar');
    campanha.passarTurno(); // o cerco se assenta
    expect(campanha.cercoEm('atenas')).toBeDefined();
    // Sem Atenas na conta: civil = 1 + (3+0) − (1+1) = +2; exército 2 → final 0. NUNCA
    // uma fome nacional falsa por causa do cerco.
    expect(campanha.alimentacao).toMatchObject({
      saldoCivil: 2,
      saldo: 0,
      categoria: 'no-limite',
    });

    // A despensa de Atenas vence...
    for (let i = 0; i < 20 && campanha.fomeDoCercoEm('atenas')?.fomeAtiva === false; i++) {
      campanha.passarTurno();
    }
    const popAtenas = campanha.populacaoDe('atenas');
    const popMaratona = campanha.populacaoDe('maratona');
    const popSounion = campanha.populacaoDe('sounion');

    campanha.passarTurno();

    // ...e quem morre é a cidade sitiada...
    expect(campanha.populacaoDe('atenas')).toBe(
      popAtenas - mortosPelaFome(popAtenas, ajustes.alimento.mortePorFome),
    );
    // ...o resto do reino nem percebe na pele...
    expect(campanha.populacaoDe('maratona')).toBe(popMaratona);
    expect(campanha.populacaoDe('sounion')).toBe(popSounion);
    // ...e o exército longe do cerco não perde um homem.
    expect(campanha.forcaEm('sounion', 'atenas')).toBe(2000);
    expect(campanha.fome.tropas).toEqual([]);
  });

  it('a despensa segura a cidade; vencida, povo e guarnição definham juntos', () => {
    // O caso Mégara com o relógio de Bannerlord num contador só: Salamina alimenta o
    // reino de longe (e NÃO salva a cidade cercada — nenhum celeiro atravessa um cerco),
    // a despensa aguenta alguns turnos, e quando vence a fome cobra povo e guarnição no
    // mesmo turno, todo turno.
    const campanha = nova();
    campanha.darOuro(100_000);
    campanha.plantarHoste('eleusis', 'atenas', 800);
    campanha.trocarDono('eleusis', 'atenas'); // base vizinha para alcançar Mégara
    ordenar(campanha, 'eleusis', 'megara', 800, 'atenas', 'sitiar');
    campanha.passarTurno(); // o cerco se assenta
    expect(campanha.cercoEm('megara')).toBeDefined();
    // O reino de Mégara segue de pé: a cercada saiu da conta e Salamina segue livre.
    expect(campanha.balancoAlimentarDe('megara').saldoCivil).toBeGreaterThanOrEqual(0);

    const guarnicao = campanha.forcaEm('megara', 'megara');
    const populacao = campanha.populacaoDe('megara');
    const salamina = campanha.populacaoDe('salamina');
    expect(guarnicao).toBeGreaterThan(0);
    expect(campanha.mantimentosDeCercoEm('megara')).toBe(
      ajustes.alimento.cerco.mantimentos + 3, // gado II + grãos I: a terra soma na despensa
    );

    // Fase 1 — mantimentos: enquanto a despensa aguenta, ninguém morre.
    for (let i = 0; i < 20 && campanha.fomeDoCercoEm('megara')?.fomeAtiva === false; i++) {
      campanha.passarTurno();
    }
    expect(campanha.populacaoDe('megara')).toBe(populacao);
    expect(campanha.forcaEm('megara', 'megara')).toBe(guarnicao);

    // Fase 2 — a despensa venceu: povo E guarnição caem no mesmo turno.
    campanha.passarTurno();
    expect(campanha.populacaoDe('megara')).toBe(
      populacao - mortosPelaFome(populacao, ajustes.alimento.mortePorFome),
    );
    expect(campanha.forcaEm('megara', 'megara')).toBe(
      guarnicao - mortosPelaFome(guarnicao, ajustes.alimento.mortePorFomeNaTropa),
    );
    // Salamina, livre, não pagou nada por nada disso.
    expect(campanha.populacaoDe('salamina')).toBeGreaterThanOrEqual(salamina);
  });

  it('a despensa deriva da comida da própria terra: Fazenda compra turnos de cerco', () => {
    const campanha = nova();
    // A régua: base do ajuste + contribuição alimentar livre da terra.
    for (const id of ['megara', 'sounion', 'tebas', 'atenas']) {
      expect(campanha.mantimentosDeCercoEm(id), id).toBe(
        ajustes.alimento.cerco.mantimentos + campanha.contribuicaoAlimentarEm(id),
      );
    }
    // E a Fazenda soma: +1 de comida é +1 turno de resistência de cerco.
    campanha.darOuro(100_000);
    const antes = campanha.mantimentosDeCercoEm('atenas');
    campanha.construir('atenas', 'fazenda');
    for (let i = 0; i < construcoes.construcoes['fazenda']!.turnos[0]; i++) campanha.passarTurno();
    expect(campanha.mantimentosDeCercoEm('atenas')).toBe(antes + 1);
  });

  it('a guarnição sitiada definha no fim do relógio, e o sitiante não perde nada nunca', () => {
    const campanha = nova();
    campanha.darOuro(100_000);
    campanha.plantarHoste('atenas', 'atenas', 1000);
    ordenar(campanha, 'atenas', 'eleusis', 1000, 'atenas', 'sitiar');
    campanha.passarTurno(); // Atenas senta diante de Elêusis
    expect(campanha.cercoEm('eleusis')).toBeDefined();

    // O relógio corre até a despensa vencer.
    for (let i = 0; i < 20 && campanha.fomeDoCercoEm('eleusis')?.fomeAtiva === false; i++) {
      campanha.passarTurno();
    }
    const guarnicao = campanha.forcaEm('eleusis', 'eleusis');
    expect(guarnicao).toBeGreaterThan(0);
    campanha.passarTurno();

    const perdidos = mortosPelaFome(guarnicao, ajustes.alimento.mortePorFomeNaTropa);
    expect(campanha.forcaEm('eleusis', 'eleusis')).toBe(guarnicao - perdidos);
    expect(campanha.fome.tropas).toContainEqual({ poder: 'eleusis', homens: perdidos });
    // Quem senta do lado de fora come do próprio reino: intacto do começo ao fim.
    expect(campanha.forcaEm('eleusis', 'atenas')).toBe(1000);
  });

  it('a leva em formação dentro da cidade sitiada também passa fome', () => {
    const campanha = nova();
    campanha.darOuro(100_000);
    campanha.plantarHoste('tanagra', 'tanagra', 500);
    ordenar(campanha, 'tanagra', 'atenas', 500, 'tanagra', 'sitiar');
    campanha.passarTurno();
    expect(campanha.cercoEm('atenas')).toBeDefined();

    // O relógio corre até a despensa vencer...
    for (let i = 0; i < 20 && campanha.fomeDoCercoEm('atenas')?.fomeAtiva === false; i++) {
      campanha.passarTurno();
    }
    campanha.recrutar('atenas', 2000); // sitiada, a cidade ainda levanta gente
    campanha.passarTurno();

    const perdidos = mortosPelaFome(2000, ajustes.alimento.mortePorFomeNaTropa);
    expect(perdidos).toBeGreaterThan(0);
    expect(campanha.fome.tropas).toContainEqual({ poder: 'atenas', homens: perdidos });
    expect(campanha.forcaEm('atenas', 'atenas')).toBe(2000 - perdidos);
  });

  it('o cerco tira a cidade da circulação: nem contribui, nem pesa, nem come da mesa', () => {
    const campanha = nova();
    campanha.darOuro(200_000);
    campanha.dispensar('eleusis', 500);
    campanha.plantarHoste('atenas', 'atenas', 100);
    ordenar(campanha, 'atenas', 'eleusis', 100, 'atenas', 'sitiar');
    campanha.passarTurno();

    expect(campanha.cercoEm('eleusis')).toBeDefined();
    expect(campanha.contribuicaoAlimentarEm('eleusis')).toBe(0);
    expect(campanha.nivelPopulacionalEm('eleusis')).toBe(1);
    // A única província do reino está cercada: a mesa do reino fica VAZIA — sem
    // subsistência, sem produção e sem custo. A cidade vive só da despensa dela.
    expect(campanha.balancoAlimentarDe('eleusis')).toMatchObject({
      subsistencia: 0,
      producao: 0,
      populacao: 0,
      saldoCivil: 0,
      saldo: 0,
      categoria: 'no-limite',
    });
  });
});
