/**
 * A fachada, terceira camada: **o que se pergunta sobre a GUERRA.**
 *
 * Cercos, hostes, levas, rotas e as ordens da rodada. Ver `consultas-do-reino.ts` para o
 * porquê de a fachada ser montada em camadas.
 */

import type { Cerco } from '@/combate/cerco';
import type { Arma, Exercito } from '@/combate/exercito';
import type { LevaEmFormacao } from '@/combate/formacao-de-leva';
import type { RecusaDeLeva } from '@/combate/recrutamento';
import type { OrdemDeMarcha, RecusaDeOrdem } from '@/movimento/ordens';
import type { RelatorioDaRodada } from '@/movimento/resolucao/relatorio';
import type { Permissao } from '../nucleo';
import { assaltoEm, cercoEm, cercos, impedeAssaltoImediatoEm } from '../guerra/cercos';
import { podeRecrutar } from '../guerra/levas';
import { armasEm, treinoEm } from '../provincia/armas-da-provincia';
import { podeOrdenarMarcha, rotasDaHoste, rotasLongasDaHoste } from '../guerra/marchas';
import { ordemDaHoste, ordens, surtidaDe } from '../guerra/ordens-da-rodada';
import { bloqueadaEm, bloqueiamEm } from '../guerra/bloqueio';
import { temPortoEm } from '../comercio/alcance';
import { podeSurtir, sitianteDaHosteDe } from '../guerra/surtidas';
import { ConsultasDaProvincia } from './consultas-da-provincia';
import type { ObjetivoMilitar } from '../estado-campanha';

export abstract class ConsultasDeGuerra extends ConsultasDaProvincia {
  objetivoMilitarDe(poder: string): Readonly<ObjetivoMilitar> | undefined {
    return this.nucleo.estado.objetivosDaIa?.[poder];
  }

  definirObjetivoMilitar(poder: string, objetivo: ObjetivoMilitar | null): void {
    const objetivos = this.nucleo.estado.objetivosDaIa ??= {};
    if (objetivo) objetivos[poder] = { ...objetivo };
    else delete objetivos[poder];
  }

  /** O relatório da última virada. Vazio antes do primeiro turno. */
  get rodada(): RelatorioDaRodada {
    return this.efemeros.rodada;
  }

  // ── Cercos ──────────────────────────────────────────────────────────────────────────
  cercoEm(idProvincia: string): Cerco | undefined {
    return cercoEm(this.nucleo, idProvincia);
  }

  cercos(): { provincia: string; cerco: Cerco }[] {
    return cercos(this.nucleo);
  }

  impedeAssaltoImediatoEm(idProvincia: string): boolean {
    return impedeAssaltoImediatoEm(this.nucleo, idProvincia);
  }

  /** Dá para assaltar agora, e se não, quantas rodadas de cerco ainda faltam? */
  assaltoEm(idProvincia: string): { pode: boolean; faltam: number } {
    return assaltoEm(this.nucleo, idProvincia);
  }

  // ── Hostes ──────────────────────────────────────────────────────────────────────────
  /** A hoste com este id, onde quer que esteja. **É o endereço da interface.** */
  hoste(idHoste: string): Exercito | undefined {
    return this.nucleo.mobilizacao.hoste(idHoste);
  }

  /** Toda hoste parada aqui. ⚠️ **Pode haver mais de uma**, e de poderes diferentes. */
  hostesEm(idProvincia: string): readonly Exercito[] {
    return this.nucleo.mobilizacao.hostesEm(idProvincia);
  }

  forcaDaHoste(idHoste: string): number {
    return this.nucleo.mobilizacao.forcaDaHoste(idHoste);
  }

  /**
   * Quantos homens de um PODER estão parados nesta província.
   *
   * ⚠️ **Sem dizer o poder, pergunta pelo dono da terra.** É armadilha no caso do cerco:
   * `forcaEm` da cidade sitiada devolve a guarnição do DEFENSOR, nunca o acampamento do
   * sitiante. Quem fala de uma hoste específica usa `forcaDaHoste(id)`.
   */
  forcaEm(idProvincia: string, idPoder: string = this.donoDe(idProvincia)): number {
    return this.nucleo.mobilizacao.forcaEm(idProvincia, idPoder);
  }

  /** Toda hoste em pé no mundo, em ordem de id. É o que o mapa desenha. */
  hostes(): readonly Exercito[] {
    return this.nucleo.mobilizacao.todas();
  }

  /** Levas visíveis no mapa que só aceitarão ordens no próximo turno. */
  formacoes(): readonly { provincia: string; formacao: LevaEmFormacao }[] {
    return this.nucleo.mobilizacao.formacoes();
  }

  formacaoEm(idProvincia: string): LevaEmFormacao | undefined {
    return this.nucleo.mobilizacao.formacaoEm(idProvincia);
  }

  /** Quantos homens NASCIDOS nesta província estão em armas, onde quer que estejam. */
  /**
   * Quantos homens ESTE PODER sustenta em armas, contando as levas em formação.
   *
   * ⚠️ **Não confundir com `homensEmArmasDe`, que é por PROVÍNCIA e conta por terra natal.**
   * As duas perguntas são diferentes e a confusão entre elas já custou um defeito: a IA
   * media a própria folha somando os homens NASCIDOS nas terras dela — e com um exército
   * inimigo acampado numa dessas terras, os soldados dele entravam na conta dela e a faziam
   * parar de recrutar bem na hora em que precisava recrutar.
   */
  homensEmArmasDoPoder(idPoder: string): number {
    return this.nucleo.mobilizacao.homensDe(idPoder);
  }

