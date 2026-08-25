/**
 * O cenário base do cerco: Atenas com ouro e uma hoste plantada diante de Elêusis.
 *
 * Elêusis fica SEM tropa de campo de propósito — assim o teste fala só do CERCO, sem o
 * choque de campo na frente. Antes isso custava uma linha dispensando a guarnição que o
 * mapa dava de graça; hoje o mapa abre em paz e não custa nada. Quem precisa de defensor
 * planta o seu, e o cenário do teste passou a estar inteiro escrito no teste.
 */

import type { Campanha } from '../../src/campanha/campanha';
import { novaCampanha } from '../apoio/mundo';

export function contraEleusis(homens: number): Campanha {
  const c = novaCampanha();
  c.comecar('atenas');
  c.darOuro(200_000);
  c.plantarHoste('atenas', 'atenas', homens);
  return c;
}
