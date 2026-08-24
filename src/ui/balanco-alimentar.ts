/** Aba de alimentação: a mesma conta curta que decide crescimento e fome. */

import type { CategoriaAlimentar } from '@/producao/alimentacao';
import type { AbaDoGoverno } from './governo';
import { definirTooltip } from './tooltip';

export interface LinhaDoAlimento {
  nome: string;
  produtos: string;
  producao: number;
  populacao: number;
  /** O papel local: sustentadora, equilibrada ou dependente. */
  papel: 'sustentadora' | 'equilibrada' | 'dependente';
  sitiada: boolean;
}

export interface VistaDoAlimento {
  linhas: readonly LinhaDoAlimento[];
  subsistencia: number;
  exercito: number;
  /** O que sobra pro povo antes do exército. É a conta que decide quem morre. */
  saldoCivil: number;
  saldo: number;
  categoria: CategoriaAlimentar;
}

const COLUNAS = ['província', 'alimentos', 'produção', 'população', 'saldo local', 'papel'] as const;

const NOME_DO_PAPEL = {
  sustentadora: 'Sustentadora',
  equilibrada: 'Equilibrada',
  dependente: 'Dependente',
} as const;

export class BalancoAlimentar implements AbaDoGoverno {
  readonly id = 'alimentacao';
  readonly rotulo = 'Alimentação';
  readonly elemento = document.createElement('div');

  private readonly resumo = document.createElement('p');
  private readonly corpo = document.createElement('div');

  constructor() {
    this.elemento.className = 'balanco';
    this.resumo.className = 'balanco__resumo';
    this.corpo.className = 'balanco__corpo';
    this.elemento.append(this.resumo, this.corpo);
  }

  desenhar(vista: VistaDoAlimento): void {
    // Só as terras em circulação entram nas somas: a sitiada vive da própria despensa.
    const livres = vista.linhas.filter((linha) => !linha.sitiada);
    const producao = livres.reduce((total, linha) => total + linha.producao, 0);
    const populacao = livres.reduce((total, linha) => total + linha.populacao, 0);
    this.resumo.replaceChildren(
      trecho('balanco__dado', `subsistência +${vista.subsistencia}`),
      trecho('balanco__dado', `alimentos +${producao}`),
      trecho('balanco__dado', `população −${populacao}`),
      trecho(
        vista.saldoCivil < 0 ? 'balanco__aviso' : 'balanco__dado',
        `civil ${comSinal(vista.saldoCivil)}`,
      ),
      trecho('balanco__dado', `exército −${vista.exercito}`),
      trecho(
        vista.saldo < 0 ? 'balanco__aviso' : 'balanco__ouro',
        `${comSinal(vista.saldo)} · ${nomeDaCategoria(vista.categoria)}`,
      ),
    );

    const tabela = document.createElement('table');
    tabela.className = 'balanco__tabela';
    const cabeca = document.createElement('thead');
    const linhaCabeca = document.createElement('tr');
    for (const [i, coluna] of COLUNAS.entries()) {
      const th = document.createElement('th');
      th.textContent = coluna;
      if (i >= 2) th.className = 'balanco__numero';
      linhaCabeca.appendChild(th);
    }
    cabeca.appendChild(linhaCabeca);

    const corpo = document.createElement('tbody');
    for (const linha of vista.linhas) corpo.appendChild(this.linha(linha));
    tabela.append(cabeca, corpo);
    this.corpo.replaceChildren(tabela);
  }

  private linha(linha: LinhaDoAlimento): HTMLTableRowElement {
    const saldo = linha.producao - linha.populacao;
    const tr = celulas([
      linha.nome,
      linha.produtos || 'nenhum',
      `+${linha.producao}`,
      `−${linha.populacao}`,
      comSinal(saldo),
      linha.sitiada ? 'fora da circulação' : NOME_DO_PAPEL[linha.papel],
    ]);
    tr.dataset['tom'] = linha.sitiada || saldo < 0 ? 'deficit' : 'sobra';
    const celula = tr.lastElementChild;
    if (celula instanceof HTMLElement) {
      definirTooltip(celula, {
        titulo: linha.sitiada
          ? 'Fora da circulação'
          : saldo < 0
            ? 'Depende do reino'
            : 'Sustenta o reino',
        corpo: linha.sitiada
          ? 'Vive apenas dos próprios mantimentos.'
          : `+${linha.producao} alimentos\n−${linha.populacao} população\n= ${comSinal(saldo)}`,
        tom: linha.sitiada || saldo < 0 ? 'perigo' : 'informacao',
      });
    }
    return tr;
  }
}

export function nomeDaCategoria(categoria: CategoriaAlimentar): string {
  switch (categoria) {
    case 'fome':
      return 'Fome';
    case 'exercito-sem-mantimentos':
      return 'Exército sem mantimentos';
    case 'no-limite':
      return 'No limite';
    case 'abastecido':
      return 'Abastecido';
  }
}

function comSinal(valor: number): string {
  return valor >= 0 ? `+${valor}` : `−${-valor}`;
}

function trecho(classe: string, texto: string): HTMLElement {
  const span = document.createElement('span');
  span.className = classe;
  span.textContent = texto;
  return span;
}

function celulas(valores: readonly string[]): HTMLTableRowElement {
  const tr = document.createElement('tr');
  for (const [i, valor] of valores.entries()) {
    const td = document.createElement('td');
    td.textContent = valor;
    if (i >= 2) td.className = 'balanco__numero';
    tr.appendChild(td);
  }
  return tr;
}
