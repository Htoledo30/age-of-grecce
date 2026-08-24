/**
 * A campanha: dona do estado e a única coisa que sabe as regras.
 *
 * **Não importa Pixi e não toca no DOM, de propósito.** É isso que deixa o conjunto de
 * regras inteiro rodar no vitest (que roda em Node, sem navegador) contra os dados de
 * verdade — turno, renda e imposto ficam sob teste sem subir uma tela.
 *
 * Quem manda um comando chama o método direto (`campanha.passarTurno()`); quem precisa
 * saber que algo mudou passa uma função em `aoMudar`. Enquanto houver um interessado só,
 * isso basta; quando houver quatro, aí sim vira emissor de eventos.
 */

import type { Ajustes, Construcoes, Economia, Exercitos, Provincias } from '@/dados/esquema';
import type { Atlas } from '@/mundo/atlas';
import { avancarAno } from './estado-campanha';
import type { EstadoCampanha, Obra } from './estado-campanha';
import { serializarCampanha } from './salvamento';
import { rendaDaProvincia, retornoDaConstrucao } from './economia';
import type {
  BaseDaProvincia,
  NivelDeImposto,
  RendaDaProvincia,
  RetornoDaConstrucao,
} from './economia';
import type { Exercito } from '@/combate/exercito';
import type { LevaEmFormacao } from '@/combate/formacao-de-leva';
import type { RecusaDeLeva } from '@/combate/recrutamento';
import { Mobilizacao } from '@/combate/mobilizacao';
import { levantarGuarnicoes } from '@/combate/guarnicao-inicial';
import { capitaisIniciais, melhorCapitalEntre } from './capitais';
import { corrupcaoDe, saltosDesde } from './corrupcao';
import type { Corrupcao } from './corrupcao';
import { alvoDeFelicidade, aproximarFelicidade, parcelasDoAlvo, revoltosa } from './felicidade';
import type { ParcelaDoAlvo, SituacaoDaProvincia } from './felicidade';
import { perfilDaProvincia } from './perfil-da-provincia';
import type { PerfilDaProvincia } from './perfil-da-provincia';
import { rodadasAteOAssalto } from '@/combate/cerco';
import type { Cerco, Postura } from '@/combate/cerco';
import { miliciaDe, mortosDaMilicia } from '@/combate/milicia';

import { Territorios } from './territorios';
import { rotasDe } from '@/movimento/alcance';
import { avaliarOrdem } from '@/movimento/ordens';
import type { OrdemDeMarcha, RecusaDeOrdem } from '@/movimento/ordens';
import { resolverRodada } from '@/movimento/resolucao';
import type { RelatorioDaRodada } from '@/movimento/resolucao';
import {
  balancoAlimentar,
  estadoAlimentarLocal,
  mortosPelaFome,
  nivelPopulacional,
} from '@/producao/alimentacao';
import type { BalancoAlimentarDoPoder, EstadoAlimentarLocal } from '@/producao/alimentacao';
import { calcularCrescimentoPopulacional } from '@/populacao/crescimento';
import type { CrescimentoPopulacional } from '@/populacao/crescimento';

type AjustesJogo = Ajustes['jogo'];
type Poder = Provincias['poderes'][number];

/** Por que um investimento foi recusado. A interface mostra o motivo em vez de sumir. */
export type Recusa = { pode: true; bonus: number } | { pode: false; motivo: string };

/**
 * Pode ou não pode, com o motivo quando não pode.
 *
 * Igual a `Recusa` sem o `bonus`, que é coisa da mobilização. Toda permissão do jogo
 * devolve o MOTIVO em vez de só esconder o controle: é a interface que escreve a frase.
 */
export type Permissao = { pode: true } | { pode: false; motivo: string };

