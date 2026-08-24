/**
 * As hostes em pé: reunir, dispensar, manter e desertar.
 *
 * Liga as contas puras de `recrutamento.ts` ao estado mutável. Existe separado da
 * `Campanha` porque ela estava virando o arquivo que sabe tudo — e movimento e batalha
 * vão ter os seus próprios. **Nada de guerra cresce aqui.**
 *
 * O recorte de estado que ele recebe é deliberadamente estreito: tesouros, população e
 * hostes. É o que a mobilização pode mexer, e nada além — a assinatura do construtor é
 * a fronteira escrita.
 *
 * ⚠️ **Toda operação de dinheiro pede o PODER.** Não existe "o tesouro"; existe o tesouro
 * de alguém. Recrutar em Elêusis gasta o cofre de Elêusis, e a folha de Tanagra sai do
 * cofre de Tanagra — inclusive enquanto ninguém estiver jogando com eles.
 */

import type { Ajustes } from '@/dados/esquema';
import { exercitoVazio, forcaDe, retirar, somarLeva } from './exercito';
import type { Exercito } from './exercito';
import { concluirFormacoes, iniciarFormacao } from './formacao-de-leva';
import type { LevaEmFormacao, ResultadoDasFormacoes } from './formacao-de-leva';
import { avaliarLeva, disponivelParaLeva, manutencaoDe, maximoDaLeva } from './recrutamento';
import type { RecusaDeLeva } from './recrutamento';

type AjustesCombate = Ajustes['jogo']['combate'];

/** O recorte do estado que a mobilização pode alterar. Nada além disto. */
export interface EstadoDeMobilizacao {
  /** Por id de poder. Ver `EstadoCampanha.tesouros`. */
  tesouros: Record<string, number>;
  populacao: Record<string, number>;
  /** Por ID de hoste. Ver `exercito.ts`: a provincia deixou de ser a chave. */
  hostes: Record<string, Exercito>;
  proximaHoste: number;
  formacoes: Record<string, LevaEmFormacao>;
}

export class Mobilizacao {
  constructor(
    private readonly estado: EstadoDeMobilizacao,
    private readonly ajustes: AjustesCombate,
  ) {}

  /**
   * Gera a identidade da proxima hoste. Contador, nunca sorteio.
   *
   * Publico porque a guarnicao inicial e a formacao de leva tambem criam hostes, e todas
   * tem que sair do MESMO contador - dois contadores dariam dois `h7` um dia.
   */
  proximoId(): string {
    const numero = this.estado.proximaHoste;
    this.estado.proximaHoste = numero + 1;
    return `h${numero}`;
  }

  /** Toda hoste parada nesta provincia, em ordem estavel de id. */
  hostesEm(idProvincia: string): readonly Exercito[] {
    return this.ordenadas().filter((h) => h.posicao === idProvincia);
  }

  /**
   * A ÚNICA hoste parada aqui, ou `undefined`.
   *
   * ⚠️ **Devolve `undefined` quando há mais de uma**, de propósito. Antes devolvia "a
   * primeira por id", e isso virou mentira no dia em que sitiar deixou de engajar: com o
   * sitiante acampado ao lado da guarnição, "a primeira" é
   * quem foi recrutado antes — o defensor — e a interface inteira passou a falar do
   * exército errado. Quem lida com um lugar que pode ter duas usa `hostesEm`; quem sabe
   * de qual hoste está falando usa `hoste(id)`.
   *
   * Continua servindo às regras que são mesmo da PROVÍNCIA e onde duas seriam um erro:
   * mover uma peça de desenvolvimento, fundir uma leva.
   */
  private unicaEm(idProvincia: string): Exercito | undefined {
    const aqui = this.hostesEm(idProvincia);
    return aqui.length === 1 ? aqui[0] : undefined;
  }

  /** Quantos homens tem ESTA hoste. Não é o total do lugar. */
  forcaDaHoste(idHoste: string): number {
    return forcaDe(this.hoste(idHoste));
  }

  /** Manda homens desta hoste pra casa. Cada um volta à SUA província de origem. */
  dispensarDe(idHoste: string, homens: number): void {
    if (!Number.isInteger(homens) || homens <= 0) {
      throw new Error('o número de homens dispensados precisa ser um inteiro positivo');
    }
    const exercito = this.hoste(idHoste);
    if (!exercito) throw new Error(`não há hoste ${idHoste}`);
    this.devolver(exercito, homens);
  }

