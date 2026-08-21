/**
 * Painel da direita: recolhe e abre, e é onde ficam os CONTROLES do mapa.
 *
 * É o primeiro pedaço da interface de verdade do jogo, e por isso vale dizer a regra que
 * ele inaugura: **interface é HTML e CSS, não é desenho no canvas.** Texto selecionável,
 * foco de teclado, leitor de tela e ajuste de estilo sem recompilar shader — nada disso
 * se ganha desenhando botão na placa de vídeo.
 *
 * Aqui entra só controle de MAPA — o que vale pra tela inteira e não fala de nenhuma
 * província em particular. Tudo que diz respeito à província selecionada mora no canto
 * de baixo à esquerda: `AcoesProvincia` (o que dá pra fazer) empilhado sobre
 * `FichaProvincia` (o que ela é). O andamento da campanha vai pra `BarraTurno`, no topo.
 *
 * Recolher não destrói nada: o conteúdo continua montado, então abrir de novo é
 * instantâneo e não perde estado.
 */

import { definirTooltip } from './tooltip';

export class PainelLateral {
  private readonly raiz = document.createElement('aside');
  private readonly corpo = document.createElement('div');
  private readonly aba = document.createElement('button');
  private readonly interruptorCores = document.createElement('button');

  private aberto = true;

  /** Chamado quando o jogador liga ou desliga a cor dos reinos. */
  aoTrocarCores: (ligadas: boolean) => void = () => {};

  constructor(pai: HTMLElement, coresLigadas: boolean) {
    this.raiz.className = 'painel-lateral';
    this.raiz.dataset['aberto'] = 'sim';

    this.aba.className = 'painel-lateral__aba';
    this.aba.type = 'button';
    definirTooltip(this.aba, {
      titulo: 'Controles do mapa',
      corpo: 'Recolha ou abra as opções de visualização.',
    });
    this.aba.addEventListener('click', () => this.alternar());
    this.raiz.appendChild(this.aba);

    this.corpo.className = 'painel-lateral__corpo';
    this.raiz.appendChild(this.corpo);

    const titulo = document.createElement('h2');
    titulo.className = 'painel-lateral__titulo';
    titulo.textContent = 'Mapa';
    this.corpo.appendChild(titulo);

    this.interruptorCores.className = 'interruptor';
    this.interruptorCores.type = 'button';
    this.interruptorCores.addEventListener('click', () => {
      this.marcarCores(this.interruptorCores.getAttribute('aria-pressed') !== 'true');
      this.aoTrocarCores(this.interruptorCores.getAttribute('aria-pressed') === 'true');
    });
    this.corpo.appendChild(this.interruptorCores);

    const dica = document.createElement('p');
    dica.className = 'painel-lateral__dica';
    dica.textContent = 'Com as cores desligadas as fronteiras continuam desenhadas.';
    this.corpo.appendChild(dica);

    this.marcarCores(coresLigadas);
    pai.appendChild(this.raiz);
  }

  alternar(): void {
    this.aberto = !this.aberto;
    this.raiz.dataset['aberto'] = this.aberto ? 'sim' : 'nao';
    this.aba.textContent = this.aberto ? '›' : '‹';
    this.aba.setAttribute('aria-expanded', String(this.aberto));
  }

  private marcarCores(ligadas: boolean): void {
    this.interruptorCores.setAttribute('aria-pressed', String(ligadas));
    this.interruptorCores.textContent = ligadas
      ? 'Cores dos reinos: ligadas'
      : 'Cores dos reinos: desligadas';
  }
}
