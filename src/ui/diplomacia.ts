/**
 * A DIPLOMACIA — **uma mesa, e não um menu.**
 *
 * Janela própria, botão próprio, ao lado do Governo, e a decisão é de Henrique. O Governo
 * responde *"como o reino se sustenta"* — balanço, comida, mercado —, e paz e guerra não são
 * contabilidade: são a decisão que ABRE o resto do jogo. Ela é a única tela que é pré-requisito
 * de outra — sem guerra declarada a ordem de marcha recusa.
 *
 * ## A queixa que refez esta tela
 *
 * A primeira versão era uma lista de nomes à esquerda e um dossiê à direita, e o veredito de
 * quem jogou foi curto: **"parece que nem estou negociando com outro reino."** Estava certo, e
 * o defeito era estrutural, não decorativo. A tela mostrava o nome do vizinho, o exército dele
 * e onde ele encosta na sua fronteira — **três dados que descrevem uma presa.** Depois oferecia
 * cinco fileiras de botão iguais, e cada botão era uma aposta: aperta, e descobre a resposta
 * numa linha de texto embaixo. Ninguém negocia assim; isso é tentativa e erro com um cofre.
 *
 * ## O que os outros jogos ensinaram, e o que se pegou de cada um
 *
 * ⚠️ **Nada aqui é arte nova.** Não há retrato, brasão, ilustração nem animação — o que existe
 * é tipografia, filete, cor e texto. As referências foram lidas justamente atrás do que
 * funciona sem orçamento:
 *
 * - **Total War (Rome II, Attila, Three Kingdoms)** — os DOIS CARTÕES ESPELHADOS. O cartão da
 *   direita é cópia exata do da esquerda, mesma moldura e mesmos campos, valores diferentes.
 *   É a mesa de negociação sem desenhar uma mesa, e o olho compara sozinho, sem legenda. Veio
 *   de lá também a **barra de força** — a alavancagem militar lida de relance, antes de você
 *   abrir a boca — e o **semáforo no próprio botão**, que a documentação oficial deles descreve
 *   como "a cor dos ícones representa o quão provável é a outra parte concordar".
 * - **Total War, outra vez, e é o achado que melhor coube** — os DOIS NÚMEROS da relação: onde
 *   ela está e o *"trending towards"*. Este jogo já calculava exatamente isso desde o primeiro
 *   dia (o valor caminha para um alvo, um passo por turno) e a tela jogava metade fora. Saber
 *   que −37 vai para −45 é uma decisão diferente de saber que −37 vai para +10.
 * - **Crusader Kings III** — a aceitação como SOMA AUDITÁVEL escrita em língua humana, e não
 *   como porcentagem opaca. Um "não" vira um quebra-cabeça com solução visível. Este jogo já
 *   tinha a conta aberta por parcela; o que faltava era pendurar a RESPOSTA DELE nela.
 * - **Europa Universalis IV** — a ATITUDE com nome e com prosa (Hostil, Cordial, Fiel) em vez
 *   de um inteiro cru, e o tooltip que dá MOTIVO. E a regra de ouro do painel deles: nenhum
 *   número aparece sozinho.
 * - **Civilization VI** — as agendas: mostrar **o que ELE quer**, em vez de só reagir ao que
 *   você propõe. Aqui isso virou a linha de intenção e a lista das SUAS províncias que ele
 *   considera que valem a marcha — lida das mesmas funções que a IA usa para escolher o alvo
 *   da hoste. Não é um aviso vago de perigo: é a lista de nomes que ela tem na mão.
 * - **Supremacy 1914** — a lista de nações como TABELA e não como fileira de nomes: uma linha
 *   por vizinho, com a postura e a força na própria linha. O humor do mapa inteiro num olhar.
 * - **Humankind, pelo avesso** — ele tirou o rosto e ficou só a mecânica, e os jogadores
 *   acharam a diplomacia "impessoal e obtusa". É o aviso de que número sem VOZ não basta: por
 *   isso cada grupo de proposta carrega uma frase dita por ele.
 *
 * ## E o que se recusou
 *
 * ⚠️ **A fala dele fica NA TELA, nunca só no tooltip.** A crítica mais repetida em todos os
 * fóruns lidos é informação que devia estar à vista escondida atrás do mouse parado — "não dá
 * para checar enquanto a oferta está na tela". Aqui o motivo da recusa é texto fixo embaixo do
 * grupo, e o tooltip só aprofunda.
 *
 * ⚠️ **`pode` e `aceita` nunca se misturam.** Um botão apagado porque o seu cofre está curto e
 * um botão apagado porque ele te odeia são dois problemas com duas soluções diferentes.
 * Confundir os dois faz o jogador gastar ouro para consertar o que ouro não conserta.
 *
 * ⚠️ **Sem abas por TIPO de ação.** Elas respondem a pergunta ao contrário: a pergunta do
 * jogador é sempre *"o que eu faço com Corinto?"* — reino primeiro, ação depois —, e nunca
 * "quem eu posso aliar?". Abas obrigariam a procurar Corinto em quatro lugares.
 *
 * ⚠️ **Só entram os VIZINHOS.** São 139 poderes no mapa; a lista com todos seria uma lista
 * telefônica onde se procura um nome em vez de decidir.
 */

