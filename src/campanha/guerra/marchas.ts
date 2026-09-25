/**
 * Marchar: para onde esta hoste pode ir, e a ordem que ela leva pra virada.
 *
 * **Nada se MOVE no clique** — mas a hoste se PARTE no clique. A ordem fica registrada,
 * revisável e cancelável, e a marcha só acontece quando o turno vira, junto com as de todo
 * mundo: é o ponto da resolução simultânea. O que mudou é que mandar PARTE da tropa destaca a
 * parte na hora, para que o resto continue livre para receber outra ordem na mesma rodada. A
 * posição não muda no clique; a contagem de peças, sim.
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
import { cercoEm } from './cercos';
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

/**
 * Registra a ordem. **Nada se move agora — mas a hoste se PARTE agora.**
 *
 * ⚠️ **Mandar parte da hoste destaca a parte na hora, e é o conserto do relato de Henrique:**
 * *"quero poder quebrar uma hoste em várias hostes no mesmo turno. se eu fiz um pedido de 500
 * para ir até Maratona, elas têm que sair da conta das que ficam em Atenas"*. Antes os 500
 * ficavam pendurados numa ORDEM sobre a hoste inteira: a ficha continuava dizendo 1.000, o
 * botão de mover sumia, e os outros 500 não podiam receber ordem nenhuma — porque as ordens são
 * um `Record` por id de hoste e a segunda sobrescreveria a primeira.
 *
 * A divisão já existia; só acontecia tarde demais. `movimento/resolucao/forcas.ts` cria um
 * destacamento a cada virada — *"parte da antiga fica, parte vai, e as duas passam a existir ao
 * mesmo tempo"* — e `pousar.ts` funde de volta quem para junto. Isto adianta o corte para o
 * clique, que é onde o jogador precisa dele.
 *
 * ⚠️ **A hoste NOVA leva a ordem; o id ORIGINAL fica com o resto.** É a metade que decide a
 * usabilidade: a seleção do jogador aponta para o id original, então a ficha continua aberta na
 * tropa que sobrou, com a barra já no número novo, pronta para a segunda ordem no mesmo gesto.
 * Ao contrário, ele teria de caçar o marcador irmão a cada destacamento.
 */
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
  // Parte da hoste vira uma hoste; a hoste inteira vai por si e não se divide. `destacar`
  // devolve `undefined` no segundo caso, e aí a ordem fica no id de sempre.
  //
  // ⚠️ **A guarnição CERCADA não se divide, e é regra e não limitação técnica.** Dentro de um
  // cerco existe uma guarnição, e ela sai inteira ou não sai: partir a defesa em duas colunas
  // enquanto o inimigo está sentado no portão faria a surtida — que é a hoste toda saindo —
  // conviver com um destacamento pela mesma porta, e a resolução decide surtida por PROVÍNCIA,
  // não por hoste. Quem está cercado marcha inteiro, ou surte, ou fica.
  const sitiada = cercoEm(nucleo, hoste.posicao)?.sitiante;
  const podeDividir = sitiada === undefined || sitiada === hoste.poder;
  const deQuem = (podeDividir ? nucleo.mobilizacao.destacar(idHoste, homens) : undefined) ?? idHoste;
  nucleo.estado.ordens[deQuem] = {
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
  // ⚠️ **Cancelar REÚNE, e sem isto o desfazer não desfaz.** Desde que mandar parte da hoste a
  // parte de verdade, a ordem cancelada deixaria duas peças suas paradas no mesmo lugar — uma
  // divisão que o jogador nunca pediu e que ele não tem comando para desmanchar. A resolução já
  // funde quem para junto, mas só na virada seguinte: aqui é agora.
  // Livre é quem não vai a lugar nenhum: devolver os homens a uma peça que já está de partida
  // os mandaria embora sem ninguém pedir.
  nucleo.mobilizacao.reunir(
    idHoste,
    (id) => ordemDaHoste(nucleo, id) === undefined && !surtidaDe(nucleo, id),
  );
  return true;
}
