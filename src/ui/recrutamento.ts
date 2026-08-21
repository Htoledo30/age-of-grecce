/**
 * O bloco de recrutamento: pôr gente em armas nesta província. **Só isso.**
 *
 * Ver e dispensar tropa moravam aqui e saíram para `exercito-ficha.ts`, e a razão é
 * estrutural: aquilo só funcionava enquanto a hoste e o Quartel estivessem na mesma
 * província. Assim que a tropa marchar, comandá-la a partir de um painel chamado
 * "Recrutar" deixa de fazer sentido. **Recrutar é ação da PROVÍNCIA; dispensar é ação da
 * HOSTE** — seleções diferentes, painéis diferentes.
 *
 * Arquivo próprio, e não mais uma seção dentro de `acoes-provincia.ts`, porque é outra
 * mecânica: investir e construir mexem em dinheiro, recrutar mexe em **gente**. Juntar as
 * duas num painel só faria daquele arquivo o lugar que sabe tudo o que se pode fazer com
 * uma província — que é exatamente o crescimento que a regra de arquitetura do projeto
 * proíbe.
 *
 * ⚠️ **Fica na tela mesmo quando não dá pra recrutar, dizendo o motivo.** É a regra da
 * casa: esconder o controle esconde a existência da mecânica, e o jogador não tem como
 * adivinhar que precisa de um Quartel se o painel simplesmente não aparece.
 */

/** O que o bloco precisa saber pra oferecer — ou recusar com motivo — uma leva. */
export type VistaDeRecrutamento =
  | {
      pode: true;
      provincia: { id: string; nome: string };
      /** Habitantes que ainda estão na província. */
      populacao: number;
      /** Quantos habitantes ainda estão disponíveis para uma leva. */
      disponivel: number;
      custoPorHomem: number;
      manutencaoPorHomem: number;
      avaliar: (
        homens: number,
      ) => { pode: true; ouro: number; homens: number } | { pode: false; motivo: string };
    }
  | { pode: false; motivo: string };

export class Recrutamento {
  private readonly raiz = document.createElement('div');
  private readonly titulo = document.createElement('h2');
  private readonly alvo = document.createElement('p');
  private readonly campoHomens = document.createElement('input');
  private readonly previsao = document.createElement('p');
  private readonly botaoRecrutar = document.createElement('button');
  private vista: VistaDeRecrutamento | null = null;

  aoRecrutar: (idProvincia: string, homens: number) => void = () => {};

  constructor(pai: HTMLElement) {
    this.raiz.className = 'recrutamento';
    this.raiz.hidden = true;

    this.titulo.className = 'recrutamento__titulo';
    this.titulo.textContent = 'Recrutar';

    this.alvo.className = 'recrutamento__alvo';

    this.campoHomens.className = 'recrutamento__valor';
    this.campoHomens.type = 'number';
    this.campoHomens.min = '1';
    this.campoHomens.step = '1';
    this.campoHomens.value = '1000';
    this.campoHomens.title =
      'Quantos homens levantar aqui. Eles saem da população desta província: enquanto ' +
      'estiverem em armas, deixam de ser tributados.';
    this.campoHomens.addEventListener('input', () => this.avaliar());

    this.previsao.className = 'recrutamento__previsao';

    this.botaoRecrutar.className = 'botao botao--principal recrutamento__botao';
    this.botaoRecrutar.type = 'button';
    this.botaoRecrutar.textContent = 'Reunir leva';
    this.botaoRecrutar.addEventListener('click', () => {
      const vista = this.vista;
      if (!vista?.pode) return;
      const homens = Number(this.campoHomens.value);
      if (vista.avaliar(homens).pode) this.aoRecrutar(vista.provincia.id, homens);
      // `blur` no fim do clique: sem isso o botão fica com foco e a barra de espaço,
      // que passa o turno, dispara um clique sintético nele.
      this.botaoRecrutar.blur();
    });

    this.raiz.append(this.titulo, this.alvo, this.campoHomens, this.previsao, this.botaoRecrutar);
    pai.appendChild(this.raiz);
  }

  /** `null` esconde o bloco — é o estado fora da campanha. */
  mostrar(vista: VistaDeRecrutamento | null): void {
    this.vista = vista;
    this.raiz.hidden = vista === null;
    if (!vista) return;

    for (const el of [this.campoHomens, this.botaoRecrutar]) el.hidden = !vista.pode;

    if (!vista.pode) {
      this.alvo.textContent = vista.motivo;
      this.previsao.textContent = '';
      return;
    }

    this.alvo.textContent =
      `${vista.provincia.nome} · ${numero(vista.populacao)} habitantes · ` +
      `${numero(vista.disponivel)} disponíveis para recrutar`;
    this.alvo.title =
      'Não existe fração recrutável nem lote mínimo. O limite local é a população que ' +
      'ainda vive aqui, menos os habitantes que a província nunca cede — mulheres, ' +
      'crianças, velhos e quem lavra —, além do ouro para reunir a leva.';

    this.avaliar();
  }

  /**
   * Diz o que aquela leva custaria — ou por que não pode.
   *
   * Escrever a conta antes do clique é o que torna isto uma decisão: o jogador vê que
   * mil homens custam duas mil moedas AGORA e duzentas TODO TURNO, e é a segunda parcela
   * que decide, não a primeira.
   */
  private avaliar(): void {
    const vista = this.vista;
    if (!vista?.pode) return;
    const homens = Number(this.campoHomens.value);
    const r = vista.avaliar(homens);

    if (!r.pode) {
      this.previsao.textContent = r.motivo;
      this.previsao.dataset['pode'] = 'nao';
      this.botaoRecrutar.disabled = true;
      return;
    }

    const manutencao = Math.round(r.homens * vista.manutencaoPorHomem);
    this.previsao.textContent =
      `${numero(r.homens)} homens · ${numero(r.ouro)} moedas agora · ` +
      `${numero(manutencao)} por turno`;
    this.previsao.dataset['pode'] = 'sim';
    this.previsao.title =
      `${vista.custoPorHomem} moedas por homem para reunir, e ` +
      `${vista.manutencaoPorHomem} por homem a cada turno enquanto estiverem em armas. ` +
      `A província perde ${numero(r.homens)} habitantes e o imposto dela cai junto.`;
    this.botaoRecrutar.disabled = false;
  }
}

function numero(valor: number): string {
  return valor.toLocaleString('pt-BR');
}
