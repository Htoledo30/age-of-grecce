/**
 * A entrada na campanha — o caminho único que o menu e o gancho de desenvolvimento usam.
 *
 * Partida nova não herda marcha nenhuma: o que estivesse andando descreve um mundo que
 * deixou de existir.
 */

import type { Jogo } from './contexto';

export function entrarNaCampanha(jogo: Jogo, idPoder: string): void {
  jogo.tela.animacaoDeMarcha.parar();
  jogo.selecao.fase = 'campanha';
  jogo.tela.inicio.encerrar(idPoder);
  jogo.campanha.comecar(idPoder);
}