import type {
  CartaoDoPoder,
  GrupoDaMesa,
  Proposta,
  VistaDaDiplomacia,
  VizinhoNaMesa,
} from './diplomacia-vista';
import { rotularComIcone } from './icones-gregos';
import { definirTooltip } from './tooltip';

export type { VistaDaDiplomacia, VizinhoNaMesa } from './diplomacia-vista';

const CARTAO_VAZIO: CartaoDoPoder = {
  nome: '',
  linha: '',
  provincias: 0,
  exercito: 0,
  capital: '',
  palavra: '',
  reputacao: 0,
};

/** Como cada laço com um terceiro se lê. O verbo é do ponto de vista DELE. */
const LACOS: Record<string, string> = {
  guerra: 'em guerra com',
  pacto: 'pacto com',
  comercio: 'comercia com',
  'tributo-paga': 'paga tributo a',
  'tributo-recebe': 'recebe tributo de',
};

export class Diplomacia {
  /** A tela avisa; quem decide é a aplicação, que tem a campanha e a IA na mão. */
  aoDeclararGuerra: (idPoder: string) => void = () => {};
  aoProporPaz: (idPoder: string) => void = () => {};
  aoPresentear: (idPoder: string, ouro: number) => void = () => {};
  aoFirmarPacto: (idPoder: string, turnos: number) => void = () => {};
  aoAcordarComercio: (idPoder: string) => void = () => {};
  aoDesfazerAcordo: (idPoder: string) => void = () => {};
  aoRomperPacto: (idPoder: string) => void = () => {};
  aoPagarTributo: (idPoder: string, turnos: number) => void = () => {};
  aoExigirTributo: (idPoder: string, turnos: number) => void = () => {};
  aoRomperTributo: (idPoder: string) => void = () => {};
  aoPazComTributo: (idPoder: string, turnos: number) => void = () => {};

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
  private ultima: VistaDaDiplomacia = { eu: CARTAO_VAZIO, vizinhos: [], guerras: 0 };

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

  /** A janela está na tela? Quem redesenha pergunta antes de montar a vista inteira. */
  get visivel(): boolean {
    return this.aberta;
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
    this.dossie.replaceChildren(...(escolhido ? this.mesaDe(vista.eu, escolhido) : []));
    this.dossie.appendChild(this.aviso);
  }

