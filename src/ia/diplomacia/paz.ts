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
 * 3. **"Já dura demais."** ⚠️ Existe para as guerras EMPATADAS terminarem. Duas cidades do
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

  // "Não há mais o que tomar dele."
  const alvos = oportunidadesDe(campanha, idPoder).filter((o) => o.dono === inimigo);
  return !alvos.some((alvo) => valeAPena(campanha, idPoder, alvo, estilo, ajustes));
}
