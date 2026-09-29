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
import type { CategoriaAlimentar } from '@/producao/alimentacao';
import type { NomeDoIconeGrego } from './icones-gregos';
import { iconeGrego, rotularComIcone } from './icones-gregos';
import { nomeDaCategoria } from './balanco-alimentar';
import { criarEstandarte } from './estandartes';
import { definirTooltip, removerTooltip } from './tooltip';
import { milhar } from '@/nucleo/numeros';

export interface VistaDoTurno {
  poder: { id: string; nome: string; cor: string };
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
  saldoDeComida: number;
  categoriaDeComida: CategoriaAlimentar;
  provincias: number;
  /** A capital caiu e o jogador ainda não escolheu outra: a virada fica travada. */
  capitalPerdida: boolean;
  /**
   * Quantos reinos estão te pedindo alguma coisa nesta virada.
   *
   * ⚠️ **Vai na barra e não só dentro da janela**, senão o jogador teria de abrir a aba de
   * Diplomacia todo turno para descobrir se alguém falou com ele — e não abriria.
   */
  pedidos: number;
}

export class BarraTurno {
  private readonly raiz = document.createElement('div');
  private readonly nacao = document.createElement('section');
  private readonly cabecalhoNacao = document.createElement('div');
  private readonly tesouro = document.createElement('p');
  private readonly controleTurno = document.createElement('section');
  private readonly cronologia = document.createElement('p');
  private readonly estandarte = document.createElement('span');
  /**
   * O aviso da capital caída, colado no botão que ele trava.
   *
   * ⚠️ **Existe porque os três avisos que já existiam somem.** O botão desabilita, ganha
   * tooltip e a crônica escreve a linha — e mesmo assim Henrique jogando ficou *"uns 30
   * segundos sem entender por que não conseguia fazer nada"*. E é fácil ver por quê: a crônica
   * fecha no × e não volta, e o tooltip exige o ponteiro parado em cima de um botão apagado,
   * que é o último lugar onde alguém pousa o mouse. Sobrava um botão morto e uma tela muda.
   *
   * Este fica. Mora ao lado do botão travado — onde o olho vai quando o clique não faz nada —
   * e diz as três coisas que ele pediu: **o que aconteceu**, **o que fazer** e **o que está
   * bloqueado até lá**.
   */
  private readonly avisoCapital = document.createElement('p');
  private readonly botao = document.createElement('button');
  private readonly botaoGoverno = document.createElement('button');
  private readonly botaoDiplomacia = document.createElement('button');

  /** Chamado quando o jogador manda passar o turno. */
  aoPassarTurno: () => void = () => {};
  /** Chamado quando o jogador abre a janela de governo. */
  aoAbrirGoverno: () => void = () => {};
  /**
   * ⚠️ **Botão próprio, ao lado do Governo, e é decisão de Henrique.** O Governo responde
   * "como o reino se sustenta"; paz e guerra não são contabilidade — são a decisão que ABRE o
   * resto do jogo. Sem guerra declarada a ordem de marcha recusa, e esconder isso a dois
   * cliques dentro de outra janela faria o jogador procurar o que ele precisa antes de tudo.
   */
  aoAbrirDiplomacia: () => void = () => {};

