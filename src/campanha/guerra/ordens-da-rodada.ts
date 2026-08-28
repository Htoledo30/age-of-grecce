/**
 * O que cada hoste decidiu fazer NESTA rodada — a leitura crua, sem regra nenhuma.
 *
 * Marcha e surtida são a mesma decisão em dois sentidos ("o que esta hoste vai fazer
 * agora"), e por isso as duas leituras moram juntas e no fundo da pilha: quem registra uma
 * precisa perguntar pela outra, e um módulo só de leitura evita que os dois se importem em
 * círculo.
 */

import type { OrdemDeMarcha } from '@/movimento/ordens';
import type { NucleoDaCampanha } from '../nucleo';

/**
 * A ordem registrada para ESTA hoste nesta rodada, se houver.
 *
 * ⚠️ **As ordens são endereçadas por id de hoste**, nunca por província. Id de província e
 * id de hoste são os dois `string`, e os dois registros são `Record<string, …>` — o
 * compilador não distingue um do outro, e uma troca errada aqui não dá erro: dá uma ordem
 * que a resolução nunca encontra e uma tropa que não sai do lugar.
 */
export function ordemDaHoste(
  nucleo: NucleoDaCampanha,
  idHoste: string,
): OrdemDeMarcha | undefined {
  return nucleo.estado.ordens[idHoste];
}

/** Esta hoste vai surtir nesta rodada? */
export function surtidaDe(nucleo: NucleoDaCampanha, idHoste: string): boolean {
  return nucleo.estado.surtidas.includes(idHoste);
}

/** Todas as ordens ativas, com a hoste de cada uma. É o que o mapa desenha. */
export function ordens(
  nucleo: NucleoDaCampanha,
): readonly { idHoste: string; ordem: OrdemDeMarcha }[] {
  return Object.keys(nucleo.estado.ordens)
    .sort()
    .flatMap((idHoste) => {
      const ordem = nucleo.estado.ordens[idHoste];
      return ordem ? [{ idHoste, ordem }] : [];
    });
}
