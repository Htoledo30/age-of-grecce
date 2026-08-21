/**
 * Pinta o terreno do mapa-múndi.
 *
 * A ideia é a do Mount & Blade traduzida pra 2D: o mapa não é um documento político
 * liso, é o mundo visto de cima. Você enxerga floresta, serra, planície e mar raso — e
 * mais tarde essas mesmas regiões são o que decide velocidade de marcha e qual campo de
 * batalha aparece quando alguém te alcança.
 *
 * Nada disso roda em partida. É arte assada uma vez, aqui.
 */

import { createNoise2D } from 'simplex-noise';

export type Anel = Array<[number, number]>;

export interface Terreno {
  /** RGBA pronto pra virar PNG. */
  pixels: Uint8Array;
  /** Índice de bioma por pixel — vira o mapa de dados que o jogo lê depois. */
  biomas: Uint8Array;
  /** Máscara 0/1 usada para pintar a costa e para bloquear movimento. */
  terra: Uint8Array;
  /** Altitude linear e suavizada, preservada para drenagem e rios. */
  altitude: Float32Array;
  resolucao: number;
}

/** Ordem importa: é o índice gravado em `biomas`. */
export const BIOMAS = [
  'mar-fundo',
  'mar-raso',
  'praia',
  'planicie',
  'estepe',
  'floresta',
  'colina',
  'montanha',
  'pico',
] as const;

const COR: Record<(typeof BIOMAS)[number], [number, number, number]> = {
  'mar-fundo': [88, 111, 112],
  'mar-raso': [103, 126, 126],
  praia: [205, 191, 156],
  planicie: [186, 180, 132],
  estepe: [199, 186, 140],
  floresta: [108, 130, 94],
  colina: [156, 146, 105],
  montanha: [138, 128, 110],
  pico: [176, 168, 152],
};

const INDICE = new Map((BIOMAS as readonly string[]).map((n, i) => [n, i]));

interface Cordilheira {
  pontos: Array<[number, number]>;
  largura: number;
  forca: number;
}

/**
 * Espinha tectônica autoral do mundo, em coordenadas normalizadas.
 *
 * Não desenha montanha pronta: apenas diz onde o ruído de crista pode ganhar corpo.
 * As linhas seguem a gramática da região — Bálcãs, Pindo, Peloponeso, Creta e
 * Anatólia — sem obrigar o relevo a copiar elevações reais.
 */
const CORDILHEIRAS: Cordilheira[] = [
  {
    pontos: [
      [0.13, 0.08],
      [0.28, 0.1],
      [0.43, 0.12],
      [0.61, 0.1],
    ],
    largura: 0.05,
    forca: 0.76,
  },
  {
    pontos: [
      [0.21, 0.07],
      [0.25, 0.2],
      [0.31, 0.33],
      [0.38, 0.47],
    ],
    largura: 0.042,
    forca: 1,
  },
  {
    pontos: [
      [0.28, 0.5],
      [0.3, 0.59],
      [0.36, 0.67],
    ],
    largura: 0.038,
    forca: 0.76,
  },
  {
    pontos: [
      [0.36, 0.8],
      [0.49, 0.79],
      [0.62, 0.8],
    ],
    largura: 0.026,
    forca: 0.48,
  },
  {
    pontos: [
      [0.7, 0.18],
      [0.76, 0.31],
      [0.79, 0.46],
      [0.84, 0.62],
    ],
    largura: 0.055,
    forca: 0.9,
  },
  {
    pontos: [
      [0.76, 0.3],
      [0.86, 0.34],
      [0.93, 0.4],
    ],
    largura: 0.038,
    forca: 0.62,
  },
];

function distanciaSegmento(
  x: number,
  y: number,
  [ax, ay]: [number, number],
  [bx, by]: [number, number],
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const quadrado = dx * dx + dy * dy;
  if (quadrado === 0) return Math.hypot(x - ax, y - ay);
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / quadrado));
  return Math.hypot(x - (ax + dx * t), y - (ay + dy * t));
}

