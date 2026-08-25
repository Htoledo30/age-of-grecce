/**
 * As hostes em pé: reunir, dispensar, manter e desertar.
 *
 * Liga as contas puras de `recrutamento.ts` ao estado mutável. Existe separado da `Campanha`
 * porque ela estava virando o arquivo que sabe tudo — e movimento e batalha têm os seus.
 * **Nada de guerra cresce aqui.**
 *
 * A classe é uma fachada: guarda o recorte de estado e os ajustes, e delega a um módulo por
 * assunto — consultas, levas, dispensa, baixas, folha.
 *
 * ⚠️ **Toda operação de dinheiro pede o PODER.** Não existe "o tesouro"; existe o tesouro de
 * alguém. Recrutar em Elêusis gasta o cofre de Elêusis, e a folha de Tanagra sai do cofre de
 * Tanagra — inclusive enquanto ninguém estiver jogando com eles.
 */

import type { Ajustes } from '@/dados/esquema';
import type { Exercito } from '../exercito';
import type { LevaEmFormacao, ResultadoDasFormacoes } from '../formacao-de-leva';
import { avaliarLeva, maximoDaLeva } from '../recrutamento';
import type { RecusaDeLeva } from '../recrutamento';
import { matarDaFormacao, matarDaHoste, matarPorFome } from './baixas';
import {
  custoDaTropaDe,
  disponivelParaLevaEm,
  forcaDaHoste,
  forcaEm,
  formacaoEm,
  formacoes,
  homensDe,
  homensEmArmasDe,
  hoste,
  hostesEm,
  temTropa,
  todas,
} from './consultas';
import { dispensar, dispensarDe } from './dispensa';
import { populacaoDe, proximoId, tesouroDe } from './estado';
import type { EstadoDeMobilizacao } from './estado';
import { manutencaoDe, pagarManutencao } from './folha';
import type { EmCasa } from './folha';
import { concluirFormacoes, levantarRebeldes, plantar, recrutar } from './levas';

type AjustesCombate = Ajustes['jogo']['combate'];

export class Mobilizacao {
  constructor(
    private readonly estado: EstadoDeMobilizacao,
    private readonly ajustes: AjustesCombate,
    /**
     * De quem é cada província AGORA.
     *
     * Recebe a consulta e não o `Territorios` inteiro porque a folha militar só precisa de
     * uma resposta — de quem é este chão — e depender do objeto de propriedade inteiro
     * amarraria mobilização a mapa político por um número.
     */
    private readonly donoDe: (idProvincia: string) => string,
  ) {}

  /** A hoste pisa em terra do próprio poder? É isto que decide a taxa da folha. */
  private readonly emCasa: EmCasa = (exercito) =>
    this.donoDe(exercito.posicao) === exercito.poder;

  /** Gera a identidade da proxima hoste. Publico porque a guarnicao inicial tambem cria. */
  proximoId(): string {
    return proximoId(this.estado);
  }

  // ── Consultas ───────────────────────────────────────────────────────────────────────
  hoste(idHoste: string): Exercito | undefined {
    return hoste(this.estado, idHoste);
  }

  hostesEm(idProvincia: string): readonly Exercito[] {
    return hostesEm(this.estado, idProvincia);
  }

  todas(): readonly Exercito[] {
    return todas(this.estado);
  }

  forcaDaHoste(idHoste: string): number {
    return forcaDaHoste(this.estado, idHoste);
  }

  forcaEm(idProvincia: string, idPoder: string): number {
    return forcaEm(this.estado, idProvincia, idPoder);
  }

  formacaoEm(idProvincia: string): LevaEmFormacao | undefined {
    return formacaoEm(this.estado, idProvincia);
  }

  formacoes(): readonly { provincia: string; formacao: LevaEmFormacao }[] {
    return formacoes(this.estado);
  }

  temTropa(idPoder: string): boolean {
    return temTropa(this.estado, idPoder);
  }

  homensDe(idPoder: string): number {
    return homensDe(this.estado, idPoder);
  }

  homensEmArmasDe(idProvincia: string): number {
    return homensEmArmasDe(this.estado, idProvincia);
  }

  custoDaTropaDe(idProvincia: string): number {
    return custoDaTropaDe(this.estado, this.ajustes, idProvincia, this.emCasa);
  }

  disponivelParaLevaEm(idProvincia: string): number {
    return disponivelParaLevaEm(this.estado, this.ajustes, idProvincia);
  }

  /** Teto real da leva: população cedida e ouro do PODER contam ao mesmo tempo. */
  maximoParaLevaEm(idProvincia: string, idPoder: string): number {
    return maximoDaLeva(
      {
        populacao: populacaoDe(this.estado, idProvincia),
        tesouro: tesouroDe(this.estado, idPoder),
      },
      this.ajustes,
    );
  }

  avaliarLevaEm(idProvincia: string, idPoder: string, homens: number): RecusaDeLeva {
    return avaliarLeva(
      homens,
      {
        populacao: populacaoDe(this.estado, idProvincia),
        tesouro: tesouroDe(this.estado, idPoder),
      },
      this.ajustes,
    );
  }

  // ── Levas ───────────────────────────────────────────────────────────────────────────
  recrutar(
    idProvincia: string,
    poder: string,
    leva: { ouro: number; homens: number },
    turnoAtual: number,
  ): void {
    recrutar(this.estado, idProvincia, poder, leva, turnoAtual);
  }

  concluirFormacoes(
    turnoAtual: number,
    donoDe: (idProvincia: string) => string,
  ): ResultadoDasFormacoes {
    return concluirFormacoes(this.estado, turnoAtual, donoDe);
  }

  levantarRebeldes(idProvincia: string, idPoder: string, homens: number): string | null {
    return levantarRebeldes(this.estado, idProvincia, idPoder, homens);
  }

  /** Põe uma hoste no mapa do nada. **Só desenvolvimento.** */
  plantar(idProvincia: string, idPoder: string, homens: number): string {
    return plantar(this.estado, idProvincia, idPoder, homens);
  }

  // ── Dispensa e baixas ───────────────────────────────────────────────────────────────
  dispensar(idProvincia: string, homens: number): void {
    dispensar(this.estado, idProvincia, homens);
  }

  dispensarDe(idHoste: string, homens: number): void {
    dispensarDe(this.estado, idHoste, homens);
  }

  matarPorFome(
    idPoder: string,
    homens: number,
    pouparEm: ReadonlySet<string> = new Set(),
  ): number {
    return matarPorFome(this.estado, idPoder, homens, pouparEm);
  }

  matarDaHoste(idHoste: string, homens: number): number {
    return matarDaHoste(this.estado, idHoste, homens);
  }

  matarDaFormacao(idProvincia: string, homens: number): number {
    return matarDaFormacao(this.estado, idProvincia, homens);
  }

  // ── Folha ───────────────────────────────────────────────────────────────────────────
  manutencaoDe(idPoder: string): number {
    return manutencaoDe(this.estado, this.ajustes, idPoder, this.emCasa);
  }

  /** Paga a folha de um poder e devolve quantos desertaram. */
  pagarManutencao(idPoder: string): number {
    return pagarManutencao(this.estado, this.ajustes, idPoder, this.emCasa);
  }
}
