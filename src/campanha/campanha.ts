/**
 * A campanha: dona do estado e a única coisa que sabe as regras.
 *
 * **Não importa Pixi e não toca no DOM, de propósito.** É isso que deixa o conjunto de
 * regras inteiro rodar no vitest (que roda em Node, sem navegador) contra os dados de
 * verdade — turno, renda e investimento ficam sob teste sem subir uma tela.
 *
 * Quem manda um comando chama o método direto (`campanha.passarTurno()`); quem precisa
 * saber que algo mudou passa uma função em `aoMudar`. Enquanto houver um interessado só,
 * isso basta; quando houver quatro, aí sim vira emissor de eventos.
 */

import type { Ajustes, Construcoes, Economia, Exercitos, Provincias } from '@/dados/esquema';
import type { Atlas } from '@/mundo/atlas';
import { avancarAno } from './estado-campanha';
import type { EstadoCampanha, Obra } from './estado-campanha';
import {
  bonusDoInvestimento,
  rendaDaProvincia,
  retornoDaConstrucao,
  retornoDoInvestimento,
} from './economia';
import type {
  BaseDaProvincia,
  RendaDaProvincia,
  RetornoDaConstrucao,
  RetornoDoInvestimento,
} from './economia';
import type { Exercito } from '@/combate/exercito';
import type { LevaEmFormacao } from '@/combate/formacao-de-leva';
import type { RecusaDeLeva } from '@/combate/recrutamento';
import { Mobilizacao } from '@/combate/mobilizacao';
import { levantarGuarnicoes } from '@/combate/guarnicao-inicial';
import type { Cerco, Postura } from '@/combate/cerco';
import { miliciaDe, mortosDaMilicia } from '@/combate/milicia';
import type { HosteEmProvincia } from '@/combate/mobilizacao';
import { Territorios } from './territorios';
import { rotasDe } from '@/movimento/alcance';
import { avaliarOrdem } from '@/movimento/ordens';
import type { OrdemDeMarcha, RecusaDeOrdem } from '@/movimento/ordens';
import { resolverRodada } from '@/movimento/resolucao';
import type { RelatorioDaRodada } from '@/movimento/resolucao';
import { calcularCrescimentoPopulacional } from '@/populacao/crescimento';
import type { CrescimentoPopulacional } from '@/populacao/crescimento';

type AjustesJogo = Ajustes['jogo'];
type Poder = Provincias['poderes'][number];

/** Por que um investimento foi recusado. A interface mostra o motivo em vez de sumir. */
export type Recusa = { pode: true; bonus: number } | { pode: false; motivo: string };

export class Campanha {
  private readonly estado: EstadoCampanha;
  /**
   * Os dois módulos que a campanha coordena — e não reimplementa.
   *
   * A regra que separa: **transação é da campanha; coleção é do módulo.** Recrutar mexe em
   * ouro, população e tropa ao mesmo tempo e as três têm que acontecer juntas, então é da
   * campanha. "Quais províncias são de Atenas" e "junte esta leva" são do módulo.
   */
  private readonly territorios: Territorios;
  private readonly mobilizacao: Mobilizacao;

  /**
   * O que aconteceu na última virada: marchas, batalhas e conquistas.
   *
   * Efêmero de propósito — é notícia, não partida, e por isso NÃO entra no estado que vai
   * pro disco. Retomar um salvamento não deve reexibir a batalha do turno passado.
   */
  private ultimaRodada: RelatorioDaRodada = {
    marchas: [],
    batalhas: [],
    conquistas: [],
    milicianosMortos: [],
    cercos: [],
  };

  /** Chamado depois de qualquer mudança de estado. Quem desenha se redesenha inteiro. */
  aoMudar: () => void = () => {};

