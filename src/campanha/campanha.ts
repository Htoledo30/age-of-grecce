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

import type { Ajustes, Construcoes, Economia, Provincias } from '@/dados/esquema';
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
import { exercitoVazio, forcaDe, retirar, somarLeva } from '@/combate/exercito';
import type { Exercito } from '@/combate/exercito';
import { avaliarLeva, manutencaoDe, tetoDeRecrutamento } from '@/combate/recrutamento';
import type { RecusaDeLeva } from '@/combate/recrutamento';

type AjustesJogo = Ajustes['jogo'];
type Poder = Provincias['poderes'][number];

/** Por que um investimento foi recusado. A interface mostra o motivo em vez de sumir. */
export type Recusa =
  | { pode: true; bonus: number }
  | { pode: false; motivo: string };

export class Campanha {
  private readonly estado: EstadoCampanha;
  /**
   * Índice reverso de `estado.dono`, mantido em pé a cada troca.
   *
   * É derivado, nunca gravado: a verdade é `estado.dono`, e este mapa só existe pra que
   * "quais são as províncias de Atenas?" não custe uma varredura das 205 a cada
   * redesenho. Quem muda dono é obrigado a passar por `trocarDono`, que conserta os dois
   * lados juntos.
   */
  private readonly provinciasPorPoder = new Map<string, string[]>();

  /** Chamado depois de qualquer mudança de estado. Quem desenha se redesenha inteiro. */
  aoMudar: () => void = () => {};

  constructor(
    private readonly atlas: Atlas,
    private readonly economia: Economia,
    private readonly catalogoDeConstrucoes: Construcoes,
    private readonly ajustes: AjustesJogo,
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
    const populacao: Record<string, number> = {};
    for (const [id, ficha] of Object.entries(economia.provincias)) populacao[id] = ficha.populacao;

    this.estado = {
      jogador: null,
      ano: ajustes.anoInicial,
      turno: 0,
      tesouro: ajustes.tesouroInicial,
      dono,
      populacao,
      exercitos: {},
      investimentos: {},
      construcoes: {},
      obras: {},
    };

    this.reindexar();
  }

  /**
   * Remonta o índice reverso inteiro a partir de `estado.dono`.
   *
   * Usado na abertura e em qualquer carga de estado. Custa 205 iterações e é idempotente
   * de propósito: retomar um salvamento tem que produzir exatamente o mesmo índice que
   * jogar até ali produziria.
   */
  private reindexar(): void {
    this.provinciasPorPoder.clear();
    for (const poder of this.atlas.poderes) this.provinciasPorPoder.set(poder.id, []);
    for (const p of this.atlas.provincias) {
      const dono = this.estado.dono[p.id];
      if (dono === undefined) throw new Error(`província sem dono na tabela: ${p.id}`);
      const lista = this.provinciasPorPoder.get(dono);
      if (!lista) throw new Error(`província "${p.nome}" tem dono inexistente: ${dono}`);
      lista.push(p.id);
    }
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
    const lista = this.provinciasPorPoder.get(idPoder);
    if (!lista) throw new Error(`poder inexistente: ${idPoder}`);
    return lista;
  }

  /** De quem é esta província AGORA. Não é o dono assado: é o dono corrente. */
  donoDe(idProvincia: string): string {
    const dono = this.estado.dono[idProvincia];
    if (dono === undefined) throw new Error(`província inexistente: ${idProvincia}`);
    return dono;
  }

  /**
   * Um poder está vivo enquanto tiver ao menos uma província.
   *
   * Derivado, nunca gravado: perder a última província É a eliminação, e não existe um
   * segundo lugar onde alguém possa marcar "morto" e discordar da tabela de donos.
   */
  vivo(idPoder: string): boolean {
    return this.provinciasDe(idPoder).length > 0;
  }

  /** Quem ainda tem território. Começa com 148 e só encolhe. */
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
    const anterior = this.donoDe(idProvincia);
    if (!this.atlas.existePoder(idPoder)) throw new Error(`poder inexistente: ${idPoder}`);
    if (anterior === idPoder) return;

    const listaAnterior = this.provinciasPorPoder.get(anterior);
    if (listaAnterior) {
      const posicao = listaAnterior.indexOf(idProvincia);
      if (posicao >= 0) listaAnterior.splice(posicao, 1);
    }
    const listaNova = this.provinciasPorPoder.get(idPoder);
    if (!listaNova) throw new Error(`poder inexistente: ${idPoder}`);
    listaNova.push(idProvincia);

