/**
 * Como cada arma se chama e de que cor ela é na tela.
 *
 * Um lugar só, porque três telas diferentes falam das mesmas quatro armas: o painel de
 * recrutamento, a janela de batalha e a ficha da hoste. Com o mapa espalhado, um dia o
 * arqueiro seria "Arqueiros" num lugar e "Arqueiro" no outro, e a mesma cor apareceria em
 * duas armas.
 *
 * ⚠️ **Aqui só mora aparência.** O que a arma FAZ está em `dados/ajustes.json`; o que ela
 * exige para ser levantada está em `dados/construcoes.json`. Nenhum número de balanço passa
 * por este arquivo.
 */

import type { Arma } from '@/combate/exercito';

export const NOME_DA_ARMA: Readonly<Record<Arma, string>> = {
  leve: 'Leves',
  hoplita: 'Hoplitas',
  arqueiro: 'Arqueiros',
  cavalaria: 'Cavalaria',
};

/** Uma frase curta sobre o papel de cada uma. Vai no tooltip do botão. */
export const PAPEL_DA_ARMA: Readonly<Record<Arma, string>> = {
  leve: 'Baratos e sempre disponíveis. Aguentam por quantidade, não por qualidade.',
  hoplita: 'A parede: encaixa o choque e não quebra. Leva vantagem sobre a cavalaria.',
  arqueiro: 'Mata muito e apanha muito. Leva vantagem sobre o hoplita.',
  cavalaria: 'Decide o depois: multiplica a perseguição. Leva vantagem sobre o arqueiro.',
};

/** As cores das barras da janela de batalha. Distinguíveis entre si, e só isso. */
export const COR_DA_ARMA: Readonly<Record<Arma, string>> = {
  leve: '#9aa7b4',
  hoplita: '#c8a45a',
  arqueiro: '#7fb069',
  cavalaria: '#b5654a',
};