  /** A hoste com este id, onde quer que esteja. */
  hoste(idHoste: string): Exercito | undefined {
    return this.estado.hostes[idHoste];
  }

  /**
   * Todas as hostes em ordem de id.
   *
   * ⚠️ Ordenado sempre: `Object.keys` devolve a ordem de criacao, e percorrer isso cru
   * faria o desenho e a folha de pagamento dependerem de quem foi recrutado primeiro.
   */
  private ordenadas(): Exercito[] {
    return Object.keys(this.estado.hostes)
      .sort()
      .flatMap((id) => {
        const h = this.estado.hostes[id];
        return h ? [h] : [];
      });
  }

  /** Homens de um PODER parados nesta província. Zero quando ele não está aqui. */
  forcaEm(idProvincia: string, idPoder: string): number {
    return this.hostesEm(idProvincia)
      .filter((h) => h.poder === idPoder)
      .reduce((total, h) => total + forcaDe(h), 0);
  }

  formacaoEm(idProvincia: string): LevaEmFormacao | undefined {
    return this.estado.formacoes[idProvincia];
  }

  /** Todas as levas que já aparecem no mundo, mas ainda não aceitam ordens. */
  formacoes(): readonly { provincia: string; formacao: LevaEmFormacao }[] {
    return Object.entries(this.estado.formacoes).map(([provincia, formacao]) => ({
      provincia,
      formacao,
    }));
  }

  /**
   * Toda hoste em pé no mundo, em ordem de id. É o que o mapa desenha.
   *
   * ⚠️ Devolve as HOSTES, não pares `{provincia, exercito}`: a posição já vive dentro da
   * hoste, e o par duplicado era o convite a continuar pensando por província.
   */
  todas(): readonly Exercito[] {
    return this.ordenadas();
  }

  /** As hostes deste poder, onde quer que estejam — inclusive em terra alheia. */
  doPoder(idPoder: string): readonly Exercito[] {
    return this.todas().filter((h) => h.poder === idPoder);
  }

  /**
   * Este poder ainda tem alguém em armas?
   *
   * É a metade da pergunta "está vivo?" que o território não responde: um poder que perdeu
   * o último chão mas mantém uma hoste continua no jogo, no exílio.
   */
  temTropa(idPoder: string): boolean {
    return (
      this.doPoder(idPoder).length > 0 ||
      this.formacoes().some(({ formacao }) => formacao.poder === idPoder)
    );
  }

  /**
   * O que a tropa NASCIDA nesta província custa por turno, onde quer que esteja.
   *
   * É a resposta de "esta terra me puxa pra baixo?": a origem de cada soldado já é
   * rastreada, então a folha militar pode ser lida terra a terra. Só hostes ativas —
   * a leva em formação ainda não recebe soldo.
   */
  custoDaTropaDe(idProvincia: string): number {
    let homens = 0;
    for (const exercito of Object.values(this.estado.hostes)) {
      homens += exercito.origem[idProvincia] ?? 0;
    }
    return manutencaoDe(homens, this.ajustes);
  }

  /** Quantos homens nascidos nesta província estão em armas em todo o mapa. */
  homensEmArmasDe(idProvincia: string): number {
    let total = 0;
    for (const exercito of Object.values(this.estado.hostes)) {
      total += exercito.origem[idProvincia] ?? 0;
    }
    for (const formacao of Object.values(this.estado.formacoes)) {
      if (formacao.origem === idProvincia) total += formacao.homens;
    }
    return total;
  }

  /** Quantos habitantes esta província ainda cede a uma leva. */
  disponivelParaLevaEm(idProvincia: string): number {
    return disponivelParaLeva(this.populacaoDe(idProvincia), this.ajustes);
  }

  /** Quanto este poder tem em caixa. Zero quando ele nunca teve entrada. */
  tesouroDe(idPoder: string): number {
    return this.estado.tesouros[idPoder] ?? 0;
  }

  /** Teto real da leva: população cedida e ouro do PODER contam ao mesmo tempo. */
  maximoParaLevaEm(idProvincia: string, idPoder: string): number {
    return maximoDaLeva(
      { populacao: this.populacaoDe(idProvincia), tesouro: this.tesouroDe(idPoder) },
      this.ajustes,
    );
  }

