/**
 * A fachada, primeira camada: **o que se pergunta sobre o REINO.**
 *
 * A `Campanha` é uma fachada grande porque a interface inteira fala com ela — e uma
 * fachada grande num arquivo só é o começo do arquivo-deus de novo. Por isso ela é montada
 * em camadas, cada uma num arquivo com um assunto: reino, província, guerra, e por fim os
 * comandos. **É divisão de arquivo, não hierarquia de tipos**: ninguém deve criar estas
 * classes intermediárias, e é por isso que são abstratas.
 *
 * Aqui: quem eu sou, que ano é, quem ainda está no jogo, quanto entra e quanto sai.
 */

import type { Ajustes, Construcoes, Economia, Exercitos, Provincias } from '@/dados/esquema';
import type { Atlas } from '@/mundo/atlas';
import { Mobilizacao } from '@/combate/mobilizacao/mobilizacao';
import { balancoAlimentar } from '@/producao/alimentacao';
import type { BalancoAlimentarDoPoder } from '@/producao/alimentacao';

import { capitaisIniciais } from '../capitais';
import type { NivelDeImposto } from '../economia';
import type { CatalogoDeConstrucoes, NucleoDaCampanha, Permissao, Recusa } from '../nucleo';
import { serializarCampanha } from '../salvamento';
import { Territorios } from '../territorios';
import type { RelatorioDaFome } from '../alimentacao/aplicar-fome';
import { balancoAlimentarDe } from '../alimentacao/balanco';
import { bensAusentes, bensEmCirculacao, rendaDeTrocas } from '../comercio/rede-de-trocas';
import {
  emGuerra,
  guerraDesde,
  guerrasDe,
  podeDeclararGuerra,
  podeFazerPaz,
  tregoaAte,
} from '../diplomacia/relacoes';
import type { BemEmCirculacao } from '../comercio/rede-de-trocas';
import { conferirCatalogos, criarEstadoInicial } from '../estado/criar-estado';
import { efemerosVazios } from '../estado/efemeros';
import type { EfemerosDaCampanha, NoticiaDiplomatica } from '../estado/efemeros';
import {
  capitalDe,
  capitalPerdida,
  custoDeMudancaDeCapital,
  podeMudarCapital,
} from '../governo/capital';
import type { QuedaDeCapital } from '../governo/capital';
import { podeDefinirImposto } from '../governo/decreto-de-imposto';
import { provinciasSimuladas, resultado } from '../governo/fim-de-campanha';
import { nivelDeImpostoEm } from '../governo/nivel-de-imposto';
import { noExilio, poderesVivos, vivo } from '../governo/poderes';
import { tesouroDe } from '../governo/tesouro';
import { donoDe } from '../provincia/consultas';
import { rendaDe, semEconomia } from '../provincia/renda';
import type { Levante } from '../sociedade/processar-revoltas';

type Poder = Provincias['poderes'][number];

export abstract class ConsultasDoReino {
  /** O núcleo que todos os módulos recebem. Protegido: só as camadas da fachada o veem. */
  protected readonly nucleo: NucleoDaCampanha;
  /** O que aconteceu na última virada. Notícia, não partida: não vai pro disco. */
  protected efemeros: EfemerosDaCampanha = efemerosVazios();

  /** Chamado depois de qualquer mudança de estado. Quem desenha se redesenha inteiro. */
  aoMudar: () => void = () => {};

  constructor(
    atlas: Atlas,
    economia: Economia,
    catalogoDeConstrucoes: Construcoes,
    ajustes: Ajustes['jogo'],
    exercitosIniciais: Exercitos,
  ) {
    const catalogo = catalogoDeConstrucoes.construcoes;
    conferirCatalogos(atlas, economia, catalogo);
    const estado = criarEstadoInicial(atlas, economia, ajustes, exercitosIniciais);
    const territorios = new Territorios(atlas, estado.dono);
    // Depois do `Territorios`, que é quem sabe as províncias de cada poder.
    estado.capitais = capitaisIniciais(atlas, (id) => territorios.provinciasDe(id));
    this.nucleo = {
      atlas,
      economia,
      catalogo,
      ajustes,
      estado,
      territorios,
      mobilizacao: new Mobilizacao(estado, ajustes.combate, (id) => territorios.donoDe(id)),
      saltosPorCapital: new Map(),
    };
  }

