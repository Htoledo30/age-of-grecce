import { describe, expect, it } from 'vitest';

import { exercitoVazio, forcaDe, somarLeva } from '../../src/combate/exercito';
import { resolverRodada } from '../../src/movimento/resolucao/resolver-rodada';
import type { EstadoDaResolucao } from '../../src/movimento/resolucao/relatorio';
import { ajustes } from '../apoio/mundo';
import { combateComDoisSaltos, em, hoste, mundoDe, tabuleiro } from './apoio';

describe('resolução: partida, chegada, choque', () => {
  it('a origem fica vazia já no passo 1 de uma rota de dois trechos', () => {
    const estado: EstadoDaResolucao = {
      hostes: tabuleiro(hoste('atenas', 'a', 1000)),
      proximaHoste: 90,
      ordens: {
        h_a: { origem: 'a', rota: ['b', 'c'], homens: 1000, postura: 'assaltar' as const },
      },
      surtidas: [],
      cercos: {},
    };
    resolverRodada(estado, combateComDoisSaltos, mundoDe());
    // Quem manda a guarnição inteira embora deixa a casa aberta desde o primeiro instante.
    expect(em(estado, 'a')).toBeUndefined();
    expect(forcaDe(em(estado, 'c'))).toBe(1000);
    expect(em(estado, 'b')).toBeUndefined(); // passou, não ficou
  });

  it('uma rota de um trecho não participa do passo 2', () => {
    const estado: EstadoDaResolucao = {
      hostes: tabuleiro(hoste('atenas', 'a', 500)),
      proximaHoste: 90,
      ordens: { h_a: { origem: 'a', rota: ['b'], homens: 500, postura: 'assaltar' as const } },
      surtidas: [],
      cercos: {},
    };
    resolverRodada(estado, ajustes.combate, mundoDe());
    expect(forcaDe(em(estado, 'b'))).toBe(500);
  });

  it('duas hostes do mesmo poder que chegam juntas viram uma', () => {
    const estado: EstadoDaResolucao = {
      hostes: tabuleiro(hoste('atenas', 'a', 300), hoste('atenas', 'b', 700)),
      proximaHoste: 90,
      ordens: {
        h_a: { origem: 'a', rota: ['c'], homens: 300, postura: 'assaltar' as const },
        h_b: { origem: 'b', rota: ['c'], homens: 700, postura: 'assaltar' as const },
      },
      surtidas: [],
      cercos: {},
    };
    resolverRodada(estado, ajustes.combate, mundoDe());
    expect(forcaDe(em(estado, 'c'))).toBe(1000);
    // A terra natal de cada um sobrevive à fusão.
    expect(em(estado, 'c')?.origem).toEqual({ a: 300, b: 700 });
  });

  it('o destacamento leva uma parcela proporcional de cada terra natal', () => {
    const misturada = exercitoVazio('h_a', 'atenas', 'a');
    somarLeva(misturada, 'atenas', 700);
    somarLeva(misturada, 'maratona', 300);
    const estado: EstadoDaResolucao = {
      hostes: tabuleiro(misturada),
      proximaHoste: 90,
      ordens: { h_a: { origem: 'a', rota: ['b'], homens: 500, postura: 'assaltar' as const } },
      surtidas: [],
      cercos: {},
    };
    resolverRodada(estado, ajustes.combate, mundoDe());
    // Metade de cada, não 500 da primeira da lista: a ordem das levas não pode virar regra.
    expect(em(estado, 'b')?.origem).toEqual({ atenas: 350, maratona: 150 });
    expect(em(estado, 'a')?.origem).toEqual({ atenas: 350, maratona: 150 });
  });

  it('ordem cuja hoste sumiu antes da virada simplesmente não marcha', () => {
    const estado: EstadoDaResolucao = {
      hostes: tabuleiro(),
      proximaHoste: 90,
      ordens: { h_a: { origem: 'a', rota: ['b'], homens: 500, postura: 'assaltar' as const } },
      surtidas: [],
      cercos: {},
    };
    expect(() => resolverRodada(estado, ajustes.combate, mundoDe())).not.toThrow();
    expect(em(estado, 'b')).toBeUndefined();
  });

  it('o relatório diz de onde saiu, onde parou e QUEM andou', () => {
    const estado: EstadoDaResolucao = {
      hostes: tabuleiro(hoste('atenas', 'a', 1000)),
      proximaHoste: 90,
      ordens: {
        h_a: { origem: 'a', rota: ['b', 'c'], homens: 400, postura: 'assaltar' as const },
      },
      surtidas: [],
      cercos: {},
    };
    const r = resolverRodada(estado, combateComDoisSaltos, mundoDe());
    // ⚠️ O id vem junto, e não é o da hoste que ficou: destacar 400 dos 1.000 cria uma
    // hoste NOVA, e é ela que parou em `c`. Sem esse campo, quem anima a marcha teria de
    // deduzir a peça pela província de chegada — que deixou de identificar uma hoste no
    // dia em que duas passaram a poder parar no mesmo lugar.
    expect(r.marchas).toEqual([{ hoste: 'h90', trilha: ['a', 'b', 'c'], homens: 400 }]);
  });
});

