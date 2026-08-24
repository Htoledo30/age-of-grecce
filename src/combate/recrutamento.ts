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

import type { Ajustes } from '@/dados/esquema';

type AjustesCombate = Ajustes['jogo']['combate'];

/** Por que uma leva foi recusada — ou o que ela vai custar. */
export type RecusaDeLeva =
  { pode: true; ouro: number; homens: number } | { pode: false; motivo: string };

/** O que fazer com a situação da província no momento da leva. */
export interface SituacaoDaLeva {
  /** Habitantes que ainda estão na província. */
  populacao: number;
  tesouro: number;
}

/** Ouro que uma leva deste tamanho custa. Inteiro: dinheiro não tem centavo. */
export function custoDaLeva(homens: number, ajustes: AjustesCombate): number {
  return Math.round(homens * ajustes.custoPorHomem);
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
): number {
  const disponivel = disponivelParaLeva(situacao.populacao, ajustes);
  if (disponivel === 0 || situacao.tesouro < custoDaLeva(1, ajustes)) return 0;

  let minimo = 1;
  let maximo = disponivel;
  let resposta = 0;
  while (minimo <= maximo) {
    const meio = Math.floor((minimo + maximo) / 2);
    if (custoDaLeva(meio, ajustes) <= situacao.tesouro) {
      resposta = meio;
      minimo = meio + 1;
    } else {
      maximo = meio - 1;
    }
  }
  return resposta;
}

/** Manutenção por turno de um contingente. Inteiro, pelo mesmo motivo. */
export function manutencaoDe(homens: number, ajustes: AjustesCombate): number {
  return Math.round(homens * ajustes.manutencaoPorHomem);
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
): RecusaDeLeva {
  if (!Number.isInteger(homens) || homens <= 0) {
    return { pode: false, motivo: 'o número de homens precisa ser inteiro' };
  }
  const disponivel = disponivelParaLeva(situacao.populacao, ajustes);
  const piso = ajustes.populacaoMinima.toLocaleString('pt-BR');
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
        `há apenas ${disponivel.toLocaleString('pt-BR')} habitantes disponíveis — ` +
        `${piso} nunca saem daqui`,
    };
  }

  const ouro = custoDaLeva(homens, ajustes);
  if (ouro > situacao.tesouro) {
    return {
      pode: false,
      motivo: `faltam ${(ouro - situacao.tesouro).toLocaleString('pt-BR')} moedas`,
    };
  }
  return { pode: true, ouro, homens };
}