  /**
   * Uma linha da lista da esquerda — **linha de TABELA, e não um nome solto.**
   *
   * ⚠️ Nome, postura e exército na mesma linha, como a tabela de nações do Supremacy 1914: o
   * humor do mapa inteiro fica legível num olhar, e o jogador escolhe com quem falar já
   * sabendo por quê. A fileira de nomes que havia antes obrigava a abrir um por um.
   */
  private linhaDe(vizinho: VizinhoNaMesa): HTMLButtonElement {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'diplomacia__nome';
    botao.dataset['poder'] = vizinho.id;
    botao.dataset['relacao'] = vizinho.emGuerra ? 'guerra' : 'paz';
    botao.dataset['escolhido'] = vizinho.id === this.escolhido ? 'sim' : 'nao';
    botao.dataset['tom'] = vizinho.tomDaPostura;

    const nome = document.createElement('span');
    nome.className = 'diplomacia__nome-texto';
    nome.textContent = vizinho.nome;

    const estado = document.createElement('span');
    estado.className = 'diplomacia__nome-estado';
    estado.textContent = vizinho.emGuerra ? 'em guerra' : vizinho.postura.toLowerCase();

    const forca = document.createElement('span');
    forca.className = 'diplomacia__nome-forca';
    forca.textContent = vizinho.cartao.exercito.toLocaleString('pt-BR');

    const baixo = document.createElement('span');
    baixo.className = 'diplomacia__nome-linha';
    baixo.append(estado, forca);

    botao.append(nome, baixo);
    botao.addEventListener('click', () => {
      this.escolhido = vizinho.id;
      // Trocar de interlocutor apaga a resposta do anterior: ela era daquela conversa.
      this.aviso.textContent = '';
      this.desenhar(this.ultima);
    });
    return botao;
  }

  /** A mesa inteira: os dois lados, a opinião, o que ele quer, e o que dá para propor. */
  private mesaDe(eu: CartaoDoPoder, vizinho: VizinhoNaMesa): readonly HTMLElement[] {
    const partes: HTMLElement[] = [
      this.cartoes(eu, vizinho),
      this.abertura(vizinho),
      this.barraDeForca(eu, vizinho),
      this.opiniao(vizinho),
      this.intencao(vizinho),
    ];
    if (vizinho.lacos.length > 0) partes.push(this.lacos(vizinho));
    partes.push(this.propostas(vizinho));
    return partes;
  }

  /**
   * **A FALA DE ABERTURA — ele fala primeiro, antes de qualquer botão.**
   *
   * ⚠️ **Porque só uma pessoa tinha voz nesta tela: você.** Todo elemento era um comando seu,
   * e a contraparte era o rótulo do dossiê e depois o silêncio contra o qual se apertavam
   * botões. Uma linha dita por ele converte a IA de juiz em parte interessada — e é ancoragem
   * de negociação, porque quem fala primeiro define o enquadramento da conversa.
   *
   * ⚠️ **Gerada dos mesmos números que decidem**, nunca escrita à mão. Personalidade anunciada
   * e não cumprida é pior que nenhuma: se a fala promete um mercador conciliador e a mecânica
   * entrega um invasor, o jogador aprende a não ler a tela.
   */
  private abertura(vizinho: VizinhoNaMesa): HTMLElement {
    const fala = document.createElement('p');
    fala.className = 'diplomacia__abertura';
    fala.dataset['tom'] = vizinho.emGuerra ? 'ruim' : vizinho.tomDaPostura;
    fala.textContent = `«${vizinho.abertura}»`;
    return fala;
  }

  /**
   * Os dois cartões, lado a lado e na MESMA moldura.
   *
   * ⚠️ **É o espelhamento que faz a tela virar mesa.** Mesmos campos, mesma ordem, valores
   * diferentes: o olho compara linha por linha e a assimetria salta sem que ninguém a explique.
   * Foi o que o Total War descobriu e é a coisa mais barata desta tela inteira — não custa arte
   * nenhuma, só disciplina de não deixar um lado ter um campo que o outro não tem.
   */
  private cartoes(eu: CartaoDoPoder, vizinho: VizinhoNaMesa): HTMLElement {
    const mesa = document.createElement('div');
    mesa.className = 'diplomacia__mesa';
    mesa.append(this.cartao(eu, 'eu'), this.cartao(vizinho.cartao, 'ele', vizinho));
    return mesa;
  }