  avaliarLevaEm(
    idProvincia: string,
    idPoder: string,
    homens: number,
  ): RecusaDeLeva {
    return avaliarLeva(
      homens,
      {
        populacao: this.populacaoDe(idProvincia),
        tesouro: this.tesouroDe(idPoder),
      },
      this.ajustes,
    );
  }

  /**
   * Põe uma hoste no mapa do nada. **Só desenvolvimento** — ver `Campanha.plantarHoste`.
   *
   * Serve pra montar um inimigo no tabuleiro enquanto a IA não existe. Não cobra ouro,
   * não tira gente da população, e por isso nenhuma regra do jogo pode chamar isto.
   */
  plantar(idProvincia: string, idPoder: string, homens: number): string {
    // ⚠️ Substitui só o que é DESTE poder. Apagava tudo o que estivesse ali, e isso deixou
    // de servir quando duas forças inimigas passaram a caber no mesmo lugar: plantar uma
    // guarnição aniquilaria o sitiante sem batalha nenhuma.
    for (const antiga of this.hostesEm(idProvincia)) {
      if (antiga.poder === idPoder) delete this.estado.hostes[antiga.id];
    }
    const exercito = exercitoVazio(this.proximoId(), idPoder, idProvincia);
    somarLeva(exercito, idProvincia, homens);
    this.estado.hostes[exercito.id] = exercito;
    return exercito.id;
  }

  /**
   * Aplica uma leva autorizada: cobra agora, tira os homens da terra e inicia a formação.
   * Ela só entra em `exercitos` na próxima rodada.
   */
  recrutar(
    idProvincia: string,
    poder: string,
    leva: { ouro: number; homens: number },
    turnoAtual: number,
  ): void {
    // ⚠️ Tropa alheia parada aqui NÃO bloqueia mais: a cidade sitiada continua levantando
    // gente, como `cerco.ts` promete. A guarda que existia era do tempo em que a hoste
    // tinha a província como chave e a leva podia engordar o exército errado; hoje a
    // formação carrega o poder e `concluirFormacoes` entrega à hoste do MESMO poder.
    this.estado.tesouros[poder] = this.tesouroDe(poder) - leva.ouro;
    this.estado.populacao[idProvincia] = this.populacaoDe(idProvincia) - leva.homens;
    iniciarFormacao(this.estado.formacoes, idProvincia, poder, leva.homens, turnoAtual);
  }

  /** Torna ativas as levas cujo turno chegou, depois de resolver as marchas da rodada. */
  concluirFormacoes(
    turnoAtual: number,
    donoDe: (idProvincia: string) => string,
  ): ResultadoDasFormacoes {
    return concluirFormacoes(this.estado, turnoAtual, donoDe);
  }

  /**
   * Manda homens pra casa. Cada um volta à SUA província de origem.
   *
   * ⚠️ **Volta à terra dele mesmo que ela seja do inimigo agora.** É uma regra só, sem
   * exceção: gente pertence ao chão, não a quem manda no chão. A consequência é dura e é
   * de propósito — dispensar tropa levantada em província perdida **entrega aqueles
   * habitantes ao conquistador**, e por isso retomar a terra antes de desmobilizar passa a
   * ser uma decisão.
   *
   * A alternativa seria fazê-los sumir do mundo, e aí perder território encolheria a
   * humanidade do mapa toda vez — população viraria catraca de sentido único.
   */
  dispensar(idProvincia: string, homens: number): void {
    const exercito = this.unicaEm(idProvincia);
    if (!exercito) throw new Error(`não há uma hoste só em ${idProvincia}`);
    this.dispensarDe(exercito.id, homens);
  }

