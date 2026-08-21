import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { Ajustes, Construcoes, Economia, Provincias } from '../src/dados/esquema';
import { Campanha } from '../src/campanha/campanha';
import { Atlas } from '../src/mundo/atlas';
import { alcanceDe, rotasDe } from '../src/movimento/alcance';
import { resolverRodada } from '../src/movimento/resolucao';
import type { EstadoDaResolucao } from '../src/movimento/resolucao';
import { exercitoVazio, forcaDe, somarLeva } from '../src/combate/exercito';

function ler<T>(esquema: { parse: (v: unknown) => T }, caminho: string): T {
  return esquema.parse(JSON.parse(readFileSync(resolve(caminho), 'utf8')));
}

const provincias = ler(Provincias, 'assets/mundo/provincias.json');
const economia = ler(Economia, 'dados/economia.json');
const construcoes = ler(Construcoes, 'dados/construcoes.json');
const ajustes = ler(Ajustes, 'dados/ajustes.json').jogo;
const atlas = new Atlas(provincias);
const SALTOS = ajustes.combate.saltosPorRodada;

/** Atenas com Quartel e tropa em pé. `darOuro` é o gancho de desenvolvimento. */
function comHoste(homens = 1000, onde = 'atenas'): Campanha {
  const c = new Campanha(new Atlas(provincias), economia, construcoes, ajustes);
  c.comecar('atenas');
  c.darOuro(60_000);
  c.construir(onde, 'quartel');
  for (let i = 0; i < 4; i++) c.passarTurno();
  c.recrutar(onde, homens);
  return c;
}

/** Uma hoste solta, sem campanha em volta: é o que a resolução pura precisa. */
function hoste(poder: string, origem: string, homens: number) {
  const e = exercitoVazio(poder);
  somarLeva(e, origem, homens);
  return e;
}

describe('rotas: até onde a hoste vai NESTA rodada', () => {
  const ehDeAtenas = (id: string) => ['atenas', 'maratona', 'sounion'].includes(id);

  it('devolve a rota até cada destino, não só o destino', () => {
    const rotas = rotasDe(atlas, 'atenas', ehDeAtenas, SALTOS);
    // Vizinhas diretas: um trecho só. A rota guardada é o que permite interceptar no meio.
    expect(rotas.get('maratona')).toEqual(['maratona']);
    expect(rotas.get('sounion')).toEqual(['sounion']);
    expect(rotas.has('atenas')).toBe(false);
  });

  it('respeita o limite de saltos', () => {
    const meu = (id: string) => ['atenas', 'eleusis', 'megara', 'corinto'].includes(id);
    // Atenas → Elêusis → Mégara → Corinto. Com dois saltos chega em Mégara, não em Corinto.
    const dois = rotasDe(atlas, 'atenas', meu, 2);
    expect(dois.get('eleusis')).toEqual(['eleusis']);
    expect(dois.get('megara')).toEqual(['eleusis', 'megara']);
    expect(dois.has('corinto')).toBe(false);

    expect(rotasDe(atlas, 'atenas', meu, 1).has('megara')).toBe(false);
    expect(rotasDe(atlas, 'atenas', meu, 3).has('corinto')).toBe(true);
  });

  it('território alheio não é só destino proibido — ele também não deixa PASSAR', () => {
    const semEleusis = (id: string) => ehDeAtenas(id) || id === 'megara';
    expect(rotasDe(atlas, 'atenas', semEleusis, 5).has('megara')).toBe(false);
  });

  it('ilha sem vizinha terrestre não é alcançável por marcha', () => {
    const comEgina = (id: string) => ehDeAtenas(id) || id === 'egina';
    expect(rotasDe(atlas, 'atenas', comEgina, 5).has('egina')).toBe(false);
    expect(rotasDe(atlas, 'egina', comEgina, 5).size).toBe(0);
  });

  it('a rota escolhida não depende da ordem da vizinhança no arquivo assado', () => {
    // Determinismo (§4 do documento): a vizinhança é ordenada antes de percorrer, então a
    // mesma pergunta dá a mesma rota sempre.
    const meu = (id: string) => ['atenas', 'eleusis', 'megara'].includes(id);
    const uma = rotasDe(atlas, 'atenas', meu, 2).get('megara');
    const outra = rotasDe(atlas, 'atenas', meu, 2).get('megara');
    expect(uma).toEqual(outra);
  });

  it('alcanceDe continua respondendo a pergunta SEM limite de saltos', () => {
    const meu = (id: string) => ['atenas', 'eleusis', 'megara', 'corinto'].includes(id);
    expect(alcanceDe(atlas, 'atenas', meu).has('corinto')).toBe(true);
  });
});

