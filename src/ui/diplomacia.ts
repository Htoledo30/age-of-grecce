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
  /** A opinião dele sobre você, de −100 a 100. Zero é indiferença. */
  relacao: number;
  /** A conta dessa opinião, linha a linha — a mesma legibilidade do humor do povo. */
  parcelas: readonly { rotulo: string; pontos: number }[];
  /**
   * Os presentes que dá para mandar agora, já cotados.
   *
   * ⚠️ **Cotados ANTES de o jogador pagar.** Ouro é o recurso mais escasso do jogo, e um botão
   * que tira do cofre sem dizer o que compra é um botão que ninguém aperta duas vezes. Vazia
   * quando não dá para presentear — em guerra, ou sem ouro.
   */
  presentes: readonly { ouro: number; pontos: number }[];
  /** Turnos que ainda faltam de pacto de não-agressão, ou 0 quando não há. */
  pacto: number;
  /** Os prazos de pacto oferecidos, com a opinião que cada um exige. */
  prazos: readonly { turnos: number; opiniaoMinima: number; pode: boolean }[];
  /** Já existe acordo de comércio com ele? */
  temAcordo: boolean;
  /** O que um acordo com ele renderia por turno, para cada um dos dois. */
  rendaDoAcordo: number;
  /** Dá para assinar agora? Vazio quando dá; o motivo quando não dá. */
  acordoBloqueado: string;
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
  aoPresentear: (idPoder: string, ouro: number) => void = () => {};
  aoFirmarPacto: (idPoder: string, turnos: number) => void = () => {};
  aoAcordarComercio: (idPoder: string) => void = () => {};
  aoDesfazerAcordo: (idPoder: string) => void = () => {};
  aoRomperPacto: (idPoder: string) => void = () => {};

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
    acoes.appendChild(this.comercio(vizinho));
    acoes.appendChild(this.pacto(vizinho));
    if (vizinho.presentes.length > 0) acoes.appendChild(this.presente(vizinho));

    return [titulo, relacao, this.opiniao(vizinho), fatos, acoes];
  }

  /**
   * A opinião e a conta dela, parcela a parcela.
   *
   * ⚠️ **A conta inteira fica à vista, como a do humor do povo e a da comida.** Um número de
   * −100 a 100 sem explicação é um número que o jogador acha injusto; com as parcelas, ele lê
   * "fronteira comum −15, você tomou Mégara −25" e sabe exatamente o que fazer a respeito.
   */
  private opiniao(vizinho: VizinhoNaDiplomacia): HTMLElement {
    const caixa = document.createElement('div');
    caixa.className = 'diplomacia__opiniao';

    const numero = document.createElement('p');
    numero.className = 'diplomacia__numero';
    numero.dataset['tom'] = vizinho.relacao > 15 ? 'bom' : vizinho.relacao < -15 ? 'ruim' : 'morno';
    numero.textContent = `opinião ${vizinho.relacao > 0 ? '+' : ''}${vizinho.relacao}`;

    const conta = document.createElement('ul');
    conta.className = 'diplomacia__parcelas';
    for (const parcela of vizinho.parcelas) {
      const linha = document.createElement('li');
      linha.dataset['tom'] = parcela.pontos >= 0 ? 'bom' : 'ruim';
      const rotulo = document.createElement('span');
      rotulo.textContent = parcela.rotulo;
      const pontos = document.createElement('span');
      pontos.className = 'diplomacia__pontos';
      pontos.textContent = `${parcela.pontos > 0 ? '+' : ''}${parcela.pontos}`;
      linha.append(rotulo, pontos);
      conta.appendChild(linha);
    }

    caixa.append(numero, conta);
    return caixa;
  }

  /**
   * O acordo de comércio: **a renda aparece ANTES de assinar.**
   *
   * ⚠️ Uma parcela de renda que ninguém sabe medir é uma parcela que o jogador ignora — e esta é
   * a que abre o caminho de quem quer jogar de economia sendo amigo de todo mundo. O número no
   * botão é o que ENTRA por turno, para os dois lados.
   */
  private comercio(vizinho: VizinhoNaDiplomacia): HTMLElement {
    const caixa = document.createElement('div');
    caixa.className = 'diplomacia__presentes';
    const rotulo = document.createElement('span');
    rotulo.className = 'diplomacia__rotulo';
    caixa.appendChild(rotulo);

    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'diplomacia__acao';
    if (vizinho.temAcordo) {
      rotulo.textContent = `Comércio: +${vizinho.rendaDoAcordo} por turno`;
      botao.dataset['acao'] = 'desfazer-acordo';
      botao.textContent = 'Encerrar comércio';
      definirTooltip(botao, {
        titulo: `Encerrar o comércio com ${vizinho.nome}`,
        corpo: 'Os dois perdem a renda. Não custa reputação: comércio não é promessa de paz.',
      });
      botao.addEventListener('click', () => this.aoDesfazerAcordo(vizinho.id));
    } else {
      rotulo.textContent = 'Comércio:';
      botao.dataset['acao'] = 'acordo';
      botao.textContent = `Acordo (+${vizinho.rendaDoAcordo} por turno)`;
      botao.disabled = vizinho.acordoBloqueado !== '';
      definirTooltip(botao, {
        titulo: `Acordo de comércio com ${vizinho.nome}`,
        corpo:
          vizinho.acordoBloqueado !== ''
            ? vizinho.acordoBloqueado
            : `Os dois passam a ganhar ${vizinho.rendaDoAcordo} por turno. A guerra desfaz.`,
      });
      botao.addEventListener('click', () => this.aoAcordarComercio(vizinho.id));
    }
    caixa.appendChild(botao);
    return caixa;
  }

  /**
   * O pacto de não-agressão: um botão por prazo, e o preço de cada um é CONFIANÇA.
   *
   * ⚠️ **Os prazos que ele ainda não confia em você aparecem desabilitados, dizendo quanto
   * falta.** Escondê-los tiraria do jogador a única informação que importa aqui: o que ele
   * ganharia se a opinião subisse. É o que transforma o presente numa entrada em vez de um
   * gasto — ele vê os 20 turnos trancados a +25 e sabe exatamente por que dar ouro.
   */
  private pacto(vizinho: VizinhoNaDiplomacia): HTMLElement {
    const caixa = document.createElement('div');
    caixa.className = 'diplomacia__presentes';

    if (vizinho.pacto > 0) {
      const rotulo = document.createElement('span');
      rotulo.className = 'diplomacia__rotulo';
      rotulo.textContent = `Pacto por mais ${vizinho.pacto} ${vizinho.pacto === 1 ? 'turno' : 'turnos'}`;
      const romper = document.createElement('button');
      romper.type = 'button';
      romper.className = 'diplomacia__acao';
      romper.dataset['acao'] = 'romper';
      romper.textContent = 'Romper o pacto';
      definirTooltip(romper, {
        titulo: `Romper o pacto com ${vizinho.nome}`,
        corpo: 'A opinião dele despenca e sua reputação cai com o mapa inteiro. Não é de graça.',
      });
      romper.addEventListener('click', () => this.aoRomperPacto(vizinho.id));
      caixa.append(rotulo, romper);
      return caixa;
    }

    const rotulo = document.createElement('span');
    rotulo.className = 'diplomacia__rotulo';
    rotulo.textContent = 'Pacto de não-agressão:';
    caixa.appendChild(rotulo);
    for (const prazo of vizinho.prazos) {
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'diplomacia__acao';
      botao.dataset['acao'] = 'pacto';
      botao.dataset['turnos'] = String(prazo.turnos);
      botao.textContent = `${prazo.turnos} turnos`;
      botao.disabled = !prazo.pode;
      definirTooltip(botao, {
        titulo: `${prazo.turnos} turnos sem guerra com ${vizinho.nome}`,
        corpo: prazo.pode
          ? 'Nenhum dos dois declara guerra enquanto durar, e a opinião sobe sozinha.'
          : `Ele exige opinião ${prazo.opiniaoMinima} para um prazo desses. A sua é ${vizinho.relacao}.`,
      });
      botao.addEventListener('click', () => this.aoFirmarPacto(vizinho.id, prazo.turnos));
      caixa.appendChild(botao);
    }
    return caixa;
  }

  /**
   * O presente: três quantias, cada uma dizendo o que compra.
   *
   * ⚠️ **Três botões e não uma caixa de digitar.** O jogador não sabe quanto vale um presente
   * até vê-lo cotado — e o que ele quer decidir é "vale a pena?", não "quanto exatamente?". As
   * três quantias saem da renda DELE, então elas já chegam na escala certa: para um vizinho
   * pobre são números pequenos, e para um rico são grandes.
   */
  private presente(vizinho: VizinhoNaDiplomacia): HTMLElement {
    const caixa = document.createElement('div');
    caixa.className = 'diplomacia__presentes';
    const rotulo = document.createElement('span');
    rotulo.className = 'diplomacia__rotulo';
    rotulo.textContent = 'Presentear:';
    caixa.appendChild(rotulo);

    for (const oferta of vizinho.presentes) {
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'diplomacia__acao';
      botao.dataset['acao'] = 'presente';
      botao.dataset['ouro'] = String(oferta.ouro);
      botao.textContent = `${oferta.ouro.toLocaleString('pt-BR')} ouro`;
      definirTooltip(botao, {
        titulo: `${oferta.ouro.toLocaleString('pt-BR')} moedas a ${vizinho.nome}`,
        corpo:
          `Vale +${oferta.pontos} de opinião para ele. ` +
          'Presente compra tempo, não amizade: a opinião volta a cair para o que os fatos dizem.',
      });
      botao.addEventListener('click', () => this.aoPresentear(vizinho.id, oferta.ouro));
      caixa.appendChild(botao);
    }
    return caixa;
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