  homensEmArmasDe(idProvincia: string): number {
    return this.nucleo.mobilizacao.homensEmArmasDe(idProvincia);
  }

  /** O que a tropa nascida nesta província custa por turno. */
  custoDaTropaDe(idProvincia: string): number {
    return this.nucleo.mobilizacao.custoDaTropaDe(idProvincia);
  }

  /** Taxa por homem em casa nesta província, já com o benefício da Estrada local. */
  taxaDaTropaEmCasaEm(idProvincia: string): number {
    return this.nucleo.mobilizacao.taxaEmCasaEm(idProvincia);
  }

  /** Folha desta hoste no chão em que ela está agora. */
  manutencaoDaHoste(idHoste: string): number {
    return this.nucleo.mobilizacao.manutencaoDaHoste(idHoste);
  }

  // ── Levas ───────────────────────────────────────────────────────────────────────────
  disponivelParaLevaEm(idProvincia: string): number {
    return this.nucleo.mobilizacao.disponivelParaLevaEm(idProvincia);
  }

  /**
   * As armas que esta terra levanta agora. `leve` está sempre nela — ninguém fica sem
   * exército por não ter erguido prédio nenhum.
   */
  armasEm(idProvincia: string): readonly Arma[] {
    return armasEm(this.nucleo, idProvincia);
  }

  /**
   * O treino que a tropa levantada aqui recebe. 1 é tropa comum; o Quartel sobe isto.
   *
   * A tela mostra este número ANTES da leva porque ele é carimbado no recrutamento: quem
   * levanta hoje leva o treino de hoje para sempre.
   */
  treinoEm(idProvincia: string): number {
    return treinoEm(this.nucleo, idProvincia);
  }

  /** Quantos homens a população e o tesouro DO DONO permitem recrutar neste instante. */
  maximoParaLevaEm(idProvincia: string, arma: Arma = 'leve'): number {
    return this.nucleo.mobilizacao.maximoParaLevaEm(
      idProvincia,
      this.donoDe(idProvincia),
      arma,
    );
  }

  podeRecrutar(
    idProvincia: string,
    homens: number,
    arma: Arma = 'leve',
    porPoder?: string,
  ): RecusaDeLeva {
    return podeRecrutar(
      this.nucleo,
      idProvincia,
      homens,
      arma,
      porPoder ?? this.nucleo.estado.jogador,
    );
  }

  // ── Marchas e surtidas ──────────────────────────────────────────────────────────────
  /** As rotas que a hoste pode tomar nesta rodada, por destino. */
  rotasDaHoste(idHoste: string): ReadonlyMap<string, readonly string[]> {
    return rotasDaHoste(this.nucleo, idHoste);
  }

  /** Só os destinos, pra quem não precisa da rota. */
  alcanceDaHoste(idHoste: string): readonly string[] {
    return [...this.rotasDaHoste(idHoste).keys()];
  }

  /**
   * As rotas inteiras desta hoste, quantas rodadas elas levem — todos os destinos de uma vez.
   *
   * É a pergunta da TRAVESSIA: uma hoste anda um salto por rodada, e uma ilha do outro lado da
   * água fica a três. Quem só pergunta "aonde chego hoje" nunca vê o outro lado do mar.
   */
  rotasLongasDaHoste(idHoste: string): ReadonlyMap<string, readonly string[]> {
    return rotasLongasDaHoste(this.nucleo, idHoste);
  }

  /** Esta província é água? Zona marítima não se conquista, não rende e não tem dono. */
  ehMar(idProvincia: string): boolean {
    return this.nucleo.atlas.ehMar(idProvincia);
  }

  ordemDaHoste(idHoste: string): OrdemDeMarcha | undefined {
    return ordemDaHoste(this.nucleo, idHoste);
  }

  /** Todas as ordens ativas, com a hoste de cada uma. É o que o mapa desenha. */
  ordens(): readonly { idHoste: string; ordem: OrdemDeMarcha }[] {
    return ordens(this.nucleo);
  }

  podeOrdenarMarcha(
    idHoste: string,
    destino: string,
    homens: number,
    porPoder: string | null = this.nucleo.estado.jogador,
  ): RecusaDeOrdem {
    return podeOrdenarMarcha(this.nucleo, idHoste, destino, homens, porPoder);
  }

  podeSurtir(
    idHoste: string,
    porPoder: string | null = this.nucleo.estado.jogador,
  ): Permissao {
    return podeSurtir(this.nucleo, idHoste, porPoder);
  }

  surtidaDe(idHoste: string): boolean {
    return surtidaDe(this.nucleo, idHoste);
  }

  /** Contra quem esta hoste surtiria, se pudesse. `undefined` quando não há cerco ali. */
  sitianteDaHosteDe(idHoste: string): string | undefined {
    return sitianteDaHosteDe(this.nucleo, idHoste);
  }

  /** Esta terra tem Porto de pé? É a porta do mar — bloqueada ou não. */
  temPortoEm(idProvincia: string): boolean {
    return temPortoEm(this.nucleo, idProvincia);
  }

  /**
   * Há frota inimiga na água que banha esta terra?
   *
   * O cerco do mar: o cais fecha, e com ele a ligação marítima e o alcance do comércio. Ver
   * `campanha/guerra/bloqueio.ts`.
   */
  bloqueadaEm(idProvincia: string): boolean {
    return bloqueadaEm(this.nucleo, idProvincia);
  }

  /** Quem está bloqueando este cais, por id. Vazio quando ninguém está. */
  bloqueiamEm(idProvincia: string): readonly string[] {
    return bloqueiamEm(this.nucleo, idProvincia);
  }
}