describe('a ordem é registrada, e nada se move', () => {
  it('ordenar não muda o mapa — é esse o ponto da resolução simultânea', () => {
    const c = comHoste(1000);
    c.ordenarMarcha('atenas', 'maratona', 1000);

    expect(c.forcaEm('atenas')).toBe(1000); // ainda aqui
    expect(c.forcaEm('maratona')).toBe(0);
    expect(c.ordemEm('atenas')).toEqual({ origem: 'atenas', rota: ['maratona'], homens: 1000 });
  });

  it('a ordem só acontece quando o turno vira', () => {
    const c = comHoste(1000);
    c.ordenarMarcha('atenas', 'maratona', 1000);
    c.passarTurno();

    expect(c.forcaEm('atenas')).toBe(0);
    expect(c.forcaEm('maratona')).toBe(1000);
    expect(c.exercitoEm('maratona')?.poder).toBe('atenas');
    // E a terra natal não muda com a marcha: estes homens continuam devendo a Atenas.
    expect(c.exercitoEm('maratona')?.origem).toEqual({ atenas: 1000 });
  });

  it('nenhuma ordem sobrevive à virada', () => {
    const c = comHoste(1000);
    c.ordenarMarcha('atenas', 'maratona', 1000);
    c.passarTurno();
    expect(c.ordens()).toEqual([]);
    // Sem isto a ordem executaria de novo, e o sintoma seria tropa andando sozinha.
    c.passarTurno();
    expect(c.forcaEm('maratona')).toBe(1000);
  });

  it('cancelar desfaz sem custo, porque nada foi gasto', () => {
    const c = comHoste(1000);
    c.ordenarMarcha('atenas', 'maratona', 1000);
    const tesouro = c.tesouro;
    c.cancelarOrdem('atenas');
    expect(c.ordemEm('atenas')).toBeUndefined();
    expect(c.tesouro).toBe(tesouro);
    c.passarTurno();
    expect(c.forcaEm('atenas')).toBe(1000);
  });

  it('só se marcha parte da hoste, e o resto fica defendendo', () => {
    const c = comHoste(1000);
    c.ordenarMarcha('atenas', 'maratona', 400);
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
    expect(comHoste(1000).podeOrdenarMarcha('atenas', 'atenas', 100)).toMatchObject({
      motivo: 'a hoste já está aqui',
    });
  });

  it('o destino não é seu', () => {
    expect(comHoste(1000).podeOrdenarMarcha('atenas', 'tanagra', 100)).toMatchObject({
      motivo: 'Tanagra não é sua',
    });
  });

  it('longe demais para os pontos desta rodada', () => {
    const c = comHoste(1000);
    c.trocarDono('eleusis', 'atenas');
    c.trocarDono('megara', 'atenas');
    c.trocarDono('corinto', 'atenas');
    // Corinto está a três trechos; a hoste tem dois pontos.
    expect(c.podeOrdenarMarcha('atenas', 'corinto', 100)).toMatchObject({
      motivo: 'Corinto está longe demais para esta rodada',
    });
    expect(c.podeOrdenarMarcha('atenas', 'megara', 100)).toMatchObject({ pode: true });
  });

  it('mais homens do que existem na origem', () => {
    expect(comHoste(1000).podeOrdenarMarcha('atenas', 'maratona', 1001)).toMatchObject({
      motivo: 'há apenas 1.000 homens aqui',
    });
  });

  it('uma ordem por hoste por rodada', () => {
    const c = comHoste(1000);
    c.ordenarMarcha('atenas', 'maratona', 500);
    expect(c.podeOrdenarMarcha('atenas', 'sounion', 500)).toMatchObject({
      motivo: 'esta hoste já tem ordem nesta rodada',
    });
    // Cancelar libera.
    c.cancelarOrdem('atenas');
    expect(c.podeOrdenarMarcha('atenas', 'sounion', 500)).toMatchObject({ pode: true });
  });
});

