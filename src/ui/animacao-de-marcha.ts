/**
 * A marcha animada: onde a peça está ENQUANTO anda.
 *
 * As regras resolvem a rodada de uma vez — a hoste já está no destino no instante em que o
 * turno vira. Sem isto, o marcador simplesmente desaparecia de uma província e reaparecia
 * na outra, e a ordem que o jogador deu na rodada anterior acontecia sem ele ver.
 *
 * ⚠️ **Isto é ilustração, não regra.** Nada aqui decide nada: a campanha já decidiu quem
 * foi aonde, e este módulo só atrasa a peça no caminho. Se a animação for pulada — janela
 * em segundo plano, `prefers-reduced-motion`, um turno passado por script — o estado do
 * jogo é exatamente o mesmo. É por isso que ela vive em `ui/` e não em `movimento/`.
 *
 * **Anda em unidades de MUNDO, não da tela.** Quem projeta é `posicionar`, uma vez por
 * quadro, como já fazia com a peça parada. Assim arrastar o mapa ou dar zoom no meio da
 * marcha continua funcionando, e a peça não descola do terreno.
 *
 * **Cada hoste tem seu próprio prazo**, proporcional aos trechos que andou: uma marcha de
 * dois saltos leva o dobro de uma de um salto, e as duas partem juntas. Fazer todas
 * terminarem juntas esconderia justamente a informação que a distância carrega.
 */

export interface Ponto {
  x: number;
  y: number;
}

export interface TrechoDeMarcha {
  /**
   * A HOSTE que anda — é a chave do marcador, e ela já chegou nas regras.
   *
   * Não é "para onde ela vai": quando esta animação começa, ela já está lá. O que anda é
   * o desenho.
   *
   * ⚠️ Era a província de chegada. Deixou de identificar a peça quando duas hostes
   * passaram a poder parar no mesmo lugar — sitiante e guarnição no mesmo chão andariam
   * as duas pela trilha de uma só.
   */
  hoste: string;
  /** O caminho percorrido em unidades de mundo: origem, paradas do meio, destino. */
  pontos: readonly Ponto[];
}

/** Um trecho com o que só precisa ser calculado uma vez. */
interface EmMarcha {
  hoste: string;
  pontos: readonly Ponto[];
  /** Distância acumulada até cada ponto. O primeiro é sempre 0. */
  acumulada: readonly number[];
  comprimento: number;
  /** Segundos que esta hoste leva para andar tudo. */
  duracao: number;
  decorrido: number;
}

export class AnimacaoDeMarcha {
  private andando: EmMarcha[] = [];

  /**
   * Avisa quais hostes acabaram de chegar, para o pulso de chegada.
   *
   * Dispara por hoste, quando cada uma termina — e não uma vez no fim de todas. Uma
   * marcha curta que chega antes tem que pulsar antes.
   */
  aoChegar: (hostes: readonly string[]) => void = () => {};

  /**
   * Põe as marchas desta rodada em movimento, descartando o que ainda estivesse andando.
   *
   * Descartar é o certo: se o jogador passou dois turnos depressa, a marcha antiga
   * descreve um mundo que não existe mais.
   */
  comecar(trechos: readonly TrechoDeMarcha[], segundosPorSalto: number): void {
    this.andando = trechos.flatMap((trecho) => {
      const saltos = trecho.pontos.length - 1;
      if (saltos < 1) return [];
      const acumulada = [0];
      for (let i = 1; i < trecho.pontos.length; i++) {
        const de = trecho.pontos[i - 1];
        const para = trecho.pontos[i];
        if (!de || !para) continue;
        acumulada.push((acumulada[i - 1] ?? 0) + Math.hypot(para.x - de.x, para.y - de.y));
      }
      const comprimento = acumulada[acumulada.length - 1] ?? 0;
      // Província vizinha com o mesmo centro é impossível, mas custa uma linha não
      // depender disso: sem comprimento não há caminho a andar.
      if (comprimento <= 0) return [];
      return [
        {
          hoste: trecho.hoste,
          pontos: trecho.pontos,
          acumulada,
          comprimento,
          duracao: segundosPorSalto * saltos,
          decorrido: 0,
        },
      ];
    });
  }

  /** Descarta o que estiver andando, sem avisar chegada. Para trocas de fase e de partida. */
  parar(): void {
    this.andando = [];
  }

  /** Corre o relógio. `delta` em segundos, o mesmo do laço de quadro. */
  avancar(delta: number): void {
    if (this.andando.length === 0) return;
    const chegaram: string[] = [];
    for (const marcha of this.andando) {
      marcha.decorrido += delta;
      if (marcha.decorrido >= marcha.duracao) chegaram.push(marcha.hoste);
    }
    if (chegaram.length === 0) return;
    this.andando = this.andando.filter((m) => m.decorrido < m.duracao);
    this.aoChegar(chegaram);
  }

  /**
   * Onde a peça desta hoste está agora, ou `null` se ela não está marchando.
   *
   * `null` é a resposta normal: quase toda hoste está parada quase todo quadro, e quem
   * pergunta usa o centro da província.
   */
  posicaoDe(idHoste: string): Ponto | null {
    const marcha = this.andando.find((m) => m.hoste === idHoste);
    if (!marcha) return null;

    const bruta = Math.min(1, marcha.decorrido / marcha.duracao);
    // Suavizar as pontas: a tropa parte e assenta em vez de arrancar e travar. É a única
    // liberdade estética daqui — o percurso e o prazo são os do jogo.
    const fracao = bruta * bruta * (3 - 2 * bruta);
    const alvo = fracao * marcha.comprimento;

    for (let i = 1; i < marcha.pontos.length; i++) {
      const ate = marcha.acumulada[i] ?? 0;
      if (alvo > ate) continue;
      const desde = marcha.acumulada[i - 1] ?? 0;
      const de = marcha.pontos[i - 1];
      const para = marcha.pontos[i];
      if (!de || !para) break;
      const trecho = ate - desde;
      const t = trecho > 0 ? (alvo - desde) / trecho : 1;
      return { x: de.x + (para.x - de.x) * t, y: de.y + (para.y - de.y) * t };
    }
    return marcha.pontos[marcha.pontos.length - 1] ?? null;
  }

  /** Está marchando alguém? */
  get emCurso(): boolean {
    return this.andando.length > 0;
  }
}
