/**
 * O chuveirinho da camada política — **onde a fronteira de verdade é desenhada.**
 *
 * O gerador assa `provincias.png`, onde cada pixel guarda o ÍNDICE da província (vermelho é
 * o byte baixo, verde o alto). Aqui o índice vira cor do dono numa paleta de 256×256, e a
 * fronteira sai do mesmo lugar: um pixel é fronteira quando o vizinho tem outro índice.
 *
 * ⚠️ **A fronteira é medida de DOIS jeitos, um por regime de zoom.** Nenhuma medida única
 * serve nos dois extremos, e insistir numa só foi o que produziu primeiro a escada grossa e
 * depois a linha tracejada. Ver o comentário longo dentro do `main`.
 */

export const VERTICE = `#version 300 es
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

export const FRAGMENTO = `#version 300 es
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
/** Primeiro indice que e ZONA MARITIMA. Daqui pra cima, o indice e agua. */
uniform float uPrimeiroMar;
/** Quanto da linha de fronteira sobra na divisa entre duas zonas de mar. */
uniform float uForcaDoMar;

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
 * Este indice e agua?
 *
 * ⚠️ **O mar tem indice alto, nao indice zero.** Desde que as zonas maritimas existem, "id
 * igual a zero" deixou de significar mar: zero e so o que esta fora do recorte. Quem
 * confundir os dois pinta o Egeu com a cor de um reino.
 */
bool ehMar(float id) {
  return id >= uPrimeiroMar;
}

/**
 * Pertence a MESMA provincia? **A costa nunca conta como fronteira.**
 *
 * A linha do litoral ja esta desenhada no terreno, e repeti-la aqui engrossaria o contorno
 * inteiro — entao terra e agua se enxergam como "dentro", nos DOIS sentidos. O que sobra sao
 * as divisas que importam: reino contra reino em terra, zona contra zona no mar.
 */
float pertence(vec2 texel, float id) {
  float outro = idEmTexel(texel);
  // Fora do recorte nao faz fronteira com ninguem.
  if (outro < 0.5 || outro == id) return 1.0;
  return ehMar(outro) == ehMar(id) ? 0.0 : 1.0;
}

/**
 * Este texel e do mesmo elemento que eu — agua com agua, terra com terra?
 *
 * E daqui que sai a mascara que apara a camada politica no litoral. Ela precisa valer nos
 * dois sentidos: a cor do reino nao pode vazar pro mar, e o destaque de uma zona maritima
 * nao pode vazar pra praia.
 */
float mesmoElemento(vec2 texel, bool souMar) {
  float outro = idEmTexel(texel);
  if (outro < 0.5) return souMar ? 1.0 : 0.0;
  return ehMar(outro) == souMar ? 1.0 : 0.0;
}

void main() {
  vec2 meus = bytesEm(vUV);
  float id = idDe(meus);
  // Indice 0 e o fora-do-recorte: nem terra nem zona. Nada se pinta la.
  if (id < 0.5) {
    saida = vec4(0.0);
    return;
  }
  bool souMar = ehMar(id);

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
  // A divisa entre duas zonas de mar e a MESMA linha, so que fraca: ela existe pra o jogador
  // saber onde uma zona acaba, e nao pra competir com a fronteira dos reinos. SELECIONADA,
  // ela vai a linha cheia — no mar e o CONTORNO que destaca, porque uma zona tem o tamanho de
  // meia dezena de provincias e um preenchimento forte nela cega o resto do mapa.
  float forcaDaLinha = souMar ? mix(uForcaDoMar, 1.0, destacada) : 1.0;
  float fronteira = linha * uCorFronteira.a * forcaDaLinha;

  // ------------------------------------------------------------------------
  // Litoral: a mesma ideia, aplicada a pergunta "isto e do meu elemento?".
  // ------------------------------------------------------------------------
  float t00 = mesmoElemento(canto + vec2(0.0, 0.0), souMar);
  float t10 = mesmoElemento(canto + vec2(1.0, 0.0), souMar);
  float t01 = mesmoElemento(canto + vec2(0.0, 1.0), souMar);
  float t11 = mesmoElemento(canto + vec2(1.0, 1.0), souMar);
  float terra = mix(mix(t00, t10, fracao.x), mix(t01, t11, fracao.x), fracao.y);
  float inclinacaoTerra = max(length(vec2(dFdx(terra), dFdy(terra))), 1e-6);
  float cobertura = clamp((terra - 0.5) / inclinacaoTerra + 0.5, 0.0, 1.0);

  // O destaque carrega cobertura propria: com as cores desligadas uOpacidade e zero, e
  // sem esta garantia a provincia selecionada nao apareceria de jeito nenhum.
  // ⚠️ **Zona maritima nao recebe cor de dono**, porque nao tem dono: o preenchimento vai a
  // zero e o mar desenhado por baixo aparece inteiro. Destacada, ela acende como qualquer
  // outra — e e assim que o jogador ve pra onde a hoste pode navegar.
  vec3 corBase = mix(cor, uCorSelecao.rgb, destacada * (souMar ? 1.0 : 0.5));
  float destaqueNoMar = uCorSelecao.a * uForcaDoMar;
  float alfaBase =
    max(souMar ? 0.0 : uOpacidade, destacada * (souMar ? destaqueNoMar : uCorSelecao.a));

  vec3 pintura = mix(corBase, uCorFronteira.rgb, fronteira);
  float alfa = mix(alfaBase, 1.0, fronteira) * cobertura;
  // Pixi trabalha com alfa pre-multiplicado.
  saida = vec4(pintura * alfa, alfa);
}
`;
