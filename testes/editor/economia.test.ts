import { describe, expect, it } from 'vitest';

import { camposDaEconomia } from '../../src/editor/catalogo-economia';
import { erroNosValores } from '../../src/editor/validacoes';
import { ajustes } from '../apoio/mundo';

describe('a aba Economia do editor', () => {
  it('expõe imposto por mil habitantes sem alterar a unidade interna', () => {
    const copia = structuredClone(ajustes);
    const campo = camposDaEconomia(copia).find(
      (item) => item.id === 'economia.impostoPorHabitante',
    );

    expect(campo?.fatorVisual).toBe(1_000);
    expect((campo?.ler() ?? 0) * (campo?.fatorVisual ?? 1)).toBe(4);
    campo?.escrever(0.006);
    expect(copia.economia.impostoPorHabitante).toBe(0.006);
  });

  it('protege a ordem dos decretos e a distância de terra desconectada', () => {
    expect(
      erroNosValores({
        'economia.imposto.niveis.baixo.fator': 0.75,
        'economia.imposto.niveis.normal.fator': 1,
        'economia.imposto.niveis.alto.fator': 1.8,
        'economia.imposto.niveis.confisco.fator': 3,
      }),
    ).toBeNull();
    expect(
      erroNosValores({
        'economia.imposto.niveis.baixo.fator': 2,
        'economia.imposto.niveis.normal.fator': 1,
      }),
    ).toBe('A arrecadação dos impostos precisa subir de Baixo até Confisco.');
    expect(
      erroNosValores({
        'corrupcao.distancia.meioCaminho': 8,
        'corrupcao.distancia.semCaminho': 4,
      }),
    ).toBe('Uma província sem caminho não pode parecer mais próxima que a meia distância.');
  });
});
