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
import { avancarAno } from './estado-campanha';
import type { EstadoCampanha, Obra } from './estado-campanha';
import {
  bonusDoInvestimento,
  rendaDaProvincia,
  retornoDaConstrucao,
  retornoDoInvestimento,
} from './economia';
import type { RendaDaProvincia, RetornoDaConstrucao, RetornoDoInvestimento } from './economia';

type AjustesJogo = Ajustes['jogo'];
type Poder = Provincias['poderes'][number];

/** Por que um investimento foi recusado. A interface mostra o motivo em vez de sumir. */
export type Recusa =
  | { pode: true; bonus: number }
  | { pode: false; motivo: string };

export class Campanha {
  private readonly estado: EstadoCampanha;
  private readonly provinciasPorPoder = new Map<string, string[]>();
  private readonly poderes = new Map<string, Poder>();
  private readonly nomeDaProvincia = new Map<string, string>();

  /** Chamado depois de qualquer mudança de estado. Quem desenha se redesenha inteiro. */
  aoMudar: () => void = () => {};

  constructor(
    dados: Provincias,
    private readonly economia: Economia,
    private readonly catalogoDeConstrucoes: Construcoes,
    private readonly ajustes: AjustesJogo,
  ) {
    for (const poder of dados.poderes) {
      this.poderes.set(poder.id, poder);
      this.provinciasPorPoder.set(poder.id, []);
    }
    for (const p of dados.provincias) {
      const lista = this.provinciasPorPoder.get(p.dono);
      if (!lista) throw new Error(`província "${p.nome}" tem dono inexistente: ${p.dono}`);
      lista.push(p.id);
      this.nomeDaProvincia.set(p.id, p.nome);
    }
    for (const id of Object.keys(economia.provincias)) {
      if (!this.nomeDaProvincia.has(id)) {
        throw new Error(`economia.json descreve província inexistente: ${id}`);
      }
    }

    this.estado = {
      jogador: null,
      ano: ajustes.anoInicial,
      turno: 0,
      tesouro: ajustes.tesouroInicial,
      investimentos: {},
      construcoes: {},
      obras: {},
    };
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
    const poder = this.poderes.get(idPoder);
    if (!poder) throw new Error(`poder inexistente: ${idPoder}`);
    return poder;
  }

  /** Nome de exibição de uma província. Lança se ela não existe. */
  nomeDe(idProvincia: string): string {
    const nome = this.nomeDaProvincia.get(idProvincia);
    if (nome === undefined) throw new Error(`província inexistente: ${idProvincia}`);
    return nome;
  }

  provinciasDe(idPoder: string): readonly string[] {
    const lista = this.provinciasPorPoder.get(idPoder);
    if (!lista) throw new Error(`poder inexistente: ${idPoder}`);
    return lista;
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
        construcoes: this.construcoesEm(idProvincia),
        investimento: this.estado.investimentos[idProvincia],
      },
    );
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
      this.construcoesEm(idProvincia),
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
      this.construcoesEm(idProvincia),
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
    if (jogador === null || !this.provinciasDe(jogador).includes(idProvincia)) {
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
