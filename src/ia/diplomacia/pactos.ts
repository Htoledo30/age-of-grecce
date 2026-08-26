/**
 * QUANDO A IA ASSINA UM PACTO DE NÃO-AGRESSÃO.
 *
 * A pergunta é uma só, e ela é honesta: **"eu não vou atacar este aqui de qualquer jeito — e
 * ele pode me atacar. Não é melhor amarrar?"**
 *
 * Três condições, e as três saem de números que já existem:
 *
 * 1. **Eu não o atacaria mesmo.** A opinião está acima de `relacaoParaDeclarar`, que é o mesmo
 *    limiar que já decide a guerra. Assinar com quem ela pretende atacar seria assinar para
 *    romper — e romper custa a reputação com o mapa inteiro.
 * 2. **Ele é mais forte do que eu.** Pacto é seguro, e seguro se faz contra o risco: um vizinho
 *    menor não me assusta, e amarrar minhas mãos contra ele só me tiraria opções.
 * 3. **⚠️ E ELE também não pretende me atacar.** Sem esta terceira, a assinatura era de um lado
 *    só: o fraco amarrava o forte, o forte ia comer quem não tinha amarrado, e a medição foi
 *    brutal — **46 províncias mudando de dono e 12 poderes eliminados**, contra 22 e 6 sem
 *    pacto nenhum. Um poder forte não ata as próprias mãos de graça, e fingir que ata só
 *    canalizava a violência para o vizinho mais indefeso.
 *
 * ⚠️ **E ela NUNCA rompe um pacto**, nesta primeira versão. Não é ingenuidade: é o que faz a
 * assinatura dela valer alguma coisa para o jogador. Uma IA que assina e trai é uma IA cuja
 * assinatura ninguém lê — e aí a mecânica inteira morre, junto com o presente que a comprou. No
 * dia em que ela romper, tem de ser raro, caro e por um motivo grande.
 *
 * O prazo é **o mais longo que a confiança dele alcança**: o pacto é o prêmio de uma relação
 * boa, e quem chegou a +50 merece os 40 turnos. Quem só chegou a 0 leva 10 e recomeça a
 * conversa depois.
 */

import type { Campanha } from '@/campanha/campanha';
import type { EstiloDeIa, Ia } from '@/dados/esquema';
import { estiloDe } from '../estilo';
import { forcaTotalDe } from '../percepcao/ameaca';
import { oportunidadesDe } from '../percepcao/oportunidade';

/**
 * Este poder ASSINARIA um pacto com aquele?
 *
 * Uma pergunta só, e é a mesma que decide a guerra pelo avesso: *eu pretendo atacá-lo?* Quem
 * pretende não assina — assinar para romper custaria a reputação com o mapa inteiro.
 *
 * ⚠️ É consultada dos DOIS lados, e é o que impede o fraco de amarrar o forte. Serve também à
 * proposta que vem do jogador: a aplicação pergunta aqui antes de registrar o acordo, do mesmo
 * jeito que já faz com a paz.
 */
export function aceitaPacto(
  campanha: Campanha,
  idPoder: string,
  com: string,
  estilo: EstiloDeIa,
): boolean {
  return campanha.relacaoEntre(idPoder, com) > estilo.relacaoParaDeclarar;
}

/**
 * O PRESENTE: **suborno defensivo, e é o que dá ao mercador uma arma que não é exército.**
 *
 * ⚠️ A primeira versão disto mandava ouro para destravar um pacto, e nunca disparava: medido,
 * **zero presentes em 100 turnos**. O motivo era estreito demais — para o pacto faltar E os dois
 * lados quererem assinar, era preciso uma combinação de estilos que quase não acontece.
 *
 * O uso de verdade é o clássico: **um vizinho mais forte, cuja opinião já está na faixa em que
 * ELE declara guerra.** Ouro entregue ali compra pontos, e pontos compram o turno em que a
 * invasão não sai. É o que um poder rico e desarmado faz desde que existe poder rico e
 * desarmado — e é o que faltava para o estilo `mercador` ter uma jogada que não seja levantar
 * lanças que ele não sabe usar.
 *
 * Três travas, e cada uma evita um jeito de a IA torrar o tesouro:
 *
 * 1. **Só quem é mais forte que eu**, senão é medo de sombra.
 * 2. **Só quem já está na faixa de me atacar** — quem não está não precisa ser comprado.
 * 3. **Só o que cabe na reserva do tesouro**, a mesma que segura a mão dela na obra: quem zera
 *    o cofre num presente não paga a folha no turno seguinte.
 *
 * ⚠️ E existe um limite honesto que vem do próprio presente: ele levanta a opinião só até certa
 * altura acima do que os FATOS justificam. **Não se compra um senhor da guerra que quer a sua
 * terra** — para subir mais é preciso mudar os fatos: assinar pacto, abrir comércio, devolver
 * o que foi tomado.
 */
