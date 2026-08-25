/**
 * A milícia que uma província põe em pé para se defender.
 *
 * Derivada da população e das construções, calculada na hora e **nunca guardada**: um campo
 * de guarnição no estado seria um segundo manancial humano escondido, e ele acabaria
 * discordando da população que o alimenta.
 */

import { miliciaDe } from '@/combate/milicia';
import type { NucleoDaCampanha } from '../nucleo';
import { populacaoDe } from '../provincia/consultas';

/** Quantos milicianos esta província põe em pé para se defender. */
export function miliciaEm(nucleo: NucleoDaCampanha, idProvincia: string): number {
  return miliciaDe(
    populacaoDe(nucleo, idProvincia),
    nucleo.estado.construcoes[idProvincia] ?? {},
    nucleo.catalogo,
    nucleo.ajustes.combate,
  );
}
