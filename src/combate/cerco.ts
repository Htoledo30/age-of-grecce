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
 * ⚠️ **SITIAR NUNCA TOMA A CIDADE.** Só o assalto toma. Esta é a regra central e ela já
 * esteve errada: o cerco acumulava progresso e abria os portões sozinho, o que fazia dele
 * um assalto lento em vez de outra coisa — e então escolher postura era só escolher a
 * velocidade da mesma conquista.
 *
 * Sitiar é **ficar na porta**. O exército acampa na divisa, não entra, e enquanto estiver
 * ali a província não produz nem comercia. É o que se faz quando não se tem gente para
 * tomar a praça: aperta o inimigo, empobrece-o, e espera — juntando uma leva atrás da
 * outra até valer o assalto. Quem senta paga por isso ficando parado em terra alheia
 * enquanto o dono junta gente para o socorro.
 *
 * | postura      | toma a cidade? | custo em homens | o que faz                             |
 * | ------------ | -------------- | --------------- | ------------------------------------- |
 * | **Assaltar** | sim, no turno  | alto            | briga com a milícia atrás da muralha  |
 * | **Sitiar**   | **nunca**      | nenhum          | corta produção e comércio, e espera   |
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
   * A postura desta rodada. Trocável enquanto o cerco estiver de pé.
   *
   * Não há progresso guardado porque não há progresso: o cerco não anda em direção a nada.
   * Ele dura enquanto o exército ficar ali, e acaba quando ele sai, morre ou assalta.
   */
  postura: Postura;
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
