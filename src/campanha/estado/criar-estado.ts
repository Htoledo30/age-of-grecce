/**
 * O mundo de 700 a.C. copiado dos arquivos para o estado da partida.
 *
 * A fronteira é esta: o que está em `dados/*.json` é a **condição inicial**; a partir daqui
 * a verdade corrente é o `EstadoCampanha`. População encolhe ao recrutar, humor caminha,
 * dono muda na conquista — e nada disso volta pro arquivo.
 */

import type { Ajustes, Construcoes, Economia, Exercitos } from '@/dados/esquema';
import type { Atlas } from '@/mundo/atlas';
import { levantarGuarnicoes } from '@/combate/guarnicao-inicial';
import type { EstadoCampanha } from '../estado-campanha';

type AjustesDoJogo = Ajustes['jogo'];

/**
 * O que o Zod de cada arquivo não tem como conferir sozinho: as referências ENTRE eles.
 *
 * Um id errado aqui viraria uma construção fantasma — contada na lista da ficha, sem efeito
 * nenhum na renda — ou um requisito que nunca se cumpre.
 */
export function conferirCatalogos(
  atlas: Atlas,
  economia: Economia,
  catalogo: Construcoes['construcoes'],
): void {
  for (const [id, ficha] of Object.entries(economia.provincias)) {
    if (!atlas.existe(id)) {
      throw new Error(`economia.json descreve província inexistente: ${id}`);
    }
    for (const construcao of Object.keys(ficha.construcoes)) {
      if (!catalogo[construcao]) {
        throw new Error(`economia.json dá a ${id} uma construção inexistente: ${construcao}`);
      }
    }
  }
  for (const [id, construcao] of Object.entries(catalogo)) {
    for (const produto of construcao.requisito?.produtos ?? []) {
      if (!economia.produtos[produto]) {
        throw new Error(`construção ${id} exige produto inexistente: ${produto}`);
      }
    }
  }
}

/**
 * O estado do turno zero.
 *
 * ⚠️ As capitais ficam vazias aqui de propósito: a derivação delas precisa saber quais
 * províncias são de cada poder, e isso é do `Territorios`, que só nasce depois do estado.
 */
export function criarEstadoInicial(
  atlas: Atlas,
  economia: Economia,
  ajustes: AjustesDoJogo,
  exercitosIniciais: Exercitos,
): EstadoCampanha {
  // O dono do arquivo assado é o dono INICIAL: a condição de 700 a.C. A partir daqui a
  // verdade corrente é `estado.dono`, e é ela que a conquista muda.
  const dono: Record<string, string> = {};
  // ⚠️ **Só as TERRAS entram na tabela de donos.** Zona marítima não se governa: dar-lhe
  // dono seria criar água conquistável, e o resto do jogo passaria a contá-la como província.
  for (const p of atlas.terras) dono[p.id] = p.dono;

  // Povo, humor e o que já está de pé em 700 a.C. — copiados do arquivo pro estado porque a
  // partir daqui são da PARTIDA. Província sem economia configurada não entra e continua
  // sem população, como não tem renda.
  const populacaoAutoral: Record<string, number> = {};
  const nacionalidades: Record<string, Record<string, number>> = {};
  const felicidade: Record<string, number> = {};
  const construcoes: Record<string, Record<string, number>> = {};
  for (const [id, ficha] of Object.entries(economia.provincias)) {
    populacaoAutoral[id] = ficha.populacao;
    nacionalidades[id] = { ...ficha.nacionalidades };
    felicidade[id] = ficha.felicidade;
    if (Object.keys(ficha.construcoes).length > 0) construcoes[id] = { ...ficha.construcoes };
  }

  // A tropa de 700 a.C. entra ANTES do estado existir, e os homens dela saem da população
  // da própria terra. Ver `guarnicao-inicial.ts`: o manancial é um só, e uma guarnição que
  // viesse de fora dele criaria gente ao ser dispensada.
  const tabuleiro = levantarGuarnicoes(
    exercitosIniciais.guarnicoes,
    populacaoAutoral,
    (id) => dono[id] ?? '',
    ajustes.combate,
  );

  return {
    jogador: null,
    ano: ajustes.anoInicial,
    turno: 0,
    // ⚠️ TODOS os poderes começam com caixa, não só o jogador. Sem cofre próprio a IA
    // recrutaria de graça, contrariando a regra de que todos jogam com as mesmas condições.
    // Preencher aqui, e não na hora em que alguém precisar, evita o `undefined` viajando por
    // uma subtração.
    tesouros: Object.fromEntries(atlas.poderes.map((poder) => [poder.id, ajustes.tesouroInicial])),
    dono,
    populacao: tabuleiro.populacao,
    nacionalidades,
    felicidade,
    hostes: tabuleiro.hostes,
    proximaHoste: tabuleiro.proximaHoste,
    formacoes: {},
    ordens: {},
    surtidas: [],
    cercos: {},
    capitais: {},
    nivelDeImposto: {},
    construcoes,
    obras: {},
    // Todo mundo em PAZ. Não é bondade: marchar sobre o vizinho tem de ser uma decisão com
    // nome, e não o estado natural das coisas.
    guerras: {},
    tregoas: {},
    // Indiferença é o padrão: a tabela guarda só quem já se esbarrou.
    relacoes: {},
    pactos: {},
    aliancas: {},
    ligas: {},
    acessos: {},
    propostas: [],
    acordos: {},
    // Ninguém compra o ano de ninguém antes de haver um ano do qual ter medo.
    tributos: {},
    // Ninguém quebrou promessa nenhuma ainda.
    reputacao: {},
    revoltas: {},
  };
}
