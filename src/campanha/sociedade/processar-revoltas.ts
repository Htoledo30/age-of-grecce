/**
 * O pavio do levante e o levante em si.
 *
 * O levante só nasce onde há CONTRA QUEM se levantar: província sob bandeira que não é a
 * de 700 a.C. Os rebeldes saem da população e nascem como hoste do dono antigo — que volta
 * ao jogo se tinha sido eliminado. Província revoltosa de dono legítimo faz greve fiscal
 * (imposto zero) e nada mais, por enquanto.
 */

import type { NucleoDaCampanha } from '../nucleo';
import { dominioEstrangeiroEm, populacaoDe } from '../provincia/consultas';

export interface Levante {
  provincia: string;
  poder: string;
  homens: number;
}

/**
 * Corre o pavio desta província revoltosa e, no limite, arma o levante.
 *
 * Devolve o levante quando ele nasce, e `null` quando o pavio só andou. Quem chama já
 * conferiu que o humor está na faixa revoltosa; sair da faixa apaga o registro lá.
 */
export function acenderPavioEm(
  nucleo: NucleoDaCampanha,
  idProvincia: string,
): Levante | null {
  if (!dominioEstrangeiroEm(nucleo, idProvincia)) return null;

  const pavio = (nucleo.estado.revoltas[idProvincia] ?? 0) + 1;
  if (pavio < nucleo.ajustes.felicidade.revolta.turnos) {
    nucleo.estado.revoltas[idProvincia] = pavio;
    return null;
  }
  // Não empilha levante sobre levante: enquanto os rebeldes anteriores estiverem de pé na
  // província, o pavio fica aceso mas nada nasce.
  const donoAntigo = nucleo.atlas.donoInicial(idProvincia);
  if (nucleo.mobilizacao.hostesEm(idProvincia).some((h) => h.poder === donoAntigo)) {
    nucleo.estado.revoltas[idProvincia] = pavio;
    return null;
  }
  const homens = Math.round(
    populacaoDe(nucleo, idProvincia) * nucleo.ajustes.felicidade.revolta.fracaoRebelde,
  );
  const idHoste = nucleo.mobilizacao.levantarRebeldes(idProvincia, donoAntigo, homens);
  delete nucleo.estado.revoltas[idProvincia];
  if (idHoste === null) return null;
  return {
    provincia: idProvincia,
    poder: donoAntigo,
    homens: nucleo.mobilizacao.forcaDaHoste(idHoste),
  };
}
