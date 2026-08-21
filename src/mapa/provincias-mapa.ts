/**
 * A camada política: preenchimento e fronteira das províncias, por cima do terreno.
 *
 * O truque que faz isso ser barato: o gerador assa `provincias.png`, onde cada pixel
 * guarda o ÍNDICE da província (vermelho é o byte baixo, verde o alto). O jogo lê essa
 * imagem como textura e, no chuveirinho, troca o índice pela cor do dono numa paleta de
 * 256×256.
 *
 * Consequência prática: **conquistar território é escrever quatro bytes na paleta.**
 * Nada de regerar imagem, nada de remontar geometria, nada de polígono. E a fronteira
 * sai do mesmo lugar — um pixel é fronteira quando o vizinho tem outro índice.
 *
 * A MESMA imagem serve pra saber onde o mouse está: os índices também ficam na memória
 * do processador, e apontar vira ler um número numa posição. Sem geometria, sem teste de
 * ponto-em-polígono, sem passe de seleção na placa de vídeo.
 */

import { Assets, BufferImageSource, Geometry, GlProgram, Mesh, Shader } from 'pixi.js';
import type { Texture } from 'pixi.js';

import type { Ajustes, Provincias } from '@/dados/esquema';

/** Lado da paleta. 256×256 endereça 65.536 províncias, o teto do formato do índice. */
const LADO_PALETA = 256;

/** Índice reservado: mar, e a terra que nenhuma província reivindicou. */
const NENHUMA = 0;

const VERTICE = `#version 300 es
in vec2 aPosition;
in vec2 aUV;
out vec2 vUV;

uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform mat3 uTransformMatrix;

void main() {
  mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
  gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
  vUV = aUV;
}
`;

