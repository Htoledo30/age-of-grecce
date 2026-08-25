import { describe, expect, it } from 'vitest';

import { lado, resolverBatalha } from '../../src/combate/batalha';
import { forcaDe } from '../../src/combate/exercito';
import { resolverRodada } from '../../src/movimento/resolucao/resolver-rodada';
import type { EstadoDaResolucao } from '../../src/movimento/resolucao/relatorio';
import { ajustes } from '../apoio/mundo';
import { em, hoste, mundoDe, tabuleiro } from './apoio';

/** Quantos sobram do vencedor quando A homens enfrentam B. Perguntado à regra. */
const vencemDe = (a: number, b: number): number => {
  // `'b'` como desempate: aqui só interessa o número do vencedor claro, e A é sempre o maior
  // nestes casos — quem leva o empate nunca entra na conta.
  const r = resolverBatalha(lado(a), lado(b), ajustes.combate.batalha, 'b');
  return r.vencedor === 'a' ? r.sobreviventesA : r.sobreviventesB;
};

/**
 * ⚠️ O bloco "a lei quadrada" morreu aqui, junto com `√(maior² − menor²)`.
 *
 * Aqueles testes cravavam os números dela — 1.000 × 900 dando 436 sobreviventes — e esse era
 * o ponto: quando o cálculo foi trocado por choque e perseguição, foram eles que gritaram, e
 * foi assim que eu soube que a troca aconteceu de verdade em vez de ficar atrás de uma
 * bifurcação esquecida. A forma nova da batalha é guardada em `combate/batalha.test.ts`.
 *
 * O que sobrou aqui é a ADJUDICAÇÃO, que não mudou: quem luta contra quem, em que ordem, e
 * quem fica com a província no fim. Os números de sobreviventes agora vêm da própria regra —
 * cravá-los foi o que fez este arquivo quebrar inteiro por uma troca que não era dele.
 */

