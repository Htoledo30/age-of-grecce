import { describe, expect, it } from 'vitest';

import { exercitoVazio, forcaDe, somarLeva } from '../../src/combate/exercito';
import { resolverRodada } from '../../src/movimento/resolucao/resolver-rodada';
import type { EstadoDaResolucao } from '../../src/movimento/resolucao/relatorio';
import { ajustes, novaCampanha } from '../apoio/mundo';
import { combateComDoisSaltos, em, hoste, mundoDe, tabuleiro } from './apoio';

describe('resolução: partida, chegada, choque', () => {
  it('a origem fica vazia já no passo 1 de uma rota de dois trechos', () => {
    const estado: EstadoDaResolucao = {
      hostes: tabuleiro(hoste('atenas', 'a', 1000)),
      proximaHoste: 90,
      ordens: {
        h_a: { origem: 'a', rota: ['b', 'c'], homens: 1000, postura: 'assaltar' as const, recuarAos: null },
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
      ordens: { h_a: { origem: 'a', rota: ['b'], homens: 500, postura: 'assaltar' as const, recuarAos: null } },
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
        h_a: { origem: 'a', rota: ['c'], homens: 300, postura: 'assaltar' as const, recuarAos: null },
        h_b: { origem: 'b', rota: ['c'], homens: 700, postura: 'assaltar' as const, recuarAos: null },
      },
      surtidas: [],
      cercos: {},
    };
    resolverRodada(estado, ajustes.combate, mundoDe());
    expect(forcaDe(em(estado, 'c'))).toBe(1000);
    // A terra natal de cada um sobrevive à fusão.
    expect(porTerraOuVazio(em(estado, 'c'))).toEqual({ a: 300, b: 700 });
  });

  it('o destacamento leva uma parcela proporcional de cada terra natal', () => {
    const misturada = exercitoVazio('h_a', 'atenas', 'a');
    somarLeva(misturada, 'atenas', 700);
    somarLeva(misturada, 'maratona', 300);
    const estado: EstadoDaResolucao = {
      hostes: tabuleiro(misturada),
      proximaHoste: 90,
      ordens: { h_a: { origem: 'a', rota: ['b'], homens: 500, postura: 'assaltar' as const, recuarAos: null } },
      surtidas: [],
      cercos: {},
    };
    resolverRodada(estado, ajustes.combate, mundoDe());
    // Metade de cada, não 500 da primeira da lista: a ordem das levas não pode virar regra.
    expect(porTerraOuVazio(em(estado, 'b'))).toEqual({ atenas: 350, maratona: 150 });
    expect(porTerraOuVazio(em(estado, 'a'))).toEqual({ atenas: 350, maratona: 150 });
  });

  it('ordem cuja hoste sumiu antes da virada simplesmente não marcha', () => {
    const estado: EstadoDaResolucao = {
      hostes: tabuleiro(),
      proximaHoste: 90,
      ordens: { h_a: { origem: 'a', rota: ['b'], homens: 500, postura: 'assaltar' as const, recuarAos: null } },
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
        h_a: { origem: 'a', rota: ['b', 'c'], homens: 400, postura: 'assaltar' as const, recuarAos: null },
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
        recuarAos: null,
        },
        h_abido: { origem: 'abido', rota: ['meio'], homens: 700, postura: 'assaltar' as const, recuarAos: null },
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
        recuarAos: null,
        },
        h_abido: { origem: 'abido', rota: ['meio'], homens: 700, postura: 'assaltar' as const, recuarAos: null },
      },
      surtidas: [],
      cercos: {},
    };
    const invertido: EstadoDaResolucao = {
      hostes: tabuleiro(hoste('atenas', 'abido', 700), hoste('atenas', 'zacinto', 300)),
      proximaHoste: 90,
      ordens: {
        h_abido: { origem: 'abido', rota: ['meio'], homens: 700, postura: 'assaltar' as const, recuarAos: null },
        h_zacinto: {
          origem: 'zacinto',
          rota: ['meio'],
          homens: 300,
          postura: 'assaltar' as const,
        recuarAos: null,
        },
      },
      surtidas: [],
      cercos: {},
    };
    expect(resolverRodada(primeiro, ajustes.combate, mundoDe())).toEqual(
      resolverRodada(invertido, ajustes.combate, mundoDe()),
    );
    expect(porTerraOuVazio(em(primeiro, 'meio'))).toEqual(porTerraOuVazio(em(invertido, 'meio')));
  });
});

/** `porTerra` tolerando hoste ausente: o teste falha na asserção, não num `undefined`. */
function porTerraOuVazio(e: { contingentes: readonly { terra: string; homens: number }[] } | undefined) {
  const conta: Record<string, number> = {};
  for (const c of e?.contingentes ?? []) conta[c.terra] = (conta[c.terra] ?? 0) + c.homens;
  return conta;
}

describe('sair de campo acaba a batalha, não começa outra', () => {
  it('quem recua sai do lugar e NÃO é emparelhado de novo na mesma rodada', () => {
    // ⚠️ O defeito das onze batalhas numa província, pelo caminho do recuo. A lista de
    // presentes é agrupada por província UMA vez, antes do laço; quem recua muda de posição
    // mas continua nela. Sem reconferir a posição, 900 homens saíam de Elêusis e apanhavam
    // três vezes seguidas — e a ordem "Poupar o exército" entregava ao inimigo três batalhas
    // em vez de uma, que é o oposto do que ela promete.
    const c = novaCampanha();
    c.comecar('atenas');
    c.darOuro(400_000);
    c.plantarHoste('atenas', 'atenas', 900);
    c.plantarHoste('eleusis', 'eleusis', 1400);
    const minha = c.hostesEm('atenas').find((h) => h.poder === 'atenas');
    expect(minha).toBeDefined();
    c.ordenarMarcha(
      minha!.id,
      'eleusis',
      900,
      'atenas',
      'assaltar',
      ajustes.combate.batalha.limiarDeRecuo,
    );
    c.passarTurno();

    const emEleusis = c.rodada.batalhas.filter((b) => b.provincia === 'eleusis');
    expect(emEleusis).toHaveLength(1);
    expect(emEleusis[0]?.desfecho).not.toBe('quebrou');
    // E o exército continua existindo, que é a promessa inteira da ordem.
    expect(c.forcaEm('atenas', 'atenas')).toBeGreaterThan(0);
  });

  it('o assalto rechaçado devolve os sobreviventes à terra natal', () => {
    // ⚠️ A hoste acaba; os homens, não. Era a única regra do jogo que o assalto não seguia:
    // quem sobrevivia à contra-investida não morria na conta e não voltava para a população.
    const c = novaCampanha();
    c.comecar('atenas');
    c.darOuro(400_000);
    c.plantarHoste('atenas', 'atenas', 150);
    const minha = c.hostesEm('atenas').find((h) => h.poder === 'atenas');
    c.ordenarMarcha(minha!.id, 'eleusis', 150, 'atenas', 'assaltar');

    const semAssalto = novaCampanha();
    semAssalto.comecar('atenas');
    semAssalto.passarTurno();
    const crescimentoLimpo = semAssalto.populacaoDe('atenas');

    c.passarTurno();
    const assalto = c.rodada.batalhas.find((b) => b.tipo === 'assalto');
    expect(assalto?.vencedor).toBe('eleusis');
    // A hoste se desfaz diante da muralha — isso continua valendo.
    expect(c.hostesEm('atenas')).toHaveLength(0);
    // Mas quem escapou voltou para casa: a população de Atenas passou do crescimento normal.
    expect(c.populacaoDe('atenas')).toBeGreaterThan(crescimentoLimpo);
  });
});
