/**
 * O fim da campanha: a tela que diz VITÓRIA ou DERROTA com todas as letras.
 *
 * A régua é a mínima da campanha atual (ver `Campanha.resultado`): dominar a Grécia
 * central configurada, ou deixar de existir. A tela aparece UMA vez — quem quiser
 * continuar olhando o mapa fecha e fica; recomeçar apaga o salvamento, como no menu.
 */

import { iconeGrego, rotularComIcone } from './icones-gregos';

export class FimDeJogo {
  private readonly raiz = document.createElement('div');
  private readonly cartao = document.createElement('div');
  private mostrado = false;

  /** Apaga o salvamento e recomeça do zero. Quem liga é o main, junto com o do menu. */
  aoNovaCampanha: () => void = () => {};

  constructor(pai: HTMLElement) {
    this.raiz.className = 'fim-de-jogo';
    this.raiz.hidden = true;
    this.cartao.className = 'fim-de-jogo__cartao';
    this.raiz.appendChild(this.cartao);
    pai.appendChild(this.raiz);
  }

  /** Mostra o resultado uma única vez por sessão. Chamadas repetidas são ignoradas. */
  mostrar(resultado: 'vitoria' | 'derrota', nomeDoPoder: string): void {
    if (this.mostrado) return;
    this.mostrado = true;

    const emblema = document.createElement('div');
    emblema.className = 'fim-de-jogo__emblema';
    emblema.appendChild(iconeGrego(resultado === 'vitoria' ? 'coruja' : 'fogo'));

    const titulo = document.createElement('h1');
    titulo.className = 'fim-de-jogo__titulo';
    titulo.dataset['resultado'] = resultado;
    titulo.textContent = resultado === 'vitoria' ? 'Vitória' : 'Derrota';

    const texto = document.createElement('p');
    texto.className = 'fim-de-jogo__texto';
    texto.textContent =
      resultado === 'vitoria'
        ? `${nomeDoPoder} domina a Grécia central inteira. A campanha atual termina aqui — ` +
          'o mapa continua seu, se quiser ficar olhando o que construiu.'
        : `${nomeDoPoder} não existe mais: sem terra e sem exército, a história seguiu sem ela.`;

    const nova = document.createElement('button');
    nova.className = 'botao botao--principal';
    nova.type = 'button';
    rotularComIcone(nova, 'lanca', 'Nova campanha');
    nova.addEventListener('click', () => this.aoNovaCampanha());

    const fechar = document.createElement('button');
    fechar.className = 'botao fim-de-jogo__fechar';
    fechar.type = 'button';
    fechar.textContent = resultado === 'vitoria' ? 'Continuar observando' : 'Olhar o mapa';
    fechar.addEventListener('click', () => {
      this.raiz.hidden = true;
    });

    const acoes = document.createElement('div');
    acoes.className = 'fim-de-jogo__acoes';
    acoes.append(nova, fechar);

    this.cartao.replaceChildren(emblema, titulo, texto, acoes);
    this.raiz.hidden = false;
  }
}
