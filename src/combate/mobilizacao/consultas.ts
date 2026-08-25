/**
 * As perguntas sobre quem está em armas — nenhuma delas muda nada.
 *
 * ⚠️ **Tudo ordenado por id.** `Object.keys` devolve a ordem de criação, e percorrer isso cru
 * faria o desenho e a folha de pagamento dependerem de quem foi recrutado primeiro.
 */

import type { Ajustes } from '@/dados/esquema';
import { bocasDe } from '../composicao';
import { forcaDe, porTerra } from '../exercito';
import type { Exercito } from '../exercito';
import { homensEmFormacao } from '../formacao-de-leva';
import type { LevaEmFormacao } from '../formacao-de-leva';
import { disponivelParaLeva } from '../recrutamento';
import { taxaDe } from './folha';
import type { EmCasa } from './folha';
import { populacaoDe } from './estado';
import type { EstadoDeMobilizacao } from './estado';

type AjustesCombate = Ajustes['jogo']['combate'];

/** Toda hoste em pé no mundo, em ordem de id. É o que o mapa desenha. */
export function todas(estado: EstadoDeMobilizacao): Exercito[] {
  return Object.keys(estado.hostes)
    .sort()
    .flatMap((id) => {
      const h = estado.hostes[id];
      return h ? [h] : [];
    });
}

/** A hoste com este id, onde quer que esteja. */
export function hoste(estado: EstadoDeMobilizacao, idHoste: string): Exercito | undefined {
  return estado.hostes[idHoste];
}

/** Toda hoste parada nesta provincia, em ordem estavel de id. */
export function hostesEm(
  estado: EstadoDeMobilizacao,
  idProvincia: string,
): readonly Exercito[] {
  return todas(estado).filter((h) => h.posicao === idProvincia);
}

/**
 * A ÚNICA hoste parada aqui, ou `undefined`.
 *
 * ⚠️ **Devolve `undefined` quando há mais de uma**, de propósito. Antes devolvia "a primeira
 * por id", e isso virou mentira no dia em que sitiar deixou de engajar: com o sitiante
 * acampado ao lado da guarnição, "a primeira" é quem foi recrutado antes — o defensor — e a
 * interface inteira passou a falar do exército errado.
 *
 * Continua servindo às regras que são mesmo da PROVÍNCIA e onde duas seriam um erro.
 */
export function unicaEm(
  estado: EstadoDeMobilizacao,
  idProvincia: string,
): Exercito | undefined {
  const aqui = hostesEm(estado, idProvincia);
  return aqui.length === 1 ? aqui[0] : undefined;
}

/** Quantos homens tem ESTA hoste. Não é o total do lugar. */
export function forcaDaHoste(estado: EstadoDeMobilizacao, idHoste: string): number {
  return forcaDe(hoste(estado, idHoste));
}

/** Homens de um PODER parados nesta província. Zero quando ele não está aqui. */
export function forcaEm(
  estado: EstadoDeMobilizacao,
  idProvincia: string,
  idPoder: string,
): number {
  return hostesEm(estado, idProvincia)
    .filter((h) => h.poder === idPoder)
    .reduce((total, h) => total + forcaDe(h), 0);
}

export function formacaoEm(
  estado: EstadoDeMobilizacao,
  idProvincia: string,
): LevaEmFormacao | undefined {
  return estado.formacoes[idProvincia];
}

/** Todas as levas que já aparecem no mundo, mas ainda não aceitam ordens. */
export function formacoes(
  estado: EstadoDeMobilizacao,
): readonly { provincia: string; formacao: LevaEmFormacao }[] {
  return Object.entries(estado.formacoes).map(([provincia, formacao]) => ({
    provincia,
    formacao,
  }));
}

/** As hostes deste poder, onde quer que estejam — inclusive em terra alheia. */
export function doPoder(estado: EstadoDeMobilizacao, idPoder: string): readonly Exercito[] {
  return todas(estado).filter((h) => h.poder === idPoder);
}

/**
 * Este poder ainda tem alguém em armas?
 *
 * É a metade da pergunta "está vivo?" que o território não responde: um poder que perdeu o
 * último chão mas mantém uma hoste continua no jogo, no exílio.
 */
