import { describe, expect, it } from 'vitest';

import { avancarAno, formatarAno } from '../../src/campanha/estado-campanha';
import { ajustes, novaCampanha as nova } from '../apoio/mundo';

describe('calendário e turno', () => {
  it('escreve o ano como se lê em voz alta e nunca passa pelo ano zero', () => {
    expect(formatarAno(-700)).toBe('700 a.C.');
    expect(formatarAno(-1)).toBe('1 a.C.');
    expect(formatarAno(1)).toBe('1 d.C.');
    expect(avancarAno(-1, 1)).toBe(1);
  });

  it('abre sem jogador e começa no turno 1 com 3.000 moedas', () => {
    const c = nova();
    expect(c.iniciada).toBe(false);
    expect(c.turno).toBe(0);
    c.comecar('atenas');
    expect(c.turno).toBe(1);
    expect(c.ano).toBe(-700);
    expect(c.tesouro).toBe(ajustes.tesouroInicial);
    expect(c.renda).toBe(c.rendaDe('atenas'));
    expect(c.renda).toBeGreaterThan(0);
  });

  it('arrecada ANTES de virar o calendário', () => {
    const c = nova();
    c.comecar('atenas');
    const antes = c.tesouro;
    const renda = c.renda;
    c.passarTurno();
    expect(c.turno).toBe(2);
    expect(c.ano).toBe(-699);
    // Atenas não tem tropa no turno 1, então a renda entra inteira.
    expect(c.tesouro).toBe(antes + renda);
  });

  it('recusa começar duas vezes e passar turno antes de começar', () => {
    const c = nova();
    expect(() => c.passarTurno()).toThrow(/ainda não começou/);
    c.comecar('atenas');
    expect(() => c.comecar('esparta')).toThrow(/já começou/);
  });
});