  // ── A partida ───────────────────────────────────────────────────────────────────────
  get iniciada(): boolean {
    return this.nucleo.estado.jogador !== null;
  }

  get jogador(): Poder | null {
    const id = this.nucleo.estado.jogador;
    return id === null ? null : this.poder(id);
  }

  get ano(): number {
    return this.nucleo.estado.ano;
  }

  get turno(): number {
    return this.nucleo.estado.turno;
  }

  /** As províncias que a campanha SIMULA — a régua da vitória sai daqui. */
  get provinciasSimuladas(): readonly string[] {
    return provinciasSimuladas(this.nucleo);
  }

  /** Vitória, derrota, ou `null` enquanto a campanha continua. */
  resultado(): 'vitoria' | 'derrota' | null {
    return resultado(this.nucleo);
  }

  /** O estado inteiro como texto, pronto pro disco. Efêmeros ficam de fora. */
  serializar(): string {
    return serializarCampanha(this.nucleo.estado);
  }

  // ── Poderes e território ────────────────────────────────────────────────────────────
  poder(idPoder: string): Poder {
    return this.nucleo.atlas.poder(idPoder);
  }

  /** Nome de exibição de uma província. Lança se ela não existe. */
  nomeDe(idProvincia: string): string {
    return this.nucleo.atlas.nomeDe(idProvincia);
  }

  /**
   * As províncias que fazem fronteira por TERRA com esta.
   *
   * ⚠️ Entra na fachada porque a IA precisou dela para saber se o inimigo está na porta — e a
   * regra da casa é que a pergunta entra aqui em vez de a IA abrir um caminho próprio pelo
   * atlas. O jogador já vê isso no mapa; agora as duas leem do mesmo lugar.
   */
  vizinhasDe(idProvincia: string): readonly string[] {
    return this.nucleo.atlas.vizinhasDe(idProvincia);
  }

  provinciasDe(idPoder: string): readonly string[] {
    return this.nucleo.territorios.provinciasDe(idPoder);
  }

  /** De quem é esta província AGORA. Não é o dono assado: é o dono corrente. */
  donoDe(idProvincia: string): string {
    return donoDe(this.nucleo, idProvincia);
  }

  /** Um poder está vivo enquanto tiver chão OU hoste. */
  vivo(idPoder: string): boolean {
    return vivo(this.nucleo, idPoder);
  }

  /** Perdeu todo o chão mas ainda tem gente em armas. */
  noExilio(idPoder: string): boolean {
    return noExilio(this.nucleo, idPoder);
  }

  poderesVivos(): readonly string[] {
    return poderesVivos(this.nucleo);
  }

  // ── Tesouro, renda e folha ──────────────────────────────────────────────────────────
  /** O caixa do JOGADOR. Zero antes de a campanha começar. */
  get tesouro(): number {
    const jogador = this.nucleo.estado.jogador;
    return jogador === null ? 0 : this.tesouroDe(jogador);
  }

  tesouroDe(idPoder: string): number {
    return tesouroDe(this.nucleo, idPoder);
  }

  /** Renda por turno do jogador. Zero antes de a campanha começar. */
  get renda(): number {
    const jogador = this.nucleo.estado.jogador;
    return jogador === null ? 0 : this.rendaDe(jogador);
  }

  rendaDe(idPoder: string): number {
    return rendaDe(this.nucleo, idPoder);
  }

  /** O que este poder paga por turno pra manter os seus em armas. */
  manutencaoDe(idPoder: string): number {
    return this.nucleo.mobilizacao.manutencaoDe(idPoder);
  }

  get manutencao(): number {
    const jogador = this.nucleo.estado.jogador;
    return jogador === null ? 0 : this.manutencaoDe(jogador);
  }

  /** O que sobra da renda depois de pagar a tropa. Pode ser negativo, e isso é o aviso. */
  get saldoPorTurno(): number {
    return this.renda - this.manutencao;
  }

  /** Quantas províncias do poder ainda estão sem economia configurada. */
  semEconomia(idPoder: string): number {
    return semEconomia(this.nucleo, idPoder);
  }

  // ── A rede de trocas ────────────────────────────────────────────────────────────────
  /** Os bens DISTINTOS que chegam ao reino. Cada um paga uma vez, por mais terras que dê. */
  bensEmCirculacao(idPoder: string): readonly BemEmCirculacao[] {
    return bensEmCirculacao(this.nucleo, idPoder);
  }

