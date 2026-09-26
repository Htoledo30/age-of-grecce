/**
 * A TERRA CONQUISTADA — o começo é crítico, e o tempo resolve o resto.
 *
 * ⚠️ **Nenhum número de balanço mora aqui.** Prazo e taxas vêm dos ajustes; o que se prende é a
 * regra: na fase crítica a terra estrangeira insatisfeita se levanta, depois dela só o fundo da
 * régua arma alguém; a terra em paz com o dono assimila devagar, e a maltratada não; e o
 * jogador vencido não volta ao jogo pela revolta.
 */

import { describe, expect, it } from 'vitest';

import type { Campanha } from '../src/campanha/campanha';
import { lerSalvamento } from '../src/campanha/salvamento';
import { ajustes, novaCampanhaFarta } from './apoio/mundo';

const { felicidade } = ajustes;

function nova(jogador = 'atenas'): Campanha {
  const c = novaCampanhaFarta();
  c.comecar(jogador);
  return c;
}

/** Reescreve o estado pelo caminho oficial: salvar, editar, restaurar. */
function editar(c: Campanha, mexer: (salvo: ReturnType<typeof lerSalvamento>) => void): Campanha {
  const salvo = lerSalvamento(c.serializar());
  mexer(salvo);
  c.restaurar(salvo);
  return c;
}

/** Elêusis nas mãos de Atenas, com imposto alto e o povo azedo — a condenada de sempre. */
function eleusisAzeda(recemConquistada: boolean): Campanha {
  const c = nova();
  c.trocarDono('eleusis', 'atenas');
  c.definirImposto('eleusis', 'alto');
  return editar(c, (s) => {
    s.felicidade['eleusis'] = 5;
    if (recemConquistada) s.conquistadaEm['eleusis'] = s.turno;
  });
}

const rebeldesEm = (c: Campanha, provincia: string) =>
  c.hostesEm(provincia).filter((h) => h.poder !== c.donoDe(provincia));

describe('a fase crítica', () => {
  it('recém-conquistada, a terra estrangeira insatisfeita se levanta', () => {
    const c = eleusisAzeda(true);
    const prazo = felicidade.faixas[1]?.levanteEm ?? 0;
    for (let i = 0; i < prazo; i++) c.passarTurno();
    expect(rebeldesEm(c, 'eleusis').length).toBeGreaterThan(0);
  });

  it('passada a fase crítica, a mesma insatisfação não arma ninguém', () => {
    // ⚠️ Era o ciclo eterno: sob bandeira estrangeira a faixa "Insatisfeita" armava um levante a
    // cada nove turnos, para sempre.
    const c = eleusisAzeda(false);
    const prazo = felicidade.faixas[1]?.levanteEm ?? 0;
    for (let i = 0; i < prazo * 3; i++) c.passarTurno();
    expect(rebeldesEm(c, 'eleusis')).toEqual([]);
    expect(c.donoDe('eleusis')).toBe('atenas');
  });

  it('a conquista abre a fase crítica, e a ficha conta os turnos que faltam', () => {
    const c = eleusisAzeda(true);
    expect(c.faseCriticaEm('eleusis')).toBe(felicidade.revolta.faseCritica);
    c.passarTurno();
    expect(c.faseCriticaEm('eleusis')).toBe(felicidade.revolta.faseCritica - 1);
  });
});

describe('a assimilação', () => {
  /** Elêusis sob Atenas, feliz e fora da fase crítica. */
  const eleusisEmPaz = (recemConquistada = false) => {
    const c = nova();
    c.trocarDono('eleusis', 'atenas');
    return editar(c, (s) => {
      s.felicidade['eleusis'] = 90;
      if (recemConquistada) s.conquistadaEm['eleusis'] = s.turno;
    });
  };

  it('a terra em paz com o dono vira o povo dele, devagar', () => {
    const c = eleusisEmPaz();
    const antes = c.estranhezaEm('eleusis');
    c.passarTurno();
    const depois = c.estranhezaEm('eleusis');
    // Elêusis é jônia como Atenas: a fatia de outra cidade encolhe, e na taxa da mesma tribo.
    const taxa = felicidade.assimilacao.porTurno * felicidade.assimilacao.mesmaTribo;
    expect(depois.mesmoPovo).toBeCloseTo(antes.mesmoPovo * (1 - taxa), 6);
    expect(depois.mesmoPovo).toBeLessThan(antes.mesmoPovo);
  });

  it('na fase crítica, ninguém assimila', () => {
    const c = eleusisEmPaz(true);
    const antes = c.estranhezaEm('eleusis');
    c.passarTurno();
    expect(c.estranhezaEm('eleusis')).toEqual(antes);
  });

  it('a terra maltratada não assimila', () => {
    const c = eleusisAzeda(false);
    const antes = c.estranhezaEm('eleusis');
    c.passarTurno();
    expect(c.estranhezaEm('eleusis')).toEqual(antes);
  });
});

describe('a derrota do jogador é definitiva', () => {
  it('a revolta na terra do jogador vencido ergue um reino novo, e não o jogador', () => {
    const c = nova();
    for (const id of [...c.provinciasDe('atenas')]) c.trocarDono(id, 'megara');
    expect(c.vivo('atenas')).toBe(false);
    c.definirImposto('atenas', 'confisco', 'megara');
    editar(c, (s) => {
      s.felicidade['atenas'] = 0;
      s.conquistadaEm['atenas'] = s.turno;
    });

    for (let i = 0; i < 20 && rebeldesEm(c, 'atenas').length === 0; i++) c.passarTurno();
    const rebeldes = rebeldesEm(c, 'atenas');
    expect(rebeldes.length).toBeGreaterThan(0);
    expect(rebeldes.every((h) => h.poder !== 'atenas')).toBe(true);
    expect(c.vivo('atenas')).toBe(false);
  });
});
