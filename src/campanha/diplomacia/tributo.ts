/**
 * O TRIBUTO: **o fraco compra o ano que ele não conseguiria pedir de graça.**
 *
 * ⚠️ **Ele existe porque o fundo da régua estava morto.** A opinião vai de −100 a +100, mas o
 * comércio abre em −25 e o pacto mais curto em −20 — abaixo disso não havia mais nada a fazer
 * com o número. Um vizinho que te odeia a −70 e um que te odeia a −40 ofereciam ao jogador
 * exatamente as mesmas opções: nenhuma. Sessenta pontos de escala que não viravam decisão.
 *
 * O tributo é a decisão que faltava ali, e ela é a inversa do pacto:
 *
 * - **o pacto é de graça e exige CONFIANÇA** — opinião mínima, prazo maior pedindo mais;
 * - **o tributo não exige confiança nenhuma e se paga em OURO, todo turno.**
 *
 * É por isso que ele não canibaliza o pacto: quem tem opinião para assinar um pacto seria tolo
 * de pagar por um, e quem não tem não tinha, até hoje, nada. **O ouro entra exatamente onde a
 * confiança não chega.**
 *
 * ## As quatro regras
 *
 * 1. **Vale uma fatia da renda do PAGADOR.** Medido no bolso de quem paga, como o presente é
 *    medido no bolso de quem recebe — e pelo mesmo motivo: um número fixo seria esmola para o
 *    rico e ruína para o pobre. Crescer encarece o próprio tributo, e é assim que ele deixa de
 *    valer a pena sozinho quando o fraco para de ser fraco.
 * 2. **Enquanto ele corre, o RECEBEDOR não declara guerra ao pagador.** É literalmente o que
 *    está sendo comprado. O pagador continua livre para declarar — quem paga é quem quer sair.
 * 3. **O PRAZO é negociado, e prazo longo custa menos por turno.** É a lógica do aluguel: quem
 *    se compromete por quarenta turnos ganha desconto, quem quer poder sair em dez paga o preço
 *    da liberdade. E o desconto tem dono — assinar barato e depois ficar forte é estar preso, ou
 *    pagar a reputação para sair. Sem prazo nenhum, um tributo assinado no desespero do turno 12
 *    ainda estaria sangrando o cofre no turno 300.
 * 4. **Quem não paga, perde.** Cofre curto no dia do pagamento rompe o tributo, e quem rompe é
 *    o caloteiro — leva o tombo de reputação com o mapa inteiro. Ver `pagarTributos`.
 *
 * ## O que ele NÃO é
 *
 * ⚠️ **Não é vassalagem.** O pagador não perde província, exército, decisão nem voz: ele
 * continua um poder inteiro que simplesmente comprou um ano de sossego. Suserania, chamado à
 * guerra e herança de território são outra decisão, e ela é de Henrique.
 *
 * ⚠️ **E não é uma loja de paz.** Só vende o ano quem PODERIA tomar a sua terra — ver
 * `src/ia/diplomacia/tributos.ts`. Um vizinho que não tem apetite nem vantagem recusa o ouro,
 * e é isso que impede o jogador de comprar o mapa inteiro com o tesouro cheio.
 */

import type { Ajustes } from '@/dados/esquema';

type AjustesTributo = Ajustes['jogo']['diplomacia']['tributo'];

/**
 * O que este tributo custa por turno, medido na renda de quem PAGA.
 *
 * ⚠️ **Na renda BASE, sem os acordos de comércio nem os tributos que ele mesmo recebe.** Se a
 * conta olhasse a renda cheia, ela se morderia: receber tributo aumentaria a renda, que
 * aumentaria o tributo que ele paga, que aumentaria a renda do outro. É a mesma base contra a
 * qual o acordo de comércio se mede, e pelo mesmo motivo.
 *
 * A fatia vem do PRAZO escolhido, e não de um número só: dez turnos custam mais por turno que
 * quarenta. O piso de uma moeda existe para um tributo assinado nunca custar zero — um pagamento
 * que não se sente não é um pagamento, e um poder arrasado ainda deve alguma coisa a quem o poupou.
 */
export function valorDoTributo(rendaBaseDoPagador: number, fracaoDaRenda: number): number {
  if (rendaBaseDoPagador <= 0) return 0;
  return Math.max(1, Math.round(rendaBaseDoPagador * fracaoDaRenda));
}

/**
 * Este tributo é DINHEIRO DE VERDADE para quem vai receber?
 *
 * ⚠️ **É o freio que impede o pequeno de comprar o gigante.** Sem ele, Plateia pagaria 14
 * moedas por turno e Argos, que arrecada dois mil, engoliria a oferta e abriria mão de uma
 * conquista — por troco. A pergunta certa não é "quanto ele oferece?" e sim "isso muda alguma
 * coisa no meu cofre?", que é a mesma pergunta que o presente já faz.
 *
 * A consequência cai de graça e é a que interessa: **só dá para comprar quem é da sua escala.**
 * Contra um império, o fraco não tem ouro que chegue — e aí sobra o que sempre sobrou, que é
 * levantar lanças, ceder terra ou procurar quem também tema o gigante.
 */
export function tributoBastaPara(
  valor: number,
  rendaBaseDoRecebedor: number,
  ajustes: AjustesTributo,
): boolean {
  if (valor <= 0) return false;
  return valor >= rendaBaseDoRecebedor * ajustes.materialidade;
}
