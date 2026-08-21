/**
 * A ordem de marcha: o que o jogador registra durante o turno e a rodada executa depois.
 *
 * **Mover não muda o mapa no instante do clique.** A ordem fica guardada, revisável e
 * cancelável, e só acontece na resolução — junto com as ordens de todo mundo. É o que
 * impede quem age primeiro de tomar uma fronteira vazia antes de o outro lado ter
 * oportunidade de mandar reforço. Ver `documentacao/design/resolucao-da-rodada.md`.
 *
 * Este arquivo só sabe **julgar e descrever** uma ordem. Quem a executa é `resolucao.ts`.
 */

import type { Postura } from '@/combate/cerco';

/** Uma ordem de marcha registrada, ainda não executada. */
export interface OrdemDeMarcha {
  /** De onde sai. A chave do registro é o id da hoste: **uma ordem por hoste por rodada.** */
  origem: string;
  /**
   * Os trechos, na ordem, sem a origem. Um ou dois — nunca mais que os pontos da hoste.
   *
   * Guardar a ROTA e não só o destino é o que permite interceptar no meio do caminho: sem
   * ela, a resolução não saberia por onde a hoste passou.
   */
  rota: readonly string[];
  /** Quantos homens marcham. O resto fica defendendo a origem. */
  homens: number;
  /**
   * O que fazer ao chegar, se o destino for alheio e tiver gente dentro.
   *
   * Viaja com a ORDEM e não com a hoste porque é decisão do destino: a mesma tropa
   * assalta uma cidade pequena e senta na frente de uma grande. Em terra própria ou em
   * província vazia ela não significa nada — e não precisa significar.
   */
  postura: Postura;
}

/** Por que uma ordem foi recusada — ou o consentimento de registrá-la. */
export type RecusaDeOrdem =
  { pode: true; rota: readonly string[] } | { pode: false; motivo: string };

/** O que se precisa saber para julgar uma ordem. */
export interface SituacaoDaOrdem {
  /** Quantos homens estão parados na origem agora. */
  forcaNaOrigem: number;
  /** A hoste é de quem está mandando. */
  minha: boolean;
  /** A rota até o destino, ou `undefined` quando ele não é alcançável nesta rodada. */
  rota: readonly string[] | undefined;
  /** Já existe ordem registrada para esta hoste nesta rodada. */
  jaTemOrdem: boolean;
}

/**
 * Esta ordem pode ser registrada?
 *
 * As recusas saem da mais externa para a mais interna: reclamar da quantidade quando a
 * província nem é sua faria o jogador consertar a coisa errada.
 */
export function avaliarOrdem(
  origem: string,
  destino: string,
  nomeDoDestino: string,
  homens: number,
  situacao: SituacaoDaOrdem,
): RecusaDeOrdem {
  if (situacao.forcaNaOrigem <= 0) {
    return { pode: false, motivo: 'não há hoste aqui para marchar' };
  }
  if (!situacao.minha) return { pode: false, motivo: 'esta hoste não é sua' };
  if (origem === destino) return { pode: false, motivo: 'a hoste já está aqui' };
  if (situacao.jaTemOrdem) {
    return { pode: false, motivo: 'esta hoste já tem ordem nesta rodada' };
  }

  // ⚠️ **Marchar contra terra alheia é legal — é o ponto da guerra.** O que a rota já
  // garante é que ela não SERVE de caminho: território inimigo só pode ser o último
  // trecho. "Longe demais" cobre tanto a distância quanto a tentativa de atravessar um
  // reino alheio pra chegar do outro lado.
  if (!situacao.rota) {
    return { pode: false, motivo: `${nomeDoDestino} está longe demais para esta rodada` };
  }

  if (!Number.isInteger(homens) || homens <= 0) {
    return { pode: false, motivo: 'o número de homens precisa ser inteiro' };
  }
  if (homens > situacao.forcaNaOrigem) {
    return {
      pode: false,
      motivo: `há apenas ${situacao.forcaNaOrigem.toLocaleString('pt-BR')} homens aqui`,
    };
  }

  return { pode: true, rota: situacao.rota };
}
