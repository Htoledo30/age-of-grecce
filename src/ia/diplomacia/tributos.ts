/**
 * QUEM VENDE O ANO, E QUEM O COMPRA.
 *
 * O tributo é a única peça da diplomacia em que as duas perguntas são **diferentes uma da
 * outra**, e é isso que o torna uma negociação em vez de um botão:
 *
 * - o pacto é a mesma pergunta dos dois lados (*"eu pretendo atacá-lo?"*);
 * - o comércio é lucro dos dois lados e ninguém pondera nada;
 * - **o tributo tem um lado que paga e um lado que recebe, e o que cada um pesa não é a mesma
 *   coisa.** Quem paga pergunta *"eu sobrevivo ao ano que vem?"*; quem recebe pergunta *"isso
 *   é mais do que eu tiraria invadindo?"*.
 *
 * ## Só vende o ano quem PODERIA tomar a terra
 *
 * ⚠️ **É a trava que impede a diplomacia de virar loja de paz**, e ela é a mesma ideia que já
 * segura o presente: um vizinho que não tem apetite nem vantagem **recusa o ouro**. Sem isso o
 * jogador de tesouro cheio compraria o mapa inteiro no primeiro turno, pagando reinos que
 * jamais iriam atacá-lo — e a resposta dele, "não tenho nada contra você", é a informação certa
 * na hora certa, porque ela diz ao jogador que ali não havia perigo nenhum.
 *
 * ## E aceita quem sente o dinheiro
 *
 * ⚠️ A segunda pergunta é a mesma do presente: **isso muda alguma coisa no meu cofre?** Sem
 * ela, Argos abriria mão de uma conquista por dezoito moedas porque Plateia não tem mais o que
 * oferecer. Com ela, **só se compra quem é da sua escala** — e contra o império sobra o que
 * sempre sobrou: levantar lanças, ceder terra, ou procurar quem também o tema.
 *
 * ## O que esta primeira versão NÃO faz
 *
 * ⚠️ **A IA não EXIGE tributo, só aceita quando lhe oferecem.** Um poder forte que chegasse
 * cobrando pedágio de todo vizinho fraco encheria a virada de propostas e transformaria a tela
 * do jogador numa caixa de entrada. Ela também **nunca rompe um tributo que está recebendo** —
 * pelo mesmo motivo que não rompe pacto: assinatura que ninguém pode ler não vale nada, e o
 * jogador precisa poder confiar no ano que comprou. No dia em que ela romper, tem de ser raro,
 * caro e por um motivo grande.
 */

import type { Campanha } from '@/campanha/campanha';
import type { Ajustes, EstiloDeIa, Ia } from '@/dados/esquema';
import { tributoBastaPara } from '@/campanha/diplomacia/tributo';
import { estiloDe } from '../estilo';
import { forcaTotalDe } from '../percepcao/ameaca';
import { oportunidadesDe } from '../percepcao/oportunidade';

type AjustesTributo = Ajustes['jogo']['diplomacia']['tributo'];

/**
 * Este poder aceitaria RECEBER tributo daquele?
 *
 * Duas condições, e cada uma corta um jeito de a mecânica apodrecer:
 *
 * 1. **Eu o atacaria.** A opinião está na faixa em que este estilo declara guerra, e meu
 *    exército tem a vantagem que torna a invasão pensável. Quem não ia atacar não tem ano
 *    nenhum para vender — e cobrar por ele seria roubar.
 * 2. **E o ouro é dinheiro de verdade para mim**, medido na minha renda e não numa tabela. É a
 *    quantia CONCRETA da oferta que entra aqui, e não uma média: prazo curto paga mais por turno,
 *    então o mesmo vizinho pode ter dez turnos aceitos e quarenta recusados.
 *
 * ⚠️ É consultada também quando a proposta vem do JOGADOR, do mesmo jeito que a paz e o pacto:
 * a aplicação pergunta aqui antes de registrar a assinatura.
 */
export function aceitaTributo(
  campanha: Campanha,
  recebedor: string,
  pagador: string,
  ouro: number,
  estilo: EstiloDeIa,
  ajustes: AjustesTributo,
): boolean {
  if (campanha.relacaoEntre(recebedor, pagador) > estilo.relacaoParaDeclarar) return false;
  if (forcaTotalDe(campanha, recebedor) < forcaTotalDe(campanha, pagador) * ajustes.vantagemMinima) {
    return false;
  }
  return tributoBastaPara(ouro, campanha.rendaDe(recebedor), ajustes);
}

