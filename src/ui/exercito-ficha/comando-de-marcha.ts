/**
 * O botão de marchar, a instrução do modo de destino, e a ordem já dada.
 *
 * Uma ordem em pé tranca o resto: **uma por hoste por rodada.** Em vez de esconder os
 * controles, mostra-se a ordem e o jeito de desfazê-la.
 *
 * ⚠️ **A surtida conta como ordem.** Ela não é marcha nenhuma, mas ocupa a rodada da hoste do
 * mesmo jeito, e por isso é desfeita pelo mesmo botão de cancelar. Duas maneiras diferentes
 * de desfazer "o que esta hoste vai fazer" seriam duas maneiras de o jogador se perder.
 */

import { rotularComIcone } from '../icones-gregos';
import { definirTooltip } from '../tooltip';
import { numero } from './vista';
import type { VistaDoExercito } from './vista';

export class ComandoDeMarcha {
  private readonly botaoMover = document.createElement('button');
  private readonly instrucao = document.createElement('p');
  private readonly linhaOrdem = document.createElement('p');
  private readonly botaoCancelar = document.createElement('button');
  private vista: VistaDoExercito | null = null;

  aoAlternarMarcha: (idHoste: string) => void = () => {};
  aoCancelarOrdem: (idHoste: string) => void = () => {};

  constructor(pai: HTMLElement) {
    this.botaoMover.className = 'botao botao--principal exercito__botao';
    this.botaoMover.type = 'button';
    this.botaoMover.addEventListener('click', () => {
      const vista = this.vista;
      if (!vista?.minha) return;
      this.aoAlternarMarcha(vista.hoste.id);
      // `blur` no fim do clique: sem isso o botão fica com foco e a barra de espaço, que
      // passa o turno, dispara um clique sintético nele.
      this.botaoMover.blur();
    });

    this.instrucao.className = 'exercito__instrucao';
    this.linhaOrdem.className = 'exercito__ordem';

    this.botaoCancelar.className = 'botao exercito__botao';
    this.botaoCancelar.type = 'button';
    this.botaoCancelar.textContent = 'Cancelar ordem';
    definirTooltip(this.botaoCancelar, {
      titulo: 'Cancelar ordem',
      corpo: 'Cancela antes da próxima virada.',
    });
    this.botaoCancelar.addEventListener('click', () => {
      const vista = this.vista;
      // ⚠️ A surtida também é ordem aqui. Sem esta segunda condição o botão aparecia e não
      // fazia nada: quem tivesse declarado a surtida ficava preso a ela até a virada.
      if (!vista || (vista.ordem === null && vista.surtida?.declarada !== true)) return;
      this.aoCancelarOrdem(vista.hoste.id);
      this.botaoCancelar.blur();
    });

    pai.append(this.botaoMover, this.instrucao, this.linhaOrdem, this.botaoCancelar);
  }

  mostrar(vista: VistaDoExercito, temOrdem: boolean): void {
    this.vista = vista;

    this.linhaOrdem.hidden = !temOrdem;
    this.botaoCancelar.hidden = !temOrdem;
    const surtida = vista.surtida;
    if (vista.ordem) {
      this.linhaOrdem.textContent = `${numero(vista.ordem.homens)} marcham para ${vista.ordem.destino} ao passar o turno`;
    } else if (surtida?.declarada === true) {
      this.linhaOrdem.textContent = `a hoste sai para atacar ${surtida.contra} ao passar o turno`;
    }

    // Nada de sumir em silêncio: sem destino, o botão fica na tela dizendo o motivo. É assim
    // que o jogador descobre que a marcha só passa por território dele.
    const semDestino = vista.destinos === 0;
    this.botaoMover.hidden = !vista.minha || temOrdem;
    this.botaoMover.disabled = semDestino;
    rotularComIcone(
      this.botaoMover,
      'lanca',
      semDestino
        ? 'Mover · sem caminho pelo seu território'
        : vista.marchando
          ? 'Escolhendo destino — cancelar'
          : 'Mover',
    );
    definirTooltip(this.botaoMover, {
      titulo: 'Ordenar marcha',
      corpo: semDestino
        ? 'Não há destino alcançável pelo seu território.'
        : 'A ordem será resolvida na próxima virada.',
    });

    // ⚠️ **A instrução deixou de contar destinos, porque não há mais destinos a contar.** Ela
    // dizia *"clique num dos 199 destinos marcados no mapa"* — e 199 marcas era exatamente o
    // que derrubava o jogo para 2,4 quadros por segundo. Agora o mapa inteiro é o alvo, a rota
    // aparece sob o ponteiro, e quem cancela é o próprio botão de cima, que já diz "cancelar".
    //
    // E ela cede o lugar à RECUSA quando existe uma: instrução e recusa respondem a mesma
    // pergunta — *o que eu faço agora* —, e mostrar as duas juntas faria o jogador ler a
    // errada primeiro.
    const recusa = vista.marchando ? vista.recusaDoDestino : '';
    this.instrucao.hidden = !vista.marchando || (vista.alvo !== null && recusa === '');
    this.instrucao.dataset['tom'] = recusa === '' ? 'instrucao' : 'recusa';
    this.instrucao.textContent =
      recusa !== ''
        ? recusa
        : vista.marchando
          ? 'Clique na província ou zona de mar para onde a hoste deve ir.'
          : '';
  }
}
