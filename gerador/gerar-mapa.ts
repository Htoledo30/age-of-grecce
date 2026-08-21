/**
 * Gera o mapa FIXO do jogo a partir da costa real da Grécia antiga.
 *
 * O resultado é salvo em assets/mundo e carregado pelo jogo como qualquer arte.
 * Nada é gerado durante uma partida. Ruído serve somente como textura visual.
 * Fonte da costa: Natural Earth 1:10m, domínio público.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { PNG } from 'pngjs';

import { gerarHidrologia, pintarHidrologia } from './hidrologia';
import type { Hidrologia } from './hidrologia';
import { BIOMAS, espalharDetalhes, pintarTerreno } from './pintar-terreno';

type Ponto = [number, number];
type Anel = Ponto[];
type Poligono = Anel[];
type Geometria =
  { type: 'Polygon'; coordinates: Poligono } | { type: 'MultiPolygon'; coordinates: Poligono[] };
type Colecao = { features: Array<{ geometry: Geometria | null }> };

/**
 * Moldura panorâmica: 12288 x 8256, proporção 1,50 contra os 1,78 do palco.
 *
 * Não dá pra chegar a 16:9 cheio sem estragar o mapa: a oeste, o primeiro pedaço de
 * terra depois da Grécia é o calcanhar da Itália, que entra solto e ridículo do outro
 * lado de um mar vazio; a leste, o planalto da Anatólia, que é uma laje sem recorte.
 * A sobra dos lados é resolvida no jogo, pintando o fundo da cor do mar fundo — aí a
 * borda lê como mar aberto em vez de moldura de quadro.
 *
 * A altura NÃO é escolhida à toa: é ela que faz o mundo caber sem esticar a geografia.
 * Mudou a janela, recalcule — `conferirProporcao()` estoura e diz o número certo.
 */
const TAMANHO = 12288;
const ALTURA_MAPA = 8256;
const RESOLUCAO_ARTE = 6144;
const MARGEM = 48;
const LARGURA_FAIXA_COSTEIRA = 44;
const LARGURA_LINHA_COSTEIRA = 10;
/**
 * O mundo grego, com o Egeu no meio do quadro. Cada borda existe por causa de um lugar:
 *
 * oeste 18,7 — Córcira e a costa do Epiro. Passa RENTE a Otranto (18,52), a ponta mais
 *              a leste da Itália: um grau a menos e o calcanhar italiano entra no canto
 *              do mapa, solto do outro lado de um mar vazio.
 * leste 32,4 — Sardes, a Jônia e, inteiros, o Helesponto e o Bósforo, com terra nas duas
 *              margens: é por ali que passava o trigo do Ponto que alimentava Atenas, e
 *              é o gargalo mais disputado do mundo antigo.
 * sul  34,5 — Creta com folga.
 * norte 41,7 — Macedônia e a Trácia.
 */
const LIMITES = { oeste: 18.7, leste: 32.4, sul: 34.5, norte: 41.7 } as const;
/**
 * Longitude encolhe conforme se sobe: um grau de longitude a 38°N vale cos(38°) de um
 * grau no equador. Sem este fator o Egeu sai esticado 27% no sentido leste-oeste, e o
 * Peloponeso deixa de ter a forma que todo mundo reconhece.
 */
const LATITUDE_REFERENCIA = (LIMITES.sul + LIMITES.norte) / 2;
const ENCOLHIMENTO_LONGITUDE = Math.cos((LATITUDE_REFERENCIA * Math.PI) / 180);
/** Corte grosseiro com folga: a suavizacao precisa de terra alem da moldura pra morder. */
const FOLGA_GRAUS = 0.6;
const LIMITES_FOLGADOS = {
  oeste: LIMITES.oeste - FOLGA_GRAUS,
  leste: LIMITES.leste + FOLGA_GRAUS,
  sul: LIMITES.sul - FOLGA_GRAUS,
  norte: LIMITES.norte + FOLGA_GRAUS,
} as const;

/** Quilômetros por unidade de mundo: 1.199 km de janela em 12.192 unidades úteis. */
const KM_POR_UNIDADE = 0.0983;
/**
 * Num jogo de província, ilha pequena É lugar: Salamina tem 96 km², Egina 87, Ítaca 96,
 * Tera 76, Delos 3,4. Cortar em 120 km² como antes apagava metade da história do Egeu.
 * O piso agora só varre pedra sem nome — e as poucas ilhas sagradas miúdas demais pra
 * sobreviver a ele entram depois, na mão, junto com as províncias.
 */
