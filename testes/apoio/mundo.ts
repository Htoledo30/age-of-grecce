/**
 * Os dados DE VERDADE, carregados uma vez para todos os testes.
 *
 * ⚠️ **Contra os arquivos do jogo, nunca contra um cenário inventado.** É o que faz a suíte
 * pegar uma mudança nos DADOS — uma província nova, um produto renomeado, um ajuste de
 * balanço que quebrou uma relação — e não só uma mudança no código.
 *
 * `novaCampanha()` devolve um Atlas novo a cada chamada: ele é imutável, mas compartilhar a
 * instância entre testes esconderia o dia em que ele deixasse de ser.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { Ajustes, Construcoes, Economia, Exercitos, Ia, Provincias } from '../../src/dados/esquema';
import { Campanha } from '../../src/campanha/campanha';
import { jogarIA } from '../../src/ia/ia';
import { Atlas } from '../../src/mundo/atlas';

function ler<T>(esquema: { parse: (v: unknown) => T }, caminho: string): T {
  return esquema.parse(JSON.parse(readFileSync(resolve(caminho), 'utf8')));
}

export const provincias = ler(Provincias, 'assets/mundo/provincias.json');
export const economia = ler(Economia, 'dados/economia.json');
export const construcoes = ler(Construcoes, 'dados/construcoes.json');
export const exercitos = ler(Exercitos, 'dados/exercitos.json');
export const ajustes = ler(Ajustes, 'dados/ajustes.json').jogo;
/** QUEM é cada IA: os estilos e quem joga com qual. */
export const ia = ler(Ia, 'dados/ia.json');

/** O atlas compartilhado, para quem só lê geografia. Campanha nenhuma o altera. */
export const atlas = new Atlas(provincias);

export function novaCampanha(): Campanha {
  return new Campanha(new Atlas(provincias), economia, construcoes, ajustes, exercitos);
}

/**
 * Os mesmos ajustes com a COMIDA fora do caminho: um ponto alimenta um milhão de homens.
 *
 * ⚠️ **É andaime, e ele existe por um motivo que tem data.** Quando `soldadosPorPonto` desceu
 * de 3.000 para 500 — a comida virando o gargalo de verdade, a pedido de Henrique —, **25
 * testes ficaram vermelhos de uma vez, em 11 arquivos**, e nenhum deles era sobre comida: eram
 * folha militar, marcha, cerco, dispensa, milícia. Todos plantavam mil homens em Atenas, e
 * Atenas é a terra mais APERTADA do mapa no turno 1 (saldo 1, contra 6 de Mégara). A mil
 * homens ela passa fome, 5% da tropa morre por virada, e um teste que media soldo passava a
 * medir fome sem querer.
 *
 * O andaime certo aqui é tirar a comida da equação, e não encolher os exércitos do teste: o
 * que estes testes guardam continua sendo o que eles sempre guardaram, e o dia em que o
 * balanço da comida mudar de novo eles não têm por que se mexer. **Quem testa comida usa
 * `novaCampanha` e os ajustes de verdade** — é lá que a régua tem de doer.
 */
export const ajustesFartos = {
  ...ajustes,
  alimento: { ...ajustes.alimento, soldadosPorPonto: 1_000_000 },
};

/** Uma campanha em que a comida nunca é o assunto. Ver `ajustesFartos`. */
export function novaCampanhaFarta(): Campanha {
  return new Campanha(new Atlas(provincias), economia, construcoes, ajustesFartos, exercitos);
}

/**
 * Roda `turnos` viradas com a IA jogando, e o jogador PARADO — o grupo de controle.
 *
 * ⚠️ **Reassenta a capital do jogador quando ela cai, e sem isto a etapa 3 trava a suíte.**
 * Capital caída bloqueia a virada de propósito: escolher a nova é decisão do jogador, e o jogo
 * não decide por ele. Só que num teste o jogador não decide nada — e desde que a IA passou a
 * atacar, um jogador imóvel PERDE a capital, o que é a resposta certa do jogo e não um defeito.
 */
export function correrIA(campanha: Campanha, turnos: number): Campanha {
  const jogador = campanha.jogador?.id;
  for (let i = 0; i < turnos; i++) {
    jogarIA(campanha, ia, ajustes);
    if (
      jogador !== undefined &&
      campanha.capitalPerdida(jogador) &&
      campanha.provinciasDe(jogador).length > 0
    ) {
      campanha.mudarCapital([...campanha.provinciasDe(jogador)].sort()[0]!);
    }
    campanha.passarTurno();
  }
  return campanha;
}
