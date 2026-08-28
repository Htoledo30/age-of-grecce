import { describe, expect, it } from 'vitest';

import { custoMilitar, mortosPelaFome } from '../../src/producao/alimentacao';
import { ordenar } from '../apoio/hostes';
import { ajustes, construcoes } from '../apoio/mundo';
import { nova, novaFarta } from './apoio';

describe('a cidade sitiada vive da própria despensa, fora da circulação', () => {
  it('o cerco zera também os pontos das construções alimentares, não só os da terra', () => {
    const campanha = nova();
    campanha.darOuro(100_000);
    campanha.construir('atenas', 'fazenda');
    const prazo = construcoes.construcoes['fazenda']!.turnos[0];
    for (let i = 0; i < prazo; i++) campanha.passarTurno();
    const comFazenda = campanha.contribuicaoAlimentarEm('atenas');
    expect(comFazenda).toBeGreaterThan(0);

    // A guarnição de Tanagra senta diante de Atenas.
    campanha.plantarHoste('tanagra', 'tanagra', 500);
    ordenar(campanha, 'tanagra', 'atenas', 500, 'tanagra', 'sitiar');
    campanha.passarTurno();

    expect(campanha.cercoEm('atenas')).toBeDefined();
    expect(campanha.contribuicaoAlimentarEm('atenas')).toBe(0);
  });

  it('a terra alimenta o dono ATUAL: a conquista move produção e custo de reino', () => {
    const campanha = nova();
    // A tropa exilada de que este teste fala: sem ela, o poder sem chão fica com saldo
    // zero e não há fome nenhuma para medir.
    campanha.plantarHoste('eleusis', 'eleusis', 500);
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
    // ⚠️ A hoste é do TAMANHO DE UM PONTO de comida, e não um número redondo: ela está aqui
    // para o exército aparecer na conta (`saldo = saldoCivil − exercito`), não para derrubá-la.
    // Escrita como 2.000 fixos, ela quebrava no dia em que um ponto passou a sustentar 500
    // homens em vez de 3.000 — e quebrava por fome nacional, que é exatamente o que este teste
    // afirma não acontecer.
    campanha.plantarHoste('sounion', 'atenas', ajustes.alimento.soldadosPorPonto);
    campanha.plantarHoste('tanagra', 'tanagra', 500);
    ordenar(campanha, 'tanagra', 'atenas', 500, 'tanagra', 'sitiar');
    campanha.passarTurno(); // o cerco se assenta
    expect(campanha.cercoEm('atenas')).toBeDefined();
    // Sem Atenas na conta: sobram Maratona e Sunião. O saldo civil é positivo e o final
    // desconta o exército — o que NUNCA acontece é uma fome nacional falsa pelo cerco.
    const comida = campanha.alimentacao;
    expect(comida.saldoCivil).toBeGreaterThan(0);
    expect(comida.saldo).toBe(comida.saldoCivil - comida.exercito);
    expect(comida.saldo).toBeGreaterThanOrEqual(0);
    expect(comida.categoria).not.toBe('fome');

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
    // ...o resto do reino nem percebe na pele: ninguém lá fora PERDE gente. Com a mesa do
    // reino no positivo essas terras até crescem — o que importa é que a fome do cerco não
    // atravessa a muralha.
    expect(campanha.populacaoDe('maratona')).toBeGreaterThanOrEqual(popMaratona);
    expect(campanha.populacaoDe('sounion')).toBeGreaterThanOrEqual(popSounion);
    // ...e o exército longe do cerco não perde um homem.
    expect(campanha.forcaEm('sounion', 'atenas')).toBe(ajustes.alimento.soldadosPorPonto);
    expect(campanha.fome.tropas).toEqual([]);
  });

  it('a despensa segura a cidade; vencida, povo e guarnição definham juntos', () => {
    // O caso Mégara com o relógio de Bannerlord num contador só: Salamina alimenta o
    // reino de longe (e NÃO salva a cidade cercada — nenhum celeiro atravessa um cerco),
    // a despensa aguenta alguns turnos, e quando vence a fome cobra povo e guarnição no
    // mesmo turno, todo turno.
    const campanha = nova();
    campanha.darOuro(100_000);
    campanha.plantarHoste('megara', 'megara', 500); // a defensora de que este teste fala
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
    // ⚠️ `novaFarta`: aqui o assunto é o relógio da praça, e a fome NACIONAL só faria o
    // sitiante encolher por outro motivo — arruinando a última linha, que é o ponto do teste.
    const campanha = novaFarta();
    campanha.darOuro(100_000);
    campanha.plantarHoste('eleusis', 'eleusis', 500); // a guarnição que vai definhar
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
    campanha.plantarHoste('atenas', 'atenas', 100);
    ordenar(campanha, 'atenas', 'eleusis', 100, 'atenas', 'sitiar');
    campanha.passarTurno();

    expect(campanha.cercoEm('eleusis')).toBeDefined();
    expect(campanha.contribuicaoAlimentarEm('eleusis')).toBe(0);
    expect(campanha.nivelPopulacionalEm('eleusis')).toBeGreaterThan(0);
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
