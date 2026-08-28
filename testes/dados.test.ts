import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Ajustes, Construcoes, Mundo } from '../src/dados/esquema';

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

  it('o grão do chão entra antes de estar cheio', () => {
    const a = Ajustes.parse(brutoAjustes);
    expect(a.detalhes.graoInicio).toBeLessThan(a.detalhes.graoFim);
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

/**
 * Todo campo que existe no arquivo tem de existir depois de passar pelo esquema.
 *
 * ⚠️ **É a garantia em que o botão "Gravar em dados/" do editor de balanceamento se apoia.**
 * Ele grava o objeto que o jogo tem em memória — o que saiu do `parse` —, e o Zod DESCARTA
 * chave que ele não conhece. Então um campo acrescentado ao JSON sem entrar no esquema
 * sobrevive a carregar o jogo, some na primeira gravação, e ninguém nota até a partida
 * seguinte não abrir. Este teste é o alarme: quem acrescentar dado novo tem de declará-lo.
 *
 * Ver `ferramentas/vite-gravar-balanco.ts`.
 */
describe('gravar o que foi carregado não perde campo', () => {
  const perdidos = (cru: unknown, limpo: unknown, caminho = ''): string[] => {
    if (cru === null || typeof cru !== 'object') return [];
    if (Array.isArray(cru)) {
      return cru.flatMap((v, i) =>
        perdidos(v, (limpo as unknown[] | undefined)?.[i], `${caminho}[${i}]`),
      );
    }
    const l = (limpo ?? {}) as Record<string, unknown>;
    return Object.entries(cru as Record<string, unknown>).flatMap(([k, v]) =>
      k in l ? perdidos(v, l[k], `${caminho}.${k}`) : [`${caminho}.${k}`],
    );
  };

  it.each([
    ['dados/ajustes.json', Ajustes],
    ['dados/construcoes.json', Construcoes],
  ])('%s sobrevive à ida e volta pelo esquema', (caminho, esquema) => {
    const cru: unknown = JSON.parse(readFileSync(resolve(caminho), 'utf8'));
    expect(perdidos(cru, esquema.parse(cru))).toEqual([]);
  });
});