  private cartao(dados: CartaoDoPoder, lado: string, vizinho?: VizinhoNaMesa): HTMLElement {
    const caixa = document.createElement('div');
    caixa.className = 'diplomacia__cartao';
    caixa.dataset['lado'] = lado;

    const nome = document.createElement('h3');
    // ⚠️ A classe do nome DELE é a mesma de antes de propósito: é por ela que o teste de tela
    // confere com quem o jogador está falando, e renomeá-la quebraria a trava sem ganho nenhum.
    nome.className = lado === 'ele' ? 'diplomacia__reino' : 'diplomacia__meu-reino';
    nome.textContent = dados.nome;

    const linha = document.createElement('p');
    linha.className = 'diplomacia__temperamento';
    linha.textContent = dados.linha;
    if (vizinho) {
      definirTooltip(linha, { titulo: `${dados.nome} joga como ${dados.linha}`, corpo: vizinho.conduta });
    }

    const campos = document.createElement('dl');
    campos.className = 'diplomacia__campos';
    for (const [rotulo, valor] of [
      ['províncias', dados.provincias.toLocaleString('pt-BR')],
      ['em armas', dados.exercito.toLocaleString('pt-BR')],
      ['capital', dados.capital || '— no exílio —'],
      ['palavra', dados.palavra],
    ] as const) {
      const chave = document.createElement('dt');
      chave.textContent = rotulo;
      const dado = document.createElement('dd');
      dado.textContent = valor;
      if (rotulo === 'palavra' && dados.reputacao < 0) {
        dado.dataset['tom'] = 'ruim';
        definirTooltip(dado, {
          titulo: 'Promessa quebrada',
          corpo: `Reputação ${dados.reputacao}. Entra na conta da opinião de TODOS os pares dele, e volta devagar para zero.`,
        });
      }
      campos.append(chave, dado);
    }

    caixa.append(nome, linha, campos);
    return caixa;
  }

  /**
   * A barra de força: quem tem mais homens, e por quanto.
   *
   * ⚠️ **É o número que decide tudo neste jogo e ele estava escondido numa frase.** A IA usa a
   * razão de forças para declarar guerra, para aceitar paz, para vender o ano de sossego. Pôr
   * isso como barra — e não como "2.400 homens em armas" perdido num parágrafo — dá ao jogador
   * a mesma leitura que a IA tem, de relance, antes de propor qualquer coisa.
   */
  private barraDeForca(eu: CartaoDoPoder, vizinho: VizinhoNaMesa): HTMLElement {
    const caixa = document.createElement('div');
    caixa.className = 'diplomacia__forca';

    const meu = eu.exercito;
    const dele = vizinho.cartao.exercito;
    const total = meu + dele;
    const barra = document.createElement('div');
    barra.className = 'diplomacia__barra-forca';
    // ⚠️ Sem homens dos dois lados a barra fica NEUTRA e vazia, e não meio a meio: pintar
    // metade de bronze e metade de sangue afirmaria um equilíbrio de forças que não existe —
    // zero contra zero não é empate, é ausência de exército, e são coisas diferentes.
    barra.dataset['vazia'] = total === 0 ? 'sim' : 'nao';
    if (total > 0) {
      const minha = document.createElement('span');
      minha.className = 'diplomacia__forca-minha';
      minha.style.width = `${Math.round((meu / total) * 100)}%`;
      barra.appendChild(minha);
    }

    const texto = document.createElement('p');
    texto.className = 'diplomacia__forca-texto';
    if (total === 0) texto.textContent = 'nenhum dos dois tem homens no mapa';
    else if (meu === 0) texto.textContent = `você não tem hoste alguma diante de ${dele.toLocaleString('pt-BR')}`;
    else if (dele === 0) texto.textContent = 'ele não tem hoste alguma no mapa';
    else {
      const razao = meu >= dele ? meu / dele : dele / meu;
      const quem = meu >= dele ? 'você tem' : `${vizinho.nome} tem`;
      texto.textContent = `${quem} ${razao.toFixed(1)}× o exército do outro`;
      texto.dataset['tom'] = meu >= dele ? 'bom' : 'ruim';
    }
    definirTooltip(barra, {
      titulo: 'Força em campo',
      corpo: 'É a razão que a IA usa para declarar guerra, aceitar paz e cobrar tributo.',
    });

    caixa.append(barra, texto);
    return caixa;
  }

