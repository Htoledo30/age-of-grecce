/**
 * A barra de turno: o estado da campanha, no topo, sempre à vista.
 *
 * Terceira região da interface, e o critério que a justifica é o mesmo de sempre —
 * o painel da direita é o que o jogador **aciona**, a ficha embaixo à esquerda é o que
 * ele **escolheu**, e esta barra é **em que pé a campanha está**. Coisa que se consulta
 * a cada decisão não pode morar atrás de painel recolhível.
 *
 * Fica escondida até a campanha começar: antes disso não há ano, turno nem tesouro.
 */

import { formatarAno } from '@/campanha/estado-campanha';
import type { NomeDoIconeGrego } from './icones-gregos';
import { iconeGrego, rotularComIcone } from './icones-gregos';
import { definirTooltip } from './tooltip';

export interface VistaDoTurno {
  poder: { nome: string; cor: string };
  ano: number;
  turno: number;
  tesouro: number;
  renda: number;
  /**
   * O que a tropa custa por turno.
   *
   * Vai na barra junto com a renda, e não escondido no Governo, porque é a única despesa
   * recorrente do jogo: sem ela visível, o jogador vê o tesouro parar de crescer e não
   * tem como saber que foi o exército que comeu.
   */
  manutencao: number;
  provincias: number;
}

export class BarraTurno {
  private readonly raiz = document.createElement('div');
  private readonly nacao = document.createElement('section');
  private readonly cabecalhoNacao = document.createElement('div');
  private readonly tesouro = document.createElement('p');
  private readonly controleTurno = document.createElement('section');
  private readonly cronologia = document.createElement('p');
  private readonly tinta = document.createElement('span');
  private readonly botao = document.createElement('button');
  private readonly botaoGoverno = document.createElement('button');

  /** Chamado quando o jogador manda passar o turno. */
  aoPassarTurno: () => void = () => {};
  /** Chamado quando o jogador abre a janela de governo. */
  aoAbrirGoverno: () => void = () => {};

  constructor(pai: HTMLElement) {
    this.raiz.className = 'barra-turno';
    this.raiz.hidden = true;

    this.nacao.className = 'barra-turno__nacao';
    this.cabecalhoNacao.className = 'barra-turno__cabecalho-nacao';
    this.tesouro.className = 'barra-turno__tesouro';
    this.controleTurno.className = 'barra-turno__controle';
    this.cronologia.className = 'barra-turno__cronologia';
    this.tinta.className = 'barra-turno__tinta';

    this.botao.className = 'botao botao--principal';
    this.botao.type = 'button';
    rotularComIcone(this.botao, 'turno', 'Passar o turno ▸');
    this.botao.addEventListener('click', () => {
      this.aoPassarTurno();
      // Sem isto o botão fica com o foco e a barra de espaço, que também passa o turno,
      // dispara o clique sintético do navegador ALÉM do atalho — o turno andaria dois.
      this.botao.blur();
    });

    // O governo mora aqui porque esta barra JÁ é a do estado nacional: é onde a mão vai
    // procurar por tesouro, renda e o que mais diga respeito ao reino inteiro.
    this.botaoGoverno.className = 'botao barra-turno__governo';
    this.botaoGoverno.type = 'button';
    rotularComIcone(this.botaoGoverno, 'templo', 'Governo');
    definirTooltip(this.botaoGoverno, {
      titulo: 'Conselho de governo',
      corpo: 'Abra o balanço do reino e examine cada província.',
    });
    this.botaoGoverno.addEventListener('click', () => {
      this.aoAbrirGoverno();
      this.botaoGoverno.blur();
    });

    this.cabecalhoNacao.append(this.tinta, this.botaoGoverno);
    this.nacao.append(this.cabecalhoNacao, this.tesouro);
    this.controleTurno.append(this.cronologia, this.botao);
    this.raiz.append(this.nacao, this.controleTurno);
    pai.appendChild(this.raiz);
  }

  /** `null` esconde a barra — é o estado antes de escolher um poder. */
  mostrar(vista: VistaDoTurno | null): void {
    if (!vista) {
      this.raiz.hidden = true;
      return;
    }
    this.tinta.style.background = vista.poder.cor;
    const identidade = document.createElement('span');
    identidade.className = 'barra-turno__identidade-poder';
    identidade.append(
      trecho('barra-turno__poder', vista.poder.nome),
      trecho(
        'barra-turno__provincias',
        `${vista.provincias} ${vista.provincias === 1 ? 'província' : 'províncias'}`,
      ),
    );
    this.cabecalhoNacao.replaceChildren(this.tinta, identidade, this.botaoGoverno);
    this.tesouro.replaceChildren(trechoTesouro(vista));
    this.cronologia.replaceChildren(
      trecho('barra-turno__dado', formatarAno(vista.ano)),
      trecho('barra-turno__dado', `rodada ${vista.turno}`),
    );
    this.raiz.hidden = false;
  }
}

function trechoTesouro(vista: VistaDoTurno): HTMLElement {
  const linha = document.createElement('span');
  linha.className = 'barra-turno__ouro rotulo-com-icone';

  const valores = document.createElement('span');
  valores.className = 'barra-turno__valores';
  const saldo = document.createElement('strong');
  saldo.className = 'barra-turno__saldo';
  saldo.textContent = String(vista.tesouro);
  const variacao = document.createElement('span');
  variacao.className = 'barra-turno__variacao';
  variacao.textContent =
    vista.manutencao > 0 ? `(+${vista.renda} −${vista.manutencao})` : `(+${vista.renda})`;

  valores.append(saldo, variacao);
  linha.append(iconeGrego('moeda'), valores);
  linha.setAttribute(
    'aria-label',
    `Tesouro ${vista.tesouro}; renda ${vista.renda}; manutenção ${vista.manutencao}`,
  );
  return linha;
}

function trecho(classe: string, texto: string, icone?: NomeDoIconeGrego): HTMLElement {
  const span = document.createElement('span');
  span.className = classe;
  if (icone) rotularComIcone(span, icone, texto);
  else span.textContent = texto;
  return span;
}
