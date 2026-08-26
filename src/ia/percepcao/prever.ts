/**
 * A IA prevendo a batalha — **com a mesma função que a decide.**
 *
 * Ela não estima, não chuta e não compara cabeças: ela roda `resolverBatalha` com os dois
 * lados como estão e lê o vencedor. A resolução é determinística de ponta a ponta, então a
 * previsão é EXATA enquanto ninguém mais chegar ao campo.
 *
 * ⚠️ **Isto não é trapaça, e a diferença importa.** Ela não enxerga nada que o jogador não
 * enxergue — hostes no mapa são públicas para os dois lados — e não simula o futuro: simula
 * o choque de agora, com o que está à vista. É a mesma conta que o jogador faz de cabeça
 * quando olha 500 arqueiros contra 501 leves e desiste.
 *
 * ⚠️ **E é por isso que comparar HOMENS não servia.** A IA decidia surtida por número, e 501
 * leves contra 500 arqueiros parecia vantagem: o arqueiro vale 1,33 em campo contra 1,00 do
 * leve, e a guarnição saía para morrer fora do muro. Um homem não é uma unidade de força
 * desde que existem armas.
 */

import { resolverBatalha } from '@/combate/batalha';
import { valorEmCampo } from '@/combate/composicao';
import type { Contingente, Exercito } from '@/combate/exercito';
import type { Ajustes } from '@/dados/esquema';

type AjustesDaBatalha = Ajustes['jogo']['combate']['batalha'];

/**
 * Este lado venceria aquele, agora?
 *
 * `desempate` é quem leva a batalha se nada mais separar os dois — quem chama passa o lado
 * que SEGURA O CHÃO, exatamente como a resolução da rodada faz.
 */
export function venceria(
  meus: readonly Exercito[],
  deles: readonly Exercito[],
  ajustes: AjustesDaBatalha,
  desempate: 'a' | 'b',
): boolean {
  const a = contingentesDe(meus);
  const b = contingentesDe(deles);
  if (b.length === 0) return true;
  if (a.length === 0) return false;
  const r = resolverBatalha(
    { ...valorEmCampo(a, b, ajustes), recuaAos: null },
    { ...valorEmCampo(b, a, ajustes), recuaAos: null },
    ajustes,
    desempate,
  );
  return r.vencedor === 'a';
}

function contingentesDe(hostes: readonly Exercito[]): readonly Contingente[] {
  return hostes.flatMap((h) => h.contingentes);
}
