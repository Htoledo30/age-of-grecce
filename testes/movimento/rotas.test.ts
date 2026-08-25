import { describe, expect, it } from 'vitest';

import { alcanceDe, rotasDe } from '../../src/movimento/alcance';
import { atlas } from '../apoio/mundo';
import { SALTOS } from './apoio';

describe('rotas: até onde a hoste vai NESTA rodada', () => {
  const ehDeAtenas = (id: string): boolean => ['atenas', 'maratona', 'sounion'].includes(id);

  it('devolve a rota até cada destino, não só o destino', () => {
    const rotas = rotasDe(atlas, 'atenas', ehDeAtenas, SALTOS);
    // Vizinhas diretas: um trecho só. A rota guardada é o que permite interceptar no meio.
    expect(rotas.get('maratona')).toEqual(['maratona']);
    expect(rotas.get('sounion')).toEqual(['sounion']);
    expect(rotas.has('atenas')).toBe(false);
  });

  it('respeita o limite de saltos', () => {
    const meu = (id: string): boolean =>
      ['atenas', 'eleusis', 'megara', 'corinto'].includes(id);
    // Atenas → Elêusis → Mégara → Corinto. Com dois saltos chega em Mégara, não em Corinto.
    const dois = rotasDe(atlas, 'atenas', meu, 2);
    expect(dois.get('eleusis')).toEqual(['eleusis']);
    expect(dois.get('megara')).toEqual(['eleusis', 'megara']);
    expect(dois.has('corinto')).toBe(false);

    expect(rotasDe(atlas, 'atenas', meu, 1).has('megara')).toBe(false);
    expect(rotasDe(atlas, 'atenas', meu, 3).has('corinto')).toBe(true);
  });

  it('a regra-base cruza uma fronteira: Atenas não alcança Mégara numa rodada', () => {
    const meu = (id: string): boolean => ['atenas', 'eleusis', 'megara'].includes(id);
    const rotas = rotasDe(atlas, 'atenas', meu, SALTOS);
    expect(SALTOS).toBe(1);
    expect(rotas.get('eleusis')).toEqual(['eleusis']);
    expect(rotas.has('megara')).toBe(false);
  });

  it('território alheio não é só destino proibido — ele também não deixa PASSAR', () => {
    const semEleusis = (id: string): boolean => ehDeAtenas(id) || id === 'megara';
    expect(rotasDe(atlas, 'atenas', semEleusis, 5).has('megara')).toBe(false);
  });

  it('ilha sem vizinha terrestre não é alcançável por marcha', () => {
    const comEgina = (id: string): boolean => ehDeAtenas(id) || id === 'egina';
    expect(rotasDe(atlas, 'atenas', comEgina, 5).has('egina')).toBe(false);
    expect(rotasDe(atlas, 'egina', comEgina, 5).size).toBe(0);
  });

  it('a rota escolhida não depende da ordem da vizinhança no arquivo assado', () => {
    // Determinismo (§4 do documento): a vizinhança é ordenada antes de percorrer, então a
    // mesma pergunta dá a mesma rota sempre.
    const meu = (id: string): boolean => ['atenas', 'eleusis', 'megara'].includes(id);
    const uma = rotasDe(atlas, 'atenas', meu, 2).get('megara');
    const outra = rotasDe(atlas, 'atenas', meu, 2).get('megara');
    expect(uma).toEqual(outra);
  });

  it('alcanceDe continua respondendo a pergunta SEM limite de saltos', () => {
    const meu = (id: string): boolean =>
      ['atenas', 'eleusis', 'megara', 'corinto'].includes(id);
    expect(alcanceDe(atlas, 'atenas', meu).has('corinto')).toBe(true);
  });
});