  constructor(
    private readonly atlas: Atlas,
    private readonly economia: Economia,
    private readonly catalogoDeConstrucoes: Construcoes,
    private readonly ajustes: AjustesJogo,
    exercitosIniciais: Exercitos,
  ) {
    for (const id of Object.keys(economia.provincias)) {
      if (!atlas.existe(id)) {
        throw new Error(`economia.json descreve província inexistente: ${id}`);
      }
    }

    // O dono do arquivo assado é o dono INICIAL: a condição de 700 a.C. A partir daqui a
    // verdade corrente é `estado.dono`, e é ela que a conquista muda.
    const dono: Record<string, string> = {};
    for (const p of atlas.provincias) dono[p.id] = p.dono;

    // População inicial: a de 700 a.C., copiada dos dados pro estado. A partir daqui ela
    // é da partida — recrutar a encolhe. Província sem economia configurada não entra e
    // continua sem população, como não tem renda.
    const populacaoAutoral: Record<string, number> = {};
    for (const [id, ficha] of Object.entries(economia.provincias)) {
      populacaoAutoral[id] = ficha.populacao;
    }

    // A tropa de 700 a.C. entra ANTES do estado existir, e os homens dela saem da
    // população da própria terra. Ver `guarnicao-inicial.ts`: o manancial é um só, e uma
    // guarnição que viesse de fora dele criaria gente ao ser dispensada.
    const tabuleiro = levantarGuarnicoes(
      exercitosIniciais.guarnicoes,
      populacaoAutoral,
      (id) => dono[id] ?? '',
      ajustes.combate,
    );

    this.estado = {
      jogador: null,
      ano: ajustes.anoInicial,
      turno: 0,
      tesouro: ajustes.tesouroInicial,
      dono,
      populacao: tabuleiro.populacao,
      hostes: tabuleiro.hostes,
      proximaHoste: tabuleiro.proximaHoste,
      formacoes: {},
      ordens: {},
      cercos: {},
      investimentos: {},
      construcoes: {},
      obras: {},
    };

    this.territorios = new Territorios(atlas, this.estado.dono);
    this.mobilizacao = new Mobilizacao(this.estado, ajustes.combate);
  }

  get iniciada(): boolean {
    return this.estado.jogador !== null;
  }

  get jogador(): Poder | null {
    return this.estado.jogador === null ? null : this.poder(this.estado.jogador);
  }

  get ano(): number {
    return this.estado.ano;
  }

  get turno(): number {
    return this.estado.turno;
  }

  get tesouro(): number {
    return this.estado.tesouro;
  }

  /** Renda por turno do jogador. Zero antes de a campanha começar. */
  get renda(): number {
    return this.estado.jogador === null ? 0 : this.rendaDe(this.estado.jogador);
  }

  poder(idPoder: string): Poder {
    return this.atlas.poder(idPoder);
  }

  /** Nome de exibição de uma província. Lança se ela não existe. */
  nomeDe(idProvincia: string): string {
    return this.atlas.nomeDe(idProvincia);
  }

  provinciasDe(idPoder: string): readonly string[] {
    return this.territorios.provinciasDe(idPoder);
  }

  /** De quem é esta província AGORA. Não é o dono assado: é o dono corrente. */
  donoDe(idProvincia: string): string {
    return this.territorios.donoDe(idProvincia);
  }

  /**
   * Um poder está vivo enquanto tiver **chão OU hoste**.
   *
   * ⚠️ Já foi só "tem província", e estava errado: o poder era dado como eliminado
   * enquanto o exército dele continuava de pé no mapa, gastando manutenção e ocupando
   * terra. Perder o último chão é ficar **no exílio**, não morrer.
   *
   * O exílio não precisa de temporizador nenhum: sem província não há renda, sem renda a
   * folha não é paga, e a tropa deserta sozinha em poucos turnos. A regra da deserção, que
   * já existia, é quem dá o prazo — e os desertores voltam pra terra deles, que agora é do
   * conquistador.
   */
  vivo(idPoder: string): boolean {
    return this.territorios.temTerritorio(idPoder) || this.mobilizacao.temTropa(idPoder);
  }

  /** Perdeu todo o chão mas ainda tem gente em armas. */
  noExilio(idPoder: string): boolean {
    return !this.territorios.temTerritorio(idPoder) && this.mobilizacao.temTropa(idPoder);
  }

  /** Quem ainda está no jogo, por chão ou por tropa. Começa com 148 e só encolhe. */
  poderesVivos(): readonly string[] {
    return this.atlas.poderes.filter((p) => this.vivo(p.id)).map((p) => p.id);
  }

  /**
   * Passa uma província de um dono a outro.
   *
   * É o único caminho: a tabela `estado.dono` e o índice reverso são consertados juntos,
   * aqui, e por isso não existe estado em que os dois discordem.
   *
   * Deliberadamente **sem regra de guerra nenhuma** — não pergunta se há fronteira, se
   * há exército, se há paz. É a primitiva que a conquista vai usar; quem decide se pode
   * é quem chama. Misturar as duas coisas faria desta função o lugar onde toda regra do
   * jogo acabaria morando.
   */
  trocarDono(idProvincia: string, idPoder: string): void {
    if (!this.territorios.trocarDono(idProvincia, idPoder)) return;

    // O incentivo em curso morre junto com a posse: quem pagou pra explorar mais uma
    // terra não continua colhendo dela depois de perdê-la. A construção FICA — ela é da
    // província, não de quem mandava nela, e é isso que faz tomar uma cidade rica valer
    // mais que tomar uma pobre.
    delete this.estado.investimentos[idProvincia];
    // A obra em andamento também morre: o dinheiro já saiu, e quem perdeu a província não
    // vai entregar a obra ao inimigo pronta.
    delete this.estado.obras[idProvincia];

    this.aoMudar();
  }

