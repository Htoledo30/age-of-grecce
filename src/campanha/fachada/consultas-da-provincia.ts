/**
 * A fachada, segunda camada: **o que se pergunta sobre UMA PROVÍNCIA.**
 *
 * Renda, povo, humor, obras, o que ela põe na mesa e o que ela pode receber. Ver
 * `consultas-do-reino.ts` para o porquê de a fachada ser montada em camadas.
 */

import type { EstadoAlimentarLocal } from '@/producao/alimentacao';
import type { Corrupcao } from '../corrupcao';
import type { RendaDaProvincia, RetornoDaConstrucao } from '../economia';
import type { Obra } from '../estado-campanha';
import type { ParcelaDoAlvo } from '../felicidade';
import type { CatalogoDeConstrucoes, Recusa } from '../nucleo';
import type { PerfilDaProvincia } from '../perfil-da-provincia';
import {
  contribuicaoAlimentarEm,
  estadoAlimentarLocalEm,
  nivelPopulacionalEm,
  produtosAlimentaresEm,
  saldoAlimentarLocalEm,
} from '../alimentacao/contribuicao';
import { crescimentoDe } from '../alimentacao/crescimento';
import type { CrescimentoNaProvincia } from '../alimentacao/crescimento';
import { fomeDoCercoEm, mantimentosDeCercoEm } from '../alimentacao/mantimentos-de-cerco';
import type { RelogioDoCerco } from '../alimentacao/mantimentos-de-cerco';
import { corrupcaoEm } from '../governo/corrupcao-na-provincia';
import { miliciaEm } from '../guerra/defesa-local';
import {
  construcoesEm,
  dominioEstrangeiroEm,
  nivelDaConstrucaoEm,
  perfilDe,
  populacaoDe,
} from '../provincia/consultas';
import {
  construcoesDisponiveisEm,
  obraEm,
  podeConstruir,
  retornoDaConstrucaoEm,
} from '../provincia/construcoes';
import { podeAgirEm, podeMobilizarEm, podeRecrutarEm } from '../provincia/permissoes';
import { economiaDe, saldoDaProvincia } from '../provincia/renda';
import { alvoDeFelicidadeEm, emRevoltaEm, parcelasDeFelicidadeEm } from '../sociedade/humor';
import { ConsultasDoReino } from './consultas-do-reino';

export abstract class ConsultasDaProvincia extends ConsultasDoReino {
  // ── Dinheiro ────────────────────────────────────────────────────────────────────────
  /** A economia da província, ou `null` quando ela não foi configurada. */
  economiaDe(idProvincia: string): RendaDaProvincia | null {
    return economiaDe(this.nucleo, idProvincia);
  }

  /** O saldo completo da terra: renda líquida menos a tropa que ela pôs em armas. */
  saldoDaProvincia(idProvincia: string): number | null {
    return saldoDaProvincia(this.nucleo, idProvincia);
  }

  corrupcaoEm(idProvincia: string): Corrupcao {
    return corrupcaoEm(this.nucleo, idProvincia);
  }

  // ── Povo e humor ────────────────────────────────────────────────────────────────────
  /** Habitantes que ainda estão na província. Zero onde não há economia configurada. */
  populacaoDe(idProvincia: string): number {
    return populacaoDe(this.nucleo, idProvincia);
  }

  crescimentoDe(idProvincia: string): CrescimentoNaProvincia | null {
    return crescimentoDe(this.nucleo, idProvincia);
  }

  /** Povo, humor e ancoradouro — o retrato que não é dinheiro. */
  perfilDe(idProvincia: string): PerfilDaProvincia | null {
    return perfilDe(this.nucleo, idProvincia);
  }

  /** O humor desta província está na faixa revoltosa? É a que não paga imposto. */
  emRevoltaEm(idProvincia: string): boolean {
    return emRevoltaEm(this.nucleo, idProvincia);
  }