export function temTropa(estado: EstadoDeMobilizacao, idPoder: string): boolean {
  return (
    doPoder(estado, idPoder).length > 0 ||
    formacoes(estado).some(({ formacao }) => formacao.poder === idPoder)
  );
}

/**
 * Quantos homens em armas este poder sustenta, contando as levas em formação.
 *
 * ⚠️ **A leva conta.** Ela já saiu da população e já come — só não marcha nem luta. Não
 * contá-la abriria uma brecha em que recrutar na véspera da fome sairia de graça.
 */
export function homensDe(estado: EstadoDeMobilizacao, idPoder: string): number {
  let homens = 0;
  for (const h of doPoder(estado, idPoder)) homens += forcaDe(h);
  for (const { formacao } of formacoes(estado)) {
    if (formacao.poder === idPoder) homens += homensEmFormacao(formacao);
  }
  return homens;
}

/**
 * Quantas BOCAS este poder tem em armas — e cavalo come por vários homens.
 *
 * ⚠️ **É esta a conta que a comida usa**, e não `homensDe`. Um cavaleiro é um homem na folha
 * de pagamento e várias bocas na mesa: é assim que a cavalaria vira pressão sobre a TERRA em
 * vez de mais uma linha do tesouro. Para exército só de leves os dois números são idênticos,
 * porque o leve é a régua.
 *
 * A leva em formação conta pelo mesmo motivo que conta em `homensDe`: ela já saiu da
 * população e já come.
 */
export function bocasEmArmasDe(
  estado: EstadoDeMobilizacao,
  ajustes: AjustesCombate,
  idPoder: string,
): number {
  let bocas = 0;
  for (const h of doPoder(estado, idPoder)) bocas += bocasDe(h.contingentes, ajustes.batalha);
  for (const { formacao } of formacoes(estado)) {
    if (formacao.poder === idPoder) bocas += bocasDe(formacao.contingentes, ajustes.batalha);
  }
  return bocas;
}

/** As bocas de uma hoste só — para descontar as que estão presas numa cidade sitiada. */
export function bocasDaHoste(
  estado: EstadoDeMobilizacao,
  ajustes: AjustesCombate,
  idHoste: string,
): number {
  const h = estado.hostes[idHoste];
  return h ? bocasDe(h.contingentes, ajustes.batalha) : 0;
}

/** Quantos homens nascidos nesta província estão em armas em todo o mapa. */
export function homensEmArmasDe(
  estado: EstadoDeMobilizacao,
  idProvincia: string,
): number {
  let total = 0;
  for (const exercito of Object.values(estado.hostes)) {
    total += porTerra(exercito)[idProvincia] ?? 0;
  }
  for (const formacao of Object.values(estado.formacoes)) {
    if (formacao.origem === idProvincia) total += homensEmFormacao(formacao);
  }
  return total;
}

/**
 * O que a tropa NASCIDA nesta província custa por turno, onde quer que esteja.
 *
 * É a resposta de "esta terra me puxa pra baixo?": a origem de cada soldado já é rastreada,
 * então a folha militar pode ser lida terra a terra. Só hostes ativas — a leva em formação
 * ainda não recebe soldo.
 *
 * ⚠️ A taxa sai de ONDE A HOSTE ESTÁ, não de onde o homem nasceu. Os filhos de Tanagra
 * sitiando Tebas custam campanha; parados em Tanagra, custam casa. Por isso a conta é por
 * hoste e não uma soma de homens vezes um número só.
 */
export function custoDaTropaDe(
  estado: EstadoDeMobilizacao,
  ajustes: AjustesCombate,
  idProvincia: string,
  emCasa: EmCasa,
): number {
  let devido = 0;
  for (const exercito of Object.values(estado.hostes)) {
    const daqui = porTerra(exercito)[idProvincia] ?? 0;
    if (daqui > 0) devido += daqui * taxaDe(exercito, ajustes, emCasa);
  }
  return Math.round(devido);
}

/** Quantos habitantes esta província ainda cede a uma leva. */
export function disponivelParaLevaEm(
  estado: EstadoDeMobilizacao,
  ajustes: AjustesCombate,
  idProvincia: string,
): number {
  return disponivelParaLeva(populacaoDe(estado, idProvincia), ajustes);
}
