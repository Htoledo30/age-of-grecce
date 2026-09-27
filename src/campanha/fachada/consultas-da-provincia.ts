/**
 * A fachada, segunda camada: **o que se pergunta sobre UMA PROVÍNCIA.**
 *
 * Renda, povo, humor, obras, o que ela põe na mesa e o que ela pode receber. Ver
 * `consultas-do-reino.ts` para o porquê de a fachada ser montada em camadas.
 */

import { custoDaObra, manutencaoDaObra } from '../custo-de-obra';
import { escalaDeObraEm } from '../provincia/renda';
import type { EstadoAlimentarLocal } from '@/producao/alimentacao';
import type { Corrupcao } from '../corrupcao';
import type { RendaDaProvincia, RetornoDaConstrucao } from '../economia';
import type { Obra } from '../estado-campanha';
import type { ParcelaDoAlvo } from '../felicidade';
import type { CatalogoDeConstrucoes, Recusa, TipoDeEfeito } from '../nucleo';
import type { PerfilDaProvincia } from '../perfil-da-provincia';
import {
  contribuicaoAlimentarEm,
  faixaDaProvinciaEm,
  estadoAlimentarLocalEm,
  nivelPopulacionalEm,
  produtosAlimentaresEm,
  saldoAlimentarLocalEm,
} from '../alimentacao/contribuicao';
import { estranhezaEm, povoEstranhoManda } from '../sociedade/nacionalidade';
import { faseCriticaEm } from '../sociedade/assimilacao';
import { crescimentoDe } from '../alimentacao/crescimento';
import type { CrescimentoNaProvincia } from '../alimentacao/crescimento';
import { fomeDoCercoEm, mantimentosDeCercoEm } from '../alimentacao/mantimentos-de-cerco';
import type { RelogioDoCerco } from '../alimentacao/mantimentos-de-cerco';
import { corrupcaoEm } from '../governo/corrupcao-na-provincia';
import { miliciaEm } from '../guerra/defesa-local';
import {
  construcoesEm,
  nivelDaConstrucaoEm,
  perfilDe,
  populacaoDe,
} from '../provincia/consultas';
import { podeDemolir,
  construcoesDisponiveisEm,
  obraEm,
  podeConstruir,
  retornoDaConstrucaoEm,
} from '../provincia/construcoes';
import { podeAgirEm, podeMobilizarEm, podeRecrutarEm } from '../provincia/permissoes';
import type { NivelDeImposto } from '../economia';
import { previsaoDeImpostoEm } from '../governo/previsao-de-imposto';
import type { PrevisaoDeImposto } from '../governo/previsao-de-imposto';
import { economiaDe, saldoDaProvincia } from '../provincia/renda';
import {
  alvoDeFelicidadeEm,
  emRevoltaEm,
  fatorDoHumorEm as fatorDoHumorNoNucleo,
  parcelasDeFelicidadeEm,
} from '../sociedade/humor';
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

  /**
   * O humor desta província agora, de 0 a 100.
   *
   * ⚠️ Existe porque a IA precisou dele para decidir imposto — e a regra da casa é que a
   * pergunta ENTRA na fachada em vez de a IA abrir um caminho próprio pelo estado. O número
   * já estava em `perfilDe`; aqui ele fica à mão de quem só quer o humor.
   */
  felicidadeEm(idProvincia: string): number {
    return perfilDe(this.nucleo, idProvincia)?.felicidade.valor ?? 0;
  }

  /**
   * Quanto o humor desta província multiplica a renda dela. 1 é o normal.
   *
   * Na fachada porque a TELA precisa dizer onde a felicidade vira dinheiro: sem esta linha
   * no painel, o jogador vê o número mexer e não descobre o que ele faz.
   */
  fatorDoHumorEm(idProvincia: string): number {
    return fatorDoHumorNoNucleo(this.nucleo, idProvincia);
  }

  /** O humor desta província está na faixa revoltosa? É a que não paga imposto. */
  emRevoltaEm(idProvincia: string): boolean {
    return emRevoltaEm(this.nucleo, idProvincia);
  }

  /** O povo desta província vive sob bandeira que não é a de 700 a.C.? */
  /**
   * Quão estranho é o dono ao povo desta terra — a fatia dele que não o reconhece.
   *
   * ⚠️ Substituiu um `dominioEstrangeiroEm` binário que perguntava *"o dono mudou desde 700
   * a.C.?"*. Ver `sociedade/nacionalidade.ts`.
   */
  estranhezaEm(idProvincia: string): { mesmoPovo: number; outroPovo: number } {
    return estranhezaEm(this.nucleo, idProvincia);
  }

  /** A MAIORIA do povo daqui não reconhece o dono? É o portão do levante. */
  povoEstranhoManda(idProvincia: string): boolean {
    return povoEstranhoManda(this.nucleo, idProvincia);
  }

  /** Turnos de fase crítica que restam depois da conquista. Zero quando já passou. */
  faseCriticaEm(idProvincia: string): number {
    return faseCriticaEm(this.nucleo, idProvincia);
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
  /** O nome de um produto do catálogo, como a tela escreve: "Madeira", "Cavalos". */
  nomeDoProduto(idProduto: string): string {
    return this.nucleo.economia.produtos[idProduto]?.nome ?? idProduto;
  }

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

  /**
   * O que este decreto de imposto faria com a renda desta terra — agora e assentado.
   *
   * A mesma ideia de `retornoDaConstrucaoEm`, e pelo mesmo motivo: o jogador precisa ver a
   * consequência em MOEDA, e não em porcentagem de uma parcela que ele não enxerga.
   */
  previsaoDeImpostoEm(idProvincia: string, nivel: NivelDeImposto): PrevisaoDeImposto | null {
    return previsaoDeImpostoEm(this.nucleo, idProvincia, nivel);
  }

  /**
   * ⚠️ `porPoder` existe para a IA erguer pela MESMA porta que a tela usa. Sem ele, ela
   * precisaria de um caminho próprio — e um caminho próprio é como a IA acaba jogando um jogo
   * parecido com este em vez deste.
   */
  /**
   * Os quatro slots desta província estão cheios?
   *
   * ⚠️ **É a única recusa que uma demolição cura**, e por isso ela é uma pergunta própria em
   * vez de um texto para comparar. A IA usa isto para saber quando vale trocar de obra; ler o
   * motivo escrito faria a decisão dela depender da redação de uma mensagem.
   */
  semSlotLivreEm(idProvincia: string): boolean {
    return (
      construcoesEm(this.nucleo, idProvincia).length >=
      this.nucleo.ajustes.construcoes.slotsPorProvincia
    );
  }

  /** Esta obra pode ser derrubada aqui, e se não, por quê? */
  podeDemolir(idProvincia: string, idConstrucao: string, porPoder?: string): Recusa {
    return podeDemolir(
      this.nucleo,
      idProvincia,
      idConstrucao,
      porPoder ?? this.nucleo.estado.jogador,
    );
  }

  podeConstruir(idProvincia: string, idConstrucao: string, porPoder?: string): Recusa {
    return podeConstruir(
      this.nucleo,
      idProvincia,
      idConstrucao,
      porPoder ?? this.nucleo.estado.jogador,
    );
  }

  // ── Portões ─────────────────────────────────────────────────────────────────────────
  /** Esta província aceita ALGUMA ação minha? É o portão, não uma ação específica. */
  podeAgirEm(idProvincia: string, porPoder?: string): Recusa {
    return podeAgirEm(this.nucleo, idProvincia, porPoder ?? this.nucleo.estado.jogador);
  }

  podeMobilizarEm(idProvincia: string, porPoder?: string): Recusa {
    return podeMobilizarEm(this.nucleo, idProvincia, porPoder ?? this.nucleo.estado.jogador);
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

  /**
   * O nome da faixa de população desta terra — a régua ao lado do número cru.
   *
   * Sem ela, "35.000 habitantes" não diz nada: grande comparado com quê? A faixa responde, e
   * é a MESMA que decide quanto a terra come. Um sistema, um trabalho.
   */
  faixaDaProvinciaEm(idProvincia: string): string {
    return faixaDaProvinciaEm(this.nucleo, idProvincia);
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

  /**
   * Que TIPO de coisa esta obra faz, ou `null` se ela não existir no catálogo.
   *
   * ⚠️ A IA valoriza obra por tipo de efeito, e não por id de prédio: assim um prédio novo
   * com efeito conhecido entra sozinho na conta dela, sem ninguém lembrar de atualizá-la.
   */
  efeitoDaObra(idConstrucao: string): TipoDeEfeito | null {
    return this.nucleo.catalogo[idConstrucao]?.efeito.tipo ?? null;
  }

  /**
   * Esta obra ABRE O MAR? É a porta por onde a mercadoria e o exército embarcam.
   *
   * Pergunta pelo dado (`ligaPorMar`), e não por um id escrito na regra: o dia em que houver
   * uma segunda obra que abra o mar, ela abre sem ninguém lembrar de mexer aqui.
   */
  abreOMar(idConstrucao: string): boolean {
    return this.nucleo.catalogo[idConstrucao]?.ligaPorMar === true;
  }

  /** O nome que a obra tem na tela, ou o próprio id se ela sumir do catálogo. */
  nomeDaObra(idConstrucao: string): string {
    return this.nucleo.catalogo[idConstrucao]?.nome ?? idConstrucao;
  }

  /** O custo final nesta terra; normalmente escalado, ou fixo quando o catálogo assim declara. */
  custoDaObraEm(idProvincia: string, idConstrucao: string, nivel: number): number {
    const construcao = this.nucleo.catalogo[idConstrucao];
    if (!construcao) return 0;
    return custoDaObra(construcao, nivel, escalaDeObraEm(this.nucleo, idProvincia));
  }

  /** O que ela cobra por turno nesta terra, respeitando a mesma regra de escala do custo. */
  manutencaoDaObraEm(idProvincia: string, idConstrucao: string, nivel: number): number {
    const construcao = this.nucleo.catalogo[idConstrucao];
    if (!construcao) return 0;
    return manutencaoDaObra(construcao, nivel, escalaDeObraEm(this.nucleo, idProvincia));
  }
}