  /**
   * A economia de uma província, ou `null` quando ela não foi configurada.
   *
   * `null` é resposta legítima e a interface a mostra com todas as letras. Não existe
   * fórmula de reserva por área: província sem ficha econômica não arrecada e não é
   * simulada, e é melhor que o jogo admita isso do que invente número.
   */
  economiaDe(idProvincia: string): RendaDaProvincia | null {
    const ficha = this.economia.provincias[idProvincia];
    if (!ficha) return null;
    return rendaDaProvincia(
      ficha,
      this.economia.produtos,
      this.catalogoDeConstrucoes.construcoes,
      this.ajustes.economia,
      {
        ...this.baseDe(idProvincia),
        investimento: this.estado.investimentos[idProvincia],
      },
    );
  }

  /** O que a província é agora, tirando o incentivo: o que as contas comparam. */
  /** O cerco em curso nesta província, se houver. */
  cercoEm(idProvincia: string): Cerco | undefined {
    return this.estado.cercos[idProvincia];
  }

  /** Todos os cercos em curso, ordenados por província. */
  cercos(): { provincia: string; cerco: Cerco }[] {
    return Object.keys(this.estado.cercos)
      .sort()
      .flatMap((provincia) => {
        const cerco = this.estado.cercos[provincia];
        return cerco ? [{ provincia, cerco }] : [];
      });
  }

  /**
   * Troca a postura de um cerco já em pé.
   *
   * É o que o desenho pedia: sentar na frente da cidade e, três turnos depois, decidir que
   * o socorro está perto demais e ir pra cima. A troca vale na PRÓXIMA virada, como toda
   * ordem — nada acontece no clique.
   */
  mudarPostura(idProvincia: string, postura: Postura): void {
    const cerco = this.estado.cercos[idProvincia];
    if (!cerco) return;
    this.estado.cercos[idProvincia] = { ...cerco, postura };
    this.aoMudar();
  }

  private baseDe(idProvincia: string): BaseDaProvincia {
    return {
      construcoes: this.construcoesEm(idProvincia),
      populacao: this.populacaoDe(idProvincia),
      sitiada: this.estado.cercos[idProvincia] !== undefined,
    };
  }

  /**
   * Habitantes que ainda estão na província.
   *
   * Zero quando ela não tem economia configurada — mesma resposta honesta que
   * `economiaDe` dá, em vez de um número inventado.
   */
  populacaoDe(idProvincia: string): number {
    return this.estado.populacao[idProvincia] ?? 0;
  }

  /** Crescimento que esta província receberá no próximo fim de turno. */
  crescimentoDe(idProvincia: string): CrescimentoPopulacional | null {
    const ficha = this.economia.provincias[idProvincia];
    if (!ficha) return null;
    return calcularCrescimentoPopulacional(
      this.populacaoDe(idProvincia),
      ficha.populacao,
      this.construcoesEm(idProvincia),
      this.catalogoDeConstrucoes.construcoes,
      this.ajustes.populacao,
    );
  }

  /** Compara o crescimento atual com o que uma construção populacional entregaria. */
  impactoPopulacionalDaConstrucaoEm(
    idProvincia: string,
    idConstrucao: string,
  ): { antes: number; depois: number } | null {
    const ficha = this.economia.provincias[idProvincia];
    const construcao = this.catalogoDeConstrucoes.construcoes[idConstrucao];
    if (!ficha || construcao?.efeito.tipo !== 'populacao') return null;

    const atuais = this.construcoesEm(idProvincia);
    const antes = this.crescimentoDe(idProvincia);
    const depois = calcularCrescimentoPopulacional(
      this.populacaoDe(idProvincia),
      ficha.populacao,
      atuais.includes(idConstrucao) ? atuais : [...atuais, idConstrucao],
      this.catalogoDeConstrucoes.construcoes,
      this.ajustes.populacao,
    );
    return antes ? { antes: antes.crescimento, depois: depois.crescimento } : null;
  }

  /** Soma só o que está configurado. O resto do mapa não arrecada nada. */
  rendaDe(idPoder: string): number {
    let total = 0;
    for (const id of this.provinciasDe(idPoder)) total += this.economiaDe(id)?.total ?? 0;
    return total;
  }

