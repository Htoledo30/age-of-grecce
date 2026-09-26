/**
 * O humor de cada província lido do mundo vivo: para onde ele caminha, e por quê.
 *
 * A fórmula é de `felicidade.ts`; aqui mora só a montagem da SITUAÇÃO — o que está
 * acontecendo naquela terra agora. A parcela alimentar é 100% provincial: só quem passa
 * fome recebe penalidade, e nenhum humor nacional desce por causa de um cerco distante.
 */

import {
  alvoDeFelicidade,
  fatorDeRendaDoHumor,
  parcelasDoAlvo,
  revoltosa,
} from '../felicidade';
import type { ParcelaDoAlvo, SituacaoDaProvincia } from '../felicidade';
import type { NucleoDaCampanha } from '../nucleo';
import { donoDe, populacaoDe } from '../provincia/consultas';
import { estranhezaEm, razaoDePovoConquistado } from './nacionalidade';
import { tesouroDe } from '../governo/tesouro';
import { estaSitiada } from '../guerra/cercos';
import type { NivelDeImposto } from '../economia';
import { humorDoImpostoEm } from '../governo/nivel-de-imposto';
import { balancoAlimentarDe } from '../alimentacao/balanco';
import { saldoAlimentarLocalEm } from '../alimentacao/contribuicao';
import { fomeDoCercoEm } from '../alimentacao/mantimentos-de-cerco';
import { nivelPopulacionalEm } from '../alimentacao/contribuicao';
import { ligadasACapital } from '../comercio/circulacao';
import { guerrasDe } from '../diplomacia/relacoes';

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
    estranheza: estranhezaEm(nucleo, idProvincia),
    construcoes: nucleo.estado.construcoes[idProvincia] ?? {},
    humorDoImposto: humorDoImpostoEm(nucleo, idProvincia),
    guarnicao: fracaoDaGuarnicaoEm(nucleo, idProvincia),
    reinoEmGuerra: guerrasDe(nucleo, donoDe(nucleo, idProvincia)).length > 0,
    // A mesma pergunta que a rede de trocas e a corrupção já fazem: dá para chegar daqui à
    // capital por terra própria? Quem está cortado já perde o trânsito — agora perde a ordem.
    isoladaDaCapital: !ligadasACapital(nucleo, donoDe(nucleo, idProvincia)).has(idProvincia),
    // O tamanho é o nível populacional que a alimentação já calcula: uma régua só para as
    // duas coisas, e nenhum número novo para o jogador aprender.
    tamanho: nivelPopulacionalEm(nucleo, idProvincia),
    cofreVazio:
      tesouroDe(nucleo, donoDe(nucleo, idProvincia)) <= 0 &&
      nucleo.mobilizacao.manutencaoDe(donoDe(nucleo, idProvincia)) > 0,
    razaoDePovoConquistado: razaoDePovoConquistado(nucleo, donoDe(nucleo, idProvincia)),
  };
}

/**
 * O fator de imposto do ALVO desta província — para onde ela caminha, e não onde está.
 *
 * ⚠️ **É o que faz obra de humor ter retorno visível.** O Templo não muda a renda no dia em
 * que fica pronta: muda o alvo, e a província leva turnos andando até lá. Uma previsão que
 * comparasse o hoje com o hoje diria "nunca se paga" — e dizia. Com `comObra`, devolve o
 * fator que a província teria com aquela construção um nível acima — e, com `comImposto`, o
 * que ela teria sob outro decreto. As duas perguntas são a mesma: *"para onde esta terra
 * caminharia se eu fizesse isto?"*
 */
export function fatorDoAlvoEm(
  nucleo: NucleoDaCampanha,
  idProvincia: string,
  /**
   * O "e se": a obra um nível acima, ou o decreto de imposto que ainda não foi assinado.
   *
   * Um objeto e não dois parâmetros soltos porque os dois são opcionais e do mesmo tipo à
   * vista — trocar a ordem passaria pelo compilador e mentiria em silêncio.
   */
  seFosse: { comObra?: string; comImposto?: NivelDeImposto } = {},
): number {
  return fatorDeRendaDoHumor(
    alvoComoSeria(nucleo, idProvincia, seFosse),
    nucleo.ajustes.felicidade,
  );
}

/** O alvo de felicidade sob um mundo hipotético. Uma montagem só para as duas perguntas. */
function alvoComoSeria(
  nucleo: NucleoDaCampanha,
  idProvincia: string,
  seFosse: { comObra?: string; comImposto?: NivelDeImposto },
): number {
  const situacao = situacaoDeFelicidadeEm(nucleo, idProvincia);
  const construcoes = seFosse.comObra
    ? {
        ...situacao.construcoes,
        [seFosse.comObra]: Math.min(3, (situacao.construcoes[seFosse.comObra] ?? 0) + 1),
      }
    : situacao.construcoes;
  const humorDoImposto =
    seFosse.comImposto === undefined
      ? situacao.humorDoImposto
      : nucleo.ajustes.economia.imposto.niveis[seFosse.comImposto].humor;
  return alvoDeFelicidade(
    { ...situacao, construcoes, humorDoImposto },
    nucleo.catalogo,
    nucleo.ajustes.felicidade,
  );
}

/**
 * Quanto do imposto esta província entrega, pelo humor dela.
 *
 * Substituiu o `emRevoltaEm` binário na conta da renda: a greve fiscal virou o degrau mais
 * baixo de uma escada, e cada faixa passou a ter um preço.
 */
export function fatorDoHumorEm(nucleo: NucleoDaCampanha, idProvincia: string): number {
  const humor = nucleo.estado.felicidade[idProvincia];
  if (humor === undefined) return 1;
  return fatorDeRendaDoHumor(humor, nucleo.ajustes.felicidade);
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
  /** O mesmo "e se" de `fatorDoAlvoEm`: a obra que não existe, o decreto que não foi dado. */
  seFosse: { comObra?: string; comImposto?: NivelDeImposto } = {},
): number {
  return alvoComoSeria(nucleo, idProvincia, seFosse);
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
