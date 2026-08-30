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


/** A opinião com sinal, no formato que a lista e o dossiê usam igual: `+12`, `−37`, `0`. */
function sinal(n: number): string {
  return n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0';
}

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
  aoConcederAcesso: (idPoder: string, turnos: number) => void = () => {};
  aoRevogarAcesso: (idPoder: string) => void = () => {};
  aoResponderPedido: (idPoder: string, tipo: string, aceita: boolean) => void = () => {};
  aoRomperPacto: (idPoder: string) => void = () => {};
  aoFirmarAlianca: (idPoder: string, turnos: number) => void = () => {};
  aoRomperAlianca: (idPoder: string) => void = () => {};
  aoFormarLiga: (idPoder: string) => void = () => {};
  aoSairDaLiga: (idPoder: string) => void = () => {};
  aoSoltarMembro: (idPoder: string) => void = () => {};
  aoAnexarMembro: (idPoder: string) => void = () => {};
  aoMudarTributoDaLiga: (idPoder: string, nivel: string) => void = () => {};
  aoPagarTributo: (idPoder: string, turnos: number) => void = () => {};
  aoExigirTributo: (idPoder: string, turnos: number) => void = () => {};
  aoRomperTributo: (idPoder: string) => void = () => {};
  aoPazComTributo: (idPoder: string, turnos: number) => void = () => {};

  private readonly fundo = document.createElement('div');
  private readonly lista = document.createElement('nav');
  /**
   * A terceira coluna: **o que fazer com ele**.
   *
   * ⚠️ **Leitura e ação passam a ocupar EIXOS DIFERENTES, e é a mudança que resolve a queixa.**
   * Antes tudo era uma coluna vertical — dois cartões, a força, a opinião, a intenção, os laços
   * e só então os oito grupos de proposta. Medido na captura: 975 px de conteúdo escondido numa
   * janela de 651 px, e ao abrir a aba **nenhum botão de ação estava visível**. Empilhados no
   * mesmo eixo, a leitura ganha sempre.
   */
  private readonly acoes = document.createElement('div');
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
  private ultima: VistaDaDiplomacia = { eu: CARTAO_VAZIO, vizinhos: [] };

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

    this.lista.className = 'diplomacia__lista';
    this.dossie.className = 'diplomacia__dossie';
    this.acoes.className = 'diplomacia__acoes-coluna';
    this.aviso.className = 'diplomacia__aviso';

    const conteudo = document.createElement('div');
    conteudo.className = 'diplomacia__conteudo';
    conteudo.dataset['painel'] = 'diplomacia';
    const colunas = document.createElement('div');
    colunas.className = 'diplomacia__colunas';
    // Esquerda→direita é a sequência da decisão: com quem · o que somos · o que eu faço.
    colunas.append(this.lista, this.dossie, this.acoes);
    conteudo.append(colunas);

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

    this.lista.replaceChildren(...this.listaAgrupada(vista.vizinhos));
    const escolhido = vista.vizinhos.find((v) => v.id === this.escolhido);
    this.dossie.replaceChildren(...(escolhido ? this.leituraDe(vista.eu, escolhido) : []));
    this.acoes.replaceChildren(...(escolhido ? this.acoesDe(escolhido) : []));
    this.acoes.appendChild(this.aviso);
  }

  /**
   * Uma linha da lista da esquerda — **linha de TABELA, e não um nome solto.**
   *
   * ⚠️ Nome, postura e exército na mesma linha, como a tabela de nações do Supremacy 1914: o
   * humor do mapa inteiro fica legível num olhar, e o jogador escolhe com quem falar já
   * sabendo por quê. A fileira de nomes que havia antes obrigava a abrir um por um.
   */
  /**
   * A lista em GRUPOS por estado, e alfabética dentro de cada um.
   *
   * ⚠️ **Agrupar e não ordenar por urgência, e a razão é a memória de posição.** Ordenada por
   * opinião, as dezoito linhas dançariam a cada virada e achar Corinto custaria uma leitura
   * inteira. Agrupada, um reino só muda de lugar quando muda de ESTADO — que é exatamente
   * quando ele deve chamar atenção. Dentro do grupo, alfabético, portanto estável para sempre.
   *
   * ⚠️ **E os cabeçalhos substituíram a linha de resumo do topo** (*"em paz com o mundo · 17
   * reinos na mesa"*), que dizia o mesmo com menos precisão e ocupava uma faixa inteira.
   */
  private listaAgrupada(vizinhos: readonly VizinhoNaMesa[]): readonly HTMLElement[] {
    const grupos: readonly [string, (v: VizinhoNaMesa) => boolean][] = [
      ['em guerra', (v) => v.emGuerra],
      ['pedem resposta', (v) => v.pedido !== null],
      ['ameaçam', (v) => v.relacao <= v.linhaDeAtaque && v.cobicadas.length > 0],
      ['ligados a você', (v) => v.vinculo !== ''],
      ['sem vínculo', () => true],
    ];
    const restantes = [...vizinhos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    const saida: HTMLElement[] = [];
    for (const [titulo, cabe] of grupos) {
      const meus = restantes.filter(cabe);
      if (meus.length === 0) continue;
      for (const v of meus) restantes.splice(restantes.indexOf(v), 1);
      const cabecalho = document.createElement('p');
      cabecalho.className = 'diplomacia__grupo-lista';
      const nome = document.createElement('span');
      nome.textContent = titulo;
      const quantos = document.createElement('span');
      quantos.textContent = String(meus.length);
      cabecalho.append(nome, quantos);
      saida.push(cabecalho, ...meus.map((v) => this.linhaDe(v)));
    }
    return saida;
  }

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

    // ⚠️ **O VÍNCULO no lugar da postura, e a OPINIÃO no lugar do exército.** A linha antiga
    // dizia `cordial` e um número de tropa: medido na captura de turno 40, onze das doze linhas
    // diziam a mesma palavra, e o exército já aparece duas vezes dentro do dossiê. Nenhum dos
    // dois respondia a pergunta que se faz correndo a lista — *o que eu sou desse reino?*
    const estado = document.createElement('span');
    estado.className = 'diplomacia__nome-estado';
    estado.textContent = vizinho.vinculo;

    // ⚠️ **A fronteira virou um SELO, e não mais o filtro da lista.** Desde que a mesa abriu
    // para os 18 poderes com ficha, quem encosta em você deixou de ser "quem aparece" e
    // passou a ser "com quem a hoste pode marchar hoje" — que é outra coisa, e é a que
    // importa na hora de declarar guerra.
    if (vizinho.fronteira.length > 0) {
      const marca = document.createElement('span');
      marca.className = 'diplomacia__nome-fronteira';
      marca.textContent = 'fronteira';
      nome.appendChild(marca);
    }

    // A opinião com SINAL e a seta do rumo: dois sinais que quase nunca se repetem entre linhas,
    // no lugar de uma palavra que se repetia em quase todas. A seta sai de graça de `alvo`.
    const forca = document.createElement('span');
    forca.className = 'diplomacia__nome-forca';
    const rumo = vizinho.alvo > vizinho.relacao ? '↑' : vizinho.alvo < vizinho.relacao ? '↓' : '=';
    forca.textContent = `${sinal(vizinho.relacao)} ${rumo}`;
    forca.dataset['tom'] = vizinho.relacao >= 0 ? 'bom' : 'ruim';

    const baixo = document.createElement('span');
    baixo.className = 'diplomacia__nome-linha';
    baixo.append(estado, forca);

    botao.append(nome, baixo);
    // ⚠️ **A marca do pedido fica na LISTA**, e não só dentro do dossiê: sem ela, o jogador só
    // descobriria que alguém quer falar com ele clicando reino por reino.
    if (vizinho.pedido) {
      const marca = document.createElement('span');
      marca.className = 'diplomacia__nome-pedido';
      marca.textContent = '✉';
      botao.dataset['pedido'] = 'sim';
      baixo.appendChild(marca);
    }
    botao.addEventListener('click', () => {
      this.escolhido = vizinho.id;
      // Trocar de interlocutor apaga a resposta do anterior: ela era daquela conversa.
      this.aviso.textContent = '';
      this.desenhar(this.ultima);
    });
    return botao;
  }

  /** A COLUNA DO MEIO: o que vocês são um do outro. Zero botões, por regra. */
  private leituraDe(eu: CartaoDoPoder, vizinho: VizinhoNaMesa): readonly HTMLElement[] {
    const partes: HTMLElement[] = [
      this.confronto(eu, vizinho),
      this.opiniao(vizinho),
      this.intencao(vizinho),
    ];
    if (vizinho.lacos.length > 0) partes.push(this.lacos(vizinho));
    return partes;
  }

  /**
   * A COLUNA DA DIREITA: o que fazer com ele. Zero prosa narrativa, por regra.
   *
   * ⚠️ **O pedido DELE vem primeiro, acima de tudo que você poderia propor.** A ordem é a
   * mensagem: quando o outro lado pede alguma coisa, é isso que está em cima da mesa.
   */
  private acoesDe(vizinho: VizinhoNaMesa): readonly HTMLElement[] {
    const partes: HTMLElement[] = [];
    if (vizinho.pedido) partes.push(this.pedido(vizinho));
    partes.push(this.propostas(vizinho));
    return partes;
  }

  /**
   * O PEDIDO DELE: a metade da diplomacia em que quem fala é o outro.
   *
   * ⚠️ **Aceitar e recusar lado a lado, e recusar não custa nada.** Um "não" que abalasse a
   * opinião faria a resposta certa ser nunca abrir a aba — e um sistema que pune quem o usa é
   * um sistema que ninguém usa.
   */
  private pedido(vizinho: VizinhoNaMesa): HTMLElement {
    const caixa = document.createElement('div');
    caixa.className = 'diplomacia__pedido';
    caixa.dataset['tipo'] = vizinho.pedido?.tipo ?? '';
    const frase = document.createElement('p');
    frase.className = 'diplomacia__pedido-fala';
    frase.textContent = vizinho.pedido?.frase ?? '';
    const botoes = document.createElement('div');
    botoes.className = 'diplomacia__pedido-botoes';
    for (const [rotulo, aceita] of [
      ['Aceitar', true],
      ['Recusar', false],
    ] as const) {
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'diplomacia__pedido-botao';
      botao.dataset['acao'] = aceita ? 'aceitar-pedido' : 'recusar-pedido';
      botao.textContent = rotulo;
      botao.addEventListener('click', () => {
        const tipo = vizinho.pedido?.tipo;
        if (tipo) this.aoResponderPedido(vizinho.id, tipo, aceita);
      });
      botoes.appendChild(botao);
    }
    caixa.append(frase, botoes);
    return caixa;
  }


  /**
   * A TIRA DE CONFRONTO: os dois lados numa tabela só, com os rótulos no EIXO CENTRAL.
   *
   * ⚠️ **Eram dois cartões espelhados, e o espelho custava metade dos rótulos.** "províncias",
   * "em armas" e "palavra" apareciam DUAS vezes cada, uma de cada lado, e o olho lia o mesmo
   * substantivo duas vezes para comparar dois números. Com o rótulo no meio, cada palavra
   * aparece uma vez e a comparação é horizontal — que é como se lê uma tabela.
   *
   * ⚠️ **E a barra de força entrou aqui, na linha a que ela pertence.** Ela era um bloco
   * separado logo abaixo dos cartões, desenhando pela terceira vez os mesmos dois exércitos
   * que os dois cartões já traziam em número.
   *
   * ⚠️ **A capital só aparece quando ela DIZ alguma coisa** — quando não é a cidade homônima,
   * ou quando o reino está no exílio. Na esmagadora maioria dos pares ela repetia o nome do
   * reino que está escrito no topo da própria coluna.
   */
  private confronto(eu: CartaoDoPoder, vizinho: VizinhoNaMesa): HTMLElement {
    const dele = vizinho.cartao;
    const caixa = document.createElement('div');
    caixa.className = 'diplomacia__confronto';

    const nomes = document.createElement('div');
    nomes.className = 'diplomacia__confronto-nomes';
    const meuNome = document.createElement('h3');
    meuNome.className = 'diplomacia__meu-reino';
    meuNome.textContent = eu.nome;
    const nomeDele = document.createElement('h3');
    // ⚠️ A classe do nome DELE não muda: é por ela que o teste de tela confere com quem o
    // jogador está falando.
    nomeDele.className = 'diplomacia__reino';
    nomeDele.textContent = dele.nome;
    nomes.append(meuNome, nomeDele);
    caixa.appendChild(nomes);

    const linha = (esquerda: string, rotulo: string, direita: string): HTMLElement => {
      const l = document.createElement('div');
      l.className = 'diplomacia__confronto-linha';
      for (const [texto, classe] of [
        [esquerda, 'diplomacia__confronto-meu'],
        [rotulo, 'diplomacia__confronto-rotulo'],
        [direita, 'diplomacia__confronto-dele'],
      ] as const) {
        const celula = document.createElement('span');
        celula.className = classe;
        celula.textContent = texto;
        l.appendChild(celula);
      }
      return l;
    };

    const n = (v: number): string => v.toLocaleString('pt-BR');
    caixa.appendChild(linha(n(eu.provincias), 'províncias', n(dele.provincias)));
    caixa.appendChild(this.linhaDeForca(eu, vizinho));
    if (eu.capital !== eu.nome || dele.capital !== dele.nome) {
      caixa.appendChild(
        linha(eu.capital || '— exílio —', 'capital', dele.capital || '— exílio —'),
      );
    }
    // A palavra vira selo: `palavra limpa` × `palavra limpa` era a mesma frase escrita duas
    // vezes em quase todos os pares. O tooltip guarda o número da reputação.
    const palavra = linha(
      eu.palavra === 'palavra limpa' ? '✓' : '✗',
      'palavra',
      dele.palavra === 'palavra limpa' ? '✓' : '✗',
    );
    definirTooltip(palavra, {
      titulo: 'A palavra dos dois',
      corpo: `${eu.nome}: ${eu.palavra}
${dele.nome}: ${dele.palavra}`,
    });
    caixa.appendChild(palavra);

    const rodape = document.createElement('p');
    rodape.className = 'diplomacia__confronto-rodape';
    const marcas = [dele.linha];
    if (vizinho.fronteira.length > 0) marcas.push(`fronteira (${vizinho.fronteira.length})`);
    rodape.textContent = marcas.join(' · ');
    definirTooltip(rodape, {
      titulo: `${dele.nome} joga como ${dele.linha}`,
      corpo: vizinho.conduta,
    });
    caixa.appendChild(rodape);
    return caixa;
  }

  /** A linha `em armas`, com a barra divergente e a razão no lugar da frase. */
  private linhaDeForca(eu: CartaoDoPoder, vizinho: VizinhoNaMesa): HTMLElement {
    const meu = eu.exercito;
    const dele = vizinho.cartao.exercito;
    const total = meu + dele;
    const l = document.createElement('div');
    l.className = 'diplomacia__confronto-linha';
    l.dataset['forca'] = 'sim';

    const meuValor = document.createElement('span');
    meuValor.className = 'diplomacia__confronto-meu';
    meuValor.textContent = meu.toLocaleString('pt-BR');

    const meio = document.createElement('span');
    meio.className = 'diplomacia__confronto-rotulo';
    const barra = document.createElement('span');
    barra.className = 'diplomacia__barra-forca';
    if (total === 0) barra.hidden = true;
    else {
      const minha = document.createElement('span');
      minha.className = 'diplomacia__forca-minha';
      minha.style.width = `${Math.round((meu / total) * 100)}%`;
      barra.appendChild(minha);
    }
    const razao = document.createElement('span');
    razao.className = 'diplomacia__forca-texto';
    if (total === 0) razao.textContent = 'em armas';
    else if (meu === 0 || dele === 0) {
      razao.textContent = meu === 0 ? 'só ele' : 'só você';
      razao.dataset['tom'] = meu === 0 ? 'ruim' : 'bom';
    } else {
      const r = meu >= dele ? meu / dele : dele / meu;
      razao.textContent = `${meu >= dele ? 'você' : 'ele'} ${r.toFixed(1)}×`;
      razao.dataset['tom'] = meu >= dele ? 'bom' : 'ruim';
    }
    meio.append(barra, razao);
    definirTooltip(meio, {
      titulo: 'Força em campo',
      corpo: 'É a razão que a IA usa para declarar guerra, aceitar paz e cobrar tributo.',
    });

    const dValor = document.createElement('span');
    dValor.className = 'diplomacia__confronto-dele';
    dValor.textContent = dele.toLocaleString('pt-BR');

    l.append(meuValor, meio, dValor);
    return l;
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
    // ⚠️ Sinal de MENOS (U+2212) e não hífen: o hífen é estreito, fica alto demais e não alinha
    // numa coluna de algarismos tabulares — numa lista de oito parcelas a diferença aparece.
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

    caixa.append(topo, this.regua(vizinho), conta);
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

    // ⚠️ **A frase da régua virou CONDICIONAL: prosa acionada por informação.** Ela existia
    // sempre, inclusive para dizer que estava tudo bem — e a régua já desenha isso. Agora ela
    // só fala quando há o que dizer: você abaixo da linha dele, ou a caminho dela. Quando não
    // há perigo, não há frase.
    const texto = document.createElement('p');
    texto.className = 'diplomacia__regua-texto';
    const acima = vizinho.relacao > vizinho.linhaDeAtaque;
    const indoParaLa = vizinho.alvo <= vizinho.linhaDeAtaque;
    texto.dataset['tom'] = acima ? 'morno' : 'ruim';
    texto.textContent = !acima
      ? `abaixo da linha de ${vizinho.nome}`
      : indoParaLa
        ? `caminha para a linha de ${vizinho.nome}`
        : '';
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

  /**
   * Um grupo vira uma FICHA de moldura própria, e não mais uma linha empilhada.
   *
   * ⚠️ **A ficha nunca muda de posição, só de cara.** Empilhados, um pacto assinado colapsava
   * o grupo de três botões para um e tudo abaixo subia — a tela dançava a cada assinatura.
   * Numa grade de posições fixas, PACTO é sempre o mesmo canto, esteja ele livre, em pé ou
   * trancado, e o jogador aprende o tabuleiro uma vez.
   *
   * ⚠️ **E o selo sobe do botão para o cabeçalho quando ele é o mesmo em todos.** Medido: a
   * tela repetia o mesmo veredito de 19 a 25 vezes, porque `aceita` é calculado uma vez por
   * grupo e copiado em cada botão. Onde ele varia de fato — tributo, que tem dois verbos, e a
   * paz, que tem prazos — o selo continua por botão, e aí ele significa alguma coisa.
   */
  private grupo(vizinho: VizinhoNaMesa, grupo: GrupoDaMesa): HTMLElement {
    const caixa = document.createElement('div');
    caixa.className = 'diplomacia__grupo';
    caixa.dataset['grupo'] = grupo.titulo.toLowerCase();
    // Guerra, Paz e Ouro atravessam a grade: são os únicos que não são acordo com prazo — dois
    // atos unilaterais, um destrutivo e um gratuito —, e ficam nos extremos da coluna.
    if (['guerra', 'paz', 'ouro'].includes(grupo.titulo.toLowerCase())) {
      caixa.dataset['vao'] = 'cheio';
    }

    const livres = grupo.propostas.filter((p) => p.pode);
    const mesmoVeredito =
      livres.length > 0 && livres.every((p) => p.aceita === livres[0]?.aceita)
        ? (livres[0]?.aceita ?? null)
        : null;

    const topo = document.createElement('div');
    topo.className = 'diplomacia__ficha-topo';
    const rotulo = document.createElement('span');
    rotulo.className = 'diplomacia__rotulo';
    rotulo.textContent = grupo.titulo;
    topo.appendChild(rotulo);
    if (mesmoVeredito !== null) {
      const selo = document.createElement('span');
      selo.className = 'diplomacia__selo';
      selo.dataset['resposta'] = mesmoVeredito ? 'sim' : 'nao';
      selo.textContent = mesmoVeredito ? '✓' : '✗';
      definirTooltip(selo, {
        titulo: `${grupo.titulo} — ${vizinho.nome}`,
        corpo: mesmoVeredito
          ? 'Ele assinaria isto hoje.'
          : 'Ele recusaria — mas você pode propor e ouvir o não.',
      });
      topo.appendChild(selo);
    }

    const botoes = document.createElement('div');
    botoes.className = 'diplomacia__botoes';
    for (const proposta of grupo.propostas) {
      botoes.appendChild(this.botao(vizinho, proposta, mesmoVeredito === null));
    }

    caixa.append(topo);
    if (grupo.fala !== '') {
      const fala = document.createElement('p');
      fala.className = 'diplomacia__fala';
      fala.dataset['tom'] = grupo.tom;
      fala.textContent = grupo.fala;
      caixa.appendChild(fala);
    }
    caixa.appendChild(botoes);
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
  private botao(
    vizinho: VizinhoNaMesa,
    proposta: Proposta,
    comSelo: boolean,
  ): HTMLButtonElement {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'diplomacia__acao';
    botao.dataset['acao'] = proposta.acao;
    if (proposta.valor !== 0) botao.dataset['valor'] = String(proposta.valor);
    botao.disabled = !proposta.pode;
    botao.dataset['resposta'] = !proposta.pode ? 'travado' : proposta.aceita ? 'sim' : 'nao';

    const texto = document.createElement('span');
    texto.textContent = proposta.rotulo;
    // O selo só desce ao botão quando o veredito VARIA dentro do grupo. Caso contrário ele
    // mora no cabeçalho da ficha e aparece uma vez, não seis.
    if (comSelo) {
      const selo = document.createElement('span');
      selo.className = 'diplomacia__selo';
      selo.textContent = !proposta.pode ? '·' : proposta.aceita ? '✓' : '✗';
      botao.append(selo, texto);
    } else {
      botao.appendChild(texto);
    }
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
      case 'acesso':
        return this.aoConcederAcesso(id, proposta.valor);
      case 'revogar-acesso':
        return this.aoRevogarAcesso(id);
      case 'pacto':
        return this.aoFirmarPacto(id, proposta.valor);
      case 'romper':
        return this.aoRomperPacto(id);
      case 'formar-liga':
        return this.aoFormarLiga(id);
      case 'sair-da-liga':
        return this.aoSairDaLiga(id);
      case 'soltar-membro':
        return this.aoSoltarMembro(id);
      case 'anexar-membro':
        return this.aoAnexarMembro(id);
      case 'alianca':
        return this.aoFirmarAlianca(id, proposta.valor);
      case 'romper-alianca':
        return this.aoRomperAlianca(id);
      case 'pagar-tributo':
        return this.aoPagarTributo(id, proposta.valor);
      case 'exigir-tributo':
        return this.aoExigirTributo(id, proposta.valor);
      case 'romper-tributo':
        return this.aoRomperTributo(id);
      case 'presente':
        return this.aoPresentear(id, proposta.valor);
      default:
        // ⚠️ **O nível do tributo viaja DENTRO da ação**, e não num número: `tributo-liga:leve`.
        // Os níveis vêm dos dados e podem mudar de nome ou de quantidade; um índice numérico
        // criaria uma ordem combinada entre a vista e a tela, e no dia em que alguém
        // acrescentasse um nível as duas discordariam em silêncio.
        if (proposta.acao.startsWith('tributo-liga:')) {
          this.aoMudarTributoDaLiga(id, proposta.acao.slice('tributo-liga:'.length));
        }
        return;
    }
  }
}
