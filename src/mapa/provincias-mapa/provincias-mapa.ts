/**
 * A camada política: preenchimento e fronteira das províncias, por cima do terreno.
 *
 * O truque que faz isso ser barato: o gerador assa `provincias.png`, onde cada pixel guarda o
 * ÍNDICE da província. O jogo lê essa imagem como textura e, no chuveirinho, troca o índice
 * pela cor do dono numa paleta de 256×256 — ver `paleta.ts` e `sombreador.ts`.
 *
 * Consequência prática: **conquistar território é escrever quatro bytes na paleta.** Nada de
 * regerar imagem, nada de remontar geometria, nada de polígono.
 */

import { Assets, Geometry, GlProgram, Mesh, Shader } from 'pixi.js';
import type { Texture } from 'pixi.js';

import type { Ajustes, Provincias } from '@/dados/esquema';
import { lerIndices } from './indices';
import { NENHUMA, PaletaDeDonos, separarCor } from './paleta';
import { FRAGMENTO, VERTICE } from './sombreador';

type AjustesProvincias = Ajustes['provincias'];

export class ProvinciasMapa {
  readonly visual: Mesh<Geometry, Shader>;

  private readonly paleta: PaletaDeDonos;
  private readonly indiceDaProvincia = new Map<string, number>();
  /** Todos os ids, na ordem do assado. É o que `pintarDonos` percorre. */
  private readonly idsDasProvincias: readonly string[];
  private readonly uniformes: Record<string, number>;
  /** Texels do índice por unidade de mundo. É o que converte a posição do mouse em texel. */
  private readonly texelsPorUnidade: number;
  private readonly larguraEmTexels: number;
  private readonly alturaEmTexels: number;
  /** Os mesmos índices da textura, do lado do processador, pra apontar sem consultar a GPU. */
  private readonly indices: Uint16Array;

  /** Guardada porque desligar as cores zera o uniforme e ligar precisa restaurá-lo. */
  private readonly opacidadeCheia: number;
  private selecionada = NENHUMA;
  private coresLigadas = true;

  private constructor(
    dados: Provincias,
    indice: Texture,
    indices: Uint16Array,
    larguraDoMundo: number,
    alturaDoMundo: number,
    ajustes: AjustesProvincias,
  ) {
    for (const p of dados.provincias) this.indiceDaProvincia.set(p.id, p.indice);
    this.idsDasProvincias = dados.provincias.map((p) => p.id);

    this.opacidadeCheia = ajustes.opacidade;
    this.indices = indices;
    this.larguraEmTexels = indice.width;
    this.alturaEmTexels = indice.height;
    this.texelsPorUnidade = indice.width / larguraDoMundo;

    this.paleta = new PaletaDeDonos(dados.poderes);
    // Dono ASSADO, que é a condição de 700 a.C. A campanha repinta por cima assim que existe
    // partida — e a partir daí é ela quem sabe de quem é o quê.
    for (const p of dados.provincias) this.paleta.escrever(p.indice, p.dono);
    this.paleta.aplicar();

    const [r, g, b] = separarCor(ajustes.corFronteira);
    const [sr, sg, sb] = separarCor(ajustes.corSelecao);
    const shader = new Shader({
      glProgram: GlProgram.from({ vertex: VERTICE, fragment: FRAGMENTO }),
      resources: {
        uIndice: indice.source,
        uPaleta: this.paleta.fonte,
        camada: {
          uTamanho: {
            type: 'vec2<f32>',
            value: new Float32Array([indice.width, indice.height]),
          },
          uLarguraDaLinha: { type: 'f32', value: ajustes.larguraDaLinha },
          uCorFronteira: {
            type: 'vec4<f32>',
            value: new Float32Array([r / 255, g / 255, b / 255, ajustes.forcaFronteira]),
          },
          uOpacidade: { type: 'f32', value: ajustes.opacidade },
          uSelecionada: { type: 'f32', value: NENHUMA },
          uCorSelecao: {
            type: 'vec4<f32>',
            value: new Float32Array([sr / 255, sg / 255, sb / 255, ajustes.forcaSelecao]),
          },
        },
      },
    });
    // O grupo de uniformes é `any` na tipagem do Pixi; guardar a referência estreitada aqui é
    // o que deixa o resto da classe escrever nela sem espalhar cast.
    this.uniformes = (shader.resources['camada'] as { uniforms: Record<string, number> })
      .uniforms;

    this.visual = new Mesh({
      geometry: new Geometry({
        attributes: {
          aPosition: [0, 0, larguraDoMundo, 0, larguraDoMundo, alturaDoMundo, 0, alturaDoMundo],
          aUV: [0, 0, 1, 0, 1, 1, 0, 1],
        },
        indexBuffer: [0, 1, 2, 0, 2, 3],
      }),
      shader,
    });
  }

