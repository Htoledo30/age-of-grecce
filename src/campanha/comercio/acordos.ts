/**
 * O ACORDO DE COMÉRCIO: **mais uma fonte de renda, e os dois lados ganham sempre.**
 *
 * Decisão de Henrique, e ela reescreveu o desenho: a primeira versão pagava só pelo bem que o
 * outro tinha e você não — e metade dos pares do mapa ganhava ZERO um com o outro, porque quase
 * todo mundo faz grãos e azeite. Acordo que rende nada não é acordo, é um botão que decepciona.
 *
 * ## A regra, numa linha
 *
 * O acordo rende, por turno, **uma fração da renda do MENOR dos dois — e os dois recebem o
 * mesmo número.**
 *
 * ⚠️ **O menor dos dois, e é o que faz a conta ser justa dos dois lados.** Um parceiro minúsculo
 * não tem mercado para oferecer, por mais rico que você seja; e um parceiro gigante não
 * consegue despejar em você mais do que você consegue absorver. Sem esse teto, um reino de 118
 * de renda se penduraria num de 732 e dobraria de tamanho com uma assinatura.
 *
 * Três coisas caem sozinhas dessa forma:
 *
 * 1. **Comerciar com o grande vale mais do que com o pequeno**, que é o que qualquer um espera.
 * 2. **Crescer melhora todos os seus acordos**: sua renda sobe e o "menor dos dois" sobe junto
 *    em cada acordo com quem é maior que você. Economia e diplomacia passam a se puxar.
 * 3. **Existe um caminho pacífico de verdade.** Um poder que faça as pazes com o mapa inteiro e
 *    assine acordos com todos vive de comércio — e é uma forma legítima de jogar, não um
 *    consolo para quem não sabe guerrear.
 *
 * ## O que ele NÃO é
 *
 * ⚠️ **A rede de bens distintos continua sendo só a SUA.** O acordo não faz o mármore dele
 * circular no seu reino: quem quer o bem toma a terra. É essa separação que mantém a conquista
 * valendo mais do que o comércio — num jogo de conquista, o contrário seria tirar a espinha.
 */

import type { Ajustes } from '@/dados/esquema';

type AjustesComercio = Ajustes['jogo']['acordoDeComercio'];

/**
 * O que um acordo entre estes dois rende por turno, para CADA UM deles.
 *
 * As rendas que entram aqui são as de PROVÍNCIA, sem os acordos — senão a conta se morderia:
 * o acordo aumentaria a renda, que aumentaria o acordo, que aumentaria a renda.
 */
export function rendaDoAcordo(
  rendaBaseA: number,
  rendaBaseB: number,
  ajustes: AjustesComercio,
): number {
  const menor = Math.min(rendaBaseA, rendaBaseB);
  if (menor <= 0) return 0;
  return Math.round(menor * ajustes.fracaoDaMenorRenda);
}

/**
 * O que TODOS os acordos deste poder rendem juntos — **com retorno decrescente.**
 *
 * ⚠️ **O quinto parceiro rende menos que o primeiro**, e sem isso a diplomacia viraria um
 * concurso de assinaturas: cinco acordos a 12% da própria renda somariam mais da metade dela de
 * novo, e comerciar passaria a pagar melhor que administrar. A curva é a mesma da perseguição da
 * cavalaria e a do presente — quem já a leu uma vez não precisa aprendê-la outra.
 */
export function rendaTotalDeAcordos(
  rendas: readonly number[],
  ajustes: AjustesComercio,
): number {
  const bruto = rendas.reduce((soma, valor) => soma + valor, 0);
  if (bruto <= 0) return 0;
  const meia = ajustes.meiosParceiros;
  return Math.round(bruto * (meia / (meia + Math.max(0, rendas.length - 1))));
}
