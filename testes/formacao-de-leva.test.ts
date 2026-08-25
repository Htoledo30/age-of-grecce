import { describe, expect, it } from 'vitest';

import {
  concluirFormacoes,
  homensEmFormacao,
  iniciarFormacao,
  type EstadoDasFormacoes,
} from '../src/combate/formacao-de-leva';
import { exercitoVazio, forcaDe, somarLeva } from '../src/combate/exercito';
import type { Exercito } from '../src/combate/exercito';

/**
 * A hoste parada numa província.
 *
 * ⚠️ Existe porque a província deixou de ser a CHAVE do estado: agora ela é um campo
 * dentro da hoste. Duas hostes já cabem no mesmo lugar, e é isso que o cerco exige.
 */
function hosteEm(e: EstadoDasFormacoes, provincia: string): Exercito | undefined {
  return Object.keys(e.hostes)
    .sort()
    .map((id) => e.hostes[id])
    .find((h) => h !== undefined && h.posicao === provincia);
}

function estado(): EstadoDasFormacoes {
  return { populacao: { atenas: 10_000 }, hostes: {}, proximaHoste: 1, formacoes: {} };
}

describe('formação de leva', () => {
  it('só transforma recrutas em hoste no turno seguinte', () => {
    const e = estado();
    iniciarFormacao(e.formacoes, 'atenas', 'atenas', 500, 4);

    expect(homensEmFormacao(e.formacoes['atenas'])).toBe(500);
    expect(e.formacoes['atenas']).toMatchObject({ prontaNoTurno: 5 });
    expect(hosteEm(e, 'atenas')).toBeUndefined();
    expect(concluirFormacoes(e, 4, () => 'atenas').ativadas).toEqual([]);

    expect(concluirFormacoes(e, 5, () => 'atenas').ativadas).toEqual([
      { provincia: 'atenas', homens: 500 },
    ]);
    expect(forcaDe(hosteEm(e, 'atenas'))).toBe(500);
    expect(e.formacoes['atenas']).toBeUndefined();
  });

  it('não congela veteranos: a leva nova fica separada até ficar pronta', () => {
    const e = estado();
    const veteranos = exercitoVazio('h1', 'atenas', 'atenas');
    somarLeva(veteranos, 'atenas', 1000);
    e.hostes[veteranos.id] = veteranos;

    iniciarFormacao(e.formacoes, 'atenas', 'atenas', 500, 2);
    expect(forcaDe(hosteEm(e, 'atenas'))).toBe(1000);
    expect(homensEmFormacao(e.formacoes['atenas'])).toBe(500);

    concluirFormacoes(e, 3, () => 'atenas');
    expect(forcaDe(hosteEm(e, 'atenas'))).toBe(1500);
  });

  it('soma recrutamentos da mesma rodada numa única formação', () => {
    const e = estado();
    iniciarFormacao(e.formacoes, 'atenas', 'atenas', 200, 7);
    iniciarFormacao(e.formacoes, 'atenas', 'atenas', 300, 7);
    expect(homensEmFormacao(e.formacoes['atenas'])).toBe(500);
    expect(e.formacoes['atenas']).toMatchObject({ prontaNoTurno: 8 });
  });

  it('interrompe a formação se a província cair e devolve os homens à terra', () => {
    const e = estado();
    e.populacao['atenas'] = (e.populacao['atenas'] ?? 0) - 500;
    iniciarFormacao(e.formacoes, 'atenas', 'atenas', 500, 1);

    const resultado = concluirFormacoes(e, 2, () => 'megara');
    expect(resultado.interrompidas).toEqual([{ provincia: 'atenas', homens: 500 }]);
    expect(e.populacao['atenas']).toBe(10_000);
    expect(hosteEm(e, 'atenas')).toBeUndefined();
  });
});