const FRAGMENTO = `#version 300 es
precision highp float;

in vec2 vUV;
out vec4 saida;

uniform sampler2D uIndice;
uniform sampler2D uPaleta;
/** Tamanho do mapa de indice, em texels. */
uniform vec2 uTamanho;
/** Espessura da linha de fronteira, em PIXELS DE TELA. Nao muda com o zoom. */
uniform float uLarguraDaLinha;
uniform vec4 uCorFronteira;
/** Quanto a cor do dono cobre o terreno. Vai a zero quando o jogador desliga as cores. */
uniform float uOpacidade;
/** Indice da provincia destacada, ou 0 pra nenhuma. */
uniform float uSelecionada;
/** Cor do destaque; o alfa e a cobertura que o destaque garante sozinho. */
uniform vec4 uCorSelecao;

/** Os dois bytes do indice, ainda como bytes: e assim que se endereca a paleta. */
vec2 bytesEm(vec2 uv) {
  return floor(texture(uIndice, uv).rg * 255.0 + 0.5);
}

float idDe(vec2 bytes) {
  return bytes.x + bytes.y * 256.0;
}

float idEmTexel(vec2 texel) {
  return idDe(bytesEm(texel / uTamanho));
}

/**
 * Pertence a MESMA provincia? O mar conta como pertencendo.
 *
 * Contar o mar como "dentro" e o que impede a linha de fronteira de aparecer no litoral:
 * a costa ja esta desenhada no terreno, e repeti-la aqui engrossaria o contorno inteiro.
 */
float pertence(vec2 texel, float id) {
  float outro = idEmTexel(texel);
  return (outro < 0.5 || outro == id) ? 1.0 : 0.0;
}

void main() {
  vec2 meus = bytesEm(vUV);
  float id = idDe(meus);
  // indice 0 e mar (e a terra que ninguem reivindicou). A camada politica nao pinta la.
  if (id < 0.5) {
    saida = vec4(0.0);
    return;
  }

  float destacada = abs(id - uSelecionada) < 0.5 ? 1.0 : 0.0;
  vec3 cor = texture(uPaleta, (meus + 0.5) / 256.0).rgb;

  // ------------------------------------------------------------------------
  // A fronteira, medida de dois jeitos: um pra cada regime de zoom
  // ------------------------------------------------------------------------
  //
  // Nenhuma medida unica serve nos dois extremos, e insistir numa so foi o que produziu
  // primeiro a escada grossa e depois a linha tracejada.
  //
  // PERTO (um texel ocupa varios pixels) o problema e precisao. Monta-se um campo
  // continuo que vale 1 dentro da provincia e 0 fora, interpolado entre os quatro texels
  // em volta do fragmento; a fronteira e a curva onde esse campo vale 0,5, e ela corta o
  // texel na diagonal quando e diagonal o que existe ali. Marching squares por pixel. As
  // amostras ficam PRESAS a grade de texels, que e o que da a precisao sub-texel.
  //
  // LONGE (um pixel cobre varios texels) o problema e continuidade. Ali a grade presa
  // vira armadilha: as amostras nao se mexem junto com o fragmento, o campo fica constante
  // por celula, a derivada zera dentro dela e a linha sai TRACEJADA. Entao conta-se quantas
  // amostras de um anel que ACOMPANHA o fragmento caem em outra provincia. Perde precisao,
  // ganha uma linha inteira — e no panorama e a linha inteira que importa.

  vec2 texel = vUV * uTamanho;
  // Quantos texels cabem num pixel de tela. Longe e muito; perto e uma fracao.
  float texelsPorPixel = max(length(dFdx(texel)), length(dFdy(texel)));

  // A provincia destacada ganha traco mais grosso. E isso que a mantem legivel com as
  // cores dos reinos desligadas, quando nao ha preenchimento nenhum pra diferencia-la.
  float meiaLargura = uLarguraDaLinha * mix(1.0, 2.2, destacada) * 0.5;

  // --- perto: curva de nivel na grade de texels -----------------------------
  vec2 canto = floor(texel - 0.5) + 0.5;
  vec2 fracao = texel - canto;
  float p00 = pertence(canto + vec2(0.0, 0.0), id);
  float p10 = pertence(canto + vec2(1.0, 0.0), id);
  float p01 = pertence(canto + vec2(0.0, 1.0), id);
  float p11 = pertence(canto + vec2(1.0, 1.0), id);
  float campo = mix(mix(p00, p10, fracao.x), mix(p01, p11, fracao.x), fracao.y);
  float inclinacao = max(length(vec2(dFdx(campo), dFdy(campo))), 1e-6);
  float distancia = abs(campo - 0.5) / inclinacao;
  float linhaPerto = 1.0 - smoothstep(meiaLargura - 0.5, meiaLargura + 0.5, distancia);

  // --- longe: anel de amostras que anda junto com o fragmento ---------------
  float raio = max(1.0, meiaLargura * texelsPorPixel);
  float alheias = 0.0;
  for (int i = 0; i < 8; i++) {
    float angulo = float(i) * 0.78539816;
    alheias += 1.0 - pertence(texel + vec2(cos(angulo), sin(angulo)) * raio, id);
  }
  // duas amostras de oito ja pintam cheio: fronteira e presenca, nao proporcao
  float linhaLonge = min(1.0, alheias * 0.25);

  // A troca acontece em volta de um texel por pixel, com folga pra ninguem ver o degrau.
  float linha = mix(linhaPerto, linhaLonge, smoothstep(0.8, 1.6, texelsPorPixel));
  float fronteira = linha * uCorFronteira.a;

  // ------------------------------------------------------------------------
  // Litoral: a mesma ideia, aplicada a pergunta "isto e terra?".
  // ------------------------------------------------------------------------
  float t00 = idEmTexel(canto + vec2(0.0, 0.0)) > 0.5 ? 1.0 : 0.0;
  float t10 = idEmTexel(canto + vec2(1.0, 0.0)) > 0.5 ? 1.0 : 0.0;
  float t01 = idEmTexel(canto + vec2(0.0, 1.0)) > 0.5 ? 1.0 : 0.0;
  float t11 = idEmTexel(canto + vec2(1.0, 1.0)) > 0.5 ? 1.0 : 0.0;
  float terra = mix(mix(t00, t10, fracao.x), mix(t01, t11, fracao.x), fracao.y);
  float inclinacaoTerra = max(length(vec2(dFdx(terra), dFdy(terra))), 1e-6);
  float cobertura = clamp((terra - 0.5) / inclinacaoTerra + 0.5, 0.0, 1.0);

  // O destaque carrega cobertura propria: com as cores desligadas uOpacidade e zero, e
  // sem esta garantia a provincia selecionada nao apareceria de jeito nenhum.
  vec3 corBase = mix(cor, uCorSelecao.rgb, destacada * 0.5);
  float alfaBase = max(uOpacidade, destacada * uCorSelecao.a);

  vec3 pintura = mix(corBase, uCorFronteira.rgb, fronteira);
  float alfa = mix(alfaBase, 1.0, fronteira) * cobertura;
  // Pixi trabalha com alfa pre-multiplicado.
  saida = vec4(pintura * alfa, alfa);
}
`;

