/**
 * Cobra a folha militar de TODOS os poderes, pela mesma regra.
 *
 * ⚠️ Antes só o jogador pagava, e isso teria dado à IA um exército sem custo. Quem não tem
 * caixa vê a tropa desertar, seja quem for.
 *
 * ⚠️ Cobra DEPOIS da arrecadação: quem recruta neste turno paga a manutenção deste turno, e
 * não a do que vem. Errar essa ordem não dá erro nenhum, só um número torto em silêncio.
 */

import type { NucleoDaCampanha } from '../nucleo';
import { poderesVivos } from '../governo/poderes';

export function pagarTropa(nucleo: NucleoDaCampanha): void {
  for (const idPoder of [...poderesVivos(nucleo)].sort()) {
    nucleo.mobilizacao.pagarManutencao(idPoder);
  }
}
