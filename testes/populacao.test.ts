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
      // ⚠️ Era 175 enquanto existia capacidade: a curva logística valia 0,5 no começo, e
      // metade da taxa era o efeito de estar na metade do teto. Sem teto, `taxaNatural`
      // vale inteira — 1% de 35.000. O número dobrou porque o freio saiu, não porque a
      // taxa mudou.
      crescimento: 350,
      proxima: 35_350,
    });
    expect(c.crescimentoDe('maratona')?.crescimento).toBe(180);
    expect(c.crescimentoDe('sounion')?.crescimento).toBe(100);
  });

  it('cresce todas as províncias configuradas ao passar o turno', () => {
    const c = nova();
    c.comecar('atenas');
    c.passarTurno();

    expect(c.populacaoDe('atenas')).toBe(35_350);
    expect(c.populacaoDe('maratona')).toBe(18_180);
    expect(c.populacaoDe('sounion')).toBe(10_100);
  });

  it('NÃO existe capacidade máxima: a taxa vale igual em qualquer tamanho', () => {
    // ⚠️ O teto de `população inicial × 2` saiu por decisão (`DECISOES.md` #24). Um número
    // amarrado ao dado autoral de 700 a.C. não é limite do mundo, é limite da planilha —
    // e ele congelava a província justamente quando ela ia bem.
    const calcular = (atual: number) =>
      calcularCrescimentoPopulacional(atual, [], construcoes.construcoes, ajustes.populacao);

    // A mesma taxa dos 35.000 iniciais continua valendo no dobro e no décuplo.
    expect(calcular(35_000).crescimento).toBe(350);
    expect(calcular(70_000).crescimento).toBe(700);
    expect(calcular(350_000).crescimento).toBe(3_500);
  });

  it('zero não se repovoa sozinho, e é isso que dá sentido ao piso de população', () => {
    const calcular = (atual: number) =>
      calcularCrescimentoPopulacional(atual, [], construcoes.construcoes, ajustes.populacao);

    expect(calcular(0)).toMatchObject({ crescimento: 0, proxima: 0 });
    // ⚠️ `Math.floor` faz o crescimento arredondar pra zero abaixo de ~101 habitantes: dali
    // a província nunca mais volta. É o motivo aritmético do `populacaoMinima`.
    expect(calcular(99).crescimento).toBe(0);
    expect(calcular(100).crescimento).toBe(1);
  });

  it('o Celeiro aumenta em 50% o crescimento, mas só depois de concluído', () => {
    const c = nova();
    c.comecar('atenas');
    c.darOuro(500);

    expect(c.impactoPopulacionalDaConstrucaoEm('atenas', 'celeiro')).toEqual({
      antes: 350,
      depois: 525,
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
