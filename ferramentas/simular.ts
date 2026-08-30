/**
 * Simulações longas e determinísticas com as regras reais da campanha.
 *
 * Não é IA e não tenta jogar bem. Serve para revelar tendências e números absurdos sem
 * criar relatório permanente: o resultado existe somente no terminal.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { Campanha } from '../src/campanha/campanha';
import { forcaDe } from '../src/combate/exercito';
import { Ajustes, Construcoes, Economia, Exercitos, Provincias } from '../src/dados/esquema';
import { Atlas } from '../src/mundo/atlas';

function ler<T>(esquema: { parse: (valor: unknown) => T }, caminho: string): T {
  const bruto: unknown = JSON.parse(readFileSync(resolve(caminho), 'utf8'));
  return esquema.parse(bruto);
}

const provincias = ler(Provincias, 'assets/mundo/provincias.json');
const economia = ler(Economia, 'dados/economia.json');
const construcoes = ler(Construcoes, 'dados/construcoes.json');
const exercitos = ler(Exercitos, 'dados/exercitos.json');
const ajustes = ler(Ajustes, 'dados/ajustes.json').jogo;

interface Cenario {
  nome: string;
  turnos: number;
  preparar?: (campanha: Campanha) => void;
}

interface Resultado {
  cenário: string;
  população: string;
  tesouro: string;
  soldados: string;
  'anos em fome': number;
  'mortes civis': number;
  'mortes militares': number;
  'saldo mínimo': number;
  'saldo máximo': number;
  'estado final': string;
}

function novaCampanha(): Campanha {
  const campanha = new Campanha(
    new Atlas(provincias),
    economia,
    construcoes,
    ajustes,
    exercitos,
  );
  campanha.comecar('atenas');
  return campanha;
}

function populacaoDoPoder(campanha: Campanha, poder: string): number {
  return campanha.provinciasDe(poder).reduce((soma, id) => soma + campanha.populacaoDe(id), 0);
}

function soldadosDoPoder(campanha: Campanha, poder: string): number {
  const contadas = new Set<string>();
  let total = 0;
  for (const provincia of provincias.provincias) {
    for (const hoste of campanha.hostesEm(provincia.id)) {
      if (hoste.poder !== poder || contadas.has(hoste.id)) continue;
      contadas.add(hoste.id);
      total += forcaDe(hoste);
    }
  }
  return total;
}

function simular(cenario: Cenario): Resultado {
  const campanha = novaCampanha();
  cenario.preparar?.(campanha);

  const populacaoInicial = populacaoDoPoder(campanha, 'atenas');
  const tesouroInicial = campanha.tesouro;
  const soldadosIniciais = soldadosDoPoder(campanha, 'atenas');
  let saldoMinimo = campanha.alimentacao.saldo;
  let saldoMaximo = campanha.alimentacao.saldo;
  let anosEmFome = 0;
  let mortesCivis = 0;
  let mortesMilitares = 0;

  for (let turno = 0; turno < cenario.turnos; turno++) {
    const antes = campanha.alimentacao;
    saldoMinimo = Math.min(saldoMinimo, antes.saldo);
    saldoMaximo = Math.max(saldoMaximo, antes.saldo);
    if (antes.saldo < 0) anosEmFome++;

    campanha.passarTurno();
    mortesCivis += campanha.fome.provincias.reduce((soma, perda) => soma + perda.mortos, 0);
    mortesMilitares += campanha.fome.tropas.reduce((soma, perda) => soma + perda.homens, 0);
  }

  const final = campanha.alimentacao;
  saldoMinimo = Math.min(saldoMinimo, final.saldo);
  saldoMaximo = Math.max(saldoMaximo, final.saldo);

  return {
    cenário: `${cenario.nome} (${cenario.turnos}t)`,
    população: `${populacaoInicial.toLocaleString('pt-BR')} → ${populacaoDoPoder(campanha, 'atenas').toLocaleString('pt-BR')}`,
    tesouro: `${tesouroInicial.toLocaleString('pt-BR')} → ${campanha.tesouro.toLocaleString('pt-BR')}`,
    soldados: `${soldadosIniciais.toLocaleString('pt-BR')} → ${soldadosDoPoder(campanha, 'atenas').toLocaleString('pt-BR')}`,
    'anos em fome': anosEmFome,
    'mortes civis': mortesCivis,
    'mortes militares': mortesMilitares,
    'saldo mínimo': saldoMinimo,
    'saldo máximo': saldoMaximo,
    'estado final': final.categoria,
  };
}

const cenarios: readonly Cenario[] = [
  { nome: 'Paz', turnos: 100 },
  { nome: 'Paz longa', turnos: 500 },
  {
    nome: 'Fazenda I em Atenas',
    turnos: 100,
    preparar: (campanha) => campanha.construir('atenas', 'fazenda'),
  },
  {
    nome: 'Pressão de 4.001 soldados',
    turnos: 100,
    preparar: (campanha) => {
      campanha.plantarHoste('atenas', 'atenas', 4001);
    },
  },
  {
    // O caso das 90 rodadas: o cerco tem que estrangular A CIDADE — e só ela. As mortes
    // civis/militares desta linha são de Mégara (o relatório de fome é global).
    nome: 'Cerco a Mégara',
    turnos: 30,
    preparar: (campanha) => {
      campanha.darOuro(100_000);
      campanha.plantarHoste('eleusis', 'atenas', 800);
      campanha.trocarDono('eleusis', 'atenas');
      // ⚠️ **A guerra vem ANTES da marcha, e não é firula de roteiro.** Em 28/08/2026 o
      // encontro na estrada passou a exigir guerra declarada — o cabeçalho da marcha sempre
      // disse isso e o código não cumpria. `ordenarMarcha` LANÇA quando a regra barra, e como
      // os cinco cenários são calculados antes de a tabela ser impressa, este sozinho apagava
      // o relatório inteiro: quem rodasse `npm run simular` não via nem os quatro que passavam.
      campanha.declararGuerra('megara', 'atenas');
      const hoste = campanha.hostesEm('eleusis').find((h) => h.poder === 'atenas');
      if (hoste) campanha.ordenarMarcha(hoste.id, 'megara', 800, 'atenas', 'sitiar');
    },
  },
];

console.log('Age of Grecce — simulação determinística com as regras atuais');
console.table(cenarios.map(simular));
