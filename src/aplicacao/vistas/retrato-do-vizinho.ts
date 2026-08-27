/**
 * **QUEM É ESTE REINO — o retrato feito de fatos, já que não temos retrato nenhum.**
 *
 * ⚠️ **A tela antiga tratava o vizinho como uma linha de lista, e era essa a queixa.** Ela
 * dizia o nome dele, quantos homens ele tem e onde encosta na sua fronteira — três dados que
 * descrevem um ALVO, não uma contraparte. Ninguém negocia com um alvo.
 *
 * Um reino vira alguém quando ele tem **temperamento, passado e vida própria**:
 *
 * 1. **Temperamento** — guerreiro, mercador, cauteloso, equilibrado. Já estava em
 *    `dados/ia.json` desde sempre, e a tela nunca mostrou. É o dado mais barato e mais forte
 *    que existe aqui: saber que Argos é guerreira muda toda proposta que se faz a ela.
 * 2. **Passado** — a reputação. Um reino que quebrou promessa carrega isso à vista, e é o que
 *    faz a palavra dele valer ou não valer.
 * 3. **Vida própria** — as guerras, os pactos, os acordos e os tributos que ele tem **com
 *    OUTROS**. ⚠️ É esta a parte que mais faltava: enquanto a tela só mostrava a relação de
 *    vocês dois, o mundo parecia ter duas pessoas dentro. Saber que Argos está em guerra com
 *    Tebas e paga tributo a Corinto transforma a proposta numa jogada dentro de um tabuleiro,
 *    e não numa transação isolada.
 *
 * Nada aqui é mecânica nova: é tudo dado que a campanha já responde e que ninguém perguntava.
 */

import type { Jogo } from '../contexto';
import { nomeDoEstiloDe } from '@/ia/estilo';

/** Um laço que este reino tem com um TERCEIRO — o que faz o mundo ter mais de duas pessoas. */
interface LacoComTerceiro {
  tipo: 'guerra' | 'pacto' | 'comercio' | 'tributo-recebe' | 'tributo-paga';
  /** O nome do terceiro, já legível. */
  nome: string;
}

export interface RetratoDoVizinho {
  /** `guerreiro`, `mercador`, `cauteloso`, `equilibrado` — a personalidade da IA dele. */
  temperamento: string;
  /** A frase que traduz o temperamento em conduta, para quem nunca leu o `ia.json`. */
  conduta: string;
  /** Quantas províncias ele tem. Tamanho é a primeira coisa que se olha num vizinho. */
  provincias: number;
  /** A capital dele, por nome. Vazio se ele não tem — um exilado. */
  capital: string;
  /** A reputação dele, de −100 a 0. Zero é quem nunca quebrou promessa. */
  reputacao: number;
  /** Os laços dele com terceiros, em ordem de peso: guerra primeiro. */
  lacos: readonly LacoComTerceiro[];
}

/**
 * O que cada temperamento significa na prática, em uma frase.
 *
 * ⚠️ **Descrevem CONDUTA, e não números.** "Vantagem 1.8× para declarar" é verdade e não diz
 * nada a quem está jogando; "só ataca quando a vitória é quase certa" é a mesma coisa dita na
 * língua de quem precisa decidir o que oferecer.
 */
const CONDUTAS: Record<string, string> = {
  guerreiro: 'Ataca com pouca vantagem e demora a aceitar a paz. Ouro não o demove.',
  mercador: 'Prefere renda a território. Assina quase qualquer acordo e evita a guerra.',
  cauteloso: 'Só ataca com vantagem grande, guarda o tesouro e sai cedo de guerra longa.',
  equilibrado: 'Sem mania: ataca quando compensa e faz as pazes quando não compensa mais.',
};

