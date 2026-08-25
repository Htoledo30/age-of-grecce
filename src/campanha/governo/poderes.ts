/**
 * Quem ainda está no jogo — por chão OU por tropa.
 *
 * ⚠️ Já foi só "tem província", e estava errado: o poder era dado como eliminado enquanto o
 * exército dele continuava de pé no mapa, gastando manutenção e ocupando terra. Perder o
 * último chão é ficar **no exílio**, não morrer.
 *
 * O exílio não precisa de temporizador nenhum: sem província não há renda, sem renda a folha
 * não é paga, e a tropa deserta sozinha em poucos turnos. A regra da deserção, que já
 * existia, é quem dá o prazo — e os desertores voltam pra terra deles, que agora é do
 * conquistador.
 */

import type { NucleoDaCampanha } from '../nucleo';

/** Um poder está vivo enquanto tiver chão OU hoste. */
export function vivo(nucleo: NucleoDaCampanha, idPoder: string): boolean {
  return (
    nucleo.territorios.temTerritorio(idPoder) || nucleo.mobilizacao.temTropa(idPoder)
  );
}

/** Perdeu todo o chão mas ainda tem gente em armas. */
export function noExilio(nucleo: NucleoDaCampanha, idPoder: string): boolean {
  return (
    !nucleo.territorios.temTerritorio(idPoder) && nucleo.mobilizacao.temTropa(idPoder)
  );
}

/** Quem ainda está no jogo, por chão ou por tropa. Começa com 148 e só encolhe. */
export function poderesVivos(nucleo: NucleoDaCampanha): readonly string[] {
  return nucleo.atlas.poderes.filter((p) => vivo(nucleo, p.id)).map((p) => p.id);
}
