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

/** Uma guerra declarada ou uma paz assinada — notícia da virada, não partida. */
export interface NoticiaDiplomatica {
  de: string;
  com: string;
  tipo: 'guerra' | 'paz';
}

export interface EfemerosDaCampanha {
  rodada: RelatorioDaRodada;
  fome: RelatorioDaFome;
  quedasDeCapital: readonly QuedaDeCapital[];
  revoltas: readonly Levante[];
  /**
   * O que mudou de relação nesta virada.
   *
   * ⚠️ **Não vem do relatório da rodada, e não podia vir.** Declarar guerra e assinar a paz
   * acontecem ANTES de a rodada resolver — é o jogador clicando e a IA decidindo, não a
   * resolução das marchas. Sem esta lista, o jogador leria "Batalha em Elêusis" sem nunca ter
   * sabido que alguém tinha declarado guerra a ele no mesmo turno.
   *
   * Acumula durante o turno e é esvaziada quando o turno vira, junto com o resto da notícia.
   */
  diplomacia: NoticiaDiplomatica[];
}

/** O estado de "nada aconteceu ainda": antes do primeiro turno e depois de restaurar. */
export function efemerosVazios(): EfemerosDaCampanha {
  return {
    rodada: {
      marchas: [],
      batalhas: [],
      conquistas: [],
    saques: [],
      milicianosMortos: [],
      cercos: [],
      cercosLevantados: [],
    },
    fome: { provincias: [], tropas: [] },
    quedasDeCapital: [],
    revoltas: [],
    diplomacia: [],
  };
}
