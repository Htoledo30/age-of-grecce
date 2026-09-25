/**
 * Quantos homens vão — a barra, os atalhos de fração e a linha que os lê em voz alta.
 *
 * A barra reinicia com a força inteira quando o jogador troca de hoste: mandar tudo é o caso
 * comum, e quem não marchar permanece defendendo a província.
 */

import { definirTooltip } from '../tooltip';
import { numero } from './vista';
import type { VistaDoExercito } from './vista';

const FRACOES = [
  ['25%', 0.25],
  ['50%', 0.5],
  ['75%', 0.75],
  ['Todos', 1],
] as const;

export class EscolhaDaMarcha {
  private readonly quantidade = document.createElement('p');
  private readonly campo = document.createElement('input');
  private readonly atalhos = document.createElement('div');
  /** De quem é a quantidade que está no campo. Trocar de hoste reinicia o campo. */
  private quantidadeDe: string | null = null;
  private vista: VistaDoExercito | null = null;

  aoMudarQuantidade: (homens: number) => void = () => {};

  constructor(pai: HTMLElement) {
    this.quantidade.className = 'exercito__quantidade';
    this.quantidade.setAttribute('aria-live', 'polite');

    this.campo.className = 'exercito__valor';
    this.campo.type = 'range';
    this.campo.min = '1';
    this.campo.step = '1';
    this.campo.setAttribute('aria-label', 'Quantidade de soldados para mover');
    definirTooltip(this.campo, {
      titulo: 'Força da marcha',
      corpo: 'Quem não marchar permanece defendendo a província.',
      tom: 'perigo',
    });
    this.campo.addEventListener('input', () => {
      this.atualizarTexto();
      this.aoMudarQuantidade(Number(this.campo.value));
    });

    this.atalhos.className = 'exercito__atalhos';
    for (const [rotulo, fracao] of FRACOES) {
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'exercito__atalho';
      botao.textContent = rotulo;
      botao.addEventListener('click', () => {
        const vista = this.vista;
        if (!vista?.minha || vista.forca === 0) return;
        this.campo.value = String(Math.max(1, Math.floor(vista.forca * fracao)));
        this.atualizarTexto();
        this.aoMudarQuantidade(Number(this.campo.value));
        botao.blur();
      });
      this.atalhos.appendChild(botao);
    }

    pai.append(this.quantidade, this.campo, this.atalhos);
  }

  mostrar(vista: VistaDoExercito, temOrdem: boolean): void {
    this.vista = vista;
    // O `max` vem antes do valor para o navegador não limitá-lo ao padrão 100.
    this.campo.max = String(vista.forca);
    // ⚠️ **Reinicia pela FORÇA também, e não só pelo id.** Desde que mandar parte da hoste a
    // parte na hora, a peça que fica conserva o id e ENCOLHE: mandados 100 de 1.000, a barra
    // continuava valendo 100 sobre uma tropa de 900, e a segunda ordem nascia com o número da
    // primeira. Pior no caso em que a força cai abaixo do valor guardado: o `max` novo aparava
    // o campo e a ficha passava a prometer um número que a barra já não tinha.
    const chave = `${vista.hoste.id}:${vista.forca}`;
    if (this.quantidadeDe !== chave) {
      this.quantidadeDe = chave;
      this.campo.value = String(vista.forca);
      this.aoMudarQuantidade(vista.forca);
    }
    this.atualizarTexto();
    const escondido = !vista.minha || temOrdem;
    this.quantidade.hidden = escondido;
    this.campo.hidden = escondido;
    this.atalhos.hidden = escondido;
  }

  private atualizarTexto(): void {
    const vista = this.vista;
    if (!vista) return;
    this.quantidade.textContent = `${numero(Number(this.campo.value))} de ${numero(vista.forca)} marcham`;
  }
}
