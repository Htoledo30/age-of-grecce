/**
 * Atenas com o Quartel de pé e tesouro pra recrutar.
 *
 * Os oito turnos extras não são folga de teste: com 5.000 no Quartel e 2 moedas por homem,
 * Atenas sai da obra com ~2.900 no caixa e não põe em campo nem metade do que a cidade
 * comporta. Exército é caro de propósito — é ele o ralo de dinheiro que a construção não
 * consegue ser.
 */

import type { Campanha } from '../../src/campanha/campanha';
import { novaCampanhaFarta } from '../apoio/mundo';

export function comQuartel(): Campanha {
  const c = novaCampanhaFarta();
  c.comecar('atenas');
  for (let i = 0; i < 3; i++) c.passarTurno(); // junta as 5.000 do Quartel
  c.construir('atenas', 'quartel');
  for (let i = 0; i < 4; i++) c.passarTurno(); // 4 turnos de obra
  for (let i = 0; i < 8; i++) c.passarTurno(); // e o caixa pra uma leva de verdade
  c.darOuro(2_000);
  return c;
}