type AjustesProvincias = Ajustes['provincias'];

/** O que a interface precisa saber sobre a província apontada. */
export interface InfoProvincia {
  indice: number;
  id: string;
  nome: string;
  regiao: string;
  areaKm2: number;
  poder: { id: string; nome: string; povo: string; cor: string };
  vizinhas: number;
}

export class ProvinciasMapa {
  readonly visual: Mesh<Geometry, Shader>;

  private readonly paleta = new Uint8Array(LADO_PALETA * LADO_PALETA * 4);
  private readonly fontePaleta: BufferImageSource;
  private readonly corDoPoder = new Map<string, [number, number, number]>();
  private readonly indiceDaProvincia = new Map<string, number>();
  private readonly porIndice = new Map<number, InfoProvincia>();
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
    const poderes = new Map(dados.poderes.map((p) => [p.id, p]));
    for (const poder of dados.poderes) this.corDoPoder.set(poder.id, separarCor(poder.cor));
    for (const p of dados.provincias) {
      this.indiceDaProvincia.set(p.id, p.indice);
      const poder = poderes.get(p.dono);
      if (!poder) throw new Error(`província "${p.nome}" tem dono inexistente: ${p.dono}`);
      this.porIndice.set(p.indice, {
        indice: p.indice,
        id: p.id,
        nome: p.nome,
        regiao: p.regiao,
        areaKm2: p.areaKm2,
        poder,
        vizinhas: p.vizinhas.length,
      });
    }

    this.opacidadeCheia = ajustes.opacidade;
    this.indices = indices;
    this.larguraEmTexels = indice.width;
    this.alturaEmTexels = indice.height;
    this.texelsPorUnidade = indice.width / larguraDoMundo;

    this.fontePaleta = new BufferImageSource({
      resource: this.paleta,
      width: LADO_PALETA,
      height: LADO_PALETA,
      format: 'rgba8unorm',
      scaleMode: 'nearest',
      alphaMode: 'no-premultiply-alpha',
    });
    for (const p of dados.provincias) this.escreverNaPaleta(p.indice, p.dono);
    this.fontePaleta.update();

