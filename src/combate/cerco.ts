/**
 * O cerco: o que acontece quando um exército pisa numa cidade que não se entrega.
 *
 * Antes disto, província alheia com gente dentro caía no instante em que alguém chegava —
 * a milícia saía a campo, morria, e o mapa mudava de cor no mesmo turno. Não existia
 * estado intermediário, e por isso não existia guerra: existia uma sequência de trocas de
 * dono.
 *
 * ⚠️ **A milícia deixou de lutar no campo e passou a segurar a cidade.** É a mudança que
 * torna tudo o mais possível. O choque em campo aberto é exército contra exército; quem
 * vence fica com o CAMPO, e a cidade continua sendo um problema por resolver. São duas
 * perguntas em vez de uma, e é da segunda que nascem cerco, bloqueio e socorro.
 *
 * O sitiante escolhe entre duas coisas, e pode trocar a cada turno:
 *
 * | postura      | resolve   | custo em homens | contra                                  |
 * | ------------ | --------- | --------------- | --------------------------------------- |
 * | **Assaltar** | no turno  | alto            | a milícia com o bônus da muralha         |
 * | **Sitiar**   | em turnos | nenhum          | o tempo, e o exército de socorro que vem |
 *
 * Nenhuma das duas é a certa sempre, e é isso que faz haver decisão: assaltar troca homens
 * por tempo, sitiar troca tempo por exposição. Quem sitia fica parado em terra alheia
 * enquanto o dono junta gente.
 */

import type { Ajustes } from '@/dados/esquema';

type AjustesCerco = Ajustes['jogo']['combate']['cerco'];

/** O que o sitiante está fazendo neste turno. */
export type Postura = 'assaltar' | 'sitiar';

/** Um cerco em curso, guardado por província sitiada. */
export interface Cerco {
  /** Quem sitia. Não é o dono da província — é quem está sentado em cima dela. */
  sitiante: string;
  /**
   * Quanto do cerco já foi feito, de 0 a 1. Em 1 a cidade abre os portões.
   *
   * Acumulado e não um contador de turnos: assim reforço que chega acelera o que já foi
   * feito, em vez de reiniciar a conta.
   */
  progresso: number;
  /** A postura desta rodada. Trocável enquanto o cerco estiver de pé. */
  postura: Postura;
}

/**
 * Quanto o cerco avança num turno.
 *
 * É a razão entre quem está fora e quem está dentro, dividida pela dureza. Mais gente
 * cercando aperta mais depressa — e é assim que trazer o exército inteiro para uma cidade
 * pequena vira uma decisão de verdade em vez de aritmética.
 *
 * Sem defensor o cerco não existe: a cidade abre no mesmo turno.
 */
export function avancoDoCerco(sitiantes: number, defensores: number, ajustes: AjustesCerco): number {
  if (sitiantes <= 0) return 0;
  if (defensores <= 0) return 1;
  return sitiantes / (defensores * ajustes.turnosBase);
}

/**
 * Quanto vale a milícia atrás da muralha.
 *
 * ⚠️ **O bônus é da POSIÇÃO, não da construção.** Toda cidade tem alguma coisa entre ela e
 * o campo — um muro de pedra seca, um acrópole, uma encosta. A Muralha construída dobra a
 * milícia lá atrás, em `milicia.ts`, e os dois efeitos se multiplicam de propósito: quem
 * ergueu Muralha numa cidade grande tem as duas vantagens, e assaltá-la é caro mesmo.
 */
export function defesaNoAssalto(milicianos: number, ajustes: AjustesCerco): number {
  return milicianos * ajustes.bonusDeMuralha;
}

/**
 * Quantos milicianos se perderam, sabendo quanto da DEFESA sobrou.
 *
 * A defesa é gente multiplicada pela muralha; desfazer a multiplicação é o que devolve o
 * número em homens. Sem isto, um assalto rechaçado contaria as perdas em unidades de
 * defesa e a população encolheria pelo dobro.
 */
export function milicianosPerdidos(
  milicianos: number,
  defesaRestante: number,
  ajustes: AjustesCerco,
): number {
  const vivos = Math.min(milicianos, Math.floor(defesaRestante / ajustes.bonusDeMuralha));
  return Math.max(0, milicianos - vivos);
}