function campoCordilheiras(lado: number): Float32Array {
  const saida = new Float32Array(lado * lado);
  for (let y = 0; y < lado; y++) {
    const v = y / (lado - 1);
    for (let x = 0; x < lado; x++) {
      const u = x / (lado - 1);
      let valor = 0;
      for (const cordilheira of CORDILHEIRAS) {
        let distancia = Infinity;
        for (let i = 1; i < cordilheira.pontos.length; i++) {
          distancia = Math.min(
            distancia,
            distanciaSegmento(u, v, cordilheira.pontos[i - 1]!, cordilheira.pontos[i]!),
          );
        }
        const alcance = distancia / cordilheira.largura;
        valor = Math.max(valor, Math.exp(-alcance * alcance * 1.7) * cordilheira.forca);
      }
      saida[y * lado + x] = valor;
    }
  }
  return saida;
}

/** Semente fixa: o mundo tem que sair igual toda vez que o gerador rodar. */
function ruidoSemente(semente: number): () => number {
  let estado = semente >>> 0;
  return () => {
    estado = (estado * 1_664_525 + 1_013_904_223) >>> 0;
    return estado / 4_294_967_296;
  };
}

/** Campo de ruído em várias oitavas, numa grade pequena que depois é interpolada. */
function campo(lado: number, oitavas: number, escala: number, semente: number): Float32Array {
  const ruido = createNoise2D(ruidoSemente(semente));
  const saida = new Float32Array(lado * lado);
  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      let valor = 0;
      let amplitude = 1;
      let total = 0;
      let frequencia = escala / lado;
      for (let o = 0; o < oitavas; o++) {
        valor += ruido(x * frequencia, y * frequencia) * amplitude;
        total += amplitude;
        amplitude *= 0.5;
        frequencia *= 2;
      }
      saida[y * lado + x] = (valor / total + 1) / 2;
    }
  }
  return saida;
}

/** Ruído de cordilheira: dobra o vale pra cima e vira crista em vez de colina. */
function campoCrista(lado: number, escala: number, semente: number): Float32Array {
  const ruido = createNoise2D(ruidoSemente(semente));
  const saida = new Float32Array(lado * lado);
  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      let valor = 0;
      let amplitude = 1;
      let total = 0;
      let frequencia = escala / lado;
      for (let o = 0; o < 4; o++) {
        valor += (1 - Math.abs(ruido(x * frequencia, y * frequencia))) * amplitude;
        total += amplitude;
        amplitude *= 0.5;
        frequencia *= 2;
      }
      saida[y * lado + x] = valor / total;
    }
  }
  return saida;
}

/**
 * Interpolação com suavização de Hermite em vez de linear pura.
 *
 * Linear é contínua no valor mas NÃO na derivada — e o sombreamento de relevo usa
 * exatamente a derivada. Resultado: o relevo aparece facetado, com listras diagonais
 * marcando as células da grade. Hermite mata isso.
 */
function amostrar(campo: Float32Array, lado: number, u: number, v: number): number {
  const x = Math.min(lado - 1.001, Math.max(0, u * (lado - 1)));
  const y = Math.min(lado - 1.001, Math.max(0, v * (lado - 1)));
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = x - x0;
  const ty = y - y0;
  const fx = tx * tx * (3 - 2 * tx);
  const fy = ty * ty * (3 - 2 * ty);
  const a = campo[y0 * lado + x0]!;
  const b = campo[y0 * lado + x0 + 1]!;
  const c = campo[(y0 + 1) * lado + x0]!;
  const d = campo[(y0 + 1) * lado + x0 + 1]!;
  return a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy;
}

/**
 * Borrão de caixa separável, feito duas vezes (vira quase gaussiano).
 *
 * Serve pra tirar os degraus do campo de distância antes dele virar altitude. O
 * sombreamento de relevo usa a derivada da altitude, e derivada de degrau vira risco:
 * sem isso o mapa ganha um leque de listras diagonais saindo de toda a costa.
 */
