/**
 * Fila de prioridade mínima — o coração do Priority Flood.
 *
 * Um monte binário sobre dois vetores paralelos: índice da célula e valor de altitude. Sem
 * ela, preencher depressões numéricas numa malha de um milhão de células seria quadrático.
 */

export class FilaPrioridade {
  private readonly indices: number[] = [];
  private readonly valores: number[] = [];

  get vazia(): boolean {
    return this.indices.length === 0;
  }

  inserir(indice: number, valor: number): void {
    let posicao = this.indices.length;
    this.indices.push(indice);
    this.valores.push(valor);
    while (posicao > 0) {
      const pai = (posicao - 1) >> 1;
      if (this.valores[pai]! <= valor) break;
      this.indices[posicao] = this.indices[pai]!;
      this.valores[posicao] = this.valores[pai]!;
      posicao = pai;
    }
    this.indices[posicao] = indice;
    this.valores[posicao] = valor;
  }

  retirar(): [number, number] {
    const indice = this.indices[0]!;
    const valor = this.valores[0]!;
    const ultimoIndice = this.indices.pop()!;
    const ultimoValor = this.valores.pop()!;
    if (this.indices.length === 0) return [indice, valor];

    let posicao = 0;
    while (true) {
      const esquerda = posicao * 2 + 1;
      if (esquerda >= this.indices.length) break;
      const direita = esquerda + 1;
      const filho =
        direita < this.indices.length && this.valores[direita]! < this.valores[esquerda]!
          ? direita
          : esquerda;
      if (this.valores[filho]! >= ultimoValor) break;
      this.indices[posicao] = this.indices[filho]!;
      this.valores[posicao] = this.valores[filho]!;
      posicao = filho;
    }
    this.indices[posicao] = ultimoIndice;
    this.valores[posicao] = ultimoValor;
    return [indice, valor];
  }
}