/** Quem passou fome na última virada, para a crônica contar. */
export interface RelatorioDaFome {
  provincias: readonly { provincia: string; mortos: number }[];
  tropas: readonly { poder: string; homens: number }[];
}

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
    cercosLevantados: [],
  };

  /**
   * O que a fome fez na última virada. Efêmero como o relatório da rodada: é notícia, não
   * partida, e por isso não vai para o disco.
   */
  private ultimaFome: RelatorioDaFome = { provincias: [], tropas: [] };

  /** As capitais que caíram na última virada. Efêmero como a fome: notícia, não partida. */
  private ultimasQuedasDeCapital: readonly { poder: string; provincia: string }[] = [];

  /** Os levantes da última virada, para a crônica contar. Efêmero como a fome. */
  private ultimasRevoltas: readonly { provincia: string; poder: string; homens: number }[] = [];

  /**
   * Distâncias em saltos a partir de cada capital já consultada.
   *
   * Cache que nunca expira DE PROPÓSITO: o grafo de vizinhança é geografia assada e não
   * muda durante a partida. Trocar a capital só troca a CHAVE consultada; a política —
   * quem é dono do meio do caminho — não entra na conta, e é por isso que o cache é
   * seguro. Uma busca em largura de 205 províncias por capital, uma vez cada.
   */
  private readonly saltosPorCapital = new Map<string, ReadonlyMap<string, number>>();

  /** Chamado depois de qualquer mudança de estado. Quem desenha se redesenha inteiro. */
  aoMudar: () => void = () => {};

  constructor(
    private readonly atlas: Atlas,
    private readonly economia: Economia,
    private readonly catalogoDeConstrucoes: Construcoes,
    private readonly ajustes: AjustesJogo,
    exercitosIniciais: Exercitos,
  ) {
    for (const [id, ficha] of Object.entries(economia.provincias)) {
      if (!atlas.existe(id)) {
        throw new Error(`economia.json descreve província inexistente: ${id}`);
      }
      // As construções iniciais são ids do OUTRO arquivo, então o Zod não consegue
      // conferir sozinho. Um id errado aqui viraria uma construção fantasma: contada na
      // lista da ficha, sem efeito nenhum na renda.
      for (const construcao of Object.keys(ficha.construcoes)) {
        if (!catalogoDeConstrucoes.construcoes[construcao]) {
          throw new Error(`economia.json dá a ${id} uma construção inexistente: ${construcao}`);
        }
      }
    }
    for (const [id, construcao] of Object.entries(catalogoDeConstrucoes.construcoes)) {
      for (const produto of construcao.requisito?.produtos ?? []) {
        if (!economia.produtos[produto]) {
          throw new Error(`construção ${id} exige produto inexistente: ${produto}`);
        }
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
    // Povo, humor e o que já está de pé em 700 a.C. — copiados do arquivo pro estado pela
    // mesma razão que a população é: a partir daqui são da PARTIDA.
    const nacionalidades: Record<string, Record<string, number>> = {};
    const felicidade: Record<string, number> = {};
    const construcoes: Record<string, Record<string, number>> = {};
    for (const [id, ficha] of Object.entries(economia.provincias)) {
      populacaoAutoral[id] = ficha.populacao;
      nacionalidades[id] = { ...ficha.nacionalidades };
      felicidade[id] = ficha.felicidade;
      if (Object.keys(ficha.construcoes).length > 0) construcoes[id] = { ...ficha.construcoes };
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
      // ⚠️ TODOS os poderes começam com caixa, não só o jogador. Sem cofre próprio a IA
      // recrutaria de graça, contrariando a regra de que todos jogam com as mesmas
      // condições. Preencher aqui, e não na hora em que alguém precisar, evita o
      // `undefined` viajando por uma subtração.
      tesouros: Object.fromEntries(
        atlas.poderes.map((poder) => [poder.id, ajustes.tesouroInicial]),
      ),
      dono,
      populacao: tabuleiro.populacao,
      nacionalidades,
      felicidade,
      hostes: tabuleiro.hostes,
      proximaHoste: tabuleiro.proximaHoste,
      formacoes: {},
      ordens: {},
      surtidas: [],
      cercos: {},
      capitais: {},
      nivelDeImposto: {},
      construcoes,
      obras: {},
      revoltas: {},
    };

    this.territorios = new Territorios(atlas, this.estado.dono);
    // Depois do `Territorios`, que é quem sabe as províncias de cada poder.
    this.estado.capitais = capitaisIniciais(atlas, (id) => this.territorios.provinciasDe(id));
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

  /**
   * O caixa do JOGADOR. Conveniência para a interface, que só desenha o dele.
   *
   * Zero antes de a campanha começar — não há jogador de quem falar.
   */
  get tesouro(): number {
    return this.estado.jogador === null ? 0 : this.tesouroDe(this.estado.jogador);
  }

  /** O caixa de qualquer poder. Zero para quem nunca teve entrada. */
  tesouroDe(idPoder: string): number {
    return this.estado.tesouros[idPoder] ?? 0;
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

    // O decreto de imposto morre com a posse: a administração nova começa no normal. A
    // construção FICA — ela é da província, não de quem mandava nela, e é isso que faz
    // tomar uma cidade rica valer mais que tomar uma pobre.
    delete this.estado.nivelDeImposto[idProvincia];
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
      this.baseDe(idProvincia),
    );
  }

  /** O nível de imposto desta província. Ausente do registro é o normal. */
  nivelDeImpostoEm(idProvincia: string): NivelDeImposto {
    return this.estado.nivelDeImposto[idProvincia] ?? 'normal';
  }

  /** Pode decretar este nível de imposto aqui? A recusa vem com o motivo, como sempre. */
  podeDefinirImposto(idProvincia: string): Recusa {
    return this.podeAgirEm(idProvincia);
  }

  /**
   * Decreta o nível de imposto da província. **Efeito imediato e sem custo de entrada**:
   * a renda muda no clique e o humor passa a caminhar para o alvo novo — receita trocada
   * por pressão social, a alavanca do GDD.
   */
  definirImposto(idProvincia: string, nivel: NivelDeImposto): void {
    const r = this.podeDefinirImposto(idProvincia);
    if (!r.pode) throw new Error(r.motivo);
    if (nivel === 'normal') delete this.estado.nivelDeImposto[idProvincia];
    else this.estado.nivelDeImposto[idProvincia] = nivel;
    this.aoMudar();
  }

  /** O que a província é agora, tirando o incentivo: o que as contas comparam. */
  /**
   * A capital deste poder, ou `undefined` para quem não tem província nenhuma.
   *
   * ⚠️ Ela ainda não faz NADA no jogo — ver `capitais.ts`. Existe para que os sistemas
   * futuros tenham uma resposta só.
   */
  capitalDe(idPoder: string): string | undefined {
    return this.estado.capitais[idPoder];
  }

  /**
   * A capital deste poder caiu em mãos alheias?
   *
   * Para o JOGADOR, a resposta positiva trava a virada: escolher outra é decisão dele e
   * tem que acontecer antes de o mundo andar. Os demais poderes reassentam sozinhos na
   * virada, pela regra derivada — até a IA existir, é ela quem decide por eles.
   */
  capitalPerdida(idPoder: string): boolean {
    const capital = this.capitalDe(idPoder);
    return capital !== undefined && this.donoDe(capital) !== idPoder;
  }

  /** As capitais que caíram na última virada, para a crônica contar. */
  get quedasDeCapital(): readonly { poder: string; provincia: string }[] {
    return this.ultimasQuedasDeCapital;
  }

  /**
   * O que custaria assentar a capital do jogador em outra província AGORA.
   *
   * Zero quando a atual caiu ou quando não há capital: a escolha forçada não é castigo.
   * O custo só existe na mudança VOLUNTÁRIA — sem ele, a capital viraria um interruptor
   * grátis no dia em que a corrupção por distância passar a lê-la.
   */
  custoDeMudancaDeCapital(): number {
    const jogador = this.estado.jogador;
    if (jogador === null) return this.ajustes.capital.custoDeMudanca;
    const atual = this.capitalDe(jogador);
    if (atual === undefined || this.capitalPerdida(jogador)) return 0;
    return this.ajustes.capital.custoDeMudanca;
  }

  /** Pode assentar a capital do jogador AQUI? Devolve o motivo quando não pode. */
  podeMudarCapital(idProvincia: string): Recusa {
    if (!this.iniciada) return { pode: false, motivo: 'a campanha ainda não começou' };
    const jogador = this.estado.jogador;
    if (jogador === null || this.donoDe(idProvincia) !== jogador) {
      return { pode: false, motivo: 'esta província não é sua' };
    }
    if (this.capitalDe(jogador) === idProvincia) {
      return { pode: false, motivo: 'já é a capital' };
    }
    // Assentar o governo dentro de uma cidade cercada seria mudar-se para a armadilha.
    if (this.cercoEm(idProvincia)) {
      return { pode: false, motivo: 'esta cidade está sitiada' };
    }
    const custo = this.custoDeMudancaDeCapital();
    const caixa = this.tesouroDe(jogador);
    if (custo > caixa) {
      return {
        pode: false,
        motivo: `faltam ${(custo - caixa).toLocaleString('pt-BR')} moedas`,
      };
    }
    return { pode: true, bonus: 0 };
  }

  /** Assenta a capital do jogador nesta província, cobrando o custo da mudança voluntária. */
  mudarCapital(idProvincia: string): void {
    const r = this.podeMudarCapital(idProvincia);
    if (!r.pode) throw new Error(r.motivo);
    const jogador = this.estado.jogador;
    if (jogador === null) throw new Error('a campanha ainda não começou');
    this.gastar(jogador, this.custoDeMudancaDeCapital());
    this.estado.capitais[jogador] = idProvincia;
    this.aoMudar();
  }

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
   * Esta província tem obra que obriga a sitiar antes de assaltar?
   *
   * ⚠️ Lê o campo do CATÁLOGO, e não o id `muralha`. Amarrar a regra de combate a um id de
   * conteúdo faria uma troca de catálogo apagar a regra de guerra sem ninguém perceber.
   */
  impedeAssaltoImediatoEm(idProvincia: string): boolean {
    return this.construcoesEm(idProvincia).some(
      (id) => this.catalogoDeConstrucoes.construcoes[id]?.impedeAssaltoImediato === true,
    );
  }

  /**
   * Dá para assaltar esta cidade agora, e se não, quantas rodadas de cerco ainda faltam?
   *
   * Serve às duas perguntas da interface: o botão do cerco em pé ("passar ao assalto") e a
   * escolha de postura de uma marcha que ainda vai chegar lá. Cidade aberta responde
   * sempre `{ pode: true, faltam: 0 }`.
   */
  assaltoEm(idProvincia: string): { pode: boolean; faltam: number } {
    const faltam = rodadasAteOAssalto(
      this.impedeAssaltoImediatoEm(idProvincia),
      this.estado.cercos[idProvincia]?.rodadas ?? 0,
      this.ajustes.combate.cerco,
    );
    return { pode: faltam === 0, faltam };
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
    // A muralha barra o assalto antes da hora. A resolução também recusa — ela é a
    // autoridade, porque a postura ainda pode chegar por uma ordem de marcha — mas deixar
    // a ordem ser registrada aqui mostraria ao jogador uma decisão que não vai acontecer.
    if (postura === 'assaltar' && !this.assaltoEm(idProvincia).pode) return;
    this.estado.cercos[idProvincia] = { ...cerco, postura };
    this.aoMudar();
  }

  /**
   * Povo, humor e ancoradouro — o retrato que não é dinheiro.
   *
   * `null` na província sem ficha autoral, exatamente como `economiaDe`: 200 das 205 não
   * são simuladas, e a interface diz isso com todas as letras em vez de inventar.
   */
  perfilDe(idProvincia: string): PerfilDaProvincia | null {
    return perfilDaProvincia(
      idProvincia,
      this.economia,
      {
        felicidade: this.estado.felicidade[idProvincia] ?? 0,
        nacionalidades: this.estado.nacionalidades[idProvincia] ?? {},
      },
      this.ajustes.felicidade.faixas,
    );
  }

  private baseDe(idProvincia: string): BaseDaProvincia {
    return {
      construcoes: this.estado.construcoes[idProvincia] ?? {},
      populacao: this.populacaoDe(idProvincia),
      corrupcao: this.corrupcaoEm(idProvincia).total,
      fatorDeImposto: this.ajustes.economia.imposto.niveis[this.nivelDeImpostoEm(idProvincia)]
        .fator,
      revoltosa: this.emRevoltaEm(idProvincia),
      sitiada: this.estado.cercos[idProvincia] !== undefined,
    };
  }

  /** O humor desta província está na faixa revoltosa? É a que não paga imposto. */
  emRevoltaEm(idProvincia: string): boolean {
    const humor = this.estado.felicidade[idProvincia];
    return humor !== undefined && revoltosa(humor, this.ajustes.felicidade);
  }

  /** O povo desta província vive sob bandeira que não é a de 700 a.C.? */
  dominioEstrangeiroEm(idProvincia: string): boolean {
    return this.donoDe(idProvincia) !== this.atlas.donoInicial(idProvincia);
  }

  /** ESTA província está passando fome agora? A pergunta é local, como a consequência. */
  private passaFomeEm(idProvincia: string): boolean {
    if (this.estado.cercos[idProvincia] !== undefined) {
      return this.fomeDoCercoEm(idProvincia)?.fomeAtiva === true;
    }
    return (
      this.saldoAlimentarLocalEm(idProvincia) < 0 &&
      this.balancoAlimentarDe(this.donoDe(idProvincia)).saldoCivil < 0
    );
  }

  /** A situação que decide o alvo do humor desta província. Uma montagem só, dois usos. */
  private situacaoDeFelicidadeEm(idProvincia: string): SituacaoDaProvincia {
    return {
      passaFome: this.passaFomeEm(idProvincia),
      sitiada: this.estado.cercos[idProvincia] !== undefined,
      dominioEstrangeiro: this.dominioEstrangeiroEm(idProvincia),
      construcoes: this.estado.construcoes[idProvincia] ?? {},
      humorDoImposto: this.ajustes.economia.imposto.niveis[this.nivelDeImpostoEm(idProvincia)]
        .humor,
    };
  }

  /** Para onde o humor desta província caminha. É o que a ficha pode explicar. */
  alvoDeFelicidadeEm(idProvincia: string): number {
    return alvoDeFelicidade(
      this.situacaoDeFelicidadeEm(idProvincia),
      this.catalogoDeConstrucoes.construcoes,
      this.ajustes.felicidade,
    );
  }

  /** A conta do alvo, parcela a parcela — a mesma legibilidade da barra de comida. */
  parcelasDeFelicidadeEm(idProvincia: string): readonly ParcelaDoAlvo[] {
    return parcelasDoAlvo(
      this.situacaoDeFelicidadeEm(idProvincia),
      this.catalogoDeConstrucoes.construcoes,
      this.ajustes.felicidade,
    );
  }

  /**
   * A corrupção desta província, decomposta: tamanho, distância da capital e o total.
   *
   * A distância é medida da capital do DONO ATUAL, pelo grafo de vizinhança — conquista
   * muda a conta na hora, e mudar a capital muda a renda do reino inteiro. Sem capital
   * (transição rara) ou sem caminho por terra, vale a distância `semCaminho` do ajuste:
   * governo ausente cobra como o canto mais distante do mapa.
   */
  corrupcaoEm(idProvincia: string): Corrupcao {
    const capital = this.estado.capitais[this.donoDe(idProvincia)];
    const saltos =
      capital === undefined
        ? this.ajustes.corrupcao.distancia.semCaminho
        : (this.saltosDesdeACapital(capital).get(idProvincia) ??
          this.ajustes.corrupcao.distancia.semCaminho);
    return corrupcaoDe(this.populacaoDe(idProvincia), saltos, this.ajustes.corrupcao);
  }

  private saltosDesdeACapital(capital: string): ReadonlyMap<string, number> {
    const guardado = this.saltosPorCapital.get(capital);
    if (guardado) return guardado;
    const calculado = saltosDesde(capital, (id) => this.atlas.provincia(id).vizinhas);
    this.saltosPorCapital.set(capital, calculado);
    return calculado;
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

  /**
   * O crescimento do poder está TRAVADO pela alimentação neste turno?
   *
   * A trava preventiva: simula o crescimento de todas as províncias livres do poder e,
   * se o saldo final PROJETADO ficaria negativo, ninguém cresce — tudo-ou-nada por
   * poder, determinístico. É o que impede o paradoxo da Fazenda: crescer nunca pode ser
   * o ato que joga o reino na fome. Crescer "em ordem de id até caber" faria a ordem
   * alfabética virar regra econômica de novo, e por isso não é feito.
   */
  private crescimentoTravadoPara(idPoder: string): boolean {
    const balanco = this.balancoAlimentarDe(idPoder);
    if (balanco.saldo <= 0) return false; // sem crescimento não há o que travar
    let populacaoProjetada = 0;
    for (const id of this.territorios.provinciasDe(idPoder)) {
      const ficha = this.economia.provincias[id];
      if (!ficha || this.estado.cercos[id] !== undefined) continue;
      const proxima = calcularCrescimentoPopulacional(
        this.populacaoDe(id),
        this.estado.construcoes[id] ?? {},
        this.catalogoDeConstrucoes.construcoes,
        this.ajustes.populacao,
        1,
      ).proxima;
      populacaoProjetada += nivelPopulacional(
        proxima,
        ficha.populacao,
        this.ajustes.alimento.fracaoPopulacionalPorNivel,
      );
    }
    const saldoProjetado =
      balanco.subsistencia + balanco.producao - populacaoProjetada - balanco.exercito;
    return saldoProjetado < 0;
  }

  /** 1 quando esta província cresce neste turno; 0 sitiada, sem sobra ou travada. */
  private fatorDeCrescimentoDe(idProvincia: string): number {
    if (this.estado.cercos[idProvincia] !== undefined) return 0;
    const poder = this.donoDe(idProvincia);
    if (this.balancoAlimentarDe(poder).saldo <= 0) return 0;
    return this.crescimentoTravadoPara(poder) ? 0 : 1;
  }

  crescimentoDe(
    idProvincia: string,
  ): (CrescimentoPopulacional & { limitadoPelaAlimentacao: boolean }) | null {
    const ficha = this.economia.provincias[idProvincia];
    if (!ficha) return null;
    const fator = this.fatorDeCrescimentoDe(idProvincia);
    const crescimento = calcularCrescimentoPopulacional(
      this.populacaoDe(idProvincia),
      this.estado.construcoes[idProvincia] ?? {},
      this.catalogoDeConstrucoes.construcoes,
      this.ajustes.populacao,
      fator,
    );
    // "Limitado" é a trava agindo: haveria sobra pra crescer, mas crescer viraria fome.
    const limitado =
      fator === 0 &&
      this.estado.cercos[idProvincia] === undefined &&
      this.balancoAlimentarDe(this.donoDe(idProvincia)).saldo > 0;
    return { ...crescimento, limitadoPelaAlimentacao: limitado };
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

  /** O que já foi erguido nesta província. Vazio quando não há nada. */
  construcoesEm(idProvincia: string): readonly string[] {
    return Object.keys(this.estado.construcoes[idProvincia] ?? {}).sort();
  }

  nivelDaConstrucaoEm(idProvincia: string, idConstrucao: string): number {
    return this.estado.construcoes[idProvincia]?.[idConstrucao] ?? 0;
  }

  /** A obra em andamento nesta província, se houver. */
  obraEm(idProvincia: string): Obra | undefined {
    return this.estado.obras[idProvincia];
  }

  /**
   * O portão do RECRUTAMENTO: a campanha começou e a província é minha.
   *
   * ⚠️ **Não pergunta se ela tem economia configurada.** Já perguntava, e isso era uma
   * trava conceitual errada: recrutar depende de GENTE, não de a província ter ficha
   * econômica escrita. Província sem ficha continua não cedendo
   * ninguém — mas porque a população dela é zero, que é um requisito real, e a recusa
   * passa a dizer isso em vez de falar de dado que falta.
   *
   * Separado de `podeAgirEm` de propósito: investir e construir dependem MESMO de
   * economia, e juntar as duas perguntas numa só foi o que criou a trava.
   */
  podeMobilizarEm(idProvincia: string): Recusa {
    if (!this.iniciada) return { pode: false, motivo: 'a campanha ainda não começou' };
    const jogador = this.estado.jogador;
    if (jogador === null || this.donoDe(idProvincia) !== jogador) {
      return { pode: false, motivo: 'esta província não é sua' };
    }
    return { pode: true, bonus: 0 };
  }

  /** Recrutamento é ação básica; Quartel melhorará a qualidade da leva no futuro. */
  podeRecrutarEm(idProvincia: string): boolean {
    return this.podeMobilizarEm(idProvincia).pode && this.populacaoDe(idProvincia) > 0;
  }

  /**
   * A hoste com este id, onde quer que esteja. **É o endereço da interface.**
   *
   * ⚠️ Substituiu `exercitoEm(provincia)`, que devolvia "a primeira por id". Aquilo virou
   * mentira quando sitiar deixou de engajar o exército de dentro:
   * com sitiante e guarnição na mesma província, "a primeira" é quem foi recrutado antes,
   * e o mapa inteiro passou a falar do exército errado.
   */
  hoste(idHoste: string): Exercito | undefined {
    return this.mobilizacao.hoste(idHoste);
  }

  /**
   * Toda hoste parada nesta província, em ordem de id.
   *
   * ⚠️ **Pode haver mais de uma, e de poderes diferentes.** É o caso do cerco.
   */
  hostesEm(idProvincia: string): readonly Exercito[] {
    return this.mobilizacao.hostesEm(idProvincia);
  }

  /** Quantos homens ESTA hoste tem. */
  forcaDaHoste(idHoste: string): number {
    return this.mobilizacao.forcaDaHoste(idHoste);
  }

  /**
   * Quantos homens de um PODER estão parados nesta província.
   *
   * ⚠️ **Sem dizer o poder, pergunta pelo dono da terra.** É o que quase sempre se quer —
   * "quanta tropa Atenas tem em Atenas" — mas é armadilha no caso do cerco: `forcaEm` da
   * cidade sitiada devolve a guarnição do DEFENSOR, nunca o acampamento do sitiante.
   * Quem fala de uma hoste específica usa `forcaDaHoste(id)`.
   */
  forcaEm(idProvincia: string, idPoder: string = this.donoDe(idProvincia)): number {
    return this.mobilizacao.forcaEm(idProvincia, idPoder);
  }

  /** Toda hoste em pé no mundo, em ordem de id. É o que o mapa desenha. */
  hostes(): readonly Exercito[] {
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

  /** O que a tropa nascida nesta província custa por turno. A folha, lida terra a terra. */
  custoDaTropaDe(idProvincia: string): number {
    return this.mobilizacao.custoDaTropaDe(idProvincia);
  }

  /**
   * O saldo COMPLETO da província: renda líquida menos a tropa que ela pôs em armas.
   *
   * É o número que responde "esta terra me sustenta ou me puxa pra baixo?" — e é `null`
   * onde não há economia, pela honestidade de sempre. A soma por província pode divergir
   * do total do poder em uma moeda, por arredondamento de cada folha; a barra continua
   * usando a conta do poder, que é a que o tesouro sente.
   */
  saldoDaProvincia(idProvincia: string): number | null {
    const renda = this.economiaDe(idProvincia);
    if (!renda) return null;
    return renda.total - this.custoDaTropaDe(idProvincia);
  }

  /** Quantos habitantes esta província ainda cede a uma leva. */
  disponivelParaLevaEm(idProvincia: string): number {
    return this.mobilizacao.disponivelParaLevaEm(idProvincia);
  }

  /** Quantos homens a população e o tesouro permitem recrutar neste instante. */
  maximoParaLevaEm(idProvincia: string): number {
    // O ouro que conta é o de quem manda na província, não o do jogador: quando a IA
    // existir, ela vai perguntar isto sobre as províncias dela.
    return this.mobilizacao.maximoParaLevaEm(idProvincia, this.donoDe(idProvincia));
  }

  /**
   * Pode levantar esta leva aqui, e por quanto?
   *
   * O portão da PROVÍNCIA vem primeiro (é minha? tem economia?), e só depois as regras da
   * leva — assim a recusa diz a coisa mais externa que está errada, em vez de reclamar de
   * ouro numa província que nem é do jogador.
   */
  podeRecrutar(idProvincia: string, homens: number): RecusaDeLeva {
    const naProvincia = this.podeMobilizarEm(idProvincia);
    if (!naProvincia.pode) return { pode: false, motivo: naProvincia.motivo };
    return this.mobilizacao.avaliarLevaEm(
      idProvincia,
      this.donoDe(idProvincia),
      homens,
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
   * O mesmo, dizendo QUAL hoste. É o que a interface usa.
   *
   * `dispensar(provincia, …)` continua existindo para quem sabe que ali só há uma — e
   * estoura se houver duas, em vez de escolher uma por sorteio de id.
   */
  dispensarHoste(idHoste: string, homens: number): void {
    this.mobilizacao.dispensarDe(idHoste, homens);
    this.aoMudar();
  }

  /**
   * As rotas que a hoste parada aqui pode tomar nesta rodada, por destino.
   *
   * Vazio quando não há hoste, quando ela não é do jogador, ou quando ela está cercada de
   * terra alheia. É este mapa que a interface desenha como destinos clicáveis — e é dele
   * que sai a rota que a ordem guarda.
   */
  rotasDaHoste(idHoste: string): ReadonlyMap<string, readonly string[]> {
    const hoste = this.mobilizacao.hoste(idHoste);
    if (!hoste) return new Map();
    return rotasDe(
      this.atlas,
      hoste.posicao,
      (id) => this.donoDe(id) === hoste.poder,
      this.ajustes.combate.saltosPorRodada,
    );
  }

  /** Só os destinos, pra quem não precisa da rota. */
  alcanceDaHoste(idHoste: string): readonly string[] {
    return [...this.rotasDaHoste(idHoste).keys()];
  }

  /**
   * A ordem registrada para ESTA hoste nesta rodada, se houver.
   *
   * ⚠️ **As ordens sempre foram endereçadas por id de hoste**; a ponte que traduzia de
   * província saiu junto com `exercitoEm`. Id de província e id de hoste são os dois
   * `string`, e os dois registros são `Record<string, …>` — o compilador não distingue um
   * do outro, e uma troca errada aqui não dá erro: dá uma ordem que a resolução nunca
   * encontra e uma tropa que não sai do lugar.
   */
  ordemDaHoste(idHoste: string): OrdemDeMarcha | undefined {
    return this.estado.ordens[idHoste];
  }

  /**
   * Esta hoste pode surtir — sair para atacar quem cerca a cidade onde ela está?
   *
   * As recusas saem da mais externa para a mais interna, como no resto do jogo: reclamar
   * de "não há cerco aqui" numa hoste que nem é sua faria o jogador consertar a coisa
   * errada.
   */
  podeSurtir(idHoste: string, porPoder: string | null = this.estado.jogador): Permissao {
    if (!this.iniciada) return { pode: false, motivo: 'a campanha ainda não começou' };
    const hoste = this.mobilizacao.hoste(idHoste);
    if (!hoste) return { pode: false, motivo: 'não há hoste aqui para lutar' };
    if (hoste.poder !== porPoder) return { pode: false, motivo: 'esta hoste não é sua' };
    // ⚠️ Surtir é sair da PRÓPRIA cidade. Uma hoste de passagem por uma província alheia
    // que um terceiro sitia não tem cerco nenhum a quebrar — o problema não é dela.
    if (this.donoDe(hoste.posicao) !== hoste.poder) {
      return { pode: false, motivo: 'a surtida sai de dentro da própria cidade' };
    }
    const cerco = this.estado.cercos[hoste.posicao];
    if (!cerco || cerco.sitiante === hoste.poder) {
      return { pode: false, motivo: `${this.nomeDe(hoste.posicao)} não está sitiada` };
    }
    if (this.ordemDaHoste(idHoste) !== undefined) {
      return { pode: false, motivo: 'esta hoste já tem ordem nesta rodada' };
    }
    return { pode: true };
  }

  /**
   * Registra a surtida. **Nada se move agora**, como em toda ordem.
   *
   * Ela vale para a próxima virada e é excludente com a marcha: quem sai para lutar em
   * casa não vai a lugar nenhum no mesmo turno.
   */
  surtir(idHoste: string, porPoder: string | null = this.estado.jogador): void {
    const r = this.podeSurtir(idHoste, porPoder);
    if (!r.pode) throw new Error(r.motivo);
    if (this.estado.surtidas.includes(idHoste)) return;
    this.estado.surtidas.push(idHoste);
    this.aoMudar();
  }

  /** Esta hoste vai surtir nesta rodada? */
  surtidaDe(idHoste: string): boolean {
    return this.estado.surtidas.includes(idHoste);
  }

  /** Contra quem esta hoste surtiria, se pudesse. `undefined` quando não há cerco ali. */
  sitianteDaHosteDe(idHoste: string): string | undefined {
    const hoste = this.mobilizacao.hoste(idHoste);
    if (!hoste) return undefined;
    const cerco = this.estado.cercos[hoste.posicao];
    return cerco && cerco.sitiante !== hoste.poder ? cerco.sitiante : undefined;
  }

  /** Todas as ordens da rodada, com a hoste de cada uma. É o que o mapa desenha. */
  ordens(): readonly { idHoste: string; ordem: OrdemDeMarcha }[] {
    return Object.keys(this.estado.ordens)
      .sort()
      .flatMap((idHoste) => {
        const ordem = this.estado.ordens[idHoste];
        return ordem ? [{ idHoste, ordem }] : [];
      });
  }

  /**
   * Esta ordem pode ser registrada, e por qual rota?
   *
   * Devolve o MOTIVO da recusa, como todo o resto do jogo: a interface escreve o texto em
   * vez de esconder o controle.
   */
  podeOrdenarMarcha(
    idHoste: string,
    destino: string,
    homens: number,
    porPoder: string | null = this.estado.jogador,
  ): RecusaDeOrdem {
    if (!this.iniciada) return { pode: false, motivo: 'a campanha ainda não começou' };
    const hoste = this.mobilizacao.hoste(idHoste);
    return avaliarOrdem(hoste?.posicao ?? '', destino, this.atlas.nomeDe(destino), homens, {
      forcaNaOrigem: this.mobilizacao.forcaDaHoste(idHoste),
      minha: hoste?.poder === porPoder,
      rota: this.rotasDaHoste(idHoste).get(destino),
      // Surtir ocupa a rodada da hoste tanto quanto marchar: são a mesma decisão em dois
      // sentidos, e a recusa é a mesma frase de propósito.
      jaTemOrdem: this.ordemDaHoste(idHoste) !== undefined || this.surtidaDe(idHoste),
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
    idHoste: string,
    destino: string,
    homens: number,
    porPoder: string | null = this.estado.jogador,
    postura: Postura = 'sitiar',
  ): void {
    const r = this.podeOrdenarMarcha(idHoste, destino, homens, porPoder);
    if (!r.pode) throw new Error(r.motivo);
    const hoste = this.mobilizacao.hoste(idHoste);
    if (!hoste) throw new Error(`não há hoste ${idHoste}`);
    this.estado.ordens[idHoste] = { origem: hoste.posicao, rota: r.rota, homens, postura };
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
      this.estado.construcoes[idProvincia] ?? {},
      this.catalogoDeConstrucoes.construcoes,
      this.ajustes.combate,
    );
  }

  /** É comida? Pergunta ao catálogo de produtos, que é quem sabe. */
  private ehAlimento(produto: string): boolean {
    return this.economia.produtos[produto]?.alimento === true;
  }

  /** Produtos alimentares da terra. Cerco zera a contribuição, mas não apaga sua identidade. */
  produtosAlimentaresEm(idProvincia: string): readonly { id: string; nome: string; nivel: number }[] {
    const ficha = this.economia.provincias[idProvincia];
    if (!ficha) return [];
    return [
      { id: ficha.produto, nivel: ficha.nivel },
      { id: ficha.secundario.produto, nivel: ficha.secundario.nivel },
    ]
      .filter((produto) => this.ehAlimento(produto.id))
      .map((produto) => ({
        ...produto,
        nome: this.economia.produtos[produto.id]?.nome ?? produto.id,
      }));
  }

  contribuicaoAlimentarEm(idProvincia: string): number {
    return this.cercoEm(idProvincia) ? 0 : this.contribuicaoAlimentarLivreEm(idProvincia);
  }

  /**
   * Quantos turnos de cerco esta cidade aguenta com a despensa cheia.
   *
   * Base do ajuste MAIS a comida da própria terra: a cidade cerealista resiste mais que a
   * de mineiros, e a Fazenda passa a comprar resistência de cerco além de saldo — é a
   * despensa de Bannerlord escrita com o que o jogo já tinha.
   */
  mantimentosDeCercoEm(idProvincia: string): number {
    return this.ajustes.alimento.cerco.mantimentos + this.contribuicaoAlimentarLivreEm(idProvincia);
  }

  /**
   * O relógio da fome do cerco em curso. `null` sem cerco.
   *
   * UM contador só: enquanto a despensa aguenta, ninguém morre; quando vence, povo e
   * guarnição caem juntos, todo turno, até o cerco acabar ou a cidade cair.
   */
  fomeDoCercoEm(
    idProvincia: string,
  ): { mantimentosRestantes: number; fomeAtiva: boolean } | null {
    const cerco = this.estado.cercos[idProvincia];
    if (!cerco) return null;
    const despensa = this.mantimentosDeCercoEm(idProvincia);
    return {
      mantimentosRestantes: Math.max(0, despensa - cerco.rodadas),
      fomeAtiva: cerco.rodadas >= despensa,
    };
  }

  /**
   * O saldo local da província: o que a terra dá menos o que a gente dela come.
   *
   * É o número que dá papel a cada território — Sustentadora, Equilibrada ou Dependente —
   * e é ele que decide QUEM morre quando o saldo civil do reino não fecha.
   */
  saldoAlimentarLocalEm(idProvincia: string): number {
    return this.contribuicaoAlimentarLivreEm(idProvincia) - this.nivelPopulacionalEm(idProvincia);
  }

  /** O papel alimentar desta província dentro do reino. */
  estadoAlimentarLocalEm(idProvincia: string): EstadoAlimentarLocal {
    return estadoAlimentarLocal(this.saldoAlimentarLocalEm(idProvincia));
  }

  /**
   * O que a terra daria LIVRE: produtos e construções, ignorando o cerco.
   *
   * É a conta que separa os dois regimes da fome: se o saldo fecharia com as terras
   * sitiadas livres, o déficit é obra do inimigo sentado nelas — não do reino.
   */
  private contribuicaoAlimentarLivreEm(idProvincia: string): number {
    const natural = this.produtosAlimentaresEm(idProvincia).reduce(
      (soma, produto) => soma + produto.nivel,
      0,
    );
    let construcoes = 0;
    for (const id of this.construcoesEm(idProvincia)) {
      const nivel = this.nivelDaConstrucaoEm(idProvincia, id);
      const efeito = this.catalogoDeConstrucoes.construcoes[id]?.efeito;
      if (efeito?.tipo === 'alimento') construcoes += efeito.pontos[nivel - 1] ?? 0;
    }
    return natural + construcoes;
  }

  nivelPopulacionalEm(idProvincia: string): number {
    const ficha = this.economia.provincias[idProvincia];
    if (!ficha) return 0;
    return nivelPopulacional(
      this.populacaoDe(idProvincia),
      ficha.populacao,
      this.ajustes.alimento.fracaoPopulacionalPorNivel,
    );
  }

  /** Conta única que alimenta regra, barra e Governo. */
  balancoAlimentarDe(idPoder: string): BalancoAlimentarDoPoder {
    const provincias = this.territorios
      .provinciasDe(idPoder)
      .filter((id) => this.economia.provincias[id] !== undefined)
      .map((id) => ({
        populacaoAtual: this.populacaoDe(id),
        populacaoInicial: this.economia.provincias[id]?.populacao ?? 0,
        producaoAlimentar: this.contribuicaoAlimentarLivreEm(id),
        sitiada: this.estado.cercos[id] !== undefined,
      }));
    // As tropas presas em cidades sitiadas do próprio poder comem da despensa da cidade,
    // não da mesa do reino: ficam fora do custo.
    const soldados = this.mobilizacao.homensDe(idPoder) - this.homensSitiadosDe(idPoder);
    return balancoAlimentar(provincias, soldados, this.ajustes.alimento);
  }

  /** Homens do poder presos dentro das PRÓPRIAS cidades sitiadas: hostes e levas. */
  private homensSitiadosDe(idPoder: string): number {
    let homens = 0;
    for (const id of this.territorios.provinciasDe(idPoder)) {
      if (this.estado.cercos[id] === undefined) continue;
      for (const hoste of this.mobilizacao.hostesEm(id)) {
        if (hoste.poder === idPoder) homens += this.forcaDaHoste(hoste.id);
      }
      const formacao = this.mobilizacao.formacaoEm(id);
      if (formacao?.poder === idPoder) homens += formacao.homens;
    }
    return homens;
  }

  /** As províncias sitiadas do poder — as que estão fora da circulação do reino. */
  private sitiadasDe(idPoder: string): readonly string[] {
    return this.territorios
      .provinciasDe(idPoder)
      .filter((id) => this.economia.provincias[id] !== undefined)
      .filter((id) => this.estado.cercos[id] !== undefined);
  }

  /** Balanço do jogador. Conveniência da interface, como `tesouro`. */
  get alimentacao(): BalancoAlimentarDoPoder {
    return this.estado.jogador === null
      ? balancoAlimentar([], 0, this.ajustes.alimento)
      : this.balancoAlimentarDe(this.estado.jogador);
  }

  /** Quem passou fome na última virada. Vazio quando ninguém passou. */
  get fome(): RelatorioDaFome {
    return this.ultimaFome;
  }

  /**
   * A fome, nas duas contas do desenho: **o povo come primeiro, e a fome é local.**
   *
   * 1. **Cidade sitiada vive da própria despensa**, fora da circulação do reino. Vencidos
   *    os mantimentos, povo (−1%) e guarnição (−5%) caem juntos, todo turno.
   * 2. **Saldo civil negativo é Fome**: as províncias DEPENDENTES (as que não se
   *    sustentam sozinhas) perdem 1% — sustentadoras e equilibradas nunca morrem por
   *    causa das outras — e o exército perde 5%.
   * 3. **Saldo civil fechado com saldo final negativo** não mata civil nenhum: é o
   *    EXÉRCITO sem mantimentos, e só ele perde 5%.
   *
   * As tropas dentro de cidades sitiadas do próprio poder ficam fora da cobrança do
   * exército — já pagam o relógio da cidade, e ninguém paga a mesma fome duas vezes.
   */
  private alimentar(): void {
    const provincias: { provincia: string; mortos: number }[] = [];
    const tropas: { poder: string; homens: number }[] = [];

    for (const poder of [...this.atlas.poderes].map((p) => p.id).sort()) {
      const minhas = this.territorios
        .provinciasDe(poder)
        .filter((id) => this.economia.provincias[id] !== undefined);
      const homens = this.mobilizacao.homensDe(poder);
      if (minhas.length === 0 && homens === 0) continue;

      const sitiadas = this.sitiadasDe(poder);

      // A fome do cerco, cidade a cidade — no ritmo da despensa de cada uma.
      let mortosDeTropa = 0;
      for (const id of sitiadas) {
        const relogio = this.fomeDoCercoEm(id);
        if (!relogio || !relogio.fomeAtiva) continue; // a despensa ainda aguenta
        const mortos = mortosPelaFome(this.populacaoDe(id), this.ajustes.alimento.mortePorFome);
        if (mortos > 0) {
          this.estado.populacao[id] = Math.max(0, this.populacaoDe(id) - mortos);
          provincias.push({ provincia: id, mortos });
        }
        mortosDeTropa += this.matarTropaSitiada(poder, [id]);
      }

      // A mesa do reino, sem as sitiadas — elas não contribuem, não pesam e não comem.
      const balanco = this.balancoAlimentarDe(poder);
      const pouparSitiadas = new Set(sitiadas);

      if (balanco.saldoCivil < 0) {
        // Fome de verdade: morrem os civis das províncias que dependem do reino.
        for (const id of minhas) {
          if (this.estado.cercos[id] !== undefined) continue; // a dela é o relógio
          if (this.saldoAlimentarLocalEm(id) >= 0) continue; // quem se sustenta não morre
          const mortos = mortosPelaFome(this.populacaoDe(id), this.ajustes.alimento.mortePorFome);
          if (mortos <= 0) continue;
          this.estado.populacao[id] = Math.max(0, this.populacaoDe(id) - mortos);
          provincias.push({ provincia: id, mortos });
        }
      }

      if (balanco.saldo < 0) {
        // O exército passa aperto sempre que o saldo final não fecha — seja porque nem o
        // povo comeu (fome), seja porque só ele ficou sem (sem mantimentos). Morte não é
        // dispensa: ninguém volta para a população de origem.
        const alvo = mortosPelaFome(
          homens - this.homensSitiadosDe(poder),
          this.ajustes.alimento.mortePorFomeNaTropa,
        );
        mortosDeTropa += this.mobilizacao.matarPorFome(poder, alvo, pouparSitiadas);
      }

      if (mortosDeTropa > 0) tropas.push({ poder, homens: mortosDeTropa });
    }
    this.ultimaFome = { provincias, tropas };
  }

  /**
   * O destino das capitais depois da rodada: notícia da queda e reassentamento.
   *
   * A queda é detectada pelas CONQUISTAS da rodada — é o único caminho pelo qual uma
   * capital muda de mãos durante a virada. Depois dela: poder sem chão fica sem capital
   * (não há o que apontar); poder com chão e capital perdida reassenta pela regra
   * derivada, EXCETO o jogador, cuja escolha é travada na próxima virada. Um jogador que
   * ficou sem capital (exílio e volta) também recebe uma pela regra — a obrigação de
   * escolher vale para a perda, não para o recomeço.
   */
  private assentarCapitais(): void {
    const quedas: { poder: string; provincia: string }[] = [];
    for (const conquista of this.ultimaRodada.conquistas) {
      if (this.estado.capitais[conquista.de] === conquista.provincia) {
        quedas.push({ poder: conquista.de, provincia: conquista.provincia });
      }
    }
    this.ultimasQuedasDeCapital = quedas;

    for (const poder of [...this.atlas.poderes].map((p) => p.id).sort()) {
      if (!this.territorios.temTerritorio(poder)) {
        delete this.estado.capitais[poder];
        continue;
      }
      const capital = this.estado.capitais[poder];
      const pendente = capital === undefined || this.donoDe(capital) !== poder;
      if (!pendente) continue;
      if (poder === this.estado.jogador && capital !== undefined) continue;
      const nova = melhorCapitalEntre(this.atlas, poder, this.territorios.provinciasDe(poder));
      if (nova !== undefined) this.estado.capitais[poder] = nova;
    }
  }

  /** Os levantes da última virada. Vazio quando o povo se aguentou. */
  get revoltas(): readonly { provincia: string; poder: string; homens: number }[] {
    return this.ultimasRevoltas;
  }

  /**
   * A campanha acabou — e como?
   *
   * A régua MÍNIMA da campanha atual: derrota é deixar de existir (sem chão e sem
   * tropa); vitória é mandar em toda a Grécia central configurada. Quando o mapa autoral
   * crescer, a régua cresce junto — por isso ela é derivada dos dados, não cravada.
   */
  /** As províncias que a campanha SIMULA — a régua da vitória sai daqui. */
  get provinciasSimuladas(): readonly string[] {
    return Object.keys(this.economia.provincias).sort();
  }

  resultado(): 'vitoria' | 'derrota' | null {
    const jogador = this.estado.jogador;
    if (jogador === null) return null;
    if (!this.vivo(jogador)) return 'derrota';
    // ⚠️ Ilha sem vizinhança terrestre (Salamina) fica FORA da régua: sem sistema naval
    // nenhum exército chega lá, e exigi-la tornaria a vitória impossível por definição.
    return this.provinciasSimuladas
      .filter((id) => this.atlas.provincia(id).vizinhas.length > 0)
      .every((id) => this.donoDe(id) === jogador)
      ? 'vitoria'
      : null;
  }

  /**
   * O humor de cada província anda um passo rumo ao alvo, e o pavio das revoltas corre.
   *
   * O levante só nasce onde há CONTRA QUEM se levantar: província sob bandeira que não é
   * a de 700 a.C. Os rebeldes saem da população e nascem como hoste do dono antigo — que
   * volta ao jogo se tinha sido eliminado. Província revoltosa de dono legítimo faz greve
   * fiscal (imposto zero) e nada mais, por enquanto.
   */
  private atualizarFelicidade(): void {
    const levantes: { provincia: string; poder: string; homens: number }[] = [];
    for (const id of Object.keys(this.economia.provincias)) {
      const atual = this.estado.felicidade[id];
      if (atual === undefined) continue;
      const alvo = this.alvoDeFelicidadeEm(id);
      const novo = aproximarFelicidade(atual, alvo, this.ajustes.felicidade.passoPorTurno);
      this.estado.felicidade[id] = novo;

      if (!revoltosa(novo, this.ajustes.felicidade)) {
        delete this.estado.revoltas[id];
        continue;
      }
      if (!this.dominioEstrangeiroEm(id)) continue;

      const pavio = (this.estado.revoltas[id] ?? 0) + 1;
      if (pavio < this.ajustes.felicidade.revolta.turnos) {
        this.estado.revoltas[id] = pavio;
        continue;
      }
      // Não empilha levante sobre levante: enquanto os rebeldes anteriores estiverem de
      // pé na província, o pavio fica aceso mas nada nasce.
      const donoAntigo = this.atlas.donoInicial(id);
      if (this.mobilizacao.hostesEm(id).some((h) => h.poder === donoAntigo)) {
        this.estado.revoltas[id] = pavio;
        continue;
      }
      const homens = Math.round(
        this.populacaoDe(id) * this.ajustes.felicidade.revolta.fracaoRebelde,
      );
      const idHoste = this.mobilizacao.levantarRebeldes(id, donoAntigo, homens);
      delete this.estado.revoltas[id];
      if (idHoste !== null) {
        levantes.push({ provincia: id, poder: donoAntigo, homens: this.forcaDaHoste(idHoste) });
      }
    }
    this.ultimasRevoltas = levantes;
  }

  /** A fome do cerco mata quem está atrás da muralha: hostes do dono e a leva em formação. */
  private matarTropaSitiada(poder: string, sitiadas: readonly string[]): number {
    const taxa = this.ajustes.alimento.mortePorFomeNaTropa;
    let mortos = 0;
    for (const id of sitiadas) {
      for (const hoste of this.mobilizacao.hostesEm(id)) {
        if (hoste.poder !== poder) continue;
        mortos += this.mobilizacao.matarDaHoste(
          hoste.id,
          mortosPelaFome(this.forcaDaHoste(hoste.id), taxa),
        );
      }
      const formacao = this.mobilizacao.formacaoEm(id);
      if (formacao?.poder === poder) {
        mortos += this.mobilizacao.matarDaFormacao(id, mortosPelaFome(formacao.homens, taxa));
      }
    }
    return mortos;
  }

  /** O relatório da última virada. Vazio antes do primeiro turno. */
  get rodada(): RelatorioDaRodada {
    return this.ultimaRodada;
  }

  /**
   * Tira gente de uma província. **Existe pra DESENVOLVIMENTO**, como o `darOuro`: é o
   * jeito de pôr uma terra em crise sem esperar dez turnos de fome.
   *
   * Não é regra do jogo e nenhuma mecânica chama isto — quem mata de verdade é a fome, a
   * batalha e o assalto.
   */
  matarPopulacao(idProvincia: string, quantos: number): void {
    this.estado.populacao[idProvincia] = Math.max(0, this.populacaoDe(idProvincia) - quantos);
    this.aoMudar();
  }

  /**
   * Põe uma hoste de qualquer poder numa província. **Existe pra DESENVOLVIMENTO**, como
   * o `darOuro`: montar um inimigo no tabuleiro sem esperar a IA existir.
   *
   * Não é regra do jogo e nenhuma mecânica chama isto — não cobra ouro e não tira ninguém
   * da população.
   */
  plantarHoste(idProvincia: string, idPoder: string, homens: number): string {
    const id = this.mobilizacao.plantar(idProvincia, idPoder, homens);
    this.aoMudar();
    return id;
  }

  /**
   * Desfaz a ordem desta hoste. Nada foi gasto, então nada é devolvido.
   *
   * Cancela também a surtida: para o jogador as duas são "o que esta hoste vai fazer nesta
   * rodada", e um botão de cancelar que desfizesse só uma das duas deixaria a outra em pé
   * sem nada dizer.
   */
  cancelarOrdem(idHoste: string): void {
    const tinhaOrdem = this.estado.ordens[idHoste] !== undefined;
    const tinhaSurtida = this.surtidaDe(idHoste);
    if (!tinhaOrdem && !tinhaSurtida) return;
    delete this.estado.ordens[idHoste];
    this.estado.surtidas = this.estado.surtidas.filter((id) => id !== idHoste);
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
  /**
   * Credita a renda do turno no cofre de CADA poder, não só no do jogador.
   *
   * ⚠️ Percorre os poderes vivos em ordem de id. Sem a ordem, o resultado dependeria de
   * quem entrou primeiro no mapa — e a passagem de turno tem que ser determinística pelo
   * mesmo motivo que a resolução da rodada é.
   */
  private arrecadar(): void {
    for (const idPoder of [...this.poderesVivos()].sort()) {
      const renda = this.rendaDe(idPoder);
      // ⚠️ A renda pode ser NEGATIVA desde a manutenção de construção, e o cofre não
      // desce de zero: dívida sem credor viraria espiral sem decisão. O que acontece com
      // construção sem manutenção paga (fechar? ruir?) é a questão aberta "danos a
      // construções" do GDD — até lá, o calote é silencioso e o aviso é a renda vermelha.
      if (renda !== 0) {
        this.estado.tesouros[idPoder] = Math.max(0, this.tesouroDe(idPoder) + renda);
      }
    }
  }

  /**
   * Cobra a folha militar de TODOS os poderes, pela mesma regra.
   *
   * ⚠️ Antes só o jogador pagava, e isso teria dado à IA um exército sem custo. Quem não
   * tem caixa vê a tropa desertar, seja quem for.
   */
  private pagarTropa(): void {
    for (const idPoder of [...this.poderesVivos()].sort()) {
      this.mobilizacao.pagarManutencao(idPoder);
    }
  }

  /** Tira moedas do cofre de um poder. Nunca deixa negativo. */
  private gastar(idPoder: string, valor: number): void {
    this.estado.tesouros[idPoder] = Math.max(0, this.tesouroDe(idPoder) - valor);
  }

  /** Cresce todas as províncias configuradas, inclusive as que não pertencem ao jogador. */
  private crescerPopulacao(): void {
    // ⚠️ **O fator de cada reino é decidido UMA vez, antes de qualquer província crescer.**
    // Calculado dentro do laço, ele mudava a cada passo, e a ordem alfabética virava
    // regra econômica. A trava preventiva entra na mesma decisão: se crescer jogaria o
    // saldo final no negativo, o poder inteiro fica parado neste turno.
    const fatorPorPoder = new Map<string, number>();
    for (const id of Object.keys(this.economia.provincias)) {
      const poder = this.donoDe(id);
      if (fatorPorPoder.has(poder)) continue;
      const saldo = this.balancoAlimentarDe(poder).saldo;
      fatorPorPoder.set(poder, saldo > 0 && !this.crescimentoTravadoPara(poder) ? 1 : 0);
    }

    for (const id of Object.keys(this.economia.provincias)) {
      // Cidade sitiada não cresce: a fome do cerco já está cobrando dela, e nascer mais
      // gente atrás de uma muralha bloqueada seria o cerco alimentando o sitiado.
      if (this.estado.cercos[id] !== undefined) continue;
      const crescimento = calcularCrescimentoPopulacional(
        this.populacaoDe(id),
        this.estado.construcoes[id] ?? {},
        this.catalogoDeConstrucoes.construcoes,
        this.ajustes.populacao,
        fatorPorPoder.get(this.donoDe(id)) ?? 1,
      );
      this.estado.populacao[id] = crescimento.proxima;
    }
  }

  /** O catálogo inteiro, pra interface montar a lista de opções. */
  get construcoesDisponiveis(): Construcoes['construcoes'] {
    return this.catalogoDeConstrucoes.construcoes;
  }

  /** Catálogo curto: universais mais as explorações que combinam com esta terra. */
  construcoesDisponiveisEm(idProvincia: string): Construcoes['construcoes'] {
    return Object.fromEntries(
      Object.entries(this.catalogoDeConstrucoes.construcoes).filter(([id]) =>
        this.cumpreRequisitoDaConstrucao(idProvincia, id),
      ),
    );
  }

  private cumpreRequisitoDaConstrucao(idProvincia: string, idConstrucao: string): boolean {
    const ficha = this.economia.provincias[idProvincia];
    const requisito = this.catalogoDeConstrucoes.construcoes[idConstrucao]?.requisito;
    if (!ficha || !requisito) return ficha !== undefined;
    if (requisito.ancoradouro && !ficha.ancoradouro) return false;
    if (requisito.produtos) {
      const produtos = new Set([ficha.produto, ficha.secundario.produto]);
      if (!requisito.produtos.some((produto) => produtos.has(produto))) return false;
    }
    return true;
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
   * Devolve o MOTIVO da recusa, como toda permissão do jogo — a interface mostra o texto
   * em vez de esconder a opção, que é a regra da casa.
   */
  podeConstruir(idProvincia: string, idConstrucao: string): Recusa {
    const construcao = this.catalogoDeConstrucoes.construcoes[idConstrucao];
    if (!construcao) return { pode: false, motivo: `construção inexistente: ${idConstrucao}` };
    const naProvincia = this.podeAgirEm(idProvincia);
    if (!naProvincia.pode) return naProvincia;
    if (!this.cumpreRequisitoDaConstrucao(idProvincia, idConstrucao)) {
      return { pode: false, motivo: 'esta terra não cumpre os requisitos' };
    }
    const nivelAtual = this.nivelDaConstrucaoEm(idProvincia, idConstrucao);
    if (nivelAtual >= this.ajustes.construcoes.nivelMaximo) {
      return { pode: false, motivo: 'nível máximo' };
    }
    if (
      nivelAtual === 0 &&
      this.construcoesEm(idProvincia).length >= this.ajustes.construcoes.slotsPorProvincia
    ) {
      return {
        pode: false,
        motivo: `todos os ${this.ajustes.construcoes.slotsPorProvincia} slots estão ocupados`,
      };
    }
    const obra = this.obraEm(idProvincia);
    if (obra) {
      const nome = this.catalogoDeConstrucoes.construcoes[obra.construcao]?.nome ?? obra.construcao;
      return { pode: false, motivo: `${nome} em obra aqui (${obra.turnosRestantes} turnos)` };
    }
    // Quem paga a obra é o DONO da província, não o jogador. Hoje dá no mesmo porque só o
    // jogador constrói; quando a IA construir, o cofre certo já é o que está aqui.
    const caixa = this.tesouroDe(this.donoDe(idProvincia));
    const custo = construcao.custos[nivelAtual] ?? construcao.custos[2];
    if (custo > caixa) {
      return {
        pode: false,
        motivo: `faltam ${(custo - caixa).toLocaleString('pt-BR')} moedas`,
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
    const nivelAlvo = this.nivelDaConstrucaoEm(idProvincia, idConstrucao) + 1;
    const custo = construcao.custos[nivelAlvo - 1] ?? construcao.custos[2];
    const turnos = construcao.turnos[nivelAlvo - 1] ?? construcao.turnos[2];
    // Paga à vista, entrega depois. Não existe cancelar: devolver o dinheiro faria da
    // obra um cofre com juros, onde estacionar tesouro sem risco nenhum.
    this.gastar(this.donoDe(idProvincia), custo);
    this.estado.obras[idProvincia] = {
      construcao: idConstrucao,
      nivelAlvo,
      turnosRestantes: turnos,
    };
    this.aoMudar();
  }

  /** O estado inteiro como texto, pronto pro disco. Efêmeros ficam de fora. */
  serializar(): string {
    return serializarCampanha(this.estado);
  }

  /**
   * Substitui o estado pelo de um salvamento, depois de conferi-lo contra o mundo.
   *
   * ⚠️ **Substitui o CONTEÚDO das tabelas, nunca os objetos que outros seguram.**
   * `Territorios` guarda a referência viva de `estado.dono`, e `Mobilizacao` guarda o
   * próprio objeto de estado — trocar o objeto deixaria os dois lendo um mundo que não
   * existe mais. É por isso que `dono` é esvaziado e repovoado em vez de reatribuído, e o
   * índice reverso é remontado com `reindexar()`, que existe exatamente para isto.
   *
   * Falha ALTO em salvamento que não bate com o mundo atual — tabela de donos incompleta,
   * construção que saiu do catálogo, província que um reassado apagou. Misturar dois
   * recortes em silêncio seria pior que recusar o salvamento.
   */
  restaurar(salvo: EstadoCampanha): void {
    this.validarSalvamento(salvo);

    this.estado.jogador = salvo.jogador;
    this.estado.ano = salvo.ano;
    this.estado.turno = salvo.turno;
    this.estado.tesouros = { ...salvo.tesouros };
    for (const id of Object.keys(this.estado.dono)) delete this.estado.dono[id];
    Object.assign(this.estado.dono, salvo.dono);
    this.territorios.reindexar();
    this.estado.populacao = { ...salvo.populacao };
    this.estado.nacionalidades = Object.fromEntries(
      Object.entries(salvo.nacionalidades).map(([id, povos]) => [id, { ...povos }]),
    );
    this.estado.felicidade = { ...salvo.felicidade };
    this.estado.hostes = Object.fromEntries(
      Object.entries(salvo.hostes).map(([id, h]) => [id, { ...h, origem: { ...h.origem } }]),
    );
    this.estado.proximaHoste = salvo.proximaHoste;
    this.estado.formacoes = Object.fromEntries(
      Object.entries(salvo.formacoes).map(([id, f]) => [id, { ...f }]),
    );
    this.estado.ordens = Object.fromEntries(
      Object.entries(salvo.ordens).map(([id, o]) => [id, { ...o, rota: [...o.rota] }]),
    );
    this.estado.surtidas = [...salvo.surtidas];
    this.estado.cercos = Object.fromEntries(
      Object.entries(salvo.cercos).map(([id, c]) => [id, { ...c }]),
    );
    this.estado.capitais = { ...salvo.capitais };
    this.estado.nivelDeImposto = { ...salvo.nivelDeImposto };
    this.estado.construcoes = Object.fromEntries(
      Object.entries(salvo.construcoes).map(([id, c]) => [id, { ...c }]),
    );
    this.estado.obras = Object.fromEntries(
      Object.entries(salvo.obras).map(([id, o]) => [id, { ...o }]),
    );
    this.estado.revoltas = { ...salvo.revoltas };

    // Efêmeros não viajam: a notícia da rodada salva pertence à sessão que a viveu.
    this.ultimaRodada = {
      marchas: [],
      batalhas: [],
      conquistas: [],
      milicianosMortos: [],
      cercos: [],
      cercosLevantados: [],
    };
    this.ultimaFome = { provincias: [], tropas: [] };
    this.ultimasQuedasDeCapital = [];
    this.ultimasRevoltas = [];
    this.aoMudar();
  }

  /** O conteúdo contra o mundo: o que o Zod da forma não tem como saber. */
  private validarSalvamento(salvo: EstadoCampanha): void {
    const falhar = (motivo: string): never => {
      throw new Error(`salvamento inválido: ${motivo}`);
    };

    // A tabela de donos tem que ser CHEIA e exata — é a regra escrita no estado.
    for (const p of this.atlas.provincias) {
      const dono = salvo.dono[p.id];
      if (dono === undefined) falhar(`província sem dono: ${p.id}`);
      else if (!this.atlas.existePoder(dono)) falhar(`dono inexistente: ${dono} em ${p.id}`);
    }
    if (Object.keys(salvo.dono).length !== this.atlas.provincias.length) {
      falhar('a tabela de donos tem províncias que o atlas não conhece');
    }

    if (salvo.jogador !== null && !this.atlas.existePoder(salvo.jogador)) {
      falhar(`jogador inexistente: ${salvo.jogador}`);
    }
    for (const poder of Object.keys(salvo.tesouros)) {
      if (!this.atlas.existePoder(poder)) falhar(`tesouro de poder inexistente: ${poder}`);
    }
    for (const id of Object.keys(salvo.populacao)) {
      if (!this.economia.provincias[id]) falhar(`população em província não simulada: ${id}`);
    }
    for (const [id, hoste] of Object.entries(salvo.hostes)) {
      if (!this.atlas.existe(hoste.posicao)) falhar(`hoste ${id} em província inexistente`);
      if (!this.atlas.existePoder(hoste.poder)) falhar(`hoste ${id} de poder inexistente`);
      const numero = Number(id.replace(/^h/, ''));
      if (!Number.isInteger(numero) || numero >= salvo.proximaHoste) {
        falhar(`hoste ${id} à frente do contador ${salvo.proximaHoste}`);
      }
      for (const origem of Object.keys(hoste.origem)) {
        if (!this.atlas.existe(origem)) falhar(`hoste ${id} com origem inexistente: ${origem}`);
      }
    }
    for (const [id, formacao] of Object.entries(salvo.formacoes)) {
      if (!this.atlas.existe(id)) falhar(`formação em província inexistente: ${id}`);
      if (!this.atlas.existePoder(formacao.poder)) falhar(`formação de poder inexistente`);
    }
    for (const [idHoste, ordem] of Object.entries(salvo.ordens)) {
      if (!salvo.hostes[idHoste]) falhar(`ordem para hoste inexistente: ${idHoste}`);
      for (const passo of ordem.rota) {
        if (!this.atlas.existe(passo)) falhar(`ordem por província inexistente: ${passo}`);
      }
    }
    for (const idHoste of salvo.surtidas) {
      if (!salvo.hostes[idHoste]) falhar(`surtida de hoste inexistente: ${idHoste}`);
    }
    for (const [id, cerco] of Object.entries(salvo.cercos)) {
      if (!this.atlas.existe(id)) falhar(`cerco em província inexistente: ${id}`);
      if (!this.atlas.existePoder(cerco.sitiante)) falhar(`sitiante inexistente em ${id}`);
    }
    for (const [poder, capital] of Object.entries(salvo.capitais)) {
      if (!this.atlas.existePoder(poder)) falhar(`capital de poder inexistente: ${poder}`);
      if (!this.atlas.existe(capital)) falhar(`capital em província inexistente: ${capital}`);
    }
    for (const id of Object.keys(salvo.nivelDeImposto)) {
      if (!this.economia.provincias[id]) falhar(`imposto em província não simulada: ${id}`);
    }
    for (const [id, construcoes] of Object.entries(salvo.construcoes)) {
      if (!this.atlas.existe(id)) falhar(`construções em província inexistente: ${id}`);
      for (const construcao of Object.keys(construcoes)) {
        if (!this.catalogoDeConstrucoes.construcoes[construcao]) {
          falhar(`construção fora do catálogo: ${construcao} em ${id}`);
        }
      }
    }
    for (const id of Object.keys(salvo.revoltas)) {
      if (!this.economia.provincias[id]) falhar(`revolta em província não simulada: ${id}`);
    }
    for (const [id, obra] of Object.entries(salvo.obras)) {
      if (!this.atlas.existe(id)) falhar(`obra em província inexistente: ${id}`);
      if (!this.catalogoDeConstrucoes.construcoes[obra.construcao]) {
        falhar(`obra de construção fora do catálogo: ${obra.construcao}`);
      }
      if (obra.nivelAlvo > this.ajustes.construcoes.nivelMaximo) {
        falhar(`obra acima do nível máximo em ${id}`);
      }
    }
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

  /**
   * Põe ouro no tesouro. **Existe pra DESENVOLVIMENTO**, como o `calibrarFronteira` da
   * camada de mapa: montar um cenário de teste sem jogar quinze turnos à mão.
   *
   * Não é regra do jogo e nenhuma mecânica chama isto. O gancho que a expõe vive atrás
   * de `import.meta.env.DEV` e não existe no jogo empacotado.
   */
  darOuro(valor: number, idPoder: string | null = this.estado.jogador): void {
    if (idPoder === null) return;
    this.estado.tesouros[idPoder] = this.tesouroDe(idPoder) + valor;
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
    // A capital caída trava a virada do JOGADOR: o GDD manda escolher outra antes de
    // continuar, e deixar o mundo andar com a pergunta aberta faria dela um detalhe.
    // ⚠️ Só trava quem TEM onde escolher: o exilado, sem chão nenhum, precisa que o mundo
    // ande — é marchando e assaltando que ele volta a ter uma capital pra assentar.
    const jogador = this.estado.jogador;
    if (
      jogador !== null &&
      this.capitalPerdida(jogador) &&
      this.territorios.temTerritorio(jogador)
    ) {
      throw new Error('a capital caiu: assente outra antes de passar o turno');
    }
    this.arrecadar();
    this.pagarTropa();
    // O saldo pertence ao mundo como o jogador o deixou; quem conquista passa a contar
    // para o novo reino somente no turno seguinte, assim como a renda.
    this.alimentar();

    // ⚠️ **Arrecada ANTES de resolver as marchas.** A renda do turno pertence ao mundo
    // como ele estava quando o jogador decidiu; quem conquista na resolução colhe no turno
    // seguinte. Resolver primeiro daria ao agressor um pagamento no mesmo instante da
    // tomada, e a ordem aqui não dá erro nenhum — dá número torto em silêncio.
    this.ultimaRodada = resolverRodada(this.estado, this.ajustes.combate, {
      donoDe: (id) => this.donoDe(id),
      miliciaDe: (id) => this.miliciaEm(id),
      impedeAssaltoImediato: (id) => this.impedeAssaltoImediatoEm(id),
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
        delete this.estado.nivelDeImposto[id];
        delete this.estado.obras[id];
        // O choque da conquista: a cidade tomada odeia o novo dono no dia da queda. É o
        // único movimento de humor que não é gradual, e mora aqui — no caminho da
        // CONQUISTA — em vez de na primitiva `trocarDono`, que não conhece regra nenhuma.
        const humor = this.estado.felicidade[id];
        if (humor !== undefined) {
          this.estado.felicidade[id] = Math.max(
            0,
            humor - this.ajustes.felicidade.choqueDaConquista,
          );
        }
      },
    });

    // As capitais respondem à rodada resolvida: a queda vira notícia, e quem não é o
    // jogador reassenta a sua pela regra derivada. A do jogador fica caída — e é ela que
    // vai travar a PRÓXIMA virada até ele escolher.
    this.assentarCapitais();

    // O humor reage ao mundo resolvido — cercos novos, conquistas, a mesa do reino — e o
    // pavio dos levantes corre. Antes do crescimento: quem se revoltou hoje não cresce.
    this.atualizarFelicidade();

    // Cresce com a população restante depois da folha militar. Obras avançam mais abaixo,
    // então qualquer efeito concluído agora começa a valer no próximo turno.
    this.crescerPopulacao();

    // As obras andam DEPOIS da arrecadação: quem paga no turno 1 uma obra de três turnos
    // passa três arrecadações sem o benefício, e recebe na quarta. Adiantar isso daria um
    // turno de graça sem ninguém perceber.
    for (const [id, obra] of Object.entries(this.estado.obras)) {
      obra.turnosRestantes -= 1;
      if (obra.turnosRestantes > 0) continue;
      this.estado.construcoes[id] = {
        ...(this.estado.construcoes[id] ?? {}),
        [obra.construcao]: obra.nivelAlvo,
      };
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