  /** O povo desta província vive sob bandeira que não é a de 700 a.C.? */
  dominioEstrangeiroEm(idProvincia: string): boolean {
    return dominioEstrangeiroEm(this.nucleo, idProvincia);
  }

  alvoDeFelicidadeEm(idProvincia: string): number {
    return alvoDeFelicidadeEm(this.nucleo, idProvincia);
  }

  /** A conta do alvo, parcela a parcela — a mesma legibilidade da barra de comida. */
  parcelasDeFelicidadeEm(idProvincia: string): readonly ParcelaDoAlvo[] {
    return parcelasDeFelicidadeEm(this.nucleo, idProvincia);
  }

  miliciaEm(idProvincia: string): number {
    return miliciaEm(this.nucleo, idProvincia);
  }

  // ── Construções ─────────────────────────────────────────────────────────────────────
  /** Catálogo curto: universais mais as explorações que combinam com esta terra. */
  construcoesDisponiveisEm(idProvincia: string): CatalogoDeConstrucoes {
    return construcoesDisponiveisEm(this.nucleo, idProvincia);
  }

  construcoesEm(idProvincia: string): readonly string[] {
    return construcoesEm(this.nucleo, idProvincia);
  }

  nivelDaConstrucaoEm(idProvincia: string, idConstrucao: string): number {
    return nivelDaConstrucaoEm(this.nucleo, idProvincia, idConstrucao);
  }

  obraEm(idProvincia: string): Obra | undefined {
    return obraEm(this.nucleo, idProvincia);
  }

  retornoDaConstrucaoEm(
    idProvincia: string,
    idConstrucao: string,
  ): RetornoDaConstrucao | null {
    return retornoDaConstrucaoEm(this.nucleo, idProvincia, idConstrucao);
  }

  podeConstruir(idProvincia: string, idConstrucao: string): Recusa {
    return podeConstruir(this.nucleo, idProvincia, idConstrucao);
  }

  // ── Portões ─────────────────────────────────────────────────────────────────────────
  /** Esta província aceita ALGUMA ação minha? É o portão, não uma ação específica. */
  podeAgirEm(idProvincia: string): Recusa {
    return podeAgirEm(this.nucleo, idProvincia);
  }

  podeMobilizarEm(idProvincia: string): Recusa {
    return podeMobilizarEm(this.nucleo, idProvincia);
  }

  podeRecrutarEm(idProvincia: string): boolean {
    return podeRecrutarEm(this.nucleo, idProvincia);
  }

  // ── O que a terra põe na mesa ───────────────────────────────────────────────────────
  produtosAlimentaresEm(
    idProvincia: string,
  ): readonly { id: string; nome: string; nivel: number }[] {
    return produtosAlimentaresEm(this.nucleo, idProvincia);
  }

  /** O que esta terra entrega ao reino NESTE turno. Cidade sitiada não entrega nada. */
  contribuicaoAlimentarEm(idProvincia: string): number {
    return contribuicaoAlimentarEm(this.nucleo, idProvincia);
  }

  nivelPopulacionalEm(idProvincia: string): number {
    return nivelPopulacionalEm(this.nucleo, idProvincia);
  }

  saldoAlimentarLocalEm(idProvincia: string): number {
    return saldoAlimentarLocalEm(this.nucleo, idProvincia);
  }

  /** Sustentadora, Equilibrada ou Dependente: o papel desta terra dentro do reino. */
  estadoAlimentarLocalEm(idProvincia: string): EstadoAlimentarLocal {
    return estadoAlimentarLocalEm(this.nucleo, idProvincia);
  }

  /** Quantos turnos de cerco esta cidade aguenta com a despensa cheia. */
  mantimentosDeCercoEm(idProvincia: string): number {
    return mantimentosDeCercoEm(this.nucleo, idProvincia);
  }

  fomeDoCercoEm(idProvincia: string): RelogioDoCerco | null {
    return fomeDoCercoEm(this.nucleo, idProvincia);
  }
}
