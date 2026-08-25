/**
 * A pergunta "o que fazer ao chegar?" — e ela não faz sentido sem um alvo hostil apontado.
 *
 * Dois botões e não um interruptor: "assaltar" e "sitiar" são coisas diferentes, e um
 * interruptor esconderia metade do vocabulário.
 *
 * Embaixo deles vem a **ordem de recuo**, e essa É um interruptor, porque é uma coisa só com
 * dois estados: lutar até a linha ceder, ou sair de campo se a batalha virar. É ordem dada
 * ANTES — o general grego mandava e depois assistia de longe — e é o que separa perder o
 * exército de perder o chão.
 */

import type { Postura } from '@/combate/cerco';
import { rotularComIcone } from '../icones-gregos';
import { definirTooltip } from '../tooltip';
import type { VistaDoExercito } from './vista';

const OPCOES = [
  {
    postura: 'assaltar' as const,
    rotulo: 'Assaltar',
    icone: 'lanca' as const,
    titulo: 'Assaltar a cidade',
    corpo: 'Ataca agora. Enfrenta a guarnição e depois a milícia.',
  },
  {
    postura: 'sitiar' as const,
    rotulo: 'Sitiar',
    icone: 'muralha' as const,
    titulo: 'Sitiar a cidade',
    corpo: 'Corta produção e comércio sem atacar a guarnição.',
  },
];

export class EscolhaDePostura {
  private readonly pergunta = document.createElement('p');
  private readonly seletor = document.createElement('div');
  private readonly botaoAssaltar = document.createElement('button');
  private readonly botaoRecuo = document.createElement('button');

  aoEscolher: (postura: Postura) => void = () => {};
  /** Muda a ordem de recuo desta marcha. `true` é sair de campo se a batalha virar. */
  aoTrocarRecuo: (recuar: boolean) => void = () => {};

  constructor(pai: HTMLElement) {
    this.pergunta.className = 'exercito__pergunta';
    this.seletor.className = 'exercito__postura';

    for (const opcao of OPCOES) {
      const botao =
        opcao.postura === 'assaltar' ? this.botaoAssaltar : document.createElement('button');
      botao.className = 'botao exercito__botao exercito__botao--postura';
      botao.type = 'button';
      rotularComIcone(botao, opcao.icone, opcao.rotulo);
      definirTooltip(botao, { titulo: opcao.titulo, corpo: opcao.corpo });
      botao.addEventListener('click', () => {
        this.aoEscolher(opcao.postura);
        botao.blur();
      });
      this.seletor.appendChild(botao);
    }

    this.botaoRecuo.type = 'button';
    this.botaoRecuo.className = 'botao exercito__botao exercito__botao--recuo';
    this.botaoRecuo.addEventListener('click', () => {
      this.recuar = !this.recuar;
      this.aoTrocarRecuo(this.recuar);
      this.desenharRecuo();
      this.botaoRecuo.blur();
    });

    pai.append(this.pergunta, this.seletor, this.botaoRecuo);
    this.desenharRecuo();
  }

  /** A ordem de recuo desta marcha. Falso é lutar até a linha ceder. */
  private recuar = false;

  private desenharRecuo(): void {
    rotularComIcone(
      this.botaoRecuo,
      this.recuar ? 'muralha' : 'lanca',
      this.recuar ? 'Recuar se virar' : 'Lutar até o fim',
    );
    this.botaoRecuo.dataset['ligado'] = this.recuar ? 'sim' : 'nao';
    definirTooltip(this.botaoRecuo, {
      titulo: this.recuar ? 'Ordem: recuar' : 'Ordem: lutar',
      corpo: this.recuar
        ? 'Sai de campo antes de a linha ceder. Perde pouco, escapa da perseguição, e o ' +
          'exército sobrevive — mas entrega o chão. Sem terra sua vizinha, a hoste se desfaz ' +
          'e os homens voltam para casa. Diante de cavalaria, sair custa mais caro.'
        : 'Luta até quebrar. Pode ganhar a batalha que a aritmética dizia perdida — e pode ' +
          'perder o exército inteiro na perseguição.',
    });
  }

  mostrar(vista: VistaDoExercito): void {
    const alvo = vista.alvo;
    this.seletor.hidden = alvo === null;
    this.pergunta.hidden = alvo === null;
    this.botaoRecuo.hidden = alvo === null;
    if (!alvo) return;

    // ⚠️ **Contra cidade murada, assaltar não é escolha daquele dia.** O botão continua na
    // tela, desabilitado e dizendo por quê: escondê-lo faria a diferença entre uma cidade
    // aberta e uma fortificada parecer defeito da interface.
    //
    // ⚠️ **O motivo vai na PERGUNTA, não no rótulo do botão.** Os dois botões dividem uma
    // grade de duas colunas, e um rótulo comprido vaza por cima do vizinho. Em cima há linha
    // inteira para escrever a frase toda.
    const muralha = alvo.rodadasDeCercoExigidas;
    this.pergunta.textContent =
      muralha > 0
        ? `${alvo.nome} é murada: exige ${muralha} ${muralha === 1 ? 'rodada' : 'rodadas'} de cerco antes de um assalto`
        : `${alvo.nome}: o que fazer ao chegar?`;
    this.botaoAssaltar.disabled = muralha > 0;
  }
}
