/**
 * O BLOQUEIO NAVAL — **o cerco do mar, e a primeira coisa que uma força PARADA na água faz.**
 *
 * Pedido de Henrique: *"essa ideia de ter guerras por controle no mar é perfeito"*. Até aqui a
 * água era estrada: servia para atravessar, e ficar nela não comprava nada. Uma zona de mar não
 * tem dono, não se conquista e não se sitia — então, sem esta regra, **não havia razão nenhuma
 * para segurar uma**, e a lista do que faltava no naval dizia isso com todas as letras.
 *
 * ## A regra, numa linha
 *
 * > **Frota inimiga parada na água que banha o teu Porto fecha aquele Porto.**
 *
 * E fechar o Porto é tudo o que ela faz — não toma, não saqueia, não mata ninguém. O Porto é
 * que tem três razões de existir, e o bloqueio apaga duas:
 *
 * 1. **a ligação por mar** (`comercio/circulacao.ts`): a metade do reino que só chega à capital
 *    embarcando fica CORTADA, e perde a parcela de trânsito. Salamina volta a ser uma ilha;
 * 2. **o alcance do comércio** (`comercio/alcance.ts`): reino com todos os portos fechados não
 *    põe mercadoria no mar, e os acordos que só existiam por água param de render.
 *
 * ⚠️ **A terceira razão do Porto — EMBARCAR — continua livre, e é deliberado.** Um bloqueio que
 * também trancasse o cais seria inquebrável: o bloqueado não teria como sair para atacar quem o
 * bloqueia, e a única resposta a uma frota seria não ter uma. Do jeito que está, sair é atacar
 * — a água que se precisa cruzar é justamente a que está ocupada, e o encontro no mar é batalha
 * pela regra que já existia.
 *
 * ⚠️ **É o mesmo desenho do cerco em terra, e de propósito.** Sitiar não toma a cidade: corta a
 * produção e o comércio dela e espera. Bloquear não toma a água: corta o que passa por ela.
 * Quem já leu uma das duas não precisa aprender a outra.
 *
 * ⚠️ **Exige GUERRA, como tudo o que dói.** Frota de quem está em paz ancorada ao lado do teu
 * porto é frota de passagem — a mesma regra que deixa duas hostes em paz dividirem uma
 * província sem se tocar.
 */

import { forcaDe } from '@/combate/exercito';
import type { NucleoDaCampanha } from '../nucleo';
import { donoDe } from '../provincia/consultas';
import { emGuerra } from '../diplomacia/relacoes';

/**
 * Esta província tem frota inimiga na água que a banha?
 *
 * ⚠️ **Pergunta pela PROVÍNCIA e não pelo Porto**, porque quem responde se ali há Porto são os
 * dois donos dessa pergunta — `alcance.ts` pelo id da obra e `circulacao.ts` pelo catálogo — e
 * duplicar aqui a terceira versão dela seria criar um terceiro jeito de discordar.
 *
 * ⚠️ **Uma zona de mar banha meia dúzia de províncias**, então uma frota fecha vários cais de
 * uma vez. É a geografia falando, e é ela que faz o Golfo Sarônico valer mais que o Mar de
 * Rodes: bloquear a porta de Atenas, Egina e Corinto com um exército só é o tipo de posição por
 * que se trava uma guerra.
 */
export function bloqueadaEm(nucleo: NucleoDaCampanha, idProvincia: string): boolean {
  const dono = donoDe(nucleo, idProvincia);
  if (dono === '') return false;
  // ⚠️ **Varre as HOSTES e não as províncias, e sem ordenar.** Esta pergunta é feita por
  // província, dentro da circulação, que por sua vez é chamada pela renda, pelo humor e pela
  // rede de trocas — dezenas de vezes por virada. A primeira versão pedia a lista ordenada de
  // todas as hostes a cada chamada, e a suíte de testes ficou 6× mais lenta. Aqui a ordem não
  // muda a resposta: é um "existe alguma?".
  for (const hoste of Object.values(nucleo.estado.hostes)) {
    if (!nucleo.atlas.ehMar(hoste.posicao)) continue;
    if (!nucleo.atlas.vizinhasDe(hoste.posicao).includes(idProvincia)) continue;
    if (!emGuerra(nucleo, dono, hoste.poder)) continue;
    if (forcaDe(hoste) <= 0) continue;
    return true;
  }
  return false;
}

/**
 * Quem está bloqueando este cais, em ordem de id. Vazio quando ninguém está.
 *
 * Serve à tela e à crônica: um Porto que para de funcionar sem dizer por quê lê-se como defeito
 * do jogo, e é a mesma razão pela qual a ficha da província distingue "revoltosa" de "cortada".
 */
export function bloqueiamEm(nucleo: NucleoDaCampanha, idProvincia: string): readonly string[] {
  const dono = donoDe(nucleo, idProvincia);
  if (dono === '') return [];
  const poderes = new Set<string>();
  for (const hoste of Object.values(nucleo.estado.hostes)) {
    if (!nucleo.atlas.ehMar(hoste.posicao)) continue;
    if (!nucleo.atlas.vizinhasDe(hoste.posicao).includes(idProvincia)) continue;
    if (!emGuerra(nucleo, dono, hoste.poder)) continue;
    if (forcaDe(hoste) <= 0) continue;
    poderes.add(hoste.poder);
  }
  // A ordem sai daqui, e não da varredura: a lista é lida pela tela e pela IA.
  return [...poderes].sort();
}