describe('resolução: partida, chegada, choque', () => {
  it('a origem fica vazia já no passo 1 de uma rota de dois trechos', () => {
    const estado: EstadoDaResolucao = {
      exercitos: { a: hoste('atenas', 'a', 1000) },
      ordens: { a: { origem: 'a', rota: ['b', 'c'], homens: 1000 } },
    };
    resolverRodada(estado, 2);
    // Quem manda a guarnição inteira embora deixa a casa aberta desde o primeiro instante.
    expect(estado.exercitos['a']).toBeUndefined();
    expect(forcaDe(estado.exercitos['c'])).toBe(1000);
    expect(estado.exercitos['b']).toBeUndefined(); // passou, não ficou
  });

  it('uma rota de um trecho não participa do passo 2', () => {
    const estado: EstadoDaResolucao = {
      exercitos: { a: hoste('atenas', 'a', 500) },
      ordens: { a: { origem: 'a', rota: ['b'], homens: 500 } },
    };
    resolverRodada(estado, 2);
    expect(forcaDe(estado.exercitos['b'])).toBe(500);
  });

  it('duas hostes do mesmo poder que chegam juntas viram uma', () => {
    const estado: EstadoDaResolucao = {
      exercitos: { a: hoste('atenas', 'a', 300), b: hoste('atenas', 'b', 700) },
      ordens: {
        a: { origem: 'a', rota: ['c'], homens: 300 },
        b: { origem: 'b', rota: ['c'], homens: 700 },
      },
    };
    resolverRodada(estado, 2);
    expect(forcaDe(estado.exercitos['c'])).toBe(1000);
    // A terra natal de cada um sobrevive à fusão.
    expect(estado.exercitos['c']?.origem).toEqual({ a: 300, b: 700 });
  });

  it('o destacamento leva uma parcela proporcional de cada terra natal', () => {
    const misturada = exercitoVazio('atenas');
    somarLeva(misturada, 'atenas', 700);
    somarLeva(misturada, 'maratona', 300);
    const estado: EstadoDaResolucao = {
      exercitos: { a: misturada },
      ordens: { a: { origem: 'a', rota: ['b'], homens: 500 } },
    };
    resolverRodada(estado, 2);
    // Metade de cada, não 500 da primeira da lista: a ordem das levas não pode virar regra.
    expect(estado.exercitos['b']?.origem).toEqual({ atenas: 350, maratona: 150 });
    expect(estado.exercitos['a']?.origem).toEqual({ atenas: 350, maratona: 150 });
  });

  it('ordem cuja hoste sumiu antes da virada simplesmente não marcha', () => {
    const estado: EstadoDaResolucao = {
      exercitos: {},
      ordens: { a: { origem: 'a', rota: ['b'], homens: 500 } },
    };
    expect(() => resolverRodada(estado, 2)).not.toThrow();
    expect(estado.exercitos['b']).toBeUndefined();
  });

  it('o relatório diz de onde saiu e onde parou', () => {
    const estado: EstadoDaResolucao = {
      exercitos: { a: hoste('atenas', 'a', 1000) },
      ordens: { a: { origem: 'a', rota: ['b', 'c'], homens: 400 } },
    };
    const r = resolverRodada(estado, 2);
    expect(r.marchas).toEqual([{ origem: 'a', destino: 'c', homens: 400 }]);
  });
});

describe('determinismo — a exigência que não é opcional', () => {
  it('a mesma rodada resolvida duas vezes dá o mesmo resultado', () => {
    const montar = (): EstadoDaResolucao => ({
      exercitos: {
        zacinto: hoste('atenas', 'zacinto', 300),
        abido: hoste('atenas', 'abido', 700),
      },
      ordens: {
        zacinto: { origem: 'zacinto', rota: ['meio'], homens: 300 },
        abido: { origem: 'abido', rota: ['meio'], homens: 700 },
      },
    });
    const uma = montar();
    const outra = montar();
    expect(resolverRodada(uma, 2)).toEqual(resolverRodada(outra, 2));
    expect(uma.exercitos).toEqual(outra.exercitos);
  });

  it('a ordem de inserção no registro não muda o resultado', () => {
    // `Object.entries` devolve as chaves na ordem de criação. Se a resolução percorresse
    // isso cru, o resultado passaria a depender de quem foi recrutado primeiro.
    const primeiro: EstadoDaResolucao = {
      exercitos: { zacinto: hoste('atenas', 'zacinto', 300), abido: hoste('atenas', 'abido', 700) },
      ordens: {
        zacinto: { origem: 'zacinto', rota: ['meio'], homens: 300 },
        abido: { origem: 'abido', rota: ['meio'], homens: 700 },
      },
    };
    const invertido: EstadoDaResolucao = {
      exercitos: { abido: hoste('atenas', 'abido', 700), zacinto: hoste('atenas', 'zacinto', 300) },
      ordens: {
        abido: { origem: 'abido', rota: ['meio'], homens: 700 },
        zacinto: { origem: 'zacinto', rota: ['meio'], homens: 300 },
      },
    };
    expect(resolverRodada(primeiro, 2)).toEqual(resolverRodada(invertido, 2));
    expect(primeiro.exercitos['meio']?.origem).toEqual(invertido.exercitos['meio']?.origem);
  });
});