function borrar(campo: Float32Array, lado: number, raio: number): Float32Array {
  let atual = campo;
  const janela = raio * 2 + 1;
  for (let passo = 0; passo < 2; passo++) {
    const meio = new Float32Array(atual.length);
    for (let y = 0; y < lado; y++) {
      let soma = 0;
      for (let x = -raio; x <= raio; x++)
        soma += atual[y * lado + Math.min(lado - 1, Math.max(0, x))]!;
      for (let x = 0; x < lado; x++) {
        meio[y * lado + x] = soma / janela;
        const sai = Math.min(lado - 1, Math.max(0, x - raio));
        const entra = Math.min(lado - 1, Math.max(0, x + raio + 1));
        soma += atual[y * lado + entra]! - atual[y * lado + sai]!;
      }
    }
    const saida = new Float32Array(atual.length);
    for (let x = 0; x < lado; x++) {
      let soma = 0;
      for (let y = -raio; y <= raio; y++)
        soma += meio[Math.min(lado - 1, Math.max(0, y)) * lado + x]!;
      for (let y = 0; y < lado; y++) {
        saida[y * lado + x] = soma / janela;
        const sai = Math.min(lado - 1, Math.max(0, y - raio));
        const entra = Math.min(lado - 1, Math.max(0, y + raio + 1));
        soma += meio[entra * lado + x]! - meio[sai * lado + x]!;
      }
    }
    atual = saida;
  }
  return atual;
}

/** Preenchimento por varredura com regra par-ímpar — mesma dos anéis do mapa. */
function rasterizarTerra(aneis: Anel[], resolucao: number, tamanhoMundo: number): Uint8Array {
  const mascara = new Uint8Array(resolucao * resolucao);
  const escala = resolucao / tamanhoMundo;
  const cruzamentos: number[] = [];

  for (let linha = 0; linha < resolucao; linha++) {
    const y = (linha + 0.5) / escala;
    cruzamentos.length = 0;
    for (const anel of aneis) {
      for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
        const a = anel[i]!;
        const b = anel[j]!;
        if (a[1] > y === b[1] > y) continue;
        cruzamentos.push(a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      }
    }
    cruzamentos.sort((p, q) => p - q);
    for (let k = 0; k + 1 < cruzamentos.length; k += 2) {
      const inicio = Math.max(0, Math.ceil(cruzamentos[k]! * escala - 0.5));
      const fim = Math.min(resolucao - 1, Math.floor(cruzamentos[k + 1]! * escala - 0.5));
      for (let x = inicio; x <= fim; x++) mascara[linha * resolucao + x] = 1;
    }
  }
  return mascara;
}

/**
 * Distância até a costa, em pixels, com sinal: positiva em terra, negativa na água.
 * Duas passadas de chamfer — barato e suficiente pra praia, mar raso e linha de tinta.
 */
function distanciaDaCosta(mascara: Uint8Array, resolucao: number): Float32Array {
  const LONGE = 1e9;
  const dentro = new Float32Array(mascara.length);
  const fora = new Float32Array(mascara.length);
  for (let i = 0; i < mascara.length; i++) {
    dentro[i] = mascara[i] ? LONGE : 0;
    fora[i] = mascara[i] ? 0 : LONGE;
  }

  const varrer = (d: Float32Array): void => {
    for (let y = 0; y < resolucao; y++) {
      for (let x = 0; x < resolucao; x++) {
        const i = y * resolucao + x;
        let melhor = d[i]!;
        if (x > 0) melhor = Math.min(melhor, d[i - 1]! + 1);
        if (y > 0) melhor = Math.min(melhor, d[i - resolucao]! + 1);
        if (x > 0 && y > 0) melhor = Math.min(melhor, d[i - resolucao - 1]! + 1.4142);
        if (x < resolucao - 1 && y > 0) melhor = Math.min(melhor, d[i - resolucao + 1]! + 1.4142);
        d[i] = melhor;
      }
    }
    for (let y = resolucao - 1; y >= 0; y--) {
      for (let x = resolucao - 1; x >= 0; x--) {
        const i = y * resolucao + x;
        let melhor = d[i]!;
        if (x < resolucao - 1) melhor = Math.min(melhor, d[i + 1]! + 1);
        if (y < resolucao - 1) melhor = Math.min(melhor, d[i + resolucao]! + 1);
        if (x < resolucao - 1 && y < resolucao - 1)
          melhor = Math.min(melhor, d[i + resolucao + 1]! + 1.4142);
        if (x > 0 && y < resolucao - 1) melhor = Math.min(melhor, d[i + resolucao - 1]! + 1.4142);
        d[i] = melhor;
      }
    }
  };

  varrer(dentro);
  varrer(fora);

  const saida = new Float32Array(mascara.length);
  for (let i = 0; i < mascara.length; i++) saida[i] = mascara[i] ? dentro[i]! : -fora[i]!;
  return saida;
}

