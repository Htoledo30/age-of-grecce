/**
 * O tabuleiro: o mapa da Grécia antiga recortado em províncias.
 *
 * Três camadas empilhadas dentro de `this.mundo`, nesta ordem: terreno assado,
 * camada política (dono e fronteira) e os detalhes de paisagem. A câmera é de
 * estratégia e não segue ninguém — num jogo de província quem olha o mapa é o jogador.
 *
 * O que vier por cima — cidade, exército, seleção — entra como camada nova aqui,
 * sem mexer nesta base.
 */

import { Application, Assets, Container, Sprite } from 'pixi.js';
import type { Texture } from 'pixi.js';

import { Camera } from '@/nucleo/camera';
import type { Entrada } from '@/nucleo/entrada';
import type { Relogio } from '@/nucleo/tempo';
import { alturaDoPalco, larguraDoPalco, aoMudarEscala, densidadeEfetiva } from '@/estilo/escala';
import type { Ajustes, Mundo, Provincias } from '@/dados/esquema';
import { GraoDoMapa } from './grao-do-mapa';
import { ProvinciasMapa } from './provincias-mapa/provincias-mapa';

/** Quanto o ponteiro pode andar entre apertar e soltar e a coisa ainda ser um clique. */
const FOLGA_DO_CLIQUE = 5;

export class CenaMapa {
  readonly camera = new Camera();

  private readonly app = new Application();
  private readonly mundo = new Container();
  private grao!: GraoDoMapa;
  private camadaProvincias!: ProvinciasMapa;

  /**
   * Quanto o ponteiro andou desde que o botão esquerdo desceu, em pixels do palco.
   *
   * O mesmo botão arrasta o mapa e seleciona província, então o que separa os dois é
   * isto: se andou pouco, foi clique; se andou, foi arrasto. Selecionar no APERTO seria
   * mais simples e estaria errado — todo arrasto começa com um aperto.
   */
  private percursoDoBotao = 0;

  /**
   * Avisa a interface que a província selecionada mudou, pelo ÍNDICE dela.
   *
   * Índice e não ficha montada: quem sabe o nome e a região é o atlas, quem sabe o dono
   * de hoje é a campanha, e esta camada não é nenhum dos dois.
   */
  aoSelecionar: (indice: number | null) => void = () => {};

  /**
   * Qual província está sob o ponteiro AGORA. Só dispara quando ela muda.
   *
   * ⚠️ **Nasceu para substituir o `pointerenter` dos 199 botões de destino.** Enquanto os
   * destinos eram botões do DOM, o mapa não precisava saber onde o ponteiro estava: cada
   * botão avisava por conta própria. Sem eles, quem responde *"para onde ele está olhando"* é
   * a cena — e a resposta é a mesma leitura de textura de índice que o clique já fazia, um
   * acesso a vetor em memória (`provincias-mapa.ts:244-250`). Custa nada, e só é lida quando
   * alguém está de fato escolhendo destino.
   */
  aoApontar: (indice: number | null) => void = () => {};

  /**
   * Ligado só enquanto o jogador escolhe destino.
   *
   * Fora disso ninguém quer saber do ponteiro, e resolver a província a cada quadro seria
   * trabalho para ninguém — a mesma disciplina das camadas que comparam a câmera antes de
   * reprojetar.
   */
  seguirOPonteiro = false;
  private ultimoApontado: number | null = null;

  private constructor(
    private readonly dados: Mundo,
    private readonly ajustes: Ajustes,
    private readonly provincias: Provincias,
  ) {}

  static async criar(
    canvas: HTMLCanvasElement,
    dados: Mundo,
    ajustes: Ajustes,
    provincias: Provincias,
  ): Promise<CenaMapa> {
    const cena = new CenaMapa(dados, ajustes, provincias);
    await cena.montar(canvas);
    return cena;
  }

