/**
 * As batalhas da rodada que o JOGADOR viveu, prontas para a janela reproduzir.
 *
 * ⚠️ **Só as dele.** Guerra alheia resolve no silêncio: abrir uma janela por batalha do mapa
 * transformaria a virada de turno numa fila de telas. A regra produz a lista de rounds para
 * todas — é isso que garante que a janela reproduza a matemática em vez de ilustrá-la — e
 * quem não assiste simplesmente joga a lista fora.
 *
 * ⚠️ **Nada aqui recalcula.** A campanha já resolveu a rodada; isto só traduz nomes e cores
 * para a tela, como `trechosDaRodada` faz com a marcha.
 */

import type { Arma } from '@/combate/exercito';
import type { VistaDaBatalha } from '@/ui/batalha';
import type { Jogo } from '../contexto';

export function batalhasDoJogador(jogo: Jogo): readonly VistaDaBatalha[] {
  const { campanha, atlas } = jogo;
  const eu = campanha.jogador?.id;
  if (eu === undefined) return [];

  return campanha.rodada.batalhas
    .filter((b) => b.lados.some((l) => l.poder === eu))
    .map((b) => {
      const [a, d] = b.lados;
      return {
        lugar: b.provincia === null ? null : atlas.nomeDe(b.provincia),
        tipo: b.tipo,
        lados: [ladoNaTela(jogo, a), ladoNaTela(jogo, d)] as const,
        rounds: b.rounds,
        // O relatório guarda o vencedor por PODER, e a janela pensa em lados: a tradução é
        // aqui, porque é aqui que as duas linguagens se encontram.
        vencedor: b.vencedor === null ? null : b.vencedor === a.poder ? 'a' : 'b',
        desfecho: b.desfecho,
        // ⚠️ **O limiar de quebra, e ele é o suspense inteiro desta janela.** A batalha não se
        // decide no zero: se decide quando um lado passa desta fração em baixas. Sem o número
        // aqui, a barra desce em direção a uma meta que nunca é atingida e não significa nada,
        // e o jogador não tem como saber que faltam cento e três homens para a linha ceder.
        limiarDeQuebra: jogo.ajustes.jogo.combate.batalha.limiarDeQuebra,
      } satisfies VistaDaBatalha;
    });
}

function ladoNaTela(
  jogo: Jogo,
  lado: {
    poder: string;
    homens: number;
    aguento: number;
    composicao: Readonly<Record<Arma, number>>;
  },
): VistaDaBatalha['lados'][number] {
  // `ninguem` aparece quando um lado entrou vazio — província tomada sem defensor. Ele não
  // é um poder do mapa, e pedir a cor dele estouraria.
  const conhecido = lado.poder !== 'ninguem';
  const poder = conhecido ? jogo.campanha.poder(lado.poder) : null;
  return {
    // ⚠️ **O id vai junto porque a janela agora HASTEIA os dois estandartes.** Ela tinha a cor
    // do poder e mais nada: dois exércitos frente a frente eram dois nomes na mesma fonte, e a
    // única tela do jogo em que dois povos se enfrentam era a única sem uma insígnia.
    id: conhecido ? lado.poder : '',
    nome: poder?.nome ?? 'ninguém',
    cor: poder?.cor ?? '#8a8f92',
    homens: lado.homens,
    aguento: lado.aguento,
    composicao: lado.composicao,
  };
}
