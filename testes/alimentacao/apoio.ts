/** Uma campanha já começada. O jogador padrão é Atenas, como no resto da suíte. */

import type { Campanha } from '../../src/campanha/campanha';
import { novaCampanha } from '../apoio/mundo';

export function nova(jogador = 'atenas'): Campanha {
  const campanha = novaCampanha();
  campanha.comecar(jogador);
  return campanha;
}
