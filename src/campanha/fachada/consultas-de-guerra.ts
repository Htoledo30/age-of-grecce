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
import { podeOrdenarMarcha, rotasDaHoste } from '../guerra/marchas';
import { ordemDaHoste, ordens, surtidaDe } from '../guerra/ordens-da-rodada';
import { podeSurtir, sitianteDaHosteDe } from '../guerra/surtidas';
import { ConsultasDaProvincia } from './consultas-da-provincia';

export abstract class ConsultasDeGuerra extends ConsultasDaProvincia {
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

  ordemDaHoste(idHoste: string): OrdemDeMarcha | undefined {
    return ordemDaHoste(this.nucleo, idHoste);
  }

  /** Todas as ordens da rodada, com a hoste de cada uma. É o que o mapa desenha. */
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
}