  constructor(pai: HTMLElement) {
    this.raiz.className = 'barra-turno';
    this.raiz.hidden = true;

    this.nacao.className = 'barra-turno__nacao';
    this.cabecalhoNacao.className = 'barra-turno__cabecalho-nacao';
    this.tesouro.className = 'barra-turno__tesouro';
    this.controleTurno.className = 'barra-turno__controle';
    this.cronologia.className = 'barra-turno__cronologia';
    this.estandarte.className = 'barra-turno__estandarte';

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
      titulo: 'Governo',
      corpo: 'Balanços do reino e das províncias.',
    });
    this.botaoGoverno.addEventListener('click', () => {
      this.aoAbrirGoverno();
      this.botaoGoverno.blur();
    });

    this.botaoDiplomacia.className = 'botao barra-turno__governo';
    this.botaoDiplomacia.type = 'button';
    // ⚠️ A CORUJA, e não a lança. A lança é o ícone da guerra em todo o resto do jogo — marcha,
    // cerco, batalha, crônica —, e esta tela é sobre paz E guerra: pôr a lança nela seria dizer
    // ao jogador que o botão só serve para atacar. A coruja é de Atena: conselho.
    rotularComIcone(this.botaoDiplomacia, 'coruja', 'Diplomacia');
    definirTooltip(this.botaoDiplomacia, {
      titulo: 'Diplomacia',
      corpo: 'Com quem você está em paz e em guerra. Marchar em terra alheia exige guerra.',
    });
    this.botaoDiplomacia.addEventListener('click', () => {
      this.aoAbrirDiplomacia();
      this.botaoDiplomacia.blur();
    });

    this.cabecalhoNacao.append(this.estandarte, this.botaoGoverno, this.botaoDiplomacia);
    this.nacao.append(this.cabecalhoNacao, this.tesouro);
    this.avisoCapital.className = 'barra-turno__aviso-capital';
    this.avisoCapital.hidden = true;
    // Região viva: quem usa leitor de tela ouve o impedimento no instante em que ele nasce,
    // sem ter de varrer a tela procurando o que mudou.
    this.avisoCapital.setAttribute('role', 'status');

    this.controleTurno.append(this.cronologia, this.botao);
    this.raiz.append(this.nacao, this.avisoCapital, this.controleTurno);
    pai.appendChild(this.raiz);
  }

  /** `null` esconde a barra — é o estado antes de escolher um poder. */
  mostrar(vista: VistaDoTurno | null): void {
    if (!vista) {
      this.raiz.hidden = true;
      return;
    }
    this.estandarte.replaceChildren(criarEstandarte(vista.poder, 'reino'));
    const identidade = document.createElement('span');
    identidade.className = 'barra-turno__identidade-poder';
    identidade.append(
      trecho('barra-turno__poder', vista.poder.nome),
      trecho(
        'barra-turno__provincias',
        `${vista.provincias} ${vista.provincias === 1 ? 'província' : 'províncias'}`,
      ),
    );
    this.botaoDiplomacia.dataset['pedidos'] = vista.pedidos > 0 ? 'sim' : 'nao';
    rotularComIcone(
      this.botaoDiplomacia,
      'coruja',
      vista.pedidos > 0 ? `Diplomacia · ${vista.pedidos}` : 'Diplomacia',
    );
    this.cabecalhoNacao.replaceChildren(
      this.estandarte,
      identidade,
      this.botaoGoverno,
      this.botaoDiplomacia,
    );
    this.tesouro.replaceChildren(trechoTesouro(vista));
    this.cronologia.replaceChildren(
      trecho('barra-turno__dado', formatarAno(vista.ano)),
      trecho('barra-turno__dado', `rodada ${vista.turno}`),
    );
    // A capital caída trava o botão, e o botão DIZ por quê: sumir com ele deixaria o
    // jogador preso sem saber o que o jogo está esperando.
    this.botao.disabled = vista.capitalPerdida;
    this.raiz.dataset['capitalPerdida'] = vista.capitalPerdida ? 'sim' : 'nao';
    this.avisoCapital.hidden = !vista.capitalPerdida;
    if (vista.capitalPerdida) {
      // As três frases que ele pediu, nesta ordem: o que aconteceu, o que fazer, o que está
      // travado. `replaceChildren` e não `textContent` porque a primeira precisa de peso
      // próprio — um parágrafo cinzento uniforme se lê como rodapé, e isto não é rodapé.
      const titulo = document.createElement('strong');
      titulo.textContent = 'A capital caiu.';
      const ordem = document.createElement('span');
      ordem.textContent =
        ' Selecione uma província sua e use “Assentar a capital aqui”. O turno não passa até lá.';
      this.avisoCapital.replaceChildren(titulo, ordem);
      definirTooltip(this.botao, {
        titulo: 'A capital caiu',
        corpo: 'Selecione uma província sua e assente a nova capital.',
        tom: 'bloqueio',
      });
    } else {
      removerTooltip(this.botao);
    }
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
  saldo.textContent = milhar(vista.tesouro);
  // Ganho em verde e folha em vermelho, cada um com a sua cor: o parêntese único com os dois
  // números na cor do ouro não dizia qual entrava e qual saía.
  const ganho = document.createElement('span');
  ganho.className = 'barra-turno__variacao';
  ganho.dataset['tom'] = 'ganho';
  ganho.textContent = `+${milhar(vista.renda)}`;
  valores.append(saldo, ganho);
  if (vista.manutencao > 0) {
    const perda = document.createElement('span');
    perda.className = 'barra-turno__variacao';
    perda.dataset['tom'] = 'perda';
    perda.textContent = `−${milhar(vista.manutencao)}`;
    valores.append(perda);
  }
  linha.append(iconeGrego('moeda'), valores);
  const variacaoLiquida = vista.renda - vista.manutencao;
  definirTooltip(linha, {
    titulo: 'Tesouro do reino',
    corpo:
      `+${milhar(vista.renda)} províncias` +
      (vista.manutencao > 0
        ? `\n−${milhar(vista.manutencao)} exército`
        : '') +
      `\n= ${comSinal(variacaoLiquida)} por turno`,
    tom: variacaoLiquida < 0 ? 'perigo' : 'informacao',
  });

  const comida = document.createElement('span');
  comida.className = 'barra-turno__folego rotulo-com-icone';
  comida.dataset['tom'] =
    vista.saldoDeComida < 0 ? 'fome' : vista.saldoDeComida === 0 ? 'aperto' : 'folga';
  const saldoDeComida = document.createElement('strong');
  saldoDeComida.className = 'barra-turno__folego-valor';
  saldoDeComida.textContent =
    vista.saldoDeComida >= 0 ? `+${vista.saldoDeComida}` : `−${-vista.saldoDeComida}`;
  const categoria = document.createElement('span');
  categoria.className = 'barra-turno__folego-unidade';
  categoria.textContent = nomeDaCategoria(vista.categoriaDeComida);
  comida.append(iconeGrego('celeiro'), saldoDeComida, categoria);
  definirTooltip(comida, {
    titulo: `${comSinal(vista.saldoDeComida)} · ${nomeDaCategoria(vista.categoriaDeComida)}`,
    corpo: 'Conta completa em Governo › Alimentação.',
    tom: vista.saldoDeComida < 0 ? 'perigo' : 'informacao',
  });

  const bloco = document.createElement('span');
  bloco.className = 'barra-turno__contas';
  bloco.append(linha, comida);
  bloco.setAttribute(
    'aria-label',
      `Tesouro ${vista.tesouro}; renda ${vista.renda}; manutenção ${vista.manutencao}; ` +
      `comida ${vista.saldoDeComida}; ${nomeDaCategoria(vista.categoriaDeComida)}`,
  );
  return bloco;
}

function comSinal(valor: number): string {
  const numero = milhar(Math.abs(valor));
  return valor >= 0 ? `+${numero}` : `−${numero}`;
}

function trecho(classe: string, texto: string, icone?: NomeDoIconeGrego): HTMLElement {
  const span = document.createElement('span');
  span.className = classe;
  if (icone) rotularComIcone(span, icone, texto);
  else span.textContent = texto;
  return span;
}
