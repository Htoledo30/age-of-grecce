/**
 * Vira o turno e põe as marchas em movimento.
 *
 * ⚠️ **O gancho de inspeção passa por aqui também.** Se ele chamasse `campanha.passarTurno`
 * direto, captura e teste de tela exercitariam um jogo sem marcha — justamente o caminho que
 * não existe pra quem joga.
 */

import { jogarIA } from '@/ia/ia';
import { atualizarInterface } from './atualizar-interface';
import type { Jogo } from './contexto';
import { noticiasDaRodada } from './cronica-da-rodada';
import { batalhasDoJogador } from './vistas/batalhas';
import { trechosDaRodada } from './vistas/mapa';
import type { VistaDaBatalha } from '@/ui/batalha';

export function virarTurno(jogo: Jogo): void {
  // ⚠️ **A IA joga ANTES de a rodada resolver, e é a única hora possível.** As ordens deste
  // jogo são simultâneas: se ela decidisse depois, estaria vendo as cartas do jogador.
  //
  // E ela vive AQUI, fora de `passarTurno`, porque é um jogador e não uma regra da campanha —
  // se morasse lá dentro, os testes que viram turnos passariam a ter dezessete poderes agindo
  // dentro deles, e um teste sobre fome deixaria de ser sobre fome.
  jogarIA(jogo.campanha, jogo.ia);
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

  // ⚠️ **A janela é ILUSTRAÇÃO, e vem por último de propósito.** A campanha já resolveu tudo:
  // o mapa, a crônica e a barra já estão certos antes de ela abrir. Fechar a janela não muda
  // nada — e é essa ordem que garante que ela não consiga mentir sobre o que aconteceu.
  //
  // Uma fila, porque uma rodada pode ter mais de uma batalha do jogador: cada `Fechar` chama
  // a próxima, e o turno só volta a ser dele quando a fila esvazia.
  enfileirar(jogo, batalhasDoJogador(jogo));
}

function enfileirar(jogo: Jogo, batalhas: readonly VistaDaBatalha[]): void {
  const fila = [...batalhas];
  const proxima = (): void => {
    const vista = fila.shift();
    if (vista === undefined) {
      jogo.tela.batalha.esconder();
      return;
    }
    jogo.tela.batalha.mostrar(vista);
  };
  jogo.tela.batalha.aoFechar = proxima;
  proxima();
}
