/**
 * O SAQUE — o que a cidade perde no dia em que é tomada à força.
 *
 * Uma cidade não trocava de mão com um arranhão: o vencedor herdava a população inteira e o
 * catálogo de obras intacto, como se conquistar fosse assinar um papel. Henrique cortou isso
 * com uma frase: *"quando conquisto tem batalhas, e batalhas destroem e matam coisas — não é
 * só soldado e milícia que morre em invasão"*.
 *
 * ## Duas coisas se perdem, e só quem ENTRA À FORÇA as perde
 *
 * ⚠️ **Cidade vazia não é saqueada.** Marchar para uma província sem ninguém em pé continua
 * custando zero — não houve luta, não há o que destruir. Só o ASSALTO saqueia, e é isso que
 * transforma "sitiar ou assaltar?" numa pergunta com dois preços em vez de uma questão de
 * paciência: sentar demora e entrega a cidade inteira; assaltar entrega hoje uma cidade
 * quebrada.
 *
 * ⚠️ **A obra que cai é a MURALHA, quando há uma** — e não é escolha arbitrária: foi ela que
 * o assalto quebrou para entrar. Sem muralha, cai a obra mais cara de pé, que é o que a
 * guerra faz com uma cidade: leva o melhor que ela tinha. **Um nível por assalto**, nunca a
 * obra inteira: a cidade fica ferida, não arrasada, e o vencedor herda uma reconstrução em
 * vez de um terreno baldio.
 *
 * ⚠️ **Nada de sorteio.** A resolução da rodada é determinística de ponta a ponta — a mesma
 * rodada com as mesmas ordens dá o mesmo resultado, senão não há salvamento confiável nem
 * teste de regressão. Por isso a obra perdida sai de uma regra que qualquer um consegue
 * prever antes de clicar, e o desempate é pelo id.
 */

import type { NucleoDaCampanha } from '../nucleo';
import { custoDaObra } from '../custo-de-obra';
import { escalaDeObraEm } from '../provincia/renda';
import { construcoesEm, fichaDe, nivelDaConstrucaoEm, populacaoDe } from '../provincia/consultas';

/** O que a cidade perdeu ao cair. Vai para a crônica, e é o que o jogador lê. */
export interface Saque {
  provincia: string;
  /** Civis mortos na tomada. Não são milicianos: aqueles já foram contados na batalha. */
  mortos: number;
  /** A obra que perdeu um nível, ou `null` se não havia obra de pé. */
  obra: string | null;
  /** O nível em que ela ficou. Zero é obra derrubada. */
  nivel: number;
}

/**
 * Cobra da cidade o preço de ter sido tomada à força.
 *
 * Chamado DEPOIS da troca de dono, e de propósito: quem paga a conta é a cidade, não o
 * antigo dono — os mortos e o entulho ficam onde estão, e quem herda herda o estrago.
 */
export function saquearProvincia(nucleo: NucleoDaCampanha, idProvincia: string): Saque {
  // Terra sem ficha econômica não tem povo nem obra para perder: das 196 províncias
  // desenhadas, 171 não são simuladas.
  if (fichaDe(nucleo, idProvincia) === undefined) {
    return { provincia: idProvincia, mortos: 0, obra: null, nivel: 0 };
  }

  const ajustes = nucleo.ajustes.conquista;
  const povo = populacaoDe(nucleo, idProvincia);
  const mortos = Math.min(povo, Math.floor(povo * ajustes.mortosNoSaque));
  if (mortos > 0) nucleo.estado.populacao[idProvincia] = povo - mortos;

  const obra = obraQueCai(nucleo, idProvincia);
  if (obra === null) return { provincia: idProvincia, mortos, obra: null, nivel: 0 };

  const nivel = Math.max(0, nivelDaConstrucaoEm(nucleo, idProvincia, obra) - ajustes.niveisPerdidos);
  const erguidas = nucleo.estado.construcoes[idProvincia];
  if (erguidas) {
    if (nivel === 0) delete erguidas[obra];
    else erguidas[obra] = nivel;
  }
  return { provincia: idProvincia, mortos, obra, nivel };
}

/**
 * Qual obra o assalto derruba: a que barrava a entrada, ou a mais cara que restar.
 *
 * A muralha vem primeiro porque foi ela que se quebrou para entrar — e isso dá ao assalto uma
 * consequência que o cerco não tem: **quem toma a praça na porrada fica com a praça aberta**,
 * e precisa reerguer o muro antes de o próximo vizinho aparecer.
 */
function obraQueCai(nucleo: NucleoDaCampanha, idProvincia: string): string | null {
  const erguidas = construcoesEm(nucleo, idProvincia);
  if (erguidas.length === 0) return null;

  const muro = erguidas.find((id) => nucleo.catalogo[id]?.impedeAssaltoImediato === true);
  if (muro !== undefined) return muro;

  const escala = escalaDeObraEm(nucleo, idProvincia);
  let escolhida: string | null = null;
  let maior = -1;
  // Ordenado por id antes de comparar: o desempate tem que ser o mesmo em toda máquina, e
  // `construcoesEm` já devolve em ordem — mas depender disso em silêncio é como não ter regra.
  for (const id of [...erguidas].sort()) {
    const construcao = nucleo.catalogo[id];
    if (!construcao) continue;
    const preco = custoDaObra(construcao, nivelDaConstrucaoEm(nucleo, idProvincia, id), escala);
    if (preco > maior) {
      maior = preco;
      escolhida = id;
    }
  }
  return escolhida;
}