  /** Quantas províncias do poder ainda estão sem economia configurada. */
  semEconomia(idPoder: string): number {
    return this.provinciasDe(idPoder).filter((id) => this.economiaDe(id) === null).length;
  }

  investimentoEm(idProvincia: string) {
    return this.estado.investimentos[idProvincia];
  }

  /**
   * Este investimento se paga, e em quantos turnos?
   *
   * `null` quando a província não tem economia. É a conta que a interface mostra ANTES
   * de o jogador gastar — a decisão só é decisão se ele puder ver o retorno.
   */
  retornoDe(idProvincia: string, valor: number): RetornoDoInvestimento | null {
    const ficha = this.economia.provincias[idProvincia];
    if (!ficha) return null;
    return retornoDoInvestimento(
      ficha,
      this.economia.produtos,
      this.catalogoDeConstrucoes.construcoes,
      this.ajustes.economia,
      this.baseDe(idProvincia),
      valor,
    );
  }

  /** O que já foi erguido nesta província. Vazio quando não há nada. */
  construcoesEm(idProvincia: string): readonly string[] {
    return this.estado.construcoes[idProvincia] ?? [];
  }

  /** A obra em andamento nesta província, se houver. */
  obraEm(idProvincia: string): Obra | undefined {
    return this.estado.obras[idProvincia];
  }

  /**
   * O que as construções erguidas ali destravaram.
   *
   * Separado da renda de propósito: uma construção paga em ouro **ou** em capacidade, e
   * misturar as duas numa conta só é exatamente o que faria a escolha virar aritmética.
   */
  capacidadesEm(idProvincia: string): readonly string[] {
    const capacidades: string[] = [];
    for (const id of this.construcoesEm(idProvincia)) {
      const efeito = this.catalogoDeConstrucoes.construcoes[id]?.efeito;
      if (efeito?.tipo === 'capacidade') capacidades.push(efeito.capacidade);
    }
    return capacidades;
  }

  /** Dá pra pôr gente em armas aqui? Exige o Quartel erguido e a província ser sua. */
  podeRecrutarEm(idProvincia: string): boolean {
    return (
      this.podeAgirEm(idProvincia).pode && this.capacidadesEm(idProvincia).includes('recrutar')
    );
  }

  /** O exército parado nesta província, se houver. */
  exercitoEm(idProvincia: string): Exercito | undefined {
    return this.mobilizacao.exercitoEm(idProvincia);
  }

  /** Quantos homens estão parados nesta província. */
  forcaEm(idProvincia: string): number {
    return this.mobilizacao.forcaEm(idProvincia);
  }

  /** Toda hoste em pé no mundo. É o que o mapa desenha. */
  hostes(): readonly HosteEmProvincia[] {
    return this.mobilizacao.todas();
  }

  /** Levas visíveis no mapa que só aceitarão ordens no próximo turno. */
  formacoes(): readonly { provincia: string; formacao: LevaEmFormacao }[] {
    return this.mobilizacao.formacoes();
  }

  formacaoEm(idProvincia: string): LevaEmFormacao | undefined {
    return this.mobilizacao.formacaoEm(idProvincia);
  }

  /** Quantos homens NASCIDOS nesta província estão em armas, onde quer que estejam. */
  homensEmArmasDe(idProvincia: string): number {
    return this.mobilizacao.homensEmArmasDe(idProvincia);
  }

  /** Quantos habitantes esta província ainda cede a uma leva. */
  disponivelParaLevaEm(idProvincia: string): number {
    return this.mobilizacao.disponivelParaLevaEm(idProvincia);
  }

  /** Quantos homens a população e o tesouro permitem recrutar neste instante. */
  maximoParaLevaEm(idProvincia: string): number {
    return this.mobilizacao.maximoParaLevaEm(idProvincia);
  }

  /**
   * Pode levantar esta leva aqui, e por quanto?
   *
   * O portão da PROVÍNCIA vem primeiro (é minha? tem economia?), e só depois as regras da
   * leva — assim a recusa diz a coisa mais externa que está errada, em vez de reclamar de
   * ouro numa província que nem é do jogador.
   */
  podeRecrutar(idProvincia: string, homens: number): RecusaDeLeva {
    const naProvincia = this.podeAgirEm(idProvincia);
    if (!naProvincia.pode) return { pode: false, motivo: naProvincia.motivo };
    return this.mobilizacao.avaliarLevaEm(
      idProvincia,
      homens,
      this.capacidadesEm(idProvincia).includes('recrutar'),
    );
  }

