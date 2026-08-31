/**
 * Rotas de marcha sobre o mapa.
 *
 * Destinos respondem "onde posso clicar"; esta camada responde "por onde a tropa vai".
 * Mantê-las separadas evita transformar os botões de destino em desenho, estado e
 * controle ao mesmo tempo. A camada é SVG, não recebe ponteiro e segue a câmera.
 */

import type { Camera } from '@/nucleo/camera';

const SVG = 'http://www.w3.org/2000/svg';

export interface PontoDeMarcha {
  x: number;
  y: number;
}

export interface PrevisaoDeMarcha {
  destino: string;
  pontos: readonly PontoDeMarcha[];
  hostil: boolean;
}

export interface OrdemNoMapa {
  origem: string;
  destino: string;
  pontos: readonly PontoDeMarcha[];
  homens: number;
  cor: string;
  minha: boolean;
  hostil: boolean;
}

interface LinhaDePrevisao {
  dados: PrevisaoDeMarcha;
  elemento: SVGPolylineElement;
}

interface LinhaDeOrdem {
  dados: OrdemNoMapa;
  elemento: SVGPolylineElement;
  seta: SVGPolygonElement;
  quantidade: SVGTextElement;
}

export class MarchasMapa {
  private readonly camada = document.createElementNS(SVG, 'svg');
  private readonly grupoPrevisoes = document.createElementNS(SVG, 'g');
  private readonly grupoOrdens = document.createElementNS(SVG, 'g');
  private readonly origem = document.createElementNS(SVG, 'circle');
  private previsoes: LinhaDePrevisao[] = [];
  private ordens: LinhaDeOrdem[] = [];
  private pontoDaOrigem: PontoDeMarcha | null = null;
  /**
   * A última câmera vista, para desenhar traço NOVO já no lugar.
   *
   * ⚠️ `mostrar` é chamado ao dar uma ordem e na virada do turno — fora do laço de quadro.
   * Sem isto, a ponta da seta (um `polygon` de pontos fixos, sem `transform`) e a
   * quantidade (um `text` sem `x`/`y`) são pintadas uma vez em (0,0), o canto superior
   * esquerdo do palco.
   */
  /** A última câmera já projetada, como texto. Vazia força a próxima passada. */
  private assinaturaDaCamera = '';
  private ultimaCamera: Camera | null = null;

  constructor(pai: HTMLElement) {
    this.camada.classList.add('marchas');
    this.camada.setAttribute('aria-hidden', 'true');
    this.origem.classList.add('marchas__origem');
    this.origem.setAttribute('r', '23');
    this.camada.append(this.grupoPrevisoes, this.grupoOrdens, this.origem);
    pai.appendChild(this.camada);
  }

  /** Redesenha os poucos traços da interação atual e das ordens ainda não resolvidas. */
  mostrar(
    origem: PontoDeMarcha | null,
    previsoes: readonly PrevisaoDeMarcha[],
    ordens: readonly OrdemNoMapa[],
  ): void {
    this.pontoDaOrigem = origem;
    if (origem === null) this.origem.setAttribute('hidden', '');
    else this.origem.removeAttribute('hidden');

    this.previsoes = previsoes.map((dados) => {
      const elemento = document.createElementNS(SVG, 'polyline');
      elemento.classList.add('marchas__previsao');
      elemento.dataset['destino'] = dados.destino;
      elemento.dataset['destacada'] = 'nao';
      elemento.dataset['hostil'] = dados.hostil ? 'sim' : 'nao';
      return { dados, elemento };
    });
    this.grupoPrevisoes.replaceChildren(...this.previsoes.map((p) => p.elemento));

    this.ordens = ordens.map((dados) => {
      const elemento = document.createElementNS(SVG, 'polyline');
      elemento.classList.add('marchas__ordem');
      elemento.dataset['origem'] = dados.origem;
      elemento.dataset['destino'] = dados.destino;
      elemento.dataset['minha'] = dados.minha ? 'sim' : 'nao';
      elemento.dataset['hostil'] = dados.hostil ? 'sim' : 'nao';
      elemento.style.setProperty('--cor-da-marcha', dados.cor);

      const seta = document.createElementNS(SVG, 'polygon');
      seta.classList.add('marchas__seta');
      seta.dataset['minha'] = dados.minha ? 'sim' : 'nao';
      seta.dataset['hostil'] = dados.hostil ? 'sim' : 'nao';
      seta.setAttribute('points', '-2,-7 14,0 -2,7 2,0');
      seta.style.setProperty('--cor-da-marcha', dados.cor);

      const quantidade = document.createElementNS(SVG, 'text');
      quantidade.classList.add('marchas__quantidade');
      quantidade.dataset['minha'] = dados.minha ? 'sim' : 'nao';
      quantidade.dataset['hostil'] = dados.hostil ? 'sim' : 'nao';
      quantidade.textContent = dados.homens.toLocaleString('pt-BR');
      quantidade.style.setProperty('--cor-da-marcha', dados.cor);
      return { dados, elemento, seta, quantidade };
    });
    this.grupoOrdens.replaceChildren(
      ...this.ordens.flatMap((o) => [o.elemento, o.seta, o.quantidade]),
    );

    // Nada de traço sem coordenada chegar à tela: ou já sai posicionado, ou fica invisível
    // até o primeiro `posicionar`.
    // O conteúdo mudou: a assinatura da câmera não vale mais como "nada a fazer".
    this.assinaturaDaCamera = '';
    if (this.ultimaCamera) this.posicionar(this.ultimaCamera);
    else this.camada.dataset['posicionada'] = 'nao';
  }

