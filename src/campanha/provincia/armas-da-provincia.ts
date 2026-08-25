/**
 * O que esta terra levanta, e com que treino.
 *
 * Duas perguntas que a interface e o recrutamento fazem o tempo todo, e que só a província
 * responde — porque **a liberação é por PROVÍNCIA, não por reino.** Armaria em Atenas quer
 * dizer hoplita recrutado em Atenas; Maratona sem ela levanta leves. É isso que transforma
 * *"qual das minhas terras é a militar?"* numa pergunta com resposta no mapa, e é como as
 * explorações já funcionam: Mina só onde há ferro.
 *
 * ⚠️ **Ninguém fica sem exército.** O `leve` é a linha de base e não pede prédio nenhum —
 * quem não gastou slot em Armaria joga com massa barata, que é jogar de outro jeito, não é
 * ficar sem jogar. E ele vale exatamente o que vale um miliciano: 1 leve = 1 lavrador com
 * uma lança.
 */

import type { Arma } from '@/combate/exercito';
import { ARMAS } from '@/combate/exercito';
import type { NucleoDaCampanha } from '../nucleo';
import { construcoesEm, nivelDaConstrucaoEm } from './consultas';

/** As armas que esta província levanta agora. `leve` está sempre na lista. */
export function armasEm(nucleo: NucleoDaCampanha, idProvincia: string): readonly Arma[] {
  const liberadas = new Set<Arma>(['leve']);
  for (const id of construcoesEm(nucleo, idProvincia)) {
    const efeito = nucleo.catalogo[id]?.efeito;
    if (efeito?.tipo === 'arma') liberadas.add(efeito.arma);
  }
  // Em ordem fixa, e não na ordem em que as obras foram erguidas: a lista vai para a tela e
  // para os testes, e ordem que muda sozinha é bug esperando acontecer.
  return ARMAS.filter((arma) => liberadas.has(arma));
}

/**
 * O treino que a tropa levantada aqui recebe. 1 é tropa comum.
 *
 * ⚠️ **É lido AGORA e carimbado no contingente**, e nunca mais consultado. Se a batalha
 * perguntasse à província, perder a terra transformaria veteranos em recrutas no meio da
 * campanha — e tomar o Quartel do inimigo apagaria o exército dele em vez de piorar as
 * reposições, que é uma pressão de campanha muito melhor.
 *
 * Multiplicativo entre obras: se um dia houver duas que treinam, elas se compõem em vez de
 * uma anular a outra. Hoje só o Quartel treina.
 */
export function treinoEm(nucleo: NucleoDaCampanha, idProvincia: string): number {
  let treino = 1;
  for (const id of construcoesEm(nucleo, idProvincia)) {
    const efeito = nucleo.catalogo[id]?.efeito;
    if (efeito?.tipo !== 'qualidade') continue;
    const nivel = nivelDaConstrucaoEm(nucleo, idProvincia, id);
    treino *= efeito.fatores[Math.max(0, Math.min(2, nivel - 1))] ?? 1;
  }
  return treino;
}
