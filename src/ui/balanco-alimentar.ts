/** Aba de alimentação: a mesma conta curta que decide crescimento e fome. */

import type { CategoriaAlimentar } from '@/producao/alimentacao';
import type { AbaDoGoverno } from './governo';
import { rotulado } from './balanco';
import { definirTooltip } from './tooltip';

export interface LinhaDoAlimento {
  nome: string;
  produtos: string;
  producao: number;
  /** O que a gente dela come — sai da FAIXA de população, não de um ponto fixo por terra. */
  populacao: number;
  /** O nome da faixa, para o custo não parecer um número tirado do nada. */
  faixa: string;
  /** O papel local: sustentadora, equilibrada ou dependente. */
  papel: 'sustentadora' | 'equilibrada' | 'dependente';
  sitiada: boolean;
}

/** O grão comprado de fora: a encomenda, o que chega e o que custa. */
export interface VistaDaImportacao {
  /** Pontos encomendados. */
  encomenda: number;
  /** Pontos que chegam hoje: a encomenda limitada pelas portas abertas. */
  chegam: number;
  /** Quanto Porto e Mercado deixam entrar agora. */
  capacidade: number;
  /** Ouro por turno do que chega. */
  custo: number;
  /** Quanto o turno passa a custar com um ponto a mais. */
  custoComMaisUm: number;
}

export interface VistaDoAlimento {
  linhas: readonly LinhaDoAlimento[];
  subsistencia: number;
  /** `null` quando não há reino do jogador. */
  importacao: VistaDaImportacao | null;
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

  /** Chamado quando o jogador muda a encomenda de grão. */
  aoDefinirImportacao: (pontos: number) => void = () => {};

  private readonly resumo = document.createElement('p');
  private readonly grao = document.createElement('div');
  private readonly graoMenos = document.createElement('button');
  private readonly graoMais = document.createElement('button');
  private readonly graoQuantos = document.createElement('span');
  private readonly graoCusto = document.createElement('span');
  private readonly corpo = document.createElement('div');
  private importacao: VistaDaImportacao | null = null;

  constructor() {
    this.elemento.className = 'balanco';
    this.resumo.className = 'balanco__resumo';
    this.corpo.className = 'balanco__corpo';

    this.grao.className = 'balanco__grao';
    const rotulo = document.createElement('span');
    rotulo.className = 'balanco__grao-rotulo';
    rotulo.textContent = 'Grão comprado';
    for (const [botao, texto, passo] of [
      [this.graoMenos, '−', -1],
      [this.graoMais, '+', 1],
    ] as const) {
      botao.type = 'button';
      botao.className = 'balanco__grao-botao';
      botao.textContent = texto;
      botao.addEventListener('click', () => {
        const vista = this.importacao;
        if (vista === null) return;
        this.aoDefinirImportacao(Math.max(0, vista.encomenda + passo));
        botao.blur();
      });
    }
    this.graoMenos.setAttribute('aria-label', 'Comprar menos grão');
    this.graoMais.setAttribute('aria-label', 'Comprar mais grão');
    this.graoQuantos.className = 'balanco__grao-quantos';
    this.graoCusto.className = 'balanco__grao-custo';
    this.grao.append(rotulo, this.graoMenos, this.graoQuantos, this.graoMais, this.graoCusto);

    this.elemento.append(this.resumo, this.grao, this.corpo);
  }

  desenhar(vista: VistaDoAlimento): void {
    // Só as terras em circulação entram nas somas: a sitiada vive da própria despensa.
    const livres = vista.linhas.filter((linha) => !linha.sitiada);
    const producao = livres.reduce((total, linha) => total + linha.producao, 0);
    const populacao = livres.reduce((total, linha) => total + linha.populacao, 0);
    const comprado = vista.importacao?.chegam ?? 0;
    // Entrada em verde, saída em vermelho, a palavra em marfim. O saldo final NÃO é ouro:
    // comida tem a cor do estado dela.
    const tomDe = (n: number): 'ganho' | 'perda' => (n < 0 ? 'perda' : 'ganho');
    this.resumo.replaceChildren(
      rotulado('subsistência', `+${vista.subsistencia}`, 'ganho'),
      rotulado('alimentos', `+${producao}`, 'ganho'),
      ...(comprado > 0 ? [rotulado('grão comprado', `+${comprado}`, 'ganho')] : []),
      rotulado('população', comSinal(-populacao), 'perda'),
      rotulado('civil', comSinal(vista.saldoCivil), tomDe(vista.saldoCivil)),
      rotulado('exército', comSinal(-vista.exercito), vista.exercito > 0 ? 'perda' : 'ganho'),
      rotulado(comSinal(vista.saldo), `· ${nomeDaCategoria(vista.categoria)}`, tomDe(vista.saldo)),
    );
    this.desenharGrao(vista.importacao);

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

  private desenharGrao(vista: VistaDaImportacao | null): void {
    this.importacao = vista;
    this.grao.hidden = vista === null;
    if (vista === null) return;
    const semPorta = vista.capacidade === 0 && vista.encomenda === 0;
    this.graoQuantos.textContent = `${vista.chegam} / ${vista.capacidade}`;
    this.graoCusto.textContent = semPorta
      ? 'Sem Porto ou Mercado'
      : vista.custo > 0
        ? `−${moeda(vista.custo)} / turno`
        : '';
    this.graoCusto.dataset['tom'] = semPorta ? 'bloqueio' : 'custo';
    this.graoMenos.disabled = vista.encomenda <= 0;
    this.graoMais.disabled = vista.encomenda >= vista.capacidade;
    definirTooltip(this.graoMais, {
      titulo: 'Mais um ponto',
      corpo: this.graoMais.disabled
        ? 'Sem Porto ou Mercado para receber mais.'
        : `−${moeda(vista.custoComMaisUm)} / turno`,
    });
    // Encomenda maior que a porta: cais bloqueado ou praça sitiada cortaram o que chega.
    const cortado = vista.chegam < vista.encomenda;
    this.graoQuantos.dataset['tom'] = cortado ? 'cortado' : '';
    definirTooltip(this.graoQuantos, {
      titulo: cortado ? 'Entrega cortada' : 'Grão comprado',
      corpo: `${vista.encomenda} encomendados, ${vista.chegam} chegam.`,
      tom: cortado ? 'perigo' : 'informacao',
    });
  }

  private linha(linha: LinhaDoAlimento): HTMLTableRowElement {
    const saldo = linha.producao - linha.populacao;
    const tr = celulas([
      linha.nome,
      linha.produtos || 'nenhum',
      `+${linha.producao}`,
      linha.faixa ? `−${linha.populacao} · ${linha.faixa}` : `−${linha.populacao}`,
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

function moeda(valor: number): string {
  return Math.round(valor).toLocaleString('pt-BR');
}

function comSinal(valor: number): string {
  return valor >= 0 ? `+${valor}` : `−${-valor}`;
}


function celulas(valores: readonly string[]): HTMLTableRowElement {
  const tr = document.createElement('tr');
  for (const [i, valor] of valores.entries()) {
    const td = document.createElement('td');
    td.textContent = valor;
    if (i >= 2) td.className = 'balanco__numero';
    if (i >= 2 && valor.startsWith('−')) td.dataset['tom'] = 'perda';
    tr.appendChild(td);
  }
  return tr;
}
