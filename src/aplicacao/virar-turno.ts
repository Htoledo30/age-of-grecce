/**
 * Vira o turno e põe as marchas em movimento.
 *
 * ⚠️ **O gancho de inspeção passa por aqui também.** Se ele chamasse `campanha.passarTurno`
 * direto, captura e teste de tela exercitariam um jogo sem marcha — justamente o caminho que
 * não existe pra quem joga.
 */

import { atualizarInterface } from './atualizar-interface';
import type { Jogo } from './contexto';
import { noticiasDaRodada } from './cronica-da-rodada';
import { trechosDaRodada } from './vistas/mapa';

export function virarTurno(jogo: Jogo): void {
  jogo.campanha.passarTurno();
  jogo.tela.cronica.mostrar(jogo.campanha.turno, noticiasDaRodada(jogo));
  // ⚠️ A animação começa DEPOIS de resolver e ANTES de repintar, e a ordem importa: só depois
  // de resolver se sabe quem de fato andou (quem foi barrado na estrada parou no meio), e é o
  // redesenho seguinte que põe cada peça no começo da própria trilha. Nenhum quadro é pintado
  // entre as duas coisas, porque isto tudo é uma tarefa só.
  jogo.tela.animacaoDeMarcha.comecar(
    trechosDaRodada(jogo),
    jogo.ajustes.animacao.segundosPorSaltoDeMarcha,
  );
  atualizarInterface(jogo);
}