  /**
   * Põe gente em armas: cobra o ouro e **tira os homens da população da província**.
   *
   * A população cai na mesma hora, e com ela o imposto dali — mobilizar não é só uma
   * despesa de entrada, é uma cidade produzindo menos enquanto os seus estão no campo.
   * A leva aparece como formação exausta e só se junta à hoste ativa no próximo turno.
   */
  recrutar(idProvincia: string, homens: number): void {
    const r = this.podeRecrutar(idProvincia, homens);
    if (!r.pode) throw new Error(r.motivo);
    this.mobilizacao.recrutar(idProvincia, this.donoDe(idProvincia), r, this.estado.turno);
    this.aoMudar();
  }

  /**
   * Manda gente pra casa: cada um volta à SUA província de origem.
   *
   * É o contrário exato de recrutar, e existe desde já porque sem ele a população seria
   * uma catraca de sentido único — cada guerra encolheria o reino para sempre, e a única
   * estratégia possível seria nunca mobilizar.
   */
  dispensar(idProvincia: string, homens: number): void {
    this.mobilizacao.dispensar(idProvincia, homens);
    this.aoMudar();
  }

  /**
   * As rotas que a hoste parada aqui pode tomar nesta rodada, por destino.
   *
   * Vazio quando não há hoste, quando ela não é do jogador, ou quando ela está cercada de
   * terra alheia. É este mapa que a interface desenha como destinos clicáveis — e é dele
   * que sai a rota que a ordem guarda.
   */
  rotasDaHoste(idProvincia: string): ReadonlyMap<string, readonly string[]> {
    const hoste = this.mobilizacao.exercitoEm(idProvincia);
    if (!hoste) return new Map();
    return rotasDe(
      this.atlas,
      idProvincia,
      (id) => this.donoDe(id) === hoste.poder,
      this.ajustes.combate.saltosPorRodada,
    );
  }

  /** Só os destinos, pra quem não precisa da rota. */
  alcanceDaHoste(idProvincia: string): readonly string[] {
    return [...this.rotasDaHoste(idProvincia).keys()];
  }

  /**
   * A ordem registrada para a hoste desta província, se houver.
   *
   * ⚠️ **As ordens são endereçadas por ID DE HOSTE, não por província.** Foi por província,
   * e os dois são `Record<string, …>` — o compilador não distingue um do outro, então
   * misturar as duas chaves não daria erro nenhum: daria uma ordem que a resolução nunca
   * encontra e uma tropa que não sai do lugar. Esta função é a ponte para quem ainda
   * pergunta por província.
   */
  ordemEm(idProvincia: string): OrdemDeMarcha | undefined {
    const hoste = this.mobilizacao.exercitoEm(idProvincia);
    return hoste ? this.estado.ordens[hoste.id] : undefined;
  }

  /** Todas as ordens da rodada. É o que o mapa desenha como setas. */
  ordens(): readonly OrdemDeMarcha[] {
    return Object.keys(this.estado.ordens)
      .sort()
      .map((id) => this.estado.ordens[id])
      .filter((o): o is OrdemDeMarcha => o !== undefined);
  }

  /**
   * Esta ordem pode ser registrada, e por qual rota?
   *
   * Devolve o MOTIVO da recusa, como todo o resto do jogo: a interface escreve o texto em
   * vez de esconder o controle.
   */
  podeOrdenarMarcha(
    origem: string,
    destino: string,
    homens: number,
    porPoder: string | null = this.estado.jogador,
  ): RecusaDeOrdem {
    if (!this.iniciada) return { pode: false, motivo: 'a campanha ainda não começou' };
    const hoste = this.mobilizacao.exercitoEm(origem);
    return avaliarOrdem(origem, destino, this.atlas.nomeDe(destino), homens, {
      forcaNaOrigem: this.mobilizacao.forcaEm(origem),
      minha: hoste?.poder === porPoder,
      rota: this.rotasDaHoste(origem).get(destino),
      jaTemOrdem: this.ordemEm(origem) !== undefined,
    });
  }

  /**
   * Registra a ordem. **Nada se move agora.**
   *
   * `porPoder` existe porque a ordem pertence ao dono da HOSTE, não ao jogador: é assim
   * que a IA vai mandar as dela, e é o que permite montar um inimigo no tabuleiro hoje.
   * Omitir usa o jogador, que é o caso da interface.
   *
   * É o ponto da resolução simultânea: enquanto o turno não vira, jogador e IA decidem
   * contra o MESMO mundo. Sem isso, quem age primeiro toma a fronteira vazia antes de o
   * outro lado ter chance de mandar reforço.
   */
  ordenarMarcha(
    origem: string,
    destino: string,
    homens: number,
    porPoder: string | null = this.estado.jogador,
    postura: Postura = 'sitiar',
  ): void {
    const r = this.podeOrdenarMarcha(origem, destino, homens, porPoder);
    if (!r.pode) throw new Error(r.motivo);
    const hoste = this.mobilizacao.exercitoEm(origem);
    if (!hoste) throw new Error(`não há hoste em ${origem}`);
    this.estado.ordens[hoste.id] = { origem, rota: r.rota, homens, postura };
    this.aoMudar();
  }