const AREA_MINIMA_KM2 = 10;
const AREA_MINIMA_UNIDADES = AREA_MINIMA_KM2 / (KM_POR_UNIDADE * KM_POR_UNIDADE);
/**
 * Detalhe abaixo disso vira serrilha no tamanho do mapa. Em unidades de mundo.
 *
 * Baixo de propósito: ~590 m. Num jogo de província, Salamina e Egina são províncias, e
 * com tolerância de continente elas saíam com cara de retângulo.
 */
const TOLERANCIA_SILHUETA = 5;
const PASSOS_SUAVIZACAO = 2;
/** Resolucao da arte do terreno. 12288 unidades de mundo em 6144 px = 2 unidades por pixel. */
const RESOLUCAO_TERRENO = 6144;
const RESOLUCAO_ALTURA = (RESOLUCAO_TERRENO * ALTURA_MAPA) / TAMANHO;
const FONTE =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_land.geojson';
const CACHE = resolve('gerador/cache/ne_10m_land.geojson');
const RECORTES = resolve('dados/mar-esculpido.json');
const PASTA_SAIDA = resolve('assets/mundo');

async function carregarCosta(): Promise<Colecao> {
  if (existsSync(CACHE)) return JSON.parse(readFileSync(CACHE, 'utf8')) as Colecao;
  const resposta = await fetch(FONTE);
  if (!resposta.ok) throw new Error(`falha ao baixar costa: HTTP ${resposta.status}`);
  const texto = await resposta.text();
  mkdirSync(dirname(CACHE), { recursive: true });
  writeFileSync(CACHE, texto);
  return JSON.parse(texto) as Colecao;
}

/**
 * Descarte barato: o anel encosta na nossa janela?
 *
 * Só serve pra jogar fora o resto do planeta. O corte de verdade acontece uma única vez,
 * depois da suavização — ver `extrairAneis`.
 */
function encostaNaJanela(anel: Anel): boolean {
  let oeste = Infinity;
  let leste = -Infinity;
  let sul = Infinity;
  let norte = -Infinity;
  for (const [lon, lat] of anel) {
    if (lon < oeste) oeste = lon;
    if (lon > leste) leste = lon;
    if (lat < sul) sul = lat;
    if (lat > norte) norte = lat;
  }
  return (
    leste >= LIMITES_FOLGADOS.oeste &&
    oeste <= LIMITES_FOLGADOS.leste &&
    norte >= LIMITES_FOLGADOS.sul &&
    sul <= LIMITES_FOLGADOS.norte
  );
}

/**
 * Confere que a moldura não está mentindo sobre a forma da Grécia.
 *
 * Um quilômetro tem que valer o mesmo número de unidades nos dois eixos. Se ALTURA_MAPA
 * não acompanhar a janela, o mapa continua gerando — só que com a península esticada, e
 * isso é o tipo de erro que ninguém vê olhando e todo mundo sente jogando.
 */
function conferirProporcao(): void {
  const KM_POR_GRAU = 111.2;
  const larguraKm = (LIMITES.leste - LIMITES.oeste) * KM_POR_GRAU * ENCOLHIMENTO_LONGITUDE;
  const alturaKm = (LIMITES.norte - LIMITES.sul) * KM_POR_GRAU;
  const kmPorUnidadeX = larguraKm / (TAMANHO - MARGEM * 2);
  const kmPorUnidadeY = alturaKm / (ALTURA_MAPA - MARGEM * 2);
  const erro = Math.abs(kmPorUnidadeX - kmPorUnidadeY) / kmPorUnidadeX;
  console.log(
    `janela: ${larguraKm.toFixed(0)} x ${alturaKm.toFixed(0)} km em ${TAMANHO} x ${ALTURA_MAPA} ` +
      `unidades — ${(kmPorUnidadeX * 1000).toFixed(0)} m por unidade, ` +
      `distorção ${(erro * 100).toFixed(2)}%`,
  );
  if (erro > 0.01) {
    throw new Error(
      `moldura desproporcional: ajuste ALTURA_MAPA para ${Math.round(
        (TAMANHO - MARGEM * 2) * (alturaKm / larguraKm) + MARGEM * 2,
      )}`,
    );
  }
}

