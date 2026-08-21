import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { Ajustes, Construcoes, Economia, Exercitos, Provincias } from '../src/dados/esquema';
import { Campanha } from '../src/campanha/campanha';
import { Atlas } from '../src/mundo/atlas';
import { levantarGuarnicoes } from '../src/combate/guarnicao-inicial';

function ler<T>(esquema: { parse: (v: unknown) => T }, caminho: string): T {
  return esquema.parse(JSON.parse(readFileSync(resolve(caminho), 'utf8')));
}

const provincias = ler(Provincias, 'assets/mundo/provincias.json');
const economia = ler(Economia, 'dados/economia.json');
const construcoes = ler(Construcoes, 'dados/construcoes.json');
const exercitos = ler(Exercitos, 'dados/exercitos.json');
const ajustes = ler(Ajustes, 'dados/ajustes.json').jogo;
const combate = ajustes.combate;

function nova(): Campanha {
  return new Campanha(new Atlas(provincias), economia, construcoes, ajustes, exercitos);
}

describe('a guarnição de 700 a.C. sai da população da própria terra', () => {
  it('os homens são descontados, e o manancial continua sendo um só', () => {
    const { exercitos: postos, populacao } = levantarGuarnicoes(
      { eleusis: 500 },
      { eleusis: 12_000, atenas: 35_000 },
      () => 'eleusis',
      combate,
    );
    expect(populacao['eleusis']).toBe(11_500);
    expect(postos['eleusis']?.origem).toEqual({ eleusis: 500 });
    // Quem não tem guarnição não é tocado.
    expect(populacao['atenas']).toBe(35_000);
    expect(postos['atenas']).toBeUndefined();
  });

  it('não altera o mapa que recebe: o dado autoral continua o do arquivo', () => {
    const autoral = { eleusis: 12_000 };
    levantarGuarnicoes({ eleusis: 500 }, autoral, () => 'eleusis', combate);
    expect(autoral.eleusis).toBe(12_000);
  });

  it('guarnição em província sem população estoura, em vez de inventar gente', () => {
    expect(() => levantarGuarnicoes({ esparta: 500 }, {}, () => 'esparta', combate)).toThrow(
      /não tem população configurada/,
    );
  });

  it('o piso de população vale aqui também', () => {
    // O mesmo piso do recrutamento: uma vila de 2.100 não põe 500 homens em pé.
    expect(() =>
      levantarGuarnicoes({ eleusis: 500 }, { eleusis: 2_100 }, () => 'eleusis', combate),
    ).toThrow(/só tem 100 disponíveis/);
  });
});

describe('os dois vizinhos abrem a partida armados', () => {
  it('Elêusis e Tanagra têm 500 homens cada, e são deles', () => {
    const c = nova();
    expect(c.forcaEm('eleusis')).toBe(500);
    expect(c.forcaEm('tanagra')).toBe(500);
    expect(c.exercitoEm('eleusis')?.poder).toBe('eleusis');
    expect(c.exercitoEm('tanagra')?.poder).toBe('tanagra');
  });

  it('a Ática abre desarmada: o jogador tem que levantar a dele', () => {
    const c = nova();
    for (const id of ['atenas', 'maratona', 'sounion']) expect(c.forcaEm(id)).toBe(0);
  });

  it('a população dos dois já vem descontada, e a milícia acompanha', () => {
    const c = nova();
    expect(c.populacaoDe('eleusis')).toBe(11_500);
    expect(c.populacaoDe('tanagra')).toBe(8_500);
    // Derivada da população viva, não da escrita no arquivo: mobilizar esvazia a muralha,
    // e a guarnição inicial é mobilização como qualquer outra.
    expect(c.miliciaEm('eleusis')).toBe(Math.floor(11_500 * combate.milicia.fracao));
  });

  it('dispensar a guarnição devolve a gente, e não cria nenhuma', () => {
    const c = nova();
    c.comecar('atenas');
    const antes = c.populacaoDe('eleusis');
    c.dispensar('eleusis', 500);
    // Volta aos 12.000 do arquivo. Se a guarnição tivesse vindo de fora da população,
    // aqui apareceriam 12.500 habitantes tirados do nada.
    expect(c.populacaoDe('eleusis')).toBe(antes + 500);
    expect(c.populacaoDe('eleusis')).toBe(economia.provincias['eleusis']?.populacao);
  });

  it('500 homens já resistem: a milícia sozinha não resistia', () => {
    const c = nova();
    c.comecar('atenas');
    const milicia = c.miliciaEm('eleusis');
    // Uma leva que passava por cima da milícia agora esbarra na guarnição.
    const invasor = milicia * 2;
    expect(invasor).toBeLessThan(500);
    c.plantarHoste('atenas', 'atenas', invasor);
    c.ordenarMarcha('atenas', 'eleusis', invasor, 'atenas');
    c.passarTurno();
    expect(c.donoDe('eleusis')).toBe('eleusis');
  });
});
