/**
 * O choque: quem vence e quantos sobram. **Provisório, e marcado como tal.**
 *
 * Existe porque a fatia do movimento em território inimigo não fecha sem alguma
 * resolução: sem ela, marchar contra uma hoste não teria resultado nenhum. A conta
 * definitiva — falange, frente, moral, veterania, relatório em tabela — é a fatia
 * seguinte, e vai substituir este arquivo inteiro sem tocar em mais nada.
 *
 * ⚠️ **Sem aleatoriedade, e não é preguiça.** A resolução da rodada precisa ser
 * determinística: a mesma rodada com as mesmas ordens tem que dar o mesmo resultado,
 * senão não há salvamento confiável nem teste de regressão. Quando entrar sorte, ela sai
 * de uma semente guardada no estado, nunca de `Math.random()`.
 */

/** O resultado de um choque entre duas forças. */
export interface ResultadoDoChoque {
  /** `null` no aniquilamento mútuo: forças iguais não deixam ninguém em pé. */
  vencedor: 'a' | 'b' | null;
  /** Quantos homens do vencedor continuam de pé. Zero no aniquilamento mútuo. */
  sobreviventes: number;
}

/**
 * Resolve um choque pela lei quadrada.
 *
 *     sobreviventes = √(maior² − menor²)
 *
 * Escolhida entre as candidatas óbvias porque é a única de uma linha que produz a
 * sensação certa: **vitória apertada custa caro, vitória folgada custa pouco.**
 *
 * | encontro | sobrevivem | o que isso diz |
 * |---|---:|---|
 * | 1.000 × 900 | 435 | vencer por pouco é quase perder |
 * | 1.000 × 500 | 866 | vantagem clara sai barato |
 * | 1.000 × 200 | 980 | esmagar quase não custa |
 *
 * "Maior número vence e perde o tanto do menor" (subtração simples) daria 1.000 × 900 →
 * 100 sobreviventes, e 1.000 × 200 → 800: puniria demais o forte e faria toda batalha
 * apertada virar aniquilamento. A lei quadrada foi feita justamente para descrever isso.
 */
export function resolverChoque(a: number, b: number): ResultadoDoChoque {
  if (a <= 0 && b <= 0) return { vencedor: null, sobreviventes: 0 };
  if (b <= 0) return { vencedor: 'a', sobreviventes: Math.floor(a) };
  if (a <= 0) return { vencedor: 'b', sobreviventes: Math.floor(b) };
  if (a === b) return { vencedor: null, sobreviventes: 0 };

  const vencedor = a > b ? 'a' : 'b';
  const maior = Math.max(a, b);
  const menor = Math.min(a, b);
  // `max(1, …)`: quem venceu não pode terminar com zero homens em pé, senão a província
  // ficaria sem ninguém e o resultado leria como aniquilamento mútuo, que é outra coisa.
  const sobreviventes = Math.max(1, Math.round(Math.sqrt(maior * maior - menor * menor)));
  return { vencedor, sobreviventes };
}
