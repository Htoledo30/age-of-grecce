/**
 * Aba de balanço: a contabilidade do reino, província por província.
 *
 * Existe porque os totais **não pertencem a província nenhuma**. Tesouro, renda do
 * estado e — em breve — despesa de exército não cabem na ficha de um território, e a
 * barra de turno só tem espaço pra um número sem dizer de onde ele vem.
 *
 * **Aqui é o único lugar onde impostos, produção e comércio aparecem separados.** Na
 * ficha da província eles eram ruído: informação de contador competindo com a identidade
 * do território. A ficha diz o que o lugar é; esta tabela diz quanto ele rende.
 */

import { formatarAno } from '@/campanha/estado-campanha';
import type { AbaDoGoverno } from './governo';
import { definirTooltip } from './tooltip';

/** Uma linha da tabela: uma província do jogador. */
export interface LinhaDoBalanco {
  nome: string;
  /** `null` quando a província ainda não tem economia configurada. */
  economia: {
    produto: string;
    nivel: number;
    impostos: number;
    producao: number;
    comercio: number;
    total: number;
    /** Incentivo em curso, em fração. 0 quando não há. */
    bonus: number;
  } | null;
  construcoes: readonly string[];
  obra: { nome: string; turnosRestantes: number } | null;
}

export interface VistaDoBalanco {
  poder: { nome: string; cor: string };
  ano: number;
  turno: number;
  tesouro: number;
  linhas: readonly LinhaDoBalanco[];
}

const COLUNAS = ['província', 'produção', 'impostos', 'produz', 'comércio', 'por turno'] as const;

export class Balanco implements AbaDoGoverno {
  readonly id = 'balanco';
  readonly rotulo = 'Balanço';
  readonly elemento = document.createElement('div');

  private readonly resumo = document.createElement('p');
  private readonly corpo = document.createElement('div');

  constructor() {
    this.elemento.className = 'balanco';
    this.resumo.className = 'balanco__resumo';
    this.corpo.className = 'balanco__corpo';
    this.elemento.append(this.resumo, this.corpo);
  }

  desenhar(vista: VistaDoBalanco): void {
    const somas = { impostos: 0, producao: 0, comercio: 0, total: 0 };
    for (const l of vista.linhas) {
      if (!l.economia) continue;
      somas.impostos += l.economia.impostos;
      somas.producao += l.economia.producao;
      somas.comercio += l.economia.comercio;
      somas.total += l.economia.total;
    }

    const semEconomia = vista.linhas.filter((l) => l.economia === null).length;
    const resumo = [
      trecho('balanco__poder', vista.poder.nome),
      trecho('balanco__dado', formatarAno(vista.ano)),
      trecho('balanco__dado', `turno ${vista.turno}`),
      trecho('balanco__ouro', `${moeda(vista.tesouro)} moedas`),
      trecho('balanco__ouro', `+${moeda(somas.total)} por turno`),
      trecho('balanco__dado', `${vista.linhas.length} províncias`),
    ];
    // Dizer quantas ainda não arrecadam é honestidade: sem isso o total parece o teto do
    // reino, quando na verdade parte do território simplesmente não foi configurada.
    if (semEconomia > 0) {
      resumo.push(trecho('balanco__aviso', `${semEconomia} sem economia`));
    }
    this.resumo.replaceChildren(...resumo);

    const tabela = document.createElement('table');
    tabela.className = 'balanco__tabela';

    const cabeca = document.createElement('thead');
    const linhaCabeca = document.createElement('tr');
    for (const [i, c] of COLUNAS.entries()) {
      const th = document.createElement('th');
      th.textContent = c;
      if (i >= 2) th.className = 'balanco__numero';
      linhaCabeca.appendChild(th);
    }
    cabeca.appendChild(linhaCabeca);

    const corpo = document.createElement('tbody');
    for (const linha of vista.linhas) corpo.appendChild(this.linha(linha));

    const rodape = document.createElement('tfoot');
    rodape.appendChild(
      celulas([
        'total',
        '',
        moeda(somas.impostos),
        moeda(somas.producao),
        moeda(somas.comercio),
        moeda(somas.total),
      ]),
    );

    tabela.append(cabeca, corpo, rodape);
    this.corpo.replaceChildren(tabela);
  }

  private linha(linha: LinhaDoBalanco): HTMLTableRowElement {
    if (!linha.economia) {
      const tr = celulas([linha.nome, 'não configurada', '—', '—', '—', '—']);
      tr.dataset['sem'] = 'sim';
      return tr;
    }

    const e = linha.economia;
    // Incentivo e obra entram como marca no nome, não como colunas: seriam duas colunas
    // vazias na maior parte do tempo, e coluna vazia é o jeito mais caro de não informar.
    const marcas: string[] = [];
    if (e.bonus > 0) marcas.push(`incentivo +${Math.round(e.bonus * 100)}%`);
    if (linha.obra) {
      marcas.push(
        `${linha.obra.nome} em ${linha.obra.turnosRestantes}` +
          (linha.obra.turnosRestantes === 1 ? ' turno' : ' turnos'),
      );
    }
    const nome = marcas.length > 0 ? `${linha.nome} · ${marcas.join(' · ')}` : linha.nome;

    const tr = celulas([
      nome,
      `${e.produto} ${romano(e.nivel)}`,
      moeda(e.impostos),
      moeda(e.producao),
      moeda(e.comercio),
      moeda(e.total),
    ]);
    if (linha.construcoes.length > 0) {
      definirTooltip(tr, {
        titulo: 'Construções erguidas',
        corpo: linha.construcoes.join(' · '),
      });
    }
    return tr;
  }
}

function celulas(valores: readonly string[]): HTMLTableRowElement {
  const tr = document.createElement('tr');
  for (const [i, v] of valores.entries()) {
    const td = document.createElement('td');
    td.textContent = v;
    // Da terceira coluna em diante é dinheiro: alinhado à direita, pra comparar a coluna
    // de cima a baixo sem ler número por número.
    if (i >= 2) td.className = 'balanco__numero';
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

function romano(nivel: number): string {
  return ['I', 'II', 'III', 'IV', 'V'][nivel - 1] ?? String(nivel);
}