  /**
   * Quantos milicianos esta província põe em pé para se defender.
   *
   * Derivada da população e das construções, calculada na hora e nunca guardada: um campo
   * de guarnição no estado seria um segundo manancial humano escondido.
   */
  miliciaEm(idProvincia: string): number {
    return miliciaDe(
      this.populacaoDe(idProvincia),
      this.construcoesEm(idProvincia),
      this.catalogoDeConstrucoes.construcoes,
      this.ajustes.combate,
    );
  }

  /** O relatório da última virada. Vazio antes do primeiro turno. */
  get rodada(): RelatorioDaRodada {
    return this.ultimaRodada;
  }

  /**
   * Põe uma hoste de qualquer poder numa província. **Existe pra DESENVOLVIMENTO**, como
   * o `darOuro`: montar um inimigo no tabuleiro sem esperar a IA existir.
   *
   * Não é regra do jogo e nenhuma mecânica chama isto — não cobra ouro e não tira ninguém
   * da população.
   */
  plantarHoste(idProvincia: string, idPoder: string, homens: number): void {
    this.mobilizacao.plantar(idProvincia, idPoder, homens);
    this.aoMudar();
  }

  /** Desfaz a ordem. Nada foi gasto, então nada é devolvido. */
  cancelarOrdem(origem: string): void {
    const hoste = this.mobilizacao.exercitoEm(origem);
    if (!hoste || this.estado.ordens[hoste.id] === undefined) return;
    delete this.estado.ordens[hoste.id];
    this.aoMudar();
  }

  /** O que este poder paga por turno pra manter os seus em armas. */
  manutencaoDe(idPoder: string): number {
    return this.mobilizacao.manutencaoDe(idPoder);
  }

  /** Manutenção do jogador por turno. Zero antes de a campanha começar. */
  get manutencao(): number {
    return this.estado.jogador === null ? 0 : this.manutencaoDe(this.estado.jogador);
  }

  /** O que sobra da renda depois de pagar a tropa. Pode ser negativo, e isso é o aviso. */
  get saldoPorTurno(): number {
    return this.renda - this.manutencao;
  }

  /**
   * Paga a manutenção do turno. O que não for pago, deserta.
   *
   * ⚠️ **Deserção proporcional, nunca colapso.** Quem não consegue pagar perde a fatia
   * não paga da tropa, e ela volta pra casa — não some do mapa nem leva o reino junto.
   * Espiral de morte não é decisão: é o jogo terminando sozinho enquanto o jogador
   * assiste. O sinal fica claro (o exército encolhe todo turno) e a saída existe
   * (dispensar antes, ou tomar mais renda).
   *
   * ⚠️ Cobra DEPOIS da arrecadação, pelo mesmo motivo do incentivo e das obras: quem
   * recruta neste turno paga a manutenção deste turno, e não do que vem.
   */
  private pagarTropa(): void {
    const jogador = this.estado.jogador;
    if (jogador === null) return;
    this.mobilizacao.pagarManutencao(jogador);
  }

  /** Cresce todas as províncias configuradas, inclusive as que não pertencem ao jogador. */
  private crescerPopulacao(): void {
    for (const id of Object.keys(this.economia.provincias)) {
      const crescimento = this.crescimentoDe(id);
      if (crescimento) this.estado.populacao[id] = crescimento.proxima;
    }
  }

  /** O catálogo inteiro, pra interface montar a lista de opções. */
  get construcoesDisponiveis(): Construcoes['construcoes'] {
    return this.catalogoDeConstrucoes.construcoes;
  }

  /**
   * Quanto esta construção acrescentaria aqui, e em quantos turnos ela se paga.
   *
   * `null` quando a província não tem economia. Diferente do incentivo, não existe "não
   * vale": construção é permanente e sempre se paga um dia — o que importa é quando.
   */
  retornoDaConstrucaoEm(idProvincia: string, idConstrucao: string): RetornoDaConstrucao | null {
    const ficha = this.economia.provincias[idProvincia];
    if (!ficha) return null;
    return retornoDaConstrucao(
      ficha,
      this.economia.produtos,
      this.catalogoDeConstrucoes.construcoes,
      this.ajustes.economia,
      this.baseDe(idProvincia),
      idConstrucao,
    );
  }

