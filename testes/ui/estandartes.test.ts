import { describe, expect, it } from 'vitest';

import { EMBLEMAS_DOS_PODERES } from '../../src/ui/emblemas-de-poder';
import { emblemaDoPoder } from '../../src/ui/estandartes';

const PROPRIOS = {
  argos: 'lobo',
  atenas: 'coruja',
  calcis: 'aguia',
  caristo: 'galo',
  corinto: 'pegaso',
  eleusis: 'feixe-de-trigo',
  epidauro: 'bastao-de-asclepio',
  eretria: 'polvo',
  hermione: 'tocha',
  'locros-opuntios': 'elmo-de-ajax',
  megara: 'lira',
  orcomeno: 'anfora',
  plateia: 'touro',
  sicion: 'pomba',
  tanagra: 'cabeca-de-cavalo',
  tebas: 'esfinge',
  tespias: 'crescente',
  trezena: 'tridente',
} as const;

describe('estandartes dos poderes', () => {
  it('dá um emblema próprio a cada poder jogável', () => {
    for (const [poder, emblema] of Object.entries(PROPRIOS)) {
      expect(emblemaDoPoder(poder), poder).toBe(emblema);
    }
    expect(new Set(Object.values(PROPRIOS)).size).toBe(Object.keys(PROPRIOS).length);
    expect(Object.keys(EMBLEMAS_DOS_PODERES)).toHaveLength(18);
    expect(new Set(Object.values(EMBLEMAS_DOS_PODERES).map((item) => item.caminho)).size).toBe(18);
  });

  it('mantém o fallback estável para poderes geográficos e nascidos', () => {
    const geografico = emblemaDoPoder('naxos');
    const nascido = emblemaDoPoder('livre-maratona');

    expect(geografico).toMatch(/^generico-/);
    expect(nascido).toMatch(/^generico-/);
    expect(emblemaDoPoder('naxos')).toBe(geografico);
    expect(emblemaDoPoder('livre-maratona')).toBe(nascido);
  });

  it('normaliza caixa e espaços sem trocar a identidade', () => {
    expect(emblemaDoPoder('  ATENAS ')).toBe('coruja');
  });
});
