/**
 * Põe as forças sobreviventes no chão, fundindo as do mesmo poder que pararam juntas.
 *
 * Fundir e POLITICA, nao obrigacao da estrutura: duas hostes ja cabem no mesmo lugar. A que
 * fica e a de menor id, pra que o resultado nao dependa de quem chegou primeiro.
 */

import { exercitoVazio, somarLeva } from '@/combate/exercito';
import { soma } from './forcas';
import type { Forca } from './forcas';
import type { EstadoDaResolucao, RelatorioEmConstrucao } from './relatorio';

export function pousar(
  estado: EstadoDaResolucao,
  forcas: readonly Forca[],
  marchas: RelatorioEmConstrucao['marchas'],
): ReadonlyMap<Forca, string> {
  const identidadeAoPousar = new Map<Forca, string>();
  for (const forca of forcas) {
    if (!forca.viva || soma(forca.contingentes) === 0) continue;
    const juntas = Object.keys(estado.hostes)
      .sort()
      .map((id) => estado.hostes[id])
      .find((h) => h !== undefined && h.posicao === forca.posicao && h.poder === forca.poder);
    const naChegada = juntas ?? exercitoVazio(forca.hoste, forca.poder, forca.posicao);
    // Cada contingente entra com a arma e o treino que trouxe: fundir por terra só, como
    // era antes, faria o hoplita chegar como leve do outro lado da marcha.
    for (const c of forca.contingentes) {
      somarLeva(naChegada, c.terra, c.homens, c.arma, c.qualidade);
    }
    estado.hostes[naChegada.id] = naChegada;
    identidadeAoPousar.set(forca, naChegada.id);
    if (forca.posicao !== forca.partiuDe) {
      // `rota` é o plano inteiro e `posicao` é onde a força de fato parou — quem foi barrado
      // num choque na estrada parou antes do fim. Cortar a rota na posição atual é o que faz a
      // trilha ser o andado, e não o pretendido.
      const andados = forca.rota.indexOf(forca.posicao);
      marchas.push({
        // O id de quem FICOU de pe aqui — fundida ou nao, e ela que o mapa desenha. Era a
        // provincia de chegada, e isso deixou de identificar a peca no dia em que duas hostes
        // passaram a poder parar no mesmo lugar.
        hoste: naChegada.id,
        trilha: [forca.partiuDe, ...forca.rota.slice(0, andados + 1)],
        homens: soma(forca.contingentes),
      });
    }
  }
  return identidadeAoPousar;
}