  /**
   * Passa a hoste de uma província para outra, fundindo com a que já estiver lá.
   *
   * **Uma hoste por província**, e é isso que dispensa pilha, ordem de empilhamento e a
   * pergunta "qual das minhas defende". Duas hostes do mesmo poder que se encontram viram
   * uma, somando a origem de cada homem — e por isso quem veio de Maratona continua
   * voltando pra Maratona quando for dispensado.
   *
   * ⚠️ **Não julga se a marcha é legal.** Quem decide é `src/movimento/marcha.ts`; esta é
   * a primitiva que executa. Misturar as duas faria deste arquivo o lugar onde as regras
   * de guerra acabariam morando.
   */
  mover(origem: string, destino: string): void {
    const hoste = this.unicaEm(origem);
    if (!hoste) throw new Error(`não há uma hoste só em ${origem}`);
    if (origem === destino) return;

    const naChegada = this.unicaEm(destino);
    if (naChegada && naChegada.poder !== hoste.poder) {
      // Entrar onde ha tropa alheia e batalha, e batalha nao e assunto desta primitiva.
      // Estourar alto e melhor que fundir exercitos inimigos num so.
      throw new Error(`há tropa de ${naChegada.poder} em ${destino}`);
    }

    if (!naChegada) {
      hoste.posicao = destino;
      return;
    }
    // Fundir e POLITICA, nao obrigacao da estrutura: some a que chegou, fica a que estava.
    for (const [terra, homens] of Object.entries(hoste.origem)) {
      naChegada.origem[terra] = (naChegada.origem[terra] ?? 0) + homens;
    }
    delete this.estado.hostes[hoste.id];
  }

  /**
   * Quantos homens em armas este poder sustenta, contando as levas em formação.
   *
   * ⚠️ **A leva conta.** Ela já saiu da população e já come — só não marcha nem luta. Não
   * contá-la abriria uma brecha em que recrutar na véspera da fome sairia de graça.
   */
  homensDe(idPoder: string): number {
    let homens = 0;
    for (const h of this.doPoder(idPoder)) homens += forcaDe(h);
    for (const { formacao } of this.formacoes()) {
      if (formacao.poder === idPoder) homens += formacao.homens;
    }
    return homens;
  }

  /**
   * A fome cobra do exército: tira homens e **não devolve ninguém à terra natal**.
   *
   * ⚠️ É o contrário de `dispensarDe` e de deserção, e a diferença é o ponto: quem não
   * recebe soldo vai embora vivo, e a província de origem recupera aquela gente; quem
   * passa fome no campo morre, e a população não volta. Duas travas do exército, duas
   * consequências — se as duas devolvessem gente, uma seria redundante.
   *
   * Reparte as baixas proporcionalmente entre as hostes do poder, e depois entre as levas
   * ainda em formação, que também já comem. `pouparEm` lista as províncias cujas tropas
   * ficam de fora — as cidades sitiadas do próprio poder, que já pagam o relógio da
   * despensa e não podem pagar a mesma fome duas vezes. Devolve quantos de fato caíram.
   */
  matarPorFome(
    idPoder: string,
    homens: number,
    pouparEm: ReadonlySet<string> = new Set(),
  ): number {
    const alvo = Math.floor(homens);
    if (alvo <= 0) return 0;

    const hostes = this.doPoder(idPoder).filter((h) => !pouparEm.has(h.posicao));
    const emArmas = hostes.reduce((total, h) => total + forcaDe(h), 0);
    let mortos = 0;

    for (const hoste of hostes) {
      if (mortos >= alvo) break;
      const fatia = emArmas > 0 ? Math.floor((forcaDe(hoste) * alvo) / emArmas) : 0;
      const tirar = Math.min(Math.max(fatia, 0), forcaDe(hoste), alvo - mortos);
      if (tirar <= 0) continue;
      retirar(hoste, tirar);
      mortos += tirar;
      if (forcaDe(hoste) <= 0) delete this.estado.hostes[hoste.id];
    }

    // O resto do arredondamento, e o caso de o poder só ter leva em formação.
    for (const hoste of this.doPoder(idPoder)) {
      if (mortos >= alvo) break;
      if (pouparEm.has(hoste.posicao)) continue;
      const tirar = Math.min(alvo - mortos, forcaDe(hoste));
      if (tirar <= 0) continue;
      retirar(hoste, tirar);
      mortos += tirar;
      if (forcaDe(hoste) <= 0) delete this.estado.hostes[hoste.id];
    }
    for (const { provincia, formacao } of this.formacoes()) {
      if (mortos >= alvo) break;
      if (formacao.poder !== idPoder || pouparEm.has(provincia)) continue;
      const tirar = Math.min(alvo - mortos, formacao.homens);
      if (tirar <= 0) continue;
      formacao.homens -= tirar;
      mortos += tirar;
      if (formacao.homens <= 0) delete this.estado.formacoes[provincia];
    }
    return mortos;
  }

