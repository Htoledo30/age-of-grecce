/**
 * Tooltips do jogo: uma única camada visual para toda explicação sob demanda.
 *
 * `title` pertence ao navegador e traz uma janela do sistema operacional para dentro do
 * mapa. Além de não aceitar estilo, cada navegador escolhe atraso, fonte e posição. Aqui o
 * elemento declara somente conteúdo e tom; esta classe decide toda a apresentação.
 */

import { ALTURA_BASE, LARGURA_BASE, paraPalco } from '@/estilo/escala';

type TomDeTooltip = 'informacao' | 'custo' | 'perigo' | 'bloqueio';

export interface ConteudoDeTooltip {
  titulo: string;
  corpo?: string;
  tom?: TomDeTooltip;
}

/** Liga ou atualiza uma tooltip sem deixar `title` nativo escondido no elemento. */
export function definirTooltip(elemento: HTMLElement, conteudo: ConteudoDeTooltip): void {
  elemento.removeAttribute('title');
  elemento.dataset['tooltip'] = 'sim';
  elemento.dataset['tooltipTitulo'] = conteudo.titulo;
  elemento.dataset['tooltipCorpo'] = conteudo.corpo ?? '';
  elemento.dataset['tooltipTom'] = conteudo.tom ?? 'informacao';
}

/** Remove inclusive conteúdo antigo, para elementos reaproveitados entre redesenhos. */
export function removerTooltip(elemento: HTMLElement): void {
  elemento.removeAttribute('title');
  delete elemento.dataset['tooltip'];
  delete elemento.dataset['tooltipTitulo'];
  delete elemento.dataset['tooltipCorpo'];
  delete elemento.dataset['tooltipTom'];
}

export class Tooltips {
  private readonly raiz = document.createElement('div');
  private readonly titulo = document.createElement('p');
  private readonly corpo = document.createElement('p');
  private alvo: HTMLElement | null = null;
  private temporizador: number | undefined;
  private ponto = { x: 0, y: 0 };

  constructor(pai: HTMLElement) {
    this.raiz.className = 'tooltip-jogo';
    this.raiz.hidden = true;
    this.raiz.setAttribute('role', 'tooltip');
    this.titulo.className = 'tooltip-jogo__titulo';
    this.corpo.className = 'tooltip-jogo__corpo';
    this.raiz.append(this.titulo, this.corpo);
    pai.appendChild(this.raiz);

    document.addEventListener('pointerover', (evento) => this.aoEntrar(evento));
    document.addEventListener('pointermove', (evento) => this.aoMover(evento));
    document.addEventListener('pointerout', (evento) => this.aoSair(evento));
    document.addEventListener('focusin', (evento) => this.aoFocar(evento));
    document.addEventListener('focusout', (evento) => this.aoDesfocar(evento));
    document.addEventListener('pointerdown', () => this.esconder());
    window.addEventListener('keydown', (evento) => {
      if (evento.key === 'Escape') this.esconder();
    });
  }

  private aoEntrar(evento: PointerEvent): void {
    const alvo = comTooltip(evento.target);
    if (!alvo || alvo === this.alvo) return;
    this.ponto = paraPalco(evento.clientX, evento.clientY);
    this.preparar(alvo, 240);
  }

  private aoMover(evento: PointerEvent): void {
    if (!this.alvo) return;
    this.ponto = paraPalco(evento.clientX, evento.clientY);
    if (!this.raiz.hidden) this.posicionar();
  }

  private aoSair(evento: PointerEvent): void {
    if (!this.alvo) return;
    const relacionado = evento.relatedTarget;
    if (relacionado instanceof Node && this.alvo.contains(relacionado)) return;
    const novo = comTooltip(relacionado);
    if (novo === this.alvo) return;
    this.esconder();
  }

  private aoFocar(evento: FocusEvent): void {
    const alvo = comTooltip(evento.target);
    if (!alvo) return;
    const caixa = alvo.getBoundingClientRect();
    this.ponto = paraPalco(caixa.left + caixa.width / 2, caixa.bottom);
    this.preparar(alvo, 0);
  }

  private aoDesfocar(evento: FocusEvent): void {
    if (!this.alvo) return;
    const relacionado = evento.relatedTarget;
    if (relacionado instanceof Node && this.alvo.contains(relacionado)) return;
    this.esconder();
  }

  private preparar(alvo: HTMLElement, atraso: number): void {
    this.cancelarTemporizador();
    this.alvo = alvo;
    this.temporizador = window.setTimeout(() => this.mostrar(), atraso);
  }

  private mostrar(): void {
    const alvo = this.alvo;
    if (!alvo?.isConnected) return this.esconder();
    this.titulo.textContent = alvo.dataset['tooltipTitulo'] ?? '';
    this.corpo.textContent = alvo.dataset['tooltipCorpo'] ?? '';
    this.corpo.hidden = this.corpo.textContent.length === 0;
    this.raiz.dataset['tom'] = alvo.dataset['tooltipTom'] ?? 'informacao';
    this.raiz.hidden = false;
    this.posicionar();
  }

  private posicionar(): void {
    const margem = 16;
    const afastamento = 18;
    let x = this.ponto.x + afastamento;
    let y = this.ponto.y + afastamento;
    const largura = this.raiz.offsetWidth;
    const altura = this.raiz.offsetHeight;

    if (x + largura + margem > LARGURA_BASE) x = this.ponto.x - largura - afastamento;
    if (y + altura + margem > ALTURA_BASE) y = this.ponto.y - altura - afastamento;
    x = Math.max(margem, Math.min(x, LARGURA_BASE - largura - margem));
    y = Math.max(margem, Math.min(y, ALTURA_BASE - altura - margem));
    this.raiz.style.translate = `${Math.round(x)}px ${Math.round(y)}px`;
  }

  private esconder(): void {
    this.cancelarTemporizador();
    this.alvo = null;
    this.raiz.hidden = true;
  }

  private cancelarTemporizador(): void {
    if (this.temporizador !== undefined) window.clearTimeout(this.temporizador);
    this.temporizador = undefined;
  }
}

function comTooltip(alvo: EventTarget | null): HTMLElement | null {
  return alvo instanceof Element ? alvo.closest<HTMLElement>('[data-tooltip="sim"]') : null;
}
