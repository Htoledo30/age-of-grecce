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
import { temPorto } from '../comercio/alcance';
import { aliadosDe, aliancaAte } from '../diplomacia/alianca';
import {
  aceitaSerAnexado,
  alvoDoDesejo,
  chefeDe,
  ligaDe,
  membrosDe,
  parcelasDoDesejo,
  tributoDaLiga,
} from '../diplomacia/liga';
import type { ParcelaDoDesejo, VinculoDaLiga } from '../diplomacia/liga';
import { povoDoPoder } from '../sociedade/nacionalidade';
import type { RevoltaDaLiga } from '../turno/andar-ligas';
import type { NivelDeImposto } from '../economia';
import type { Tributo } from '../estado-campanha';
import type { CatalogoDeConstrucoes, NucleoDaCampanha, Permissao, Recusa } from '../nucleo';
import { serializarCampanha } from '../salvamento';
import { Territorios } from '../territorios';
import type { RelatorioDaFome } from '../alimentacao/aplicar-fome';
import { balancoAlimentarDe } from '../alimentacao/balanco';
import {
  acordosDe,
  bensAusentes,
  bensEmCirculacao,
  impactoDoAcordo,
  rendaDeAcordos,
  rendaDeTrocas,
} from '../comercio/rede-de-trocas';
import { rendaBaseDe } from '../provincia/renda';
import {
  emGuerra,
  guerraDesde,
  guerrasDe,
  pactoAte,
  podeFirmarAlianca,
  podeFormarLiga,
  parcelasDaRelacaoEntre,
  podeAcordarComercio,
  podeDeclararGuerra,
  podeFirmarPacto,
  podePresentear,
  prazosDeAlianca,
  prazosDePacto,
  reputacaoDe,
  podeFazerPaz,
  podeFirmarTributo,
  tributoEntre,
  podeFazerPazComTributo,
  prazosDePazComTributo,
  prazosDeTributo,
  saldoDeTributosDe,
  tributosDe,
  valorDeUmTributoDe,
  relacaoEntre,
  tregoaAte,
  valorDoPresente,
} from '../diplomacia/relacoes';
import type { ParcelaDaRelacao } from '../diplomacia/relacao';
import { poderesComFicha } from '../governo/poderes';
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
import { descontoDaFolhaEmCasa } from '../provincia/beneficios-das-construcoes';
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
      mobilizacao: new Mobilizacao(
        estado,
        ajustes.combate,
        (id) => territorios.donoDe(id),
        (id) =>
          1 - descontoDaFolhaEmCasa(catalogo, estado.construcoes[id] ?? {}),
      ),
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
   * As províncias que encostam nesta — **zonas marítimas incluídas.**
   *
   * ⚠️ Entra na fachada porque a IA precisou dela para saber se o inimigo está na porta — e a
   * regra da casa é que a pergunta entra aqui em vez de a IA abrir um caminho próprio pelo
   * atlas. O jogador já vê isso no mapa; agora as duas leem do mesmo lugar.
   *
   * ⚠️ **A água entrou nesta lista quando o mar virou zona**, e quem pergunta "quem é meu
   * vizinho de terra?" tem de descartar as marítimas com `ehMar`. Antes disso uma ilha não
   * tinha vizinho nenhum — era assim que o mapa dizia "daqui não se sai".
   */
  vizinhasDe(idProvincia: string): readonly string[] {
    return this.nucleo.atlas.vizinhasDe(idProvincia);
  }

  /** Este reino já tem Porto de pé em alguma terra? É a porta do mar dele, aberta ou não. */
  temPorto(idPoder: string): boolean {
    return temPorto(this.nucleo, idPoder);
  }

  /** Toda a TERRA do mapa, por id — sem as zonas marítimas. */
  terras(): readonly string[] {
    return this.nucleo.atlas.terras.map((p) => p.id);
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

  /**
   * A opinião entre dois poderes, de −100 a 100. Zero é indiferença.
   *
   * Recíproca por simplificação assumida: os dois têm a mesma opinião um do outro.
   */
  relacaoEntre(a: string, b: string): number {
    return relacaoEntre(this.nucleo, a, b);
  }

  /** A conta dessa opinião, parcela a parcela — a mesma legibilidade do humor do povo. */
  parcelasDaRelacaoEntre(a: string, b: string): readonly ParcelaDaRelacao[] {
    return parcelasDaRelacaoEntre(this.nucleo, a, b);
  }

  /** Os poderes que a campanha simula: os que têm ficha econômica. São 18 dos 139. */
  poderesComFicha(): readonly string[] {
    return poderesComFicha(this.nucleo);
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

  /** Até que turno o pacto de não-agressão segura. `undefined` quando não há. */
  pactoAte(a: string, b: string): number | undefined {
    return pactoAte(this.nucleo, a, b);
  }

  /** Até que turno a aliança segura. `undefined` quando não há. */
  aliancaAte(a: string, b: string): number | undefined {
    return aliancaAte(this.nucleo, a, b);
  }

  /** Com quem este poder está aliado agora. A guerra de um é a guerra do outro. */
  aliadosDe(idPoder: string): readonly string[] {
    return aliadosDe(this.nucleo, idPoder);
  }

  /** A liga deste poder como MEMBRO, ou `undefined` se ele não serve a ninguém. */
  ligaDe(membro: string): VinculoDaLiga | undefined {
    return ligaDe(this.nucleo, membro);
  }

  /** Quem manda neste poder, ou `undefined`. */
  chefeDe(membro: string): string | undefined {
    return chefeDe(this.nucleo, membro);
  }

  /** Os membros da liga deste chefe, em ordem de id. */
  membrosDe(chefe: string): readonly string[] {
    return membrosDe(this.nucleo, chefe);
  }

  /** Esta liga pode ser formada, e se não, por quê. */
  podeFormarLiga(membro: string, porPoder: string = this.nucleo.estado.jogador ?? ''): Permissao {
    return podeFormarLiga(this.nucleo, porPoder, membro);
  }

  /** O que este membro paga por turno ao chefe dele. */
  tributoDaLigaDe(membro: string): number {
    return tributoDaLiga(this.nucleo, membro, rendaBaseDe(this.nucleo, membro));
  }

  /**
   * A conta do desejo de sair deste membro, parcela a parcela.
   *
   * A mesma legibilidade do humor do povo e da opinião entre reinos: um alvo feito de parcelas
   * com nome, e um valor que caminha até ele.
   */
  parcelasDoDesejoDe(membro: string): readonly ParcelaDoDesejo[] {
    const vinculo = ligaDe(this.nucleo, membro);
    if (vinculo === undefined) return [];
    const povo = povoDoPoder(this.nucleo, membro);
    return parcelasDoDesejo(
      this.nucleo,
      membro,
      povo !== undefined && povo === povoDoPoder(this.nucleo, vinculo.chefe),
      this.nucleo.territorios.provinciasDe(vinculo.chefe).length,
      this.nucleo.territorios.provinciasDe(membro).length,
      guerrasDe(this.nucleo, vinculo.chefe).length > 0,
    );
  }

  /** Para onde o desejo de sair deste membro caminha. */
  alvoDoDesejoDe(membro: string): number {
    return alvoDoDesejo(this.parcelasDoDesejoDe(membro));
  }

  /** Ele aceitaria virar província do chefe? É o desejo de sair no chão. */
  aceitaSerAnexado(membro: string): boolean {
    return aceitaSerAnexado(this.nucleo, membro);
  }

  /** Os prazos de aliança da escada, do mais longo ao mais curto, com o que a regra diz. */
  prazosDeAlianca(a: string, b: string): readonly { turnos: number; pode: boolean; motivo: string }[] {
    return prazosDeAlianca(this.nucleo, a, b);
  }

  /** Esta aliança pode ser assinada, e se não, por quê. */
  podeFirmarAlianca(
    com: string,
    turnos: number,
    porPoder: string = this.nucleo.estado.jogador ?? '',
    ouro = 0,
  ): Permissao {
    return podeFirmarAlianca(this.nucleo, porPoder, com, turnos, ouro);
  }

  /** O tributo em pé entre estes dois, com quem paga, quanto e até quando. */
  tributoEntre(a: string, b: string): Tributo | undefined {
    return tributoEntre(this.nucleo, a, b);
  }

  /**
   * O que um tributo pago por ESTE poder custaria por turno, se fosse assinado hoje.
   *
   * A tela mostra antes de qualquer assinatura, pelo mesmo motivo que ela cota o presente: um
   * botão que tira do cofre sem dizer quanto é um botão que ninguém aperta duas vezes.
   */
  valorDeUmTributoDe(pagador: string, turnos: number): number {
    return valorDeUmTributoDe(this.nucleo, pagador, turnos);
  }

  /** Os prazos de tributo que dá para assinar hoje, do mais curto ao mais longo, já cotados. */
  prazosDeTributo(
    pagador: string,
    recebedor: string,
  ): readonly { turnos: number; ouro: number; pode: boolean; motivo: string }[] {
    return prazosDeTributo(this.nucleo, pagador, recebedor);
  }

  podeFirmarTributo(pagador: string, recebedor: string, turnos: number): Permissao {
    return podeFirmarTributo(this.nucleo, pagador, recebedor, turnos);
  }

  /** Os prazos de paz-com-tributo que dá para assinar hoje, já cotados. A porta da guerra. */
  prazosDePazComTributo(
    com: string,
    porPoder: string = this.nucleo.estado.jogador ?? '',
  ): readonly { turnos: number; ouro: number; pode: boolean; motivo: string }[] {
    return prazosDePazComTributo(this.nucleo, porPoder, com);
  }

  podeFazerPazComTributo(
    com: string,
    turnos: number,
    porPoder: string = this.nucleo.estado.jogador ?? '',
  ): Permissao {
    return podeFazerPazComTributo(this.nucleo, porPoder, com, turnos);
  }

  /** Os tributos em pé deste poder, com quem está do outro lado de cada um. */
  tributosDe(idPoder: string): readonly { com: string; tributo: Tributo }[] {
    return tributosDe(this.nucleo, idPoder);
  }

  /** O que os tributos deste poder somam (recebe) ou tiram (paga) do cofre por turno. */
  saldoDeTributosDe(idPoder: string): number {
    return saldoDeTributosDe(this.nucleo, idPoder);
  }

  /** A reputação deste poder, de −100 a 0. Zero é quem nunca quebrou promessa. */
  reputacaoDe(idPoder: string): number {
    return reputacaoDe(this.nucleo, idPoder);
  }

  /** Com quem este poder tem acordo de comércio, em ordem de id. */
  acordosDe(idPoder: string): readonly string[] {
    return acordosDe(this.nucleo, idPoder);
  }

  /** O que os acordos de comércio deste poder rendem por turno, somados. */
  rendaDeAcordos(idPoder: string): number {
    return rendaDeAcordos(this.nucleo, idPoder);
  }

  /**
   * O que este acordo acrescentaria à renda de `porPoder` hoje — ou quanto ele perderia ao
   * romper, se o acordo já estiver de pé.
   *
   * Inclui a saturação dos parceiros anteriores e a rota atual. Os dois lados podem receber
   * valores diferentes porque não possuem a mesma carteira de acordos.
   */
  rendaDeUmAcordoCom(outro: string, porPoder: string = this.nucleo.estado.jogador ?? ''): number {
    return impactoDoAcordo(this.nucleo, porPoder, outro);
  }

  podeAcordarComercio(
    com: string,
    porPoder: string = this.nucleo.estado.jogador ?? '',
  ): Permissao {
    return podeAcordarComercio(this.nucleo, porPoder, com);
  }

  /** Os prazos de pacto da escada, do mais longo ao mais curto, com o que a regra diz. */
  prazosDePacto(
    com: string,
    porPoder: string = this.nucleo.estado.jogador ?? '',
  ): readonly { turnos: number; pode: boolean; motivo: string }[] {
    return prazosDePacto(this.nucleo, porPoder, com);
  }

  podeFirmarPacto(
    com: string,
    turnos: number,
    porPoder: string = this.nucleo.estado.jogador ?? '',
    ouro = 0,
  ): Permissao {
    return podeFirmarPacto(this.nucleo, porPoder, com, turnos, ouro);
  }

  /** Quanto este presente valeria para ele, em pontos de opinião. A tela mostra antes. */
  valorDoPresente(para: string, ouro: number): number {
    return valorDoPresente(this.nucleo, para, ouro);
  }

  podePresentear(
    para: string,
    ouro: number,
    porPoder: string = this.nucleo.estado.jogador ?? '',
  ): Permissao {
    return podePresentear(this.nucleo, porPoder, para, ouro);
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

  /** Os membros que romperam a liga à força nesta virada, e de quem. */
  get revoltasDaLiga(): readonly RevoltaDaLiga[] {
    return this.efemeros.revoltasDaLiga;
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
