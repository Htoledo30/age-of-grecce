import { describe, expect, it } from 'vitest';

import { unicaEm } from '../apoio/hostes';
import { novaCampanha as nova } from '../apoio/mundo';
import { comQuartel } from './apoio';

describe('conquista e tropa', () => {
  it('perder a província não some com o exército que está nela', () => {
    const c = comQuartel();
    c.recrutar('atenas', 1000);
    c.passarTurno();
    c.trocarDono('atenas', 'megara');
    // o exército continua sendo de Atenas: quem manda no chão não manda na tropa
    expect(unicaEm(c, 'atenas')?.poder).toBe('atenas');
    // Perguntando por Atenas de propósito: sem o poder, `forcaEm` responderia por Mégara,
    // que é a nova dona da terra e não tem homem nenhum ali.
    expect(c.forcaEm('atenas', 'atenas')).toBe(1000);
  });
});

describe('perder o chão não é o mesmo que morrer', () => {
  it('um poder sem território mas com hoste continua vivo, no exílio', () => {
    const c = comQuartel();
    c.recrutar('atenas', 1000);
    expect(c.poderesVivos()).toHaveLength(148);

    // Atenas perde as três províncias, mas a hoste continua de pé.
    for (const id of [...c.provinciasDe('atenas')]) c.trocarDono(id, 'megara');

    expect(c.provinciasDe('atenas')).toHaveLength(0);
    expect(c.vivo('atenas')).toBe(true);
    expect(c.noExilio('atenas')).toBe(true);
    expect(c.poderesVivos()).toContain('atenas');
  });

  it('o exilado tem que ASSALTAR a própria capital de volta, e o relógio corre', () => {
    const c = comQuartel();
    c.recrutar('atenas', 1000);
    c.passarTurno(); // a leva leva uma rodada pra virar hoste
    for (const id of [...c.provinciasDe('atenas')]) c.trocarDono(id, 'megara');
    expect(c.renda).toBe(0); // sem província, sem arrecadação
    expect(c.noExilio('atenas')).toBe(true);

    // ⚠️ O CERCO endureceu o exílio, e a regra nova é mais dura e mais interessante: a
    // hoste está pisando na própria terra, mas a cidade tem gente dentro e não abre o
    // portão porque a bandeira mudou. Sentar na porta não devolve nada — e sem renda a
    // deserção já está comendo o exército.
    c.passarTurno();
    expect(c.noExilio('atenas')).toBe(true);
    expect(c.cercoEm('atenas')).toMatchObject({ sitiante: 'atenas', postura: 'sitiar' });

    c.mudarPostura('atenas', 'assaltar');
    c.passarTurno();

    expect(c.donoDe('atenas')).toBe('atenas');
    expect(c.noExilio('atenas')).toBe(false);
    expect(c.vivo('atenas')).toBe(true);
  });

  it('sem chão e sem tropa é eliminação, como antes', () => {
    // Esparta não tem guarnição inicial: perder o chão a elimina de vez, sem exílio.
    const c = nova();
    for (const id of [...c.provinciasDe('esparta')]) c.trocarDono(id, 'atenas');
    expect(c.vivo('esparta')).toBe(false);
    expect(c.noExilio('esparta')).toBe(false);
  });
});
