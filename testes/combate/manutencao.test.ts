import { describe, expect, it } from 'vitest';

import { ajustes } from '../apoio/mundo';
import { comQuartel } from './apoio';

const combate = ajustes.combate;

describe('manter tropa é o ralo de dinheiro', () => {
  it('a manutenção sai do tesouro todo turno, depois da arrecadação', () => {
    const c = comQuartel();
    c.recrutar('atenas', 1000);
    // Em formação, a leva ainda não é hoste e não cobra folha militar.
    expect(c.manutencao).toBe(0);
    c.passarTurno();

    const tesouro = c.tesouro;
    const renda = c.renda;
    const manutencao = c.manutencao;

    expect(manutencao).toBe(Math.round(1000 * combate.manutencaoPorHomem));
    expect(c.saldoPorTurno).toBe(renda - manutencao);

    c.passarTurno();
    expect(c.tesouro).toBe(tesouro + renda - manutencao);
  });

  it('sem tropa não há manutenção', () => {
    const c = comQuartel();
    expect(c.manutencao).toBe(0);
    expect(c.saldoPorTurno).toBe(c.renda);
  });

  it('uma mobilização grande pode custar mais que a renda de Atenas', () => {
    // A leva põe o reino em fome; antes da folha seguinte, 5% dos homens são perdidos.
    const c = comQuartel();
    c.recrutar('atenas', 3500);
    c.passarTurno();
    const sobreviventes = 3500 - Math.floor(3500 * ajustes.alimento.mortePorFomeNaTropa);
    expect(c.manutencao).toBe(Math.round(sobreviventes * combate.manutencaoPorHomem));
    expect(c.saldoPorTurno).toBeLessThan(0);
  });

  it('o aperto drena o tesouro e a tropa deserta aos poucos, sem colapso', () => {
    const c = comQuartel();
    c.recrutar('atenas', 3500);
    c.passarTurno();
    const forcaInicial = c.forcaEm('atenas');

    // O tesouro escorre até não cobrir a folha, e aí começa a desertar. Não existe
    // instante de colapso, existe uma corda esticando.
    for (let i = 0; i < 300; i++) c.passarTurno();

    expect(c.forcaEm('atenas')).toBeLessThan(forcaInicial); // desertou
    expect(c.forcaEm('atenas')).toBeGreaterThan(0); // proporcional, nunca aniquilação
    expect(c.tesouro).toBeGreaterThanOrEqual(0); // tesouro nunca fica negativo
    // A corda para de esticar onde a renda volta a sustentar a folha: o exército
    // encolhe até caber no que o reino paga, e ali estabiliza.
    expect(c.manutencao).toBeLessThanOrEqual(c.renda);
  });

  it('quem deserta volta pra casa em vez de sumir do mundo', () => {
    const c = comQuartel();
    // Leva pequena de propósito: o reino continua alimentando todo mundo, e o único
    // aperto em cima da tropa é o do soldo. Assim a soma mede só a deserção.
    // 2.500 homens: a folha passa da renda, mas o saldo alimentar fecha em zero; ninguém
    // passa fome e a soma mede somente a deserção.
    c.recrutar('atenas', 2500);
    c.passarTurno();
    c.darOuro(-c.tesouro);

    // O controle é a mesma campanha com o cofre cheio: mesma tropa, mesma comida, mesma
    // demografia — só que sem deserção. A diferença entre as duas é o que este teste mede.
    const pago = comQuartel();
    pago.recrutar('atenas', 2500);
    pago.passarTurno();
    pago.darOuro(50_000);

    const forca = c.forcaEm('atenas');
    c.passarTurno();
    pago.passarTurno();

    expect(c.fome.provincias).toEqual([]); // ninguém passou fome nesta janela
    expect(c.forcaEm('atenas')).toBeLessThan(forca); // desertou
    expect(pago.forcaEm('atenas')).toBe(forca); // e o controle não
    // O que saiu do exército reapareceu na província: o mundo continua com a mesma gente.
    // A margem de um punhado é arredondamento — o exército menor come um pouco menos, e o
    // crescimento do turno cai noutro inteiro.
    expect(c.populacaoDe('atenas') + c.homensEmArmasDe('atenas')).toBeGreaterThanOrEqual(
      pago.populacaoDe('atenas') + pago.homensEmArmasDe('atenas') - 5,
    );
  });

  it('a conta fecha em inteiros mesmo depois de desertar', () => {
    const c = comQuartel();
    c.recrutar('atenas', 3500);
    for (let i = 0; i < 300; i++) c.passarTurno();
    expect(Number.isInteger(c.tesouro)).toBe(true);
    expect(Number.isInteger(c.forcaEm('atenas'))).toBe(true);
    expect(Number.isInteger(c.populacaoDe('atenas'))).toBe(true);
  });
});
