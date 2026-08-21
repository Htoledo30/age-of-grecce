import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Ajustes, Mundo } from '../src/dados/esquema';

const bruto: unknown = JSON.parse(readFileSync(resolve('dados/mundo.json'), 'utf8'));
const mapa: unknown = JSON.parse(readFileSync(resolve('assets/mundo/mapa.json'), 'utf8'));

describe('dados/mundo.json', () => {
  it('bate com o esquema', () => {
    const r = Mundo.safeParse(bruto);
    expect(r.success, r.success ? '' : JSON.stringify(r.error.issues, null, 2)).toBe(true);
  });

  it('tem a mesma moldura que o mapa gerado', () => {
    // Se estes dois divergirem, o terreno é esticado pra caber e a costa sai do lugar —
    // e o sintoma aparece longe daqui, num marcador plantado no mar.
    const mundo = Mundo.parse(bruto);
    const gerado = (mapa as { dimensoes: { largura: number; altura: number } }).dimensoes;
    expect(mundo.dimensoes).toEqual(gerado);
  });

  it('recusa dimensão zero', () => {
    const ruim = { ...(bruto as object), dimensoes: { largura: 0, altura: 7040 } };
    expect(Mundo.safeParse(ruim).success).toBe(false);
  });
});

const brutoAjustes: unknown = JSON.parse(readFileSync(resolve('dados/ajustes.json'), 'utf8'));

describe('dados/ajustes.json', () => {
  it('bate com o esquema', () => {
    const r = Ajustes.safeParse(brutoAjustes);
    expect(r.success, r.success ? '' : JSON.stringify(r.error.issues, null, 2)).toBe(true);
  });

  it('a camada de detalhes entra antes de estar cheia', () => {
    const a = Ajustes.parse(brutoAjustes);
    expect(a.detalhes.zoomInicio).toBeLessThan(a.detalhes.zoomCheio);
  });

  it('recusa passo de roda que não aproxima', () => {
    const ruim = structuredClone(Ajustes.parse(brutoAjustes));
    ruim.camera.passoDaRoda = 1;
    expect(Ajustes.safeParse(ruim).success).toBe(false);
  });

  it('recusa campo faltando', () => {
    const ruim = structuredClone(Ajustes.parse(brutoAjustes)) as Record<string, unknown>;
    delete ruim['camera'];
    expect(Ajustes.safeParse(ruim).success).toBe(false);
  });
});
