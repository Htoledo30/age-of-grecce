/**
 * Pôr gente em armas — a transação que a mobilização sozinha não pode fazer.
 *
 * Recrutar mexe em ouro, população e tropa ao mesmo tempo, e as três têm que acontecer
 * juntas: o portão da PROVÍNCIA vem primeiro (é minha?), e só depois as regras da leva —
 * assim a recusa diz a coisa mais externa que está errada, em vez de reclamar de ouro numa
 * província que nem é do jogador.
 */

import type { RecusaDeLeva } from '@/combate/recrutamento';
import type { NucleoDaCampanha } from '../nucleo';
import { donoDe } from '../provincia/consultas';
import { podeMobilizarEm } from '../provincia/permissoes';

/** Pode levantar esta leva aqui, e por quanto? */
export function podeRecrutar(
  nucleo: NucleoDaCampanha,
  idProvincia: string,
  homens: number,
): RecusaDeLeva {
  const naProvincia = podeMobilizarEm(nucleo, idProvincia);
  if (!naProvincia.pode) return { pode: false, motivo: naProvincia.motivo };
  return nucleo.mobilizacao.avaliarLevaEm(idProvincia, donoDe(nucleo, idProvincia), homens);
}

/**
 * Põe gente em armas: cobra o ouro e **tira os homens da população da província**.
 *
 * A população cai na mesma hora, e com ela o imposto dali — mobilizar não é só uma despesa
 * de entrada, é uma cidade produzindo menos enquanto os seus estão no campo. A leva aparece
 * como formação exausta e só se junta à hoste ativa no próximo turno.
 */
export function recrutar(
  nucleo: NucleoDaCampanha,
  idProvincia: string,
  homens: number,
): void {
  const r = podeRecrutar(nucleo, idProvincia, homens);
  if (!r.pode) throw new Error(r.motivo);
  nucleo.mobilizacao.recrutar(
    idProvincia,
    donoDe(nucleo, idProvincia),
    r,
    nucleo.estado.turno,
  );
}
