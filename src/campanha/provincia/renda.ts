/**
 * A renda de uma província lida do mundo vivo.
 *
 * A fórmula é de `economia.ts`; aqui mora só a montagem da BASE — o que a província é
 * agora: construções erguidas, povo restante, corrupção, decreto de imposto, greve fiscal
 * e cerco. Trocar de dono, mudar a capital ou perder gente muda a renda no mesmo instante,
 * porque nada disto é guardado.
 */

import { rendaDaProvincia } from '../economia';
import type { BaseDaProvincia, RendaDaProvincia } from '../economia';
import type { NucleoDaCampanha } from '../nucleo';
import { rendaDeTrocas } from '../comercio/rede-de-trocas';
import { corrupcaoEm } from '../governo/corrupcao-na-provincia';
import { fatorDeImpostoEm } from '../governo/nivel-de-imposto';
import { estaSitiada } from '../guerra/cercos';
import { emRevoltaEm } from '../sociedade/humor';
import { fichaDe, populacaoDe } from './consultas';

/** O que a província é agora, tirando a fórmula: é o que as contas comparam. */
export function baseDe(nucleo: NucleoDaCampanha, idProvincia: string): BaseDaProvincia {
  return {
    construcoes: nucleo.estado.construcoes[idProvincia] ?? {},
    populacao: populacaoDe(nucleo, idProvincia),
    corrupcao: corrupcaoEm(nucleo, idProvincia).total,
    fatorDeImposto: fatorDeImpostoEm(nucleo, idProvincia),
    revoltosa: emRevoltaEm(nucleo, idProvincia),
    sitiada: estaSitiada(nucleo, idProvincia),
  };
}

/**
 * A economia de uma província, ou `null` quando ela não foi configurada.
 *
 * `null` é resposta legítima e a interface a mostra com todas as letras. Não existe
 * fórmula de reserva por área: província sem ficha econômica não arrecada e não é
 * simulada, e é melhor que o jogo admita isso do que invente número.
 */
export function economiaDe(
  nucleo: NucleoDaCampanha,
  idProvincia: string,
): RendaDaProvincia | null {
  const ficha = fichaDe(nucleo, idProvincia);
  if (!ficha) return null;
  return rendaDaProvincia(
    ficha,
    nucleo.economia.produtos,
    nucleo.catalogo,
    nucleo.ajustes.economia,
    baseDe(nucleo, idProvincia),
  );
}

/**
 * A renda do reino: o que as terras rendem MAIS o que a variedade delas rende.
 *
 * ⚠️ A rede de trocas é uma parcela NACIONAL e não cabe em província nenhuma — ela existe
 * porque o reino alcança bens distintos, não porque alguma terra os produziu. Por isso a
 * tabela do Governo, que é província a província, nunca vai fechar sozinha com este número:
 * o resumo é que mostra os dois.
 */
export function rendaDe(nucleo: NucleoDaCampanha, idPoder: string): number {
  let total = 0;
  for (const id of nucleo.territorios.provinciasDe(idPoder)) {
    total += economiaDe(nucleo, id)?.total ?? 0;
  }
  return total + rendaDeTrocas(nucleo, idPoder);
}

/** Quantas províncias do poder ainda estão sem economia configurada. */
export function semEconomia(nucleo: NucleoDaCampanha, idPoder: string): number {
  return nucleo.territorios
    .provinciasDe(idPoder)
    .filter((id) => economiaDe(nucleo, id) === null).length;
}

/**
 * O saldo COMPLETO da província: renda líquida menos a tropa que ela pôs em armas.
 *
 * É o número que responde "esta terra me sustenta ou me puxa pra baixo?" — e é `null` onde
 * não há economia, pela honestidade de sempre. A soma por província pode divergir do total
 * do poder em uma moeda, por arredondamento de cada folha; a barra continua usando a conta
 * do poder, que é a que o tesouro sente.
 */
export function saldoDaProvincia(
  nucleo: NucleoDaCampanha,
  idProvincia: string,
): number | null {
  const renda = economiaDe(nucleo, idProvincia);
  if (!renda) return null;
  return renda.total - nucleo.mobilizacao.custoDaTropaDe(idProvincia);
}