  private async montar(canvas: HTMLCanvasElement): Promise<void> {
    await this.app.init({
      canvas,
      width: larguraDoPalco(),
      height: alturaDoPalco(),
      // a mesma cor do mar fundo do terreno: a sobra dos lados vira mar aberto, não moldura
      backgroundColor: 0x586f70,
      antialias: true,
      autoDensity: false, // o CSS do palco já cuida do tamanho na tela
      resolution: densidadeEfetiva(),
    });
    // usamos o nosso laço em tempo.ts, não o ticker do Pixi
    this.app.ticker.stop();
    this.app.stage.addChild(this.mundo);

    aoMudarEscala(() => {
      this.app.renderer.resolution = densidadeEfetiva();
      this.app.renderer.resize(larguraDoPalco(), alturaDoPalco());
    });

    const { largura, altura } = this.dados.dimensoes;

    const texturaMapa = await Assets.load<Texture>(
      new URL('mundo/terreno.png', document.baseURI).href,
    );
    const terreno = new Sprite(texturaMapa);
    terreno.width = largura;
    terreno.height = altura;
    this.mundo.addChild(terreno);

    // A camada política entra ENTRE o terreno e o grão: o grão continua por
    // cima do preenchimento, senão a cor do dono achata a paisagem inteira.
    this.camadaProvincias = await ProvinciasMapa.criar(
      new URL('mundo/provincias.png', document.baseURI).href,
      this.provincias,
      largura,
      altura,
      this.ajustes.provincias,
    );
    this.mundo.addChild(this.camadaProvincias.visual);

    this.grao = GraoDoMapa.criar(
      this.app.renderer,
      largura,
      altura,
      this.ajustes.detalhes,
    );
    this.mundo.addChild(this.grao.visual);

    // O mapa abre inteiro na tela: a primeira coisa que o jogador vê é a Grécia toda,
    // e é dela que ele escolhe onde entrar.
    this.camera.zoomMaximo = this.ajustes.camera.zoomMaximo;
    this.camera.prenderAoMundo(largura, altura);
    this.camera.x = largura / 2;
    this.camera.y = altura / 2;
    this.camera.mover(0, 0);
  }

  /**
   * Repinta o mapa político a partir de quem manda em cada província agora.
   *
   * O envio pra GPU não acontece aqui: `escreverNaPaleta` só marca a paleta como suja, e
   * `atualizar` drena isso uma vez por quadro. Vinte conquistas numa virada de turno
   * viram um envio, não vinte.
   */
  /** Ensina à paleta os poderes de agora — inclusive os que nasceram de uma independência. */
  aprenderPoderes(poderes: readonly { id: string; cor: string }[]): void {
    this.camadaProvincias.aprenderPoderes(poderes);
  }

  pintarDonos(donoDe: (idProvincia: string) => string): void {
    this.camadaProvincias.pintarDonos(donoDe);
    this.camadaProvincias.intensificar(false);
  }

  /** Liga e desliga a cor dos reinos. O recorte das províncias continua desenhado. */
  /** Repinta com uma cor por província: é o modo de mapa. Ver `provincias-mapa.ts`. */
  pintarCores(corDe: (idProvincia: string) => readonly [number, number, number] | null): void {
    this.camadaProvincias.pintarCores(corDe);
    this.camadaProvincias.intensificar(true);
  }

  mostrarCoresDosPoderes(ligadas: boolean): void {
    this.camadaProvincias.mostrarCores(ligadas);
  }

  get coresDosPoderes(): boolean {
    return this.camadaProvincias.cores;
  }

  /** Só pra calibrar a linha de fronteira olhando, sem recarregar. Ver ProvinciasMapa. */
  calibrarFronteira(largura?: number, forca?: number, cor?: string): void {
    this.camadaProvincias.calibrarFronteira(largura, forca, cor);
  }

  /**
   * Um ponto garantidamente dentro desta província, para mirar a câmera e clicar.
   *
   * Só a inspeção de desenvolvimento chama. Ver `ProvinciasMapa.pontoDentroDe`: o centro
   * guardado nos dados pode cair fora do próprio polígono, e um teste que mira ali clica na
   * província vizinha sem avisar.
   */
  pontoDentroDe(indice: number, xCentro: number, yCentro: number): { x: number; y: number } | null {
    return this.camadaProvincias.pontoDentroDe(indice, xCentro, yCentro);
  }

