/**
 * A resolução da rodada: executa todas as ordens juntas, em passos.
 *
 * O princípio, e ele responde quase tudo sozinho:
 *
 * > **A rodada resolve em PASSOS. Dentro de cada passo: primeiro todos PARTEM, depois todos
 * > CHEGAM, e só então se resolve quem ficou junto de quem.**
 *
 * É essa separação que faz a simultaneidade ser real. Se partida e chegada acontecessem hoste
 * por hoste, quem fosse processado primeiro veria um mundo que os outros ainda não mexeram —
 * que é exatamente o defeito que a resolução simultânea existe pra consertar.
 *
 * Este arquivo é só o ROTEIRO dos passos. Cada um vive num arquivo ao lado.
 */

import type { Ajustes } from '@/dados/esquema';
import { naEstrada } from './choque-na-estrada';
import { naProvincia } from './choque-na-provincia';
import { resolverCidades } from './cidades';
import { chegar, partir } from './forcas';
import type { Forca } from './forcas';
import { choqueObrigadoEm, posturasPorDestino, provinciasEmSurtida, quemLuta } from './posturas';
import { pousar } from './pousar';
import { relatorioVazio } from './relatorio';
import type { EstadoDaResolucao, MundoDaResolucao, RelatorioDaRodada } from './relatorio';

export function resolverRodada(
  estado: EstadoDaResolucao,
  ajustes: Ajustes['jogo']['combate'],
  mundo: MundoDaResolucao,
): RelatorioDaRodada {
  const relatorio = relatorioVazio();

  // As posturas são lidas ANTES de qualquer coisa: as ordens são consumidas no caminho, e sem
  // isto a cidade não saberia se quem chegou veio assaltar ou sentar.
  const posturas = posturasPorDestino(estado, mundo.donoDe);
  const querLutar = (forca: Forca): boolean =>
    quemLuta(forca, mundo.donoDe(forca.posicao), posturas, estado.cercos);

  // ⚠️ Lido ANTES de `partir`, que esvazia o tabuleiro: depois dele não há mais como perguntar
  // onde a hoste que surtiu estava parada.
  const emSurtida = provinciasEmSurtida(estado);
  const choqueObrigado = (provincia: string, presentes: readonly Forca[]): boolean =>
    choqueObrigadoEm(provincia, presentes, emSurtida, estado.cercos, mundo.donoDe);

  const forcas = partir(estado);
  for (let passo = 0; passo < ajustes.saltosPorRodada; passo++) {
    naEstrada(forcas, passo, relatorio.batalhas, mundo.batalha, mundo.dispersaram, mundo.refugio);
    chegar(forcas, passo);
    naProvincia(
      forcas,
      relatorio.batalhas,
      mundo.batalha,
      mundo.dispersaram,
      mundo.refugio,
      mundo.donoDe,
      querLutar,
      choqueObrigado,
    );
  }
  pousar(estado, forcas, relatorio.marchas);
  resolverCidades(estado, ajustes, mundo, posturas, relatorio);

  // ⚠️ As ordens são da RODADA, não da partida. Se sobrevivessem à virada, executariam de novo,
  // e o sintoma seria tropa andando sozinha. A surtida some pelo mesmo motivo: ela é a decisão
  // de UMA rodada, e uma que ficasse guardada faria a cidade sair para o campo sozinha, todo
  // turno, até morrer.
  estado.ordens = {};
  estado.surtidas = [];
  return relatorio;
}
