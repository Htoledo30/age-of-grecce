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
/** Quanto do destaque ja acendeu, de 0 a 1: o clique acende a provincia, nao a estala. */
uniform float uPresenca;
/** Cor do destaque; o alfa e a cobertura que o destaque garante sozinho. */
uniform vec4 uCorSelecao;
/** Primeiro indice que e ZONA MARITIMA. Daqui pra cima, o indice e agua. */
uniform float uPrimeiroMar;
/** Quanto da linha de fronteira sobra na divisa entre duas zonas de mar. */
uniform float uForcaDoMar;

/** Quanto o aro de luz da selecionada entra pela borda, em PIXELS DE TELA. */
const float LARGURA_DO_ARO = 11.0;
/** Quanto de marfim o aro pinta na borda. Ele some na largura acima. */
const float FORCA_DO_ARO = 0.75;
/** Quanto a cor do dono clareia na selecionada; o resto do destaque e aro e linha. */
const float CLAREAR_DA_SELECIONADA = 0.16;
/** Quanto o preenchimento da selecionada cobre a mais que o das outras terras. */
const float COBERTURA_A_MAIS = 0.30;

/**
 * Os dois bytes do indice, ainda como bytes: e assim que se endereca a paleta.
 *
 * textureLod e nao texture: o aro da selecionada le o indice de dentro de um desvio que so a
 * selecionada percorre, e derivada implicita em fluxo divergente e indefinida. O indice nao tem
 * mipmap, entao o nivel 0 e o unico que existe.
 */
