/**
 * A ordem de marcha: o que o jogador registra durante o turno e a rodada executa depois.
 *
 * **Mover não muda o mapa no instante do clique.** A ordem fica guardada, revisável e
 * cancelável, e só acontece na resolução — junto com as ordens de todo mundo. É o que
 * impede quem age primeiro de tomar uma fronteira vazia antes de o outro lado ter
 * oportunidade de mandar reforço.
 *
 * Este arquivo só sabe **julgar e descrever** uma ordem. Quem a executa é `resolucao.ts`.
 */

import type { Postura } from '@/combate/cerco';

/** Uma ordem de marcha registrada, ainda não concluída. */
export interface OrdemDeMarcha {
  /** De onde sai no próximo trecho. A chave do registro é o id da hoste. */
  origem: string;
  /**
   * Os trechos que ainda faltam, na ordem, sem a origem.
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
  /**
   * Sai de campo se perder esta fração, ou `null` para lutar até a linha ceder.
   *
   * ⚠️ **É ordem dada ANTES, e é isso que a torna interessante.** O general grego dizia ao
   * exército o que fazer e depois assistia de longe — quem manda "lute até quebrar" pode
   * ganhar a batalha que a aritmética dizia perdida, e pode perder o exército inteiro. Quem
   * manda recuar guarda a tropa e entrega o chão.
   *
   * A janela de batalha REPRODUZ o que aconteceu; ela não decide. Se um dia o turno virar
   * pausável, o botão entre os rounds entra por aqui sem mudar a regra.
   */
  recuarAos: number | null;
  /** A ordem do jogador continua nas próximas viradas até o destino final. */
  continuar?: true | undefined;
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
  /** A rota inteira até o destino, ou `undefined` quando não existe caminho permitido. */
  rota: readonly string[] | undefined;
  /** Já existe ordem ou viagem registrada para esta hoste. */
  jaTemOrdem: boolean;
  /** O destino é meu, ou é de alguém com quem estou em guerra. */
  emGuerraComODono: boolean;
  /** Como se chama o dono do destino, para a recusa dizer com quem falta guerra. */
  nomeDoDono: string;
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
    return { pode: false, motivo: 'esta hoste já está cumprindo uma ordem' };
  }

  // ⚠️ **Marchar contra terra alheia é legal — é o ponto da guerra.** O que a rota já
  // garante é que ela não SERVE de caminho: território inimigo só pode ser o último
  // trecho. A falta de rota cobre também a tentativa de atravessar um reino alheio para
  // chegar do outro lado.
  if (!situacao.rota) {
    return { pode: false, motivo: `não há caminho livre até ${nomeDoDestino}` };
  }

  // ⚠️ **Marchar sobre terra alheia é ATO DE GUERRA, e o jogo passou a exigir que ela esteja
  // declarada.** A recusa vem depois da distância de propósito: reclamar da paz com um vizinho
  // que a hoste nem alcança faria o jogador declarar uma guerra inútil.
  if (!situacao.emGuerraComODono) {
    return {
      pode: false,
      motivo: `${situacao.nomeDoDono} não está em guerra com você — declare antes de marchar`,
    };
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