export function pintarTerreno(
  aneis: Anel[],
  resolucao: number,
  tamanhoMundo: number,
  recortes: readonly Anel[] = [],
): Terreno {
  const LADO_CAMPO = 2048;
  // A limpeza de istmos vem ANTES do recorte autoral: fechar canais estreitos poderia
  // refechar justamente o estreito que a gente abriu de propósito.
  const terra = esculpirMar(
    limparIstmos(rasterizarTerra(aneis, resolucao, tamanhoMundo), resolucao),
    recortes,
    resolucao,
    tamanhoMundo,
  );
  const distancia = distanciaDaCosta(terra, resolucao);

  const cristas = campoCrista(LADO_CAMPO, 7, 20_260_817);
  const estrutura = campoCordilheiras(768);
  const rugosidade = campo(LADO_CAMPO, 5, 26, 991);
  const umidade = campo(LADO_CAMPO, 4, 11, 5_501);
  const grao = campo(LADO_CAMPO, 3, 46, 77);
  /** Alta frequência: quebra a borda da mata pra não virar mancha recortada de mapa político. */
  const folhagem = campo(LADO_CAMPO, 4, 62, 4_242);

  // altitude só existe em terra, e cresce conforme a costa fica pra trás
  const altitude = new Float32Array(resolucao * resolucao);
  const PIXEIS_ATE_INTERIOR = resolucao * 0.055;
  for (let i = 0; i < altitude.length; i++) {
    if (!terra[i]) continue;
    const x = i % resolucao;
    const y = (i / resolucao) | 0;
    const u = x / resolucao;
    const v = y / resolucao;
    const interior = Math.min(1, distancia[i]! / PIXEIS_ATE_INTERIOR);
    const crista = amostrar(cristas, LADO_CAMPO, u, v);
    const aspereza = amostrar(rugosidade, LADO_CAMPO, u, v);
    const espinha = amostrar(estrutura, 768, u, v);
    // a serra só ganha corpo longe do mar; litoral é baixo por construção
    const serras = espinha * (0.42 + crista * 0.48);
    const colinas = Math.max(0, crista * 0.43 + aspereza * 0.25 - 0.3);
    altitude[i] = Math.max(0, Math.min(1, interior * (serras + colinas)));
  }

  // tira os degraus do campo de distancia antes do sombreamento morder a derivada
  const altitudeLisa = borrar(altitude, resolucao, 5);

  const pixels = new Uint8Array(resolucao * resolucao * 4);
  const biomas = new Uint8Array(resolucao * resolucao);

  const iMar = INDICE.get('mar-fundo')!;
  const iRaso = INDICE.get('mar-raso')!;
  const iPraia = INDICE.get('praia')!;
  const iPlanicie = INDICE.get('planicie')!;
  const iColina = INDICE.get('colina')!;
  const iMontanha = INDICE.get('montanha')!;
  const iEstepe = INDICE.get('estepe')!;
  const iFloresta = INDICE.get('floresta')!;
  const iPico = INDICE.get('pico')!;

  for (let y = 0; y < resolucao; y++) {
    for (let x = 0; x < resolucao; x++) {
      const i = y * resolucao + x;
      const d = distancia[i]!;
      const u = x / resolucao;
      const v = y / resolucao;

      let bioma: number;
      let r: number;
      let g: number;
      let b: number;

      if (!terra[i]) {
        // profundidade contínua: o mar escurece conforme se afasta da costa
        const fundura = Math.min(1, -d / (resolucao * 0.013));
        const raso = COR['mar-raso'];
        const fundo = COR['mar-fundo'];
        r = raso[0] + (fundo[0] - raso[0]) * fundura;
        g = raso[1] + (fundo[1] - raso[1]) * fundura;
        b = raso[2] + (fundo[2] - raso[2]) * fundura;
        bioma = fundura < 0.35 ? iRaso : iMar;
      } else {
        const h = altitude[i]!;
        const detalhe = amostrar(folhagem, LADO_CAMPO, u, v) - 0.5;
        const espinha = amostrar(estrutura, 768, u, v);
        const ruidoUmidade = amostrar(umidade, LADO_CAMPO, u, v);
        // Norte e oeste recebem mais chuva; o sul, o leste e o sotavento são mais secos.
        const molhado =
          ruidoUmidade * 0.58 +
          (1 - v) * 0.15 +
          (1 - u) * 0.07 +
          0.1 +
          detalhe * 0.06 -
          espinha * Math.max(0, u - 0.42) * 0.06;
        const praia = 1 - Math.min(1, d / (resolucao * 0.0026));

        if (h > 0.72) bioma = iPico;
        else if (h > 0.52) bioma = iMontanha;
        else if (h > 0.33) bioma = iColina;
        else if (molhado > 0.52) bioma = iFloresta;
        else if (molhado > 0.44) bioma = iPlanicie;
        else bioma = iEstepe;

        // cor de base: seco → úmido, sem degrau
        const seco = COR.estepe;
        const verde = COR.planicie;
        const gramado = Math.max(0, Math.min(1, (molhado - 0.4) / 0.14));
        r = seco[0] + (verde[0] - seco[0]) * gramado;
        g = seco[1] + (verde[1] - seco[1]) * gramado;
        b = seco[2] + (verde[2] - seco[2]) * gramado;

        // mata entra por cima, com transição macia — textura, não polígono
        const mata = Math.max(0, Math.min(1, (molhado - 0.5) / 0.13)) * (1 - praia);
        if (mata > 0) {
          const f = COR.floresta;
          const peso = mata * 0.82;
          r += (f[0] - r) * peso;
          g += (f[1] - g) * peso;
          b += (f[2] - b) * peso;
        }

        // rocha sobe conforme a altitude, também sem degrau
        const pedra = Math.max(0, Math.min(1, (h - 0.3) / 0.3));
        if (pedra > 0) {
          const m = h > 0.66 ? COR.pico : COR.montanha;
          r += (m[0] - r) * pedra;
          g += (m[1] - g) * pedra;
          b += (m[2] - b) * pedra;
        }

        // faixa de praia
        if (praia > 0) {
          const p = COR.praia;
          if (bioma !== iPico && bioma !== iMontanha) bioma = iPraia;
          r += (p[0] - r) * praia * 0.6;
          g += (p[1] - g) * praia * 0.6;
          b += (p[2] - b) * praia * 0.6;
        }
      }
      biomas[i] = bioma;

      // sombreamento de relevo: luz vindo do noroeste. É o que faz a serra existir.
      if (terra[i] && x > 0 && y > 0) {
        const dx = altitudeLisa[i]! - altitudeLisa[i - 1]!;
        const dy = altitudeLisa[i]! - altitudeLisa[i - resolucao]!;
        const luz = 1 + (dx + dy) * 26;
        const fator = Math.max(0.62, Math.min(1.34, luz));
        r *= fator;
        g *= fator;
        b *= fator;
      }

      // linha de tinta da costa
      const tinta = 1 - Math.min(1, Math.abs(d) / 2.2);
      if (tinta > 0) {
        r += (58 - r) * tinta;
        g += (50 - g) * tinta;
        b += (39 - b) * tinta;
      }

      // grão de papel por cima de tudo, unificando
      const papel = 0.97 + amostrar(grao, LADO_CAMPO, u, v) * 0.06;
      r *= papel;
      g *= papel;
      b *= papel;

      const p = i * 4;
      pixels[p] = Math.max(0, Math.min(255, r));
      pixels[p + 1] = Math.max(0, Math.min(255, g));
      pixels[p + 2] = Math.max(0, Math.min(255, b));
      pixels[p + 3] = 255;
    }
  }

  return { pixels, biomas, terra, altitude: altitudeLisa, resolucao };
}

