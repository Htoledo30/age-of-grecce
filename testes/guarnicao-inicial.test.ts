import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { Ajustes, Construcoes, Economia, Exercitos, Provincias } from '../src/dados/esquema';
import { Campanha } from '../src/campanha/campanha';
import { Atlas } from '../src/mundo/atlas';
import { levantarGuarnicoes } from '../src/combate/guarnicao-inicial';
import { ordenar } from './apoio/hostes';

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
    const { hostes: postos, populacao } = levantarGuarnicoes(
      { eleusis: 500 },
      { eleusis: 12_000, atenas: 35_000 },
      () => 'eleusis',
      combate,
    );
    expect(populacao['eleusis']).toBe(11_500);
    expect(Object.values(postos)[0]?.origem).toEqual({ eleusis: 500 });
    expect(Object.values(postos)[0]?.posicao).toBe('eleusis');
    // Quem não tem guarnição não é tocado.
    expect(populacao['atenas']).toBe(35_000);
    expect(Object.values(postos)).toHaveLength(1);
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

describe('o mapa abre EM PAZ: nenhuma província tem tropa', () => {
  it('província nenhuma abre com homens em armas', () => {
    const c = nova();
    const armadas = provincias.provincias
      .map((p) => p.id)
      .filter((id) => c.forcaEm(id) > 0);
    // Se um dia isto falhar, alguém repovoou `guarnicoes` — leia o comentário do arquivo
    // antes de "consertar" o teste. Tropa inicial embutida respondia "quanto exército eu
    // aguento?" antes de o jogador fazer qualquer escolha, e quebrava justo as cidades
    // que a autoria fez fortes e pobres: Tebas abria sangrando 42 por turno.
    expect(armadas).toEqual([]);
  });

  it('a população é a escrita no arquivo, sem desconto de guarnição', () => {
    const c = nova();
    for (const id of ['eleusis', 'tanagra', 'tebas', 'atenas']) {
      expect(c.populacaoDe(id)).toBe(economia.provincias[id]?.populacao);
    }
  });

  it('a milícia é a única defesa de casa, e sai da população viva', () => {
    const c = nova();
    const milicia = c.miliciaEm('eleusis');
    expect(milicia).toBeGreaterThan(0);
    expect(milicia).toBe(Math.floor(c.populacaoDe('eleusis') * combate.milicia.fracao));
  });

  it('sem guarnição, a milícia sozinha não segura uma leva de verdade', () => {
    const c = nova();
    c.comecar('atenas');
    const invasor = c.miliciaEm('eleusis') * 3;
    c.plantarHoste('atenas', 'atenas', invasor);
    ordenar(c, 'atenas', 'eleusis', invasor, 'atenas', 'assaltar');
    c.passarTurno();
    // É um passeio, e é assim de propósito até existir IA: a correção disto é a etapa 6,
    // não tropa de enfeite no arquivo de dados.
    expect(c.donoDe('eleusis')).toBe('atenas');
  });
});
