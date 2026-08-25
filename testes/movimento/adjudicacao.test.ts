import { describe, expect, it } from 'vitest';

import { resolverChoque } from '../../src/combate/batalha';
import { forcaDe } from '../../src/combate/exercito';
import { resolverRodada } from '../../src/movimento/resolucao/resolver-rodada';
import type { EstadoDaResolucao } from '../../src/movimento/resolucao/relatorio';
import { ajustes } from '../apoio/mundo';
import { em, hoste, mundoDe, tabuleiro } from './apoio';

describe('a lei quadrada: vitória apertada custa caro', () => {
  it('sobreviventes = raiz de (maior² − menor²)', () => {
    expect(resolverChoque(1000, 900)).toEqual({ vencedor: 'a', sobreviventes: 436 });
    expect(resolverChoque(1000, 500)).toEqual({ vencedor: 'a', sobreviventes: 866 });
    expect(resolverChoque(1000, 200)).toEqual({ vencedor: 'a', sobreviventes: 980 });
    expect(resolverChoque(200, 1000)).toEqual({ vencedor: 'b', sobreviventes: 980 });
  });

  it('forças iguais se aniquilam, e ninguém fica com a província', () => {
    expect(resolverChoque(500, 500)).toEqual({ vencedor: null, sobreviventes: 0 });
  });

  it('quem vence nunca termina com zero em pé', () => {
    // Sem o piso de 1, a província ficaria vazia e o resultado leria como aniquilamento
    // mútuo, que é outra coisa.
    expect(resolverChoque(1000, 999).sobreviventes).toBeGreaterThan(0);
  });
});

