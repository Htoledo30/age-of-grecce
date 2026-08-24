import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { Ajustes, Construcoes, Economia, Exercitos, Provincias } from '../src/dados/esquema';
import { Campanha } from '../src/campanha/campanha';
import {
  corrupcaoDe,
  corrupcaoPorDistancia,
  corrupcaoPorTamanho,
} from '../src/campanha/corrupcao';
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
  const c = new Campanha(new Atlas(provincias), economia, construcoes, ajustes, exercitos);
  c.comecar('atenas');
  return c;
}

describe('as duas fatias da corrupção', () => {
  it('tamanho: nada abaixo do limiar, crescente depois, e satura abaixo do teto', () => {
    const a = ajustes.corrupcao.tamanho;
    expect(corrupcaoPorTamanho(0, a)).toBe(0);
    expect(corrupcaoPorTamanho(a.limiar, a)).toBe(0);
    const pequena = corrupcaoPorTamanho(a.limiar + 10_000, a);
    const media = corrupcaoPorTamanho(a.limiar + 100_000, a);
    const enorme = corrupcaoPorTamanho(a.limiar + 10_000_000, a);
    expect(pequena).toBeGreaterThan(0);
    expect(media).toBeGreaterThan(pequena);
    expect(enorme).toBeGreaterThan(media);
    expect(enorme).toBeLessThan(a.teto);
  });

  it('distância: zero na capital, crescente por salto, e satura abaixo do teto', () => {
    const a = ajustes.corrupcao.distancia;
    expect(corrupcaoPorDistancia(0, a)).toBe(0);
    const um = corrupcaoPorDistancia(1, a);
    const sete = corrupcaoPorDistancia(7, a);
    const canto = corrupcaoPorDistancia(26, a);
    expect(um).toBeGreaterThan(0);
    expect(sete).toBeGreaterThan(um);
    expect(canto).toBeGreaterThan(sete);
    expect(canto).toBeLessThan(a.teto);
    // O ponto de calibração escrito no ajuste: `meioCaminho` saltos compram meio teto.
    expect(corrupcaoPorDistancia(a.meioCaminho, a)).toBeCloseTo(a.teto / 2, 10);
  });

  it('as fatias se compõem sem teto artificial: 1 − (1−a)(1−b), sempre abaixo de 1', () => {
    const c = corrupcaoDe(80_000, 9, ajustes.corrupcao);
    expect(c.total).toBeCloseTo(1 - (1 - c.porTamanho) * (1 - c.porDistancia), 12);
    expect(c.total).toBeGreaterThan(Math.max(c.porTamanho, c.porDistancia));
    expect(corrupcaoDe(10_000_000, 999, ajustes.corrupcao).total).toBeLessThan(1);
  });
});

describe('a corrupção dentro da campanha', () => {
  it('a capital não paga distância; a vizinha conquistada paga um salto', () => {
    const c = nova();
    expect(c.corrupcaoEm('atenas')).toMatchObject({ saltos: 0, porDistancia: 0 });

    // Elêusis é capital de si mesma: distância zero enquanto for independente.
    expect(c.corrupcaoEm('eleusis').saltos).toBe(0);
    c.trocarDono('eleusis', 'atenas');
    // Conquistada, ela passa a responder à capital NOVA: um salto de Atenas.
    expect(c.corrupcaoEm('eleusis').saltos).toBe(1);
    expect(c.corrupcaoEm('eleusis').porDistancia).toBeGreaterThan(0);
  });

  it('o imposto aplica a fração composta, exatamente como o GDD escreve', () => {
    const c = nova();
    for (const id of ['atenas', 'maratona', 'sounion']) {
      const e = c.economiaDe(id);
      expect(e?.impostos).toBe(
        Math.round(
          c.populacaoDe(id) *
            ajustes.economia.impostoPorHabitante *
            (1 - c.corrupcaoEm(id).total),
        ),
      );
      expect(e?.corrupcao).toBeCloseTo(c.corrupcaoEm(id).total, 12);
    }
  });

  it('mudar a capital muda a renda do reino inteiro — e é por isso que ela custa', () => {
    const c = nova();
    const comCapitalEmAtenas = c.rendaDe('atenas');
    c.mudarCapital('sounion');
    const comCapitalEmSounion = c.rendaDe('atenas');
    // Atenas tem 3,5 vezes a população de Sunião: a sede longe da cidade grande deixa a
    // corrupção comer o imposto maior. Qual delas rende mais é geografia, não sorte.
    expect(comCapitalEmSounion).toBeLessThan(comCapitalEmAtenas);
  });

  it('a distância é geografia: inimigo no caminho não alonga a estrada', () => {
    const c = nova();
    const antes = c.corrupcaoEm('sounion').saltos;
    // Elêusis, vizinha de Atenas, muda de dono — e o caminho de Sunião não muda.
    c.trocarDono('eleusis', 'tanagra');
    expect(c.corrupcaoEm('sounion').saltos).toBe(antes);
  });
});
