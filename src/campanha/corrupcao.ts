/**
 * A corrupção: o que se perde entre o campo e o tesouro.
 *
 * É o freio que impede o imposto de crescer em linha reta com a população — sem ele, uma
 * província de 100.000 habitantes renderia o dobro de uma de 50.000 e o dinheiro deixaria
 * de ser decisão — e é o canal por onde a DISTÂNCIA DA CAPITAL entra na economia: a
 * província no fim do mundo é pobre duas vezes.
 *
 * A fórmula é a do GDD, e as duas fatias se compõem sem teto artificial:
 *
 *     corrupção = 1 − (1 − por tamanho) × (1 − por distância)
 *     imposto   = população × taxa × (1 − corrupção)
 *
 * Cada fatia é uma hipérbole saturante — `teto × x / (x + meio)` — porque ela responde às
 * três exigências do desenho com um número de cada: nada abaixo do limiar, crescimento
 * depois dele, e saturação sozinha, sem degrau. Os valores em `dados/ajustes.json`
 * reproduzem a tabela de calibração do GDD na distância (0,8× a 3 saltos, 0,6× a 12) e a
 * ordem de grandeza no tamanho.
 *
 * ⚠️ **Corrupção é consequência, nunca recurso.** Não há barra para administrá-la nem
 * número para comprar de volta: quem a muda é mudar a capital — e, no futuro, Ágora e
 * estrada. Cada sistema novo entra NESTA conta em vez de inventar o próprio modificador.
 */

import type { Ajustes } from '@/dados/esquema';

export type AjustesCorrupcao = Ajustes['jogo']['corrupcao'];

/** As duas fatias e o total, para a interface explicar o número em vez de só cobrá-lo. */
export interface Corrupcao {
  /** Fração perdida por tamanho da população. 0 abaixo do limiar. */
  porTamanho: number;
  /** Fração perdida pela distância da capital, em saltos. 0 na própria capital. */
  porDistancia: number;
  /** A composição das duas: `1 − (1−tamanho) × (1−distância)`. Nunca chega a 1. */
  total: number;
  /** Saltos até a capital que a conta usou. */
  saltos: number;
}

/** Quanto se perde no caminho por haver gente DEMAIS para uma administração arcaica. */
export function corrupcaoPorTamanho(
  populacao: number,
  ajustes: AjustesCorrupcao['tamanho'],
): number {
  const excesso = Math.max(0, populacao - ajustes.limiar);
  if (excesso === 0) return 0;
  return ajustes.teto * (excesso / (excesso + ajustes.meiaPopulacao));
}

/** Quanto se perde por cada salto entre a província e a capital. */
export function corrupcaoPorDistancia(
  saltos: number,
  ajustes: AjustesCorrupcao['distancia'],
): number {
  if (saltos <= 0) return 0;
  return ajustes.teto * (saltos / (saltos + ajustes.meioCaminho));
}

/** A conta composta do GDD: cada fatia come uma parte do que a outra deixou. */
export function corrupcaoDe(
  populacao: number,
  saltos: number,
  ajustes: AjustesCorrupcao,
): Corrupcao {
  const porTamanho = corrupcaoPorTamanho(populacao, ajustes.tamanho);
  const porDistancia = corrupcaoPorDistancia(saltos, ajustes.distancia);
  return {
    porTamanho,
    porDistancia,
    total: 1 - (1 - porTamanho) * (1 - porDistancia),
    saltos,
  };
}

/**
 * Distância em saltos de UMA origem para todas as províncias alcançáveis.
 *
 * Busca em largura sobre o grafo de vizinhança, que é GEOGRAFIA e não política: a
 * corrupção mede o caminho físico até a capital, e um exército inimigo no meio não torna
 * a estrada mais comprida — torna-a perigosa, que é assunto de outro sistema. Ilha sem
 * ponte fica FORA do mapa devolvido; quem pergunta decide o que a ausência significa.
 */
export function saltosDesde(
  origem: string,
  vizinhasDe: (id: string) => readonly string[],
): ReadonlyMap<string, number> {
  const distancias = new Map<string, number>([[origem, 0]]);
  const fila = [origem];
  for (let i = 0; i < fila.length; i++) {
    const atual = fila[i];
    if (atual === undefined) break;
    const daqui = distancias.get(atual) ?? 0;
    for (const vizinha of vizinhasDe(atual)) {
      if (distancias.has(vizinha)) continue;
      distancias.set(vizinha, daqui + 1);
      fila.push(vizinha);
    }
  }
  return distancias;
}