describe('adjudicação: os seis casos da tabela', () => {
  it('caso 1 — quem se cruza na estrada batalha, e o vencedor SEGUE e toma o destino', () => {
    const mundo = mundoDe({ x: 'a', y: 'b' });
    const estado: EstadoDaResolucao = {
      hostes: tabuleiro(hoste('a', 'x', 1000), hoste('b', 'y', 600)),
      proximaHoste: 90,
      ordens: {
        h_x: { origem: 'x', rota: ['y'], homens: 1000, postura: 'assaltar' as const },
        h_y: { origem: 'y', rota: ['x'], homens: 600, postura: 'assaltar' as const },
      },
      surtidas: [],
      cercos: {},
    };
    const r = resolverRodada(estado, ajustes.combate, mundo);

    // 1.000 × 600 → 800 sobrevivem. E a batalha não tem lugar: `provincia` é null.
    expect(r.batalhas).toEqual([
      // `tipo: 'estrada'` é o que a crônica lê para escrever "Encontro na estrada" em vez
      // de "Batalha em" — esta é a única batalha do jogo sem lugar.
      { provincia: null, vencedor: 'a', perdedores: ['b'], sobreviventes: 800, tipo: 'estrada' },
    ]);
    expect(forcaDe(em(estado, 'y'))).toBe(800);
    expect(em(estado, 'x')).toBeUndefined();
    expect(mundo.donoDe('y')).toBe('a'); // seguiu e conquistou
  });

  it('caso 2 — dois que chegam na mesma província se enfrentam sem defensor', () => {
    const mundo = mundoDe({ x: 'a', y: 'b', z: 'c' });
    const estado: EstadoDaResolucao = {
      hostes: tabuleiro(hoste('a', 'x', 1000), hoste('b', 'y', 600)),
      proximaHoste: 90,
      ordens: {
        h_x: { origem: 'x', rota: ['z'], homens: 1000, postura: 'assaltar' as const },
        h_y: { origem: 'y', rota: ['z'], homens: 600, postura: 'assaltar' as const },
      },
      surtidas: [],
      cercos: {},
    };
    const r = resolverRodada(estado, ajustes.combate, mundo);

    expect(r.batalhas[0]).toMatchObject({ provincia: 'z', vencedor: 'a', sobreviventes: 800 });
    expect(mundo.donoDe('z')).toBe('a');
  });

  it('caso 3 — província esvaziada na partida cai sem batalha', () => {
    const mundo = mundoDe({ x: 'a', z: 'b' });
    const estado: EstadoDaResolucao = {
      hostes: tabuleiro(hoste('a', 'x', 1000), hoste('b', 'z', 500)),
      proximaHoste: 90,
      ordens: {
        h_x: { origem: 'x', rota: ['w'], homens: 1000, postura: 'assaltar' as const }, // sai de casa inteiro
        h_z: { origem: 'z', rota: ['x'], homens: 500, postura: 'assaltar' as const },
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
        h_x: { origem: 'x', rota: ['w', 'z'], homens: 1000, postura: 'assaltar' as const }, // ia até z
        h_y: { origem: 'y', rota: ['w'], homens: 600, postura: 'assaltar' as const },
      },
      surtidas: [],
      cercos: {},
    };
    const r = resolverRodada(estado, ajustes.combate, mundo);

    expect(r.batalhas[0]).toMatchObject({ provincia: 'w', vencedor: 'a', sobreviventes: 800 });
    // Parou em w. Não chegou em z — ao contrário do encontro na estrada, aqui existe lugar
    // onde ficar.
    expect(forcaDe(em(estado, 'w'))).toBe(800);
    expect(em(estado, 'z')).toBeUndefined();
    expect(mundo.donoDe('z')).toBe('c');
  });

  it('caso 5 — três no mesmo destino resolvem aos pares, da maior força pra menor', () => {
    const mundo = mundoDe({ x: 'a', y: 'b', k: 'c', z: 'd' });
    const estado: EstadoDaResolucao = {
      hostes: tabuleiro(hoste('a', 'x', 1000), hoste('b', 'y', 600), hoste('c', 'k', 300)),
      proximaHoste: 90,
      ordens: {
        h_x: { origem: 'x', rota: ['z'], homens: 1000, postura: 'assaltar' as const },
        h_y: { origem: 'y', rota: ['z'], homens: 600, postura: 'assaltar' as const },
        h_k: { origem: 'k', rota: ['z'], homens: 300, postura: 'assaltar' as const },
      },
      surtidas: [],
      cercos: {},
    };
    const r = resolverRodada(estado, ajustes.combate, mundo);

    // 1.000 × 600 → 800; depois 800 × 300 → 742.
    expect(r.batalhas).toHaveLength(2);
    expect(r.batalhas[0]).toMatchObject({ vencedor: 'a', perdedores: ['b'], sobreviventes: 800 });
    expect(r.batalhas[1]).toMatchObject({ vencedor: 'a', perdedores: ['c'], sobreviventes: 742 });
    expect(forcaDe(em(estado, 'z'))).toBe(742);
  });

  it('caso 6 — o reforço CHEGA a tempo de defender', () => {
    const mundo = mundoDe({ x: 'a', y: 'a', z: 'b' });
    const estado: EstadoDaResolucao = {
      hostes: tabuleiro(hoste('a', 'y', 300), hoste('a', 'x', 700), hoste('b', 'z', 800)),
      proximaHoste: 90,
      ordens: {
        h_x: { origem: 'x', rota: ['y'], homens: 700, postura: 'assaltar' as const },
        h_z: { origem: 'z', rota: ['y'], homens: 800, postura: 'assaltar' as const },
      },
      surtidas: [],
      cercos: {},
    };
    const r = resolverRodada(estado, ajustes.combate, mundo);

    // 300 + 700 = 1.000 contra 800 → 600 sobrevivem. Sem o reforço chegar junto, 300
    // contra 800 seria derrota — é exatamente a justiça que a simultaneidade dá.
    expect(r.batalhas[0]).toMatchObject({ provincia: 'y', vencedor: 'a', sobreviventes: 600 });
    expect(mundo.donoDe('y')).toBe('a');
    expect(forcaDe(em(estado, 'y'))).toBe(600);
  });
});

describe('conquista', () => {
  it('província inimiga vazia cai sem batalha nenhuma', () => {
    const mundo = mundoDe({ x: 'a', y: 'b' });
    const estado: EstadoDaResolucao = {
      hostes: tabuleiro(hoste('a', 'x', 100)),
      proximaHoste: 90,
      ordens: { h_x: { origem: 'x', rota: ['y'], homens: 100, postura: 'assaltar' as const } },
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
      ordens: { h_x: { origem: 'x', rota: ['y'], homens: 100, postura: 'assaltar' as const } },
      surtidas: [],
      cercos: {},
    };
    expect(resolverRodada(estado, ajustes.combate, mundo).conquistas).toEqual([]);
  });

  it('aniquilamento mútuo não entrega a província a ninguém', () => {
    const mundo = mundoDe({ x: 'a', y: 'b' });
    const estado: EstadoDaResolucao = {
      hostes: tabuleiro(hoste('a', 'x', 500), hoste('b', 'y', 500)),
      proximaHoste: 90,
      ordens: { h_x: { origem: 'x', rota: ['y'], homens: 500, postura: 'assaltar' as const } },
      surtidas: [],
      cercos: {},
    };
    const r = resolverRodada(estado, ajustes.combate, mundo);
    expect(r.batalhas[0]).toMatchObject({ vencedor: null, sobreviventes: 0 });
    expect(em(estado, 'y')).toBeUndefined();
    expect(mundo.donoDe('y')).toBe('b'); // continua de quem era
  });
});
