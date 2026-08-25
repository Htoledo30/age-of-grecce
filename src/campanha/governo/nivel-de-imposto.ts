/**
 * O nível de imposto vigente numa província — a leitura, não o decreto.
 *
 * Separado de `decreto-de-imposto.ts` porque a renda precisa do FATOR e o humor precisa
 * do custo social, e os dois são consultados por baixo: se a leitura morasse junto com a
 * ação, a renda passaria a depender das permissões que dependem da renda.
 */

import type { NivelDeImposto } from '../economia';
import type { NucleoDaCampanha } from '../nucleo';

/** O nível de imposto desta província. Ausente do registro é o normal. */
export function nivelDeImpostoEm(
  nucleo: NucleoDaCampanha,
  idProvincia: string,
): NivelDeImposto {
  return nucleo.estado.nivelDeImposto[idProvincia] ?? 'normal';
}

/** Quanto o decreto multiplica a arrecadação desta terra. */
export function fatorDeImpostoEm(nucleo: NucleoDaCampanha, idProvincia: string): number {
  return nucleo.ajustes.economia.imposto.niveis[nivelDeImpostoEm(nucleo, idProvincia)].fator;
}

/** O que o decreto custa (ou compra) em humor. Receita trocada por pressão social. */
export function humorDoImpostoEm(nucleo: NucleoDaCampanha, idProvincia: string): number {
  return nucleo.ajustes.economia.imposto.niveis[nivelDeImpostoEm(nucleo, idProvincia)].humor;
}
