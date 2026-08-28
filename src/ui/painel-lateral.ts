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
import { rotularComIcone } from './icones-gregos';

/** Uma faixa da legenda de relações: a cor e o que ela quer dizer. */
export interface FaixaDaLegenda {
  rotulo: string;
  cor: string;
}

export class PainelLateral {
  private readonly raiz = document.createElement('aside');
  private readonly corpo = document.createElement('div');
  private readonly aba = document.createElement('button');
  private readonly interruptorCores = document.createElement('button');
  private readonly interruptorRelacoes = document.createElement('button');
  private readonly sujeitoDasRelacoes = document.createElement('p');
  private readonly legenda = document.createElement('ul');

  private aberto = false;

  /** Chamado quando o jogador liga ou desliga a cor dos reinos. */
  aoTrocarCores: (ligadas: boolean) => void = () => {};

  /** Chamado quando ele liga ou desliga o MODO DE RELAÇÕES. */
  aoTrocarRelacoes: (ligado: boolean) => void = () => {};

  constructor(pai: HTMLElement, coresLigadas: boolean, faixas: readonly FaixaDaLegenda[]) {
    this.raiz.className = 'painel-lateral';
    this.raiz.dataset['aberto'] = 'nao';

    this.aba.className = 'painel-lateral__aba';
    this.aba.type = 'button';
    this.aba.textContent = '‹';
    this.aba.setAttribute('aria-expanded', 'false');
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
    rotularComIcone(titulo, 'mapa', 'Mapa');
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

    // ── O modo de relações ──────────────────────────────────────────────────────────────
    // ⚠️ **Depois do interruptor de cores e não antes**, porque é o mesmo assunto visto de
    // outro ângulo: o de cima pergunta "mostro a cor dos reinos?", este pergunta "a cor
    // quer dizer o quê?".
    this.interruptorRelacoes.className = 'interruptor';
    this.interruptorRelacoes.type = 'button';
    this.interruptorRelacoes.addEventListener('click', () => {
      const ligando = this.interruptorRelacoes.getAttribute('aria-pressed') !== 'true';
      this.aoTrocarRelacoes(ligando);
    });
    definirTooltip(this.interruptorRelacoes, {
      titulo: 'Relações no mapa',
      corpo:
        'Pinta cada reino pelo que ele acha de um outro. ' +
        'Com o modo ligado, clicar numa terra troca de quem é o ponto de vista.',
    });
    this.corpo.appendChild(this.interruptorRelacoes);

    this.sujeitoDasRelacoes.className = 'painel-lateral__dica';
    this.corpo.appendChild(this.sujeitoDasRelacoes);

    this.legenda.className = 'painel-lateral__legenda';
    for (const faixa of faixas) {
      const linha = document.createElement('li');
      const tinta = document.createElement('span');
      tinta.className = 'painel-lateral__tinta';
      tinta.style.background = faixa.cor;
      const texto = document.createElement('span');
      texto.textContent = faixa.rotulo;
      linha.append(tinta, texto);
      this.legenda.appendChild(linha);
    }
    this.corpo.appendChild(this.legenda);
    this.marcarRelacoes(null);

    pai.appendChild(this.raiz);
  }

  /**
   * Diz de quem é o ponto de vista agora. `null` desliga o modo e esconde a legenda.
   *
   * A tela não decide isto: quem sabe se há campanha e quem é o jogador é a aplicação.
   */
  marcarRelacoes(nomeDoSujeito: string | null): void {
    const ligado = nomeDoSujeito !== null;
    this.interruptorRelacoes.setAttribute('aria-pressed', String(ligado));
    this.interruptorRelacoes.textContent = ligado
      ? 'Relações: ligadas'
      : 'Relações: desligadas';
    this.sujeitoDasRelacoes.textContent = ligado
      ? `O mapa mostra o que os outros acham de ${nomeDoSujeito}. Clique numa terra para trocar.`
      : '';
    this.sujeitoDasRelacoes.hidden = !ligado;
    this.legenda.hidden = !ligado;
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
