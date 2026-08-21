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
import { ALTURA_BASE, LARGURA_BASE, aoMudarEscala, densidadeEfetiva } from '@/estilo/escala';
import type { Ajustes, Mundo, Provincias } from '@/dados/esquema';
import { Detalhes } from './detalhes';
import { ProvinciasMapa } from './provincias-mapa';
import type { InfoProvincia } from './provincias-mapa';

/** Quanto o ponteiro pode andar entre apertar e soltar e a coisa ainda ser um clique. */
const FOLGA_DO_CLIQUE = 5;

export class CenaMapa {
  readonly camera = new Camera();

  private readonly app = new Application();
  private readonly mundo = new Container();
  private detalhes!: Detalhes;
  private camadaProvincias!: ProvinciasMapa;

  /**
   * Quanto o ponteiro andou desde que o botão esquerdo desceu, em pixels do palco.
   *
   * O mesmo botão arrasta o mapa e seleciona província, então o que separa os dois é
   * isto: se andou pouco, foi clique; se andou, foi arrasto. Selecionar no APERTO seria
   * mais simples e estaria errado — todo arrasto começa com um aperto.
   */
  private percursoDoBotao = 0;

  /** Avisa a interface que a província selecionada mudou. */
  aoSelecionar: (provincia: InfoProvincia | null) => void = () => {};

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
      width: LARGURA_BASE,
      height: ALTURA_BASE,
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
      this.app.renderer.resize(LARGURA_BASE, ALTURA_BASE);
    });

    const { largura, altura } = this.dados.dimensoes;

    const texturaMapa = await Assets.load<Texture>(
      new URL('mundo/terreno.png', document.baseURI).href,
    );
    const terreno = new Sprite(texturaMapa);
    terreno.width = largura;
    terreno.height = altura;
    this.mundo.addChild(terreno);

    // A camada política entra ENTRE o terreno e os detalhes: as árvores continuam por
    // cima do preenchimento, senão a cor do dono achata a paisagem inteira.
    this.camadaProvincias = await ProvinciasMapa.criar(
      new URL('mundo/provincias.png', document.baseURI).href,
      this.provincias,
      largura,
      altura,
      this.ajustes.provincias,
    );
    this.mundo.addChild(this.camadaProvincias.visual);

    this.detalhes = await Detalhes.criar(
      new URL('mundo/detalhes.json', document.baseURI).href,
      this.app.renderer,
      largura,
      altura,
      this.ajustes.detalhes,
    );
    this.mundo.addChild(this.detalhes.visual);

    // O mapa abre inteiro na tela: a primeira coisa que o jogador vê é a Grécia toda,
    // e é dela que ele escolhe onde entrar.
    this.camera.zoomMaximo = this.ajustes.camera.zoomMaximo;
    this.camera.prenderAoMundo(largura, altura);
    this.camera.x = largura / 2;
    this.camera.y = altura / 2;
    this.camera.mover(0, 0);
  }

  /** Liga e desliga a cor dos reinos. O recorte das províncias continua desenhado. */
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

    if (entrada.botaoApertou(0)) this.percursoDoBotao = 0;
    if (entrada.botaoSegurando(0)) this.percursoDoBotao += Math.abs(m.dx) + Math.abs(m.dy);
    if (entrada.botaoSoltou(0) && this.percursoDoBotao <= FOLGA_DO_CLIQUE) {
      const alvo = this.camera.palcoParaMundo(m.x, m.y);
      const provincia = this.camadaProvincias.provinciaEm(alvo.x, alvo.y);
      this.camadaProvincias.selecionar(provincia);
      this.aoSelecionar(provincia);
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

    this.detalhes.atualizar(this.camera.zoom);

    const centro = this.camera.mundoParaPalco(0, 0);
    this.mundo.position.set(centro.x, centro.y);
    this.mundo.scale.set(this.camera.zoom);

    this.app.render();
  }

  destruir(): void {
    this.app.destroy(false, { children: true, texture: true });
  }
}
