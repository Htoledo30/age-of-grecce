import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { Provincias } from '../src/dados/esquema';
import { Atlas } from '../src/mundo/atlas';

// Contra o recorte DE VERDADE: é o que faz estes testes pegarem uma mudança no mapa, e
// não só uma mudança no código.
const provincias = Provincias.parse(
  JSON.parse(readFileSync(resolve('assets/mundo/provincias.json'), 'utf8')),
);
const atlas = new Atlas(provincias);

describe('atlas: o mundo assado e indexado', () => {
  it('conhece o recorte inteiro: 196 terras e 48 zonas de mar', () => {
    // ⚠️ O atlas guarda os DOIS tabuleiros na mesma lista, e `terras` separa. As zonas de
    // água entraram para o exército poder atravessar o Egeu; elas não têm dono, não se
    // conquistam e não contam como território de ninguém.
    expect(atlas.terras).toHaveLength(196);
    expect(atlas.provincias.filter((p) => p.mar === true)).toHaveLength(48);
    expect(atlas.provincias).toHaveLength(244);
    expect(atlas.poderes).toHaveLength(139);
    expect(atlas.impressaoDigital).toEqual({
      epoca: provincias.epoca,
      provincias: 244,
      poderes: 139,
    });
  });

  it('a água é água, e o chão é chão', () => {
    expect(atlas.ehMar('golfo-saronico')).toBe(true);
    expect(atlas.ehMar('atenas')).toBe(false);
    // ⚠️ Salamina deixou de ser inalcançável: ela encosta no Estreito de Salamina, e uma
    // hoste que embarque num Porto ateniense chega lá. Continua sendo ILHA — nenhuma
    // vizinha dela é chão —, e é essa a diferença que `semVizinhaPorTerra` guarda.
    expect(atlas.semVizinhaPorTerra('salamina')).toBe(true);
    expect(atlas.vizinhasDe('salamina').length).toBeGreaterThan(0);
    expect(atlas.vizinhasDe('rodes').every((v) => atlas.ehMar(v))).toBe(true);
  });

  it('acha província por id e por índice, e o índice 0 é o mar', () => {
    expect(atlas.provincia('atenas').nome).toBe('Atenas');
    expect(atlas.nomeDe('sounion')).toBe('Sunião');
    const atenas = atlas.provincia('atenas');
    expect(atlas.porIndice(atenas.indice)?.id).toBe('atenas');
    // 0 é reservado pro mar em provincias.png — não pode resolver pra província nenhuma.
    expect(atlas.porIndice(0)).toBeUndefined();
  });

  it('estoura com o nome do culpado quando o id não existe', () => {
    expect(() => atlas.provincia('cartago')).toThrow(/província inexistente: cartago/);
    expect(() => atlas.poder('roma')).toThrow(/poder inexistente: roma/);
    expect(atlas.existe('cartago')).toBe(false);
    expect(atlas.existePoder('roma')).toBe(false);
  });

  it('a vizinhança por terra é simétrica', () => {
    // Assimetria aqui não daria erro nenhum: daria exército marchando num sentido só.
    const torto: string[] = [];
    for (const p of atlas.provincias) {
      for (const vizinha of p.vizinhas) {
        if (!atlas.vizinhasDe(vizinha).includes(p.id)) torto.push(`${p.id} → ${vizinha}`);
      }
    }
    expect(torto).toEqual([]);
  });

  it('26 províncias não têm nenhuma vizinha por terra', () => {
    const ilhadas = atlas.provincias.filter((p) => atlas.semVizinhaPorTerra(p.id));
    expect(ilhadas).toHaveLength(26);
    // Egina é o caso que importa: uma potência naval arcaica que, sem mar, não tem jogada
    // legal nenhuma.
    expect(ilhadas.map((p) => p.id)).toContain('egina');
  });

  it('o mapa tem 29 pedaços políticos desconexos', () => {
    expect(atlas.componentes).toBe(29);
    // Dentro de Creta se anda por terra; de Atenas pra Creta, não.
    expect(atlas.mesmoContinente('atenas', 'eleusis')).toBe(true);
    expect(atlas.mesmoContinente('atenas', 'egina')).toBe(false);
  });

  it('as Cíclades pequenas formam três arquipélagos legíveis', () => {
    expect(atlas.provincia('andros')).toMatchObject({
      nome: 'Cíclades do Norte',
      dono: 'andros',
    });
    expect(atlas.provincia('naxos')).toMatchObject({
      nome: 'Cíclades Centrais',
      dono: 'naxos',
    });
    expect(atlas.provincia('melos')).toMatchObject({
      nome: 'Cíclades Ocidentais',
      dono: 'melos',
    });
    // A área somada prova que as outras massas continuam no mapa como partes clicáveis do
    // arquipélago, mesmo sem fingirem ser nove reinos separados.
    expect(atlas.provincia('andros').areaKm2).toBeGreaterThan(900);
    expect(atlas.provincia('naxos').areaKm2).toBeGreaterThan(900);
    // ⚠️ As Ocidentais encolheram de propósito: Tera e Anafi passaram para as Centrais, que é
    // o que fez aquele grupo virar UMA mancha em vez de duas. Ver `agua-do-arquipelago.ts`.
    expect(atlas.provincia('melos').areaKm2).toBeGreaterThan(250);
    for (const antiga of ['miconos', 'tinos', 'keos', 'citnos', 'paros', 'ios', 'amorgos', 'sifnos', 'tera']) {
      expect(atlas.existe(antiga)).toBe(false);
      expect(atlas.existePoder(antiga)).toBe(false);
    }
  });

  it('o dono do arquivo assado é o dono INICIAL, de 700 a.C.', () => {
    expect(atlas.donoInicial('atenas')).toBe('atenas');
    expect(atlas.donoInicial('maratona')).toBe('atenas');
  });

  it('vizinhança responde nos dois sentidos', () => {
    expect(atlas.saoVizinhasPorTerra('atenas', 'eleusis')).toBe(true);
    expect(atlas.saoVizinhasPorTerra('eleusis', 'atenas')).toBe(true);
    expect(atlas.saoVizinhasPorTerra('atenas', 'esparta')).toBe(false);
  });

  it('recusa um recorte com dono ou vizinha que não existe', () => {
    const quebrado = structuredClone(provincias);
    quebrado.provincias[0]!.dono = 'poder-que-nao-existe';
    expect(() => new Atlas(quebrado)).toThrow(/dono inexistente/);

    const outro = structuredClone(provincias);
    outro.provincias[0]!.vizinhas = ['provincia-que-nao-existe'];
    expect(() => new Atlas(outro)).toThrow(/vizinha inexistente/);
  });
});
