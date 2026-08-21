import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { Campanha } from '../src/campanha/campanha';
import { Ajustes, Construcoes, Economia, Exercitos, Provincias } from '../src/dados/esquema';
import { Atlas } from '../src/mundo/atlas';
import { calcularCrescimentoPopulacional } from '../src/populacao/crescimento';

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

describe('crescimento populacional', () => {
  it('começa com os números exatos definidos para a Ática', () => {
    const c = nova();
    expect(c.crescimentoDe('atenas')).toMatchObject({
      atual: 35_000,
      capacidade: 70_000,
      crescimento: 175,
      proxima: 35_175,
    });
    expect(c.crescimentoDe('maratona')?.crescimento).toBe(90);
    expect(c.crescimentoDe('sounion')?.crescimento).toBe(50);
  });

  it('cresce todas as províncias configuradas ao passar o turno', () => {
    const c = nova();
    c.comecar('atenas');
    c.passarTurno();

    expect(c.populacaoDe('atenas')).toBe(35_175);
    expect(c.populacaoDe('maratona')).toBe(18_090);
    expect(c.populacaoDe('sounion')).toBe(10_050);
  });

  it('desacelera perto da capacidade, não a ultrapassa e não cria gente do zero', () => {
    const calcular = (atual: number) =>
      calcularCrescimentoPopulacional(
        atual,
        35_000,
        [],
        construcoes.construcoes,
        ajustes.populacao,
      );

    expect(calcular(69_999)).toMatchObject({ crescimento: 0, proxima: 69_999 });
    expect(calcular(70_000)).toMatchObject({ crescimento: 0, proxima: 70_000 });
    expect(calcular(0)).toMatchObject({ crescimento: 0, proxima: 0 });
  });

  it('o Celeiro aumenta em 50% o crescimento, mas só depois de concluído', () => {
    const c = nova();
    c.comecar('atenas');
    c.darOuro(500);

    expect(c.impactoPopulacionalDaConstrucaoEm('atenas', 'celeiro')).toEqual({
      antes: 175,
      depois: 262,
    });
    c.construir('atenas', 'celeiro');

    for (let turno = 0; turno < 3; turno += 1) {
      const antes = c.populacaoDe('atenas');
      const previsto = c.crescimentoDe('atenas');
      expect(previsto?.fatorConstrucoes).toBe(1);
      c.passarTurno();
      expect(c.populacaoDe('atenas') - antes).toBe(previsto?.crescimento);
    }

    expect(c.construcoesEm('atenas')).toContain('celeiro');
    expect(c.crescimentoDe('atenas')?.fatorConstrucoes).toBe(1.5);
  });
});
