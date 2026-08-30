/**
 * O preço de uma obra **acompanha o tamanho da terra que a ergue.**
 *
 * Custo fixo contra renda variável nunca serve província pequena, e isso foi medido: com o
 * preço igual para todos, Atenas juntava a construção mais barata em 2 turnos e Hermíone em
 * 15. Não é assimetria interessante — é a terra pequena ficando **sem decisão nenhuma**
 * durante quinze anos de jogo, que é o oposto do que o jogo quer.
 *
 * Uma cidade de 35.000 ergue uma ágora de cidade grande; uma vila de 5.000 ergue a dela. O
 * preço muda porque a obra é outra, não porque o jogo está sendo gentil com o pequeno.
 *
 * ⚠️ **Escala pelo dado AUTORAL, nunca pelo estado vivo.** Duas razões, e as duas doem se
 * ignoradas:
 *
 * 1. Pela riqueza viva, recrutar 3.000 homens baratearia as obras da província — mobilizar
 *    para construir mais barato é um exploit que ninguém escreveria de propósito.
 * 2. O preço ficaria mudando sozinho a cada turno, e o jogador não conseguiria planejar dois
 *    turnos à frente.
 *
 * O que os dados escrevem é identidade da terra, como produto e nível: diz que lugar é
 * aquele. Uma província que enriquece não passa a construir mais caro por isso.
 */

import type { Ajustes, Construcoes, Economia } from '@/dados/esquema';

type AjustesConstrucoes = Ajustes['jogo']['construcoes'];
type AjustesEconomia = Ajustes['jogo']['economia'];
type Construcao = Construcoes['construcoes'][string];
type Produtos = Economia['produtos'];
type FichaDaTerra = Economia['provincias'][string];

/**
 * O peso econômico que os DADOS escrevem para esta terra, sem corrupção e sem obra nenhuma.
 *
 * É a régua da escala de preço. Escalar por população parecia óbvio e estava errado: a
 * produção de uma terra não cresce com o número de habitantes — ela é `valor × nível` — e
 * então cobrar o dobro de uma cidade com o dobro de gente fazia o Lagar de Atenas ir a 700
 * turnos de retorno enquanto o de Hermíone pagava em 140. Cobrar pela RIQUEZA faz o retorno
 * ficar parecido em toda parte, que é o ponto: a mesma decisão tem que existir nas duas.
 */
export function pesoEconomicoDe(
  ficha: FichaDaTerra,
  produtos: Produtos,
  economia: AjustesEconomia,
): number {
  const principal = produtos[ficha.produto]?.valor ?? 0;
  const segundo = produtos[ficha.secundario.produto]?.valor ?? 0;
  return (
    ficha.populacao * economia.impostoPorHabitante +
    principal * ficha.nivel +
    segundo * ficha.secundario.nivel * economia.pesoDoSecundario +
    ficha.transitoBase * economia.escalaDeTransito
  );
}

/**
 * O multiplicador de preço desta terra. 1 é a província de referência.
 *
 * Os limites existem para os extremos do mapa: sem piso, a vila mais pobre compraria quase
 * de graça; sem teto, a metrópole futura não construiria nunca.
 */
export function escalaDeObra(pesoEconomico: number, ajustes: AjustesConstrucoes): number {
  const bruta = pesoEconomico / ajustes.pesoDeReferencia;
  return Math.min(ajustes.escalaMaxima, Math.max(ajustes.escalaMinima, bruta));
}

/**
 * O que esta obra custa à vista nesta terra, no nível pedido.
 *
 * A regra comum usa a escala da terra. Uma obra com `escalaPorProvincia: false` declara que
 * compra a mesma capacidade em qualquer lugar e, portanto, cobra o preço de catálogo inteiro.
 */
export function custoDaObra(
  construcao: Construcao,
  nivel: number,
  escala: number,
): number {
  const base = construcao.custos[Math.max(0, Math.min(2, nivel - 1))] ?? construcao.custos[2];
  return Math.round(base * (construcao.escalaPorProvincia === false ? 1 : escala));
}

/**
 * O que esta obra cobra por turno nesta terra, no nível erguido.
 *
 * Escala junto com o custo, e não podia ser diferente: obra grande com folha de obra
 * pequena faria a cidade grande construir caro e manter barato, e o pequeno pagaria
 * proporcionalmente mais para sustentar o que ergueu. A mesma exceção de escala do custo vale
 * para a folha: capacidade idêntica cobra manutenção idêntica.
 */
export function manutencaoDaObra(
  construcao: Construcao,
  nivel: number,
  escala: number,
): number {
  const base =
    construcao.manutencao[Math.max(0, Math.min(2, nivel - 1))] ?? construcao.manutencao[2];
  return Math.round(base * (construcao.escalaPorProvincia === false ? 1 : escala));
}
