import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { Ajustes, Construcoes, Economia, Exercitos, Provincias } from '../src/dados/esquema';
import { Campanha } from '../src/campanha/campanha';
import { Atlas } from '../src/mundo/atlas';
import { producaoDeUmRecurso, produtoresEm } from '../src/producao/producao-fisica';

function ler<T>(esquema: { parse: (v: unknown) => T }, caminho: string): T {
  return esquema.parse(JSON.parse(readFileSync(resolve(caminho), 'utf8')));
}

const provincias = ler(Provincias, 'assets/mundo/provincias.json');
const economia = ler(Economia, 'dados/economia.json');
const construcoes = ler(Construcoes, 'dados/construcoes.json');
const exercitos = ler(Exercitos, 'dados/exercitos.json');
const ajustes = ler(Ajustes, 'dados/ajustes.json').jogo;
const escala = ajustes.economia.producao;

function nova(): Campanha {
  const c = new Campanha(new Atlas(provincias), economia, construcoes, ajustes, exercitos);
  c.comecar('atenas');
  return c;
}

/** Quanto a província tira de um produto, por id. `undefined` se ela não o produz. */
function colheitaDe(c: Campanha, provincia: string, produto: string): number | undefined {
  return c.producaoFisicaEm(provincia).find((r) => r.produto === produto)?.unidades;
}

/**
 * A conta esperada, derivada dos DADOS e não cravada.
 *
 * ⚠️ Escrever "Atenas colhe 1.260" aqui faria o teste reprovar no dia em que a escala
 * fosse balanceada — que é justamente o que o patch 0.0.4 vai fazer. O que este arquivo
 * guarda é a fórmula e as relações, nunca o número de balanço.
 */
function esperado(populacao: number, nivel: number): number {
  return Math.floor(Math.floor(populacao * escala.fracaoProdutiva) * nivel * escala.porProdutorPorNivel);
}

describe('a terra passou a dar coisa, e não só dinheiro', () => {
  it('o principal produz, pela fórmula potencial × produtores', () => {
    const c = nova();
    const ficha = economia.provincias['atenas'];
    expect(ficha).toBeDefined();
    expect(colheitaDe(c, 'atenas', ficha?.produto ?? '')).toBe(
      esperado(c.populacaoDe('atenas'), ficha?.nivel ?? 0),
    );
  });

  it('o secundário produz também, pela MESMA fórmula', () => {
    // Ele sai menor sozinho, porque o nível dele é menor — não existe multiplicador de
    // "ser secundário" em lugar nenhum, e é isso que este teste guarda.
    const c = nova();
    const ficha = economia.provincias['atenas'];
    const segundo = ficha?.secundario;
    expect(segundo).toBeDefined();
    expect(colheitaDe(c, 'atenas', segundo?.produto ?? '')).toBe(
      esperado(c.populacaoDe('atenas'), segundo?.nivel ?? 0),
    );
    const principal = colheitaDe(c, 'atenas', ficha?.produto ?? '') ?? 0;
    expect(colheitaDe(c, 'atenas', segundo?.produto ?? '') ?? 0).toBeLessThan(principal);
  });

  it('potencial maior rende mais, com a mesma gente', () => {
    const gente = 20_000;
    expect(producaoDeUmRecurso(gente, 4, escala)).toBeGreaterThan(
      producaoDeUmRecurso(gente, 2, escala),
    );
    expect(producaoDeUmRecurso(gente, 1, escala)).toBeGreaterThan(0);
    // Nível zero não existe nos dados, mas a função não pode inventar produção com ele.
    expect(producaoDeUmRecurso(gente, 0, escala)).toBe(0);
  });

  it('gente é o outro fator: sem ninguém, a terra não dá nada', () => {
    expect(produtoresEm(0, escala)).toBe(0);
    expect(producaoDeUmRecurso(0, 5, escala)).toBe(0);
    expect(producaoDeUmRecurso(-100, 5, escala)).toBe(0);
  });

  it('província sem ficha econômica não passa a produzir', () => {
    // Tebas é uma das 200 sem economia configurada. Ela não arrecada e não colhe.
    const c = nova();
    expect(c.producaoFisicaEm('tebas')).toEqual([]);
    c.passarTurno();
    expect(c.estoqueEm('tebas')).toEqual({});
  });
});

