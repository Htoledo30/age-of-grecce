/**
 * A JANELA DE CONSTRUÇÕES: o catálogo desta província, com espaço para comparar.
 *
 * Saiu da coluna da esquerda porque lá não cabia. Oito construções numa grade de 380 px
 * viravam oito botões de uma linha, e uma linha só comporta nome e preço — o que a obra FAZ,
 * quanto rende e em quantos turnos se paga ficavam todos escondidos em tooltip. O jogador
 * escolhia por preço porque era a única coisa escrita.
 *
 * ⚠️ **Comparar é a decisão inteira.** Erguer a Ágora ou o Mercado não é escolher entre 3.065
 * e 3.065 moedas: é escolher entre multiplicar imposto e multiplicar produção, numa terra
 * que tem muito de um e pouco do outro. Numa janela larga cabem os dois lados da conta em
 * cada cartão, e a escolha passa a ser uma escolha. É o navegador de construções do Total
 * War e a gaveta de construções do EU4 — os dois tiram o catálogo do painel e o abrem em
 * superfície própria, pela mesma razão.
 */

import { Janela } from './janela';
import { definirTooltip, removerTooltip } from './tooltip';
import { iconeDaConstrucao, iconeGrego } from './icones-gregos';

/** Uma construção oferecida nesta província, já avaliada. */
export interface OpcaoDeConstrucao {
  id: string;
  nome: string;
  custo: number;
  /** Turnos de obra até render. */
  turnos: number;
  nivelAtual: number;
  nivelAlvo: number;
  nivelMaximo: number;
  /** Turnos que ainda faltam, quando esta é a obra em andamento. */
  emObra: number | null;
  /** `null` quando dá pra construir; senão, o texto do impedimento. */
  recusa: string | null;
  /** Pra que ela serve, em uma frase. */
  motivo: string;
  ganhoPorTurno: number;
  turnosParaPagar: number;
  /** Ouro por turno para manter o nível alvo de pé, para sempre. */
  manutencao: number;
  /** O efeito desta construção é renda em moeda? Decide como falar de ganho negativo. */
  rendeMoeda: boolean;
  /**
   * O benefício, escrito, quando não paga em ouro.
   *
   * Vazio nas que rendem moeda. Capacidade e população não têm "paga-se em N turnos".
   */
  promessa: string;
}

/** O que a janela precisa saber para desenhar o catálogo desta província. */
export interface VistaDeConstrucoes {
  provincia: { id: string; nome: string };
  /** A região a que ela pertence — a âncora da janela. O poder é sempre o jogador aqui. */
  regiao: string;
  slots: { usados: number; total: number };
  nivelMaximo: number;
  construcoes: readonly OpcaoDeConstrucao[];
  /** O ouro do reino agora: o que separa "cara" de "impossível". */
  tesouro: number;
}

export class JanelaDeConstrucoes {
  private readonly janela: Janela;
  private readonly resumo = document.createElement('div');
  private readonly grade = document.createElement('div');
  private vista: VistaDeConstrucoes | null = null;

  /** Chamado quando o jogador ergue uma construção. */
  aoConstruir: (idProvincia: string, idConstrucao: string) => void = () => {};

  constructor(pai: HTMLElement) {
    this.janela = new Janela(pai, 'Construções', 'martelo', '980px');
    this.resumo.className = 'construcoes__resumo';
    this.grade.className = 'construcoes__grade';
    this.janela.corpo.append(this.resumo, this.grade);
  }

  get visivel(): boolean {
    return this.janela.visivel;
  }

  /** Avisada quando a janela abre ou fecha, para a tela se redesenhar. */
  set aoAlternar(ouvinte: (aberta: boolean) => void) {
    this.janela.aoAlternar = ouvinte;
  }

  abrir(): void {
    this.janela.abrir();
  }

  fechar(): void {
    this.janela.fechar();
  }

