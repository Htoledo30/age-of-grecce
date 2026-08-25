/**
 * O humor de cada província lido do mundo vivo: para onde ele caminha, e por quê.
 *
 * A fórmula é de `felicidade.ts`; aqui mora só a montagem da SITUAÇÃO — o que está
 * acontecendo naquela terra agora. A parcela alimentar é 100% provincial: só quem passa
 * fome recebe penalidade, e nenhum humor nacional desce por causa de um cerco distante.
 */

import { alvoDeFelicidade, parcelasDoAlvo, revoltosa } from '../felicidade';
import type { ParcelaDoAlvo, SituacaoDaProvincia } from '../felicidade';
import type { NucleoDaCampanha } from '../nucleo';
import { donoDe, dominioEstrangeiroEm } from '../provincia/consultas';
import { estaSitiada } from '../guerra/cercos';
import { humorDoImpostoEm } from '../governo/nivel-de-imposto';
import { balancoAlimentarDe } from '../alimentacao/balanco';
import { saldoAlimentarLocalEm } from '../alimentacao/contribuicao';
import { fomeDoCercoEm } from '../alimentacao/mantimentos-de-cerco';

/** ESTA província está passando fome agora? A pergunta é local, como a consequência. */
function passaFomeEm(nucleo: NucleoDaCampanha, idProvincia: string): boolean {
  if (estaSitiada(nucleo, idProvincia)) {
    return fomeDoCercoEm(nucleo, idProvincia)?.fomeAtiva === true;
  }
  return (
    saldoAlimentarLocalEm(nucleo, idProvincia) < 0 &&
    balancoAlimentarDe(nucleo, donoDe(nucleo, idProvincia)).saldoCivil < 0
  );
}

/** O humor desta província está na faixa revoltosa? É a que não paga imposto. */
export function emRevoltaEm(nucleo: NucleoDaCampanha, idProvincia: string): boolean {
  const humor = nucleo.estado.felicidade[idProvincia];
  return humor !== undefined && revoltosa(humor, nucleo.ajustes.felicidade);
}

/** A situação que decide o alvo do humor desta província. Uma montagem só, dois usos. */
function situacaoDeFelicidadeEm(
  nucleo: NucleoDaCampanha,
  idProvincia: string,
): SituacaoDaProvincia {
  return {
    passaFome: passaFomeEm(nucleo, idProvincia),
    sitiada: estaSitiada(nucleo, idProvincia),
    dominioEstrangeiro: dominioEstrangeiroEm(nucleo, idProvincia),
    construcoes: nucleo.estado.construcoes[idProvincia] ?? {},
    humorDoImposto: humorDoImpostoEm(nucleo, idProvincia),
  };
}

/** Para onde o humor desta província caminha. É o que a ficha pode explicar. */
export function alvoDeFelicidadeEm(
  nucleo: NucleoDaCampanha,
  idProvincia: string,
): number {
  return alvoDeFelicidade(
    situacaoDeFelicidadeEm(nucleo, idProvincia),
    nucleo.catalogo,
    nucleo.ajustes.felicidade,
  );
}

/** A conta do alvo, parcela a parcela — a mesma legibilidade da barra de comida. */
export function parcelasDeFelicidadeEm(
  nucleo: NucleoDaCampanha,
  idProvincia: string,
): readonly ParcelaDoAlvo[] {
  return parcelasDoAlvo(
    situacaoDeFelicidadeEm(nucleo, idProvincia),
    nucleo.catalogo,
    nucleo.ajustes.felicidade,
  );
}
