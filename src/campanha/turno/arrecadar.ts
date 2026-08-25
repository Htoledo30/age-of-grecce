/**
 * Credita a renda do turno no cofre de CADA poder, não só no do jogador.
 *
 * ⚠️ Percorre os poderes vivos em ordem de id. Sem a ordem, o resultado dependeria de quem
 * entrou primeiro no mapa — e a passagem de turno tem que ser determinística pelo mesmo
 * motivo que a resolução da rodada é.
 */

import type { NucleoDaCampanha } from '../nucleo';
import { poderesVivos } from '../governo/poderes';
import { tesouroDe } from '../governo/tesouro';
import { rendaDe } from '../provincia/renda';

export function arrecadar(nucleo: NucleoDaCampanha): void {
  for (const idPoder of [...poderesVivos(nucleo)].sort()) {
    const renda = rendaDe(nucleo, idPoder);
    // ⚠️ A renda pode ser NEGATIVA desde a manutenção de construção, e o cofre não desce de
    // zero: dívida sem credor viraria espiral sem decisão. O que acontece com construção sem
    // manutenção paga (fechar? ruir?) é a questão aberta "danos a construções" do GDD — até
    // lá, o calote é silencioso e o aviso é a renda vermelha.
    if (renda !== 0) {
      nucleo.estado.tesouros[idPoder] = Math.max(0, tesouroDe(nucleo, idPoder) + renda);
    }
  }
}
