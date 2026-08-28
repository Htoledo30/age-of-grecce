/**
 * Marchar: para onde esta hoste pode ir, e a ordem que ela leva pra virada.
 *
 * **Nada se move no clique.** A ordem fica registrada, revisável e cancelável, e só
 * acontece quando o turno vira — junto com as de todo mundo. É o ponto da resolução
 * simultânea: enquanto o turno não vira, jogador e IA decidem contra o MESMO mundo.
 */

import { temAcessoA } from '../diplomacia/acesso-militar';
import { temPortoEm } from '../comercio/alcance';
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
    (id) => temAcessoA(nucleo, hoste.poder, donoDe(nucleo, id)),
    nucleo.ajustes.combate.saltosPorRodada,
    // Embarcar exige Porto NA SUA terra: é a porta do mar, e é a terceira razão de existir
    // da obra — depois do trânsito e do alcance comercial.
    (id) => donoDe(nucleo, id) === hoste.poder && temPortoEm(nucleo, id),
  );
}

/**
 * As rotas INTEIRAS a partir desta hoste, sem teto de rodadas — todos os destinos de uma vez.
 *
 * ⚠️ **Existe porque a travessia não cabe numa virada.** Uma hoste anda um salto por rodada;
 * ir de Mégara a Egina são três — terra, água, ilha. Perguntando só "aonde chego hoje", a IA
 * nunca veria a ilha e nenhum reino jamais atravessaria o mar. Isto responde a outra pergunta:
 * *"por onde eu chegaria lá, um dia?"* — e quem chama marcha para o PRIMEIRO trecho dela.
 *
 * Devolve o mapa inteiro, e não um destino: é UMA busca em largura, e quem decide compara
 * dezenas de alvos com ela. Uma busca por alvo seria a mesma varredura repetida dezenas de
 * vezes por hoste por turno.
 *
 * As regras são as mesmas de `rotasDaHoste`, e é isso que garante que o caminho previsto seja
 * um caminho que a marcha aceita: território próprio deixa passar, terra alheia é terminal, o
 * mar é de todos e embarcar exige Porto.
 */
export function rotasLongasDaHoste(
  nucleo: NucleoDaCampanha,
  idHoste: string,
): ReadonlyMap<string, readonly string[]> {
  const hoste = nucleo.mobilizacao.hoste(idHoste);
  if (!hoste) return new Map();
  return rotasDe(
    nucleo.atlas,
    hoste.posicao,
    (id) => temAcessoA(nucleo, hoste.poder, donoDe(nucleo, id)),
    // Sem teto de verdade: nenhuma rota tem mais trechos do que o mapa tem províncias, e a
    // busca em largura para sozinha quando a fronteira esvazia.
    nucleo.atlas.provincias.length,
    (id) => donoDe(nucleo, id) === hoste.poder && temPortoEm(nucleo, id),
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
    // O clique escolhe o DESTINO FINAL. A resolução anda só os trechos desta rodada e
    // conserva o restante da rota para as próximas viradas.
    rota: rotasLongasDaHoste(nucleo, idHoste).get(destino),
    // ⚠️ **É por aqui que a diplomacia entra no jogo.** Terra alheia só recebe marcha de quem
    // está em guerra com o dono dela — e a porta é a mesma para o jogador e para a IA, que é o
    // que garante que as duas joguem o mesmo jogo. Sem esta linha, "paz" seria um rótulo na
    // aba de Diplomacia sem consequência nenhuma no mapa.
    // ⚠️ **A água não é de ninguém, e por isso não há a quem declarar guerra.** Sem esta
    // exceção, marchar para uma zona de mar seria recusado com "não está em guerra com você"
    // e um nome de dono vazio — a travessia morreria na porta.
    emGuerraComODono:
      nucleo.atlas.ehMar(destino) ||
      (porPoder !== null &&
        (donoDoDestino === porPoder ||
          emGuerra(nucleo, porPoder, donoDoDestino) ||
          // ⚠️ **O acesso militar é a terceira chave desta porta.** Sem ele, atravessar a
          // Megáride para chegar a Corinto exigia declarar guerra a Mégara — e num istmo
          // cheio de vizinhos isso fazia a geografia obrigar guerras que ninguém queria.
          temAcessoA(nucleo, porPoder, donoDoDestino))),
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
    // A IA já refaz suas decisões a cada turno. A viagem persistente existe para poupar o
    // jogador do clique repetido e só é necessária quando o destino não cabe nesta rodada.
    ...(porPoder === nucleo.estado.jogador &&
    r.rota.length > nucleo.ajustes.combate.saltosPorRodada
      ? { continuar: true as const }
      : {}),
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
