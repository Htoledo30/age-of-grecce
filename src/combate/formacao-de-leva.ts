/**
 * O intervalo entre pagar uma leva e ter uma hoste pronta para marchar.
 *
 * Recrutas em formação já saíram da população e já foram pagos, mas ainda não são um
 * `Exercito`: não marcham e não cobram manutenção. Mantê-los separados é o que permite haver
 * veteranos prontos e recrutas exaustos na mesma província sem congelar a hoste inteira.
 *
 * ⚠️ **Mas DEFENDEM a própria terra.** Henrique: *"se eu mandei fazer tropas numa província e
 * alguém está atacando aquela província, aquelas tropas deveriam defender"*. Quando o inimigo
 * chega, a leva é convocada antes da hora — ver `convocarFormacao`.
 */

import { ARMAS, exercitoVazio, somarLeva } from './exercito';
import type { Arma, Exercito } from './exercito';

/** Uma leva paga, visível no mapa, que ficará pronta numa rodada futura. */
export interface LevaEmFormacao {
  poder: string;
  /** Terra de onde estes homens saíram e para onde voltam se a formação for interrompida. */
  origem: string;
  /**
   * Os grupos em treino: arma e qualidade de cada um.
   *
   * ⚠️ **Uma lista, e não uma arma só**, para recrutar hoplitas e arqueiros na mesma terra no
   * mesmo turno não se atropelar. E fica na FORMAÇÃO em vez de ser perguntado depois: a
   * província pode perder a Armaria — ou o dono — entre o recrutamento e o dia em que a leva
   * vira hoste, e esta tropa já foi equipada.
   *
   * ⚠️ **O total NÃO é guardado ao lado.** Guardar um total junto do detalhe é convidar os
   * dois a discordarem, e é a mesma regra que a hoste já segue. Use `homensEmFormacao`.
   */
  contingentes: { arma: Arma; qualidade: number; homens: number }[];
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
  arma: Arma = 'leve',
  qualidade = 1,
): void {
  const existente = formacoes[idProvincia];
  if (existente && existente.poder !== poder) {
    throw new Error(`há recrutas de ${existente.poder} em formação em ${idProvincia}`);
  }

  if (existente) {
    const igual = existente.contingentes.find(
      (c) => c.arma === arma && c.qualidade === qualidade,
    );
    if (igual) igual.homens += homens;
    else existente.contingentes.push({ arma, qualidade, homens });
    ordenarContingentes(existente.contingentes);
    // ⚠️ O prazo é o do ÚLTIMO que entrou: quem chega hoje não fica pronto com quem chegou
    // ontem. Sem isto, recrutar todo turno manteria uma leva eternamente a um turno do fim.
    existente.prontaNoTurno = Math.max(existente.prontaNoTurno, turnoAtual + 1);
    return;
  }

  formacoes[idProvincia] = {
    poder,
    origem: idProvincia,
    contingentes: [{ arma, qualidade, homens }],
    prontaNoTurno: turnoAtual + 1,
  };
}

/** Quantos homens esta leva tem ao todo. Derivado, nunca guardado. */
export function homensEmFormacao(formacao: LevaEmFormacao | undefined): number {
  if (!formacao) return 0;
  let total = 0;
  for (const c of formacao.contingentes) total += c.homens;
  return total;
}

/** Ordem fixa: arma e depois qualidade. Determinismo antes de qualquer soma. */
function ordenarContingentes(
  contingentes: { arma: Arma; qualidade: number; homens: number }[],
): void {
  contingentes.sort(
    (a, b) => ARMAS.indexOf(a.arma) - ARMAS.indexOf(b.arma) || a.qualidade - b.qualidade,
  );
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

    // E a leva se perde quando a TERRA cai, não quando alguém acampa na porta: cidade
    // sitiada continua levantando tropa — é o que `cerco.ts` promete com todas as letras.
    const perdeuAFormacao = donoDe(idProvincia) !== formacao.poder;

    if (perdeuAFormacao) {
      const perdidos = homensEmFormacao(formacao);
      estado.populacao[formacao.origem] = (estado.populacao[formacao.origem] ?? 0) + perdidos;
      interrompidas.push({ provincia: idProvincia, homens: perdidos });
      delete estado.formacoes[idProvincia];
      continue;
    }

    ativadas.push({ provincia: idProvincia, homens: ativar(estado, idProvincia, formacao) });
  }

  return { ativadas, interrompidas };
}

/**
 * A leva desta província vira hoste AGORA, antes do prazo: o inimigo chegou à porta.
 * Devolve quantos homens entraram em armas (0 se não havia leva).
 *
 * Existe para a leva defender a própria terra: sem isto, os recrutas pagos na virada em que
 * a província era atacada assistiam à batalha e à queda da cidade sem pegar em armas.
 */
export function convocarFormacao(estado: EstadoDasFormacoes, idProvincia: string): number {
  const formacao = estado.formacoes[idProvincia];
  if (!formacao) return 0;
  return ativar(estado, idProvincia, formacao);
}

/** A leva engrossa a hoste do mesmo poder que já está ali, ou nasce como hoste nova. */
function ativar(
  estado: EstadoDasFormacoes,
  idProvincia: string,
  formacao: LevaEmFormacao,
): number {
  // Por posicao, e nao por chave: a provincia deixou de ser o endereco da hoste.
  //
  // ⚠️ **A hoste que recebe a leva é a do MESMO poder.** Procurava só por posição, e isso
  // quebrou quando sitiar deixou de engajar: numa cidade sitiada há duas hostes ali, e a
  // primeira por id podia ser a do sitiante — a leva do defensor engordava o exército
  // que estava cercando a cidade dele.
  const hoste = Object.keys(estado.hostes)
    .sort()
    .map((id) => estado.hostes[id])
    .find((h) => h !== undefined && h.posicao === idProvincia && h.poder === formacao.poder);
  // O contador vem do estado, e é o mesmo de todo mundo.
  const exercito =
    hoste ?? exercitoVazio(`h${estado.proximaHoste++}`, formacao.poder, idProvincia);
  // Cada grupo entra com a arma e o treino que recebeu ao ser levantado.
  for (const c of formacao.contingentes) {
    somarLeva(exercito, formacao.origem, c.homens, c.arma, c.qualidade);
  }
  estado.hostes[exercito.id] = exercito;
  delete estado.formacoes[idProvincia];
  return homensEmFormacao(formacao);
}
