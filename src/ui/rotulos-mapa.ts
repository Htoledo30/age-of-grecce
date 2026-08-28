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
 * ⚠️ **O nome ENCOLHE até caber, e nunca some.** A primeira versão seguia a regra dos
 * renderizadores de mapa de verdade — rótulo que não cabe na área não é desenhado —, e ela
 * está certa para um atlas e errada para este jogo. Henrique jogando: *"muitos nomes não
 * aparecem (...) tem que aparecer de todas as zonas"*. Num mapa impresso o nome é enfeite; num
 * jogo de estratégia ele é como se sabe onde se está, e uma província muda é uma província que
 * o jogador precisa clicar para identificar.
 *
 * O que sobrou da regra é a boa metade: o espaço disponível continua mandando no TAMANHO. O
 * texto tem corpo fixo em pixels de tela e a província cresce com o zoom, então o nome de uma
 * terra grande fica no corpo cheio e o de uma pequena encolhe até o piso. Nível de detalhe sem
 * limiar de zoom escrito à mão, e sem esconder nada.
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

/**
 * O menor corpo em que um nome ainda se lê, em pixels de palco.
 *
 * ⚠️ **É o piso que substituiu o "some quando não cabe".** A primeira versão seguia a regra
 * dos renderizadores de mapa — rótulo que não cabe na área não se desenha — e Henrique
 * jogando: *"muitos nomes não aparecem (...) tem que aparecer de todas as zonas"*. Ele está
 * certo sobre o jogo dele: aqui o nome não é enfeite cartográfico, é como se sabe onde se
 * está. Então o nome ENCOLHE em vez de sumir, e para de encolher aqui.
 */
const CORPO_MINIMO = 8;

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
  /** O corpo que o CSS deu a cada nome. Terra e água têm faces e tamanhos diferentes. */
  private readonly corpos = new Map<string, number>();
  /** O último corpo escrito, em pixel inteiro: escrever igual de novo custaria refluxo à toa. */
  private readonly corpoAtual = new Map<string, number>();
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
    for (const [id, elemento] of this.elementos) {
      this.larguras.set(id, elemento.offsetWidth);
      // O corpo vem do CSS e não de uma constante aqui: terra é versalete de 13, água é
      // itálico de 15, e quem manda nisso é a folha de estilo.
      this.corpos.set(id, Number.parseFloat(getComputedStyle(elemento).fontSize) || 13);
    }
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
      const largura = this.larguras.get(p.id) ?? 0;
      const base = this.corpos.get(p.id) ?? 13;
      if (largura === 0) continue;

      // O diâmetro da província EM PIXELS DE PALCO. O texto não cresce com o zoom; a
      // província sim — e é dessa diferença que sai o tamanho de cada nome.
      const cabe = p.raio * 2 * camera.zoom * FOLGA;
      // ⚠️ **Encolhe até caber, e nunca some.** O corpo é arredondado a pixel inteiro de
      // propósito: durante um zoom contínuo isso troca o `font-size` só quando cruza um
      // inteiro, e escrever `font-size` é a única coisa aqui que custa refluxo.
      const corpo = Math.round(
        Math.max(CORPO_MINIMO, Math.min(base, (base * cabe) / largura)),
      );
      if (this.corpoAtual.get(p.id) !== corpo) {
        elemento.style.fontSize = `${corpo}px`;
        this.corpoAtual.set(p.id, corpo);
      }
      const ponto = camera.mundoParaPalco(p.x, p.y);
      // `translate` e nunca `transform`: é a mesma lição dos marcadores de hoste — um `scale`
      // independente multiplicaria o que estivesse em `transform` e jogaria a peça longe.
      elemento.style.translate = `calc(${ponto.x}px - 50%) calc(${ponto.y}px - 50%)`;
    }
  }
}