  desenhar(vista: VistaDeConstrucoes | null): void {
    // Perder a província com a janela aberta a fecha: um catálogo sem terra a que pertencer
    // é uma janela mentindo. Acontece de verdade quando a província cai enquanto se lê.
    if (!vista) {
      this.fechar();
      return;
    }
    this.vista = vista;
    this.janela.dizer(`${vista.provincia.nome} · ${vista.regiao}`);

    const livres = vista.slots.total - vista.slots.usados;
    this.resumo.replaceChildren(
      dado('slots', `${vista.slots.usados} de ${vista.slots.total}`, livres === 0 ? 'cheio' : ''),
      dado('livres', livres === 0 ? 'nenhum' : String(livres), livres === 0 ? 'cheio' : ''),
      dado('tesouro', `${vista.tesouro.toLocaleString('pt-BR')} moedas`, ''),
      dado('níveis', `I a ${['I', 'II', 'III'][vista.nivelMaximo - 1] ?? vista.nivelMaximo}`, ''),
    );

    this.grade.replaceChildren(...vista.construcoes.map((o) => this.cartao(o)));
  }

  /**
   * Um cartão por construção: o que ela é, o que custa, e o que devolve.
   *
   * As três informações ficam em ALTURAS diferentes e sempre nas mesmas — é isso que deixa
   * varrer a grade comparando preço com preço e retorno com retorno, sem reler cada cartão
   * inteiro.
   */
  private cartao(opcao: OpcaoDeConstrucao): HTMLElement {
    const cartao = document.createElement('article');
    cartao.className = 'construcoes__cartao';
    const noMaximo = opcao.nivelAtual >= opcao.nivelMaximo;
    const estado = noMaximo
      ? 'maximo'
      : opcao.emObra !== null
        ? 'obra'
        : opcao.recusa
          ? 'bloqueada'
          : 'livre';
    cartao.dataset['estado'] = estado;

    const topo = document.createElement('header');
    topo.className = 'construcoes__topo';
    const nome = document.createElement('h3');
    nome.className = 'construcoes__nome';
    nome.textContent = opcao.nome;
    const identidade = document.createElement('div');
    identidade.className = 'construcoes__identidade';
    identidade.append(iconeGrego(iconeDaConstrucao(opcao.id), 'construcoes__icone'), nome);
    topo.append(identidade, degraus(opcao));

    // A promessa é cortada em duas linhas no cartão; o texto inteiro fica no tooltip, para
    // quem quiser o resto da frase. Cortar sem ter onde ler o fim seria esconder, não enxugar.
    const promessa = document.createElement('p');
    promessa.className = 'construcoes__promessa';
    promessa.textContent = opcao.promessa || opcao.motivo;
    definirTooltip(promessa, { titulo: opcao.nome, corpo: opcao.promessa || opcao.motivo });

    cartao.append(topo, promessa, this.conta(opcao, estado), this.acao(opcao, estado));
    return cartao;
  }

  /** A conta da obra: o que sai agora, o que sai todo turno, e o que volta. */
  private conta(opcao: OpcaoDeConstrucao, estado: string): HTMLElement {
    const conta = document.createElement('dl');
    conta.className = 'construcoes__conta';
    if (estado === 'maximo') {
      conta.append(par('nível', 'máximo alcançado'));
      if (opcao.manutencao > 0) {
        conta.append(par('manutenção', `−${moeda(opcao.manutencao)} por turno`));
      }
      return conta;
    }
    if (estado === 'obra') {
      const t = opcao.emObra ?? 0;
      conta.append(par('em obra', `${t} ${t === 1 ? 'turno' : 'turnos'} restantes`));
      return conta;
    }
    conta.append(par('custo', `${moeda(opcao.custo)} moedas`));
    conta.append(par('obra', `${opcao.turnos} ${opcao.turnos === 1 ? 'turno' : 'turnos'}`));
    if (opcao.manutencao > 0) conta.append(par('manutenção', `−${moeda(opcao.manutencao)}/turno`));
    if (opcao.ganhoPorTurno > 0) {
      conta.append(par('rende', `+${moeda(opcao.ganhoPorTurno)}/turno`, 'ganho'));
      if (Number.isFinite(opcao.turnosParaPagar)) {
        conta.append(par('paga-se em', `${Math.ceil(opcao.turnosParaPagar)} turnos`, 'ganho'));
      }
    } else if (opcao.rendeMoeda && opcao.ganhoPorTurno < 0) {
      conta.append(par('saldo local', `−${moeda(-opcao.ganhoPorTurno)}/turno`, 'perda'));
    }
    return conta;
  }