    this.estado.dono[idProvincia] = idPoder;

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
  private baseDe(idProvincia: string): BaseDaProvincia {
    return {
      construcoes: this.construcoesEm(idProvincia),
      populacao: this.populacaoDe(idProvincia),
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
    return this.podeAgirEm(idProvincia).pode && this.capacidadesEm(idProvincia).includes('recrutar');
  }

  /** O exército parado nesta província, se houver. */
  exercitoEm(idProvincia: string): Exercito | undefined {
    return this.estado.exercitos[idProvincia];
  }

  /** Quantos homens estão parados nesta província. */
  forcaEm(idProvincia: string): number {
    return forcaDe(this.estado.exercitos[idProvincia]);
  }

  /**
   * Quantos homens NASCIDOS nesta província estão em armas, onde quer que estejam.
   *
   * Conta contra o teto de recrutamento dela. Sem isso bastaria recrutar, marchar pra
   * fora e recrutar de novo pra esvaziar a cidade inteira em rodadas.
   */
  homensEmArmasDe(idProvincia: string): number {
    let total = 0;
    for (const exercito of Object.values(this.estado.exercitos)) {
      total += exercito.origem[idProvincia] ?? 0;
    }
    return total;
  }

  /** Quantos homens esta província ainda comporta pôr em armas. */
  tetoDeLevaEm(idProvincia: string): number {
    return tetoDeRecrutamento(
      this.populacaoDe(idProvincia),
      this.homensEmArmasDe(idProvincia),
      this.ajustes.combate,
    );
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
    return avaliarLeva(
      homens,
      {
        populacao: this.populacaoDe(idProvincia),
        jaEmArmas: this.homensEmArmasDe(idProvincia),
        tesouro: this.estado.tesouro,
        temQuartel: this.capacidadesEm(idProvincia).includes('recrutar'),
      },
      this.ajustes.combate,
    );
  }

  /**
   * Põe gente em armas: cobra o ouro e **tira os homens da população da província**.
   *
   * A população cai na mesma hora, e com ela o imposto dali — mobilizar não é só uma
   * despesa de entrada, é uma cidade produzindo menos enquanto os seus estão no campo.
   * Junta-se ao exército que já estiver ali, em vez de criar um segundo: não existe pilha
   * de exércitos no mesmo lugar pra gerenciar.
   */
  recrutar(idProvincia: string, homens: number): void {
    const r = this.podeRecrutar(idProvincia, homens);
    if (!r.pode) throw new Error(r.motivo);

    this.estado.tesouro -= r.ouro;
    this.estado.populacao[idProvincia] = this.populacaoDe(idProvincia) - r.homens;

    const dono = this.donoDe(idProvincia);
    const exercito = this.estado.exercitos[idProvincia] ?? exercitoVazio(dono);
    somarLeva(exercito, idProvincia, r.homens);
    this.estado.exercitos[idProvincia] = exercito;
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
    const exercito = this.estado.exercitos[idProvincia];
    if (!exercito) throw new Error(`não há exército em ${this.nomeDe(idProvincia)}`);
    const devolvidos = retirar(exercito, homens);
    for (const [origem, quantos] of Object.entries(devolvidos)) {
      this.estado.populacao[origem] = (this.estado.populacao[origem] ?? 0) + quantos;
    }
    if (forcaDe(exercito) === 0) delete this.estado.exercitos[idProvincia];
    this.aoMudar();
  }

  /** O que este poder paga por turno pra manter os seus em armas. */
  manutencaoDe(idPoder: string): number {
    let homens = 0;
    for (const exercito of Object.values(this.estado.exercitos)) {
      if (exercito.poder === idPoder) homens += forcaDe(exercito);
    }
    return manutencaoDe(homens, this.ajustes.combate);
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
    const devido = this.manutencao;
    if (devido <= 0) return;

    if (devido <= this.estado.tesouro) {
      this.estado.tesouro -= devido;
      return;
    }

    const pago = Math.max(0, this.estado.tesouro);
    this.estado.tesouro -= pago;
    const naoPaga = (devido - pago) / devido;

    const jogador = this.estado.jogador;
    if (jogador === null) return;
    for (const [idProvincia, exercito] of Object.entries(this.estado.exercitos)) {
      if (exercito.poder !== jogador) continue;
      const desertores = Math.ceil(forcaDe(exercito) * naoPaga);
      if (desertores > 0) this.dispensar(idProvincia, desertores);
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
      return { pode: false, motivo: `o máximo por província é ${maximo.toLocaleString('pt-BR')} moedas` };
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
    this.aoMudar();
  }
}
