/**
 * As regras de levantar tropa: o que custa, quanto cabe, e por que é recusado.
 *
 * Funções puras — nenhum estado mora aqui, e é isso que deixa o recrutamento inteiro
 * ficar sob teste no vitest sem subir uma tela.
 *
 * A regra que organiza tudo:
 *
 *     recrutar custa OURO e custa POPULAÇÃO da província onde se recruta
 *
 * ⚠️ **A população é o limite que importa, não o ouro.** O ouro sozinho faria exército
 * brotar de tesouro grande, e um reino rico venceria digitando. Com o teto por população,
 * uma província despovoada não vira exército por mais dinheiro que exista — e tomar uma
 * cidade grande passa a valer por gente, não só por renda.
 *
 * ⚠️ **Quem vai pras armas sai da população**, e por isso o imposto daquela província cai
 * na mesma hora e o próprio teto de recrutamento aperta. Mobilizar tem preço contínuo,
 * não só preço de entrada.
 */

import type { Ajustes } from '@/dados/esquema';

type AjustesCombate = Ajustes['jogo']['combate'];

/** Por que uma leva foi recusada — ou o que ela vai custar. */
export type RecusaDeLeva =
  | { pode: true; ouro: number; homens: number }
  | { pode: false; motivo: string };

/** O que fazer com a situação da província no momento da leva. */
export interface SituacaoDaLeva {
  /** Habitantes que ainda estão na província. */
  populacao: number;
  /** Homens desta província que JÁ estão em armas, onde quer que estejam. */
  jaEmArmas: number;
  tesouro: number;
  /** A província tem Quartel erguido? */
  temQuartel: boolean;
}

/** Ouro que uma leva deste tamanho custa. Inteiro: dinheiro não tem centavo. */
export function custoDaLeva(homens: number, ajustes: AjustesCombate): number {
  return Math.round(homens * ajustes.custoPorHomem);
}

/** Manutenção por turno de um contingente. Inteiro, pelo mesmo motivo. */
export function manutencaoDe(homens: number, ajustes: AjustesCombate): number {
  return Math.round(homens * ajustes.manutencaoPorHomem);
}

/**
 * Quantos homens esta província ainda pode pôr em armas.
 *
 * O teto é sobre a população ORIGINAL da leva — quem já está fora conta contra o limite,
 * senão bastaria recrutar em rodadas para esvaziar a cidade inteira.
 */
export function tetoDeRecrutamento(
  populacao: number,
  jaEmArmas: number,
  ajustes: AjustesCombate,
): number {
  const teto = Math.floor((populacao + jaEmArmas) * ajustes.fracaoRecrutavel);
  return Math.max(0, Math.min(teto - jaEmArmas, populacao));
}

/**
 * Pode levantar esta leva aqui?
 *
 * Devolve o MOTIVO da recusa, e não só `false`: é a regra da casa, e é o que deixa a
 * interface ensinar a mecânica sem tutorial. "Faltam 400 moedas" e "esta província só
 * comporta mais 1.200 homens" são coisas diferentes e o jogador precisa saber qual é.
 */
export function avaliarLeva(
  homens: number,
  situacao: SituacaoDaLeva,
  ajustes: AjustesCombate,
): RecusaDeLeva {
  if (!situacao.temQuartel) {
    return { pode: false, motivo: 'é preciso um Quartel aqui para reunir tropa' };
  }
  if (!Number.isInteger(homens) || homens <= 0) {
    return { pode: false, motivo: 'o número de homens precisa ser inteiro' };
  }
  if (homens < ajustes.minimoPorLeva) {
    return {
      pode: false,
      motivo: `a leva mínima é de ${ajustes.minimoPorLeva.toLocaleString('pt-BR')} homens`,
    };
  }

  const teto = tetoDeRecrutamento(situacao.populacao, situacao.jaEmArmas, ajustes);
  if (teto <= 0) {
    return { pode: false, motivo: 'esta província já tem em armas tudo o que comporta' };
  }
  if (homens > teto) {
    return {
      pode: false,
      motivo: `esta província comporta mais ${teto.toLocaleString('pt-BR')} homens em armas`,
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
