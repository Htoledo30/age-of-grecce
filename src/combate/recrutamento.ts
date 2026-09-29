/**
 * As regras de levantar tropa: o que custa e por que é recusado.
 *
 * Funções puras — nenhum estado mora aqui, e é isso que deixa o recrutamento inteiro
 * ficar sob teste no vitest sem subir uma tela.
 *
 * A regra que organiza tudo:
 *
 *     recrutar custa OURO e custa POPULAÇÃO da província onde se recruta
 *
 * ⚠️ **Não existe fração recrutável nem lote mínimo.** O limite é a população atual
 * **menos o piso que a província nunca cede** — pode-se levantar qualquer quantidade
 * inteira positiva dentro disso, havendo ouro para reunir a leva.
 *
 * ⚠️ **Quem vai pras armas sai da população**, e por isso o imposto daquela província cai
 * na mesma hora e reduz quantos habitantes ainda estão disponíveis. Mobilizar tem preço contínuo,
 * não só preço de entrada.
 */

import type { Arma } from './exercito';
import type { Ajustes } from '@/dados/esquema';
import { milhar } from '@/nucleo/numeros';

type AjustesCombate = Ajustes['jogo']['combate'];

/** Por que uma leva foi recusada — ou o que ela vai custar. */
export type RecusaDeLeva =
  { pode: true; ouro: number; homens: number } | { pode: false; motivo: string };

/** O que fazer com a situação da província no momento da leva. */
export interface SituacaoDaLeva {
  /** As armas que esta terra levanta agora. `leve` está sempre nela. */
  armas: readonly Arma[];
  /** Habitantes que ainda estão na província. */
  populacao: number;
  tesouro: number;
}

/** Ouro que uma leva deste tamanho custa. Inteiro: dinheiro não tem centavo. */
export function custoDaLeva(
  homens: number,
  ajustes: AjustesCombate,
  arma: Arma = 'leve',
): number {
  return Math.round(homens * ajustes.custoPorHomem * ajustes.batalha.armas[arma].custo);
}

/**
 * Quantos habitantes esta província ainda cede a uma leva.
 *
 * `população − piso`, nunca negativo. Uma função só, usada pela recusa e pela tela: se
 * cada lado fizesse a própria conta, um dia o painel ofereceria uma leva que a regra
 * recusa, e o jogador leria isso como defeito do jogo — que é o que seria.
 */
export function disponivelParaLeva(populacao: number, ajustes: AjustesCombate): number {
  return Math.max(0, Math.floor(populacao) - ajustes.populacaoMinima);
}

/**
 * O maior contingente que a situação permite oferecer ao jogador AGORA.
 *
 * A interface usa este teto em vez de oferecer números que a própria regra recusaria.
 * A busca binária respeita `custoDaLeva` inclusive quando o custo por homem não é inteiro;
 * assim a barra e a cobrança nunca discordam por causa de arredondamento.
 */
export function maximoDaLeva(
  situacao: Pick<SituacaoDaLeva, 'populacao' | 'tesouro'>,
  ajustes: AjustesCombate,
  arma: Arma = 'leve',
): number {
  const disponivel = disponivelParaLeva(situacao.populacao, ajustes);
  if (disponivel === 0 || situacao.tesouro < custoDaLeva(1, ajustes, arma)) return 0;

  let minimo = 1;
  let maximo = disponivel;
  let resposta = 0;
  while (minimo <= maximo) {
    const meio = Math.floor((minimo + maximo) / 2);
    if (custoDaLeva(meio, ajustes, arma) <= situacao.tesouro) {
      resposta = meio;
      minimo = meio + 1;
    } else {
      maximo = meio - 1;
    }
  }
  return resposta;
}

/**
 * Manutenção por turno de um contingente, à taxa que quem chama escolher. Inteiro, pelo
 * mesmo motivo.
 *
 * Recebe a TAXA e não o pacote de ajustes porque ela deixou de ser única: o mesmo homem
 * custa uma coisa parado em casa e outra pisando em terra alheia, e quem sabe onde ele
 * está é quem chama.
 */
export function manutencaoDe(homens: number, taxa: number): number {
  return Math.round(homens * taxa);
}

/**
 * Por que esta arma não se levanta aqui.
 *
 * Exportado porque o painel de recrutamento mostra as quatro armas SEMPRE, com as trancadas
 * apagadas e o motivo no tooltip — é assim que o jogador descobre que existe cavalaria e o
 * que ela exige, sem tutorial. Se a recusa e a tela escrevessem cada uma a sua frase, um dia
 * elas discordariam sobre o que é preciso construir.
 */
export function motivoDaArmaTrancada(arma: Arma): string {
  // ⚠️ **O que FALTA, e nada mais.** Cada motivo era uma frase de ensino — "esta terra não
  // tem Armaria: sem ela só se levantam soldados leves" — e quatro dessas lado a lado no
  // painel viravam um parágrafo onde deviam estar quatro palavras. Por que aquela
  // construção só nasce em certas terras é assunto do catálogo de construções, não do
  // cartão da arma.
  if (arma === 'hoplita') return 'falta Armaria';
  if (arma === 'arqueiro') return 'falta Acampamento de arqueiro';
  if (arma === 'cavalaria') return 'falta Treinamento de cavaleiros';
  // O leve nunca chega aqui: ele é a linha de base e toda província o levanta.
  return 'esta terra não levanta esta arma';
}

/**
 * Pode levantar esta leva aqui?
 *
 * Devolve o MOTIVO da recusa, e não só `false`: é a regra da casa, e é o que deixa a
 * interface ensinar a mecânica sem tutorial. "Faltam 400 moedas" e "há apenas 1.200
 * habitantes disponíveis" são coisas diferentes e o jogador precisa saber qual é.
 */
export function avaliarLeva(
  homens: number,
  situacao: SituacaoDaLeva,
  ajustes: AjustesCombate,
  arma: Arma = 'leve',
): RecusaDeLeva {
  // ⚠️ O portão da ARMA vem antes de qualquer conta: recusar por ouro numa arma que a
  // província nem levanta seria mandar o jogador juntar dinheiro para nada.
  if (!situacao.armas.includes(arma)) {
    return { pode: false, motivo: motivoDaArmaTrancada(arma) };
  }
  if (!Number.isInteger(homens) || homens <= 0) {
    return { pode: false, motivo: 'o número de homens precisa ser inteiro' };
  }
  const disponivel = disponivelParaLeva(situacao.populacao, ajustes);
  const piso = milhar(ajustes.populacaoMinima);
  if (disponivel <= 0) {
    return {
      pode: false,
      motivo: `esta província não cede mais gente: ela precisa manter ${piso} habitantes`,
    };
  }
  if (homens > disponivel) {
    return {
      pode: false,
      motivo:
        `há apenas ${milhar(disponivel)} habitantes disponíveis — ` +
        `${piso} nunca saem daqui`,
    };
  }

  const ouro = custoDaLeva(homens, ajustes, arma);
  if (ouro > situacao.tesouro) {
    return {
      pode: false,
      motivo: `faltam ${milhar((ouro - situacao.tesouro))} moedas`,
    };
  }
  return { pode: true, ouro, homens };
}
