/**
 * As hostes em pé: reunir, dispensar, manter e desertar.
 *
 * Liga as contas puras de `recrutamento.ts` ao estado mutável. Existe separado da
 * `Campanha` porque ela estava virando o arquivo que sabe tudo — e movimento e batalha
 * vão ter os seus próprios. **Nada de guerra cresce aqui.**
 *
 * O recorte de estado que ele recebe é deliberadamente estreito: tesouro, população e
 * exércitos. É o que a mobilização pode mexer, e nada além — a assinatura do construtor é
 * a fronteira escrita.
 */

import type { Ajustes } from '@/dados/esquema';
import { exercitoVazio, forcaDe, retirar, somarLeva } from './exercito';
import type { Exercito } from './exercito';
import { avaliarLeva, disponivelParaLeva, manutencaoDe } from './recrutamento';
import type { RecusaDeLeva } from './recrutamento';

type AjustesCombate = Ajustes['jogo']['combate'];

/** Uma hoste e a província onde ela está. */
export interface HosteEmProvincia {
  provincia: string;
  exercito: Exercito;
}

/** O recorte do estado que a mobilização pode alterar. Nada além disto. */
export interface EstadoDeMobilizacao {
  tesouro: number;
  populacao: Record<string, number>;
  exercitos: Record<string, Exercito>;
}

export class Mobilizacao {
  constructor(
    private readonly estado: EstadoDeMobilizacao,
    private readonly ajustes: AjustesCombate,
  ) {}

  exercitoEm(idProvincia: string): Exercito | undefined {
    return this.estado.exercitos[idProvincia];
  }

  forcaEm(idProvincia: string): number {
    return forcaDe(this.exercitoEm(idProvincia));
  }

  /** Toda hoste em pé no mundo, com o lugar dela. É o que o mapa desenha. */
  todas(): readonly HosteEmProvincia[] {
    return Object.entries(this.estado.exercitos).map(([provincia, exercito]) => ({
      provincia,
      exercito,
    }));
  }

  /** As hostes deste poder, onde quer que estejam — inclusive em terra alheia. */
  doPoder(idPoder: string): readonly HosteEmProvincia[] {
    return this.todas().filter((h) => h.exercito.poder === idPoder);
  }

  /**
   * Este poder ainda tem alguém em armas?
   *
   * É a metade da pergunta "está vivo?" que o território não responde: um poder que perdeu
   * o último chão mas mantém uma hoste continua no jogo, no exílio.
   */
  temTropa(idPoder: string): boolean {
    return this.doPoder(idPoder).length > 0;
  }

  /** Quantos homens nascidos nesta província estão em armas em todo o mapa. */
  homensEmArmasDe(idProvincia: string): number {
    let total = 0;
    for (const exercito of Object.values(this.estado.exercitos)) {
      total += exercito.origem[idProvincia] ?? 0;
    }
    return total;
  }

  /** Quantos habitantes esta província ainda cede a uma leva. */
  disponivelParaLevaEm(idProvincia: string): number {
    return disponivelParaLeva(this.populacaoDe(idProvincia));
  }

  avaliarLevaEm(idProvincia: string, homens: number, temQuartel: boolean): RecusaDeLeva {
    return avaliarLeva(
      homens,
      {
        populacao: this.populacaoDe(idProvincia),
        tesouro: this.estado.tesouro,
        temQuartel,
      },
      this.ajustes,
    );
  }

  /** Aplica uma leva que a campanha já autorizou: cobra o ouro e tira os homens da terra. */
  recrutar(idProvincia: string, poder: string, leva: { ouro: number; homens: number }): void {
    const existente = this.estado.exercitos[idProvincia];
    // Guarda contra o dia em que houver tropa alheia parada aqui: recrutar não pode
    // engordar o exército de outro poder por acidente de chave.
    if (existente && existente.poder !== poder) {
      throw new Error(`há tropa de ${existente.poder} em ${idProvincia}`);
    }

    this.estado.tesouro -= leva.ouro;
    this.estado.populacao[idProvincia] = this.populacaoDe(idProvincia) - leva.homens;

    const exercito = existente ?? exercitoVazio(poder);
    somarLeva(exercito, idProvincia, leva.homens);
    this.estado.exercitos[idProvincia] = exercito;
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
    if (!Number.isInteger(homens) || homens <= 0) {
      throw new Error('o número de homens dispensados precisa ser um inteiro positivo');
    }
    const exercito = this.estado.exercitos[idProvincia];
    if (!exercito) throw new Error(`não há exército em ${idProvincia}`);
    this.devolver(exercito, idProvincia, homens);
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
    const hoste = this.estado.exercitos[origem];
    if (!hoste) throw new Error(`não há exército em ${origem}`);
    if (origem === destino) return;

    const naChegada = this.estado.exercitos[destino];
    if (naChegada && naChegada.poder !== hoste.poder) {
      // Entrar onde há tropa alheia é batalha, e batalha ainda não existe. Estourar alto
      // é melhor que fundir exércitos inimigos num só e produzir um estado impossível.
      throw new Error(`há tropa de ${naChegada.poder} em ${destino}`);
    }

    if (!naChegada) {
      this.estado.exercitos[destino] = hoste;
    } else {
      for (const [terra, homens] of Object.entries(hoste.origem)) {
        naChegada.origem[terra] = (naChegada.origem[terra] ?? 0) + homens;
      }
    }
    delete this.estado.exercitos[origem];
  }

  manutencaoDe(idPoder: string): number {
    let homens = 0;
    for (const h of this.doPoder(idPoder)) homens += forcaDe(h.exercito);
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

    if (devido <= this.estado.tesouro) {
      this.estado.tesouro -= devido;
      return 0;
    }

    const pago = Math.max(0, this.estado.tesouro);
    this.estado.tesouro -= pago;
    const fracaoNaoPaga = (devido - pago) / devido;
    let desertaram = 0;

    for (const { provincia, exercito } of this.doPoder(idPoder)) {
      const desertores = Math.ceil(forcaDe(exercito) * fracaoNaoPaga);
      if (desertores <= 0) continue;
      desertaram += desertores;
      this.devolver(exercito, provincia, desertores);
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
  private devolver(exercito: Exercito, idProvincia: string, homens: number): void {
    const devolvidos = retirar(exercito, homens);
    for (const [origem, quantos] of Object.entries(devolvidos)) {
      this.estado.populacao[origem] = (this.estado.populacao[origem] ?? 0) + quantos;
    }
    if (forcaDe(exercito) === 0) delete this.estado.exercitos[idProvincia];
  }
}