  /** O botão, ou a frase do impedimento no lugar dele. */
  private acao(opcao: OpcaoDeConstrucao, estado: string): HTMLElement {
    if (estado === 'maximo' || estado === 'obra') {
      const marca = document.createElement('p');
      marca.className = 'construcoes__estado';
      marca.textContent = estado === 'maximo' ? 'Nível máximo' : 'Obra em andamento';
      return marca;
    }
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'construcoes__erguer';
    const alvo = ['I', 'II', 'III'][opcao.nivelAlvo - 1] ?? String(opcao.nivelAlvo);
    botao.textContent =
      opcao.nivelAtual > 0 ? `Subir para ${alvo} · ${moeda(opcao.custo)}` : `Erguer · ${moeda(opcao.custo)}`;
    // ⚠️ **Sem ouro NÃO vira frase.** O botão dizia "faltam 2.065 moedas", e escrever a
    // subtração que o jogador consegue fazer sozinho — o custo está no cartão, o tesouro
    // está no alto da janela — é o jogo se explicando demais. O botão só apaga.
    const semOuro = this.vista !== null && opcao.custo > this.vista.tesouro;
    if (semOuro) {
      botao.disabled = true;
      botao.dataset['motivo'] = 'ouro';
      removerTooltip(botao);
      return botao;
    }
    if (opcao.recusa) {
      // As outras recusas o jogador NÃO consegue deduzir olhando: slot cheio, obra em
      // andamento, construção que exige outra. Estas ficam escritas, e curtas.
      botao.disabled = true;
      botao.dataset['motivo'] = 'regra';
      botao.textContent = opcao.recusa;
      removerTooltip(botao);
      return botao;
    }
    botao.addEventListener('click', () => {
      const vista = this.vista;
      if (!vista || botao.disabled) return;
      this.aoConstruir(vista.provincia.id, opcao.id);
      botao.blur();
    });
    return botao;
  }
}

/** Os degraus de nível: três pontos, acesos até onde a obra chegou. */
function degraus(opcao: OpcaoDeConstrucao): HTMLElement {
  const trilha = document.createElement('div');
  trilha.className = 'construcoes__degraus';
  trilha.setAttribute('aria-label', `nível ${opcao.nivelAtual} de ${opcao.nivelMaximo}`);
  for (let i = 1; i <= opcao.nivelMaximo; i++) {
    const ponto = document.createElement('span');
    ponto.className = 'construcoes__degrau';
    ponto.dataset['aceso'] = i <= opcao.nivelAtual ? 'sim' : 'nao';
    ponto.dataset['alvo'] = i === opcao.nivelAlvo && opcao.nivelAtual < opcao.nivelMaximo ? 'sim' : 'nao';
    trilha.appendChild(ponto);
  }
  return trilha;
}

function par(rotulo: string, valor: string, tom = ''): DocumentFragment {
  const fragmento = document.createDocumentFragment();
  const dt = document.createElement('dt');
  dt.textContent = rotulo;
  const dd = document.createElement('dd');
  dd.textContent = valor;
  if (tom) dd.dataset['tom'] = tom;
  fragmento.append(dt, dd);
  return fragmento;
}

function dado(rotulo: string, valor: string, tom: string): HTMLElement {
  const caixa = document.createElement('div');
  caixa.className = 'construcoes__dado';
  if (tom) caixa.dataset['tom'] = tom;
  const nome = document.createElement('span');
  nome.className = 'construcoes__dado-rotulo';
  nome.textContent = rotulo;
  const numero = document.createElement('strong');
  numero.textContent = valor;
  caixa.append(nome, numero);
  return caixa;
}

function moeda(valor: number): string {
  return valor.toLocaleString('pt-BR');
}