  /** O que a variedade acrescenta à renda por turno. Já está dentro de `rendaDe`. */
  rendaDeTrocas(idPoder: string): number {
    return rendaDeTrocas(this.nucleo, idPoder);
  }

  /** O que o reino ainda não alcança — a lista do que há para conquistar. */
  bensAusentes(idPoder: string): readonly { id: string; nome: string; troca: number }[] {
    return bensAusentes(this.nucleo, idPoder);
  }

  // ── Governo: imposto e capital ──────────────────────────────────────────────────────
  // ── Diplomacia ──────────────────────────────────────────────────────────────────────
  /** Estes dois estão em guerra agora? Paz é a ausência de guerra, e nada mais. */
  emGuerra(a: string, b: string): boolean {
    return emGuerra(this.nucleo, a, b);
  }

  /** Com quem este poder está em guerra, em ordem de id. */
  guerrasDe(idPoder: string): readonly string[] {
    return guerrasDe(this.nucleo, idPoder);
  }

  /** Desde que turno estes dois se enfrentam. `undefined` em paz. */
  guerraDesde(a: string, b: string): number | undefined {
    return guerraDesde(this.nucleo, a, b);
  }

  /** Até que turno a trégua segura. `undefined` quando não há trégua em pé. */
  tregoaAte(a: string, b: string): number | undefined {
    return tregoaAte(this.nucleo, a, b);
  }

  podeDeclararGuerra(
    contra: string,
    porPoder: string = this.nucleo.estado.jogador ?? '',
  ): Permissao {
    return podeDeclararGuerra(this.nucleo, porPoder, contra);
  }

  podeFazerPaz(com: string, porPoder: string = this.nucleo.estado.jogador ?? ''): Permissao {
    return podeFazerPaz(this.nucleo, porPoder, com);
  }

  nivelDeImpostoEm(idProvincia: string): NivelDeImposto {
    return nivelDeImpostoEm(this.nucleo, idProvincia);
  }

  podeDefinirImposto(idProvincia: string, porPoder?: string): Recusa {
    return podeDefinirImposto(this.nucleo, idProvincia, porPoder ?? this.nucleo.estado.jogador);
  }

  capitalDe(idPoder: string): string | undefined {
    return capitalDe(this.nucleo, idPoder);
  }

  capitalPerdida(idPoder: string): boolean {
    return capitalPerdida(this.nucleo, idPoder);
  }

  custoDeMudancaDeCapital(): number {
    return custoDeMudancaDeCapital(this.nucleo);
  }

  podeMudarCapital(idProvincia: string): Recusa {
    return podeMudarCapital(this.nucleo, idProvincia);
  }

  /** As capitais que caíram na última virada, para a crônica contar. */
  get quedasDeCapital(): readonly QuedaDeCapital[] {
    return this.efemeros.quedasDeCapital;
  }

  // ── A mesa do reino e o que ela fez ─────────────────────────────────────────────────
  /** Balanço do jogador. Conveniência da interface, como `tesouro`. */
  get alimentacao(): BalancoAlimentarDoPoder {
    const jogador = this.nucleo.estado.jogador;
    return jogador === null
      ? balancoAlimentar([], 0, this.nucleo.ajustes.alimento)
      : this.balancoAlimentarDe(jogador);
  }

  balancoAlimentarDe(idPoder: string): BalancoAlimentarDoPoder {
    return balancoAlimentarDe(this.nucleo, idPoder);
  }

  /** Quem passou fome na última virada. Vazio quando ninguém passou. */
  get fome(): RelatorioDaFome {
    return this.efemeros.fome;
  }

  /** Os levantes da última virada. Vazio quando o povo se aguentou. */
  get revoltas(): readonly Levante[] {
    return this.efemeros.revoltas;
  }

  /** Guerras declaradas e pazes assinadas nesta virada. Notícia, não partida. */
  get diplomaciaDaRodada(): readonly NoticiaDiplomatica[] {
    return this.efemeros.diplomacia;
  }

  /** O catálogo inteiro, pra interface montar a lista de opções. */
  get construcoesDisponiveis(): CatalogoDeConstrucoes {
    return this.nucleo.catalogo;
  }
}
