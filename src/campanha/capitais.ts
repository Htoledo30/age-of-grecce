/**
 * A capital de cada poder: o centro administrativo da campanha.
 *
 * ⚠️ **Isto é só o ESTADO.** A capital ainda não faz nada — não dá bônus, não muda
 * ineficiência, não gera mensagem ao cair. O fluxo completo (perder, escolher outra,
 * ser obrigado a decidir antes de continuar) é a Etapa 9 do `PATCH_ATUAL.md`. O que
 * existe aqui é o campo, o valor inicial e as duas perguntas que a Etapa 9 vai fazer.
 *
 * Existir antes de servir é deliberado: `DECISOES.md` #47 e #48 dizem que todo poder tem
 * uma, e vários sistemas futuros — ineficiência administrativa, prioridade alimentar em
 * escassez, revolta, comércio interno — vão perguntar qual é. Pôr o campo agora evita que
 * cada um deles invente a própria resposta.
 */

import type { Atlas } from '@/mundo/atlas';

/**
 * De onde sai a capital inicial de cada poder.
 *
 * ⚠️ **É DERIVADA, não autoral**, e é assim de propósito: escrever 148 capitais à mão é
 * conteúdo, não estrutura, e a Etapa 2 do patch é que vai fazer isso para a região de
 * teste. Até lá, uma regra escrita e determinística vale mais que um arquivo com 148
 * palpites.
 *
 * A regra, em ordem:
 *
 * 1. **A província homônima**, quando o poder tem uma e ela é dele. Cobre 115 dos 148 —
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
    const suas = [...provinciasDe(poder.id)].sort();
    if (suas.length === 0) continue;

    const homonima = suas.find((id) => id === poder.id);
    if (homonima !== undefined) {
      capitais[poder.id] = homonima;
      continue;
    }

    // `suas` já vem ordenado por id, e `reduce` só troca quando a área é ESTRITAMENTE
    // maior: o desempate cai no menor id sem precisar de uma segunda comparação.
    const maior = suas.reduce((melhor, id) =>
      atlas.provincia(id).areaKm2 > atlas.provincia(melhor).areaKm2 ? id : melhor,
    );
    capitais[poder.id] = maior;
  }

  return capitais;
}
