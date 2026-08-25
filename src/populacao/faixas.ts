/**
 * A faixa de população: **quanto uma província pesa na mesa do reino.**
 *
 * ⚠️ **Absoluta, e essa é a mudança.** A regra anterior media o crescimento de cada terra
 * contra ela mesma — a província subia de nível a cada 25% acima da própria população
 * inicial. O efeito colateral era que **Atenas com 35.000 e Salamina com 3.000 custavam o
 * mesmo ponto**: o tamanho não importava para a comida, só a variação dele. Argos produzir o
 * dobro de Atenas era irrelevante, e a assimetria escrita nas fichas ficava desligada.
 *
 * Com faixas absolutas, a Ática — populosa e pobre em cereal, como o próprio dado dela diz —
 * passa a sentir isso; e conquistar Elêusis deixa de ser "mais renda" para ser **pão**.
 *
 * ⚠️ **Não é upgrade de província.** Não se compra faixa, não existe prédio de governo que a
 * suba e não há punição por deixar de construir. Quem faz a província evoluir são as
 * construções; a faixa só lê a população e diz quanto ela come. Dois sistemas fazendo a
 * mesma função seria um a mais.
 */

import type { Ajustes } from '@/dados/esquema';

type Faixas = Ajustes['jogo']['populacao']['faixas'];
type Faixa = Faixas[number];

/**
 * A faixa a que esta população pertence.
 *
 * A última entrada não tem `ate` e pega tudo acima da anterior — é o que garante que nenhuma
 * população fique sem faixa por mais que o reino cresça.
 */
export function faixaDaPopulacao(populacao: number, faixas: Faixas): Faixa | null {
  if (populacao <= 0) return null;
  for (const faixa of faixas) {
    if (faixa.ate === undefined || populacao <= faixa.ate) return faixa;
  }
  return faixas[faixas.length - 1] ?? null;
}

/**
 * O que esta população come por turno.
 *
 * Zero para província vazia: terra sem gente não pesa na mesa. É a mesma resposta honesta que
 * a economia dá para província sem ficha — não se inventa consumo onde não há ninguém.
 */
export function custoDaPopulacao(populacao: number, faixas: Faixas): number {
  return faixaDaPopulacao(populacao, faixas)?.custo ?? 0;
}

/** O nome da faixa, para a tela. Vazio onde não há gente. */
export function nomeDaFaixa(populacao: number, faixas: Faixas): string {
  return faixaDaPopulacao(populacao, faixas)?.nome ?? '';
}