export interface Detalhes {
  arvores: Array<[number, number]>;
  rochas: Array<[number, number]>;
}

/**
 * Espalha árvores e pedras pelo mundo a partir do mapa de biomas.
 *
 * É a camada que o Mount & Blade acende quando você aproxima: de longe o mapa é uma
 * pintura só; de perto aparecem objetos, e o terreno para de ser borrão. As posições
 * saem daqui em unidades de mundo e o jogo só desenha, sem decidir nada.
 */
export function espalharDetalhes(terreno: Terreno, tamanhoMundo: number, passo = 20): Detalhes {
  const { biomas, resolucao } = terreno;
  const arvores: Array<[number, number]> = [];
  // Sem pedras: o sombreamento de relevo já desenha a serra. Símbolo de montanha por
  // cima de relevo sombreado vira adesivo — ou um, ou outro.
  const rochas: Array<[number, number]> = [];

  const iFloresta = INDICE.get('floresta')!;

  const sorte = ruidoSemente(31_337);
  const paraMundo = tamanhoMundo / resolucao;

  for (let y = passo; y < resolucao - passo; y += passo) {
    for (let x = passo; x < resolucao - passo; x += passo) {
      const bioma = biomas[y * resolucao + x]!;
      // desloca dentro da célula pra não virar grade visível
      const px = (x + (sorte() - 0.5) * passo * 1.6) * paraMundo;
      const py = (y + (sorte() - 0.5) * passo * 1.6) * paraMundo;

      if (bioma === iFloresta) {
        if (sorte() < 0.85) arvores.push([Math.round(px), Math.round(py)]);
      }
    }
  }

  return { arvores, rochas };
}

