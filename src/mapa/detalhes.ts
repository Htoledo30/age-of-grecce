/**
 * Camada de detalhe do mapa-múndi — o truque do Mount & Blade.
 *
 * De longe o mundo é uma pintura só, e basta. Conforme você aproxima, entram objetos:
 * árvores nas matas e um grão de chão por cima de tudo. Sem isso o
 * zoom só amplia o borrão da textura de fundo.
 *
 * As posições vêm prontas de `assets/mundo/detalhes.json`, geradas a partir do mapa de
 * biomas. Aqui só se desenha.
 */

import { Container, Graphics, Sprite, TilingSprite } from 'pixi.js';
import type { Renderer, Texture } from 'pixi.js';

import type { Ajustes } from '@/dados/esquema';

interface ArquivoDetalhes {
  versao: number;
  arvores: Array<[number, number]>;
}

type AjustesDetalhes = Ajustes['detalhes'];

export class Detalhes {
  readonly visual = new Container();

  private readonly chao: TilingSprite;

  private constructor(
    chao: TilingSprite,
    private readonly ajustes: AjustesDetalhes,
  ) {
    this.chao = chao;
  }

  static async criar(
    endereco: string,
    renderer: Renderer,
    larguraMundo: number,
    alturaMundo: number,
    ajustes: AjustesDetalhes,
  ): Promise<Detalhes> {
    const resposta = await fetch(endereco);
    if (!resposta.ok) throw new Error(`não foi possível carregar ${endereco}`);
    const arquivo = (await resposta.json()) as ArquivoDetalhes;

    const chao = new TilingSprite({
      texture: texturaChao(renderer),
      width: larguraMundo,
      height: alturaMundo,
    });
    chao.alpha = 0;

    const detalhes = new Detalhes(chao, ajustes);
    detalhes.visual.addChild(chao);

    const arvore = texturaArvore(renderer);
    detalhes.semear(arquivo.arvores, arvore, ajustes.alturaArvore);

    // a camada inteira só existe de perto
    detalhes.visual.visible = false;
    return detalhes;
  }

  private semear(pontos: Array<[number, number]>, textura: Texture, altura: number): void {
    const base = altura / textura.height;
    // variação determinística a partir da própria posição: nada de clone perfeito
    for (const [x, y] of pontos) {
      const semente = (x * 73_856_093) ^ (y * 19_349_663);
      const variacao = 0.78 + ((semente >>> 8) % 1000) / 1000 / 2;
      const espelhado = (semente & 1) === 1;
      const s = new Sprite(textura);
      s.anchor.set(0.5, 0.85); // o pé do objeto fica no ponto
      s.position.set(x, y);
      s.scale.set(base * variacao * (espelhado ? -1 : 1), base * variacao);
      this.visual.addChild(s);
    }
  }

  atualizar(zoom: number): void {
    const { zoomInicio, zoomCheio, graoInicio, graoFim, graoOpacidade } = this.ajustes;
    const bruto = (zoom - zoomInicio) / (zoomCheio - zoomInicio);
    const t = Math.min(1, Math.max(0, bruto));
    const suave = t * t * (3 - 2 * t);
    this.visual.alpha = suave;
    this.visual.visible = suave > 0.01;
    // o grão de chão entra depois dos objetos, quando o borrão já incomodaria
    // entra cedo e forte: o borrão da textura de fundo aparece bem antes do zoom máximo
    this.chao.alpha =
      Math.min(1, Math.max(0, (zoom - graoInicio) / (graoFim - graoInicio))) * graoOpacidade;
  }
}

/**
 * Copa em três lóbulos, com contorno de tinta e um lado iluminado — a mesma luz de
 * noroeste do sombreamento do terreno, senão o objeto não pertence ao mapa.
 */
function texturaArvore(renderer: Renderer): Texture {
  const g = new Graphics()
    .moveTo(0, 17)
    .lineTo(0, 4)
    .stroke({ color: 0x413828, width: 3.5 })
    .ellipse(-7, 0, 8, 8)
    .ellipse(7, -1, 7.5, 7.5)
    .ellipse(0, -8, 9.5, 9)
    .fill(0x516a44)
    .stroke({ color: 0x2f3a27, width: 2.5, join: 'round' })
    .ellipse(-4, -10, 5.5, 4.5)
    .fill({ color: 0x6d8a57, alpha: 0.9 });
  const t = renderer.generateTexture(g);
  g.destroy();
  return t;
}

/**
 * Grão de chão: traços curtos e pontos, sem forma reconhecível.
 *
 * A textura do terreno tem 4096px pra 8192 unidades de mundo, então no zoom fundo cada
 * pixel dela vira vários na tela e o chão fica liso e borrado. Este grão é o que devolve
 * matéria à superfície. Não representa nada — só impede o vazio.
 */
function texturaChao(renderer: Renderer): Texture {
  const g = new Graphics();
  const lado = 128;
  let estado = 20_260_818;
  const sorte = (): number => {
    estado = (estado * 1_664_525 + 1_013_904_223) >>> 0;
    return estado / 4_294_967_296;
  };
  // traços curtos em direções variadas: lê como capim/pedregulho sem virar padrão
  for (let i = 0; i < 90; i++) {
    const x = sorte() * lado;
    const y = sorte() * lado;
    const angulo = sorte() * Math.PI;
    const comprimento = 2 + sorte() * 5;
    g.moveTo(x, y)
      .lineTo(x + Math.cos(angulo) * comprimento, y + Math.sin(angulo) * comprimento)
      .stroke({
        color: sorte() > 0.45 ? 0x3a3227 : 0xf2ead4,
        width: 0.8 + sorte(),
        alpha: 0.55,
      });
  }
  for (let i = 0; i < 130; i++) {
    const x = sorte() * lado;
    const y = sorte() * lado;
    const r = 0.5 + sorte() * 1.3;
    g.circle(x, y, r).fill({ color: sorte() > 0.5 ? 0x3a3227 : 0xece1c8, alpha: 0.45 });
  }
  // um retângulo transparente fixa o quadro em 128x128, senão a textura sai do tamanho
  // do desenho e a repetição fica com emenda
  g.rect(0, 0, lado, lado).fill({ color: 0x000000, alpha: 0 });
  const t = renderer.generateTexture(g);
  g.destroy();
  return t;
}
