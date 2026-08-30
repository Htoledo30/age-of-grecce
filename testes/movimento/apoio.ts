/**
 * O tabuleiro mínimo da resolução pura: hostes soltas, sem campanha em volta.
 *
 * A resolução não conhece economia, humor nem catálogo — ela pergunta ao mundo. Aqui o
 * mundo é um objeto de dez linhas, e é isso que deixa os casos da tabela de adjudicação
 * serem escritos com províncias chamadas `x`, `y` e `z`.
 */

import { Campanha } from '../../src/campanha/campanha';
import { Atlas } from '../../src/mundo/atlas';
import { exercitoVazio, somarLeva } from '../../src/combate/exercito';
import type { Exercito } from '../../src/combate/exercito';
import type { EstadoDaResolucao } from '../../src/movimento/resolucao/relatorio';
import { ajustes, ajustesFartos, construcoes, economia, exercitos, provincias } from '../apoio/mundo';

export const SALTOS = ajustes.combate.saltosPorRodada;
export const combateComDoisSaltos = { ...ajustes.combate, saltosPorRodada: 2 };

/** Atenas com Quartel e tropa em pé. `darOuro` é o gancho de desenvolvimento. */
export function comHoste(homens = 1000, onde = 'atenas'): Campanha {
  // Comida fora do caminho: marcha não é assunto de despensa. Ver `ajustesFartos`.
  const c = new Campanha(new Atlas(provincias), economia, construcoes, ajustesFartos, exercitos);
  c.comecar('atenas');
  c.darOuro(60_000);
  c.construir(onde, 'quartel');
  for (let i = 0; i < 4; i++) c.passarTurno();
  c.recrutar(onde, homens);
  c.passarTurno(); // a leva deixa a formação e vira hoste ativa
  return c;
}

/**
 * Um mundo mínimo pra resolução pura: só sabe de quem é cada província e deixa trocar.
 * Quem não está na tabela pertence a `ninguem`, que nunca é dono de hoste nenhuma.
 */
export function mundoDe(
  donos: Record<string, string> = {},
  milicias: Record<string, number> = {},
  refugios: Record<string, string> = {},
) {
  const mortos: Record<string, number> = {};
  // Quem quebrou e escapou: o teste consegue conferir que os homens voltaram para casa.
  const dispersos: Record<string, number> = {};
  return {
    donos,
    dispersos,
    // As regras do choque vêm dos dados de verdade: um mundo de teste com batalha própria
    // testaria uma guerra que o jogo não joga.
    batalha: ajustes.combate.batalha,
    // Mundo de teste sem mapa: o refúgio é declarado por quem monta o cenário.
    refugio: (_provincia: string, poder: string) => refugios[poder] ?? null,
    dispersaram: (porOrigem: Readonly<Record<string, number>>) => {
      for (const [terra, quantos] of Object.entries(porOrigem)) {
        dispersos[terra] = (dispersos[terra] ?? 0) + quantos;
      }
    },
    mortos,
    donoDe: (id: string) => donos[id] ?? 'ninguem',
    // ⚠️ Neste tabuleiro todo mundo está em guerra com todo mundo, e é de propósito: estes
    // testes são de ADJUDICAÇÃO — quem luta contra quem e em que ordem. A diplomacia tem os
    // testes dela, e misturar as duas faria cada cenário daqui começar com um tratado.
    emGuerra: () => true,
    trocarDono: (id: string, poder: string) => {
      donos[id] = poder;
    },
    // O mundo mínimo não tem população nem catálogo: quem testa saque é a campanha inteira,
    // em `testes/combate/conquista.test.ts`.
    saquear: (id: string) => ({ provincia: id, mortos: 0, obra: null, nivel: 0 }),
    miliciaDe: (id: string) => milicias[id] ?? 0,
    // O tabuleiro de teste é todo de chão: as zonas marítimas têm testes próprios, e um
    // mundo sintético que fingisse ter mar mediria a ficção em vez da regra.
    ehMar: () => false,
    // Nenhuma província do mundo mínimo é fortificada: quem testa muralha é
    // `testes/cerco/`, contra os dados de verdade.
    rodadasParaAssaltar: () => 0,
    miliciaPerdida: (id: string, n: number) => {
      mortos[id] = (mortos[id] ?? 0) + n;
    },
  };
}

/**
 * Uma hoste com identidade propria, parada numa provincia.
 *
 * ⚠️ O id e derivado do nome da provincia (`h_a`) so para o teste ficar legivel. No jogo ele
 * vem de um contador no estado — a provincia deixou de ser o endereco da hoste, e e isso que
 * permite duas no mesmo lugar.
 */
export function hoste(poder: string, onde: string, homens: number): Exercito {
  const e = exercitoVazio(`h_${onde}`, poder, onde);
  somarLeva(e, onde, homens);
  return e;
}

/** Indexa as hostes por id, que e como o estado guarda. */
export function tabuleiro(...lista: Exercito[]): Record<string, Exercito> {
  return Object.fromEntries(lista.map((h) => [h.id, h]));
}

/** A hoste parada nesta provincia, se houver. */
export function em(estado: EstadoDaResolucao, provincia: string): Exercito | undefined {
  return Object.keys(estado.hostes)
    .sort()
    .map((id) => estado.hostes[id])
    .find((h) => h !== undefined && h.posicao === provincia);
}
