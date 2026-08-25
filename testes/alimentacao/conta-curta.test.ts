import { describe, expect, it } from 'vitest';

import {
  balancoAlimentar,
  categoriaAlimentar,
  custoMilitar,
  mortosPelaFome,
  nivelPopulacional,
} from '../../src/producao/alimentacao';
import { ajustes } from '../apoio/mundo';
import { nova } from './apoio';

describe('a conta curta da alimentação', () => {
  it('faz a população subir e descer de nível em faixas de 25%', () => {
    expect(nivelPopulacional(0, 10_000, 0.25)).toBe(0);
    expect(nivelPopulacional(1, 10_000, 0.25)).toBe(1);
    expect(nivelPopulacional(12_499, 10_000, 0.25)).toBe(1);
    expect(nivelPopulacional(12_500, 10_000, 0.25)).toBe(2);
    expect(nivelPopulacional(15_000, 10_000, 0.25)).toBe(3);
    expect(nivelPopulacional(20_000, 10_000, 0.25)).toBe(5);
    expect(nivelPopulacional(11_000, 10_000, 0.25)).toBe(1);
  });

  it('arredonda o exército total uma vez, não cada hoste', () => {
    expect(custoMilitar(0, 1000)).toBe(0);
    expect(custoMilitar(500, 1000)).toBe(1);
    expect(custoMilitar(1000, 1000)).toBe(1);
    expect(custoMilitar(1001, 1000)).toBe(2);
    expect(custoMilitar(2800, 1000)).toBe(3);
  });

  it('as duas contas: civil primeiro, exército depois — e a sitiada fora de ambas', () => {
    const resultado = balancoAlimentar(
      [
        { populacaoAtual: 10_000, populacaoInicial: 10_000, producaoAlimentar: 4, sitiada: false },
        { populacaoAtual: 10_000, populacaoInicial: 10_000, producaoAlimentar: 0, sitiada: false },
        // A sitiada não contribui, não pesa e não conta: vive da própria despensa.
        { populacaoAtual: 9_000, populacaoInicial: 9_000, producaoAlimentar: 7, sitiada: true },
      ],
      1001,
      ajustes.alimento,
    );
    expect(resultado).toMatchObject({
      subsistencia: 1,
      producao: 4,
      populacao: 2,
      exercito: 2,
      saldoCivil: 3,
      saldo: 1,
      categoria: 'abastecido',
    });
  });

  it('não dá subsistência a poder sem província simulada', () => {
    expect(balancoAlimentar([], 0, ajustes.alimento).saldo).toBe(0);
    expect(nova().balancoAlimentarDe('esparta')).toMatchObject({ subsistencia: 0, saldo: 0 });
  });

  it('a categoria sai do PAR de saldos: quem não comeu decide o nome', () => {
    // Civil negativo é Fome de gente, não importa o final.
    expect(categoriaAlimentar(-1, -3)).toBe('fome');
    // Civil fechado com final negativo: o povo comeu; o aperto é só do exército.
    expect(categoriaAlimentar(0, -2)).toBe('exercito-sem-mantimentos');
    expect(categoriaAlimentar(3, -1)).toBe('exercito-sem-mantimentos');
    expect(categoriaAlimentar(2, 0)).toBe('no-limite');
    expect(categoriaAlimentar(5, 4)).toBe('abastecido');
  });

  it('cobra uma fração fixa, com mínimo de uma morte', () => {
    expect(mortosPelaFome(10_000, 0.01)).toBe(100);
    expect(mortosPelaFome(10_000, 0.05)).toBe(500);
    expect(mortosPelaFome(3, 0.01)).toBe(1);
    expect(mortosPelaFome(0, 0.01)).toBe(0);
  });
});