    const [r, g, b] = separarCor(ajustes.corFronteira);
    const [sr, sg, sb] = separarCor(ajustes.corSelecao);
    const shader = new Shader({
      glProgram: GlProgram.from({ vertex: VERTICE, fragment: FRAGMENTO }),
      resources: {
        uIndice: indice.source,
        uPaleta: this.fontePaleta,
        camada: {
          uTamanho: { type: 'vec2<f32>', value: new Float32Array([indice.width, indice.height]) },
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
    // O grupo de uniformes é `any` na tipagem do Pixi; guardar a referência estreitada
    // aqui é o que deixa o resto da classe escrever nela sem espalhar cast.
    this.uniformes = (shader.resources['camada'] as { uniforms: Record<string, number> }).uniforms;

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
    // Índice NÃO se interpola: a média entre a província 7 e a 9 é a 8, que fica do outro
    // lado do mapa. Vizinho mais próximo é obrigatório aqui, não é preferência de estilo.
    indice.source.scaleMode = 'nearest';
    indice.source.autoGenerateMipmaps = false;
    indice.source.style.update();
    const indices = await lerIndices(endereco, indice.width, indice.height);
    return new ProvinciasMapa(dados, indice, indices, larguraDoMundo, alturaDoMundo, ajustes);
  }

  /** Passa uma província para outro dono. Custa quatro bytes e um upload de paleta. */
  trocarDono(idProvincia: string, idPoder: string): void {
    const indice = this.indiceDaProvincia.get(idProvincia);
    if (indice === undefined) throw new Error(`província inexistente: ${idProvincia}`);
    this.escreverNaPaleta(indice, idPoder);
    this.fontePaleta.update();
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

  /** Qual província está neste ponto do mundo? `null` no mar e fora da moldura. */
  provinciaEm(xMundo: number, yMundo: number): InfoProvincia | null {
    const x = Math.floor(xMundo * this.texelsPorUnidade);
    const y = Math.floor(yMundo * this.texelsPorUnidade);
    if (x < 0 || y < 0 || x >= this.larguraEmTexels || y >= this.alturaEmTexels) return null;
    const indice = this.indices[y * this.larguraEmTexels + x]!;
    return indice === NENHUMA ? null : (this.porIndice.get(indice) ?? null);
  }

  /**
   * Muda a linha de fronteira em tempo de execução. Existe pra CALIBRAR: espessura de
   * traço é coisa que só se resolve olhando, e recarregar o jogo a cada tentativa
   * significa nunca comparar duas de verdade. Os valores bons voltam pra ajustes.json.
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

  selecionar(provincia: InfoProvincia | null): void {
    this.selecionada = provincia?.indice ?? NENHUMA;
    this.uniformes['uSelecionada'] = this.selecionada;
  }

  private escreverNaPaleta(indice: number, idPoder: string): void {
    const cor = this.corDoPoder.get(idPoder);
    if (!cor) throw new Error(`poder inexistente: ${idPoder}`);
    const base = indice * 4;
    this.paleta[base] = cor[0];
    this.paleta[base + 1] = cor[1];
    this.paleta[base + 2] = cor[2];
    this.paleta[base + 3] = 255;
  }
}

/**
 * Traz os índices da imagem para a memória do processador.
 *
 * A leitura é em FAIXAS de propósito: a imagem inteira em RGBA são ~100 MB de uma vez, e
 * faixa por faixa o pico fica em poucos megabytes. O que sobra no fim é só o vetor de 16
 * bits — metade do tamanho, porque aqui não interessa cor nenhuma, só o número.
 */
async function lerIndices(endereco: string, largura: number, altura: number): Promise<Uint16Array> {
  const resposta = await fetch(endereco);
  const bitmap = await createImageBitmap(await resposta.blob());

  const LINHAS_POR_FAIXA = 256;
  const tela = new OffscreenCanvas(largura, LINHAS_POR_FAIXA);
  const pincel = tela.getContext('2d', { willReadFrequently: true });
  if (!pincel) throw new Error('sem contexto 2d pra ler o mapa de províncias');
  pincel.imageSmoothingEnabled = false;

  const indices = new Uint16Array(largura * altura);
  for (let topo = 0; topo < altura; topo += LINHAS_POR_FAIXA) {
    const linhas = Math.min(LINHAS_POR_FAIXA, altura - topo);
    pincel.clearRect(0, 0, largura, LINHAS_POR_FAIXA);
    pincel.drawImage(bitmap, 0, -topo);
    const dados = pincel.getImageData(0, 0, largura, linhas).data;
    const base = topo * largura;
    for (let i = 0; i < largura * linhas; i++) {
      indices[base + i] = dados[i * 4]! | (dados[i * 4 + 1]! << 8);
    }
  }
  bitmap.close();
  return indices;
}

function separarCor(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}
