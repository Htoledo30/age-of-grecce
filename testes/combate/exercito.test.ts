import { describe, expect, it } from 'vitest';

import { exercitoVazio, forcaDe, retirar, somarLeva } from '../../src/combate/exercito';

describe('exército: a força é derivada da origem', () => {
  it('somar levas soma a força, e a origem lembra de onde cada um veio', () => {
    const e = exercitoVazio('h1', 'atenas', 'atenas');
    expect(forcaDe(e)).toBe(0);
    somarLeva(e, 'atenas', 600);
    somarLeva(e, 'maratona', 400);
    somarLeva(e, 'atenas', 100);
    expect(forcaDe(e)).toBe(1100);
    expect(e.origem).toEqual({ atenas: 700, maratona: 400 });
  });

  it('retirar tira proporcionalmente de cada origem e a soma fecha exata', () => {
    const e = exercitoVazio('h1', 'atenas', 'atenas');
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
    const e = exercitoVazio('h1', 'atenas', 'atenas');
    somarLeva(e, 'atenas', 100);
    expect(retirar(e, 999)).toEqual({ atenas: 100 });
    expect(forcaDe(e)).toBe(0);
  });

  it('o resto do arredondamento não perde nem cria homem', () => {
    const e = exercitoVazio('h1', 'atenas', 'atenas');
    somarLeva(e, 'a', 33);
    somarLeva(e, 'b', 33);
    somarLeva(e, 'c', 34);
    const saiu = retirar(e, 50);
    expect(Object.values(saiu).reduce((a, b) => a + b, 0)).toBe(50);
    expect(forcaDe(e)).toBe(50);
  });
});
