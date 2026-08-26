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
import { donoDe, dominioEstrangeiroEm, populacaoDe } from '../provincia/consultas';
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
    guarnicao: fracaoDaGuarnicaoEm(nucleo, idProvincia),
  };
}

/**
 * Que fatia da população desta terra está em armas AQUI, do próprio dono.
 *
 * ⚠️ **Só a tropa do DONO, e só a que está parada aqui.** Exército inimigo acampado na porta
 * não é ordem pública — é cerco, e o cerco já desconta os seus próprios pontos. Somar as duas
 * coisas faria uma cidade sitiada ficar mais feliz quanto maior fosse quem a sitia.
 */
function fracaoDaGuarnicaoEm(nucleo: NucleoDaCampanha, idProvincia: string): number {
  const povo = populacaoDe(nucleo, idProvincia);
  if (povo <= 0) return 0;
  const dono = donoDe(nucleo, idProvincia);
  let homens = 0;
  for (const hoste of nucleo.mobilizacao.hostesEm(idProvincia)) {
    if (hoste.poder === dono) homens += nucleo.mobilizacao.forcaDaHoste(hoste.id);
  }
  return homens / povo;
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
