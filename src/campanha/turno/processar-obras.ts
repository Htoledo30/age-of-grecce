/**
 * As obras andam um turno, e as que terminam viram construção.
 *
 * ⚠️ **DEPOIS da arrecadação.** Quem paga no turno 1 uma obra de três turnos passa três
 * arrecadações sem o benefício e recebe na quarta. Adiantar isto daria um turno de graça sem
 * ninguém perceber.
 */

import type { NucleoDaCampanha } from '../nucleo';

export function processarObras(nucleo: NucleoDaCampanha): void {
  for (const [id, obra] of Object.entries(nucleo.estado.obras)) {
    obra.turnosRestantes -= 1;
    if (obra.turnosRestantes > 0) continue;
    nucleo.estado.construcoes[id] = {
      ...(nucleo.estado.construcoes[id] ?? {}),
      [obra.construcao]: obra.nivelAlvo,
    };
    delete nucleo.estado.obras[id];
  }
}
