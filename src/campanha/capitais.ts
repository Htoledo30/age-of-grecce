/**
 * A capital de cada poder: o centro administrativo da campanha.
 *
 * O fluxo de perda existe: a capital conquistada obriga o JOGADOR a escolher outra antes
 * de passar o turno, e os demais poderes — que ainda não têm IA — reassentam a deles pela
 * mesma regra derivada da capital inicial, na virada. Poder sem chão fica sem capital.
 *
 * Ela ainda não muda número nenhum; a corrupção por distância (etapa seguinte) é o
 * primeiro sistema que vai ler este campo de verdade.
 */

import type { Atlas } from '@/mundo/atlas';

/**
 * A melhor capital entre estas províncias, pela regra derivada de sempre:
 * homônima > maior por área > menor id. `undefined` sem província nenhuma.
 *
 * É UMA função para o começo da campanha e para o reassentamento na virada — duas cópias
 * da mesma regra acabariam discordando no dia em que uma mudasse.
 */
export function melhorCapitalEntre(
  atlas: Atlas,
  idPoder: string,
  provincias: readonly string[],
): string | undefined {
  const suas = [...provincias].sort();
  if (suas.length === 0) return undefined;

  const homonima = suas.find((id) => id === idPoder);
  if (homonima !== undefined) return homonima;

  // `suas` já vem ordenado por id, e `reduce` só troca quando a área é ESTRITAMENTE
  // maior: o desempate cai no menor id sem precisar de uma segunda comparação.
  return suas.reduce((melhor, id) =>
    atlas.provincia(id).areaKm2 > atlas.provincia(melhor).areaKm2 ? id : melhor,
  );
}

/**
 * De onde sai a capital inicial de cada poder.
 *
 * ⚠️ **É DERIVADA, não autoral**, e é assim de propósito: escrever 139 capitais à mão é
 * conteúdo, não estrutura, e a preparação da região de teste é que faz isso para a região de
 * teste. Até lá, uma regra escrita e determinística vale mais que um arquivo com 139
 * palpites.
 *
 * A regra, em ordem:
 *
 * 1. **A província homônima**, quando o poder tem uma e ela é dele. Cobre 106 dos 139 —
 *    Atenas governa Atenas, Elêusis governa Elêusis. É o caso comum porque a maior parte
 *    dos poderes de 700 a.C. É uma cidade só.
 * 2. **A maior por área**, para os 33 restantes — tribos como os Acarnânios e os Bisaltas,
 *    que não têm uma cidade homônima. A maior é o palpite menos arbitrário disponível.
 * 3. **Desempate por id**, para que o resultado nunca dependa da ordem do arquivo.
 *
 * Poder sem província nenhuma não recebe capital: não há o que apontar.
 */
export function capitaisIniciais(
  atlas: Atlas,
  provinciasDe: (idPoder: string) => readonly string[],
): Record<string, string> {
  const capitais: Record<string, string> = {};

  for (const poder of [...atlas.poderes].sort((a, b) => (a.id < b.id ? -1 : 1))) {
    const capital = melhorCapitalEntre(atlas, poder.id, provinciasDe(poder.id));
    if (capital !== undefined) capitais[poder.id] = capital;
  }

  return capitais;
}
