/** Teclado e mouse, com detecção de borda (apertou neste quadro / soltou neste quadro).
 *  Toda coordenada de mouse já sai convertida pro palco 1920x1080. */

import { paraPalco } from '@/estilo/escala';

export interface EstadoMouse {
  x: number;
  y: number;
  /** Deslocamento desde o quadro anterior, em unidades do palco. */
  dx: number;
  dy: number;
  roda: number;
}

export class Entrada {
  private readonly pressionadas = new Set<string>();
  private readonly apertadasAgora = new Set<string>();
  private readonly soltasAgora = new Set<string>();
  private readonly botoes = new Set<number>();
  private readonly botoesAgora = new Set<number>();
  private readonly botoesSoltosAgora = new Set<number>();

  private x = 0;
  private y = 0;
  private xAnterior = 0;
  private yAnterior = 0;
  private roda = 0;

  private readonly desligar: Array<() => void> = [];

  constructor(alvo: HTMLElement) {
    this.ligar(window, 'keydown', (e) => {
      const ev = e as KeyboardEvent;
      if (ev.repeat) return;
      this.pressionadas.add(ev.code);
      this.apertadasAgora.add(ev.code);
    });
    this.ligar(window, 'keyup', (e) => {
      const ev = e as KeyboardEvent;
      this.pressionadas.delete(ev.code);
      this.soltasAgora.add(ev.code);
    });
    this.ligar(window, 'blur', () => {
      this.pressionadas.clear();
      this.botoes.clear();
    });
    this.ligar(alvo, 'pointermove', (e) => {
      const ev = e as PointerEvent;
      const p = paraPalco(ev.clientX, ev.clientY);
      this.x = p.x;
      this.y = p.y;
    });
    this.ligar(alvo, 'pointerdown', (e) => {
      const ev = e as PointerEvent;
      this.botoes.add(ev.button);
      this.botoesAgora.add(ev.button);
    });
    this.ligar(window, 'pointerup', (e) => {
      const botao = (e as PointerEvent).button;
      // Só conta como soltura se o APERTO tiver acontecido aqui dentro.
      //
      // O aperto é escutado no alvo (o canvas) e a soltura na janela — a soltura precisa
      // ser na janela pra não se perder quando o jogador arrasta o mapa e solta fora
      // dela. O efeito colateral é que um clique em QUALQUER painel produzia uma soltura
      // sem aperto, e a cena lia isso como clique no mapa: apertar "Investir" selecionava
      // a província que estivesse debaixo do botão, ou limpava a seleção se ali fosse mar.
      //
      // `Set.delete` devolve se o item existia, então a guarda e a limpeza são a mesma
      // linha.
      if (!this.botoes.delete(botao)) return;
      this.botoesSoltosAgora.add(botao);
    });
    this.ligar(alvo, 'wheel', (e) => {
      e.preventDefault();
      this.roda += (e as WheelEvent).deltaY;
    });
    this.ligar(alvo, 'contextmenu', (e) => e.preventDefault());
  }

  private ligar(alvo: EventTarget, tipo: string, mao: (e: Event) => void): void {
    const opcoes = tipo === 'wheel' ? { passive: false } : undefined;
    alvo.addEventListener(tipo, mao, opcoes);
    this.desligar.push(() => alvo.removeEventListener(tipo, mao));
  }

  /** Chamar uma vez por quadro, DEPOIS de ler o estado. */
  novoQuadro(): void {
    this.apertadasAgora.clear();
    this.soltasAgora.clear();
    this.botoesAgora.clear();
    this.botoesSoltosAgora.clear();
    this.xAnterior = this.x;
    this.yAnterior = this.y;
    this.roda = 0;
  }

  segurando(codigo: string): boolean {
    return this.pressionadas.has(codigo);
  }

  apertou(codigo: string): boolean {
    return this.apertadasAgora.has(codigo);
  }

  soltou(codigo: string): boolean {
    return this.soltasAgora.has(codigo);
  }

  botaoSegurando(botao = 0): boolean {
    return this.botoes.has(botao);
  }

  botaoApertou(botao = 0): boolean {
    return this.botoesAgora.has(botao);
  }

  /** Soltou neste quadro. É o que separa clique de arrasto: quem arrasta o mapa também
   *  aperta o botão esquerdo, e só na soltura dá pra saber se o ponteiro andou. */
  botaoSoltou(botao = 0): boolean {
    return this.botoesSoltosAgora.has(botao);
  }

  mouse(): EstadoMouse {
    return {
      x: this.x,
      y: this.y,
      dx: this.x - this.xAnterior,
      dy: this.y - this.yAnterior,
      roda: this.roda,
    };
  }

  destruir(): void {
    for (const f of this.desligar) f();
    this.desligar.length = 0;
  }
}