describe('adjudicação: os seis casos da tabela', () => {
  it('caso 1 — quem se cruza na estrada batalha, e o vencedor SEGUE e toma o destino', () => {
    const mundo = mundoDe({ x: 'a', y: 'b' });
    const estado: EstadoDaResolucao = {
      hostes: tabuleiro(hoste('a', 'x', 1000), hoste('b', 'y', 600)),
      proximaHoste: 90,
      ordens: {
        h_x: { origem: 'x', rota: ['y'], homens: 1000, postura: 'assaltar' as const, recuarAos: null },
        h_y: { origem: 'y', rota: ['x'], homens: 600, postura: 'assaltar' as const, recuarAos: null },
      },
      surtidas: [],
      cercos: {},
    };
    const r = resolverRodada(estado, ajustes.combate, mundo);

    // A batalha não tem lugar: `provincia` é null. O número de sobreviventes sai da
    // regra, não deste arquivo — ele é balanço e já mudou uma vez.
    expect(r.batalhas).toHaveLength(1);
    expect(r.batalhas[0]).toMatchObject({
      // `tipo: 'estrada'` é o que a crônica lê para escrever "Encontro na estrada" em vez
      // de "Batalha em" — esta é a única batalha do jogo sem lugar.
      provincia: null,
      vencedor: 'a',
      perdedores: ['b'],
      sobreviventes: vencemDe(1000, 600),
      tipo: 'estrada',
    });
    // A lista de rounds viaja no relatório para a janela poder reproduzir a batalha — e ela
    // vem SEMPRE, mesmo nesta, que ninguém vai assistir.
    expect(r.batalhas[0]!.rounds.length).toBeGreaterThan(0);
    expect(r.batalhas[0]!.lados.map((l) => l.poder)).toEqual(['a', 'b']);
    expect(forcaDe(em(estado, 'y'))).toBe(vencemDe(1000, 600));
    expect(em(estado, 'x')).toBeUndefined();
    expect(mundo.donoDe('y')).toBe('a'); // seguiu e conquistou
  });

  it('caso 2 — dois que chegam na mesma província se enfrentam sem defensor', () => {
    const mundo = mundoDe({ x: 'a', y: 'b', z: 'c' });
    const estado: EstadoDaResolucao = {
      hostes: tabuleiro(hoste('a', 'x', 1000), hoste('b', 'y', 600)),
      proximaHoste: 90,
      ordens: {
        h_x: { origem: 'x', rota: ['z'], homens: 1000, postura: 'assaltar' as const, recuarAos: null },
        h_y: { origem: 'y', rota: ['z'], homens: 600, postura: 'assaltar' as const, recuarAos: null },
      },
      surtidas: [],
      cercos: {},
    };
    const r = resolverRodada(estado, ajustes.combate, mundo);

    expect(r.batalhas[0]).toMatchObject({
      provincia: 'z',
      vencedor: 'a',
      sobreviventes: vencemDe(1000, 600),
    });
    expect(mundo.donoDe('z')).toBe('a');
  });

  it('caso 3 — província esvaziada na partida cai sem batalha', () => {
    const mundo = mundoDe({ x: 'a', z: 'b' });
    const estado: EstadoDaResolucao = {
      hostes: tabuleiro(hoste('a', 'x', 1000), hoste('b', 'z', 500)),
      proximaHoste: 90,
      ordens: {
        h_x: { origem: 'x', rota: ['w'], homens: 1000, postura: 'assaltar' as const, recuarAos: null }, // sai de casa inteiro
        h_z: { origem: 'z', rota: ['x'], homens: 500, postura: 'assaltar' as const, recuarAos: null },
      },
      surtidas: [],
      cercos: {},
    };
    const r = resolverRodada(estado, ajustes.combate, mundo);

    // Fronteira desprotegida é risco real, não vantagem de interface.
    expect(r.batalhas).toEqual([]);
    expect(mundo.donoDe('x')).toBe('b');
    expect(forcaDe(em(estado, 'x'))).toBe(500);
  });

  it('caso 4 — encontro no meio da rota cancela o percurso dos DOIS', () => {
    const mundo = mundoDe({ x: 'a', y: 'b', w: 'c', z: 'c' });
    const estado: EstadoDaResolucao = {
      hostes: tabuleiro(hoste('a', 'x', 1000), hoste('b', 'y', 600)),
      proximaHoste: 90,
      ordens: {
        h_x: { origem: 'x', rota: ['w', 'z'], homens: 1000, postura: 'assaltar' as const, recuarAos: null }, // ia até z
        h_y: { origem: 'y', rota: ['w'], homens: 600, postura: 'assaltar' as const, recuarAos: null },
      },
      surtidas: [],
      cercos: {},
    };
    const r = resolverRodada(estado, ajustes.combate, mundo);

    expect(r.batalhas[0]).toMatchObject({
      provincia: 'w',
      vencedor: 'a',
      sobreviventes: vencemDe(1000, 600),
    });
    // Parou em w. Não chegou em z — ao contrário do encontro na estrada, aqui existe lugar
    // onde ficar.
    expect(forcaDe(em(estado, 'w'))).toBe(vencemDe(1000, 600));
    expect(em(estado, 'z')).toBeUndefined();
    expect(mundo.donoDe('z')).toBe('c');
  });

  it('caso 5 — três no mesmo destino resolvem aos pares, da maior força pra menor', () => {
    const mundo = mundoDe({ x: 'a', y: 'b', k: 'c', z: 'd' });
    const estado: EstadoDaResolucao = {
      hostes: tabuleiro(hoste('a', 'x', 1000), hoste('b', 'y', 600), hoste('c', 'k', 300)),
      proximaHoste: 90,
      ordens: {
        h_x: { origem: 'x', rota: ['z'], homens: 1000, postura: 'assaltar' as const, recuarAos: null },
        h_y: { origem: 'y', rota: ['z'], homens: 600, postura: 'assaltar' as const, recuarAos: null },
        h_k: { origem: 'k', rota: ['z'], homens: 300, postura: 'assaltar' as const, recuarAos: null },
      },
      surtidas: [],
      cercos: {},
    };
    const r = resolverRodada(estado, ajustes.combate, mundo);

    // Resolve aos pares: o maior contra o segundo, e o que sobrar contra o terceiro.
    expect(r.batalhas).toHaveLength(2);
    const depoisDoPrimeiro = vencemDe(1000, 600);
    const depoisDoSegundo = vencemDe(depoisDoPrimeiro, 300);
    expect(r.batalhas[0]).toMatchObject({
      vencedor: 'a',
      perdedores: ['b'],
      sobreviventes: depoisDoPrimeiro,
    });
    expect(r.batalhas[1]).toMatchObject({
      vencedor: 'a',
      perdedores: ['c'],
      sobreviventes: depoisDoSegundo,
    });
    expect(forcaDe(em(estado, 'z'))).toBe(depoisDoSegundo);
  });

  it('caso 6 — o reforço CHEGA a tempo de defender', () => {
    const mundo = mundoDe({ x: 'a', y: 'a', z: 'b' });
    const estado: EstadoDaResolucao = {
      hostes: tabuleiro(hoste('a', 'y', 300), hoste('a', 'x', 700), hoste('b', 'z', 800)),
      proximaHoste: 90,
      ordens: {
        h_x: { origem: 'x', rota: ['y'], homens: 700, postura: 'assaltar' as const, recuarAos: null },
        h_z: { origem: 'z', rota: ['y'], homens: 800, postura: 'assaltar' as const, recuarAos: null },
      },
      surtidas: [],
      cercos: {},
    };
    const r = resolverRodada(estado, ajustes.combate, mundo);

    // 300 + 700 = 1.000 contra 800. Sem o reforço chegar junto, 300 contra 800 seria
    // derrota — é exatamente a justiça que a simultaneidade dá.
    const sobrevivem = vencemDe(1000, 800);
    expect(r.batalhas[0]).toMatchObject({
      provincia: 'y',
      vencedor: 'a',
      sobreviventes: sobrevivem,
    });
    expect(mundo.donoDe('y')).toBe('a');
    expect(forcaDe(em(estado, 'y'))).toBe(sobrevivem);
  });
});