describe('a colheita entra no celeiro da própria província', () => {
  it('passar o turno soma a produção ao estoque, produto por produto', () => {
    const c = nova();
    const antes = { ...c.estoqueEm('eleusis') };
    const colheita = c.producaoFisicaEm('eleusis');
    c.passarTurno();

    for (const recurso of colheita) {
      expect(c.estoqueEm('eleusis')[recurso.produto]).toBe(
        (antes[recurso.produto] ?? 0) + recurso.unidades,
      );
    }
  });

  it('dois turnos acumulam duas colheitas', () => {
    const c = nova();
    const ficha = economia.provincias['sounion'];
    const produto = ficha?.produto ?? '';
    const antes = c.estoqueEm('sounion')[produto] ?? 0;

    const primeira = colheitaDe(c, 'sounion', produto) ?? 0;
    c.passarTurno();
    const segunda = colheitaDe(c, 'sounion', produto) ?? 0;
    c.passarTurno();

    // Somadas, e não sobrescritas. As duas parcelas são lidas antes de cada virada porque
    // a população cresce no meio — a segunda colheita não é igual à primeira.
    expect(c.estoqueEm('sounion')[produto]).toBe(antes + primeira + segunda);
  });

  it('o estoque é da PROVÍNCIA: não existe depósito do poder', () => {
    const c = nova();
    c.passarTurno();
    // Cada uma guarda o que ela mesma tirou do chão; nada vai parar num lugar só.
    expect(c.estoqueEm('eleusis')['graos']).toBeGreaterThan(0);
    expect(c.estoqueEm('maratona')['graos']).toBeGreaterThan(0);
    expect(c.estoqueEm('eleusis')['graos']).not.toBe(c.estoqueEm('maratona')['graos']);
  });

  it('ninguém consome nem perde nada ainda: o estoque só sobe', () => {
    const c = nova();
    let anterior = c.estoqueEm('atenas')['graos'] ?? 0;
    for (let i = 0; i < 5; i++) {
      c.passarTurno();
      const agora = c.estoqueEm('atenas')['graos'] ?? 0;
      expect(agora).toBeGreaterThan(anterior);
      anterior = agora;
    }
  });
});

describe('a população manda na colheita', () => {
  it('recrutar encolhe a província e a colheita seguinte encolhe junto', () => {
    const c = nova();
    c.darOuro(60_000);
    c.construir('atenas', 'quartel');
    for (let i = 0; i < 4; i++) c.passarTurno();

    const povoAntes = c.populacaoDe('atenas');
    const antes = c.producaoFisicaEm('atenas');
    c.recrutar('atenas', 3000);
    const depois = c.producaoFisicaEm('atenas');

    // Não é regra nova: a produção lê a população ATUAL, e recrutar tira gente na hora.
    expect(c.populacaoDe('atenas')).toBe(povoAntes - 3000);
    for (const recurso of antes) {
      const igual = depois.find((r) => r.produto === recurso.produto);
      expect(igual?.unidades ?? 0).toBeLessThan(recurso.unidades);
    }
  });

  it('o potencial natural do dado NÃO muda — nem com o tempo, nem com investimento', () => {
    const c = nova();
    const ficha = economia.provincias['eleusis'];
    const nivelInicial = ficha?.nivel ?? 0;

    c.darOuro(60_000);
    c.trocarDono('eleusis', 'atenas');
    c.investir('eleusis', 500);
    for (let i = 0; i < 6; i++) c.passarTurno();

    expect(economia.provincias['eleusis']?.nivel).toBe(nivelInicial);
    expect(c.producaoFisicaEm('eleusis')[0]?.nivel).toBe(nivelInicial);
    // Investir paga mais gente para explorar (isso é a renda em moeda), nunca muda o que a
    // terra tem — `DECISOES.md` #41.
    expect(colheitaDe(c, 'eleusis', ficha?.produto ?? '')).toBe(
      esperado(c.populacaoDe('eleusis'), nivelInicial),
    );
  });
});

describe('a economia em moeda continua de pé, ao lado da física', () => {
  it('colher não cria nem tira dinheiro', () => {
    const c = nova();
    const tesouro = c.tesouro;
    const esperadoNoCaixa = tesouro + c.renda - c.manutencao;
    c.passarTurno();
    // O estoque encheu, e o caixa andou exatamente o que a renda antiga mandava. Se a
    // colheita virasse dinheiro sozinha, este número não fecharia.
    expect(c.tesouro).toBe(esperadoNoCaixa);
    expect(c.estoqueEm('atenas')['azeite']).toBeGreaterThan(0);
  });

  it('a renda antiga continua respondendo pelas mesmas parcelas', () => {
    const c = nova();
    const renda = c.economiaDe('atenas');
    expect(renda?.total).toBe((renda?.impostos ?? 0) + (renda?.producao ?? 0) + (renda?.comercio ?? 0));
    expect(renda?.producao).toBeGreaterThan(0);
    // A parcela em moeda chamada "produção" e a colheita física são coisas diferentes e
    // convivem: somar uma na outra contaria o mesmo trigo duas vezes.
    expect(colheitaDe(c, 'atenas', 'azeite')).not.toBe(renda?.producao);
  });
});
