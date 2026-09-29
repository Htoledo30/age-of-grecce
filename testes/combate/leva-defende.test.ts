/**
 * A LEVA EM FORMAÇÃO DEFENDE A PRÓPRIA TERRA.
 *
 * Henrique: *"se eu mandei fazer tropas numa província e alguém está atacando aquela
 * província, aquelas tropas deveriam defender. E atualmente isso não acontece"*. Os recrutas
 * pagos na virada do ataque assistiam à queda da cidade sem pegar em armas.
 */

import { describe, expect, it } from 'vitest';

import { novaCampanhaFarta as nova } from '../apoio/mundo';

/** Atenas assalta Elêusis com uma hoste que toma a praça quando ela está sozinha. */
function assalto(levaDeEleusis: number) {
  const c = nova();
  c.comecar('atenas');
  c.darOuro(400_000);
  c.darOuro(400_000, 'eleusis');
  c.plantarHoste('atenas', 'atenas', 3000);
  const minha = c.hostesEm('atenas').find((h) => h.poder === 'atenas');
  if (!minha) throw new Error('a hoste não subiu');
  c.declararGuerra('eleusis', 'atenas');
  c.ordenarMarcha(minha.id, 'eleusis', 3000, 'atenas', 'assaltar');
  if (levaDeEleusis > 0) c.recrutar('eleusis', levaDeEleusis, 'leve', 'eleusis');
  return c;
}

describe('a leva em formação pega em armas quando a terra é atacada', () => {
  it('sem leva a praça cai; com a leva paga na mesma virada, ela resiste', () => {
    const sozinha = assalto(0);
    sozinha.passarTurno();
    // O cenário TEM de montar: sem a leva, a hoste de Atenas toma Elêusis.
    expect(sozinha.donoDe('eleusis')).toBe('atenas');

    const defendida = assalto(4000);
    expect(defendida.hostesEm('eleusis').some((h) => h.poder === 'eleusis')).toBe(false);
    defendida.passarTurno();
    expect(defendida.donoDe('eleusis')).toBe('eleusis');
    const batalha = defendida.rodada.batalhas.find((b) => b.provincia === 'eleusis');
    expect(batalha?.vencedor).toBe('eleusis');
  });

  it('sem ataque, a leva segue o prazo e só vira hoste na virada', () => {
    const c = nova();
    c.comecar('atenas');
    c.darOuro(400_000);
    c.recrutar('atenas', 1000);
    expect(c.hostesEm('atenas').some((h) => h.poder === 'atenas')).toBe(false);
    c.passarTurno();
    expect(c.hostesEm('atenas').some((h) => h.poder === 'atenas')).toBe(true);
  });
});
