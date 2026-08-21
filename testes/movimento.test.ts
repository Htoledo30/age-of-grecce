import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { Ajustes, Construcoes, Economia, Exercitos, Provincias } from '../src/dados/esquema';
import { Campanha } from '../src/campanha/campanha';
import { Atlas } from '../src/mundo/atlas';
import { alcanceDe, rotasDe } from '../src/movimento/alcance';
import { resolverRodada } from '../src/movimento/resolucao';
import type { EstadoDaResolucao } from '../src/movimento/resolucao';
import { exercitoVazio, forcaDe, somarLeva } from '../src/combate/exercito';
import { resolverChoque } from '../src/combate/batalha';

function ler<T>(esquema: { parse: (v: unknown) => T }, caminho: string): T {
  return esquema.parse(JSON.parse(readFileSync(resolve(caminho), 'utf8')));
}

const provincias = ler(Provincias, 'assets/mundo/provincias.json');
const economia = ler(Economia, 'dados/economia.json');
const construcoes = ler(Construcoes, 'dados/construcoes.json');
const exercitos = ler(Exercitos, 'dados/exercitos.json');
const ajustes = ler(Ajustes, 'dados/ajustes.json').jogo;
const atlas = new Atlas(provincias);
const SALTOS = ajustes.combate.saltosPorRodada;
const combateComDoisSaltos = { ...ajustes.combate, saltosPorRodada: 2 };

/** Atenas com Quartel e tropa em pé. `darOuro` é o gancho de desenvolvimento. */
function comHoste(homens = 1000, onde = 'atenas'): Campanha {
  const c = new Campanha(new Atlas(provincias), economia, construcoes, ajustes, exercitos);
  c.comecar('atenas');
  c.darOuro(60_000);
  c.construir(onde, 'quartel');
  for (let i = 0; i < 4; i++) c.passarTurno();
  c.recrutar(onde, homens);
  c.passarTurno(); // a leva deixa a formação e vira hoste ativa
  return c;
}

/**
 * Um mundo mínimo pra resolução pura: só sabe de quem é cada província e deixa trocar.
 * Quem não está na tabela pertence a `ninguem`, que nunca é dono de hoste nenhuma.
 */
