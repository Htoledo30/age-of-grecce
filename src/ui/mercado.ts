/**
 * Aba do mercado: **os bens que o reino ALCANÇA — não os que ele estoca.**
 *
 * A tela inteira existe para dizer duas coisas que nenhuma ficha de província diz: quais
 * bens distintos chegam ao reino, e quais não chegam. A segunda lista é a mais útil das
 * duas — ela é o mapa do que ainda há para conquistar, e é o que faz tomar a terra do vinho
 * valer mais do que tomar a segunda terra de grão.
 *
 * Não há inventário, não há caravana, não há preço. Um bem circula ou não circula.
 */

import type { AbaDoGoverno } from './governo';
import { rotulado } from './balanco';
import { definirTooltip } from './tooltip';

interface BemNoMercado {
  id: string;
  nome: string;
  troca: number;
  /** As terras suas que o abastecem. Vazio na lista do que falta. */
  provincias: readonly string[];
}

export interface VistaDoMercado {
  circulando: readonly BemNoMercado[];
  ausentes: readonly BemNoMercado[];
  total: number;
  /** Sem sede não há mercado: o reino que perdeu a capital fica sem rede até assentar outra. */
  semCapital: boolean;
}

const COLUNAS = ['bem', 'rende', 'de onde'] as const;

export class Mercado implements AbaDoGoverno {
  readonly id = 'mercado';
  readonly rotulo = 'Mercado';
  readonly elemento = document.createElement('div');

  private readonly resumo = document.createElement('p');
  private readonly corpo = document.createElement('div');
  private readonly ausentes = document.createElement('p');

  constructor() {
    this.elemento.className = 'balanco';
    this.resumo.className = 'balanco__resumo';
    this.corpo.className = 'balanco__corpo';
    this.ausentes.className = 'mercado__ausentes';
    this.elemento.append(this.resumo, this.corpo, this.ausentes);
  }

  desenhar(vista: VistaDoMercado): void {
    const quantos = vista.circulando.length;
    const resumo = [
      trecho('balanco__dado', `${quantos} ${quantos === 1 ? 'bem circula' : 'bens circulam'}`),
      rotulado(`+${moeda(vista.total)}`, 'por turno', 'ouro'),
    ];
    // ⚠️ O aviso vem antes de tudo: sem capital a tabela fica vazia, e uma tabela vazia sem
    // explicação parece defeito em vez de consequência.
    if (vista.semCapital) {
      resumo.unshift(trecho('balanco__aviso', 'sem capital: a rede parou'));
    }
    this.resumo.replaceChildren(...resumo);

    const tabela = document.createElement('table');
    tabela.className = 'balanco__tabela';

    const cabeca = document.createElement('thead');
    const linhaCabeca = document.createElement('tr');
    for (const [i, coluna] of COLUNAS.entries()) {
      const th = document.createElement('th');
      th.textContent = coluna;
      if (i === 1) th.className = 'balanco__numero';
      linhaCabeca.appendChild(th);
    }
    cabeca.appendChild(linhaCabeca);

    const corpo = document.createElement('tbody');
    for (const bem of vista.circulando) {
      const tr = celulas([bem.nome, `+${moeda(bem.troca)}`, bem.provincias.join(' · ')]);
      tr.dataset['tom'] = 'sobra';
      // Um bem que vem de duas terras é um bem que a conquista não tira de você com uma
      // província só. É informação de risco, e o tooltip é o lugar dela.
      if (bem.provincias.length > 1) {
        definirTooltip(tr, {
          titulo: `${bem.nome} vem de ${bem.provincias.length} terras`,
          corpo: 'Paga uma vez só, mas perder uma delas não corta a rede.',
        });
      }
      corpo.appendChild(tr);
    }

    tabela.append(cabeca, corpo);
    this.corpo.replaceChildren(tabela);

    this.ausentes.replaceChildren(
      trecho('mercado__rotulo', 'fora do alcance:'),
      ...(vista.ausentes.length === 0
        ? [trecho('balanco__dado', 'nenhum — o reino alcança o catálogo inteiro')]
        : vista.ausentes.map((bem) =>
            trecho('mercado__ausente', `${bem.nome} +${moeda(bem.troca)}`),
          )),
    );
  }
}

function celulas(valores: readonly string[]): HTMLTableRowElement {
  const tr = document.createElement('tr');
  for (const [i, valor] of valores.entries()) {
    const td = document.createElement('td');
    td.textContent = valor;
    if (i === 1) {
      td.className = 'balanco__numero';
      td.dataset['tom'] = 'ouro';
    }
    tr.appendChild(td);
  }
  return tr;
}

function trecho(classe: string, texto: string): HTMLElement {
  const span = document.createElement('span');
  span.className = classe;
  span.textContent = texto;
  return span;
}

function moeda(valor: number): string {
  return valor.toLocaleString('pt-BR');
}