vec2 bytesEm(vec2 uv) {
  return floor(textureLod(uIndice, uv, 0.0).rg * 255.0 + 0.5);
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

/**
 * Quanto o campo bilinear muda por PIXEL DE TELA, calculado em forma fechada.
 *
 * ⚠️ **Existe para nao usar dFdx aqui.** Ver o comentario longo dentro do main: perto, os
 * dois pixels que a derivada de hardware compara caem em celulas diferentes da grade de
 * texels, e a diferenca entre eles nao mede inclinacao nenhuma — mede o degrau entre duas
 * interpolacoes distintas. O resultado eram furos na linha, um por degrau da escada.
 *
 * A derivada do bilinear sai das mesmas quatro amostras: em x ela interpola as duas
 * diferencas horizontais pela fracao em y, e vice-versa. Depois vira pixel de tela.
 *
 * O piso de meia unidade por texel e a rede de seguranca do PONTO DE SELA — o xadrez em que
 * as quatro amostras se alternam e a inclinacao zera de verdade. Sem ele a divisao estoura
 * ali e o furo volta, agora nas quinas. Piso so pode ENGROSSAR a linha, nunca afina-la.
 */
float inclinacaoDoCampo(float a00, float a10, float a01, float a11, vec2 fracao, float texelsPorPixel) {
  vec2 gradiente = vec2(
    mix(a10 - a00, a11 - a01, fracao.y),
    mix(a01 - a00, a11 - a10, fracao.x)
  );
  return max(length(gradiente), 0.5) * max(texelsPorPixel, 1e-6);
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
  float acesa = destacada * uPresenca;
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
  // ⚠️ **E a inclinacao desse campo se calcula na mao, nunca com dFdx.** A derivada de
  // hardware compara dois pixels VIZINHOS, e perto eles caem em CELULAS diferentes da
  // grade: cada um interpola quatro amostras diferentes, e a diferenca entre os dois nao e
  // inclinacao nenhuma. Ela sai grande e com o sinal trocado, a distancia ate a fronteira
  // infla, e a linha SOME naquele pixel. Numa escada de 45 graus toda celula difere da
  // vizinha e o furo cai em cada degrau: foi assim que a fronteira de Atenas virou uma
  // fileira de pontos com o teto de zoom em 1,0. A derivada do campo bilinear e conhecida
  // em forma fechada — sao as mesmas quatro amostras que ja estao em maos —, entao usa-se
  // ela: exata dentro da celula, cega para o que acontece do lado de fora.
  //
  // LONGE (um pixel cobre varios texels) o problema e continuidade. Ali a grade presa
  // vira armadilha: as amostras nao se mexem junto com o fragmento, o campo fica constante
  // por celula, a derivada zera dentro dela e a linha sai TRACEJADA. Entao conta-se quantas
  // amostras de um anel que ACOMPANHA o fragmento caem em outra provincia. Perde precisao,
  // ganha uma linha inteira — e no panorama e a linha inteira que importa.

  vec2 texel = vUV * uTamanho;
  // Quantos texels cabem num pixel de tela. Longe e muito; perto e uma fracao.
  float texelsPorPixel = max(length(dFdx(texel)), length(dFdy(texel)));

  // A provincia destacada tem a MESMA largura de traco das outras: o que a mantem legivel com
  // as cores dos reinos desligadas e o marfim da linha e o aro de luz mais abaixo.
  //
  // ⚠️ **Nao volte a engrossar o traco dela.** A curva de nivel de perto so enxerga a celula de
  // quatro texels em que o fragmento cai. Dentro de uma celula toda de dentro o campo e chato,
  // a inclinacao cai no piso, e a distancia sai como 1/texelsPorPixel — cerca de 2 px no zoom
  // maximo. Com um traco de 4,4 px isso pintava o MIOLO INTEIRO da provincia com a cor da
  // linha, e a selecionada saia marrom e apagada.
  float meiaLargura = uLarguraDaLinha * 0.5;

  // --- perto: curva de nivel na grade de texels -----------------------------
  vec2 canto = floor(texel - 0.5) + 0.5;
  vec2 fracao = texel - canto;
  float p00 = pertence(canto + vec2(0.0, 0.0), id);
  float p10 = pertence(canto + vec2(1.0, 0.0), id);
  float p01 = pertence(canto + vec2(0.0, 1.0), id);
  float p11 = pertence(canto + vec2(1.0, 1.0), id);
  float campo = mix(mix(p00, p10, fracao.x), mix(p01, p11, fracao.x), fracao.y);
  float distancia = abs(campo - 0.5) / inclinacaoDoCampo(p00, p10, p01, p11, fracao, texelsPorPixel);
  float linhaPerto = 1.0 - smoothstep(meiaLargura - 0.5, meiaLargura + 0.5, distancia);
  // Celula toda de dentro nao tem fronteira. Nas outras provincias o piso da inclinacao so
  // escurece de leve o miolo, e ninguem ve; num traco marfim o vazamento apareceria.
  if (destacada > 0.5 && p00 * p10 * p01 * p11 > 0.5) linhaPerto = 0.0;

  // --- longe: anel de amostras que anda junto com o fragmento ---------------
  // A selecionada engrossa aqui, onde o contorno e o unico jeito de achar uma provincia pequena.
  float raio = max(1.0, meiaLargura * texelsPorPixel * mix(1.0, 1.6, destacada));
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
  float forcaDaLinha = souMar ? mix(uForcaDoMar, 1.0, acesa) : 1.0;
  float fronteira = linha * mix(uCorFronteira.a, 1.0, acesa) * forcaDaLinha;
  // A selecionada troca o bronze escuro da fronteira pelo marfim: o traco de uma provincia so
  // se destaca dos vizinhos se for CLARO contra o escuro deles. O fio escuro da vizinha, logo
  // do outro lado, faz o contraste.
  vec3 corDaLinha = mix(uCorFronteira.rgb, uCorSelecao.rgb, acesa);

  // ------------------------------------------------------------------------
  // O aro de luz: a selecionada acende por dentro, a partir da borda.
  // ------------------------------------------------------------------------
  // Fracao do entorno que e de OUTRA provincia, em tres aneis de oito amostras. Na borda vale
  // metade (o aro pleno); a LARGURA_DO_ARO de fundo vale zero. Sao 24 leituras, mas so a
  // selecionada as faz — o desvio abaixo nao roda para mais nenhum fragmento do mapa.
  float aro = 0.0;
  if (destacada > 0.5) {
    float alcance = max(LARGURA_DO_ARO * texelsPorPixel, 2.0);
    float dentro = 1.0;
    for (int anel = 1; anel <= 3; anel++) {
      float r = alcance * float(anel) / 3.0;
      // aneis alternados girados meia volta: sem isso as amostras se alinham em raios
      float giro = mod(float(anel), 2.0) * 0.5;
      for (int i = 0; i < 8; i++) {
        float angulo = (float(i) + giro) * 0.78539816;
        dentro += pertence(texel + vec2(cos(angulo), sin(angulo)) * r, id);
      }
    }
    aro = clamp((1.0 - dentro / 25.0) * 2.0, 0.0, 1.0);
    // ao quadrado: o brilho fica na borda e cai depressa, em vez de manchar a provincia
    aro = pow(aro, 1.6);
  }
  float luz = aro * FORCA_DO_ARO * uPresenca;

  // ------------------------------------------------------------------------
  // Litoral: a mesma ideia, aplicada a pergunta "isto e do meu elemento?".
  // ------------------------------------------------------------------------
  float t00 = mesmoElemento(canto + vec2(0.0, 0.0), souMar);
  float t10 = mesmoElemento(canto + vec2(1.0, 0.0), souMar);
  float t01 = mesmoElemento(canto + vec2(0.0, 1.0), souMar);
  float t11 = mesmoElemento(canto + vec2(1.0, 1.0), souMar);
  float terra = mix(mix(t00, t10, fracao.x), mix(t01, t11, fracao.x), fracao.y);
  float inclinacaoTerra = inclinacaoDoCampo(t00, t10, t01, t11, fracao, texelsPorPixel);
  float cobertura = clamp((terra - 0.5) / inclinacaoTerra + 0.5, 0.0, 1.0);

  // O destaque carrega cobertura propria: com as cores desligadas uOpacidade e zero, e
  // sem esta garantia a provincia selecionada nao apareceria de jeito nenhum.
  // ⚠️ **Zona maritima nao recebe cor de dono**, porque nao tem dono: o preenchimento vai a
  // zero e o mar desenhado por baixo aparece inteiro. Destacada, ela acende como qualquer
  // outra — e e assim que o jogador ve pra onde a hoste pode navegar.
  // ⚠️ **Na terra a selecionada clareia pouco e cobre mais**, e nao o contrario. Metade de
  // marfim misturada a uma cor de dono ja fosca, no mesmo alfa das vizinhas, dava uma mancha
  // pastel e sem vida; a cor do dono precisa continuar SENDO a cor do dono, so mais viva.
  vec3 corBase = mix(cor, uCorSelecao.rgb, acesa * (souMar ? 1.0 : CLAREAR_DA_SELECIONADA));
  float destaqueNoMar = uCorSelecao.a * uForcaDoMar;
  float alfaDaTerra =
    min(1.0, max(uOpacidade + COBERTURA_A_MAIS * acesa, acesa * uCorSelecao.a));
  float alfaBase = souMar ? acesa * destaqueNoMar : mix(uOpacidade, alfaDaTerra, destacada);

  vec3 pintura = mix(corBase, corDaLinha, fronteira);
  float alfa = mix(alfaBase, 1.0, fronteira);
  // O aro entra por baixo da linha: marfim sobre o preenchimento, cobertura quase cheia na borda.
  pintura = mix(pintura, uCorSelecao.rgb, luz);
  alfa = mix(alfa, 1.0, luz) * cobertura;
  // Pixi trabalha com alfa pre-multiplicado.
  saida = vec4(pintura * alfa, alfa);
}
`;