function mundoDe(donos: Record<string, string> = {}, milicias: Record<string, number> = {}) {
  const mortos: Record<string, number> = {};
  return {
    donos,
    mortos,
    donoDe: (id: string) => donos[id] ?? 'ninguem',
    trocarDono: (id: string, poder: string) => {
      donos[id] = poder;
    },
    miliciaDe: (id: string) => milicias[id] ?? 0,
    miliciaPerdida: (id: string, n: number) => {
      mortos[id] = (mortos[id] ?? 0) + n;
    },
  };
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

  it('a regra-base cruza uma fronteira: Atenas não alcança Mégara numa rodada', () => {
    const meu = (id: string) => ['atenas', 'eleusis', 'megara'].includes(id);
    const rotas = rotasDe(atlas, 'atenas', meu, SALTOS);
    expect(SALTOS).toBe(1);
    expect(rotas.get('eleusis')).toEqual(['eleusis']);
    expect(rotas.has('megara')).toBe(false);
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
    expect(c.ordemEm('atenas')).toEqual({
      origem: 'atenas',
      rota: ['maratona'],
      homens: 1000,
      postura: 'sitiar' as const,
    });
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

  it('marchar contra terra alheia é LEGAL — é o ponto da guerra', () => {
    expect(comHoste(1000).podeOrdenarMarcha('atenas', 'tanagra', 100)).toMatchObject({
      pode: true,
      rota: ['tanagra'],
    });
  });

  it('mas terra alheia não serve de CAMINHO: a rota acaba nela', () => {
    const c = comHoste(1000);
    // Tebas fica depois de Tanagra, que é alheia. Dois pontos não bastam, porque a hoste
    // não atravessa o reino do vizinho — pararia em Tanagra.
    expect(c.podeOrdenarMarcha('atenas', 'tebas', 100)).toMatchObject({
      motivo: 'Tebas está longe demais para esta rodada',
    });
    // Elêusis é alheia e vizinha: alcançável. Mégara fica atrás dela: não.
    expect(c.podeOrdenarMarcha('atenas', 'eleusis', 100)).toMatchObject({ pode: true });
    expect(c.podeOrdenarMarcha('atenas', 'megara', 100)).toMatchObject({
      motivo: 'Mégara está longe demais para esta rodada',
    });
  });

  it('longe demais para os pontos desta rodada', () => {
    const c = comHoste(1000);
    c.trocarDono('eleusis', 'atenas');
    c.trocarDono('megara', 'atenas');
    c.trocarDono('corinto', 'atenas');
    // Com a regra-base de um trecho, nem Mégara nem Corinto cabem nesta rodada.
    expect(c.podeOrdenarMarcha('atenas', 'corinto', 100)).toMatchObject({
      motivo: 'Corinto está longe demais para esta rodada',
    });
    expect(c.podeOrdenarMarcha('atenas', 'megara', 100)).toMatchObject({
      motivo: 'Mégara está longe demais para esta rodada',
    });
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
      ordens: { a: { origem: 'a', rota: ['b', 'c'], homens: 1000, postura: 'assaltar' as const } },
      cercos: {},
    };
    resolverRodada(estado, combateComDoisSaltos, mundoDe());
    // Quem manda a guarnição inteira embora deixa a casa aberta desde o primeiro instante.
    expect(estado.exercitos['a']).toBeUndefined();
    expect(forcaDe(estado.exercitos['c'])).toBe(1000);
    expect(estado.exercitos['b']).toBeUndefined(); // passou, não ficou
  });

  it('uma rota de um trecho não participa do passo 2', () => {
    const estado: EstadoDaResolucao = {
      exercitos: { a: hoste('atenas', 'a', 500) },
      ordens: { a: { origem: 'a', rota: ['b'], homens: 500, postura: 'assaltar' as const } },
      cercos: {},
    };
    resolverRodada(estado, ajustes.combate, mundoDe());
    expect(forcaDe(estado.exercitos['b'])).toBe(500);
  });

  it('duas hostes do mesmo poder que chegam juntas viram uma', () => {
    const estado: EstadoDaResolucao = {
      exercitos: { a: hoste('atenas', 'a', 300), b: hoste('atenas', 'b', 700) },
      ordens: {
        a: { origem: 'a', rota: ['c'], homens: 300, postura: 'assaltar' as const },
        b: { origem: 'b', rota: ['c'], homens: 700, postura: 'assaltar' as const },
      },
      cercos: {},
    };
    resolverRodada(estado, ajustes.combate, mundoDe());
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
      ordens: { a: { origem: 'a', rota: ['b'], homens: 500, postura: 'assaltar' as const } },
      cercos: {},
    };
    resolverRodada(estado, ajustes.combate, mundoDe());
    // Metade de cada, não 500 da primeira da lista: a ordem das levas não pode virar regra.
    expect(estado.exercitos['b']?.origem).toEqual({ atenas: 350, maratona: 150 });
    expect(estado.exercitos['a']?.origem).toEqual({ atenas: 350, maratona: 150 });
  });

  it('ordem cuja hoste sumiu antes da virada simplesmente não marcha', () => {
    const estado: EstadoDaResolucao = {
      exercitos: {},
      ordens: { a: { origem: 'a', rota: ['b'], homens: 500, postura: 'assaltar' as const } },
      cercos: {},
    };
    expect(() => resolverRodada(estado, ajustes.combate, mundoDe())).not.toThrow();
    expect(estado.exercitos['b']).toBeUndefined();
  });

  it('o relatório diz de onde saiu e onde parou', () => {
    const estado: EstadoDaResolucao = {
      exercitos: { a: hoste('atenas', 'a', 1000) },
      ordens: { a: { origem: 'a', rota: ['b', 'c'], homens: 400, postura: 'assaltar' as const } },
      cercos: {},
    };
    const r = resolverRodada(estado, combateComDoisSaltos, mundoDe());
    expect(r.marchas).toEqual([{ trilha: ['a', 'b', 'c'], homens: 400 }]);
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
        zacinto: { origem: 'zacinto', rota: ['meio'], homens: 300, postura: 'assaltar' as const },
        abido: { origem: 'abido', rota: ['meio'], homens: 700, postura: 'assaltar' as const },
      },
      cercos: {},
    });
    const uma = montar();
    const outra = montar();
    expect(resolverRodada(uma, ajustes.combate, mundoDe())).toEqual(
      resolverRodada(outra, ajustes.combate, mundoDe()),
    );
    expect(uma.exercitos).toEqual(outra.exercitos);
  });

  it('a ordem de inserção no registro não muda o resultado', () => {
    // `Object.entries` devolve as chaves na ordem de criação. Se a resolução percorresse
    // isso cru, o resultado passaria a depender de quem foi recrutado primeiro.
    const primeiro: EstadoDaResolucao = {
      exercitos: { zacinto: hoste('atenas', 'zacinto', 300), abido: hoste('atenas', 'abido', 700) },
      ordens: {
        zacinto: { origem: 'zacinto', rota: ['meio'], homens: 300, postura: 'assaltar' as const },
        abido: { origem: 'abido', rota: ['meio'], homens: 700, postura: 'assaltar' as const },
      },
      cercos: {},
    };
    const invertido: EstadoDaResolucao = {
      exercitos: { abido: hoste('atenas', 'abido', 700), zacinto: hoste('atenas', 'zacinto', 300) },
      ordens: {
        abido: { origem: 'abido', rota: ['meio'], homens: 700, postura: 'assaltar' as const },
        zacinto: { origem: 'zacinto', rota: ['meio'], homens: 300, postura: 'assaltar' as const },
      },
      cercos: {},
    };
    expect(resolverRodada(primeiro, ajustes.combate, mundoDe())).toEqual(
      resolverRodada(invertido, ajustes.combate, mundoDe()),
    );
    expect(primeiro.exercitos['meio']?.origem).toEqual(invertido.exercitos['meio']?.origem);
  });
});

