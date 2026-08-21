import { describe, expect, it } from 'vitest';

import {
  concluirFormacoes,
  iniciarFormacao,
  type EstadoDasFormacoes,
} from '../src/combate/formacao-de-leva';
import { exercitoVazio, forcaDe, somarLeva } from '../src/combate/exercito';

function estado(): EstadoDasFormacoes {
  return { populacao: { atenas: 10_000 }, exercitos: {}, formacoes: {} };
}

describe('formação de leva', () => {
  it('só transforma recrutas em hoste no turno seguinte', () => {
    const e = estado();
    iniciarFormacao(e.formacoes, 'atenas', 'atenas', 500, 4);

    expect(e.formacoes['atenas']).toMatchObject({ homens: 500, prontaNoTurno: 5 });
    expect(e.exercitos['atenas']).toBeUndefined();
    expect(concluirFormacoes(e, 4, () => 'atenas').ativadas).toEqual([]);

    expect(concluirFormacoes(e, 5, () => 'atenas').ativadas).toEqual([
      { provincia: 'atenas', homens: 500 },
    ]);
    expect(forcaDe(e.exercitos['atenas'])).toBe(500);
    expect(e.formacoes['atenas']).toBeUndefined();
  });

  it('não congela veteranos: a leva nova fica separada até ficar pronta', () => {
    const e = estado();
    const veteranos = exercitoVazio('atenas');
    somarLeva(veteranos, 'atenas', 1000);
    e.exercitos['atenas'] = veteranos;

    iniciarFormacao(e.formacoes, 'atenas', 'atenas', 500, 2);
    expect(forcaDe(e.exercitos['atenas'])).toBe(1000);
    expect(e.formacoes['atenas']?.homens).toBe(500);

    concluirFormacoes(e, 3, () => 'atenas');
    expect(forcaDe(e.exercitos['atenas'])).toBe(1500);
  });

  it('soma recrutamentos da mesma rodada numa única formação', () => {
    const e = estado();
    iniciarFormacao(e.formacoes, 'atenas', 'atenas', 200, 7);
    iniciarFormacao(e.formacoes, 'atenas', 'atenas', 300, 7);
    expect(e.formacoes['atenas']).toMatchObject({ homens: 500, prontaNoTurno: 8 });
  });

  it('interrompe a formação se a província cair e devolve os homens à terra', () => {
    const e = estado();
    e.populacao['atenas'] = (e.populacao['atenas'] ?? 0) - 500;
    iniciarFormacao(e.formacoes, 'atenas', 'atenas', 500, 1);

    const resultado = concluirFormacoes(e, 2, () => 'megara');
    expect(resultado.interrompidas).toEqual([{ provincia: 'atenas', homens: 500 }]);
    expect(e.populacao['atenas']).toBe(10_000);
    expect(e.exercitos['atenas']).toBeUndefined();
  });
});