describe('conquista', () => {
  it('província inimiga vazia cai sem batalha nenhuma', () => {
    const mundo = mundoDe({ x: 'a', y: 'b' });
    const estado: EstadoDaResolucao = {
      hostes: tabuleiro(hoste('a', 'x', 100)),
      proximaHoste: 90,
      ordens: { h_x: { origem: 'x', rota: ['y'], homens: 100, postura: 'assaltar' as const, recuarAos: null } },
      surtidas: [],
      cercos: {},
    };
    const r = resolverRodada(estado, ajustes.combate, mundo);
    expect(r.batalhas).toEqual([]);
    expect(r.conquistas).toEqual([{ provincia: 'y', de: 'b', para: 'a' }]);
  });

  it('quem só passa pela própria terra não conquista nada', () => {
    const mundo = mundoDe({ x: 'a', y: 'a' });
    const estado: EstadoDaResolucao = {
      hostes: tabuleiro(hoste('a', 'x', 100)),
      proximaHoste: 90,
      ordens: { h_x: { origem: 'x', rota: ['y'], homens: 100, postura: 'assaltar' as const, recuarAos: null } },
      surtidas: [],
      cercos: {},
    };
    expect(resolverRodada(estado, ajustes.combate, mundo).conquistas).toEqual([]);
  });

  it('forças iguais: o DONO segura o chão, e o invasor é perseguido', () => {
    const mundo = mundoDe({ x: 'a', y: 'b' });
    const estado: EstadoDaResolucao = {
      hostes: tabuleiro(hoste('a', 'x', 500), hoste('b', 'y', 500)),
      proximaHoste: 90,
      ordens: { h_x: { origem: 'x', rota: ['y'], homens: 500, postura: 'assaltar' as const, recuarAos: null } },
      surtidas: [],
      cercos: {},
    };
    const r = resolverRodada(estado, ajustes.combate, mundo);
    // ⚠️ Chamava-se "aniquilamento mútuo": a lei quadrada apagava os dois exércitos. Depois
    // virou empate com os dois de pé, e aí o jogo não saía do lugar — brigavam de novo toda
    // rodada, para sempre. Agora **não existe empate**: quem ataca precisa vencer, e barrar o
    // invasor é a vitória de quem segura o chão.
    expect(r.batalhas).toHaveLength(1);
    expect(r.batalhas[0]).toMatchObject({ provincia: 'y', vencedor: 'b', perdedores: ['a'] });
    const presentes = Object.values(estado.hostes).filter((h) => h.posicao === 'y');
    expect(presentes.map((h) => h.poder)).toEqual(['b']); // o invasor foi perseguido e sumiu
    expect(forcaDe(presentes[0])).toBeGreaterThan(0);
    expect(mundo.donoDe('y')).toBe('b'); // continua de quem era
  });
});
