import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { Ajustes, Construcoes, Economia, Exercitos, Provincias } from '../src/dados/esquema';
import { Campanha } from '../src/campanha/campanha';
import { Atlas } from '../src/mundo/atlas';

function ler<T>(esquema: { parse: (v: unknown) => T }, caminho: string): T {
  return esquema.parse(JSON.parse(readFileSync(resolve(caminho), 'utf8')));
}

const provincias = ler(Provincias, 'assets/mundo/provincias.json');
const economia = ler(Economia, 'dados/economia.json');
const construcoes = ler(Construcoes, 'dados/construcoes.json');
const exercitos = ler(Exercitos, 'dados/exercitos.json');
const ajustes = ler(Ajustes, 'dados/ajustes.json').jogo;

function nova(): Campanha {
  return new Campanha(new Atlas(provincias), economia, construcoes, ajustes, exercitos);
}

/**
 * A capital ainda NÃO faz nada no jogo — ver `src/campanha/capitais.ts`. Estes testes
 * guardam o estado e a regra de derivação, que é o que o patch 0.0.9 vai construir em cima.
 */

describe('todo poder com província tem capital', () => {
  it('a província homônima manda, e é o caso comum', () => {
    const c = nova();
    expect(c.capitalDe('atenas')).toBe('atenas');
    expect(c.capitalDe('eleusis')).toBe('eleusis');
    expect(c.capitalDe('esparta')).toBe('esparta');
  });

  it('sem homônima, a maior por área — e o desempate é por id', () => {
    const c = nova();
    // Acaia tem Dime (560), Égio (1.427) e Patras (734). A maior é Égio.
    expect(c.capitalDe('acaia')).toBe('egio');
  });

  it('todos os 148 recebem uma, e sempre uma província que é deles', () => {
    const c = nova();
    const atlas = new Atlas(provincias);
    for (const poder of atlas.poderes) {
      const capital = c.capitalDe(poder.id);
      expect(capital).toBeDefined();
      if (capital) expect(c.donoDe(capital)).toBe(poder.id);
    }
  });

  it('poder sem província nenhuma não recebe capital: não há o que apontar', () => {
    expect(nova().capitalDe('poder-que-nao-existe')).toBeUndefined();
  });

  it('a derivação é determinística: duas campanhas dão a mesma tabela', () => {
    const atlas = new Atlas(provincias);
    const uma = nova();
    const outra = nova();
    for (const poder of atlas.poderes) {
      expect(uma.capitalDe(poder.id)).toBe(outra.capitalDe(poder.id));
    }
  });
});

describe('a capital perdida é uma PERGUNTA, não uma reatribuição', () => {
  it('conquistar a capital alheia marca a perda, e nada acontece sozinho', () => {
    const c = nova();
    c.comecar('atenas');
    expect(c.capitalPerdida('eleusis')).toBe(false);

    c.trocarDono('eleusis', 'atenas');

    expect(c.capitalPerdida('eleusis')).toBe(true);
    // ⚠️ NÃO se reatribui sozinha. Escolher outra é decisão do jogador, e é o patch 0.0.9 do
    // `ROADMAP.md` que vai obrigá-lo a tomá-la. Reatribuir aqui tiraria dele justamente a
    // decisão que aquele patch existe para criar.
    expect(c.capitalDe('eleusis')).toBe('eleusis');
  });

  it('quem ainda tem a sua não perdeu nada', () => {
    const c = nova();
    c.comecar('atenas');
    c.trocarDono('maratona', 'tanagra'); // perdeu uma província, não a capital
    expect(c.capitalPerdida('atenas')).toBe(false);
  });
});
