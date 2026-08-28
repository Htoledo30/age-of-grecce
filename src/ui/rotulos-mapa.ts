/**
 * O NOME DE CADA PROVÍNCIA escrito no mapa, dentro dela.
 *
 * Pedido de Henrique, junto com a queixa de que a ficha confundia três nomes: *"o nome de cada
 * província deve ser escrito diretamente no mapa dentro de cada província"*.
 *
 * ## O que os outros jogos fazem, e onde eles falham
 *
 * O **Age of History 2** tem um interruptor `ProvinceNames` e faz os nomes aparecerem conforme
 * o zoom; a queixa mais repetida dos jogadores dele é justamente *"nomes e bandeiras grandes
 * demais"*, e a resposta da comunidade é escolher uma escala de mapa menor — ou seja, o jogo
 * empurra o problema para o jogador. O **EU4** põe "Display province names" como opção no pé
 * do mapa e faz o mesmo aparecer-com-o-zoom; o ponto fraco conhecido dele é o CONTRASTE, e
 * existem mods populares que só engrossam a fonte dos nomes de província e país.
 *
 * As duas lições entraram: **é opção, e não obrigação**, e o texto precisa de contorno próprio
 * para sobreviver a um terreno que vai de verde a ocre a azul.
 *
 * ## A regra que resolve a poluição, e ela vem da cartografia
 *
 * ⚠️ **Rótulo de área só se desenha se COUBER dentro da área naquele zoom.** É a regra dos
 * renderizadores de mapa de verdade — no Mapbox, um rótulo que não cabe em nenhuma âncora
 * simplesmente não é desenhado —, e ela dá nível de detalhe **de graça**: o texto tem tamanho
 * fixo em pixels de tela, a província cresce com o zoom, e portanto zoom baixo mostra só as
 * grandes e zoom alto mostra todas. Nenhum limiar de zoom escrito à mão, nenhuma tabela de
 * "aparece a partir de tanto".
 *
 * E ela dispensa detector de colisão: se cada nome cabe dentro da própria província, e as
 * províncias não se sobrepõem, dois nomes não podem se cruzar.
 *
 * O espaço disponível vem do `rotulo.raio` assado — o raio do maior círculo que cabe na
 * província —, e o ponto vem do `rotulo`, que é o PÓLO DE INACESSIBILIDADE e não o centroide:
 * o centroide de 15 das 244 províncias cai fora dela. Ver `gerador/gerar-rotulos.ts`.
 */

import type { Camera } from '@/nucleo/camera';

/** Uma província como esta camada precisa vê-la. */
export interface RotuloDeProvincia {
  id: string;
  nome: string;
  /** O pólo de inacessibilidade, em unidades de mundo. */
  x: number;
  y: number;
  /** Raio do maior círculo inscrito, em unidades de mundo. É o espaço que o nome tem. */
  raio: number;
  /** É água. Muda só o desenho do nome — ver o itálico da hidrografia no CSS. */
  mar: boolean;
}

/**
 * Quanto do diâmetro o texto pode ocupar.
 *
 * Menor que 1 de propósito: um nome que encosta nas duas bordas da província cabe pela conta e
 * não cabe pelo olho. Sobra respiro dos dois lados.
 */
const FOLGA = 0.82;

export class RotulosMapa {
  private readonly raiz = document.createElement('div');
  private readonly elementos = new Map<string, HTMLElement>();
  /**
   * A largura de cada nome em pixels de palco, medida uma vez.
   *
   * ⚠️ Medir é caro — `offsetWidth` força o navegador a recalcular a página — e não pode
   * acontecer no laço de quadro. Como o corpo do texto é FIXO em pixels de tela, a largura
   * nunca muda: medir uma vez ao criar o rótulo é medir para sempre.
   */
  private readonly larguras = new Map<string, number>();
  private ligados = false;

  constructor(pai: HTMLElement) {
    this.raiz.className = 'rotulos-mapa';
    this.raiz.hidden = true;
    pai.appendChild(this.raiz);
  }

  /**
   * Liga ou desliga a camada inteira. Desligada, ela não custa quadro nenhum.
   *
   * ⚠️ **A medição acontece AQUI, e não ao montar.** Camada escondida é `display: none`, e um
   * elemento que não é desenhado tem `offsetWidth` zero — medir ali dava largura 0 para os 244
   * nomes, "não cabe" para todos, e um interruptor que acendia e não mostrava nada.
   */
  mostrar(ligados: boolean): void {
    this.ligados = ligados;
    this.raiz.hidden = !ligados;
    if (ligados) this.medir();
  }

  get visivel(): boolean {
    return this.ligados;
  }

  /** Monta os rótulos. Chamado uma vez, quando o mapa carrega. */
  desenhar(provincias: readonly RotuloDeProvincia[]): void {
    this.raiz.replaceChildren();
    this.elementos.clear();
    this.larguras.clear();
    for (const p of provincias) {
      if (p.raio <= 0) continue;
      const elemento = document.createElement('span');
      elemento.className = 'rotulos-mapa__nome';
      elemento.dataset['mar'] = p.mar ? 'sim' : 'nao';
      elemento.textContent = p.nome;
      this.raiz.appendChild(elemento);
      this.elementos.set(p.id, elemento);
    }
    this.provincias = provincias;
    if (this.ligados) this.medir();
  }

  private provincias: readonly RotuloDeProvincia[] = [];

  /**
   * A largura de cada nome, uma vez só.
   *
   * Uma passada depois de tudo no ar: ler `offsetWidth` dentro do laço que cria os elementos
   * faria o navegador recalcular a página 244 vezes seguidas.
   */
  private medir(): void {
    if (this.larguras.size === this.elementos.size && this.larguras.size > 0) return;
    for (const [id, elemento] of this.elementos) this.larguras.set(id, elemento.offsetWidth);
  }

  /**
   * Põe cada nome no lugar — e esconde o que não cabe.
   *
   * Chamado uma vez por quadro, como as outras camadas do mapa. Custa uma projeção e uma
   * comparação por província; quem não cabe sai da conta com uma escrita só.
   */
  posicionar(camera: Camera): void {
    if (!this.ligados) return;
    for (const p of this.provincias) {
      const elemento = this.elementos.get(p.id);
      if (!elemento) continue;
      // O diâmetro da província EM PIXELS DE PALCO. O texto não cresce com o zoom; a
      // província sim — e é essa diferença que faz o nível de detalhe acontecer sozinho.
      const cabe = p.raio * 2 * camera.zoom * FOLGA;
      const largura = this.larguras.get(p.id) ?? 0;
      if (largura === 0 || largura > cabe) {
        elemento.dataset['cabe'] = 'nao';
        continue;
      }
      const ponto = camera.mundoParaPalco(p.x, p.y);
      elemento.dataset['cabe'] = 'sim';
      // `translate` e nunca `transform`: é a mesma lição dos marcadores de hoste — um `scale`
      // independente multiplicaria o que estivesse em `transform` e jogaria a peça longe.
      elemento.style.translate = `calc(${ponto.x}px - 50%) calc(${ponto.y}px - 50%)`;
    }
  }
}
