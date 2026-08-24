/**
 * A janela de governo: onde se olha o reino inteiro, e não uma província.
 *
 * Esta classe é só a **casca** — moldura, barra de abas, fechar. O conteúdo de cada aba
 * mora em outro arquivo e só precisa entregar um elemento e um rótulo. Foi feita assim
 * porque a segunda aba (poderes, diplomacia, modos de mapa) vai chegar, e quando chegar
 * deve custar uma linha em `main.ts` em vez de uma remodelação de layout.
 *
 * A divisão de trabalho da interface, agora completa:
 *
 * - ficha (canto de baixo): **o que este lugar é** — identidade;
 * - ações (acima dela): **o que dá pra fazer aqui**;
 * - barra de turno (topo): **em que pé a campanha está**;
 * - governo (esta janela): **como o reino inteiro se sustenta**.
 */

import { definirTooltip } from './tooltip';
import { rotularComIcone } from './icones-gregos';

/** Uma aba da janela. Só precisa saber se desenhar num elemento próprio. */
export interface AbaDoGoverno {
  readonly id: string;
  readonly rotulo: string;
  readonly elemento: HTMLElement;
}

export class Governo {
  private readonly fundo = document.createElement('div');
  private readonly barraDeAbas = document.createElement('nav');
  private readonly conteudo = document.createElement('div');
  private readonly botoes = new Map<string, HTMLButtonElement>();
  private atual: string;
  private aberto = false;

  constructor(
    pai: HTMLElement,
    private readonly abas: readonly AbaDoGoverno[],
  ) {
    const primeira = abas[0];
    if (!primeira) throw new Error('a janela de governo precisa de pelo menos uma aba');
    this.atual = primeira.id;

    this.fundo.className = 'governo';
    this.fundo.hidden = true;
    // Clicar fora fecha, mas só quando o alvo é o FUNDO: sem essa checagem qualquer
    // clique dentro da janela borbulharia até aqui e a fecharia na cara do jogador.
    this.fundo.addEventListener('click', (e) => {
      if (e.target === this.fundo) this.fechar();
    });

    const janela = document.createElement('section');
    janela.className = 'governo__janela';

    const barra = document.createElement('div');
    barra.className = 'governo__barra';
    const titulo = document.createElement('h2');
    titulo.className = 'governo__titulo';
    rotularComIcone(titulo, 'templo', 'Governo');
    const fechar = document.createElement('button');
    fechar.className = 'governo__fechar';
    fechar.type = 'button';
    fechar.textContent = '×';
    fechar.setAttribute('aria-label', 'Fechar governo');
    definirTooltip(fechar, { titulo: 'Fechar', corpo: 'Atalho: Esc' });
    fechar.addEventListener('click', () => this.fechar());
    barra.append(titulo, fechar);

    this.barraDeAbas.className = 'governo__abas';
    for (const aba of abas) {
      const botao = document.createElement('button');
      botao.className = 'governo__aba';
      botao.type = 'button';
      rotularComIcone(botao, aba.id === 'balanco' ? 'balanca' : 'territorio', aba.rotulo);
      botao.addEventListener('click', () => this.mostrarAba(aba.id));
      this.botoes.set(aba.id, botao);
      this.barraDeAbas.appendChild(botao);
      aba.elemento.classList.add('governo__conteudo');
      // ⚠️ O id da aba vai para o DOM porque duas abas podem compartilhar as classes de
      // tabela — e aí "a linha da tabela" deixa de identificar uma tabela só. Quem procura
      // conteúdo de uma aba específica procura por este atributo.
      aba.elemento.dataset['aba'] = aba.id;
      this.conteudo.appendChild(aba.elemento);
    }

    janela.append(barra, this.barraDeAbas, this.conteudo);
    this.fundo.appendChild(janela);
    pai.appendChild(this.fundo);

    // Esc fecha. Escutado na janela do navegador porque o foco pode estar em qualquer
    // lugar — inclusive no botão que abriu.
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.aberto) this.fechar();
    });

    this.mostrarAba(this.atual);
  }

  get visivel(): boolean {
    return this.aberto;
  }

  abrir(): void {
    this.aberto = true;
    this.fundo.hidden = false;
  }

  fechar(): void {
    this.aberto = false;
    this.fundo.hidden = true;
  }

  alternar(): void {
    if (this.aberto) this.fechar();
    else this.abrir();
  }

  private mostrarAba(id: string): void {
    this.atual = id;
    for (const aba of this.abas) {
      const ativa = aba.id === id;
      aba.elemento.hidden = !ativa;
      // O estado mora em aria-selected, não numa classe: a marcação já diz a verdade
      // pra tecnologia assistiva e o CSS só reage a ela.
      this.botoes.get(aba.id)?.setAttribute('aria-selected', String(ativa));
    }
  }
}