  /**
   * A opinião: onde ela está, **para onde caminha**, e a conta inteira parcela por parcela.
   *
   * ⚠️ **Dois números, e o segundo é o que a tela antiga jogava fora.** A opinião não é um
   * estado, é um valor caminhando para um alvo — um passo por turno, como o humor do povo. Ver
   * só o de hoje é ler metade da frase: −37 indo para −45 e −37 indo para +10 são situações
   * opostas, e o jogador decidia entre elas às cegas.
   *
   * ⚠️ **A conta fica à vista, como a do humor e a da comida.** Um número de −100 a 100 sem
   * explicação é um número que o jogador acha injusto; com as parcelas ele lê "fronteira comum
   * −15, você tomou Mégara −30" e sabe exatamente o que fazer a respeito.
   */
  private opiniao(vizinho: VizinhoNaMesa): HTMLElement {
    const caixa = document.createElement('div');
    caixa.className = 'diplomacia__opiniao';

    const topo = document.createElement('div');
    topo.className = 'diplomacia__postura';
    const rotulo = document.createElement('p');
    rotulo.className = 'diplomacia__postura-nome';
    rotulo.dataset['tom'] = vizinho.tomDaPostura;
    rotulo.textContent = vizinho.emGuerra ? 'EM GUERRA' : vizinho.postura.toUpperCase();

    const numero = document.createElement('p');
    numero.className = 'diplomacia__numero';
    numero.dataset['tom'] = vizinho.tomDaPostura;
    const sinal = (n: number) => `${n > 0 ? '+' : ''}${n}`;
    numero.textContent =
      vizinho.relacao === vizinho.alvo
        ? sinal(vizinho.relacao)
        : `${sinal(vizinho.relacao)} → ${sinal(vizinho.alvo)}`;
    definirTooltip(numero, {
      titulo: 'Opinião e para onde ela caminha',
      corpo:
        vizinho.relacao === vizinho.alvo
          ? 'Já chegou ao que os fatos justificam. Só muda quando um fato mudar.'
          : `Anda alguns pontos por turno em direção a ${sinal(vizinho.alvo)}, que é a soma das parcelas abaixo.`,
    });
    topo.append(rotulo, numero);

    const leitura = document.createElement('p');
    leitura.className = 'diplomacia__leitura';
    leitura.textContent = vizinho.emGuerra
      ? `Marchas liberadas dos dois lados${vizinho.tregoa > 0 ? '' : '.'}`
      : vizinho.tregoa > 0
        ? `${vizinho.leitura} Trégua por mais ${vizinho.tregoa} ${vizinho.tregoa === 1 ? 'turno' : 'turnos'}.`
        : vizinho.leitura;

    const conta = document.createElement('ul');
    conta.className = 'diplomacia__parcelas';
    for (const parcela of vizinho.parcelas) {
      const linha = document.createElement('li');
      linha.dataset['tom'] = parcela.pontos >= 0 ? 'bom' : 'ruim';
      const nome = document.createElement('span');
      nome.textContent = parcela.rotulo;
      const pontos = document.createElement('span');
      pontos.className = 'diplomacia__pontos';
      pontos.textContent = sinal(parcela.pontos);
      linha.append(nome, pontos);
      conta.appendChild(linha);
    }

    caixa.append(topo, this.regua(vizinho), leitura, conta);
    return caixa;
  }

