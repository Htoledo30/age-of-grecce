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
import { exercitoVazio, forcaDe, retirar, somarLeva } from '../exercito';
import type { Exercito, Arma } from '../exercito';
import type { LevaEmFormacao, ResultadoDasFormacoes } from '../formacao-de-leva';
import { avaliarLeva, maximoDaLeva } from '../recrutamento';
import type { RecusaDeLeva } from '../recrutamento';
import { matarDaFormacao, matarDaHoste, matarPorFome } from './baixas';
import {
  bocasDaHoste,
  bocasEmArmasDe,
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
import { manutencaoDe, pagarManutencao, taxaDe } from './folha';
import type { EmCasa, FatorDaFolhaEmCasa } from './folha';
import {
  concluirFormacoes,
  convocarFormacao,
  levantarRebeldes,
  plantar,
  recrutar,
} from './levas';

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
    /** Quanto da taxa de casa sobra nesta província depois das obras locais. */
    private readonly fatorDaFolhaEmCasa: FatorDaFolhaEmCasa,
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

  /**
   * DESTACA parte de uma hoste: nasce uma hoste nova ao lado, com os homens que saíram.
   *
   * ⚠️ **Isto não inventa nada — adianta para o clique o que a virada já fazia.**
   * `movimento/resolucao/forcas.ts` cria um destacamento a cada rodada, com o comentário
   * *"o destacamento é uma hoste NOVA: parte da antiga fica, parte vai, e as duas passam a
   * existir ao mesmo tempo"*, e `proximoId` sempre listou *"o destacamento"* entre os quatro
   * criadores de hoste. O que faltava era o jogador poder fazê-lo quando quisesse.
   *
   * Henrique, jogando: *"quero poder quebrar uma hoste em várias hostes no mesmo turno. se eu
   * fiz um pedido de 500 para ir até Maratona, elas têm que sair da conta das que ficam em
   * Atenas"*. É exatamente isto: os homens saem da conta AGORA, e o que fica volta a ser uma
   * hoste inteira, livre para receber a próxima ordem.
   *
   * Os homens saem proporcionalmente de cada contingente (ver `retirar`): metade de um
   * exército misto custa metade a cada cidade que o formou e a cada arma que ele traz.
   *
   * Devolve o id da hoste nova, ou `undefined` quando não há o que destacar — pedido de zero,
   * de mais do que existe, ou da hoste inteira, que não se divide: ela vai por si.
   */
  destacar(idHoste: string, homens: number): string | undefined {
    const origem = hoste(this.estado, idHoste);
    if (!origem) return undefined;
    const total = forcaDe(origem);
    if (!Number.isInteger(homens) || homens <= 0 || homens >= total) return undefined;
    // ⚠️ `retirar` JÁ desconta da origem e já fecha o arredondamento (ver `exercito.ts`):
    // ela devolve quem saiu e deixa o exército com o resto. Descontar de novo aqui apagaria
    // metade dos homens do mundo em silêncio.
    const partem = retirar(origem, homens);
    if (partem.length === 0) return undefined;

    const novo = exercitoVazio(proximoId(this.estado), origem.poder, origem.posicao);
    novo.contingentes = partem;
    this.estado.hostes[novo.id] = novo;
    return novo.id;
  }

  /**
   * REÚNE esta hoste com outra do mesmo poder parada no mesmo lugar. Devolve o id que sobrou.
   *
   * ⚠️ **É o desfazer do destacamento, e ele precisa existir na hora.** A resolução já funde
   * hostes que param juntas (`movimento/resolucao/pousar.ts`), mas isso só acontece na virada
   * — e cancelar uma ordem deixaria o jogador com duas peças no mesmo lugar até lá, sem ter
   * pedido nenhuma divisão.
   *
   * ⚠️ **`livre` decide QUEM pode acolher, e sem ele isto recria o defeito que veio consertar.**
   * A primeira versão fundia na irmã mais velha sem perguntar nada, e a revisão adversária
   * reproduziu o estrago: com 1.000 em Atenas, mandar 100 a Maratona e depois os 900 inteiros a
   * outro lugar põe a ordem no id ORIGINAL; cancelar essa ordem entregava os 900 à peça que já
   * estava marchando e APAGAVA a hoste selecionada do jogador. Ele voltava a não ter o que
   * comandar — exatamente a queixa que o destacamento nasceu para resolver.
   *
   * Quem chama é que sabe o que é estar livre (a mobilização não conhece ordens), e por isso a
   * pergunta vem de fora.
   */
  reunir(idHoste: string, livre: (id: string) => boolean): string | undefined {
    const dela = hoste(this.estado, idHoste);
    if (!dela) return undefined;
    const irma = hostesEm(this.estado, dela.posicao)
      .filter((h) => h.poder === dela.poder && h.id !== dela.id && livre(h.id))
      // ⚠️ Por NÚMERO, e não por texto. `['h9','h10'].sort()` devolve `['h10','h9']`: a partir
      // do décimo id, "a mais velha acolhe" deixava de ser verdade e a fusão caía na peça
      // errada — um defeito que só nasceria numa partida longa, onde teste nenhum o veria.
      .sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)))[0];
    if (!irma) return undefined;
    // ⚠️ `somarLeva` e não concatenar: fundir listas cruas empilha contingentes de mesma chave
    // em vez de somá-los. Medido pela revisão: dez ciclos de ordenar-e-cancelar levavam a lista
    // de 2 para 57 entradas, todas iguais. Os homens fechavam, o arquivo de save é que inchava.
    for (const c of dela.contingentes) somarLeva(irma, c.terra, c.homens, c.arma, c.qualidade);
    delete this.estado.hostes[dela.id];
    return irma.id;
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

  /** Bocas em armas: o número que a mesa do reino usa. Cavalo come por vários homens. */
  bocasEmArmasDe(idPoder: string): number {
    return bocasEmArmasDe(this.estado, this.ajustes, idPoder);
  }

  bocasDaHoste(idHoste: string): number {
    return bocasDaHoste(this.estado, this.ajustes, idHoste);
  }

  homensEmArmasDe(idProvincia: string): number {
    return homensEmArmasDe(this.estado, idProvincia);
  }

  custoDaTropaDe(idProvincia: string): number {
    return custoDaTropaDe(
      this.estado,
      this.ajustes,
      idProvincia,
      this.emCasa,
      this.fatorDaFolhaEmCasa,
    );
  }

  /** Taxa por homem parado nesta província própria, já com o benefício local da Estrada. */
  taxaEmCasaEm(idProvincia: string): number {
    return this.ajustes.manutencaoPorHomem.emCasa * this.fatorDaFolhaEmCasa(idProvincia);
  }

  /** Folha exata desta hoste no chão onde ela está agora. */
  manutencaoDaHoste(idHoste: string): number {
    const exercito = hoste(this.estado, idHoste);
    if (!exercito) return 0;
    return Math.round(
      forcaDaHoste(this.estado, idHoste) *
        taxaDe(exercito, this.ajustes, this.emCasa, this.fatorDaFolhaEmCasa),
    );
  }

  disponivelParaLevaEm(idProvincia: string): number {
    return disponivelParaLevaEm(this.estado, this.ajustes, idProvincia);
  }

  /**
   * Teto real da leva: população cedida e ouro do PODER contam ao mesmo tempo.
   *
   * ⚠️ O teto é POR ARMA, porque o preço é por arma: o mesmo tesouro põe em campo quase o
   * dobro de leves do que de hoplitas. A barra que oferece o número tem que oferecer o da
   * arma escolhida, senão ela promete uma leva que a regra recusa.
   */
  maximoParaLevaEm(idProvincia: string, idPoder: string, arma: Arma = 'leve'): number {
    return maximoDaLeva(
      {
        populacao: populacaoDe(this.estado, idProvincia),
        tesouro: tesouroDe(this.estado, idPoder),
      },
      this.ajustes,
      arma,
    );
  }

  /**
   * ⚠️ `armas` e `arma` vêm de FORA: quem sabe que obras estão de pé numa província é a
   * campanha, e a mobilização não conhece catálogo de construção nenhum.
   */
  avaliarLevaEm(
    idProvincia: string,
    idPoder: string,
    homens: number,
    armas: readonly Arma[],
    arma: Arma,
  ): RecusaDeLeva {
    return avaliarLeva(
      homens,
      {
        armas,
        populacao: populacaoDe(this.estado, idProvincia),
        tesouro: tesouroDe(this.estado, idPoder),
      },
      this.ajustes,
      arma,
    );
  }

  // ── Levas ───────────────────────────────────────────────────────────────────────────
  recrutar(
    idProvincia: string,
    poder: string,
    leva: { ouro: number; homens: number },
    turnoAtual: number,
    arma: Arma = 'leve',
    qualidade = 1,
  ): void {
    recrutar(this.estado, idProvincia, poder, leva, turnoAtual, arma, qualidade);
  }

  concluirFormacoes(
    turnoAtual: number,
    donoDe: (idProvincia: string) => string,
  ): ResultadoDasFormacoes {
    return concluirFormacoes(this.estado, turnoAtual, donoDe);
  }

  convocarFormacao(idProvincia: string): number {
    return convocarFormacao(this.estado, idProvincia);
  }

  levantarRebeldes(idProvincia: string, idPoder: string, homens: number): string | null {
    return levantarRebeldes(this.estado, idProvincia, idPoder, homens);
  }

  /** Põe uma hoste no mapa do nada. **Só desenvolvimento.** */
  plantar(
    idProvincia: string,
    idPoder: string,
    homens: number,
    arma: Arma = 'leve',
    qualidade = 1,
  ): string {
    return plantar(this.estado, idProvincia, idPoder, homens, arma, qualidade);
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
    return manutencaoDe(
      this.estado,
      this.ajustes,
      idPoder,
      this.emCasa,
      this.fatorDaFolhaEmCasa,
    );
  }

  /** Paga a folha de um poder e devolve quantos desertaram. */
  pagarManutencao(idPoder: string): number {
    return pagarManutencao(
      this.estado,
      this.ajustes,
      idPoder,
      this.emCasa,
      this.fatorDaFolhaEmCasa,
    );
  }
}
