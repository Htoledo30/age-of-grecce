/**
 * Marchar: para onde esta hoste pode ir, e a ordem que ela leva pra virada.
 *
 * **Nada se move no clique.** A ordem fica registrada, revisável e cancelável, e só
 * acontece quando o turno vira — junto com as de todo mundo. É o ponto da resolução
 * simultânea: enquanto o turno não vira, jogador e IA decidem contra o MESMO mundo.
 */

import { rotasDe } from '@/movimento/alcance';
import { avaliarOrdem } from '@/movimento/ordens';
import type { RecusaDeOrdem } from '@/movimento/ordens';
import type { Postura } from '@/combate/cerco';
import type { NucleoDaCampanha } from '../nucleo';
import { donoDe } from '../provincia/consultas';
import { emGuerra } from '../diplomacia/relacoes';
import { ordemDaHoste, surtidaDe } from './ordens-da-rodada';

/**
 * As rotas que a hoste pode tomar nesta rodada, por destino.
 *
 * Vazio quando não há hoste ou quando ela está cercada de terra alheia. É este mapa que a
 * interface desenha como destinos clicáveis — e é dele que sai a rota que a ordem guarda.
 */
export function rotasDaHoste(
  nucleo: NucleoDaCampanha,
  idHoste: string,
): ReadonlyMap<string, readonly string[]> {
  const hoste = nucleo.mobilizacao.hoste(idHoste);
  if (!hoste) return new Map();
  return rotasDe(
    nucleo.atlas,
    hoste.posicao,
    (id) => donoDe(nucleo, id) === hoste.poder,
    nucleo.ajustes.combate.saltosPorRodada,
  );
}

/**
 * Esta ordem pode ser registrada, e por qual rota?
 *
 * `porPoder` existe porque a ordem pertence ao dono da HOSTE, não ao jogador: é assim que a
 * IA vai mandar as dela, e é o que permite montar um inimigo no tabuleiro hoje.
 */
export function podeOrdenarMarcha(
  nucleo: NucleoDaCampanha,
  idHoste: string,
  destino: string,
  homens: number,
  porPoder: string | null,
): RecusaDeOrdem {
  if (nucleo.estado.jogador === null) {
    return { pode: false, motivo: 'a campanha ainda não começou' };
  }
  const hoste = nucleo.mobilizacao.hoste(idHoste);
  const donoDoDestino = donoDe(nucleo, destino);
  return avaliarOrdem(hoste?.posicao ?? '', destino, nucleo.atlas.nomeDe(destino), homens, {
    forcaNaOrigem: nucleo.mobilizacao.forcaDaHoste(idHoste),
    minha: hoste?.poder === porPoder,
    rota: rotasDaHoste(nucleo, idHoste).get(destino),
    // ⚠️ **É por aqui que a diplomacia entra no jogo.** Terra alheia só recebe marcha de quem
    // está em guerra com o dono dela — e a porta é a mesma para o jogador e para a IA, que é o
    // que garante que as duas joguem o mesmo jogo. Sem esta linha, "paz" seria um rótulo na
    // aba de Diplomacia sem consequência nenhuma no mapa.
    emGuerraComODono:
      porPoder !== null && (donoDoDestino === porPoder || emGuerra(nucleo, porPoder, donoDoDestino)),
    nomeDoDono: nucleo.atlas.poderes.find((p) => p.id === donoDoDestino)?.nome ?? donoDoDestino,
    // Surtir ocupa a rodada da hoste tanto quanto marchar: são a mesma decisão em dois
    // sentidos, e a recusa é a mesma frase de propósito.
    jaTemOrdem:
      ordemDaHoste(nucleo, idHoste) !== undefined || surtidaDe(nucleo, idHoste),
  });
}

/** Registra a ordem. **Nada se move agora.** */
export function ordenarMarcha(
  nucleo: NucleoDaCampanha,
  idHoste: string,
  destino: string,
  homens: number,
  porPoder: string | null,
  postura: Postura,
  /** `null` (o padrão) é lutar até a linha ceder. Ver `OrdemDeMarcha.recuarAos`. */
  recuarAos: number | null = null,
): void {
  const r = podeOrdenarMarcha(nucleo, idHoste, destino, homens, porPoder);
  if (!r.pode) throw new Error(r.motivo);
  const hoste = nucleo.mobilizacao.hoste(idHoste);
  if (!hoste) throw new Error(`não há hoste ${idHoste}`);
  nucleo.estado.ordens[idHoste] = {
    origem: hoste.posicao,
    rota: r.rota,
    homens,
    postura,
    recuarAos,
  };
}

/**
 * Desfaz a ordem desta hoste. Devolve `false` quando não havia nada a desfazer.
 *
 * Cancela também a surtida: para o jogador as duas são "o que esta hoste vai fazer nesta
 * rodada", e um botão de cancelar que desfizesse só uma delas deixaria a outra em pé sem
 * nada dizer. Nada foi gasto, então nada é devolvido.
 */
export function cancelarOrdem(nucleo: NucleoDaCampanha, idHoste: string): boolean {
  const tinhaOrdem = nucleo.estado.ordens[idHoste] !== undefined;
  const tinhaSurtida = surtidaDe(nucleo, idHoste);
  if (!tinhaOrdem && !tinhaSurtida) return false;
  delete nucleo.estado.ordens[idHoste];
  nucleo.estado.surtidas = nucleo.estado.surtidas.filter((id) => id !== idHoste);
  return true;
}
