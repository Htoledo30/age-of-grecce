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
import { chegar, partir, soma } from './forcas';
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
  const posturas = posturasPorDestino(estado, mundo.donoDe, ajustes.saltosPorRodada);
  const querLutar = (forca: Forca): boolean =>
    quemLuta(
      forca,
      mundo.donoDe(forca.posicao),
      posturas,
      estado.cercos,
      mundo.ehMar(forca.posicao),
    );

  // ⚠️ Lido ANTES de `partir`, que esvazia o tabuleiro: depois dele não há mais como perguntar
  // onde a hoste que surtiu estava parada.
  const emSurtida = provinciasEmSurtida(estado);
  const choqueObrigado = (provincia: string, presentes: readonly Forca[]): boolean =>
    choqueObrigadoEm(provincia, presentes, emSurtida, estado.cercos, mundo.donoDe);

  const forcas = partir(estado);
  for (let passo = 0; passo < ajustes.saltosPorRodada; passo++) {
    naEstrada(
      forcas,
      passo,
      relatorio.batalhas,
      mundo.batalha,
      mundo.dispersaram,
      mundo.refugio,
      mundo.emGuerra,
    );
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
      mundo.emGuerra,
    );
  }
  const identidadeAoPousar = pousar(estado, forcas, relatorio.marchas);
  resolverCidades(estado, mundo, posturas, relatorio);

  // Uma ordem distante é uma VIAGEM: anda os trechos permitidos nesta rodada e conserva o
  // restante. Choque em província e recuo substituem `rota`; morte ou desvio também cancelam.
  const continuacoes: EstadoDaResolucao['ordens'] = {};
  const ambiguas = new Set<string>();
  for (const forca of forcas) {
    const ordem = forca.ordem;
    const idHoste = identidadeAoPousar.get(forca);
    if (!ordem?.continuar || !idHoste || !estado.hostes[idHoste]) continue;
    if (forca.rota !== ordem.rota) continue;
    const andou = Math.min(ajustes.saltosPorRodada, ordem.rota.length);
    const ondeDeviaParar = ordem.rota[andou - 1];
    const restante = ordem.rota.slice(andou);
    if (ondeDeviaParar !== forca.posicao || restante.length === 0) continue;

    const existente = continuacoes[idHoste];
    if (existente) {
      const mesmaViagem =
        existente.rota.join('|') === restante.join('|') &&
        existente.postura === ordem.postura &&
        existente.recuarAos === ordem.recuarAos;
      if (!mesmaViagem) {
        ambiguas.add(idHoste);
        delete continuacoes[idHoste];
        continue;
      }
      existente.homens += soma(forca.contingentes);
      continue;
    }
    if (ambiguas.has(idHoste)) continue;
    continuacoes[idHoste] = {
      origem: forca.posicao,
      rota: restante,
      homens: soma(forca.contingentes),
      postura: ordem.postura,
      recuarAos: ordem.recuarAos,
      continuar: true,
    };
  }
  estado.ordens = continuacoes;
  // A surtida continua sendo uma decisão de UMA rodada.
  estado.surtidas = [];
  return relatorio;
}
