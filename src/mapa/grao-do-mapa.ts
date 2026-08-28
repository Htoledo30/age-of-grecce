/**
 * O GRÃO DO CHÃO: a textura fina que entra quando o zoom aproxima.
 *
 * A textura de fundo do mundo tem 6.144 px para 12.288 unidades — meio texel por unidade.
 * Passando de certo zoom ela deixa de ter detalhe para dar e vira borrão; um grão sutil por
 * cima devolve superfície ao terreno sem inventar objeto nenhum.
 *
 * ⚠️ **Aqui moravam ÁRVORES, e elas foram embora a pedido de Henrique** — *"destrói essas
 * árvores aí pelo amor de deus"*. Eram sprites espalhados nas matas a partir do mapa de
 * biomas, o truque do Mount & Blade de acender objetos ao aproximar. Num mapa político em que
 * a cor do reino é a informação, elas competiam com o que importa: o zoom novo mostrava
 * floresta em vez de fronteira. O grão fica porque ele não desenha coisa nenhuma — só impede
 * a textura de virar mancha lisa.
 */

import { Container, Graphics, TilingSprite } from 'pixi.js';
import type { Renderer, Texture } from 'pixi.js';

import type { Ajustes } from '@/dados/esquema';

type AjustesDetalhes = Ajustes['detalhes'];

export class GraoDoMapa {
  readonly visual = new Container();

  private constructor(
    private readonly chao: TilingSprite,
    private readonly ajustes: AjustesDetalhes,
  ) {}

  static criar(
    renderer: Renderer,
    larguraMundo: number,
    alturaMundo: number,
    ajustes: AjustesDetalhes,
  ): GraoDoMapa {
    const chao = new TilingSprite({
      texture: texturaChao(renderer),
      width: larguraMundo,
      height: alturaMundo,
    });
    chao.alpha = 0;
    const grao = new GraoDoMapa(chao, ajustes);
    grao.visual.addChild(chao);
    grao.visual.visible = false;
    return grao;
  }

  /** O grão entra cedo: o borrão da textura de fundo aparece bem antes do zoom máximo. */
  atualizar(zoom: number): void {
    const { graoInicio, graoFim, graoOpacidade } = this.ajustes;
    const t = Math.min(1, Math.max(0, (zoom - graoInicio) / (graoFim - graoInicio)));
    this.chao.alpha = t * graoOpacidade;
    this.visual.visible = this.chao.alpha > 0.005;
  }
}

/**
 * Grão de chão: traços curtos e pontos, sem forma reconhecível.
 *
 * A textura do terreno tem 6.144 px para 12.288 unidades de mundo, então no zoom fundo cada
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
