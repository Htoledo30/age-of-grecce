import { describe, expect, it } from 'vitest';

import { defesaNoAssalto, milicianosPerdidos } from '../../src/combate/cerco';
describe('a conta do assalto', () => {
  it('a força mostrada é a combatida, e as perdas continuam em HOMENS', () => {
    const defesa = defesaNoAssalto(300);
    expect(defesa).toBe(300);
    expect(milicianosPerdidos(300, defesa)).toBe(0);
    expect(milicianosPerdidos(300, defesa / 2)).toBe(150);
    expect(milicianosPerdidos(300, 0)).toBe(300);
  });
});
