/**
 * O recorte de estado que a mobilização pode alterar — **e nada além dele.**
 *
 * A assinatura é a fronteira escrita: tesouros, população, hostes e formações. Se um dia a
 * mobilização precisar de mais que isto, o pedido aparece aqui, à vista, em vez de ela ganhar
 * acesso ao estado inteiro por conveniência.
 */

import type { Exercito } from '../exercito';
import type { LevaEmFormacao } from '../formacao-de-leva';

export interface EstadoDeMobilizacao {
  /** Por id de poder. Ver `EstadoCampanha.tesouros`. */
  tesouros: Record<string, number>;
  populacao: Record<string, number>;
  /** Por ID de hoste. Ver `exercito.ts`: a provincia deixou de ser a chave. */
  hostes: Record<string, Exercito>;
  proximaHoste: number;
  formacoes: Record<string, LevaEmFormacao>;
}

/** Quanto este poder tem em caixa. Zero quando ele nunca teve entrada. */
export function tesouroDe(estado: EstadoDeMobilizacao, idPoder: string): number {
  return estado.tesouros[idPoder] ?? 0;
}

export function populacaoDe(estado: EstadoDeMobilizacao, idProvincia: string): number {
  return estado.populacao[idProvincia] ?? 0;
}

/**
 * Gera a identidade da proxima hoste. **Contador, nunca sorteio.**
 *
 * A guarnicao inicial, o recrutamento, o levante e o destacamento criam hostes, e todas tem
 * que sair do MESMO contador — dois contadores dariam dois `h7` um dia.
 */
export function proximoId(estado: EstadoDeMobilizacao): string {
  const numero = estado.proximaHoste;
  estado.proximaHoste = numero + 1;
  return `h${numero}`;
}
