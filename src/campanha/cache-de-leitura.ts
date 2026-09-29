/**
 * A memória de LEITURA do mundo: o que já foi perguntado desde a última vez que algo mudou.
 *
 * ⚠️ **Existe porque a mesma pergunta era refeita dezenas de milhares de vezes por virada.** Na
 * fase da IA, `economiaDe` rodava ~72 mil vezes para 219 províncias, `ligadasACapital` ~52 mil
 * para 31 poderes e `bloqueadaEm` ~47 mil para 17 terras — e a virada levava mais de um segundo.
 * Cada IA olha o mundo várias vezes antes de agir, e o mundo só muda quando alguém age.
 *
 * ## A regra que faz isto ser seguro
 *
 * > **A memória só vale ENTRE comandos, nunca dentro de um.**
 *
 * Todo comando da fachada (`Campanha`) roda em `suspender`…`retomar`: enquanto ele mexe no mundo,
 * `lembrar` calcula de novo a cada pergunta, exatamente como antes da memória existir. Ao
 * terminar, `retomar` esquece tudo — o mundo pode ter mudado de qualquer jeito. Só as perguntas
 * feitas de fora (a IA decidindo, a tela desenhando) enxergam a memória, e nelas nada muda entre
 * uma pergunta e a seguinte. É o mesmo desenho do `saltosPorCapital`, que só pode ser eterno
 * porque a geografia não muda: aqui a validade é "até o próximo comando".
 *
 * ⚠️ **Quem guarda aqui devolve o MESMO objeto a todo mundo.** O que entra tem de ser tratado como
 * somente leitura por quem recebe; uma função que devolve algo que o chamador costuma alterar não
 * pode ser lembrada.
 */
export class CacheDeLeitura {
  private profundidade = 0;
  private readonly tabelas = new Map<string, Map<string, unknown>>();

  /**
   * Devolve o que já foi calculado para esta pergunta, ou calcula e guarda.
   *
   * `tabela` separa as perguntas (uma por função) e `chave` as distingue dentro dela — um id de
   * província, de poder, ou os dois juntos.
   */
  lembrar<T>(tabela: string, chave: string, calcular: () => T): T {
    if (this.profundidade > 0) return calcular();
    let doAssunto = this.tabelas.get(tabela);
    if (doAssunto === undefined) {
      doAssunto = new Map();
      this.tabelas.set(tabela, doAssunto);
    }
    if (doAssunto.has(chave)) return doAssunto.get(chave) as T;
    const valor = calcular();
    doAssunto.set(chave, valor);
    return valor;
  }

  /** Um comando começou a mexer no mundo: a partir daqui ninguém lembra de nada. */
  suspender(): void {
    this.profundidade += 1;
    this.tabelas.clear();
  }

  /** O comando terminou. O mundo mudou: o que se sabia ficou velho. */
  retomar(): void {
    this.profundidade = Math.max(0, this.profundidade - 1);
    this.tabelas.clear();
  }

  /**
   * Roda uma leitura com a memória LIGADA no meio de um comando — a tela que se redesenha
   * porque o comando avisou que terminou de mexer.
   *
   * ⚠️ Só serve a quem apenas LÊ. O comando já acabou de mudar o mundo quando chama `aoMudar`, e
   * é justamente por isso que aquele redesenho pode usar a memória.
   */
  lendo<T>(leitura: () => T): T {
    const guardada = this.profundidade;
    this.profundidade = 0;
    this.tabelas.clear();
    try {
      return leitura();
    } finally {
      this.profundidade = guardada;
      this.tabelas.clear();
    }
  }
}