/**
 * Este poder aceitaria PAGAR tributo àquele?
 *
 * A pergunta do lado que sangra é outra, e é curta: **ele consegue me tomar a terra?** Ouro
 * entregue a quem não me alcança é ouro jogado fora, e é esta linha que impede o fraco de sair
 * comprando o mapa inteiro por medo de sombra.
 *
 * ⚠️ **Um tributo por vez, e a trava é o cofre.** Dois tributos são quase um terço da renda
 * saindo todo turno para comprar a mesma coisa — sossego —, e o reino que faz isso não paga a
 * folha nem levanta muro, o que o entrega de bandeja ao terceiro vizinho, que não foi pago.
 *
 * ⚠️ É esta a metade consultada quando quem EXIGE é o jogador: ele já decidiu que quer receber,
 * então o que falta perguntar é se o outro tem motivo para topar.
 */
export function aceitaPagarTributo(
  campanha: Campanha,
  pagador: string,
  recebedor: string,
  ajustes: AjustesTributo,
): boolean {
  if (campanha.tributosDe(pagador).some((t) => t.tributo.pagador === pagador)) return false;
  const dele = forcaTotalDe(campanha, recebedor);
  return dele >= forcaTotalDe(campanha, pagador) * ajustes.vantagemMinima;
}

/**
 * A quem este poder ofereceria tributo agora. `null` quando a ninguém.
 *
 * **Escolhe o mais forte entre os que aceitariam** — a mesma varredura do presente e do pacto,
 * e pelo mesmo motivo: o ouro é escasso, e comprar o sossego do segundo vizinho mais perigoso
 * deixa o primeiro batendo na porta.
 *
 * As duas metades da mesa precisam dizer sim, e são perguntas diferentes: ver
 * `aceitaPagarTributo` de um lado e `aceitaTributo` do outro.
 */
export function tributoEscolhido(
  campanha: Campanha,
  idPoder: string,
  dados: Ia,
  ajustes: AjustesTributo,
): { com: string; turnos: number } | null {
  // Os vizinhos, pela mesma percepção que a guerra usa: só se compra quem consegue chegar.
  const vizinhos = [...new Set(oportunidadesDe(campanha, idPoder).map((o) => o.dono))].sort();

  let escolhido: { com: string; turnos: number } | null = null;
  let maisForte = forcaTotalDe(campanha, idPoder);
  for (const vizinho of vizinhos) {
    if (!aceitaPagarTributo(campanha, idPoder, vizinho, ajustes)) continue;
    const dele = forcaTotalDe(campanha, vizinho);
    if (dele <= maisForte) continue;
    const prazo = prazoQueElaCompra(campanha, idPoder, vizinho, dados, ajustes);
    if (prazo === null) continue;
    maisForte = dele;
    escolhido = { com: vizinho, turnos: prazo };
  }
  return escolhido;
}

/**
 * Qual prazo ela assina com este vizinho. `null` quando nenhum sai.
 *
 * ⚠️ **O mais LONGO que ele aceitar, e é a escolha de quem está com medo.** Prazo longo é a
 * parcela mais barata, e um reino que está comprando sossego é justamente um reino cujo cofre
 * não aguenta a parcela cara — pagar 20% da renda por dez turnos a deixaria sem folha militar
 * no meio do prazo que ela acabou de comprar. Ela troca liberdade futura por sobreviver agora,
 * que é a troca que qualquer um faz com uma lança apontada.
 *
 * ⚠️ E é o mais longo **que ELE aceitar**, não o mais longo da tabela: a parcela barata pode
 * não alcançar a materialidade do vizinho, e aí o desconto que ela queria é justamente o que
 * derruba a oferta. Desce um degrau por vez até achar um que os dois assinem.
 */
function prazoQueElaCompra(
  campanha: Campanha,
  idPoder: string,
  vizinho: string,
  dados: Ia,
  ajustes: AjustesTributo,
): number | null {
  const estilo = estiloDe(dados, vizinho);
  // `prazosDeTributo` vem do mais curto ao mais longo: de trás para frente é do mais barato.
  for (const prazo of [...campanha.prazosDeTributo(idPoder, vizinho)].reverse()) {
    if (!prazo.pode) continue;
    if (aceitaTributo(campanha, vizinho, idPoder, prazo.ouro, estilo, ajustes)) return prazo.turnos;
  }
  return null;
}