  /**
   * A fome do cerco: mata homens DESTA hoste, sem devolver ninguém à origem.
   *
   * Par do `matarPorFome`, que reparte pelo poder inteiro: aqui quem morre é quem está
   * preso atrás da muralha, e a campanha diz exatamente quantos. Devolve quantos caíram.
   */
  matarDaHoste(idHoste: string, homens: number): number {
    const exercito = this.hoste(idHoste);
    if (!exercito) return 0;
    const tirar = Math.min(Math.max(0, Math.floor(homens)), forcaDe(exercito));
    if (tirar <= 0) return 0;
    retirar(exercito, tirar);
    if (forcaDe(exercito) <= 0) delete this.estado.hostes[exercito.id];
    return tirar;
  }

  /** O mesmo para a leva em formação desta província: ela também está dentro dos muros. */
  matarDaFormacao(idProvincia: string, homens: number): number {
    const formacao = this.estado.formacoes[idProvincia];
    if (!formacao) return 0;
    const tirar = Math.min(Math.max(0, Math.floor(homens)), formacao.homens);
    if (tirar <= 0) return 0;
    formacao.homens -= tirar;
    if (formacao.homens <= 0) delete this.estado.formacoes[idProvincia];
    return tirar;
  }

  /**
   * O levante: parte da população pega em armas CONTRA o dono atual da província.
   *
   * Os rebeldes saem da população — o manancial humano é um só, como no recrutamento — e
   * nascem como hoste do poder a que a terra pertencia em 700 a.C. Se esse poder tinha
   * sido eliminado, a hoste o traz de volta ao jogo: restauração pela arma do povo.
   */
  levantarRebeldes(idProvincia: string, idPoder: string, homens: number): string | null {
    const disponivel = Math.min(Math.max(0, Math.floor(homens)), this.populacaoDe(idProvincia));
    if (disponivel <= 0) return null;
    this.estado.populacao[idProvincia] = this.populacaoDe(idProvincia) - disponivel;
    const exercito = exercitoVazio(this.proximoId(), idPoder, idProvincia);
    somarLeva(exercito, idProvincia, disponivel);
    this.estado.hostes[exercito.id] = exercito;
    return exercito.id;
  }

  manutencaoDe(idPoder: string): number {
    let homens = 0;
    for (const h of this.doPoder(idPoder)) homens += forcaDe(h);
    return manutencaoDe(homens, this.ajustes);
  }

  /**
   * Paga a folha de um poder e devolve quantos desertaram.
   *
   * A campanha arrecada ANTES de chamar isto. Faltando ouro, a fração não paga deserta
   * proporcionalmente de cada hoste e volta pra população de origem.
   *
   * ⚠️ **Deserção proporcional, nunca colapso.** Espiral de morte não é decisão: é o jogo
   * terminando sozinho enquanto o jogador assiste. O exército encolhe, o tesouro nunca
   * fica negativo, e a saída existe — dispensar antes, ou tomar mais renda.
   */
  pagarManutencao(idPoder: string): number {
    const devido = this.manutencaoDe(idPoder);
    if (devido <= 0) return 0;

    const caixa = this.tesouroDe(idPoder);
    if (devido <= caixa) {
      this.estado.tesouros[idPoder] = caixa - devido;
      return 0;
    }

    const pago = Math.max(0, caixa);
    this.estado.tesouros[idPoder] = caixa - pago;
    const fracaoNaoPaga = (devido - pago) / devido;
    let desertaram = 0;

    for (const exercito of this.doPoder(idPoder)) {
      const desertores = Math.ceil(forcaDe(exercito) * fracaoNaoPaga);
      if (desertores <= 0) continue;
      desertaram += desertores;
      this.devolver(exercito, desertores);
    }
    return desertaram;
  }

  private populacaoDe(idProvincia: string): number {
    return this.estado.populacao[idProvincia] ?? 0;
  }

  /**
   * Tira homens da hoste e devolve cada um à população da terra dele.
   *
   * Apaga a hoste quando ela zera, em vez de deixar um objeto vazio no estado: hoste sem
   * homem nenhum viraria marcador fantasma no mapa e linha vazia na lista.
   */
  private devolver(exercito: Exercito, homens: number): void {
    const devolvidos = retirar(exercito, homens);
    for (const [origem, quantos] of Object.entries(devolvidos)) {
      this.estado.populacao[origem] = (this.estado.populacao[origem] ?? 0) + quantos;
    }
    if (forcaDe(exercito) === 0) delete this.estado.hostes[exercito.id];
  }
}
