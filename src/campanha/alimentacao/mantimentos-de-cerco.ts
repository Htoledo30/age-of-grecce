/**
 * A despensa da cidade sitiada — o relógio de Bannerlord escrito com o que o jogo tinha.
 *
 * **UM contador só.** Enquanto a despensa aguenta, ninguém morre lá dentro; quando ela
 * vence, povo e guarnição caem juntos, todo turno, até o cerco acabar ou a cidade cair.
 * Cidade sitiada está fora da circulação do reino: não contribui, não pesa e não come da
 * mesa nacional — vive só disto.
 */

import type { NucleoDaCampanha } from '../nucleo';
import { contribuicaoAlimentarLivreEm } from './contribuicao';

export interface RelogioDoCerco {
  mantimentosRestantes: number;
  fomeAtiva: boolean;
}

/**
 * Quantos turnos de cerco esta cidade aguenta com a despensa cheia.
 *
 * Base do ajuste MAIS a comida da própria terra: a cidade cerealista resiste mais que a
 * de mineiros, e a Fazenda passa a comprar resistência de cerco além de saldo.
 */
export function mantimentosDeCercoEm(
  nucleo: NucleoDaCampanha,
  idProvincia: string,
): number {
  return (
    nucleo.ajustes.alimento.cerco.mantimentos +
    contribuicaoAlimentarLivreEm(nucleo, idProvincia)
  );
}

/** O relógio da fome do cerco em curso. `null` sem cerco. */
export function fomeDoCercoEm(
  nucleo: NucleoDaCampanha,
  idProvincia: string,
): RelogioDoCerco | null {
  const cerco = nucleo.estado.cercos[idProvincia];
  if (!cerco) return null;
  const despensa = mantimentosDeCercoEm(nucleo, idProvincia);
  return {
    mantimentosRestantes: Math.max(0, despensa - cerco.rodadas),
    fomeAtiva: cerco.rodadas >= despensa,
  };
}