  /** A rota sob o destino apontado ganha peso; as demais continuam como contexto. */
  destacar(idDestino: string | null): void {
    for (const previsao of this.previsoes) {
      previsao.elemento.dataset['destacada'] = previsao.dados.destino === idDestino ? 'sim' : 'nao';
    }
  }

  /** Reprojeta linhas, origem e rótulos quando a câmera anda ou dá zoom. */
  posicionar(camera: Camera): void {
    // ⚠️ **Câmera parada não se reprojeta, e é o conserto do travamento do Porto.**
    // `posicionar` roda a CADA QUADRO, sessenta vezes por segundo. Sem Porto uma hoste alcança
    // quatro destinos e ninguém sente; com Porto o mar abre e ela alcança 199 — e este laço
    // passava a reescrever centenas de atributos de SVG por quadro, com a câmera parada, sem
    // nada mudar na tela. Henrique, jogando: *"quando eu faço o porto, e movo uma unidade, laga
    // todo o jogo"*. Quem muda o conteúdo zera a assinatura e força a próxima passada.
    const assinatura = `${camera.x},${camera.y},${camera.zoom}`;
    if (assinatura === this.assinaturaDaCamera) return;
    this.assinaturaDaCamera = assinatura;
    this.ultimaCamera = camera;
    this.camada.dataset['posicionada'] = 'sim';
    if (this.pontoDaOrigem) {
      const origem = camera.mundoParaPalco(this.pontoDaOrigem.x, this.pontoDaOrigem.y);
      this.origem.setAttribute('cx', String(origem.x));
      this.origem.setAttribute('cy', String(origem.y));
    }

    for (const previsao of this.previsoes) {
      previsao.elemento.setAttribute('points', pontosNaTela(previsao.dados.pontos, camera));
    }

    for (const ordem of this.ordens) {
      ordem.elemento.setAttribute('points', pontosNaTela(ordem.dados.pontos, camera));
      const ultimo = ordem.dados.pontos.at(-1);
      const penultimo = ordem.dados.pontos.at(-2);
      if (!ultimo || !penultimo) continue;
      const destino = camera.mundoParaPalco(ultimo.x, ultimo.y);
      const anterior = camera.mundoParaPalco(penultimo.x, penultimo.y);
      const angulo = (Math.atan2(destino.y - anterior.y, destino.x - anterior.x) * 180) / Math.PI;
      ordem.seta.setAttribute(
        'transform',
        `translate(${destino.x} ${destino.y}) rotate(${angulo})`,
      );
      ordem.quantidade.setAttribute('x', String(destino.x + 18));
      ordem.quantidade.setAttribute('y', String(destino.y - 16));
    }
  }
}

function pontosNaTela(pontos: readonly PontoDeMarcha[], camera: Camera): string {
  return pontos
    .map((ponto) => camera.mundoParaPalco(ponto.x, ponto.y))
    .map((ponto) => `${ponto.x},${ponto.y}`)
    .join(' ');
}
