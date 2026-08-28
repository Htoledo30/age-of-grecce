import { describe, expect, it } from 'vitest';

import { camposDasConstrucoes } from '../../src/editor/catalogo-construcoes';
import { ehSerieNumerica } from '../../src/editor/tipos';
import { erroNosValores } from '../../src/editor/validacoes';
import { ajustes, construcoes } from '../apoio/mundo';

describe('a aba Construções do editor', () => {
  it('reúne I, II e III na mesma linha e escreve no catálogo usado pela campanha', () => {
    const copiaDosAjustes = structuredClone(ajustes);
    const copiaDoCatalogo = structuredClone(construcoes.construcoes);
    const itens = camposDasConstrucoes(copiaDosAjustes, copiaDoCatalogo);
    const custosDaAgora = itens.find(
      (item) => ehSerieNumerica(item) && item.nome === 'Ágora · custo',
    );

    expect(custosDaAgora && ehSerieNumerica(custosDaAgora)).toBe(true);
    if (!custosDaAgora || !ehSerieNumerica(custosDaAgora)) return;
    expect(custosDaAgora.campos.map((campo) => campo.ler())).toEqual([2_000, 4_000, 7_000]);
    custosDaAgora.campos[1].escrever(4_500);
    expect(copiaDoCatalogo['agora']?.custos).toEqual([2_000, 4_500, 7_000]);
  });

  it('protege a escala global e a progressão dos três níveis', () => {
    expect(
      erroNosValores({
        'construcoes.escalaMinima': 2,
        'construcoes.escalaMaxima': 1,
      }),
    ).toBe('A menor escala de preço não pode ultrapassar a maior.');
    expect(
      erroNosValores({
        'construcoes.catalogo.agora.custos.crescente.0': 2_000,
        'construcoes.catalogo.agora.custos.crescente.1': 1_000,
      }),
    ).toBe('Os níveis I, II e III das construções precisam seguir a ordem.');
    expect(
      erroNosValores({
        'construcoes.catalogo.agora.efeito.decrescente.0': 0.6,
        'construcoes.catalogo.agora.efeito.decrescente.1': 0.8,
      }),
    ).toBe('Os níveis I, II e III das construções precisam seguir a ordem.');
  });
});
