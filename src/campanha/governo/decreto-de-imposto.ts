/**
 * O decreto de imposto: a alavanca de receita trocada por pressão social.
 *
 * **Efeito imediato e sem custo de entrada**: a renda muda no clique e o humor passa a
 * caminhar para o alvo novo. Baixo compra ordem pública, alto paga em descontentamento —
 * a régua vem de Rome: Total War.
 */

import type { NivelDeImposto } from '../economia';
import type { NucleoDaCampanha, Recusa } from '../nucleo';
import { podeAgirEm } from '../provincia/permissoes';

/** Pode decretar este nível de imposto aqui? A recusa vem com o motivo, como sempre. */
export function podeDefinirImposto(
  nucleo: NucleoDaCampanha,
  idProvincia: string,
): Recusa {
  return podeAgirEm(nucleo, idProvincia);
}

/**
 * Decreta o nível de imposto da província.
 *
 * Só os níveis diferentes do normal entram no registro: é o diff da decisão, não uma
 * tabela cheia — o padrão não precisa ser escrito pra valer.
 */
export function definirImposto(
  nucleo: NucleoDaCampanha,
  idProvincia: string,
  nivel: NivelDeImposto,
): void {
  const r = podeDefinirImposto(nucleo, idProvincia);
  if (!r.pode) throw new Error(r.motivo);
  if (nivel === 'normal') delete nucleo.estado.nivelDeImposto[idProvincia];
  else nucleo.estado.nivelDeImposto[idProvincia] = nivel;
}
