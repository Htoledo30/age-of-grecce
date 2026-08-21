/**
 * A barra de turno: o estado da campanha, no topo, sempre à vista.
 *
 * Terceira região da interface, e o critério que a justifica é o mesmo de sempre —
 * o painel da direita é o que o jogador **aciona**, a ficha embaixo à esquerda é o que
 * ele **escolheu**, e esta barra é **em que pé a campanha está**. Coisa que se consulta
 * a cada decisão não pode morar atrás de painel recolhível.
 *
 * Fica escondida até a campanha começar: antes disso não há ano, turno nem tesouro.
 */

import { formatarAno } from '@/campanha/estado-campanha';

export interface VistaDoTurno {
  poder: { nome: string; cor: string };
  ano: number;
  turno: number;
  tesouro: number;
  renda: number;
  /**
   * O que a tropa custa por turno.
   *
   * Vai na barra junto com a renda, e não escondido no Governo, porque é a única despesa
   * recorrente do jogo: sem ela visível, o jogador vê o tesouro parar de crescer e não
   * tem como saber que foi o exército que comeu.
   */
  manutencao: number;
  provincias: number;
}

export class BarraTurno {
  private readonly raiz = document.createElement('div');
  private readonly tinta = document.createElement('span');
  private readonly linha = document.createElement('p');
  private readonly botao = document.createElement('button');
  private readonly botaoGoverno = document.createElement('button');

  /** Chamado quando o jogador manda passar o turno. */
  aoPassarTurno: () => void = () => {};
  /** Chamado quando o jogador abre a janela de governo. */
  aoAbrirGoverno: () => void = () => {};

  constructor(pai: HTMLElement) {
    this.raiz.className = 'barra-turno';
    this.raiz.hidden = true;

    this.tinta.className = 'barra-turno__tinta';
    this.linha.className = 'barra-turno__linha';

    this.botao.className = 'botao botao--principal';
    this.botao.type = 'button';
    this.botao.textContent = 'Passar o turno ▸';
    this.botao.addEventListener('click', () => {
      this.aoPassarTurno();
      // Sem isto o botão fica com o foco e a barra de espaço, que também passa o turno,
      // dispara o clique sintético do navegador ALÉM do atalho — o turno andaria dois.
      this.botao.blur();
    });

    // O governo mora aqui porque esta barra JÁ é a do estado nacional: é onde a mão vai
    // procurar por tesouro, renda e o que mais diga respeito ao reino inteiro.
    this.botaoGoverno.className = 'botao barra-turno__governo';
    this.botaoGoverno.type = 'button';
    this.botaoGoverno.textContent = 'Governo';
    this.botaoGoverno.title = 'Balanço do reino, província por província';
    this.botaoGoverno.addEventListener('click', () => {
      this.aoAbrirGoverno();
      this.botaoGoverno.blur();
    });

    this.raiz.append(this.tinta, this.linha, this.botaoGoverno, this.botao);
    pai.appendChild(this.raiz);
  }

  /** `null` esconde a barra — é o estado antes de escolher um poder. */
  mostrar(vista: VistaDoTurno | null): void {
    if (!vista) {
      this.raiz.hidden = true;
      return;
    }
    this.tinta.style.background = vista.poder.cor;
    this.linha.replaceChildren(
      trecho('barra-turno__poder', vista.poder.nome),
      trecho('barra-turno__dado', formatarAno(vista.ano)),
      trecho('barra-turno__dado', `turno ${vista.turno}`),
      trecho(
        'barra-turno__ouro',
        vista.manutencao > 0
          ? `${vista.tesouro} moedas (+${vista.renda} −${vista.manutencao})`
          : `${vista.tesouro} moedas (+${vista.renda})`,
      ),
      trecho('barra-turno__dado', `${vista.provincias} províncias`),
    );
    this.raiz.hidden = false;
  }
}

function trecho(classe: string, texto: string): HTMLElement {
  const span = document.createElement('span');
  span.className = classe;
  span.textContent = texto;
  return span;
}
