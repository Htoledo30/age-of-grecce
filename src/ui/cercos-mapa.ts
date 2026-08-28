/**
 * A bandeira de cerco: a fogueira do acampamento sobre a cidade sitiada.
 *
 * Camada própria, e não um enfeite no marcador da hoste, porque as duas coisas estão em
 * lugares diferentes: **o sitiante é desenhado na divisa** — ele está do lado de fora dos
 * muros — e a bandeira tem que estar sobre a CIDADE, que é quem está sendo apertada. Um
 * enfeite preso à peça do sitiante marcaria o acampamento, não a praça.
 *
 * ⚠️ **Não intercepta clique.** A bandeira cai justo no centro da província, que é onde o
 * jogador clica para selecioná-la; roubar o evento ali abriria um buraco morto em cima da
 * cidade mais interessante do mapa. Quem conta a história com todas as letras é a ficha da
 * província (a linha de alarme "Sitiada por Atenas"); aqui é só o sinal que se vê de
 * longe, sem precisar clicar em nada.
 *
 * ⚠️ **`#ui > .cercos`, nunca `.cercos`.** `base.css` tem `#ui > * { pointer-events: auto }`
 * e id vence classe: escrita só com a classe, esta camada — que cobre o palco inteiro —
 * comeria todos os cliques do mapa. É a mesma armadilha que já pegou `.hostes`, `.destinos`
 * e a barra de turno.
 */

import type { Camera } from '@/nucleo/camera';
import type { Postura } from '@/combate/cerco';
import { iconeGrego } from './icones-gregos';

/** Uma cidade sob cerco, como o mapa precisa vê-la. */
export interface MarcaDeCerco {
  /** A província SITIADA. É a chave: `estado.cercos` é indexado por ela. */
  provincia: string;
  /** Centro da província sitiada, em unidades de mundo. A bandeira é da cidade. */
  x: number;
  y: number;
  /** Sentar ou ir para cima. Muda a cara da marca, não o lugar dela. */
  postura: Postura;
}

export class CercosMapa {
  private readonly camada = document.createElement('div');
  private readonly marcas = new Map<string, HTMLElement>();
  private atuais: readonly MarcaDeCerco[] = [];
  /** Ver `HostesMapa.ultimaCamera`: marca nova tem que nascer já no lugar. */
  private ultimaCamera: Camera | null = null;

  constructor(pai: HTMLElement) {
    this.camada.className = 'cercos';
    // Decoração pura: nada aqui recebe foco nem é lido por leitor de tela, porque a mesma
    // informação já está escrita na ficha da província.
    this.camada.setAttribute('aria-hidden', 'true');
    pai.appendChild(this.camada);
  }

  /** Lista vazia apaga a camada — é o estado normal, num mundo sem cerco nenhum. */
  mostrar(cercos: readonly MarcaDeCerco[]): void {
    this.atuais = cercos;
    const vivos = new Set(cercos.map((c) => c.provincia));

    for (const [id, elemento] of this.marcas) {
      if (vivos.has(id)) continue;
      elemento.remove();
      this.marcas.delete(id);
    }

    for (const cerco of cercos) {
      let elemento = this.marcas.get(cerco.provincia);
      if (!elemento) {
        elemento = document.createElement('div');
        elemento.className = 'cercos__marca';
        elemento.dataset['provincia'] = cerco.provincia;
        elemento.appendChild(iconeGrego('fogo', 'cercos__chama'));
        // Nasce escondida e só aparece com posição: sem isto ela pisca no canto do palco
        // antes do primeiro `posicionar`, exatamente como já acontecia com as hostes.
        elemento.dataset['posicionada'] = 'nao';
        this.camada.appendChild(elemento);
        this.marcas.set(cerco.provincia, elemento);
      }
      if (this.ultimaCamera) this.assentar(elemento, this.ultimaCamera, cerco);
      elemento.dataset['postura'] = cerco.postura;
    }
  }

  /** Põe cada bandeira sobre a cidade dela. Chamado uma vez por quadro. */
  posicionar(camera: Camera): void {
    this.ultimaCamera = camera;
    for (const cerco of this.atuais) {
      const elemento = this.marcas.get(cerco.provincia);
      if (!elemento) continue;
      this.assentar(elemento, camera, cerco);
    }
  }

  /** O único lugar que escreve posição. */
  private assentar(elemento: HTMLElement, camera: Camera, cerco: MarcaDeCerco): void {
    const p = camera.mundoParaPalco(cerco.x, cerco.y);
    // `translate`, nunca `transform`: a chama pulsa em `scale`, e a matriz
    // `translate · rotate · scale · transform` faria o `scale` multiplicar a posição.
    //
    // `- 100%` em Y, e não `- 50%`: a bandeira fica ACIMA do centro, deixando o centro
    // livre para o marcador da hoste do defensor, que também está ali.
    elemento.style.translate = `calc(${p.x}px - 50%) calc(${p.y}px - 118%)`;
    elemento.dataset['posicionada'] = 'sim';
  }
}
