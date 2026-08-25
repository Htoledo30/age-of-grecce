/**
 * A folha militar: o que o exército custa por turno, e o que acontece quando não é paga.
 *
 * ⚠️ **Deserção proporcional, nunca colapso.** Espiral de morte não é decisão: é o jogo
 * terminando sozinho enquanto o jogador assiste. O exército encolhe, o tesouro nunca fica
 * negativo, e a saída existe — dispensar antes, ou tomar mais renda.
 */

import type { Ajustes } from '@/dados/esquema';
import { forcaDe } from '../exercito';
import { manutencaoDe as folhaDe } from '../recrutamento';
import { doPoder } from './consultas';
import { devolver } from './dispensa';
import { tesouroDe } from './estado';
import type { EstadoDeMobilizacao } from './estado';

type AjustesCombate = Ajustes['jogo']['combate'];

export function manutencaoDe(
  estado: EstadoDeMobilizacao,
  ajustes: AjustesCombate,
  idPoder: string,
): number {
  let homens = 0;
  for (const h of doPoder(estado, idPoder)) homens += forcaDe(h);
  return folhaDe(homens, ajustes);
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
): number {
  const devido = manutencaoDe(estado, ajustes, idPoder);
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
