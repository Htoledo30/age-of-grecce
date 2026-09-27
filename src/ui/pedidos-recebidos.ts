/**
 * Os PEDIDOS RECEBIDOS: um cartão por proposta que um reino fez ao jogador, logo abaixo da
 * crônica.
 *
 * Henrique jogando: *"quando chegam ofertas de outros reinos ainda não tem um feedback muito
 * claro que chegou uma proposta; embaixo da janela que mostra os acontecimentos deveria ter uma
 * nova que aparece sempre que eu receber uma oferta"*. O único sinal era o número no botão de
 * Diplomacia da barra, e ele passava despercebido.
 *
 * Clicar abre a mesa já falando com quem pediu: aceitar e recusar continuam lá, onde está o
 * resto da conversa com aquele reino.
 */

import { iconeGrego } from './icones-gregos';

export interface PedidoRecebido {
  de: string;
  nome: string;
  cor: string;
  /** O pedido em poucas palavras, sem o nome: "propõe aliança". */
  texto: string;
}

export class PedidosRecebidos {
  /** Abre a diplomacia com este reino. */
  aoAbrir: (idPoder: string) => void = () => {};

  private readonly raiz = document.createElement('ul');

  constructor(pai: HTMLElement) {
    this.raiz.className = 'pedidos';
    this.raiz.hidden = true;
    this.raiz.setAttribute('aria-live', 'polite');
    this.raiz.setAttribute('aria-label', 'Propostas recebidas');
    pai.appendChild(this.raiz);
  }

  mostrar(pedidos: readonly PedidoRecebido[]): void {
    this.raiz.hidden = pedidos.length === 0;
    this.raiz.replaceChildren(...pedidos.map((p) => this.cartao(p)));
  }

  private cartao(pedido: PedidoRecebido): HTMLElement {
    const item = document.createElement('li');
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'pedidos__cartao';
    botao.dataset['de'] = pedido.de;
    botao.style.setProperty('--cor-do-poder', pedido.cor);

    const nome = document.createElement('strong');
    nome.className = 'pedidos__nome';
    nome.textContent = pedido.nome;
    const texto = document.createElement('span');
    texto.className = 'pedidos__texto';
    texto.textContent = pedido.texto;

    botao.append(iconeGrego('balanca', 'pedidos__icone'), nome, texto);
    botao.addEventListener('click', () => {
      this.aoAbrir(pedido.de);
      botao.blur();
    });
    item.append(botao);
    return item;
  }
}