  static async criar(
    endereco: string,
    dados: Provincias,
    larguraDoMundo: number,
    alturaDoMundo: number,
    ajustes: AjustesProvincias,
  ): Promise<ProvinciasMapa> {
    const indice = await Assets.load<Texture>(endereco);
    // Índice NÃO se interpola: a média entre a província 7 e a 9 é a 8, que fica do outro lado
    // do mapa. Vizinho mais próximo é obrigatório aqui, não é preferência de estilo.
    indice.source.scaleMode = 'nearest';
    indice.source.autoGenerateMipmaps = false;
    indice.source.style.update();
    const indices = await lerIndices(endereco, indice.width, indice.height);
    return new ProvinciasMapa(dados, indice, indices, larguraDoMundo, alturaDoMundo, ajustes);
  }

  /** Passa uma província para outro dono. Custa quatro bytes na paleta. */
  trocarDono(idProvincia: string, idPoder: string): void {
    const indice = this.indiceDaProvincia.get(idProvincia);
    if (indice === undefined) throw new Error(`província inexistente: ${idProvincia}`);
    this.paleta.escrever(indice, idPoder);
  }

  /**
   * Repinta o mapa político inteiro a partir de quem manda em cada província agora.
   *
   * **Idempotente de propósito.** Repintar as 205 custa menos que descobrir quais mudaram, e é
   * isso que faz retomar um salvamento produzir exatamente a mesma tela que jogar até ali
   * produziria. Quando a IA entrar e vinte províncias trocarem de dono numa virada de turno,
   * isto continua sendo uma passada e um envio.
   */
  pintarDonos(donoDe: (idProvincia: string) => string): void {
    for (const id of this.idsDasProvincias) {
      const indice = this.indiceDaProvincia.get(id);
      if (indice === undefined) continue;
      this.paleta.escrever(indice, donoDe(id));
    }
  }

  /** Manda a paleta pra GPU, se ela mudou. Drenada uma vez por quadro. */
  aplicarPaleta(): void {
    this.paleta.aplicar();
  }

  /**
   * Liga e desliga a cor dos reinos SEM tirar o recorte: o preenchimento vai a zero e a
   * fronteira continua desenhada. É a diferença entre olhar o mapa político e olhar a
   * geografia com os limites por cima.
   */
  mostrarCores(ligadas: boolean): void {
    this.coresLigadas = ligadas;
    this.uniformes['uOpacidade'] = ligadas ? this.opacidadeCheia : 0;
  }

  get cores(): boolean {
    return this.coresLigadas;
  }

  /**
   * Qual província está neste ponto do mundo? Devolve o ÍNDICE; `null` no mar e fora da
   * moldura.
   *
   * Devolve índice, e não uma ficha montada, de propósito. Esta camada sabe *onde* cada
   * província está desenhada — quem é o dono dela hoje é assunto da campanha. Quando esta
   * classe montava a ficha, ela a montava com o dono ASSADO, e a primeira conquista fazia a
   * interface mentir para sempre.
   */
  provinciaEm(xMundo: number, yMundo: number): number | null {
    const x = Math.floor(xMundo * this.texelsPorUnidade);
    const y = Math.floor(yMundo * this.texelsPorUnidade);
    if (x < 0 || y < 0 || x >= this.larguraEmTexels || y >= this.alturaEmTexels) return null;
    const indice = this.indices[y * this.larguraEmTexels + x]!;
    return indice === NENHUMA ? null : indice;
  }

  /**
   * Muda a linha de fronteira em tempo de execução. Existe pra CALIBRAR: espessura de traço é
   * coisa que só se resolve olhando, e recarregar o jogo a cada tentativa significa nunca
   * comparar duas de verdade. Os valores bons voltam pra ajustes.json.
   */
  calibrarFronteira(largura?: number, forca?: number, cor?: string): void {
    if (largura !== undefined) this.uniformes['uLarguraDaLinha'] = largura;
    if (forca === undefined && cor === undefined) return;
    const atual = this.uniformes['uCorFronteira'] as unknown as Float32Array;
    if (cor !== undefined) {
      const [r, g, b] = separarCor(cor);
      atual[0] = r / 255;
      atual[1] = g / 255;
      atual[2] = b / 255;
    }
    if (forca !== undefined) atual[3] = forca;
  }

  selecionar(indice: number | null): void {
    this.selecionada = indice ?? NENHUMA;
    this.uniformes['uSelecionada'] = this.selecionada;
  }
}
