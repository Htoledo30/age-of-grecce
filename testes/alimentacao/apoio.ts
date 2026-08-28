/** Uma campanha já começada. O jogador padrão é Atenas, como no resto da suíte. */

import type { Campanha } from '../../src/campanha/campanha';
import { novaCampanha, novaCampanhaFarta } from '../apoio/mundo';

export function nova(jogador = 'atenas'): Campanha {
  const campanha = novaCampanha();
  campanha.comecar(jogador);
  return campanha;
}

/**
 * A mesma coisa, mas com a despensa NACIONAL fora do caminho.
 *
 * ⚠️ Para os testes de CERCO que são sobre o relógio de mantimentos da praça, e não sobre o
 * balanço do reino. As duas fomes existem e são independentes de propósito; num teste sobre a
 * primeira, a segunda é ruído — e ruído que mata tropa, o que faz a contagem do teste mentir.
 * A taxa de morte por fome continua a de verdade: `ajustesFartos` só mexe em quantos homens
 * um ponto de comida sustenta.
 */
export function novaFarta(jogador = 'atenas'): Campanha {
  const campanha = novaCampanhaFarta();
  campanha.comecar(jogador);
  return campanha;
}