export function retratoDe(jogo: Jogo, id: string, eu: string): RetratoDoVizinho {
  const { campanha } = jogo;
  const temperamento = nomeDoEstiloDe(jogo.ia, id);
  const capital = campanha.capitalDe(id);

  const lacos: LacoComTerceiro[] = [];
  // Guerra primeiro: é o laço que muda o que vale a pena propor a ele hoje.
  for (const outro of campanha.guerrasDe(id)) {
    if (outro === eu) continue;
    lacos.push({ tipo: 'guerra', nome: campanha.poder(outro).nome });
  }
  for (const { com, tributo } of campanha.tributosDe(id)) {
    if (com === eu) continue;
    lacos.push({
      tipo: tributo.pagador === id ? 'tributo-paga' : 'tributo-recebe',
      nome: campanha.poder(com).nome,
    });
  }
  // Pacto e comércio por último: são o fundo estável, e não a notícia do dia.
  for (const outro of campanha.poderesComFicha()) {
    if (outro === id || outro === eu) continue;
    if (campanha.pactoAte(id, outro) !== undefined) {
      lacos.push({ tipo: 'pacto', nome: campanha.poder(outro).nome });
    }
  }
  for (const outro of campanha.acordosDe(id)) {
    if (outro === eu) continue;
    lacos.push({ tipo: 'comercio', nome: campanha.poder(outro).nome });
  }

  return {
    temperamento,
    conduta: CONDUTAS[temperamento] ?? CONDUTAS['equilibrado'] ?? '',
    provincias: campanha.provinciasDe(id).length,
    capital: capital === undefined ? '' : campanha.nomeDe(capital),
    reputacao: campanha.reputacaoDe(id),
    lacos,
  };
}

/** Como a opinião se lê em palavras, e o tom com que a tela a pinta. */
export interface Postura {
  rotulo: string;
  /** `bom`, `morno` ou `ruim` — é o que o CSS usa para escolher bronze, marfim ou sangue. */
  tom: string;
  /** O que essa faixa significa na prática, na voz de um conselheiro. */
  leitura: string;
}

/**
 * A opinião traduzida em POSTURA.
 *
 * ⚠️ **Porque "−37" não é uma resposta à pergunta que o jogador está fazendo.** Ele quer saber
 * se pode virar as costas para este vizinho, e um inteiro entre −100 e 100 obriga a decorar a
 * régua para descobrir. As faixas com nome dão a resposta na hora — e o número continua ali do
 * lado, com a conta aberta embaixo, para quem quiser conferir. É a mesma escolha que o jogo já
 * faz na felicidade: a palavra na frente, a aritmética atrás, e nenhuma das duas escondida.
 *
 * ⚠️ Os cortes NÃO são redondos por acaso: eles caem onde o jogo muda de comportamento. −25 é
 * onde o comércio trava, −20 onde o pacto mais curto abre, +15 e +45 os outros dois prazos. A
 * palavra muda no turno em que uma porta abre ou fecha, e não num múltiplo de dez bonito.
 */
export function posturaDaRelacao(relacao: number): Postura {
  if (relacao >= 45) {
    return {
      rotulo: 'Fiel',
      tom: 'bom',
      leitura: 'Assina com você o prazo mais longo que existe. Não teme suas fronteiras.',
    };
  }
  if (relacao >= 15) {
    return {
      rotulo: 'Amistoso',
      tom: 'bom',
      leitura: 'Confia o bastante para um pacto de vinte turnos.',
    };
  }
  if (relacao >= -20) {
    return {
      rotulo: 'Cordial',
      tom: 'morno',
      leitura: 'Comercia e assina o pacto curto. É onde vive quase todo vizinho.',
    };
  }
  if (relacao >= -25) {
    return {
      rotulo: 'Frio',
      tom: 'morno',
      leitura: 'Ainda abre o mercado, mas já não amarra as próprias mãos.',
    };
  }
  if (relacao >= -60) {
    return {
      rotulo: 'Hostil',
      tom: 'ruim',
      leitura: 'Fechou o mercado e o pacto. Resta o ouro: presente ou tributo.',
    };
  }
  return {
    rotulo: 'Inimigo',
    tom: 'ruim',
    leitura: 'Só falta a declaração. Se ele tiver vantagem, ela vem.',
  };
}
