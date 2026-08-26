/**
 * A DIPLOMACIA — janela própria, botão próprio, ao lado do Governo.
 *
 * Não é aba do Governo, e a decisão é de Henrique. O Governo responde *"como o reino se
 * sustenta"* — balanço, comida, mercado —, e paz e guerra não são contabilidade: são a decisão
 * que ABRE o resto do jogo. Ela é a única tela que é pré-requisito de outra — sem guerra
 * declarada a ordem de marcha recusa —, e esconder isso a dois cliques dentro de outra janela
 * faria o jogador procurar justamente o que ele precisa antes de tudo.
 *
 * ## Por que LISTA à esquerda e DOSSIÊ à direita
 *
 * ⚠️ **Porque a pergunta do jogador é sempre "o que eu faço com Corinto?"** — reino primeiro,
 * ação depois. Nunca "quem eu posso aliar?". A tela tem que ser nessa ordem.
 *
 * Hoje existe uma ação só, e uma tabela chapada com um botão por linha resolveria. Ela foi
 * recusada de propósito: no dia em que houver aliança, trégua, tributo, pacto de não-agressão
 * e presente, a tabela vira oito colunas de botão e a tela tem que ser refeita com oito ações
 * dentro dela. **Neste formato, cada ação nova é uma LINHA no painel da direita** — e o painel
 * tem espaço para o que torna diplomacia interessante: o custo, a chance, e o que eles acham
 * de você.
 *
 * Abas por TIPO de ação ("guerra", "comércio") foram recusadas pelo mesmo motivo: respondem a
 * pergunta ao contrário, e obrigariam a procurar Corinto em quatro lugares.
 *
 * ⚠️ **Só entram os VIZINHOS.** São 139 poderes no mapa; uma lista com todos seria uma lista
 * telefônica onde o jogador procura um nome em vez de decidir. Quem faz fronteira com você é
 * com quem a guerra é possível hoje — e é a mesma vizinhança que a hoste enxerga.
 */

import { rotularComIcone } from './icones-gregos';
import { definirTooltip } from './tooltip';

/** Um vizinho na lista, do ponto de vista do jogador. */
export interface VizinhoNaDiplomacia {
  id: string;
  nome: string;
  emGuerra: boolean;
  /** Turnos que ainda faltam de trégua, ou 0 quando não há trégua. */
  tregoa: number;
  /** Províncias dele que fazem fronteira com você, por nome. */
  fronteira: readonly string[];
  /** Homens em armas que ele tem no mundo. É público: hostes estão no mapa. */
  exercito: number;
}

export interface VistaDaDiplomacia {
  vizinhos: readonly VizinhoNaDiplomacia[];
  /** Quantas guerras o jogador tem em curso, contando as de quem não é vizinho. */
  guerras: number;
}

export class Diplomacia {
  /** A tela avisa; quem decide é a aplicação, que tem a campanha e a IA na mão. */
  aoDeclararGuerra: (idPoder: string) => void = () => {};
  aoProporPaz: (idPoder: string) => void = () => {};

  private readonly fundo = document.createElement('div');
  private readonly resumo = document.createElement('p');
  private readonly lista = document.createElement('nav');
  private readonly dossie = document.createElement('div');
  private readonly aviso = document.createElement('p');
  private aberta = false;
  /** Com quem o jogador está falando. `null` antes de a lista existir. */
  private escolhido: string | null = null;
  /**
   * A última vista desenhada.
   *
   * ⚠️ **Trocar de interlocutor é decisão da TELA, e não do mundo.** Nada muda nas regras
   * quando o jogador clica noutro nome — pedir um redesenho à aplicação salvaria o jogo e
   * repintaria o mapa por causa disso. Com a vista guardada, a janela redesenha a si mesma.
   */
  private ultima: VistaDaDiplomacia = { vizinhos: [], guerras: 0 };

