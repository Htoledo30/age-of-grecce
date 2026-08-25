import { describe, expect, it } from 'vitest';

import { lerSalvamento } from '../../src/campanha/salvamento';
import { ajustes, construcoes, novaCampanha as nova } from '../apoio/mundo';

describe('o decreto de imposto: receita trocada por pressão social', () => {
  it('toda terra abre no normal, e o fator do nível entra na fórmula do imposto', () => {
    const c = nova();
    c.comecar('atenas');
    expect(c.nivelDeImpostoEm('atenas')).toBe('normal');

    const normal = c.economiaDe('atenas')?.impostos ?? 0;
    c.definirImposto('atenas', 'alto');
    const alto = c.economiaDe('atenas')?.impostos ?? 0;
    c.definirImposto('atenas', 'baixo');
    const baixo = c.economiaDe('atenas')?.impostos ?? 0;

    expect(baixo).toBeLessThan(normal);
    expect(alto).toBeGreaterThan(normal);
    // A fórmula inteira, com o fator do ajuste — o teste guarda a regra, não o número.
    expect(alto).toBe(
      Math.round(
        c.populacaoDe('atenas') *
          ajustes.economia.impostoPorHabitante *
          (1 - c.corrupcaoEm('atenas').total) *
          ajustes.economia.imposto.niveis.alto.fator,
      ),
    );
    // Só a parcela do imposto muda: produção e comércio não são do coletor.
    expect(c.economiaDe('atenas')?.producao).toBe(nova().economiaDe('atenas')?.producao);
  });

  it('o efeito é IMEDIATO na renda e gradual no humor: o alvo muda no clique', () => {
    const c = nova();
    c.comecar('atenas');
    const alvoNormal = c.alvoDeFelicidadeEm('atenas');
    c.definirImposto('atenas', 'alto');
    expect(c.alvoDeFelicidadeEm('atenas')).toBe(
      alvoNormal -
        ajustes.economia.imposto.niveis.normal.humor +
        ajustes.economia.imposto.niveis.alto.humor,
    );
    c.definirImposto('atenas', 'baixo');
    expect(c.alvoDeFelicidadeEm('atenas')).toBeGreaterThan(alvoNormal);
  });

  it('imposto e construção se compõem: a Ágora multiplica o que o decreto rende', () => {
    const c = nova();
    c.comecar('atenas');
    c.construir('atenas', 'agora');
    const agora = construcoes.construcoes['agora']!;
    for (let i = 0; i < agora.turnos[0]; i++) c.passarTurno();
    c.definirImposto('atenas', 'alto');

    if (agora.efeito.tipo !== 'renda') throw new Error('Ágora deveria render moeda');
    expect(c.economiaDe('atenas')?.impostos).toBe(
      Math.round(
        c.populacaoDe('atenas') *
          ajustes.economia.impostoPorHabitante *
          (1 - c.corrupcaoEm('atenas').total) *
          ajustes.economia.imposto.niveis.alto.fator *
          agora.efeito.fatores[0],
      ),
    );
  });

  it('a conquista zera o decreto: a administração nova começa no normal', () => {
    const c = nova();
    c.comecar('atenas');
    c.definirImposto('maratona', 'alto');
    c.trocarDono('maratona', 'megara');
    expect(c.nivelDeImpostoEm('maratona')).toBe('normal');
  });

  it('recusa com motivo em vez de sumir', () => {
    const c = nova();
    expect(c.podeDefinirImposto('atenas')).toMatchObject({ pode: false });
    c.comecar('atenas');
    expect(c.podeDefinirImposto('esparta')).toMatchObject({ motivo: /não tem economia/ });
    expect(c.podeDefinirImposto('eleusis')).toMatchObject({ motivo: /não é sua/ });
    expect(() => c.definirImposto('eleusis', 'alto')).toThrow(/não é sua/);
  });

  it('o decreto viaja no salvamento, e o normal não ocupa registro', () => {
    const c = nova();
    c.comecar('atenas');
    c.definirImposto('atenas', 'alto');
    c.definirImposto('maratona', 'baixo');
    c.definirImposto('maratona', 'normal'); // voltar ao normal LIMPA a entrada

    const salvo = lerSalvamento(c.serializar());
    expect(salvo.nivelDeImposto).toEqual({ atenas: 'alto' });

    const retomada = nova();
    retomada.restaurar(salvo);
    expect(retomada.nivelDeImpostoEm('atenas')).toBe('alto');
    expect(retomada.nivelDeImpostoEm('maratona')).toBe('normal');
  });
});
