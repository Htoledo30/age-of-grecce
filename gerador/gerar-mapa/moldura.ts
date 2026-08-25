/**
 * A MOLDURA do mundo: o recorte geográfico, o tamanho em unidades, e a projeção entre os
 * dois.
 *
 * ⚠️ Estes números são o contrato do mapa inteiro. Mudou a janela, recalcule — a
 * `conferirProporcao()` estoura e diz o número certo, em vez de deixar a Grécia sair
 * esticada sem ninguém perceber.
 */

import { resolve } from 'node:path';
import type { Ponto } from './geometria';

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
export const TAMANHO = 12288;
export const ALTURA_MAPA = 8256;
export const RESOLUCAO_ARTE = 6144;
export const MARGEM = 48;
export const LARGURA_FAIXA_COSTEIRA = 44;
export const LARGURA_LINHA_COSTEIRA = 10;
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
export const LIMITES = { oeste: 18.7, leste: 32.4, sul: 34.5, norte: 41.7 } as const;
/**
 * Longitude encolhe conforme se sobe: um grau de longitude a 38°N vale cos(38°) de um
 * grau no equador. Sem este fator o Egeu sai esticado 27% no sentido leste-oeste, e o
 * Peloponeso deixa de ter a forma que todo mundo reconhece.
 */
const LATITUDE_REFERENCIA = (LIMITES.sul + LIMITES.norte) / 2;
const ENCOLHIMENTO_LONGITUDE = Math.cos((LATITUDE_REFERENCIA * Math.PI) / 180);
/** Corte grosseiro com folga: a suavizacao precisa de terra alem da moldura pra morder. */
const FOLGA_GRAUS = 0.6;
export const LIMITES_FOLGADOS = {
  oeste: LIMITES.oeste - FOLGA_GRAUS,
  leste: LIMITES.leste + FOLGA_GRAUS,
  sul: LIMITES.sul - FOLGA_GRAUS,
  norte: LIMITES.norte + FOLGA_GRAUS,
} as const;

/** Quilômetros por unidade de mundo: 1.199 km de janela em 12.192 unidades úteis. */
export const KM_POR_UNIDADE = 0.0983;
/**
 * Num jogo de província, ilha pequena É lugar: Salamina tem 96 km², Egina 87, Ítaca 96,
 * Tera 76, Delos 3,4. Cortar em 120 km² como antes apagava metade da história do Egeu.
 * O piso agora só varre pedra sem nome — e as poucas ilhas sagradas miúdas demais pra
 * sobreviver a ele entram depois, na mão, junto com as províncias.
 */
export const AREA_MINIMA_KM2 = 10;
export const AREA_MINIMA_UNIDADES = AREA_MINIMA_KM2 / (KM_POR_UNIDADE * KM_POR_UNIDADE);
/**
 * Detalhe abaixo disso vira serrilha no tamanho do mapa. Em unidades de mundo.
 *
 * Baixo de propósito: ~590 m. Num jogo de província, Salamina e Egina são províncias, e
 * com tolerância de continente elas saíam com cara de retângulo.
 */
export const TOLERANCIA_SILHUETA = 5;
export const PASSOS_SUAVIZACAO = 2;
/** Resolucao da arte do terreno. 12288 unidades de mundo em 6144 px = 2 unidades por pixel. */
export const RESOLUCAO_TERRENO = 6144;
export const RESOLUCAO_ALTURA = (RESOLUCAO_TERRENO * ALTURA_MAPA) / TAMANHO;
export const FONTE =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_land.geojson';
export const CACHE = resolve('gerador/cache/ne_10m_land.geojson');
export const RECORTES = resolve('dados/mar-esculpido.json');
export const PASTA_SAIDA = resolve('assets/mundo');

export function conferirProporcao(): void {
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
export function projetar([lon, lat]: Ponto): Ponto {
  const u = (lon - LIMITES.oeste) / (LIMITES.leste - LIMITES.oeste);
  const v = (LIMITES.norte - lat) / (LIMITES.norte - LIMITES.sul);
  return [MARGEM + u * (TAMANHO - MARGEM * 2), MARGEM + v * (ALTURA_MAPA - MARGEM * 2)];
}

