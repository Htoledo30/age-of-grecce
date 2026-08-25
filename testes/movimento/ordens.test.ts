import { describe, expect, it } from 'vitest';

import { cancelar, ordemDe, ordenar, podeOrdenar, unicaEm } from '../apoio/hostes';
import { comHoste } from './apoio';

describe('a ordem é registrada, e nada se move', () => {
  it('ordenar não muda o mapa — é esse o ponto da resolução simultânea', () => {
    const c = comHoste(1000);
    ordenar(c, 'atenas', 'maratona', 1000);

    expect(c.forcaEm('atenas')).toBe(1000); // ainda aqui
    expect(c.forcaEm('maratona')).toBe(0);
    expect(ordemDe(c, 'atenas')).toEqual({
      origem: 'atenas',
      rota: ['maratona'],
      homens: 1000,
      postura: 'sitiar' as const,
    });
  });

  it('a ordem só acontece quando o turno vira', () => {
    const c = comHoste(1000);
    ordenar(c, 'atenas', 'maratona', 1000);
    c.passarTurno();

    expect(c.forcaEm('atenas')).toBe(0);
    expect(c.forcaEm('maratona')).toBe(1000);
    expect(unicaEm(c, 'maratona')?.poder).toBe('atenas');
    // E a terra natal não muda com a marcha: estes homens continuam devendo a Atenas.
    expect(unicaEm(c, 'maratona')?.origem).toEqual({ atenas: 1000 });
  });

  it('nenhuma ordem sobrevive à virada', () => {
    const c = comHoste(1000);
    ordenar(c, 'atenas', 'maratona', 1000);
    c.passarTurno();
    expect(c.ordens()).toEqual([]);
    // Sem isto a ordem executaria de novo, e o sintoma seria tropa andando sozinha.
    c.passarTurno();
    expect(c.forcaEm('maratona')).toBe(1000);
  });

  it('cancelar desfaz sem custo, porque nada foi gasto', () => {
    const c = comHoste(1000);
    ordenar(c, 'atenas', 'maratona', 1000);
    const tesouro = c.tesouro;
    cancelar(c, 'atenas');
    expect(ordemDe(c, 'atenas')).toBeUndefined();
    expect(c.tesouro).toBe(tesouro);
    c.passarTurno();
    expect(c.forcaEm('atenas')).toBe(1000);
  });

  it('só se marcha parte da hoste, e o resto fica defendendo', () => {
    const c = comHoste(1000);
    ordenar(c, 'atenas', 'maratona', 400);
    c.passarTurno();
    expect(c.forcaEm('atenas')).toBe(600);
    expect(c.forcaEm('maratona')).toBe(400);
  });
});

describe('a ordem recusada diz o motivo', () => {
  it('sem hoste na origem', () => {
    expect(comHoste(1000).podeOrdenarMarcha('sounion', 'maratona', 100)).toMatchObject({
      motivo: 'não há hoste aqui para marchar',
    });
  });

  it('a hoste já está no destino', () => {
    expect(podeOrdenar(comHoste(1000), 'atenas', 'atenas', 100)).toMatchObject({
      motivo: 'a hoste já está aqui',
    });
  });

  it('marchar contra terra alheia é LEGAL — é o ponto da guerra', () => {
    expect(podeOrdenar(comHoste(1000), 'atenas', 'tanagra', 100)).toMatchObject({
      pode: true,
      rota: ['tanagra'],
    });
  });

  it('mas terra alheia não serve de CAMINHO: a rota acaba nela', () => {
    const c = comHoste(1000);
    // Tebas fica depois de Tanagra, que é alheia. Dois pontos não bastam, porque a hoste
    // não atravessa o reino do vizinho — pararia em Tanagra.
    expect(podeOrdenar(c, 'atenas', 'tebas', 100)).toMatchObject({
      motivo: 'Tebas está longe demais para esta rodada',
    });
    // Elêusis é alheia e vizinha: alcançável. Mégara fica atrás dela: não.
    expect(podeOrdenar(c, 'atenas', 'eleusis', 100)).toMatchObject({ pode: true });
    expect(podeOrdenar(c, 'atenas', 'megara', 100)).toMatchObject({
      motivo: 'Mégara está longe demais para esta rodada',
    });
  });

  it('longe demais para os pontos desta rodada', () => {
    const c = comHoste(1000);
    c.trocarDono('eleusis', 'atenas');
    c.trocarDono('megara', 'atenas');
    c.trocarDono('corinto', 'atenas');
    // Com a regra-base de um trecho, nem Mégara nem Corinto cabem nesta rodada.
    expect(podeOrdenar(c, 'atenas', 'corinto', 100)).toMatchObject({
      motivo: 'Corinto está longe demais para esta rodada',
    });
    expect(podeOrdenar(c, 'atenas', 'megara', 100)).toMatchObject({
      motivo: 'Mégara está longe demais para esta rodada',
    });
  });

  it('mais homens do que existem na origem', () => {
    expect(podeOrdenar(comHoste(1000), 'atenas', 'maratona', 1001)).toMatchObject({
      motivo: 'há apenas 1.000 homens aqui',
    });
  });

  it('uma ordem por hoste por rodada', () => {
    const c = comHoste(1000);
    ordenar(c, 'atenas', 'maratona', 500);
    expect(podeOrdenar(c, 'atenas', 'sounion', 500)).toMatchObject({
      motivo: 'esta hoste já tem ordem nesta rodada',
    });
    // Cancelar libera.
    cancelar(c, 'atenas');
    expect(podeOrdenar(c, 'atenas', 'sounion', 500)).toMatchObject({ pode: true });
  });
});