describe('a lei quadrada: vitória apertada custa caro', () => {
  it('sobreviventes = raiz de (maior² − menor²)', () => {
    expect(resolverChoque(1000, 900)).toEqual({ vencedor: 'a', sobreviventes: 436 });
    expect(resolverChoque(1000, 500)).toEqual({ vencedor: 'a', sobreviventes: 866 });
    expect(resolverChoque(1000, 200)).toEqual({ vencedor: 'a', sobreviventes: 980 });
    expect(resolverChoque(200, 1000)).toEqual({ vencedor: 'b', sobreviventes: 980 });
  });

  it('forças iguais se aniquilam, e ninguém fica com a província', () => {
    expect(resolverChoque(500, 500)).toEqual({ vencedor: null, sobreviventes: 0 });
  });

  it('quem vence nunca termina com zero em pé', () => {
    // Sem o piso de 1, a província ficaria vazia e o resultado leria como aniquilamento
    // mútuo, que é outra coisa.
    expect(resolverChoque(1000, 999).sobreviventes).toBeGreaterThan(0);
  });
});

describe('adjudicação: os seis casos da tabela', () => {
  it('caso 1 — quem se cruza na estrada batalha, e o vencedor SEGUE e toma o destino', () => {
    const mundo = mundoDe({ x: 'a', y: 'b' });
    const estado: EstadoDaResolucao = {
      exercitos: { x: hoste('a', 'x', 1000), y: hoste('b', 'y', 600) },
      ordens: {
        x: { origem: 'x', rota: ['y'], homens: 1000, postura: 'assaltar' as const },
        y: { origem: 'y', rota: ['x'], homens: 600, postura: 'assaltar' as const },
      },
      cercos: {},
    };
    const r = resolverRodada(estado, ajustes.combate, mundo);

    // 1.000 × 600 → 800 sobrevivem. E a batalha não tem lugar: `provincia` é null.
    expect(r.batalhas).toEqual([
      { provincia: null, vencedor: 'a', perdedores: ['b'], sobreviventes: 800 },
    ]);
    expect(forcaDe(estado.exercitos['y'])).toBe(800);
    expect(estado.exercitos['x']).toBeUndefined();
    expect(mundo.donoDe('y')).toBe('a'); // seguiu e conquistou
  });

  it('caso 2 — dois que chegam na mesma província se enfrentam sem defensor', () => {
    const mundo = mundoDe({ x: 'a', y: 'b', z: 'c' });
    const estado: EstadoDaResolucao = {
      exercitos: { x: hoste('a', 'x', 1000), y: hoste('b', 'y', 600) },
      ordens: {
        x: { origem: 'x', rota: ['z'], homens: 1000, postura: 'assaltar' as const },
        y: { origem: 'y', rota: ['z'], homens: 600, postura: 'assaltar' as const },
      },
      cercos: {},
    };
    const r = resolverRodada(estado, ajustes.combate, mundo);

    expect(r.batalhas[0]).toMatchObject({ provincia: 'z', vencedor: 'a', sobreviventes: 800 });
    expect(mundo.donoDe('z')).toBe('a');
  });

  it('caso 3 — província esvaziada na partida cai sem batalha', () => {
    const mundo = mundoDe({ x: 'a', z: 'b' });
    const estado: EstadoDaResolucao = {
      exercitos: { x: hoste('a', 'x', 1000), z: hoste('b', 'z', 500) },
      ordens: {
        x: { origem: 'x', rota: ['w'], homens: 1000, postura: 'assaltar' as const }, // sai de casa inteiro
        z: { origem: 'z', rota: ['x'], homens: 500, postura: 'assaltar' as const },
      },
      cercos: {},
    };
    const r = resolverRodada(estado, ajustes.combate, mundo);

    // Fronteira desprotegida é risco real, não vantagem de interface.
    expect(r.batalhas).toEqual([]);
    expect(mundo.donoDe('x')).toBe('b');
    expect(forcaDe(estado.exercitos['x'])).toBe(500);
  });

  it('caso 4 — encontro no meio da rota cancela o percurso dos DOIS', () => {
    const mundo = mundoDe({ x: 'a', y: 'b', w: 'c', z: 'c' });
    const estado: EstadoDaResolucao = {
      exercitos: { x: hoste('a', 'x', 1000), y: hoste('b', 'y', 600) },
      ordens: {
        x: { origem: 'x', rota: ['w', 'z'], homens: 1000, postura: 'assaltar' as const }, // ia até z
        y: { origem: 'y', rota: ['w'], homens: 600, postura: 'assaltar' as const },
      },
      cercos: {},
    };
    const r = resolverRodada(estado, ajustes.combate, mundo);

    expect(r.batalhas[0]).toMatchObject({ provincia: 'w', vencedor: 'a', sobreviventes: 800 });
    // Parou em w. Não chegou em z — ao contrário do encontro na estrada, aqui existe lugar
    // onde ficar.
    expect(forcaDe(estado.exercitos['w'])).toBe(800);
    expect(estado.exercitos['z']).toBeUndefined();
    expect(mundo.donoDe('z')).toBe('c');
  });

  it('caso 5 — três no mesmo destino resolvem aos pares, da maior força pra menor', () => {
    const mundo = mundoDe({ x: 'a', y: 'b', k: 'c', z: 'd' });
    const estado: EstadoDaResolucao = {
      exercitos: {
        x: hoste('a', 'x', 1000),
        y: hoste('b', 'y', 600),
        k: hoste('c', 'k', 300),
      },
      ordens: {
        x: { origem: 'x', rota: ['z'], homens: 1000, postura: 'assaltar' as const },
        y: { origem: 'y', rota: ['z'], homens: 600, postura: 'assaltar' as const },
        k: { origem: 'k', rota: ['z'], homens: 300, postura: 'assaltar' as const },
      },
      cercos: {},
    };
    const r = resolverRodada(estado, ajustes.combate, mundo);

    // 1.000 × 600 → 800; depois 800 × 300 → 742.
    expect(r.batalhas).toHaveLength(2);
    expect(r.batalhas[0]).toMatchObject({ vencedor: 'a', perdedores: ['b'], sobreviventes: 800 });
    expect(r.batalhas[1]).toMatchObject({ vencedor: 'a', perdedores: ['c'], sobreviventes: 742 });
    expect(forcaDe(estado.exercitos['z'])).toBe(742);
  });

  it('caso 6 — o reforço CHEGA a tempo de defender', () => {
    const mundo = mundoDe({ x: 'a', y: 'a', z: 'b' });
    const estado: EstadoDaResolucao = {
      exercitos: {
        y: hoste('a', 'y', 300), // guarnição
        x: hoste('a', 'x', 700), // reforço a caminho
        z: hoste('b', 'z', 800), // atacante
      },
      ordens: {
        x: { origem: 'x', rota: ['y'], homens: 700, postura: 'assaltar' as const },
        z: { origem: 'z', rota: ['y'], homens: 800, postura: 'assaltar' as const },
      },
      cercos: {},
    };
    const r = resolverRodada(estado, ajustes.combate, mundo);

    // 300 + 700 = 1.000 contra 800 → 600 sobrevivem. Sem o reforço chegar junto, 300
    // contra 800 seria derrota — é exatamente a justiça que a simultaneidade dá.
    expect(r.batalhas[0]).toMatchObject({ provincia: 'y', vencedor: 'a', sobreviventes: 600 });
    expect(mundo.donoDe('y')).toBe('a');
    expect(forcaDe(estado.exercitos['y'])).toBe(600);
  });
});

