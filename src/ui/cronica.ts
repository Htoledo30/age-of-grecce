/**
 * A crônica da rodada: o que aconteceu enquanto o turno virava.
 *
 * ⚠️ **Existe porque a guerra estava sendo resolvida em silêncio.** A resolução já
 * devolvia batalhas, conquistas, cercos e milicianos perdidos — e ninguém lia esse
 * relatório. Na prática, o jogador mandava a surtida, passava o turno, e a peça de 700
 * homens **sumia do mapa** sem uma palavra: ele via a consequência e tinha que deduzir o
 * resto. Guerra que só se adivinha não é verificável à mão.
 *
 * ⚠️ **Isto NÃO é o futuro visor de batalha.** Não há barra, não há
 * playback, não há velocidade nem botão de pular: é o texto do que já aconteceu, lido de
 * um resultado que já estava calculado. A diferença entre as duas coisas é informação
 * contra drama, e o drama tem patch próprio — ele passa a valer de verdade no dia em que a
 * IA atacar sem avisar.
 *
 * Some sozinha quando a rodada não tem notícia: mundo parado não escreve linha nenhuma.
 */

import { iconeGrego } from './icones-gregos';
import type { NomeDoIconeGrego } from './icones-gregos';
import { milhar } from '@/nucleo/numeros';

/** Uma linha da crônica, já escrita. Quem monta a frase é `main.ts`, que sabe os nomes. */
export interface LinhaDaCronica {
  /** O tom decide a cor da borda: vitória, perda ou fato sem lado. */
  tom: 'ganho' | 'perda' | 'neutro';
  /**
   * Isto aconteceu COMIGO, ou é o mundo lá fora? Decide o bloco, o tamanho e a ordem.
   *
   * ⚠️ **É a hierarquia que faltava, e a queixa é literal.** Henrique: *"a crônica mistura
   * muita coisa pouco relevante com o que é importante"*, e a referência que ele deu foi o
   * Total War — *"quando dois reinos entram em guerra, eu recebo a informação e imediatamente
   * entendo o que aconteceu"*. Aqui todas as notícias eram o mesmo `<li>`, no mesmo tamanho e
   * na ordem em que a resolução calculou: "Elêusis perdeu 40 defensores" saía com o mesmo peso
   * de "SEU reino perdeu a capital", e numa rodada movimentada eram vinte linhas achatadas.
   *
   * ⚠️ **Nada é removido — só ordenado.** Ele foi explícito: *"não quero resolver isso
   * retirando profundidade; o problema não é ter muita informação, é a informação não estar
   * organizada"*. Ausente vale `normal`.
   */
  peso?: 'grave' | 'normal';
  icone: NomeDoIconeGrego;
  texto: string;
}

export class Cronica {
  private readonly raiz = document.createElement('section');
  private readonly titulo = document.createElement('h2');
  private readonly lista = document.createElement('ul');
  private readonly botaoFechar = document.createElement('button');

  constructor(pai: HTMLElement) {
    this.raiz.className = 'cronica';
    this.raiz.hidden = true;
    // Região viva: quem usa leitor de tela recebe a notícia sem precisar procurar por ela.
    this.raiz.setAttribute('aria-live', 'polite');

    this.titulo.className = 'cronica__titulo';
    this.lista.className = 'cronica__lista';

    this.botaoFechar.className = 'cronica__fechar';
    this.botaoFechar.type = 'button';
    this.botaoFechar.textContent = '×';
    this.botaoFechar.setAttribute('aria-label', 'Fechar a crônica');
    this.botaoFechar.addEventListener('click', () => {
      this.raiz.hidden = true;
      this.botaoFechar.blur();
    });

    this.raiz.append(this.titulo, this.botaoFechar, this.lista);
    pai.appendChild(this.raiz);
  }

  /**
   * Mostra a notícia da rodada. Lista vazia esconde o painel.
   *
   * ⚠️ **Esconder é o caso comum**, não a exceção: na maior parte dos turnos ninguém
   * marcha e nada acontece. Um painel que ficasse na tela dizendo "nada aconteceu" seria
   * ruído em cima do mapa toda rodada.
   */
  mostrar(rodada: number, linhas: readonly LinhaDaCronica[]): void {
    this.raiz.hidden = linhas.length === 0;
    if (linhas.length === 0) {
      this.lista.replaceChildren();
      return;
    }

    this.titulo.textContent = `Rodada ${milhar(rodada)}`;

    const graves = linhas.filter((l) => l.peso === 'grave');
    const resto = linhas.filter((l) => l.peso !== 'grave');
    // ⚠️ **Só separa quando há os DOIS lados.** Uma rodada em que tudo aconteceu com ele, ou
    // em que nada aconteceu, não tem hierarquia a mostrar: separar ali daria um subtítulo
    // pendurado sobre um bloco vazio, ou encolheria a notícia inteira sem nada com que
    // comparar. Sem separação, tudo se lê no tamanho de cima.
    const separado = graves.length > 0 && resto.length > 0;

    const itens: HTMLElement[] = graves.map((l) => desenharLinha(l, 'grave'));
    if (separado) itens.push(divisor('no resto do mundo'));
    for (const l of resto) itens.push(desenharLinha(l, separado ? 'normal' : 'grave'));

    this.lista.replaceChildren(...itens);
  }

  /** Fecha sem apagar o conteúdo. É o que a virada do turno faz antes de reescrever. */
  esconder(): void {
    this.raiz.hidden = true;
  }
}

function desenharLinha(linha: LinhaDaCronica, peso: 'grave' | 'normal'): HTMLElement {
  const item = document.createElement('li');
  item.className = 'cronica__linha';
  item.dataset['tom'] = linha.tom;
  // No DOM porque a cor e o tamanho não identificam nada para quem procura — nem o teste de
  // tela, nem o leitor de tela. É a mesma regra do `data-medida` da ficha de província.
  item.dataset['peso'] = peso;
  const texto = document.createElement('span');
  texto.className = 'cronica__texto';
  texto.textContent = linha.texto;
  item.append(iconeGrego(linha.icone, 'cronica__icone'), texto);
  return item;
}

/** O corte entre "o que aconteceu comigo" e "o que aconteceu no mundo". */
function divisor(texto: string): HTMLElement {
  const item = document.createElement('li');
  item.className = 'cronica__divisor';
  item.textContent = texto;
  return item;
}
