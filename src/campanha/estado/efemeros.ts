/**
 * O que aconteceu na última virada — **notícia, não partida.**
 *
 * Marchas, batalhas, conquistas, fome, quedas de capital e levantes vivem aqui e **não vão
 * para o disco**: retomar um salvamento não deve reexibir a batalha do turno passado. É a
 * fronteira que mantém `EstadoCampanha` sendo exatamente o que se serializa.
 */

import type { RelatorioDaRodada } from '@/movimento/resolucao/relatorio';
import type { RelatorioDaFome } from '../alimentacao/aplicar-fome';
import type { QuedaDeCapital } from '../governo/capital';
import type { Levante } from '../sociedade/processar-revoltas';

export interface EfemerosDaCampanha {
  rodada: RelatorioDaRodada;
  fome: RelatorioDaFome;
  quedasDeCapital: readonly QuedaDeCapital[];
  revoltas: readonly Levante[];
}

/** O estado de "nada aconteceu ainda": antes do primeiro turno e depois de restaurar. */
export function efemerosVazios(): EfemerosDaCampanha {
  return {
    rodada: {
      marchas: [],
      batalhas: [],
      conquistas: [],
      milicianosMortos: [],
      cercos: [],
      cercosLevantados: [],
    },
    fome: { provincias: [], tropas: [] },
    quedasDeCapital: [],
    revoltas: [],
  };
}
