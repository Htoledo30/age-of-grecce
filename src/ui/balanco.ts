/**
 * Aba de balanço: a contabilidade do reino, província por província.
 *
 * Existe porque os totais **não pertencem a província nenhuma**. Tesouro, renda do
 * estado e — em breve — despesa de exército não cabem na ficha de um território, e a
 * barra de turno só tem espaço pra um número sem dizer de onde ele vem.
 *
 * **Aqui é o único lugar onde impostos, produção e trânsito aparecem separados.** Na
 * ficha da província eles eram ruído: informação de contador competindo com a identidade
 * do território. A ficha diz o que o lugar é; esta tabela diz quanto ele rende.
 */

import { formatarAno } from '@/campanha/estado-campanha';
import type { AbaDoGoverno } from './governo';
import { definirTooltip } from './tooltip';

/** Uma linha da tabela: uma província do jogador. */
export interface LinhaDoBalanco {
  nome: string;
  /** É a sede do governo. Vira marca no nome, não coluna: só uma linha a tem. */
  capital: boolean;
  /** `null` quando a província ainda não tem economia configurada. */
  economia: {
    produto: string;
    nivel: number;
    impostos: number;
    producao: number;
    transito: number;
    /** Folha das construções erguidas. É o que faz o total ser líquido. */
    manutencao: number;
    total: number;
    /** O que a tropa NASCIDA nesta terra custa por turno, onde quer que esteja. */
    tropa: number;
    /** O veredito da terra: renda líquida menos a tropa dela. Negativo puxa o reino. */
    saldo: number;
    /** O nível de imposto decretado. Vira marca no nome quando não é o normal. */
    imposto: 'baixo' | 'normal' | 'alto';
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
  /**
   * O que a rede de trocas acrescenta por turno.
   *
   * ⚠️ **Não cabe em linha nenhuma da tabela**, e é por isso que ela nunca fecha sozinha
   * com a renda do reino: a rede existe porque o reino alcança bens DISTINTOS, não porque
   * alguma terra os produziu. O rodapé soma as terras; o resumo soma o reino. Detalhe na
   * aba Mercado.
   */
  trocas: number;
}

const COLUNAS = [
  'província',
  'produção',
  'impostos',
  'produz',
  'trânsito',
  'manutenção',
  'renda',
  'tropa',
  'saldo',
] as const;

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
    const somas = {
      impostos: 0,
      producao: 0,
      transito: 0,
      manutencao: 0,
      total: 0,
      tropa: 0,
      saldo: 0,
    };
    for (const l of vista.linhas) {
      if (!l.economia) continue;
      somas.impostos += l.economia.impostos;
      somas.producao += l.economia.producao;
      somas.transito += l.economia.transito;
      somas.manutencao += l.economia.manutencao;
      somas.total += l.economia.total;
      somas.tropa += l.economia.tropa;
      somas.saldo += l.economia.saldo;
    }

    const semEconomia = vista.linhas.filter((l) => l.economia === null).length;
    const doReino = somas.total + vista.trocas;
    const resumo = [
      trecho('balanco__poder', vista.poder.nome),
      trecho('balanco__dado', formatarAno(vista.ano)),
      trecho('balanco__dado', `turno ${vista.turno}`),
      trecho('balanco__ouro', `${moeda(vista.tesouro)} moedas`),
      trecho('balanco__dado', `terras ${comSinal(somas.total)}`),
      trecho('balanco__dado', `rede +${moeda(vista.trocas)}`),
      // A renda pode ser negativa desde a manutenção de construção — o sinal é honesto.
      trecho(
        doReino < 0 ? 'balanco__aviso' : 'balanco__ouro',
        `${comSinal(doReino)} por turno`,
      ),
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

    // ⚠️ O rodapé diz "total das TERRAS", não "renda do reino": a rede de trocas não cabe
    // numa tabela província a província. Chamá-lo de total faria a soma parecer errada.
    const rodape = document.createElement('tfoot');
    rodape.appendChild(
      celulas([
        'total das terras',
        '',
        moeda(somas.impostos),
        moeda(somas.producao),
        moeda(somas.transito),
        somas.manutencao > 0 ? `−${moeda(somas.manutencao)}` : '0',
        moeda(somas.total),
        somas.tropa > 0 ? `−${moeda(somas.tropa)}` : '0',
        comSinal(somas.saldo),
      ]),
    );

    tabela.append(cabeca, corpo, rodape);
    this.corpo.replaceChildren(tabela);
  }

  private linha(linha: LinhaDoBalanco): HTMLTableRowElement {
    const nomeComSede = linha.capital ? `${linha.nome} · capital` : linha.nome;
    if (!linha.economia) {
      const tr = celulas([nomeComSede, 'não configurada', '—', '—', '—', '—', '—', '—', '—']);
      tr.dataset['sem'] = 'sim';
      return tr;
    }

    const e = linha.economia;
    // Incentivo e obra entram como marca no nome, não como colunas: seriam duas colunas
    // vazias na maior parte do tempo, e coluna vazia é o jeito mais caro de não informar.
    const marcas: string[] = [];
    if (linha.capital) marcas.push('capital');
    if (e.imposto !== 'normal') marcas.push(`imposto ${e.imposto}`);
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
      moeda(e.transito),
      e.manutencao > 0 ? `−${moeda(e.manutencao)}` : '0',
      moeda(e.total),
      e.tropa > 0 ? `−${moeda(e.tropa)}` : '0',
      comSinal(e.saldo),
    ]);
    // Província no vermelho não é defeito: é o aviso de que ela pesa no reino — e o
    // veredito inclui a tropa que ela pôs em armas, não só a renda da terra.
    if (e.saldo < 0) tr.dataset['tom'] = 'deficit';
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

function comSinal(valor: number): string {
  return valor >= 0 ? `+${moeda(valor)}` : `−${moeda(-valor)}`;
}

function romano(nivel: number): string {
  return ['I', 'II', 'III', 'IV', 'V'][nivel - 1] ?? String(nivel);
}