  /**
   * **A RÉGUA, com a linha DELE marcada.**
   *
   * ⚠️ **É o que dava escala ao número da opinião.** O jogador via "+12" sem ter como saber se
   * +12 é sossego ou véspera de invasão — e a resposta muda por vizinho, porque sai do
   * temperamento: o mercador só considera atacar abaixo de −40, o guerreiro já abaixo de +20.
   * Sessenta pontos de diferença entre dois vizinhos, e o mesmo "+12" significando coisas
   * opostas nos dois. Sem a régua, o número mais importante da tela estava sem unidade.
   *
   * ⚠️ **Um traço, DUAS mecânicas** — e é isso que o torna honesto e barato: o mesmo
   * `relacaoParaDeclarar` decide se ele te ataca e se ele assina um pacto contigo. O traço diz
   * as duas coisas de uma vez: acima daqui ele assina e não marcha; abaixo, o contrário.
   */
  private regua(vizinho: VizinhoNaMesa): HTMLElement {
    const caixa = document.createElement('div');
    caixa.className = 'diplomacia__regua';

    const emPercentual = (n: number) => `${((n + 100) / 2).toFixed(1)}%`;
    const trilho = document.createElement('div');
    trilho.className = 'diplomacia__trilho';
    // A faixa perigosa: de −100 até a linha dele. Vê-se o tamanho do risco, não só o ponto.
    const risco = document.createElement('span');
    risco.className = 'diplomacia__risco';
    risco.style.width = emPercentual(vizinho.linhaDeAtaque);
    const marca = document.createElement('span');
    marca.className = 'diplomacia__linha-ataque';
    marca.style.left = emPercentual(vizinho.linhaDeAtaque);
    const agora = document.createElement('span');
    agora.className = 'diplomacia__agulha';
    agora.dataset['tom'] = vizinho.relacao > vizinho.linhaDeAtaque ? 'bom' : 'ruim';
    agora.style.left = emPercentual(vizinho.relacao);
    trilho.append(risco, marca, agora);

    const texto = document.createElement('p');
    texto.className = 'diplomacia__regua-texto';
    const acima = vizinho.relacao > vizinho.linhaDeAtaque;
    const distancia = Math.abs(vizinho.relacao - vizinho.linhaDeAtaque);
    texto.dataset['tom'] = acima ? 'bom' : 'ruim';
    // ⚠️ Três frases e não duas: em cima da linha exata não se está "0 abaixo dela", se está
    // NA borda — e é o único ponto da régua em que um passo de opinião muda tudo.
    texto.textContent =
      distancia === 0
        ? `você está exatamente na linha dele: mais um ponto abaixo e ele passa a te olhar`
        : acima
          ? `ele só te olha abaixo de ${vizinho.linhaDeAtaque}, e você está ${distancia} acima disso`
          : `ele te olha abaixo de ${vizinho.linhaDeAtaque}, e você já está ${distancia} abaixo`;
    definirTooltip(trilho, {
      titulo: `A linha de ${vizinho.nome}`,
      corpo: `Como ${vizinho.cartao.linha}, ele só considera marchar sobre você com a opinião em ${vizinho.linhaDeAtaque} ou menos — e é a mesma linha que decide se ele assina um pacto.`,
    });

    caixa.append(trilho, texto);
    return caixa;
  }

  /**
   * **O QUE ELE QUER DE VOCÊ** — e, quando quer a sua terra, quais províncias.
   *
   * ⚠️ **É a informação mais valiosa desta tela, e ela é honesta:** sai das mesmas funções que
   * a IA consulta ao escolher para onde mandar a hoste. Não é um aviso vago de perigo, é a
   * lista de nomes que ela tem na mão. É a ideia de "agenda" do Civilization, mas sem inventar
   * mecânica nova — a intenção já existia dentro da IA e ninguém a tinha perguntado.
   */
  private intencao(vizinho: VizinhoNaMesa): HTMLElement {
    const caixa = document.createElement('div');
    caixa.className = 'diplomacia__intencao';
    caixa.dataset['tom'] = vizinho.tomDaIntencao;

    const marca = document.createElement('span');
    marca.className = 'diplomacia__marca';
    marca.textContent = vizinho.tomDaIntencao === 'ameaca' ? '⚑' : '◆';

    const frase = document.createElement('p');
    frase.className = 'diplomacia__intencao-texto';
    frase.textContent = vizinho.intencao;

    caixa.append(marca, frase);
    if (vizinho.fronteira.length > 0) {
      definirTooltip(caixa, {
        titulo: 'O que ele pretende',
        corpo: `Faz fronteira com você em ${vizinho.fronteira.join(', ')}.`,
      });
    }
    return caixa;
  }

  /**
   * Os laços dele com TERCEIROS.
   *
   * ⚠️ **Sem isto o mundo parecia ter duas pessoas dentro.** Enquanto a tela só mostrava a
   * relação de vocês dois, cada proposta era uma transação isolada. Saber que Argos está em
   * guerra com Tebas e comercia com Corinto transforma a mesma proposta numa jogada dentro de
   * um tabuleiro — e é exatamente a falta que os jogadores de Total War mais reclamam.
   */
  private lacos(vizinho: VizinhoNaMesa): HTMLElement {
    const caixa = document.createElement('p');
    caixa.className = 'diplomacia__lacos';
    for (const laco of vizinho.lacos) {
      const item = document.createElement('span');
      item.className = 'diplomacia__laco';
      item.dataset['tipo'] = laco.tipo;
      item.textContent = `${LACOS[laco.tipo] ?? laco.tipo} ${laco.nome}`;
      caixa.appendChild(item);
    }
    return caixa;
  }

