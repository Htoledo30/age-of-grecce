/**
 * O cenário base do cerco: Atenas com ouro e uma hoste plantada diante de Elêusis.
 *
 * A guarnição eleusina é dispensada de propósito — assim o teste fala só do CERCO, sem o
 * choque de campo na frente.
 */

import type { Campanha } from '../../src/campanha/campanha';
import { novaCampanha } from '../apoio/mundo';

export function contraEleusis(homens: number): Campanha {
  const c = novaCampanha();
  c.comecar('atenas');
  c.darOuro(200_000);
  c.plantarHoste('atenas', 'atenas', homens);
  // Elêusis abre com 500 homens de guarnição.
  c.dispensar('eleusis', 500);
  return c;
}
