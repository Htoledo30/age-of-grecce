/**
 * A surtida: o sitiado sai de dentro para atacar quem o cerca.
 *
 * É a única coisa que obriga o sitiante a lutar — ele declarou que não quer choque, e sem
 * uma decisão do defensor os dois ficariam acampados lado a lado até o fim dos tempos.
 * Excludente com a marcha: quem sai para lutar em casa não vai a lugar nenhum no mesmo
 * turno.
 */

import type { NucleoDaCampanha, Permissao } from '../nucleo';
import { donoDe } from '../provincia/consultas';
import { ordemDaHoste, surtidaDe } from './ordens-da-rodada';

/**
 * Esta hoste pode surtir?
 *
 * As recusas saem da mais externa para a mais interna, como no resto do jogo: reclamar de
 * "não há cerco aqui" numa hoste que nem é sua faria o jogador consertar a coisa errada.
 */
export function podeSurtir(
  nucleo: NucleoDaCampanha,
  idHoste: string,
  porPoder: string | null,
): Permissao {
  if (nucleo.estado.jogador === null) {
    return { pode: false, motivo: 'a campanha ainda não começou' };
  }
  const hoste = nucleo.mobilizacao.hoste(idHoste);
  if (!hoste) return { pode: false, motivo: 'não há hoste aqui para lutar' };
  if (hoste.poder !== porPoder) return { pode: false, motivo: 'esta hoste não é sua' };
  // ⚠️ Surtir é sair da PRÓPRIA cidade. Uma hoste de passagem por uma província alheia que
  // um terceiro sitia não tem cerco nenhum a quebrar — o problema não é dela.
  if (donoDe(nucleo, hoste.posicao) !== hoste.poder) {
    return { pode: false, motivo: 'a surtida sai de dentro da própria cidade' };
  }
  const cerco = nucleo.estado.cercos[hoste.posicao];
  if (!cerco || cerco.sitiante === hoste.poder) {
    return { pode: false, motivo: `${nucleo.atlas.nomeDe(hoste.posicao)} não está sitiada` };
  }
  if (ordemDaHoste(nucleo, idHoste) !== undefined) {
    return { pode: false, motivo: 'esta hoste já tem ordem nesta rodada' };
  }
  return { pode: true };
}

/**
 * Registra a surtida. **Nada se move agora**, como em toda ordem.
 *
 * Devolve `false` quando ela já estava registrada — declarar duas vezes é a mesma decisão,
 * não uma nova.
 */
export function surtir(
  nucleo: NucleoDaCampanha,
  idHoste: string,
  porPoder: string | null,
): boolean {
  const r = podeSurtir(nucleo, idHoste, porPoder);
  if (!r.pode) throw new Error(r.motivo);
  if (surtidaDe(nucleo, idHoste)) return false;
  nucleo.estado.surtidas.push(idHoste);
  return true;
}

/** Contra quem esta hoste surtiria, se pudesse. `undefined` quando não há cerco ali. */
export function sitianteDaHosteDe(
  nucleo: NucleoDaCampanha,
  idHoste: string,
): string | undefined {
  const hoste = nucleo.mobilizacao.hoste(idHoste);
  if (!hoste) return undefined;
  const cerco = nucleo.estado.cercos[hoste.posicao];
  return cerco && cerco.sitiante !== hoste.poder ? cerco.sitiante : undefined;
}
