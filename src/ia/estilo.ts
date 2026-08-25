/**
 * QUEM é a IA de cada poder.
 *
 * Uma pergunta só — *"como este poder joga?"* — e a resposta vem de `dados/ia.json`. É a
 * mesma regra do balanço: **nenhum número de comportamento no código**. Trocar Esparta de
 * guerreira para mercadora tem que ser editar um JSON, e comparar dois estilos tem que ser
 * comparar dois blocos lado a lado.
 *
 * ⚠️ **Poder sem estilo escrito usa o padrão, e isso não é descuido.** São 139 poderes no
 * mapa e 18 com economia; escrever um estilo para cada um seria dado sem decisão dentro. O
 * arquivo carrega os que têm identidade — Corinto mercadora, Tebas guerreira — e o resto
 * joga equilibrado até alguém ter motivo para diferenciá-los.
 */

import type { EstiloDeIa, Ia } from '@/dados/esquema';

/** O estilo com que este poder joga. Nunca falha: cai no padrão do arquivo. */
export function estiloDe(dados: Ia, idPoder: string): EstiloDeIa {
  const escolhido = dados.porPoder[idPoder] ?? dados.padrao;
  const estilo = dados.estilos[escolhido] ?? dados.estilos[dados.padrao];
  if (!estilo) {
    // O esquema garante que `padrao` existe como string, não que ele aponte para um estilo.
    // Falhar alto aqui é melhor que uma IA silenciosamente sem personalidade nenhuma.
    throw new Error(`dados/ia.json: o estilo padrão "${dados.padrao}" não existe`);
  }
  return estilo;
}

/** O nome do estilo, para a ferramenta de partida dizer quem é quem. */
export function nomeDoEstiloDe(dados: Ia, idPoder: string): string {
  return dados.porPoder[idPoder] ?? dados.padrao;
}