  /**
   * Pode erguer isto aqui?
   *
   * Devolve o MOTIVO da recusa, como `podeInvestir` — a interface mostra o texto em vez
   * de esconder a opção, que é a regra da casa.
   */
  podeConstruir(idProvincia: string, idConstrucao: string): Recusa {
    const construcao = this.catalogoDeConstrucoes.construcoes[idConstrucao];
    if (!construcao) return { pode: false, motivo: `construção inexistente: ${idConstrucao}` };
    const naProvincia = this.podeAgirEm(idProvincia);
    if (!naProvincia.pode) return naProvincia;
    if (this.construcoesEm(idProvincia).includes(idConstrucao)) {
      return { pode: false, motivo: 'já construída aqui' };
    }
    const obra = this.obraEm(idProvincia);
    if (obra) {
      const nome = this.catalogoDeConstrucoes.construcoes[obra.construcao]?.nome ?? obra.construcao;
      return { pode: false, motivo: `${nome} em obra aqui (${obra.turnosRestantes} turnos)` };
    }
    if (construcao.custo > this.estado.tesouro) {
      return {
        pode: false,
        motivo: `faltam ${(construcao.custo - this.estado.tesouro).toLocaleString('pt-BR')} moedas`,
      };
    }
    return { pode: true, bonus: 0 };
  }

  /**
   * Ergue uma construção. Paga à vista e **não expira nunca** — é essa permanência que a
   * torna o destino do dinheiro que o incentivo não consegue absorver.
   */
  construir(idProvincia: string, idConstrucao: string): void {
    const r = this.podeConstruir(idProvincia, idConstrucao);
    if (!r.pode) throw new Error(r.motivo);
    const construcao = this.catalogoDeConstrucoes.construcoes[idConstrucao];
    if (!construcao) throw new Error(`construção inexistente: ${idConstrucao}`);
    // Paga à vista, entrega depois. Não existe cancelar: devolver o dinheiro faria da
    // obra um cofre com juros, onde estacionar tesouro sem risco nenhum.
    this.estado.tesouro -= construcao.custo;
    this.estado.obras[idProvincia] = {
      construcao: idConstrucao,
      turnosRestantes: construcao.turnos,
    };
    this.aoMudar();
  }

  /** Escolhe o poder do jogador e abre o turno 1. Só acontece uma vez. */
  comecar(idPoder: string): void {
    if (this.iniciada) throw new Error('a campanha já começou');
    this.poder(idPoder); // valida antes de gravar
    this.estado.jogador = idPoder;
    this.estado.turno = 1;
    this.aoMudar();
  }

  /**
   * Pode investir aqui, e quanto de bônus isso compraria?
   *
   * Devolve o MOTIVO da recusa em vez de só `false`: é o que deixa a interface ensinar a
   * regra sem tutorial.
   */
  /**
   * Esta província aceita ALGUMA ação minha?
   *
   * É a pergunta da província, e não a de uma ação específica: campanha começou, o
   * território é meu, e ele tem economia. Ficar sem dinheiro **não** entra aqui — se
   * entrasse, o jogador quebrado veria o painel de ações inteiro sumir em vez de ver
   * cada opção dizendo quanto falta.
   */
  podeAgirEm(idProvincia: string): Recusa {
    if (!this.iniciada) return { pode: false, motivo: 'a campanha ainda não começou' };
    if (this.economiaDe(idProvincia) === null) {
      return { pode: false, motivo: 'esta província não tem economia configurada' };
    }
    const jogador = this.estado.jogador;
    if (jogador === null || this.donoDe(idProvincia) !== jogador) {
      return { pode: false, motivo: 'esta província não é sua' };
    }
    return { pode: true, bonus: 0 };
  }

  podeInvestir(idProvincia: string, valor: number): Recusa {
    const naProvincia = this.podeAgirEm(idProvincia);
    if (!naProvincia.pode) return naProvincia;
    if (!Number.isInteger(valor) || valor <= 0) {
      return { pode: false, motivo: 'o valor precisa ser um número inteiro de moedas' };
    }
    const maximo = this.ajustes.economia.investimento.maximo;
    if (valor > maximo) {
      return {
        pode: false,
        motivo: `o máximo por província é ${maximo.toLocaleString('pt-BR')} moedas`,
      };
    }
    if (valor > this.estado.tesouro) {
      return {
        pode: false,
        motivo: `tesouro insuficiente (${this.estado.tesouro.toLocaleString('pt-BR')} moedas)`,
      };
    }
    return { pode: true, bonus: bonusDoInvestimento(valor, this.ajustes.economia) };
  }

