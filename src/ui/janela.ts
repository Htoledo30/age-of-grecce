/**
 * A moldura de JANELA: fundo escurecido, cabeçalho, fechar, Esc, clique fora.
 *
 * Nasceu na terceira vez que este código foi escrito. Governo e Diplomacia já traziam cada
 * um a sua cópia — mesmo `hidden`, mesmo `Escape`, mesmo `if (e.target === fundo)` — e a
 * reforma da província ia trazer mais duas. Quatro cópias de uma moldura é como uma
 * interface deixa de parecer o mesmo jogo: uma ganha um detalhe, as outras não.
 *
 * ⚠️ **Só a moldura.** O conteúdo é de quem usa, e entra em `corpo`. Esta classe não sabe
 * nada de província, de reino nem de tropa — é isso que a deixa servir aos quatro.
 */

import { definirTooltip } from './tooltip';
import { iconeGrego } from './icones-gregos';
import type { NomeDoIconeGrego } from './icones-gregos';

export class Janela {
  private readonly fundo = document.createElement('div');
  private readonly caixa = document.createElement('section');
  private readonly titulo = document.createElement('h2');
  private readonly legenda = document.createElement('p');
  /** Onde o dono desenha. Tudo que não é moldura mora aqui. */
  readonly corpo = document.createElement('div');
  private aberta = false;

  /** Avisada toda vez que a janela abre ou fecha — é quem redesenha o resto da tela. */
  aoAlternar: (aberta: boolean) => void = () => {};

  constructor(pai: HTMLElement, nome: string, icone: NomeDoIconeGrego, largura: string) {
    this.fundo.className = 'janela';
    this.fundo.hidden = true;
    this.fundo.dataset['janela'] = nome.toLowerCase();
    // Clicar fora fecha — mas só quando o alvo é o FUNDO. Sem esta checagem, qualquer
    // clique dentro borbulharia até aqui e fecharia a janela na cara do jogador.
    this.fundo.addEventListener('click', (e) => {
      if (e.target === this.fundo) this.fechar();
    });

    this.caixa.className = 'janela__caixa';
    this.caixa.style.width = largura;

    const barra = document.createElement('div');
    barra.className = 'janela__barra';
    const marca = document.createElement('div');
    marca.className = 'janela__marca';
    this.titulo.className = 'janela__titulo';
    this.titulo.textContent = nome;
    this.legenda.className = 'janela__legenda';
    marca.append(iconeGrego(icone, 'janela__icone'), this.titulo);

    const textos = document.createElement('div');
    textos.append(marca, this.legenda);

    const fechar = document.createElement('button');
    fechar.className = 'janela__fechar';
    fechar.type = 'button';
    fechar.textContent = '×';
    fechar.setAttribute('aria-label', `Fechar ${nome.toLowerCase()}`);
    definirTooltip(fechar, { titulo: 'Fechar', corpo: 'Atalho: Esc' });
    fechar.addEventListener('click', () => this.fechar());
    barra.append(textos, fechar);

    this.corpo.className = 'janela__corpo';
    this.caixa.append(barra, this.corpo);
    this.fundo.appendChild(this.caixa);
    pai.appendChild(this.fundo);

    // Escutado na janela do navegador porque o foco pode estar em qualquer lugar —
    // inclusive no botão que a abriu.
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.aberta) this.fechar();
    });
  }

  get visivel(): boolean {
    return this.aberta;
  }

  /** A linha embaixo do título: de que província, de que reino. Muda a cada desenho. */
  dizer(texto: string): void {
    this.legenda.textContent = texto;
  }

  abrir(): void {
    if (this.aberta) return;
    this.aberta = true;
    this.fundo.hidden = false;
    this.aoAlternar(true);
  }

  fechar(): void {
    if (!this.aberta) return;
    this.aberta = false;
    this.fundo.hidden = true;
    this.aoAlternar(false);
  }

  alternar(): void {
    if (this.aberta) this.fechar();
    else this.abrir();
  }
}