/**
 * Equirretangular com paralelo de referência no meio da janela: cada eixo preenche a
 * moldura inteira, e é ALTURA_MAPA que carrega a proporção verdadeira. Antes os dois
 * eixos dividiam o mesmo comprimento e a sobra era cortada — o que só funcionava porque
 * a costa ia ser deformada depois de qualquer jeito.
 */
function projetar([lon, lat]: Ponto): Ponto {
  const u = (lon - LIMITES.oeste) / (LIMITES.leste - LIMITES.oeste);
  const v = (LIMITES.norte - lat) / (LIMITES.norte - LIMITES.sul);
  return [MARGEM + u * (TAMANHO - MARGEM * 2), MARGEM + v * (ALTURA_MAPA - MARGEM * 2)];
}

/** Área do anel em unidades de mundo ao quadrado (fórmula do cadarço). */
function area(anel: Anel): number {
  let soma = 0;
  for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
    const a = anel[i]!;
    const b = anel[j]!;
    soma += (b[0] + a[0]) * (b[1] - a[1]);
  }
  return Math.abs(soma) / 2;
}

function distanciaDaReta(p: Ponto, a: Ponto, b: Ponto): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const comprimento = dx * dx + dy * dy;
  if (comprimento === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / comprimento));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/**
 * Douglas–Peucker: joga fora os pontos que não mudam a silhueta.
 * O Natural Earth tem detalhe de nível de metros; visto no tamanho do mapa isso vira
 * serrilha. Reduzir os pontos é o que faz a costa parar de parecer decalcada.
 */
function simplificar(anel: Anel, tolerancia: number): Anel {
  if (anel.length < 4) return anel;
  const manter = new Uint8Array(anel.length);
  manter[0] = 1;
  manter[anel.length - 1] = 1;
  const pilha: Array<[number, number]> = [[0, anel.length - 1]];

  while (pilha.length > 0) {
    const [inicio, fim] = pilha.pop()!;
    let pior = 0;
    let indice = -1;
    for (let i = inicio + 1; i < fim; i++) {
      const d = distanciaDaReta(anel[i]!, anel[inicio]!, anel[fim]!);
      if (d > pior) {
        pior = d;
        indice = i;
      }
    }
    if (pior > tolerancia && indice > 0) {
      manter[indice] = 1;
      pilha.push([inicio, indice], [indice, fim]);
    }
  }

  const saida: Anel = [];
  for (let i = 0; i < anel.length; i++) if (manter[i]) saida.push(anel[i]!);
  return saida;
}

