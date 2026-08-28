import { describe, expect, it } from 'vitest';

import { camposDaPopulacao } from '../../src/editor/catalogo-populacao';
import { erroNosValores } from '../../src/editor/validacoes';
import { ajustes } from '../apoio/mundo';

describe('a aba População do editor', () => {
  it('mostra o início redondo da faixa sem vazar o limite inclusivo interno', () => {
    const copia = structuredClone(ajustes);
    const campo = camposDaPopulacao(copia).find(
      (item) => item.id === 'populacao.faixas.0.inicioDaProxima',
    );

    expect(campo?.ler()).toBe(15_000);
    campo?.escrever(20_000);
    expect(copia.populacao.faixas[0]?.ate).toBe(19_999);
    expect(campo?.ler()).toBe(20_000);
  });

  it('recusa faixas fora de ordem e aceita uma sequência crescente', () => {
    expect(
      erroNosValores({
        'populacao.faixas.0.inicioDaProxima': 15_000,
        'populacao.faixas.1.inicioDaProxima': 30_000,
      }),
    ).toBeNull();
    expect(
      erroNosValores({
        'populacao.faixas.0.inicioDaProxima': 30_000,
        'populacao.faixas.1.inicioDaProxima': 30_000,
      }),
    ).toBe('Cada faixa populacional precisa começar depois da faixa anterior.');
  });
});