  /** Usado pelas ferramentas de captura, pra inspecionar um ponto do mundo. */
  posicionar(x: number, y: number, zoom: number): void {
    this.camera.zoom = Math.min(this.camera.zoomMaximo, Math.max(0.05, zoom));
    this.camera.x = x;
    this.camera.y = y;
    this.camera.mover(0, 0);
  }

  atualizar(relogio: Relogio, entrada: Entrada): void {
    const m = entrada.mouse();

    // Arrastar com o botão esquerdo é a convenção do gênero: o mapa é uma folha na mesa
    // e a mão a empurra. O botão do meio faz o mesmo, pra quem já tem o dedo lá.
    if ((entrada.botaoSegurando(0) || entrada.botaoSegurando(1)) && (m.dx !== 0 || m.dy !== 0)) {
      this.camera.arrastar(m.dx, m.dy);
    }

    // ⚠️ **A província sob o ponteiro, e só quando alguém está escolhendo destino.** É esta
    // leitura que faz a rota aparecer sob o cursor sem existir um botão por província. Ela
    // dispara só na TROCA: entrar e sair da mesma terra não repinta nada.
    if (this.seguirOPonteiro) {
      const sob = this.camera.palcoParaMundo(m.x, m.y);
      const apontado = this.camadaProvincias.provinciaEm(sob.x, sob.y);
      if (apontado !== this.ultimoApontado) {
        this.ultimoApontado = apontado;
        this.aoApontar(apontado);
      }
    } else if (this.ultimoApontado !== null) {
      this.ultimoApontado = null;
    }

    if (entrada.botaoApertou(0)) this.percursoDoBotao = 0;
    if (entrada.botaoSegurando(0)) this.percursoDoBotao += Math.abs(m.dx) + Math.abs(m.dy);
    if (entrada.botaoSoltou(0) && this.percursoDoBotao <= FOLGA_DO_CLIQUE) {
      const alvo = this.camera.palcoParaMundo(m.x, m.y);
      const indice = this.camadaProvincias.provinciaEm(alvo.x, alvo.y);
      this.camadaProvincias.selecionar(indice);
      this.aoSelecionar(indice);
    }

    const horizontal =
      (entrada.segurando('KeyD') || entrada.segurando('ArrowRight') ? 1 : 0) -
      (entrada.segurando('KeyA') || entrada.segurando('ArrowLeft') ? 1 : 0);
    const vertical =
      (entrada.segurando('KeyS') || entrada.segurando('ArrowDown') ? 1 : 0) -
      (entrada.segurando('KeyW') || entrada.segurando('ArrowUp') ? 1 : 0);
    if (horizontal !== 0 || vertical !== 0) {
      const diagonal = horizontal !== 0 && vertical !== 0 ? Math.SQRT1_2 : 1;
      const passo =
        (this.ajustes.camera.velocidadeLivre * relogio.delta * diagonal) / this.camera.zoom;
      this.camera.mover(horizontal * passo, vertical * passo);
    }

    if (m.roda !== 0) {
      const passo = this.ajustes.camera.passoDaRoda;
      this.camera.aproximar(m.roda < 0 ? passo : 1 / passo, m.x, m.y);
    }

    // A paleta é drenada uma vez por quadro, depois de tudo que pôde sujá-la.
    this.camadaProvincias.aplicarPaleta();
    this.camadaProvincias.avancar(relogio.delta);
    this.grao.atualizar(this.camera.zoom);

    const centro = this.camera.mundoParaPalco(0, 0);
    this.mundo.position.set(centro.x, centro.y);
    this.mundo.scale.set(this.camera.zoom);

    this.app.render();
  }

  destruir(): void {
    this.app.destroy(false, { children: true, texture: true });
  }
}
