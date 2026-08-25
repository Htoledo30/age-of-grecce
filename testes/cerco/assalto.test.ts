import { describe, expect, it } from 'vitest';

import { defesaNoAssalto, milicianosPerdidos } from '../../src/combate/cerco';
import { ajustes } from '../apoio/mundo';

const cercoAjustes = ajustes.combate.cerco;

describe('a conta do assalto', () => {
  it('a muralha multiplica a milícia, e desfazer a conta devolve HOMENS', () => {
    const defesa = defesaNoAssalto(300, cercoAjustes);
    expect(defesa).toBe(300 * cercoAjustes.bonusDeMuralha);
    // Sem desfazer a multiplicação, um assalto rechaçado faria a população encolher pelo
    // dobro do que de fato caiu.
    expect(milicianosPerdidos(300, defesa, cercoAjustes)).toBe(0);
    expect(milicianosPerdidos(300, defesa / 2, cercoAjustes)).toBe(150);
    expect(milicianosPerdidos(300, 0, cercoAjustes)).toBe(300);
  });
});