  /**
   * Paga um incentivo de exploração numa província.
   *
   * Só existe um por província: investir de novo SUBSTITUI o que estava lá e volta a
   * cobrar. É o que impede empilhar bônus infinitos, e é o que faz renovar cedo ser uma
   * escolha e não um clique de rotina.
   */
  investir(idProvincia: string, valor: number): void {
    const r = this.podeInvestir(idProvincia, valor);
    if (!r.pode) throw new Error(r.motivo);
    this.estado.tesouro -= valor;
    this.estado.investimentos[idProvincia] = {
      percentual: r.bonus,
      arrecadacoesRestantes: this.ajustes.economia.investimento.arrecadacoes,
    };
    this.aoMudar();
  }

  /**
   * Põe ouro no tesouro. **Existe pra DESENVOLVIMENTO**, como o `calibrarFronteira` da
   * camada de mapa: montar um cenário de teste sem jogar quinze turnos à mão.
   *
   * Não é regra do jogo e nenhuma mecânica chama isto. O gancho que a expõe vive atrás
   * de `import.meta.env.DEV` e não existe no jogo empacotado.
   */
  darOuro(valor: number): void {
    this.estado.tesouro += valor;
    this.aoMudar();
  }

  /**
   * Vira o turno.
   *
   * A ordem está escrita porque errar a ordem aqui não dá erro nenhum, só um número
   * torto: **arrecada primeiro, com o bônus ainda valendo; só depois gasta uma
   * arrecadação do incentivo e anda o calendário.** Se o incentivo vencesse antes da
   * cobrança, o jogador pagaria por quatro e receberia por três.
   */
  passarTurno(): void {
    if (!this.iniciada) throw new Error('a campanha ainda não começou');
    this.estado.tesouro += this.renda;
    this.pagarTropa();

    // ⚠️ **Arrecada ANTES de resolver as marchas.** A renda do turno pertence ao mundo
    // como ele estava quando o jogador decidiu; quem conquista na resolução colhe no turno
    // seguinte. Resolver primeiro daria ao agressor um pagamento no mesmo instante da
    // tomada, e a ordem aqui não dá erro nenhum — dá número torto em silêncio.
    this.ultimaRodada = resolverRodada(this.estado, this.ajustes.combate, {
      donoDe: (id) => this.donoDe(id),
      miliciaDe: (id) => this.miliciaEm(id),
      miliciaPerdida: (id, perdidos) => {
        // ⚠️ Só os MORTOS saem da população; o resto dispersa e volta pra casa. Aniquilar
        // a milícia inteira arruinaria a província pro resto da campanha — são os mesmos
        // lavradores que pagam tributo e que forneceriam recruta.
        const mortos = mortosDaMilicia(perdidos, this.ajustes.combate);
        this.estado.populacao[id] = Math.max(0, this.populacaoDe(id) - mortos);
      },
      // A conquista passa pela MESMA primitiva de sempre: índice reverso e tabela de
      // donos consertados juntos, sem um segundo caminho que possa discordar.
      trocarDono: (id, poder) => {
        this.territorios.trocarDono(id, poder);
        delete this.estado.investimentos[id];
        delete this.estado.obras[id];
      },
    });

    // Cresce com a população restante depois da folha militar. Só contam construções
    // que já estavam prontas ao começar a passagem: as obras avançam mais abaixo, então
    // um Celeiro concluído agora começa a ajudar no próximo turno.
    this.crescerPopulacao();

    for (const [id, investimento] of Object.entries(this.estado.investimentos)) {
      investimento.arrecadacoesRestantes -= 1;
      if (investimento.arrecadacoesRestantes <= 0) delete this.estado.investimentos[id];
    }

    // As obras andam DEPOIS da arrecadação, pelo mesmo motivo do incentivo: quem paga no
    // turno 1 uma obra de três turnos passa três arrecadações sem o benefício, e recebe
    // na quarta. Adiantar isso daria um turno de graça sem ninguém perceber.
    for (const [id, obra] of Object.entries(this.estado.obras)) {
      obra.turnosRestantes -= 1;
      if (obra.turnosRestantes > 0) continue;
      this.estado.construcoes[id] = [...this.construcoesEm(id), obra.construcao];
      delete this.estado.obras[id];
    }

    this.estado.ano = avancarAno(this.estado.ano, this.ajustes.anosPorTurno);
    this.estado.turno += 1;
    // Só depois de todas as marchas e batalhas: recruta pago nesta rodada não pode
    // defendê-la, atacar nem engrossar uma hoste que já recebeu ordem.
    this.mobilizacao.concluirFormacoes(this.estado.turno, (id) => this.donoDe(id));
    this.aoMudar();
  }
}
