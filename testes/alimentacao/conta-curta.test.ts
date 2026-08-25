import { describe, expect, it } from 'vitest';

import {
  balancoAlimentar,
  categoriaAlimentar,
  custoMilitar,
  mortosPelaFome,
} from '../../src/producao/alimentacao';
import { custoDaPopulacao, faixaDaPopulacao } from '../../src/populacao/faixas';
import { ajustes } from '../apoio/mundo';
import { nova } from './apoio';

describe('a conta curta da alimentação', () => {
  it('a faixa é ABSOLUTA: quem tem mais gente come mais, venha de onde vier', () => {
    // ⚠️ É o contrário da regra antiga, que media cada terra contra ela mesma e por isso
    // fazia Atenas com 35.000 custar o mesmo que Salamina com 3.000.
    const faixas = ajustes.populacao.faixas;
    const primeira = faixas[0]!;
    const ultima = faixas[faixas.length - 1]!;

    expect(custoDaPopulacao(0, faixas)).toBe(0); // terra vazia não pesa na mesa
    expect(custoDaPopulacao(1, faixas)).toBe(primeira.custo);
    expect(custoDaPopulacao(primeira.ate!, faixas)).toBe(primeira.custo);
    expect(custoDaPopulacao(primeira.ate! + 1, faixas)).toBeGreaterThan(primeira.custo);
    // A última não tem teto: por mais que o reino cresça, ninguém fica sem faixa.
    expect(custoDaPopulacao(10_000_000, faixas)).toBe(ultima.custo);
    expect(faixaDaPopulacao(10_000_000, faixas)?.nome).toBe(ultima.nome);

    // E o custo nunca desce quando a população sobe.
    let anterior = 0;
    for (const p of [1, 5_000, 15_000, 25_000, 35_000, 90_000]) {
      const custo = custoDaPopulacao(p, faixas);
      expect(custo).toBeGreaterThanOrEqual(anterior);
      anterior = custo;
    }
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
        { custoDaPopulacao: 1, producaoAlimentar: 4, sitiada: false },
        { custoDaPopulacao: 1, producaoAlimentar: 0, sitiada: false },
        // A sitiada não contribui, não pesa e não conta: vive da própria despensa.
        { custoDaPopulacao: 3, producaoAlimentar: 7, sitiada: true },
      ],
      1001,
      ajustes.alimento,
    );
    const sub = ajustes.alimento.subsistenciaPorReino;
    expect(resultado).toMatchObject({
      subsistencia: sub,
      producao: 4, // a sitiada não entra
      populacao: 2, // 1 + 1; a sitiada não pesa
      exercito: custoMilitar(1001, ajustes.alimento.soldadosPorPonto),
      saldoCivil: sub + 4 - 2,
      saldo: sub + 4 - 2 - custoMilitar(1001, ajustes.alimento.soldadosPorPonto),
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
