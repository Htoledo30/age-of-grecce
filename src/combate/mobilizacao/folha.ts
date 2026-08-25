/**
 * A folha militar: o que o exército custa por turno, e o que acontece quando não é paga.
 *
 * ⚠️ **O preço depende de onde o homem está pisando.** Em província do próprio poder ele é
 * cidadão-lavrador e custa a taxa de casa; em terra alheia — inclusive sitiando — é
 * campanha, e custa a cheia. É sair de casa que custa, e é isso que faz a economia ter duas
 * perguntas em vez de uma: em paz, qual construção; em guerra, por quantos turnos aguento.
 *
 * ⚠️ **Deserção proporcional, nunca colapso.** Espiral de morte não é decisão: é o jogo
 * terminando sozinho enquanto o jogador assiste. O exército encolhe, o tesouro nunca fica
 * negativo, e a saída existe — dispensar antes, recuar pra casa, ou tomar mais renda.
 */

import type { Ajustes } from '@/dados/esquema';
import { forcaDe } from '../exercito';
import type { Exercito } from '../exercito';
import { doPoder } from './consultas';
import { devolver } from './dispensa';
import { tesouroDe } from './estado';
import type { EstadoDeMobilizacao } from './estado';

type AjustesCombate = Ajustes['jogo']['combate'];

/**
 * Quem responde se a hoste está em terra do próprio poder.
 *
 * Vem de fora porque a mobilização não sabe de quem é cada província — e não deve saber:
 * propriedade é assunto da campanha, e amarrar as duas aqui faria a folha militar depender
 * do mapa político para calcular um número.
 */
export type EmCasa = (exercito: Exercito) => boolean;

/** A taxa que ESTA hoste paga, pelo chão em que ela está. */
export function taxaDe(
  exercito: Exercito,
  ajustes: AjustesCombate,
  emCasa: EmCasa,
): number {
  const taxas = ajustes.manutencaoPorHomem;
  return emCasa(exercito) ? taxas.emCasa : taxas.emCampanha;
}

export function manutencaoDe(
  estado: EstadoDeMobilizacao,
  ajustes: AjustesCombate,
  idPoder: string,
  emCasa: EmCasa,
): number {
  // Soma em ponto flutuante e arredonda UMA vez: arredondar hoste a hoste faria o total
  // do reino mudar por dividir a mesma tropa em duas colunas.
  let devido = 0;
  for (const h of doPoder(estado, idPoder)) devido += forcaDe(h) * taxaDe(h, ajustes, emCasa);
  return Math.round(devido);
}

/**
 * Paga a folha de um poder e devolve quantos desertaram.
 *
 * A campanha arrecada ANTES de chamar isto. Faltando ouro, a fração não paga deserta
 * proporcionalmente de cada hoste e volta pra população de origem.
 */
export function pagarManutencao(
  estado: EstadoDeMobilizacao,
  ajustes: AjustesCombate,
  idPoder: string,
  emCasa: EmCasa,
): number {
  const devido = manutencaoDe(estado, ajustes, idPoder, emCasa);
  if (devido <= 0) return 0;

  const caixa = tesouroDe(estado, idPoder);
  if (devido <= caixa) {
    estado.tesouros[idPoder] = caixa - devido;
    return 0;
  }

  const pago = Math.max(0, caixa);
  estado.tesouros[idPoder] = caixa - pago;
  const fracaoNaoPaga = (devido - pago) / devido;
  let desertaram = 0;

  for (const exercito of doPoder(estado, idPoder)) {
    const desertores = Math.ceil(forcaDe(exercito) * fracaoNaoPaga);
    if (desertores <= 0) continue;
    desertaram += desertores;
    devolver(estado, exercito, desertores);
  }
  return desertaram;
}
