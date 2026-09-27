/**
 * O que acontece com os EXÉRCITOS quando a diplomacia muda o mapa sem batalha.
 *
 * Duas situações, as duas decididas por Henrique em 27/09/2026:
 *
 * 1. **A paz manda a tropa para casa.** Quem estava acampado na terra do ex-inimigo ficava lá
 *    para sempre: a paz levanta o cerco, mas a única saída da hoste podia ser terra em paz com
 *    ela — e terra em paz não se atravessa. Medido numa partida: Epidauro presa dentro de
 *    Cinúria do turno 7 ao 62. Agora ela volta à terra própria mais próxima, como na paz de
 *    qualquer jogo de grande estratégia.
 * 2. **A anexação entrega a tropa ao chefe da liga.** As províncias do membro passavam ao
 *    chefe e os exércitos dele ficavam para trás, sem terra, sem folha e sem guerra, morrendo
 *    aos poucos dentro da antiga capital.
 */

import type { NucleoDaCampanha } from '../nucleo';
import { donoDe } from '../provincia/consultas';

/**
 * A terra própria mais próxima desta província, andando pelo mapa inteiro — terra e mar —,
 * ou `undefined` para quem não tem chão nenhum (o exílio continua sendo exílio).
 */
function casaMaisProxima(
  nucleo: NucleoDaCampanha,
  idPoder: string,
  desde: string,
): string | undefined {
  const minhas = new Set(nucleo.territorios.provinciasDe(idPoder));
  if (minhas.size === 0) return undefined;
  const vistos = new Set([desde]);
  let fronteira = [desde];
  while (fronteira.length > 0) {
    const proxima: string[] = [];
    // Ordenado por id em cada anel: com duas casas à mesma distância, ganha sempre a mesma.
    for (const id of fronteira.sort()) {
      for (const vizinha of [...nucleo.atlas.vizinhasDe(id)].sort()) {
        if (vistos.has(vizinha)) continue;
        if (minhas.has(vizinha)) return vizinha;
        vistos.add(vizinha);
        proxima.push(vizinha);
      }
    }
    fronteira = proxima;
  }
  return undefined;
}

/** Tira do caminho a ordem e a surtida desta hoste: ela não está mais onde as deu. */
function esquecerOrdens(nucleo: NucleoDaCampanha, idHoste: string): void {
  delete nucleo.estado.ordens[idHoste];
  nucleo.estado.surtidas = nucleo.estado.surtidas.filter((id) => id !== idHoste);
}

/** Depois da paz entre `a` e `b`, cada um recolhe a tropa que pisava na terra do outro. */
export function repatriarDepoisDaPaz(nucleo: NucleoDaCampanha, a: string, b: string): void {
  for (const hoste of Object.values(nucleo.estado.hostes)) {
    const outro = hoste.poder === a ? b : hoste.poder === b ? a : null;
    if (outro === null || nucleo.atlas.ehMar(hoste.posicao)) continue;
    if (donoDe(nucleo, hoste.posicao) !== outro) continue;
    const casa = casaMaisProxima(nucleo, hoste.poder, hoste.posicao);
    if (casa === undefined) continue;
    hoste.posicao = casa;
    esquecerOrdens(nucleo, hoste.id);
  }
}

/** Na anexação, as hostes e as levas em formação do membro passam a ser do chefe. */
export function herdarTropasDoMembro(
  nucleo: NucleoDaCampanha,
  membro: string,
  chefe: string,
): void {
  for (const hoste of Object.values(nucleo.estado.hostes)) {
    if (hoste.poder !== membro) continue;
    hoste.poder = chefe;
    esquecerOrdens(nucleo, hoste.id);
  }
  for (const formacao of Object.values(nucleo.estado.formacoes)) {
    if (formacao.poder === membro) formacao.poder = chefe;
  }
}
