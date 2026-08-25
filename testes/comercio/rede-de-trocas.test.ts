import { describe, expect, it } from 'vitest';

import type { Campanha } from '../../src/campanha/campanha';
import { ordenar } from '../apoio/hostes';
import { economia, novaCampanha } from '../apoio/mundo';

function nova(): Campanha {
  const c = novaCampanha();
  c.comecar('atenas');
  return c;
}

const bens = (c: Campanha, poder = 'atenas'): string[] =>
  c.bensEmCirculacao(poder).map((b) => b.id);

/** Os bens que as terras deste poder DÃO, ligadas ou não. É o teto do que poderia circular. */
function bensDasTerras(c: Campanha, poder: string): string[] {
  const dados = c.provinciasDe(poder).flatMap((id) => {
    const ficha = economia.provincias[id];
    return ficha ? [ficha.produto, ficha.secundario.produto] : [];
  });
  return [...new Set(dados)].sort();
}

describe('a rede de trocas: acesso a um bem, não estoque dele', () => {
  it('a Ática inteira está ligada, então tudo que ela dá circula', () => {
    const c = nova();
    expect(bens(c)).toEqual(bensDasTerras(c, 'atenas'));
    expect(bens(c).length).toBeGreaterThan(0);
  });

  it('o bem DISTINTO paga uma vez, por mais terras que o deem', () => {
    const c = nova();
    // Atenas e Maratona dão as duas o mesmo bem — e ele entra na conta uma vez só.
    const repetido = c.bensEmCirculacao('atenas').find((b) => b.provincias.length > 1);
    expect(repetido).toBeDefined();

    const esperado = bensDasTerras(c, 'atenas').reduce(
      (soma, id) => soma + (economia.produtos[id]?.troca ?? 0),
      0,
    );
    expect(c.rendaDeTrocas('atenas')).toBe(esperado);
  });

  it('o produto SECUNDÁRIO finalmente faz alguma coisa', () => {
    // Ele existia nos dados desde sempre e não entrava em conta nenhuma, esperando a regra
    // de circulação. Aqui há bem que chega ao reino só por ser o segundo de uma terra.
    const c = nova();
    const principais = new Set(
      c.provinciasDe('atenas').flatMap((id) => {
        const ficha = economia.provincias[id];
        return ficha ? [ficha.produto] : [];
      }),
    );
    const soPeloSecundario = bens(c).filter((id) => !principais.has(id));
    expect(soPeloSecundario.length).toBeGreaterThan(0);
  });

  it('a renda do reino é a soma das terras MAIS a rede', () => {
    const c = nova();
    const daTerra = c
      .provinciasDe('atenas')
      .reduce((soma, id) => soma + (c.economiaDe(id)?.total ?? 0), 0);
    expect(c.rendaDe('atenas')).toBe(daTerra + c.rendaDeTrocas('atenas'));
  });
});

describe('a rede depende da GEOGRAFIA, não só da posse', () => {
  it('reino partido em dois não faz um mercado só', () => {
    const c = nova();
    const antes = c.rendaDeTrocas('atenas');

    // Cálcis é minha, mas fica atrás de Tanagra, que não é: o ferro dela não chega.
    c.trocarDono('calcis', 'atenas');
    expect(c.provinciasDe('atenas')).toContain('calcis');
    expect(bens(c)).not.toContain('ferro');
    expect(c.rendaDeTrocas('atenas')).toBe(antes);

    // Tomado o corredor, o reino vira contínuo e os dois bens novos entram juntos.
    c.trocarDono('tanagra', 'atenas');
    expect(bens(c)).toContain('ferro');
    expect(bens(c)).toContain('vinho');
    expect(c.rendaDeTrocas('atenas')).toBe(
      antes + (economia.produtos['ferro']?.troca ?? 0) + (economia.produtos['vinho']?.troca ?? 0),
    );
  });

  it('ilha sem vizinha por terra fica de fora, mesmo sendo minha', () => {
    // Salamina não faz fronteira terrestre com nada. Ela rende como província — o imposto
    // dela entra — mas o peixe não chega à rede enquanto o mar não existir no jogo.
    const c = nova();
    const antes = c.rendaDeTrocas('atenas');
    c.trocarDono('salamina', 'atenas');

    expect(c.provinciasDe('atenas')).toContain('salamina');
    expect((c.economiaDe('salamina')?.total ?? 0) > 0).toBe(true);
    expect(bens(c)).not.toContain('peixe');
    expect(c.rendaDeTrocas('atenas')).toBe(antes);
  });

  it('cidade sitiada sai da rede como sai da mesa', () => {
    const c = nova();
    const antes = bens(c);
    // Elêusis marcha sobre Atenas e senta: a capital fica cercada.
    ordenar(c, 'eleusis', 'atenas', 500, 'eleusis', 'sitiar');
    c.passarTurno();
    expect(c.cercoEm('atenas')).toBeDefined();

    // O que só Atenas dava some da rede; o que Maratona também dá continua.
    const agora = bens(c);
    expect(agora.length).toBeLessThan(antes.length);
    expect(agora).toContain('graos');
    expect(c.rendaDeTrocas('atenas')).toBeLessThan(
      antes.reduce((soma, id) => soma + (economia.produtos[id]?.troca ?? 0), 0),
    );
  });

  it('sem capital não há mercado: a rede inteira para', () => {
    const c = nova();
    expect(c.rendaDeTrocas('atenas')).toBeGreaterThan(0);
    // Perder a capital sem escolher outra é ficar sem sede — e sem sede não há rede.
    for (const id of [...c.provinciasDe('atenas')]) c.trocarDono(id, 'megara');
    expect(c.rendaDeTrocas('atenas')).toBe(0);
    expect(bens(c)).toEqual([]);
  });
});

describe('a conquista deixa de ser sempre a mesma soma', () => {
  it('tomar um bem NOVO vale mais que tomar o mesmo bem de novo', () => {
    // Elêusis dá grão e azeite — os dois já circulam na Ática. Tanagra dá gado (que já
    // circula) e vinho, que não. As duas são vizinhas de Atenas e valem o mesmo em posse;
    // o que as separa é a variedade, e é isso que a rede põe em cima do mapa.
    const comEleusis = nova();
    const antes = comEleusis.rendaDeTrocas('atenas');
    comEleusis.trocarDono('eleusis', 'atenas');
    expect(comEleusis.rendaDeTrocas('atenas')).toBe(antes);

    const comTanagra = nova();
    comTanagra.trocarDono('tanagra', 'atenas');
    expect(comTanagra.rendaDeTrocas('atenas')).toBeGreaterThan(antes);
  });

  it('a lista do que FALTA é o mapa do que ainda há para conquistar', () => {
    const c = nova();
    const faltando = c.bensAusentes('atenas').map((b) => b.id);
    expect(faltando).not.toContain('graos');
    expect(faltando).toContain('vinho');
    // Nenhum bem aparece nas duas listas ao mesmo tempo, e juntas elas dão o catálogo.
    expect([...bens(c), ...faltando].sort()).toEqual(Object.keys(economia.produtos).sort());
  });
});