  constructor(pai: HTMLElement) {
    this.fundo.className = 'diplomacia';
    this.fundo.hidden = true;
    // Clicar fora fecha, mas só quando o alvo é o FUNDO: sem esta checagem qualquer clique
    // dentro da janela borbulharia até aqui e a fecharia na cara do jogador.
    this.fundo.addEventListener('click', (e) => {
      if (e.target === this.fundo) this.fechar();
    });

    const janela = document.createElement('section');
    janela.className = 'diplomacia__janela';

    const barra = document.createElement('div');
    barra.className = 'diplomacia__barra';
    const titulo = document.createElement('h2');
    titulo.className = 'diplomacia__titulo';
    rotularComIcone(titulo, 'coruja', 'Diplomacia');
    const fechar = document.createElement('button');
    fechar.className = 'diplomacia__fechar';
    fechar.type = 'button';
    fechar.textContent = '×';
    fechar.setAttribute('aria-label', 'Fechar diplomacia');
    definirTooltip(fechar, { titulo: 'Fechar', corpo: 'Atalho: Esc' });
    fechar.addEventListener('click', () => this.fechar());
    barra.append(titulo, fechar);

    this.resumo.className = 'diplomacia__resumo';
    this.lista.className = 'diplomacia__lista';
    this.dossie.className = 'diplomacia__dossie';
    this.aviso.className = 'diplomacia__aviso';

    const conteudo = document.createElement('div');
    conteudo.className = 'diplomacia__conteudo';
    conteudo.dataset['painel'] = 'diplomacia';
    const colunas = document.createElement('div');
    colunas.className = 'diplomacia__colunas';
    colunas.append(this.lista, this.dossie);
    conteudo.append(this.resumo, colunas);

    janela.append(barra, conteudo);
    this.fundo.appendChild(janela);
    pai.appendChild(this.fundo);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.aberta) this.fechar();
    });
  }

  alternar(): void {
    if (this.aberta) this.fechar();
    else this.abrir();
  }

  abrir(): void {
    this.aberta = true;
    this.fundo.hidden = false;
  }

  fechar(): void {
    this.aberta = false;
    this.fundo.hidden = true;
    // A resposta da última proposta é da conversa que acabou: reabrir não a remostra.
    this.aviso.textContent = '';
  }

  /** Abre já falando com este reino. É por onde um atalho pelo mapa entraria. */
  falarCom(idPoder: string): void {
    this.escolhido = idPoder;
    this.abrir();
  }

  /** A resposta da última proposta, para o jogador não ficar no escuro. */
  dizer(texto: string): void {
    this.aviso.textContent = texto;
  }

  desenhar(vista: VistaDaDiplomacia): void {
    this.ultima = vista;
    // ⚠️ **A escolha sobrevive ao redesenho.** A tela inteira é redesenhada a cada mudança de
    // estado, e declarar guerra é uma mudança de estado: sem isto, o painel voltaria para o
    // primeiro da lista no instante em que o jogador clicasse no botão dele.
    const nomes = new Set(vista.vizinhos.map((v) => v.id));
    if (this.escolhido === null || !nomes.has(this.escolhido)) {
      this.escolhido = vista.vizinhos[0]?.id ?? null;
    }

    this.resumo.textContent =
      vista.guerras === 0
        ? `em paz com o mundo · ${vista.vizinhos.length} vizinhos`
        : `${vista.guerras} ${vista.guerras === 1 ? 'guerra em curso' : 'guerras em curso'} · ${vista.vizinhos.length} vizinhos`;

    this.lista.replaceChildren(...vista.vizinhos.map((v) => this.linhaDe(v)));
    const escolhido = vista.vizinhos.find((v) => v.id === this.escolhido);
    this.dossie.replaceChildren(...(escolhido ? this.paginaDe(escolhido) : []));
    this.dossie.appendChild(this.aviso);
  }

  /** Um nome na lista da esquerda. Guerra fica visível sem precisar ler. */
  private linhaDe(vizinho: VizinhoNaDiplomacia): HTMLButtonElement {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'diplomacia__nome';
    botao.dataset['poder'] = vizinho.id;
    botao.dataset['relacao'] = vizinho.emGuerra ? 'guerra' : 'paz';
    botao.dataset['escolhido'] = vizinho.id === this.escolhido ? 'sim' : 'nao';
    botao.textContent = vizinho.nome;
    botao.addEventListener('click', () => {
      this.escolhido = vizinho.id;
      // Trocar de interlocutor apaga a resposta do anterior: ela era daquela conversa.
      this.aviso.textContent = '';
      this.desenhar(this.ultima);
    });
    return botao;
  }

  /** O dossiê da direita: quem ele é, e o que dá para fazer com ele. */
  private paginaDe(vizinho: VizinhoNaDiplomacia): readonly HTMLElement[] {
    const titulo = document.createElement('h3');
    titulo.className = 'diplomacia__reino';
    titulo.textContent = vizinho.nome;

    const relacao = document.createElement('p');
    relacao.className = 'diplomacia__relacao';
    relacao.dataset['relacao'] = vizinho.emGuerra ? 'guerra' : 'paz';
    relacao.textContent = vizinho.emGuerra
      ? 'Em guerra com você'
      : vizinho.tregoa > 0
        ? `Em paz · trégua por mais ${vizinho.tregoa} ${vizinho.tregoa === 1 ? 'turno' : 'turnos'}`
        : 'Em paz com você';

    const fatos = document.createElement('p');
    fatos.className = 'diplomacia__fatos';
    fatos.textContent =
      `${vizinho.exercito.toLocaleString('pt-BR')} homens em armas · ` +
      `fronteira: ${vizinho.fronteira.join(', ')}`;

    const acoes = document.createElement('div');
    acoes.className = 'diplomacia__acoes';
    acoes.appendChild(this.acaoDe(vizinho));

    return [titulo, relacao, fatos, acoes];
  }

  private acaoDe(vizinho: VizinhoNaDiplomacia): HTMLButtonElement {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'diplomacia__acao';
    botao.dataset['acao'] = vizinho.emGuerra ? 'paz' : 'guerra';
    if (vizinho.emGuerra) {
      botao.textContent = 'Propor paz';
      definirTooltip(botao, {
        titulo: `Propor paz a ${vizinho.nome}`,
        corpo: 'A paz precisa dos dois. Quem está ganhando costuma recusar.',
      });
      botao.addEventListener('click', () => this.aoProporPaz(vizinho.id));
      return botao;
    }
    botao.textContent = 'Declarar guerra';
    // ⚠️ A trégua DESABILITA em vez de sumir com o botão: um controle que desaparece manda o
    // jogador procurar o que ele não achou, e a linha da relação já diz por que ele não pode.
    botao.disabled = vizinho.tregoa > 0;
    definirTooltip(botao, {
      titulo:
        vizinho.tregoa > 0 ? `Trégua com ${vizinho.nome}` : `Declarar guerra a ${vizinho.nome}`,
      corpo:
        vizinho.tregoa > 0
          ? `Ainda segura por ${vizinho.tregoa} ${vizinho.tregoa === 1 ? 'turno' : 'turnos'}.`
          : 'Sem guerra declarada, sua hoste não marcha sobre a terra dele.',
    });
    botao.addEventListener('click', () => this.aoDeclararGuerra(vizinho.id));
    return botao;
  }
}