// ============================================================================
// Limpeza de istmos: nem terra fina demais, nem canal fino demais
// ============================================================================
//
// Costa real tem detalhes de largura zero — línguas de terra que afinam até virar um fio,
// e braços de mar que quase se fecham. No mapa isso vira dois defeitos ao mesmo tempo:
//
//   - O "rabinho": a terra afina até acabar num fio, e fica feio.
//   - A gota: duas margens quase se tocam e PARECEM ligadas, mas o corredor é mais
//     estreito que o grupo. O jogador vê terra contínua e não consegue passar — que é o
//     pior tipo de defeito, porque parece bug do jogo e não geografia.
//
// A cura é morfologia clássica sobre a máscara, feita aqui na origem: tudo mais (pintura,
// navegação, altitude, rios, árvores) é derivado dela e herda a correção de graça.

/** Fecha canais de água mais estreitos que 2× isto. Vira ponte de terra caminhável. */
const RAIO_FECHAMENTO = 6;
/** Remove línguas de terra mais estreitas que 2× isto. Menor que o fechamento, pra as
 *  pontes recém-criadas não serem desfeitas em seguida. */
const RAIO_ABERTURA = 3;
/** Quanto a borda de um recorte autoral ondula, em unidades de mundo. */
const AMPLITUDE_RECORTE = 95;
/** Comprimento de onda dessa ondulação. */
const ONDA_RECORTE = 520;

