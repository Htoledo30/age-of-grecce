/**
 * Benefícios secundários das construções, declarados no catálogo e lidos pelo nível erguido.
 *
 * O efeito principal continua na união `efeito`. Estes campos são capacidades independentes:
 * a Muralha compra tempo além de reforçar a milícia, a Estrada abastece tropa além de aliviar
 * corrupção e o Templo recupera ordem além de elevar o alvo do humor.
 */

import type { Construcoes } from '@/dados/esquema';

type Catalogo = Construcoes['construcoes'];
type Erguidas = Readonly<Record<string, number>>;

function noNivel(valores: readonly number[] | undefined, nivel: number): number {
  return valores?.[Math.max(0, Math.min(2, nivel - 1))] ?? 0;
}

/** Maior desconto local da folha. Obras diferentes não somam descontos sem uma decisão. */
export function descontoDaFolhaEmCasa(catalogo: Catalogo, erguidas: Erguidas): number {
  let desconto = 0;
  for (const [id, nivel] of Object.entries(erguidas)) {
    desconto = Math.max(desconto, noNivel(catalogo[id]?.descontoDaFolhaEmCasa, nivel));
  }
  return desconto;
}

/** Pontos extras por turno enquanto o humor está se recuperando. */
export function recuperacaoDaOrdem(catalogo: Catalogo, erguidas: Erguidas): number {
  let bonus = 0;
  for (const [id, nivel] of Object.entries(erguidas)) {
    bonus = Math.max(bonus, noNivel(catalogo[id]?.recuperacaoDaOrdem, nivel));
  }
  return bonus;
}

/** Quantas rodadas a fortificação mais forte da província exige antes do assalto. */
export function rodadasParaAssaltar(catalogo: Catalogo, erguidas: Erguidas): number {
  let rodadas = 0;
  for (const [id, nivel] of Object.entries(erguidas)) {
    rodadas = Math.max(rodadas, noNivel(catalogo[id]?.rodadasParaAssaltar, nivel));
  }
  return rodadas;
}
