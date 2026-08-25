/**
 * A corrupção lida na partida: a fórmula pura de `corrupcao.ts` aplicada ao mundo vivo.
 *
 * A distância é medida da capital do DONO ATUAL, pelo grafo de vizinhança — conquista
 * muda a conta na hora, e mudar a capital muda a renda do reino inteiro. Sem capital
 * (transição rara) ou sem caminho por terra, vale a distância `semCaminho` do ajuste:
 * governo ausente cobra como o canto mais distante do mapa.
 */

import { alivioDasObras, corrupcaoDe, saltosDesde } from '../corrupcao';
import type { Corrupcao } from '../corrupcao';
import type { NucleoDaCampanha } from '../nucleo';
import { construcoesEm, donoDe, nivelDaConstrucaoEm, populacaoDe } from '../provincia/consultas';

/** A corrupção desta província, decomposta: tamanho, distância da capital e o total. */
export function corrupcaoEm(nucleo: NucleoDaCampanha, idProvincia: string): Corrupcao {
  const capital = nucleo.estado.capitais[donoDe(nucleo, idProvincia)];
  const saltos =
    capital === undefined
      ? nucleo.ajustes.corrupcao.distancia.semCaminho
      : (saltosDesdeACapital(nucleo, capital).get(idProvincia) ??
        nucleo.ajustes.corrupcao.distancia.semCaminho);
  const erguidas = Object.fromEntries(
    construcoesEm(nucleo, idProvincia).map((id) => [
      id,
      nivelDaConstrucaoEm(nucleo, idProvincia, id),
    ]),
  );
  return corrupcaoDe(
    populacaoDe(nucleo, idProvincia),
    saltos,
    nucleo.ajustes.corrupcao,
    alivioDasObras(erguidas, nucleo.catalogo),
  );
}

function saltosDesdeACapital(
  nucleo: NucleoDaCampanha,
  capital: string,
): ReadonlyMap<string, number> {
  const guardado = nucleo.saltosPorCapital.get(capital);
  if (guardado) return guardado;
  const calculado = saltosDesde(capital, (id) => nucleo.atlas.provincia(id).vizinhas);
  nucleo.saltosPorCapital.set(capital, calculado);
  return calculado;
}
