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

/**
 * A IA está congelada? **Andaime dos testes de TELA, e nunca ligado no jogo.**
 *
 * ⚠️ **Existe porque a IA passou a ganhar, e isso quebrou vinte testes de uma vez.** Um teste
 * de marcha, de muralha ou de crônica planta as próprias peças e vira alguns turnos para ver o
 * que a TELA faz — e desde que a IA ataca de verdade, o jogador parado perde Atenas na virada
 * 3 ou 4. O teste então morria em "esta província não é sua", que não diz nada sobre marcha.
 *
 * É o mesmo raciocínio do comentário logo abaixo, levado até o fim: a IA vive fora de
 * `passarTurno` para que virar turnos num teste não signifique dezessete poderes agindo dentro
 * dele. Quem TESTA a IA não congela — e há teste de sobra para ela em `testes/ia/`.
 */
let iaCongelada = false;

/** Desliga a IA nesta sessão. Só o gancho de inspeção chama, e ele só existe em DEV. */
export function congelarIA(): void {
  iaCongelada = true;
}

export function virarTurno(jogo: Jogo): void {
  // ⚠️ **A IA joga ANTES de a rodada resolver, e é a única hora possível.** As ordens deste
  // jogo são simultâneas: se ela decidisse depois, estaria vendo as cartas do jogador.
  //
  // E ela vive AQUI, fora de `passarTurno`, porque é um jogador e não uma regra da campanha —
  // se morasse lá dentro, os testes que viram turnos passariam a ter dezessete poderes agindo
  // dentro deles, e um teste sobre fome deixaria de ser sobre fome.
  //
  // ⚠️ **A tela só se repinta UMA vez, no fim.** Cada ordem da IA passava por `aoMudar` — repintar
  // o mapa, redesenhar a interface inteira, salvar e conferir o fim de jogo —, e uma virada com
  // dezenas de ordens gastava um quarto do tempo redesenhando uma tela que ninguém via: a
  // rodada é uma tarefa só, e nenhum quadro é pintado até ela acabar.
  const aoMudar = jogo.campanha.aoMudar;
  let mudou = false;
  jogo.campanha.aoMudar = () => {
    mudou = true;
  };
  try {
    if (!iaCongelada) jogarIA(jogo.campanha, jogo.ia, jogo.ajustes.jogo);
    jogo.campanha.passarTurno();
  } finally {
    jogo.campanha.aoMudar = aoMudar;
  }
  if (mudou) aoMudar();
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