/** Chaikin: arredonda os cantos que sobraram. Costa desenhada, não traçada. */
function suavizar(anel: Anel, passos: number): Anel {
  let atual = anel;
  for (let p = 0; p < passos; p++) {
    if (atual.length < 3) break;
    const saida: Anel = [];
    for (let i = 0; i < atual.length; i++) {
      const a = atual[i]!;
      const b = atual[(i + 1) % atual.length]!;
      saida.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
      saida.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    atual = saida;
  }
  return atual;
}

function caminho(anel: Anel): string {
  return (
    anel.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ') +
    ' Z'
  );
}

/**
 * Sutherland–Hodgman num retângulo, já em unidades de mundo.
 *
 * É o ÚNICO corte do pipeline, e vem depois da suavização de propósito. Cortar antes
 * cria segmentos artificiais rentes à borda; a suavização não sabe distingui-los de
 * litoral e arredonda os cantos deles, e canto arredondado vira chanfro diagonal
 * atravessando a terra.
 */
function recortarRetangulo(anel: Anel, min: number, maxX: number, maxY: number): Anel {
  const lados = [
    { dentro: (p: Ponto) => p[0] >= min, eixo: 0, valor: min },
    { dentro: (p: Ponto) => p[0] <= maxX, eixo: 0, valor: maxX },
    { dentro: (p: Ponto) => p[1] >= min, eixo: 1, valor: min },
    { dentro: (p: Ponto) => p[1] <= maxY, eixo: 1, valor: maxY },
  ] as const;

  let saida = anel;
  for (const lado of lados) {
    const entrada = saida;
    saida = [];
    if (entrada.length === 0) break;
    let anterior = entrada.at(-1)!;
    for (const atual of entrada) {
      const atualDentro = lado.dentro(atual);
      const anteriorDentro = lado.dentro(anterior);
      if (atualDentro !== anteriorDentro) {
        const e = lado.eixo;
        const o = e === 0 ? 1 : 0;
        const t = (lado.valor - anterior[e]) / (atual[e] - anterior[e]);
        const cruz: Ponto = [0, 0];
        cruz[e] = lado.valor;
        cruz[o] = anterior[o] + (atual[o] - anterior[o]) * t;
        saida.push(cruz);
      }
      if (atualDentro) saida.push(atual);
      anterior = atual;
    }
  }
  return saida;
}

/**
 * Recorta, projeta, apaga o que é pequeno demais pra ser lugar, e limpa a silhueta.
 * Devolve os anéis já em unidades de mundo, do maior pro menor.
 *
 * A costa sai da Natural Earth e chega ao mapa INTACTA: nada de espelhar, girar ou
 * distorcer. O jogo é sobre a Grécia antiga, então a forma tem que ser a que o jogador
 * reconhece — o Peloponeso com seus quatro dedos, a Ática apontando pra Eubeia, Creta
 * fechando o Egeu por baixo.
 */
function extrairAneis(colecao: Colecao): Anel[] {
  const brutos: Anel[] = [];
  for (const feature of colecao.features) {
    if (!feature.geometry) continue;
    const poligonos =
      feature.geometry.type === 'Polygon'
        ? [feature.geometry.coordinates]
        : feature.geometry.coordinates;
    for (const poligono of poligonos) {
      for (const anel of poligono) {
        if (anel.length < 3 || !encostaNaJanela(anel)) continue;
        brutos.push(
          suavizar(simplificar(anel.map(projetar), TOLERANCIA_SILHUETA), PASSOS_SUAVIZACAO),
        );
      }
    }
  }

  // O corte na moldura vem depois da suavização de propósito — ver recortarRetangulo.
  const aneis: Anel[] = [];
  let descartadas = 0;
  for (const anel of brutos) {
    const final = recortarRetangulo(anel, MARGEM, TAMANHO - MARGEM, ALTURA_MAPA - MARGEM);
    if (final.length < 3) continue;
    if (area(final) < AREA_MINIMA_UNIDADES) {
      descartadas++;
      continue;
    }
    aneis.push(final);
  }
  console.log(`ilhas abaixo de ${AREA_MINIMA_KM2} km² descartadas: ${descartadas}`);
  return aneis.sort((a, b) => area(b) - area(a));
}

/** Lista as maiores massas de terra, pra escolhermos as ilhas na mão depois. */
function inventario(aneis: Anel[], quantas: number): void {
  console.log(`\n${aneis.length} massas de terra sobreviveram. As ${quantas} maiores:\n`);
  console.log('   #   área (km²)   centro (unidades)');
  for (const [i, anel] of aneis.slice(0, quantas).entries()) {
    const km2 = area(anel) * KM_POR_UNIDADE * KM_POR_UNIDADE;
    let cx = 0;
    let cy = 0;
    for (const p of anel) {
      cx += p[0];
      cy += p[1];
    }
    cx /= anel.length;
    cy /= anel.length;
    console.log(
      `  ${String(i + 1).padStart(2)}   ${km2.toFixed(0).padStart(9)}   ${cx.toFixed(0)}, ${cy.toFixed(0)}`,
    );
  }
}

function svgMapa(costa: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${RESOLUCAO_ARTE}" height="${RESOLUCAO_ALTURA}" viewBox="0 0 ${TAMANHO} ${ALTURA_MAPA}">
  <defs>
    <linearGradient id="mar" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#879d9a"/><stop offset="1" stop-color="#718986"/>
    </linearGradient>
    <linearGradient id="terra" x1="0" y1="0" x2="0.8" y2="1">
      <stop offset="0" stop-color="#d8c9a5"/><stop offset="1" stop-color="#bfae86"/>
    </linearGradient>
    <pattern id="ondas" width="96" height="96" patternUnits="userSpaceOnUse">
      <path d="M8 52 Q24 44 40 52 T72 52" fill="none" stroke="#e1dac5" stroke-width="3" opacity=".12"/>
    </pattern>
    <pattern id="tracos-terra" width="240" height="200" patternUnits="userSpaceOnUse" patternTransform="rotate(-7)">
      <path d="M18 62 l28 -8 M26 72 l24 -7 M132 140 l30 -9 M141 151 l25 -7" fill="none" stroke="#665a43" stroke-width="2" stroke-linecap="round" opacity=".11"/>
      <circle cx="188" cy="42" r="3" fill="#665a43" opacity=".1"/>
      <circle cx="74" cy="164" r="2.5" fill="#665a43" opacity=".09"/>
    </pattern>
    <filter id="papel" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency=".006 .018" numOctaves="3" seed="73" result="ruido"/>
      <feBlend in="SourceGraphic" in2="ruido" mode="soft-light"/>
    </filter>
  </defs>
  <rect width="${TAMANHO}" height="${ALTURA_MAPA}" fill="url(#mar)"/>
  <rect width="${TAMANHO}" height="${ALTURA_MAPA}" fill="url(#ondas)"/>
  <path d="${costa}" fill="none" stroke="#b6c3b9" stroke-width="${LARGURA_FAIXA_COSTEIRA}" stroke-linejoin="round" stroke-linecap="round" opacity=".65"/>
  <path d="${costa}" fill="url(#terra)" fill-rule="evenodd" stroke="#4b4435" stroke-width="${LARGURA_LINHA_COSTEIRA}" stroke-linejoin="round"/>
  <path d="${costa}" fill="url(#tracos-terra)" fill-rule="evenodd"/>
  <rect width="${TAMANHO}" height="${ALTURA_MAPA}" fill="#b79f72" opacity=".14" filter="url(#papel)"/>
  <rect x="13" y="13" width="${TAMANHO - 26}" height="${ALTURA_MAPA - 26}" fill="none" stroke="#2a2118" stroke-width="8" opacity=".65"/>
</svg>`;
}

function svgNavegacao(costa: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${TAMANHO}" height="${ALTURA_MAPA}" viewBox="0 0 ${TAMANHO} ${ALTURA_MAPA}">
  <rect width="${TAMANHO}" height="${ALTURA_MAPA}" fill="#000"/>
  <path d="${costa}" fill="#fff" fill-rule="evenodd" stroke="#fff" stroke-width="${LARGURA_LINHA_COSTEIRA}" stroke-linejoin="round" stroke-linecap="round"/>
</svg>`;
}

async function main(): Promise<void> {
  conferirProporcao();
  const dados = await carregarCosta();
  const aneis = extrairAneis(dados);
  const costa = aneis.map(caminho).join(' ');
  mkdirSync(PASTA_SAIDA, { recursive: true });
  writeFileSync(resolve(PASTA_SAIDA, 'mapa.svg'), svgMapa(costa));
  writeFileSync(resolve(PASTA_SAIDA, 'navegacao.svg'), svgNavegacao(costa));
  writeFileSync(
    resolve(PASTA_SAIDA, 'mapa.json'),
    JSON.stringify(
      {
        versao: 1,
        fixo: true,
        dimensoes: { largura: TAMANHO, altura: ALTURA_MAPA },
        resolucaoTerreno: RESOLUCAO_TERRENO,
        regiaoReferencia: 'Mundo grego: de Corcira a Sardes, da Macedonia a Creta',
        limitesReferencia: LIMITES,
        fonteCosta: 'Natural Earth 1:10m (dominio publico)',
        arquivosDeDados: {
          navegacao: 'navegacao.png',
          biomas: 'biomas.png',
          altitudeVisual: 'altitude.png',
          altitudeLinear: 'altitude.f32',
          hidrologia: 'hidrologia.json',
        },
      },
      null,
      2,
    ) + '\n',
  );
  console.log(`mapa fixo gerado: ${aneis.length} contornos em ${PASTA_SAIDA}`);

  console.log('pintando o terreno...');
  const terreno = pintarTerreno(aneis, RESOLUCAO_TERRENO, TAMANHO, carregarRecortes());
  const hidrologia = gerarHidrologia(terreno, TAMANHO);
  // Se um curso depender da parte recortada, ele some inteiro em vez de morrer na borda.
  hidrologia.rios = hidrologia.rios.filter((rio) =>
    rio.pontos.every(([, y]) => y < ALTURA_MAPA - MARGEM),
  );
  hidrologia.lagoas = hidrologia.lagoas.filter((lagoa) =>
    lagoa.contorno.every(([, y]) => y < ALTURA_MAPA - MARGEM),
  );
  pintarHidrologia(terreno, hidrologia, TAMANHO);
  writeFileSync(
    resolve(PASTA_SAIDA, 'hidrologia.json'),
    JSON.stringify({
      ...hidrologia,
      rios: hidrologia.rios.map((rio) => ({
        ...rio,
        pontos: rio.pontos.map(([x, y]) => [Math.round(x), Math.round(y)]),
      })),
    }) + '\n',
  );
  escreverPng(
    resolve(PASTA_SAIDA, 'terreno.png'),
    recortarRgba(terreno.pixels),
    RESOLUCAO_TERRENO,
    RESOLUCAO_ALTURA,
  );
  console.log(
    `hidrologia calculada: ${hidrologia.rios.length} rios, ${hidrologia.lagoas.length} lagoas`,
  );

  // A parede invisivel nasce da mesma rasterizacao que pintou a costa. Assim nao existe
  // uma segunda linha, ligeiramente deslocada, disputando onde terra e mar comecam.
  const dadosNavegacao = new Uint8Array(terreno.terra.length * 4);
  for (let i = 0; i < terreno.terra.length; i++) {
    const valor = terreno.terra[i] ? 255 : 0;
    dadosNavegacao[i * 4] = valor;
    dadosNavegacao[i * 4 + 1] = valor;
    dadosNavegacao[i * 4 + 2] = valor;
    dadosNavegacao[i * 4 + 3] = 255;
  }
  // Rio é parede: quem quiser atravessar dá a volta ou usa uma travessia. As travessias
  // NÃO são abertas aqui — ficam em dados/travessias.json e o jogo as aplica em tempo de
  // execução, pra mover uma ponte não exigir regerar o mapa inteiro.
  bloquearHidrologia(dadosNavegacao, hidrologia, RESOLUCAO_TERRENO, TAMANHO);

  escreverPng(
    resolve(PASTA_SAIDA, 'navegacao.png'),
    recortarRgba(dadosNavegacao),
    RESOLUCAO_TERRENO,
    RESOLUCAO_ALTURA,
  );

  // mapa de dados: o índice do bioma vai no canal vermelho, pra o jogo ler depois
  const dadosBioma = new Uint8Array(terreno.biomas.length * 4);
  for (let i = 0; i < terreno.biomas.length; i++) {
    dadosBioma[i * 4] = terreno.biomas[i]!;
    dadosBioma[i * 4 + 3] = 255;
  }
  escreverPng(
    resolve(PASTA_SAIDA, 'biomas.png'),
    recortarRgba(dadosBioma),
    RESOLUCAO_TERRENO,
    RESOLUCAO_ALTURA,
  );

  // Fonte de verdade para hidrologia futura. O PNG e util para inspecao humana; o F32
  // conserva a precisao necessaria para calcular encostas, bacias e cursos de rios.
  const altitudeVisual = new Uint8Array(terreno.altitude.length * 4);
  for (let i = 0; i < terreno.altitude.length; i++) {
    const valor = Math.round(Math.max(0, Math.min(1, terreno.altitude[i]!)) * 255);
    altitudeVisual[i * 4] = valor;
    altitudeVisual[i * 4 + 1] = valor;
    altitudeVisual[i * 4 + 2] = valor;
    altitudeVisual[i * 4 + 3] = 255;
  }
  escreverPng(
    resolve(PASTA_SAIDA, 'altitude.png'),
    recortarRgba(altitudeVisual),
    RESOLUCAO_TERRENO,
    RESOLUCAO_ALTURA,
  );
  writeFileSync(
    resolve(PASTA_SAIDA, 'altitude.f32'),
    Buffer.from(
      terreno.altitude.buffer,
      terreno.altitude.byteOffset,
      RESOLUCAO_TERRENO * RESOLUCAO_ALTURA * Float32Array.BYTES_PER_ELEMENT,
    ),
  );
  console.log(`terreno pintado em ${RESOLUCAO_TERRENO}px — biomas: ${BIOMAS.join(', ')}`);

  const detalhes = espalharDetalhes(terreno, TAMANHO);
  detalhes.arvores = detalhes.arvores.filter(
    ([x, y]) => y < ALTURA_MAPA && longeDosRios(x, y, hidrologia),
  );
  writeFileSync(
    resolve(PASTA_SAIDA, 'detalhes.json'),
    JSON.stringify({ versao: 1, ...detalhes }) + '\n',
  );
  console.log(
    `detalhes espalhados: ${detalhes.arvores.length} arvores, ${detalhes.rochas.length} rochas`,
  );

  inventario(aneis, 25);
}

function escreverPng(caminho: string, pixels: Uint8Array, largura: number, altura: number): void {
  const png = new PNG({ width: largura, height: altura });
  png.data = Buffer.from(pixels.buffer, pixels.byteOffset, pixels.byteLength);
  writeFileSync(caminho, PNG.sync.write(png));
}

/** As linhas superiores são contíguas em memória; não há reamostragem nem deformação. */
function recortarRgba(pixels: Uint8Array): Uint8Array {
  return pixels.subarray(0, RESOLUCAO_TERRENO * RESOLUCAO_ALTURA * 4);
}

function distanciaSegmentoMundo(x: number, y: number, [ax, ay]: Ponto, [bx, by]: Ponto): number {
  const dx = bx - ax;
  const dy = by - ay;
  const quadrado = dx * dx + dy * dy;
  const t =
    quadrado === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / quadrado));
  return Math.hypot(x - (ax + dx * t), y - (ay + dy * t));
}

