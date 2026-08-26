/**
 * QUANDO A IA DECLARA GUERRA — e é aqui que o freio inventado foi aposentado.
 *
 * Antes da diplomacia existir, a IA não tinha como perguntar *"eu quero uma guerra com este
 * poder?"*, porque guerra não era um estado: todo mundo estava em guerra com todo mundo desde
 * o turno 1. O único jeito de segurar o mapa era um preço fingido por província conquistada —
 * `custoDaConquista`, um número que não aparecia em lugar nenhum da tela e que, medido, se
 * comportava como cara ou coroa: andar na mesma direção dele dava 20 conquistas numa
 * configuração e 105 na vizinha.
 *
 * Agora a pergunta existe de verdade, e a resposta tem três partes:
 *
 * 1. **Há o que tomar deste vizinho?** Não "há terra": há terra que eu tomaria, pela mesma
 *    conta que decide a marcha — o choque de campo e depois a muralha. Guerra por província
 *    que não cai é guerra que só custa.
 * 2. **Eu ganho a GUERRA, e não só a primeira batalha?** Declarar é assinar que o outro vem
 *    atrás. Por isso a conta é exército contra exército, e o estilo diz de quanta vantagem ele
 *    precisa antes de assinar.
 * 0. **Eu gosto dele?** Acima de `relacaoParaDeclarar` a conversa acaba aqui — e é o que dá
 *    peso a presente, pacto e comércio: eles empurram a opinião para fora do alcance da
 *    guerra. Sem esta pergunta, a relação seria um número bonito que não decide nada.
 * 3. **⚠️ Uma guerra de cada vez.** Quem já está em guerra não abre segunda frente. É a regra
 *    que substituiu o preço fingido, e é melhor por três motivos: ela é verdadeira (dois
 *    inimigos ao mesmo tempo derrubam qualquer um destes poderes), ela é legível (o jogador vê
 *    na aba de Diplomacia com quem cada um está brigando) e ela dá ritmo ao mapa sem nenhum
 *    número mágico — dezoito poderes com uma guerra cada é um mapa em movimento; dezoito
 *    poderes em guerra com todos é sopa.
 *
 * Ser arrastado para uma segunda guerra continua possível: a regra é sobre COMEÇAR uma.
 */

import type { Campanha } from '@/campanha/campanha';
import type { Ajustes, EstiloDeIa } from '@/dados/esquema';
import { forcaTotalDe } from '../percepcao/ameaca';
import { oportunidadesDe } from '../percepcao/oportunidade';
import { valeAPena } from '../guerra/marchar';

type AjustesDeCombate = Ajustes['jogo']['combate'];

/**
 * Contra quem este poder declararia guerra AGORA. `null` quando não é hora de declarar.
 *
 * Um alvo só por virada, e o de maior valor: declarar duas guerras no mesmo turno é a segunda
 * frente pela porta dos fundos.
 */
export function guerraEscolhida(
  campanha: Campanha,
  idPoder: string,
  estilo: EstiloDeIa,
  ajustes: AjustesDeCombate,
): string | null {
  // ⚠️ Uma guerra de cada vez. A checagem vem primeiro porque é a mais barata e a que descarta
  // mais casos — e porque nenhuma das outras faz sentido para quem já tem um inimigo em campo.
  if (campanha.guerrasDe(idPoder).length > 0) return null;

  const meuExercito = forcaTotalDe(campanha, idPoder);
  const candidatos = new Map<string, number>();
  for (const alvo of oportunidadesDe(campanha, idPoder)) {
    if (campanha.emGuerra(idPoder, alvo.dono)) continue;
    if (!campanha.podeDeclararGuerra(alvo.dono, idPoder).pode) continue;
    // ⚠️ **Gosto demais dele para atacá-lo?** É a primeira pergunta, e é o que impede a
    // relação de ser enfeite: um número que não muda decisão nenhuma o jogador aprende a
    // ignorar. É também o que faz presente e acordo comprarem segurança de verdade.
    if (campanha.relacaoEntre(idPoder, alvo.dono) > estilo.relacaoParaDeclarar) continue;
    // A força que ele tem no mundo, e não a que está naquela província: quem declara passa a
    // enfrentar o reino inteiro, e é o reino inteiro que vem cobrar.
    if (meuExercito < forcaTotalDe(campanha, alvo.dono) * estilo.vantagemParaDeclarar) continue;
    if (!valeAPena(campanha, idPoder, alvo, estilo, ajustes)) continue;
    const valor =
      alvo.renda + alvo.bemNovo + (alvo.capital ? estilo.valorDaCapital : 0);
    candidatos.set(alvo.dono, Math.max(candidatos.get(alvo.dono) ?? 0, valor));
  }

  let escolhido: string | null = null;
  let melhor = 0;
  // Ordem por id no empate: a mesma partida declara as mesmas guerras em toda máquina.
  for (const [poder, valor] of [...candidatos].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (valor > melhor) {
      melhor = valor;
      escolhido = poder;
    }
  }
  return escolhido;
}