describe('determinismo — a exigência que não é opcional', () => {
  it('a mesma rodada resolvida duas vezes dá o mesmo resultado', () => {
    const montar = (): EstadoDaResolucao => ({
      hostes: tabuleiro(hoste('atenas', 'zacinto', 300), hoste('atenas', 'abido', 700)),
      proximaHoste: 90,
      ordens: {
        h_zacinto: {
          origem: 'zacinto',
          rota: ['meio'],
          homens: 300,
          postura: 'assaltar' as const,
        },
        h_abido: { origem: 'abido', rota: ['meio'], homens: 700, postura: 'assaltar' as const },
      },
      surtidas: [],
      cercos: {},
    });
    const uma = montar();
    const outra = montar();
    expect(resolverRodada(uma, ajustes.combate, mundoDe())).toEqual(
      resolverRodada(outra, ajustes.combate, mundoDe()),
    );
    expect(uma.hostes).toEqual(outra.hostes);
  });

  it('a ordem de inserção no registro não muda o resultado', () => {
    // `Object.entries` devolve as chaves na ordem de criação. Se a resolução percorresse
    // isso cru, o resultado passaria a depender de quem foi recrutado primeiro.
    const primeiro: EstadoDaResolucao = {
      hostes: tabuleiro(hoste('atenas', 'zacinto', 300), hoste('atenas', 'abido', 700)),
      proximaHoste: 90,
      ordens: {
        h_zacinto: {
          origem: 'zacinto',
          rota: ['meio'],
          homens: 300,
          postura: 'assaltar' as const,
        },
        h_abido: { origem: 'abido', rota: ['meio'], homens: 700, postura: 'assaltar' as const },
      },
      surtidas: [],
      cercos: {},
    };
    const invertido: EstadoDaResolucao = {
      hostes: tabuleiro(hoste('atenas', 'abido', 700), hoste('atenas', 'zacinto', 300)),
      proximaHoste: 90,
      ordens: {
        h_abido: { origem: 'abido', rota: ['meio'], homens: 700, postura: 'assaltar' as const },
        h_zacinto: {
          origem: 'zacinto',
          rota: ['meio'],
          homens: 300,
          postura: 'assaltar' as const,
        },
      },
      surtidas: [],
      cercos: {},
    };
    expect(resolverRodada(primeiro, ajustes.combate, mundoDe())).toEqual(
      resolverRodada(invertido, ajustes.combate, mundoDe()),
    );
    expect(em(primeiro, 'meio')?.origem).toEqual(em(invertido, 'meio')?.origem);
  });
});