/** Evita copas e troncos plantados dentro dos canais assados na textura. */
function longeDosRios(x: number, y: number, hidrologia: Hidrologia): boolean {
  const folga = 17;
  for (const rio of hidrologia.rios) {
    for (let i = 1; i < rio.pontos.length; i++) {
      if (distanciaSegmentoMundo(x, y, rio.pontos[i - 1]!, rio.pontos[i]!) < folga) {
        return false;
      }
    }
  }
  return true;
}


/**
 * Apaga da máscara de navegação tudo que é água corrente ou parada.
 *
 * A largura bloqueada acompanha a largura desenhada do rio, com um piso: um curso fino
 * demais na arte continuaria vazando o personagem pelo meio dele, o que pareceria bug.
 */
function bloquearHidrologia(
  navegacao: Uint8Array,
  hidrologia: Hidrologia,
  resolucao: number,
  tamanhoMundo: number,
): void {
  const paraPixel = resolucao / tamanhoMundo;
  const LARGURA_MINIMA = 5;

  const apagar = (cx: number, cy: number, raio: number): void => {
    const inicioX = Math.max(0, Math.floor(cx - raio));
    const fimX = Math.min(resolucao - 1, Math.ceil(cx + raio));
    const inicioY = Math.max(0, Math.floor(cy - raio));
    const fimY = Math.min(resolucao - 1, Math.ceil(cy + raio));
    for (let y = inicioY; y <= fimY; y++) {
      for (let x = inicioX; x <= fimX; x++) {
        if ((x - cx) ** 2 + (y - cy) ** 2 > raio * raio) continue;
        const i = (y * resolucao + x) * 4;
        navegacao[i] = 0;
        navegacao[i + 1] = 0;
        navegacao[i + 2] = 0;
      }
    }
  };

  let bloqueados = 0;
  for (const rio of hidrologia.rios) {
    const raio = Math.max(LARGURA_MINIMA, rio.largura) / 2;
    for (let i = 1; i < rio.pontos.length; i++) {
      const a = rio.pontos[i - 1]!;
      const b = rio.pontos[i]!;
      const ax = a[0] * paraPixel;
      const ay = a[1] * paraPixel;
      const bx = b[0] * paraPixel;
      const by = b[1] * paraPixel;
      const passos = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay)));
      for (let p = 0; p <= passos; p++) {
        const t = p / passos;
        apagar(ax + (bx - ax) * t, ay + (by - ay) * t, raio);
      }
      bloqueados++;
    }
  }

  console.log(`hidrologia bloqueada na navegação: ${bloqueados} trechos de rio`);
}

/**
 * Recortes autorais do mar. Ficam em dados/ e não no código de propósito: são conteúdo,
 * é você que decide onde abrir estreito, e um editor futuro mexe neste arquivo.
 */
function carregarRecortes(): Anel[] {
  if (!existsSync(RECORTES)) return [];
  const bruto = JSON.parse(readFileSync(RECORTES, 'utf8')) as {
    recortes?: Array<{ id?: string; pontos?: Anel }>;
  };
  const saida: Anel[] = [];
  for (const r of bruto.recortes ?? []) {
    if (!r.pontos || r.pontos.length < 3) {
      console.warn(`recorte "${r.id ?? '?'}" ignorado: precisa de pelo menos 3 pontos`);
      continue;
    }
    saida.push(r.pontos);
  }
  if (saida.length > 0) console.log(`recortes autorais de mar: ${saida.length}`);
  return saida;
}


await main();
