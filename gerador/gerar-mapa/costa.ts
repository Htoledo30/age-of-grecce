/**
 * A costa real da Grécia antiga: baixar, recortar na janela e transformar em anéis.
 *
 * Fonte: Natural Earth 1:10m, domínio público. O arquivo é grande e o download é lento, e
 * por isso ele fica em cache — regerar o mapa não pode depender de rede.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { area, recortarRetangulo, simplificar, suavizar } from './geometria';
import type { Anel, Colecao } from './geometria';
import {
  ALTURA_MAPA,
  AREA_MINIMA_KM2,
  AREA_MINIMA_UNIDADES,
  CACHE,
  FONTE,
  KM_POR_UNIDADE,
  LIMITES_FOLGADOS,
  MARGEM,
  PASSOS_SUAVIZACAO,
  RECORTES,
  TAMANHO,
  TOLERANCIA_SILHUETA,
  projetar,
} from './moldura';

export async function carregarCosta(): Promise<Colecao> {
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

/**
 * Recorta, projeta, apaga o que é pequeno demais pra ser lugar, e limpa a silhueta.
 * Devolve os anéis já em unidades de mundo, do maior pro menor.
 *
 * A costa sai da Natural Earth e chega ao mapa INTACTA: nada de espelhar, girar ou
 * distorcer. O jogo é sobre a Grécia antiga, então a forma tem que ser a que o jogador
 * reconhece — o Peloponeso com seus quatro dedos, a Ática apontando pra Eubeia, Creta
 * fechando o Egeu por baixo.
 */
export function extrairAneis(colecao: Colecao): Anel[] {
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
export function inventario(aneis: Anel[], quantas: number): void {
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

/**
 * Recortes autorais do mar. Ficam em dados/ e não no código de propósito: são conteúdo,
 * é você que decide onde abrir estreito, e um editor futuro mexe neste arquivo.
 */
export function carregarRecortes(): Anel[] {
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
