/**
 * A fome cobra do exército: tira homens e **não devolve ninguém à terra natal**.
 *
 * ⚠️ É o contrário de dispensar e de desertar, e a diferença é o ponto: quem não recebe soldo
 * vai embora vivo, e a província de origem recupera aquela gente; quem passa fome no campo
 * morre, e a população não volta. Duas travas do exército, duas consequências — se as duas
 * devolvessem gente, uma seria redundante.
 */

import { homensEmFormacao } from '../formacao-de-leva';
import type { LevaEmFormacao } from '../formacao-de-leva';
import { forcaDe, retirar } from '../exercito';
import { doPoder, formacoes } from './consultas';
import type { EstadoDeMobilizacao } from './estado';

/**
 * Reparte as baixas proporcionalmente entre as hostes do poder, e depois entre as levas ainda
 * em formação, que também já comem.
 *
 * `pouparEm` lista as províncias cujas tropas ficam de fora — as cidades sitiadas do próprio
 * poder, que já pagam o relógio da despensa e não podem pagar a mesma fome duas vezes.
 * Devolve quantos de fato caíram.
 */
export function matarPorFome(
  estado: EstadoDeMobilizacao,
  idPoder: string,
  homens: number,
  pouparEm: ReadonlySet<string> = new Set(),
): number {
  const alvo = Math.floor(homens);
  if (alvo <= 0) return 0;

  const hostes = doPoder(estado, idPoder).filter((h) => !pouparEm.has(h.posicao));
  const emArmas = hostes.reduce((total, h) => total + forcaDe(h), 0);
  let mortos = 0;

  for (const hoste of hostes) {
    if (mortos >= alvo) break;
    const fatia = emArmas > 0 ? Math.floor((forcaDe(hoste) * alvo) / emArmas) : 0;
    const tirar = Math.min(Math.max(fatia, 0), forcaDe(hoste), alvo - mortos);
    if (tirar <= 0) continue;
    retirar(hoste, tirar);
    mortos += tirar;
    if (forcaDe(hoste) <= 0) delete estado.hostes[hoste.id];
  }

  // O resto do arredondamento, e o caso de o poder só ter leva em formação.
  for (const hoste of doPoder(estado, idPoder)) {
    if (mortos >= alvo) break;
    if (pouparEm.has(hoste.posicao)) continue;
    const tirar = Math.min(alvo - mortos, forcaDe(hoste));
    if (tirar <= 0) continue;
    retirar(hoste, tirar);
    mortos += tirar;
    if (forcaDe(hoste) <= 0) delete estado.hostes[hoste.id];
  }
  for (const { provincia, formacao } of formacoes(estado)) {
    if (mortos >= alvo) break;
    if (formacao.poder !== idPoder || pouparEm.has(provincia)) continue;
    const tirar = Math.min(alvo - mortos, homensEmFormacao(formacao));
    if (tirar <= 0) continue;
    tirarDaFormacao(formacao, tirar);
    mortos += tirar;
    if (homensEmFormacao(formacao) <= 0) delete estado.formacoes[provincia];
  }
  return mortos;
}

/**
 * A fome do cerco: mata homens DESTA hoste, sem devolver ninguém à origem.
 *
 * Par do `matarPorFome`, que reparte pelo poder inteiro: aqui quem morre é quem está preso
 * atrás da muralha, e a campanha diz exatamente quantos. Devolve quantos caíram.
 */
export function matarDaHoste(
  estado: EstadoDeMobilizacao,
  idHoste: string,
  homens: number,
): number {
  const exercito = estado.hostes[idHoste];
  if (!exercito) return 0;
  const tirar = Math.min(Math.max(0, Math.floor(homens)), forcaDe(exercito));
  if (tirar <= 0) return 0;
  retirar(exercito, tirar);
  if (forcaDe(exercito) <= 0) delete estado.hostes[exercito.id];
  return tirar;
}

/** O mesmo para a leva em formação desta província: ela também está dentro dos muros. */
export function matarDaFormacao(
  estado: EstadoDeMobilizacao,
  idProvincia: string,
  homens: number,
): number {
  const formacao = estado.formacoes[idProvincia];
  if (!formacao) return 0;
  const tirar = Math.min(Math.max(0, Math.floor(homens)), homensEmFormacao(formacao));
  if (tirar <= 0) return 0;
  tirarDaFormacao(formacao, tirar);
  if (homensEmFormacao(formacao) <= 0) delete estado.formacoes[idProvincia];
  return tirar;
}

/**
 * Tira homens de uma leva em formação, **proporcionalmente entre os grupos**.
 *
 * Nunca do primeiro da lista: a fome não escolhe a cavalaria só porque ela foi levantada
 * antes. O resto do arredondamento vai no maior, pra soma fechar exata.
 */
function tirarDaFormacao(formacao: LevaEmFormacao, homens: number): void {
  const total = homensEmFormacao(formacao);
  if (total <= 0 || homens <= 0) return;
  const alvo = Math.min(homens, total);

  const tirados = formacao.contingentes.map((c) => Math.floor((c.homens * alvo) / total));
  let resto = alvo - tirados.reduce((s, x) => s + x, 0);
  while (resto > 0) {
    let escolhido = -1;
    let maior = 0;
    for (const [i, c] of formacao.contingentes.entries()) {
      const sobra = c.homens - (tirados[i] ?? 0);
      if (sobra > maior) {
        maior = sobra;
        escolhido = i;
      }
    }
    if (escolhido < 0) break;
    tirados[escolhido] = (tirados[escolhido] ?? 0) + 1;
    resto -= 1;
  }

  for (const [i, c] of formacao.contingentes.entries()) c.homens -= tirados[i] ?? 0;
  formacao.contingentes = formacao.contingentes.filter((c) => c.homens > 0);
}