/** Engorda a terra: água a menos de `raio` de terra vira terra. */
function dilatar(mascara: Uint8Array, resolucao: number, raio: number): Uint8Array {
  const d = distanciaDaCosta(mascara, resolucao);
  const saida = new Uint8Array(mascara.length);
  for (let i = 0; i < mascara.length; i++) saida[i] = d[i]! > -raio ? 1 : 0;
  return saida;
}

/** Encolhe a terra: só continua terra o que está a mais de `raio` da água. */
function erodir(mascara: Uint8Array, resolucao: number, raio: number): Uint8Array {
  const d = distanciaDaCosta(mascara, resolucao);
  const saida = new Uint8Array(mascara.length);
  for (let i = 0; i < mascara.length; i++) saida[i] = d[i]! > raio ? 1 : 0;
  return saida;
}

function limparIstmos(mascara: Uint8Array, resolucao: number): Uint8Array {
  // fechar primeiro: engorda e volta ao tamanho, mas o que se juntou fica junto
  const fechado = erodir(dilatar(mascara, resolucao, RAIO_FECHAMENTO), resolucao, RAIO_FECHAMENTO);
  // abrir depois: encolhe e volta, mas o que era fio já morreu no encolhimento
  return dilatar(erodir(fechado, resolucao, RAIO_ABERTURA), resolucao, RAIO_ABERTURA);
}

/**
 * Recortes autorais: onde o desenhista manda ter mar, tem mar.
 *
 * O gerador produz geografia plausível, não geografia BOA. Às vezes duas massas de terra
 * se emendam num canto e o mar central deixa de ser mar; às vezes falta um estreito onde
 * o jogo precisa de um gargalo. Isto é a última palavra sobre a máscara — vem depois de
 * toda a limpeza automática, senão o fechamento de istmos refecharia o que se abriu.
 */
function esculpirMar(
  mascara: Uint8Array,
  recortes: readonly Anel[],
  resolucao: number,
  tamanhoMundo: number,
): Uint8Array {
  if (recortes.length === 0) return mascara;
  const escala = resolucao / tamanhoMundo;

  // A borda do polígono é reta, e costa reta denuncia a mão do desenhista na hora. Em vez
  // de suavizar depois (o que refecharia o corte), a gente empurra o PONTO DE TESTE por um
  // campo de ruído: o polígono continua sendo um polígono, mas o litoral que ele produz
  // sai ondulado como qualquer outro.
  const ondaX = createNoise2D(ruidoSemente(15_881));
  const ondaY = createNoise2D(ruidoSemente(62_119));

  for (const recorte of recortes) {
    if (recorte.length < 3) continue;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const [x, y] of recorte) {
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
    const inicioX = Math.max(0, Math.floor(x0 * escala));
    const fimX = Math.min(resolucao - 1, Math.ceil(x1 * escala));
    const inicioY = Math.max(0, Math.floor(y0 * escala));
    const fimY = Math.min(resolucao - 1, Math.ceil(y1 * escala));

    for (let py = inicioY; py <= fimY; py++) {
      const y = (py + 0.5) / escala;
      for (let px = inicioX; px <= fimX; px++) {
        const bruto = (px + 0.5) / escala;
        const u = bruto / ONDA_RECORTE;
        const v = y / ONDA_RECORTE;
        const x = bruto + ondaX(u, v) * AMPLITUDE_RECORTE;
        const yOndulado = y + ondaY(u, v) * AMPLITUDE_RECORTE;
        let dentro = false;
        for (let i = 0, j = recorte.length - 1; i < recorte.length; j = i++) {
          const a = recorte[i]!;
          const b = recorte[j]!;
          if (
            a[1] > yOndulado !== b[1] > yOndulado &&
            x < ((b[0] - a[0]) * (yOndulado - a[1])) / (b[1] - a[1]) + a[0]
          ) {
            dentro = !dentro;
          }
        }
        if (dentro) mascara[py * resolucao + px] = 0;
      }
    }
  }
  return mascara;
}