describe('conquista', () => {
  it('província inimiga vazia cai sem batalha nenhuma', () => {
    const mundo = mundoDe({ x: 'a', y: 'b' });
    const estado: EstadoDaResolucao = {
      exercitos: { x: hoste('a', 'x', 100) },
      ordens: { x: { origem: 'x', rota: ['y'], homens: 100, postura: 'assaltar' as const } },
      cercos: {},
    };
    const r = resolverRodada(estado, ajustes.combate, mundo);
    expect(r.batalhas).toEqual([]);
    expect(r.conquistas).toEqual([{ provincia: 'y', de: 'b', para: 'a' }]);
  });

  it('quem só passa pela própria terra não conquista nada', () => {
    const mundo = mundoDe({ x: 'a', y: 'a' });
    const estado: EstadoDaResolucao = {
      exercitos: { x: hoste('a', 'x', 100) },
      ordens: { x: { origem: 'x', rota: ['y'], homens: 100, postura: 'assaltar' as const } },
      cercos: {},
    };
    expect(resolverRodada(estado, ajustes.combate, mundo).conquistas).toEqual([]);
  });

  it('aniquilamento mútuo não entrega a província a ninguém', () => {
    const mundo = mundoDe({ x: 'a', y: 'b' });
    const estado: EstadoDaResolucao = {
      exercitos: { x: hoste('a', 'x', 500), y: hoste('b', 'y', 500) },
      ordens: { x: { origem: 'x', rota: ['y'], homens: 500, postura: 'assaltar' as const } },
      cercos: {},
    };
    const r = resolverRodada(estado, ajustes.combate, mundo);
    expect(r.batalhas[0]).toMatchObject({ vencedor: null, sobreviventes: 0 });
    expect(estado.exercitos['y']).toBeUndefined();
    expect(mundo.donoDe('y')).toBe('b'); // continua de quem era
  });
});
