/**
 * A régua MÍNIMA da campanha: quando ela acabou, e como.
 *
 * Derrota é deixar de existir (sem chão e sem tropa); vitória é mandar em toda a Grécia
 * central configurada. Quando o mapa autoral crescer, a régua cresce junto — por isso ela é
 * derivada dos dados, e não cravada.
 */

import type { NucleoDaCampanha } from '../nucleo';
import { donoDe } from '../provincia/consultas';
import { vivo } from './poderes';

/** As províncias que a campanha SIMULA — a régua da vitória sai daqui. */
export function provinciasSimuladas(nucleo: NucleoDaCampanha): readonly string[] {
  return Object.keys(nucleo.economia.provincias).sort();
}

/** Vitória, derrota, ou `null` enquanto a campanha continua. */
export function resultado(nucleo: NucleoDaCampanha): 'vitoria' | 'derrota' | null {
  const jogador = nucleo.estado.jogador;
  if (jogador === null) return null;
  if (!vivo(nucleo, jogador)) return 'derrota';
  // ⚠️ Ilha sem vizinhança terrestre (Salamina) fica FORA da régua: sem sistema naval
  // nenhum exército chega lá, e exigi-la tornaria a vitória impossível por definição.
  return provinciasSimuladas(nucleo)
    .filter((id) => nucleo.atlas.provincia(id).vizinhas.length > 0)
    .every((id) => donoDe(nucleo, id) === jogador)
    ? 'vitoria'
    : null;
}