export function presenteEscolhido(
  campanha: Campanha,
  idPoder: string,
  estilo: EstiloDeIa,
  dados: Ia,
): { para: string; ouro: number } | null {
  const disponivel = campanha.tesouroDe(idPoder) * (1 - estilo.guardaDoTesouro);
  if (disponivel <= 0) return null;

  const meu = forcaTotalDe(campanha, idPoder);
  const vizinhos = [...new Set(oportunidadesDe(campanha, idPoder).map((o) => o.dono))].sort();

  let escolhido: { para: string; ouro: number } | null = null;
  let maisForte = meu;
  for (const vizinho of vizinhos) {
    if (campanha.emGuerra(idPoder, vizinho)) continue;
    if (campanha.pactoAte(idPoder, vizinho) !== undefined) continue;
    const dele = forcaTotalDe(campanha, vizinho);
    if (dele <= maisForte) continue;
    // Ele já está na faixa em que declara guerra? Quem não está não precisa ser comprado.
    const limiar = estiloDe(dados, vizinho).relacaoParaDeclarar;
    const falta = limiar - campanha.relacaoEntre(idPoder, vizinho) + 1;
    if (falta <= 0) continue;
    const ouro = quantoCusta(campanha, vizinho, falta, disponivel);
    if (ouro === null) continue;
    maisForte = dele;
    escolhido = { para: vizinho, ouro };
  }
  return escolhido;
}

/**
 * O menor presente que cobre esses pontos, ou `null` se nem a reserva cobre.
 *
 * Procura de baixo para cima, em degraus de meio turno de renda dele: o objetivo é COMPRAR o
 * turno de sossego, não impressionar ninguém — e cada moeda a mais é uma moeda que não vira
 * muro. Devolve `null` também quando o teto do presente não alcança: aí não é caro, é
 * impossível, e o ouro seria jogado fora.
 */
function quantoCusta(
  campanha: Campanha,
  para: string,
  pontos: number,
  disponivel: number,
): number | null {
  const passo = Math.max(50, Math.round(campanha.rendaDe(para) / 2));
  for (let ouro = passo; ouro <= disponivel; ouro += passo) {
    if (campanha.valorDoPresente(para, ouro) >= pontos) return ouro;
  }
  return null;
}

/**
 * COM QUEM ELA ABRE COMÉRCIO — e é a decisão mais fácil que ela tem.
 *
 * ⚠️ **Todo acordo é lucro dos dois lados**, então não há o que ponderar: ela assina com quem
 * puder, do mais rendoso para o menos. A única pergunta real é *"eu pretendo atacá-lo?"* —
 * abrir comércio com quem se vai invadir é montar uma renda para perdê-la no turno seguinte,
 * já que a guerra desfaz o acordo na hora.
 *
 * É por aqui que o estilo `mercador` finalmente joga o jogo dele: sem exército para levantar,
 * o que ele tem é renda, e renda se multiplica assinando.
 */
export function comercioEscolhido(
  campanha: Campanha,
  idPoder: string,
  estilo: EstiloDeIa,
): string | null {
  let escolhido: string | null = null;
  let melhor = 0;
  // Vizinhos primeiro, mas comércio não exige fronteira: qualquer poder com ficha serve.
  for (const outro of campanha.poderesComFicha()) {
    if (outro === idPoder) continue;
    if (!campanha.podeAcordarComercio(outro, idPoder).pode) continue;
    // Abrir comércio com quem ela pretende atacar é montar renda para perdê-la amanhã.
    if (campanha.relacaoEntre(idPoder, outro) <= estilo.relacaoParaDeclarar) continue;
    const renda = campanha.rendaDeUmAcordoCom(outro, idPoder);
    if (renda > melhor) {
      melhor = renda;
      escolhido = outro;
    }
  }
  return escolhido;
}

/** Com quem e por quanto tempo este poder assinaria um pacto agora. `null` se com ninguém. */
export function pactoEscolhido(
  campanha: Campanha,
  idPoder: string,
  estilo: EstiloDeIa,
  dados: Ia,
): { com: string; turnos: number } | null {
  const meu = forcaTotalDe(campanha, idPoder);
  // Os vizinhos, pela mesma percepção que a guerra usa: pacto só faz sentido com quem encosta.
  const vizinhos = [...new Set(oportunidadesDe(campanha, idPoder).map((o) => o.dono))].sort();

  let escolhido: { com: string; turnos: number } | null = null;
  let maisForte = meu;
  for (const vizinho of vizinhos) {
    if (campanha.pactoAte(idPoder, vizinho) !== undefined) continue;
    if (campanha.emGuerra(idPoder, vizinho)) continue;
    // Assinar com quem ela pretende atacar seria assinar para romper.
    if (!aceitaPacto(campanha, idPoder, vizinho, estilo)) continue;
    // E ele também precisa querer: um poder forte não ata as próprias mãos de graça.
    if (!aceitaPacto(campanha, vizinho, idPoder, estiloDe(dados, vizinho))) continue;
    const dele = forcaTotalDe(campanha, vizinho);
    if (dele <= maisForte) continue;
    // O prazo mais longo que a confiança dele alcança: `prazosDePacto` já vem do maior ao menor.
    const prazo = campanha.prazosDePacto(vizinho, idPoder).find((p) => p.pode);
    if (!prazo) continue;
    maisForte = dele;
    escolhido = { com: vizinho, turnos: prazo.turnos };
  }
  return escolhido;
}
