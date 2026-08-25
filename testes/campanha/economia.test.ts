import { describe, expect, it } from 'vitest';

import { ajustes, economia, novaCampanha as nova, provincias } from '../apoio/mundo';

describe('economia da Ática', () => {
  it('cada parcela sai da sua própria fórmula, e o total é a soma das três', () => {
    // ⚠️ **Derivado dos dados, nunca cravado.** População, nível e comércio-base são
    // balanço e mudam — um teste que crava "175" quebra a cada ajuste sem que nada esteja
    // errado. O que ele guarda é a FÓRMULA de cada parcela.
    const c = nova();

    for (const id of ['atenas', 'maratona', 'sounion']) {
      const ficha = economia.provincias[id];
      const produto = economia.produtos[ficha?.produto ?? ''];
      if (!ficha || !produto) throw new Error(`ficha ausente: ${id}`);

      const r = c.economiaDe(id);
      const segundo = economia.produtos[ficha.secundario.produto];
      if (!segundo) throw new Error(`secundário ausente: ${id}`);
      const eco = ajustes.economia;
      // ⚠️ A corrupção come as TRÊS parcelas, não só o imposto: ela é o que se perde entre
      // a província e o tesouro, e o que se perde no caminho não pergunta de onde veio a
      // moeda. O teste guarda a fórmula, não os números dela.
      const chega = (bruto: number): number => Math.round(bruto * (1 - c.corrupcaoEm(id).total));

      expect(r).toMatchObject({
        impostos: chega(ficha.populacao * eco.impostoPorHabitante),
        // A produção soma os DOIS produtos da terra, o segundo com peso.
        producao: chega(
          produto.valor * ficha.nivel +
            segundo.valor * ficha.secundario.nivel * eco.pesoDoSecundario,
        ),
        // O comércio é POSIÇÃO e não uma fatia da lavoura: `comercioBase` vezes a escala.
        comercio: chega(ficha.comercioBase * eco.escalaDeComercio),
      });
      // O total é a soma das três, e cada parcela é arredondada sozinha — é isso que faz
      // a ficha bater exata com a barra de turno, sem sobra de centavo.
      expect(r?.total).toBe((r?.impostos ?? 0) + (r?.producao ?? 0) + (r?.comercio ?? 0));
    }
  });

  it('a renda de um poder é a soma das províncias MAIS a rede de trocas', () => {
    const c = nova();
    const soma = c
      .provinciasDe('atenas')
      .reduce((total, id) => total + (c.economiaDe(id)?.total ?? 0), 0);
    // ⚠️ A rede é uma parcela NACIONAL: ela existe porque o reino alcança bens distintos,
    // não porque alguma terra os produziu. Nenhuma província a contém.
    expect(c.rendaDe('atenas')).toBe(soma + c.rendaDeTrocas('atenas'));
    expect(soma).toBeGreaterThan(0);
    expect(c.rendaDeTrocas('atenas')).toBeGreaterThan(0);
  });

  it('os produtos não valem o mesmo por nível', () => {
    const valores = Object.values(economia.produtos).map((p) => p.valor);
    expect(new Set(valores).size).toBeGreaterThan(1);
    // grão é o mais barato e metal precioso o mais caro — é o que faz o Láurion importar
    expect(economia.produtos['graos']?.valor).toBe(Math.min(...valores));
    expect(economia.produtos['metais-preciosos']?.valor).toBe(Math.max(...valores));
  });

  it('área não entra na conta', () => {
    // Maratona é a MAIOR das três em km² e a que menos rende. Se um dia alguém devolver
    // a fórmula por área, esta asserção cai.
    const porId = new Map(provincias.provincias.map((p) => [p.id, p]));
    const c = nova();
    const maior = ['atenas', 'maratona', 'sounion'].reduce((a, b) =>
      (porId.get(a)?.areaKm2 ?? 0) > (porId.get(b)?.areaKm2 ?? 0) ? a : b,
    );
    expect(maior).toBe('maratona');
    expect(c.economiaDe('maratona')?.total).toBeLessThan(c.economiaDe('atenas')?.total ?? 0);
    expect(c.economiaDe('maratona')?.total).toBeLessThan(c.economiaDe('sounion')?.total ?? 0);
  });

  it('todo dinheiro é inteiro', () => {
    const c = nova();
    c.comecar('atenas');
    for (const id of ['atenas', 'maratona', 'sounion']) {
      const e = c.economiaDe(id);
      expect(e).not.toBeNull();
      for (const n of [e?.impostos, e?.producao, e?.comercio, e?.total]) {
        expect(Number.isInteger(n)).toBe(true);
      }
    }
    // O imposto alto tem fator quebrado (1,35): é onde um arredondamento esquecido viraria
    // centavo — e o teste está aqui pra isso.
    c.definirImposto('atenas', 'alto');
    for (let i = 0; i < 6; i++) c.passarTurno();
    expect(Number.isInteger(c.tesouro)).toBe(true);
    expect(Number.isInteger(c.renda)).toBe(true);
  });
});

describe('províncias sem economia configurada', () => {
  it('a Grécia central inteira tem ficha, e nada além dela', () => {
    // A coroa em volta da Ática: Megáris, Coríntia, Beócia, Eubeia, Opunte, Siciônia e
    // Argólida. O resto do mapa continua sem ficha, e continua dizendo isso com todas as
    // letras em vez de inventar número.
    expect(Object.keys(economia.provincias).sort()).toEqual([
      'argos',
      'atenas',
      'calcis',
      'caristo',
      'cinuria',
      'corinto',
      'eleusis',
      'epidauro',
      'eretria',
      'hermione',
      'histiea',
      'maratona',
      'megara',
      'micenas',
      'opunte',
      'orcomeno',
      'plateia',
      'queroneia',
      'salamina',
      'sicion',
      'sounion',
      'tanagra',
      'tebas',
      'tespias',
      'trezena',
    ]);
  });

  it('conquistar os dois vizinhos PAGA — é o laço central do jogo fechando', () => {
    const c = nova();
    c.comecar('atenas');
    const antes = c.renda;
    for (const id of ['eleusis', 'tanagra']) c.trocarDono(id, 'atenas');
    // Sem isto, tomar terra não muda nada e o jogo não tem para onde ir.
    expect(c.renda).toBeGreaterThan(antes * 1.25);
  });

  it('não recebem economia inventada nem arrecadam', () => {
    const c = nova();
    expect(c.economiaDe('esparta')).toBeNull();
    expect(c.economiaDe('delfos')).toBeNull();
    expect(c.rendaDe('esparta')).toBe(0);
    expect(c.rendaDe('delfos')).toBe(0);
  });

  it('a campanha sabe dizer quantas ainda faltam configurar', () => {
    const c = nova();
    expect(c.semEconomia('atenas')).toBe(0);
    expect(c.semEconomia('esparta')).toBe(c.provinciasDe('esparta').length);
  });
});