  /** Os grupos de proposta, cada um com a fala dele embaixo. */
  private propostas(vizinho: VizinhoNaMesa): HTMLElement {
    const caixa = document.createElement('div');
    caixa.className = 'diplomacia__acoes';
    for (const grupo of vizinho.grupos) caixa.appendChild(this.grupo(vizinho, grupo));
    return caixa;
  }

  private grupo(vizinho: VizinhoNaMesa, grupo: GrupoDaMesa): HTMLElement {
    const caixa = document.createElement('div');
    caixa.className = 'diplomacia__grupo';
    caixa.dataset['grupo'] = grupo.titulo.toLowerCase();

    const rotulo = document.createElement('span');
    rotulo.className = 'diplomacia__rotulo';
    rotulo.textContent = grupo.titulo;

    const botoes = document.createElement('div');
    botoes.className = 'diplomacia__botoes';
    for (const proposta of grupo.propostas) {
      botoes.appendChild(this.botao(vizinho, proposta));
    }

    const fala = document.createElement('p');
    fala.className = 'diplomacia__fala';
    fala.dataset['tom'] = grupo.tom;
    fala.textContent = grupo.fala;

    caixa.append(rotulo, botoes, fala);
    return caixa;
  }

  /**
   * Um botão de proposta, **com a resposta dele já em cima.**
   *
   * ⚠️ **Três estados e não dois**, e a diferença entre eles é a tela inteira:
   * `✓` ele assina, `✗` ele recusa, e apagado quando é a REGRA que barra — cofre curto,
   * guerra em curso, pacto em pé. Um botão apagado porque falta ouro e um botão apagado porque
   * ele te odeia são dois problemas com duas soluções, e a tela nunca os pinta igual.
   *
   * ⚠️ E o `✗` **não desabilita**: recusa é resposta, não impedimento. O jogador pode propor
   * assim mesmo e ouvir o não — que é o que se faz numa mesa.
   */
  private botao(vizinho: VizinhoNaMesa, proposta: Proposta): HTMLButtonElement {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'diplomacia__acao';
    botao.dataset['acao'] = proposta.acao;
    if (proposta.valor !== 0) botao.dataset['valor'] = String(proposta.valor);
    botao.disabled = !proposta.pode;
    botao.dataset['resposta'] = !proposta.pode ? 'travado' : proposta.aceita ? 'sim' : 'nao';

    const selo = document.createElement('span');
    selo.className = 'diplomacia__selo';
    selo.textContent = !proposta.pode ? '·' : proposta.aceita ? '✓' : '✗';

    const texto = document.createElement('span');
    texto.textContent = proposta.rotulo;

    botao.append(selo, texto);
    definirTooltip(botao, {
      titulo: `${proposta.rotulo} — ${vizinho.nome}`,
      corpo: !proposta.pode
        ? proposta.bloqueio || 'as regras não deixam agora'
        : proposta.aceita
          ? 'Ele assinaria isto hoje.'
          : 'Ele recusaria — mas você pode propor e ouvir o não.',
    });
    botao.addEventListener('click', () => this.despachar(vizinho.id, proposta));
    return botao;
  }

  /** Uma porta só para todas as ações: o `data-acao` do botão diz qual é. */
  private despachar(id: string, proposta: Proposta): void {
    switch (proposta.acao) {
      case 'guerra':
        return this.aoDeclararGuerra(id);
      case 'paz':
        return this.aoProporPaz(id);
      case 'paz-com-tributo':
        return this.aoPazComTributo(id, proposta.valor);
      case 'acordo':
        return this.aoAcordarComercio(id);
      case 'desfazer-acordo':
        return this.aoDesfazerAcordo(id);
      case 'pacto':
        return this.aoFirmarPacto(id, proposta.valor);
      case 'romper':
        return this.aoRomperPacto(id);
      case 'pagar-tributo':
        return this.aoPagarTributo(id, proposta.valor);
      case 'exigir-tributo':
        return this.aoExigirTributo(id, proposta.valor);
      case 'romper-tributo':
        return this.aoRomperTributo(id);
      case 'presente':
        return this.aoPresentear(id, proposta.valor);
      default:
        return;
    }
  }
}
