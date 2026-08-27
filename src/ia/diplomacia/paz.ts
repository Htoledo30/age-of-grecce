/**
 * QUANDO A IA QUER PAZ — e por que sem isto a diplomacia não serviria de nada.
 *
 * Uma guerra que nunca acaba é a mesma coisa que não haver diplomacia: em vinte turnos todo
 * mundo teria declarado contra todo mundo e o mapa voltaria a ser o que era. **A paz é o que
 * devolve poderes ao estado de paz para que a guerra volte a ser uma decisão.**
 *
 * Três motivos para querer sair, e cada um é uma frase que um conselheiro diria:
 *
 * 1. **"Não há mais o que tomar dele."** Ou nunca houve, ou já foi tomado, ou o que sobrou não
 *    cai. Guerra sem alvo é folha de campanha paga a troco de nada.
 * 2. **"Ele é mais forte do que nós."** A conta é a mesma que decide declarar, pelo avesso: se
 *    hoje eu não assinaria esta guerra, é porque ela já não me serve.
 * 3. **"Não temos nada contra ele."** Guerra contra quem não se odeia acaba mais fácil — é o
 *    avesso exato de `relacaoParaDeclarar`, o número que decide começá-la.
 * 4. **"Já dura demais."** ⚠️ Existe para as guerras EMPATADAS terminarem. Duas cidades do
 *    mesmo tamanho, nenhuma capaz de tomar a outra, podem ficar se olhando para sempre — as
 *    duas achando que ganham e nenhuma conseguindo. O relógio é o que desempata, e é por isso
 *    que o estado guarda o turno em que cada guerra começou.
 *
 * ⚠️ **A paz precisa dos DOIS, e é a fachada que registra o acordo.** Este arquivo só responde
 * *"eu quero?"*. Quem junta as duas respostas é `ia.ts` para guerras entre computadores, e a
 * aplicação para a proposta que vem do jogador — que é o mesmo caminho, com a diferença de o
 * primeiro "sim" ser um clique.
 */

import type { Campanha } from '@/campanha/campanha';
import type { Ajustes, EstiloDeIa } from '@/dados/esquema';
import { valeAPena } from '../guerra/marchar';
import { forcaTotalDe } from '../percepcao/ameaca';
import { oportunidadesDe } from '../percepcao/oportunidade';

type AjustesDeCombate = Ajustes['jogo']['combate'];
type AjustesTributo = Ajustes['jogo']['diplomacia']['tributo'];

/** Este poder assinaria a paz com aquele agora? */
export function querPaz(
  campanha: Campanha,
  idPoder: string,
  inimigo: string,
  estilo: EstiloDeIa,
  ajustes: AjustesDeCombate,
): boolean {
  if (!campanha.emGuerra(idPoder, inimigo)) return false;

  // ⚠️ "Já dura demais" vem primeiro porque é o único motivo que vale mesmo quando os dois
  // lados ainda acham que ganham — e são essas as guerras que travam o mapa.
  const desde = campanha.guerraDesde(idPoder, inimigo);
  if (desde !== undefined && campanha.turno - desde >= estilo.guerraLonga) return true;

  // "Ele é mais forte do que nós": a mesma conta de declarar, pelo avesso.
  if (forcaTotalDe(campanha, idPoder) < forcaTotalDe(campanha, inimigo)) return true;

  // "Não temos nada contra ele": guerra contra quem não se odeia acaba mais fácil — e é o
  // avesso exato de `relacaoParaDeclarar`, que é o que decide começá-la.
  if (campanha.relacaoEntre(idPoder, inimigo) > estilo.relacaoParaDeclarar) return true;

  // "Não há mais o que tomar dele."
  const alvos = oportunidadesDe(campanha, idPoder).filter((o) => o.dono === inimigo);
  return !alvos.some((alvo) => valeAPena(campanha, idPoder, alvo, estilo, ajustes));
}

/**
 * **E ela aceitaria a paz se viesse OURO junto?**
 *
 * ⚠️ **Esta função existe porque `querPaz` não tinha alavanca nenhuma.** Quatro motivos para
 * querer sair, e nenhum deles o jogador consegue mover: ele não escolhe quanto tempo a guerra
 * dura, nem fica mais forte no meio dela, nem muda a opinião de quem está invadindo. **Se ela
 * está ganhando e ainda tem alvo, ela recusa — e quem está perdendo só podia esperar a derrota
 * chegar.** Esperar não é uma decisão.
 *
 * A pergunta que o ouro abre é honesta e é uma só: *"o que ele me oferece em quarenta turnos é
 * mais do que eu ainda ia tirar dele?"*
 *
 * ⚠️ **E as duas coisas não têm a mesma unidade**, que é a dificuldade inteira: o tributo é uma
 * renda que ACABA no dia do vencimento, e a província é uma renda que fica para sempre. Comparar
 * uma com a outra sem um horizonte escrito seria comparar um pagamento com o infinito, e ela
 * recusaria toda oferta que existisse. `turnosDePremio` é esse horizonte — quantos turnos de
 * renda uma província vale aos olhos dela.
 *
 * ⚠️ **Quem já queria a paz não é cobrado.** Aceitar de graça o que ela já daria de graça seria
 * roubo, e a aplicação, ao ver isto, assina a paz simples e devolve o ouro ao cofre do jogador.
 */
export function querPazComTributo(
  campanha: Campanha,
  idPoder: string,
  inimigo: string,
  ouro: number,
  turnos: number,
  estilo: EstiloDeIa,
  ajustes: AjustesDeCombate,
  tributo: AjustesTributo,
): boolean {
  if (querPaz(campanha, idPoder, inimigo, estilo, ajustes)) return true;

  // O que ela AINDA acha que vai tomar dele, por turno. Só os alvos que valem a marcha: os
  // outros já não são prêmio nenhum, e contá-los faria qualquer oferta parecer pequena.
  const premio = oportunidadesDe(campanha, idPoder)
    .filter((o) => o.dono === inimigo)
    .filter((alvo) => valeAPena(campanha, idPoder, alvo, estilo, ajustes))
    .reduce(
      (soma, o) =>
        soma + Math.max(0, o.renda) + o.bemNovo + (o.capital ? estilo.valorDaCapital : 0),
      0,
    );
  if (premio <= 0) return true;

  return ouro * turnos >= premio * tributo.turnosDePremio;
}
