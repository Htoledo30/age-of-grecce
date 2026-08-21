/**
 * O intervalo entre pagar uma leva e ter uma hoste pronta para marchar.
 *
 * Recrutas em formação já saíram da população e já foram pagos, mas ainda não são um
 * `Exercito`: não marcham, não lutam e não cobram manutenção. Mantê-los separados é o
 * que permite haver veteranos prontos e recrutas exaustos na mesma província sem
 * congelar a hoste inteira nem deixar os recém-chegados participarem de uma batalha.
 */

import { exercitoVazio, somarLeva } from './exercito';
import type { Exercito } from './exercito';

/** Uma leva paga, visível no mapa, que ficará pronta numa rodada futura. */
export interface LevaEmFormacao {
  poder: string;
  /** Terra de onde estes homens saíram e para onde voltam se a formação for interrompida. */
  origem: string;
  homens: number;
  /** Primeiro turno em que a leva já pode receber ordens. */
  prontaNoTurno: number;
}

/** Recorte de estado que a formação pode alterar. */
export interface EstadoDasFormacoes {
  populacao: Record<string, number>;
  hostes: Record<string, Exercito>;
  proximaHoste: number;
  formacoes: Record<string, LevaEmFormacao>;
}

/**
 * Registra uma leva na província. Recrutar mais de uma vez na mesma rodada apenas soma
 * os homens: continua existindo uma formação e todos ficam prontos juntos.
 */
export function iniciarFormacao(
  formacoes: Record<string, LevaEmFormacao>,
  idProvincia: string,
  poder: string,
  homens: number,
  turnoAtual: number,
): void {
  const existente = formacoes[idProvincia];
  if (existente && existente.poder !== poder) {
    throw new Error(`há recrutas de ${existente.poder} em formação em ${idProvincia}`);
  }

  if (existente) {
    existente.homens += homens;
    existente.prontaNoTurno = Math.max(existente.prontaNoTurno, turnoAtual + 1);
    return;
  }

  formacoes[idProvincia] = {
    poder,
    origem: idProvincia,
    homens,
    prontaNoTurno: turnoAtual + 1,
  };
}

export interface ResultadoDasFormacoes {
  ativadas: readonly { provincia: string; homens: number }[];
  interrompidas: readonly { provincia: string; homens: number }[];
}

/**
 * Conclui as levas cujo prazo venceu.
 *
 * A posse e a ocupação são conferidas só na conclusão. Se a terra caiu ou há uma hoste
 * inimiga sobre ela, a formação se desfaz: o ouro não volta, mas os homens retornam à
 * população da própria terra. Uma conquista não pode transformar recrutas pagos pelo
 * derrotado em soldados gratuitos do vencedor.
 */
export function concluirFormacoes(
  estado: EstadoDasFormacoes,
  turnoAtual: number,
  donoDe: (idProvincia: string) => string,
): ResultadoDasFormacoes {
  const ativadas: { provincia: string; homens: number }[] = [];
  const interrompidas: { provincia: string; homens: number }[] = [];

  for (const idProvincia of Object.keys(estado.formacoes).sort()) {
    const formacao = estado.formacoes[idProvincia];
    if (!formacao || formacao.prontaNoTurno > turnoAtual) continue;

    // Por posicao, e nao por chave: a provincia deixou de ser o endereco da hoste.
    const hoste = Object.keys(estado.hostes)
      .sort()
      .map((id) => estado.hostes[id])
      .find((h) => h !== undefined && h.posicao === idProvincia);
    const perdeuAFormacao =
      donoDe(idProvincia) !== formacao.poder ||
      (hoste !== undefined && hoste.poder !== formacao.poder);

    if (perdeuAFormacao) {
      estado.populacao[formacao.origem] =
        (estado.populacao[formacao.origem] ?? 0) + formacao.homens;
      interrompidas.push({ provincia: idProvincia, homens: formacao.homens });
      delete estado.formacoes[idProvincia];
      continue;
    }

    // A leva pronta engrossa a hoste que ja estava ali, ou nasce como hoste nova com
    // identidade propria. O contador vem do estado, e e o mesmo de todo mundo.
    const exercito =
      hoste ?? exercitoVazio(`h${estado.proximaHoste++}`, formacao.poder, idProvincia);
    somarLeva(exercito, formacao.origem, formacao.homens);
    estado.hostes[exercito.id] = exercito;
    ativadas.push({ provincia: idProvincia, homens: formacao.homens });
    delete estado.formacoes[idProvincia];
  }

  return { ativadas, interrompidas };
}
