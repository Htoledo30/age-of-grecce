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
  BrasaoNaMesa,
  CartaoDoPoder,
  GrupoDaMesa,
  Proposta,
  VistaDaDiplomacia,
  VizinhoNaMesa,
} from './diplomacia-vista';
import { criarEstandarte } from './estandartes';
import { formatarAno } from '@/campanha/estado-campanha';
import { definirTooltip } from './tooltip';

export type { VistaDaDiplomacia, VizinhoNaMesa } from './diplomacia-vista';

const CARTAO_VAZIO: CartaoDoPoder = {
  nome: '',
  tesouro: 0,
  aliados: [],
  inimigos: [],
  comercio: [],
  linha: '',
  provincias: 0,
  exercito: 0,
  capital: '',
  palavra: '',
  reputacao: 0,
};

const VISTA_VAZIA: VistaDaDiplomacia = {
  eu: CARTAO_VAZIO,
  meuBrasao: { id: '', nome: '', cor: '#000000' },
  ano: 0,
  turno: 0,
  vizinhos: [],
};

/** A opinião com sinal, no formato que a lista e o dossiê usam igual: `+12`, `−37`, `0`. */
function sinal(n: number): string {
  return n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0';
}

/**
 * A faixa de MEANDRO que fecha o cabeçalho e o rodapé da janela.
 *
 * ⚠️ **É a assinatura grega, e ela não custa arte nenhuma.** Henrique pediu *"cara de
 * diplomacia grega, pensando que no futuro vamos trazer texturas"* — e a grega tem uma marca
 * que se reconhece em um segundo e cabe num SVG de dezesseis pixels. É o mesmo papel dos
 * roletes de madeira na mesa do Rome: dizer de que mundo é a tela antes de qualquer palavra.
 *
 * A textura de verdade entra depois, pela ranhura `--tex-moldura`: esta faixa continua por
 * cima dela.
 */
function faixaDeMeandro(invertida = false): HTMLElement {
  const faixa = document.createElement('div');
  faixa.className = 'diplomacia__meandro';
  if (invertida) faixa.dataset['baixo'] = 'sim';
  faixa.setAttribute('aria-hidden', 'true');
  return faixa;
}

/** O título de uma seção da coluna de ações. Uma voz só para todas: versalete espaçado. */
function tituloDaColuna(texto: string): HTMLElement {
  const titulo = document.createElement('h3');
  titulo.className = 'diplomacia__secao';
  titulo.textContent = texto;
  return titulo;
}

/**
 * Uma fileira de estandartes — aliados, inimigos, parceiros de comércio.
 *
 * ⚠️ **É a peça que faz a mesa se ler com pouco texto**, e é a resposta ao que Henrique
 * apontou no Rome: Total War: *"você vê que tem pouco texto e mesmo assim consigo entender o
 * que está acontecendo?"*. Ali as relações de cada lado são fileiras de escudo, e o olho conta
 * três contra um sem ler uma palavra. Aqui os dezoito emblemas já existiam em `estandartes.ts`
 * — coruja para Atenas, kithara para Mégara, pégaso para Corinto — e ninguém os tinha pedido.
 *
 * ⚠️ **Teto de quatro, e o resto vira `+n`.** Um chefe de liga em guerra com meio mapa
 * empurraria a coluna do meio para fora da janela; quatro escudos cabem em qualquer linha e
 * `+3` ao lado já diz o tamanho da coisa. O tooltip guarda a lista inteira, por nome.
 */
function fileiraDeBrasoes(quais: readonly BrasaoNaMesa[], rotulo: string): HTMLElement {
  const caixa = document.createElement('span');
  caixa.className = 'diplomacia__brasoes';
  if (quais.length === 0) {
    caixa.dataset['vazia'] = 'sim';
    caixa.textContent = '—';
    return caixa;
  }
  const TETO = 4;
  for (const brasao of quais.slice(0, TETO)) {
    caixa.appendChild(criarEstandarte(brasao, 'hoste'));
  }
  if (quais.length > TETO) {
    const resto = document.createElement('span');
    resto.className = 'diplomacia__brasoes-resto';
    resto.textContent = `+${quais.length - TETO}`;
    caixa.appendChild(resto);
  }
  definirTooltip(caixa, {
    titulo: rotulo,
    corpo: quais.map((b) => b.nome).join('\n'),
  });
  return caixa;
}

export class Diplomacia {
  /** A tela avisa; quem decide é a aplicação, que tem a campanha e a IA na mão. */
  aoDeclararGuerra: (idPoder: string) => void = () => {};
  aoProporPaz: (idPoder: string) => void = () => {};
  aoPresentear: (idPoder: string, ouro: number) => void = () => {};
  aoFirmarPacto: (idPoder: string, turnos: number, ouro: number) => void = () => {};
  aoAcordarComercio: (idPoder: string) => void = () => {};
  aoDesfazerAcordo: (idPoder: string) => void = () => {};
  aoConcederAcesso: (idPoder: string, turnos: number) => void = () => {};
  aoRevogarAcesso: (idPoder: string) => void = () => {};
  aoResponderPedido: (idPoder: string, tipo: string, aceita: boolean) => void = () => {};
  aoRomperPacto: (idPoder: string) => void = () => {};
  aoFirmarAlianca: (idPoder: string, turnos: number, ouro: number) => void = () => {};
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
   * Qual ficha de tratado está ABERTA. Uma por vez, e a escolha atravessa os reinos.
   *
   * ⚠️ **Três estados e não dois, e o terceiro é o que faz a coluna ter cara ao abrir.**
   * `null` é *"ele ainda não escolheu"*, e aí a primeira ficha abre sozinha — uma coluna de
   * sete linhas todas fechadas não ensina que elas abrem, e deixaria a tela vazia. `''` é
   * *"ele fechou a que estava aberta"*, e essa vontade tem de ser respeitada: sem o terceiro
   * estado, fechar a ficha faria a primeira reabrir no mesmo instante.
   *
   * ⚠️ **E a escolha sobrevive à troca de interlocutor de propósito.** A pergunta que se faz
   * numa mesa raramente é "o que dá para fazer com Argos": é *"quem assinaria um pacto
   * comigo"* — e essa se responde correndo a lista com a ficha do pacto aberta.
   */
  private grupoAberto: string | null = null;
  /**
   * A última vista desenhada.
   *
   * ⚠️ **Trocar de interlocutor é decisão da TELA, e não do mundo.** Nada muda nas regras
   * quando o jogador clica noutro nome — pedir um redesenho à aplicação salvaria o jogo e
   * repintaria o mapa por causa disso. Com a vista guardada, a janela redesenha a si mesma.
   */
  private ultima: VistaDaDiplomacia = VISTA_VAZIA;
  /** O estandarte do jogador, no alto da janela: quem está falando. */
  private readonly selo = document.createElement('span');
  /** O rodapé: a sua palavra empenhada e a data. Uma vez, e não em cada interlocutor. */
  private readonly rodape = document.createElement('div');

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
    // ⚠️ **O estandarte do jogador no lugar da coruja genérica.** A coruja é de Atena e
    // marcava o botão da barra de turno; dentro da janela ela dizia "diplomacia" pela segunda
    // vez, ao lado da palavra "Negociações". O selo do reino diz outra coisa: *quem está
    // falando* — que é o que falta a quem abre a mesa sem lembrar com quem está jogando.
    this.selo.className = 'diplomacia__selo-reino';
    const palavra = document.createElement('span');
    palavra.textContent = 'Negociações';
    titulo.append(this.selo, palavra);
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

    this.rodape.className = 'diplomacia__rodape';

    janela.append(barra, faixaDeMeandro(), conteudo, faixaDeMeandro(true), this.rodape);
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

    this.selo.replaceChildren(
      ...(vista.meuBrasao.id === '' ? [] : [criarEstandarte(vista.meuBrasao, 'provincia')]),
    );
    this.desenharRodape(vista);
    this.lista.replaceChildren(...this.listaAgrupada(vista.vizinhos));
    const escolhido = vista.vizinhos.find((v) => v.id === this.escolhido);
    this.dossie.replaceChildren(
      ...(escolhido ? this.leituraDe(vista.eu, vista.meuBrasao, escolhido) : []),
    );
    // ⚠️ **A resposta dele vai para o TOPO da coluna, e não para o pé.** No pé ela nascia
    // abaixo de nove fichas numa coluna que rola — o jogador apertava "Propor paz" e a
    // resposta aparecia fora da vista, num lugar onde ele não tinha motivo para olhar.
    this.acoes.replaceChildren(this.aviso, ...(escolhido ? this.acoesDe(escolhido) : []));
  }

  /**
   * O rodapé: a SUA palavra e a data, uma vez só na janela.
   *
   * ⚠️ **A palavra saiu da tira de confronto, e a tira ficou melhor sem ela.** Lá era uma
   * linha `✓ palavra ✓` que dizia a mesma coisa dos dois lados em quase todos os pares — e
   * a sua reputação não muda de interlocutor para interlocutor, então repeti-la a cada clique
   * era desenhar dezessete vezes um dado que é um só. A dele continua onde importa: ao lado
   * do nome dele, e só quando está suja.
   */
  private desenharRodape(vista: VistaDaDiplomacia): void {
    const palavra = document.createElement('span');
    const limpa = vista.eu.reputacao >= 0;
    palavra.className = 'diplomacia__palavra';
    palavra.dataset['tom'] = limpa ? 'bom' : 'ruim';
    palavra.textContent = limpa
      ? 'Sua palavra: nenhum acordo quebrado'
      : `Sua palavra: ${vista.eu.reputacao} — o mundo lembra`;
    definirTooltip(palavra, {
      titulo: 'Reputação',
      corpo: limpa
        ? 'Quebrar um acordo derruba a sua reputação com TODOS os reinos, e não só com o traído.'
        : 'Ela volta sozinha, alguns pontos por turno, enquanto você não quebrar mais nada.',
    });
    const quando = document.createElement('span');
    quando.className = 'diplomacia__quando';
    quando.textContent = `${formatarAno(vista.ano)} · rodada ${vista.turno.toLocaleString('pt-BR')}`;
    this.rodape.replaceChildren(palavra, quando);
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

    // ⚠️ **O estandarte é a metade da linha que faltava, e a queixa foi literal:** *"falta os
    // banners de cada reino, falta distinguir, atualmente tenho que decorar nomes, ser humano é
    // melhor em decorar imagem do que nomes"*. Dezoito linhas de texto em ordem alfabética, com
    // nomes que rimam entre si — Cálcis, Cáristo, Corinto —, obrigavam a LER cada uma para
    // achar uma. Com o pano, a cor e o emblema respondem antes da palavra: a coruja é Atenas
    // esteja ela onde estiver na lista.
    const corpo = document.createElement('span');
    corpo.className = 'diplomacia__nome-corpo';

    // ⚠️ **O MOTIVO no lugar do vínculo, e é a correção que a lista esperava.** Ela mostrava o
    // vínculo — que é VAZIO para quase todo mundo — e a opinião, que na rodada 1 vale `0` para
    // dezesseis dos dezessete. O resultado, medido: dezessete linhas dizendo a mesma coisa, em
    // ordem alfabética, sem nada com que escolher. Henrique, olhando a tela: *"com quem eu devo
    // fazer diplomacia?"*. O motivo é uma frase concreta e diferente em cada linha — fronteira,
    // guerra alheia, cobiça, prazo de acordo —, e é ela que faz a lista escolher por você.
    const estado = document.createElement('span');
    estado.className = 'diplomacia__nome-estado';
    estado.textContent = vizinho.motivo;

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

    // A barrinha da força: comparar dezessete números é conta, comparar dezessete barras é um
    // olhar. O número exato continua na tira de confronto, onde ele decide de fato.
    const barra = document.createElement('span');
    barra.className = 'diplomacia__nome-barra';
    const preenchida = document.createElement('i');
    preenchida.style.width = `${Math.round(vizinho.forcaRelativa * 100)}%`;
    barra.appendChild(preenchida);

    corpo.append(nome, baixo, barra);
    botao.append(criarEstandarte(vizinho.brasao, 'hoste'), corpo);
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
  private leituraDe(
    eu: CartaoDoPoder,
    meuBrasao: BrasaoNaMesa,
    vizinho: VizinhoNaMesa,
  ): readonly HTMLElement[] {
    return [
      this.estado(vizinho),
      this.confronto(eu, meuBrasao, vizinho),
      this.opiniao(vizinho),
    ];
  }

  /**
   * A FRASE DO ALTO: *"Em guerra há 22 turnos"*.
   *
   * ⚠️ **É a primeira coisa que qualquer um procura, e a tela nunca a disse.** Tudo o que
   * compõe essa frase já estava na janela — a opinião, o prazo do pacto, o da aliança, a
   * trégua —, cada pedaço num canto diferente, e nenhum deles respondia *o que nós somos um
   * do outro*. Quem abrisse a mesa sem nunca ter jogado tinha de montar a situação a partir de
   * cinco números. Agora ela abre com a resposta, e o resto da coluna a detalha.
   */
  private estado(vizinho: VizinhoNaMesa): HTMLElement {
    const caixa = document.createElement('div');
    caixa.className = 'diplomacia__estado';
    caixa.dataset['tom'] = vizinho.emGuerra ? 'guerra' : 'paz';
    const frase = document.createElement('p');
    frase.className = 'diplomacia__estado-frase';
    frase.textContent = vizinho.desde;
    caixa.appendChild(frase);
    return caixa;
  }

  /**
   * A COLUNA DA DIREITA: o que fazer com ele. Zero prosa narrativa, por regra.
   *
   * ⚠️ **O pedido DELE vem primeiro, acima de tudo que você poderia propor.** A ordem é a
   * mensagem: quando o outro lado pede alguma coisa, é isso que está em cima da mesa.
   *
   * ⚠️ **E os tratados viraram uma LISTA QUE ABRE UMA POR VEZ, no lugar de oito fichas
   * espalhadas numa grade.** Henrique, olhando a tela pronta: *"a parte das ações, onde tem
   * pacto, presente, tá muito desorganizado, esses quadrados jogados, tinham que ser opções, e
   * quando selecionados abrir as opções, para deixar um embaixo do outro organizado (...) e
   * diminuir a quantidade de números e informações de uma vez"*. Ele está descrevendo o
   * defeito com precisão: a grade de duas colunas mostrava as OITO fichas abertas ao mesmo
   * tempo — vinte e um botões e trinta e um números de uma vez —, com alturas desiguais que
   * deixavam buracos, e nenhuma das oito era uma escolha, porque todas estavam sempre ali.
   *
   * Fechadas, as sete fichas de tratado dizem duas coisas e param: o nome e o que já está em
   * pé. Aberta, uma só, e ela mostra as opções empilhadas numa coluna com o ouro e o prazo
   * alinhados. A conta na tela cai de trinta e um números para os quatro ou seis da ficha que
   * o jogador escolheu ver.
   */
  private acoesDe(vizinho: VizinhoNaMesa): readonly HTMLElement[] {
    // ⚠️ **Só os TRATADOS rolam; guerra e paz ficam pregadas no pé da coluna.** Com o Tributo
    // aberto — seis linhas — a ficha da guerra saía da vista e aparecia cortada pela borda da
    // janela, que se lê como painel quebrado e não como conteúdo abaixo do corte. E é a única
    // ficha da tela que nunca pode estar escondida: sem guerra declarada a ordem de marcha
    // recusa, e esta é a única janela onde se declara.
    const rolagem = document.createElement('div');
    rolagem.className = 'diplomacia__rolagem';
    const partes: HTMLElement[] = [];
    // ⚠️ **O pedido também leva título.** Ele aparecia como uma caixa dourada com uma frase e
    // dois botões, sem uma palavra dizendo o que aquilo é — quem abre a mesa pela primeira vez
    // vê um bloco em destaque e não sabe se é aviso, oferta ou consequência. Os dois títulos
    // são um par, e é o par que ensina a coluna: primeiro o que ELE quer, depois o que você
    // pode querer.
    if (vizinho.pedido) {
      partes.push(tituloDaColuna(`O que ${vizinho.nome} pede`));
      partes.push(this.pedido(vizinho));
    }
    const tratados = vizinho.grupos.filter((g) => g.fixo !== true);
    if (tratados.length > 0) {
      partes.push(tituloDaColuna(vizinho.pedido ? 'Ou proponha você' : 'O que se pode propor'));
      const pilha = document.createElement('div');
      pilha.className = 'diplomacia__acoes';
      const aberto = this.qualAberto(tratados);
      for (const grupo of tratados) {
        pilha.appendChild(this.grupo(vizinho, grupo, grupo.titulo === aberto));
      }
      partes.push(pilha);
    }
    rolagem.append(...partes);
    // Guerra e paz nunca fecham: ver `GrupoDaMesa.fixo`.
    return [
      rolagem,
      ...vizinho.grupos.filter((g) => g.fixo === true).map((g) => this.grupo(vizinho, g, true)),
    ];
  }

  /**
   * Qual ficha abrir agora — a escolhida, se ela existir para este reino; senão a primeira.
   *
   * ⚠️ **A queda para a primeira é obrigatória, e não cortesia.** Os grupos mudam de reino
   * para reino: quem já está na sua liga não tem ficha de liga, e quem está em guerra não tem
   * ficha nenhuma de tratado. Sem a queda, atravessar a lista com o TRIBUTO aberto encontraria
   * um reino sem tributo e a coluna abriria fechada, sem uma palavra dizendo por quê.
   */
  private qualAberto(tratados: readonly GrupoDaMesa[]): string {
    if (this.grupoAberto === '') return '';
    const titulos = tratados.map((g) => g.titulo);
    if (this.grupoAberto !== null && titulos.includes(this.grupoAberto)) return this.grupoAberto;
    return titulos[0] ?? '';
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
  private confronto(
    eu: CartaoDoPoder,
    meuBrasao: BrasaoNaMesa,
    vizinho: VizinhoNaMesa,
  ): HTMLElement {
    const dele = vizinho.cartao;
    const caixa = document.createElement('div');
    caixa.className = 'diplomacia__confronto';

    // ⚠️ **Os dois panos frente a frente, e é o que faz a tira parecer uma MESA.** Os cartões
    // espelhados do Total War funcionam porque cada lado tem um rosto; aqui os dois lados eram
    // dois nomes na mesma fonte, e a única coisa que dizia de quem era cada coluna era a
    // posição. Com o estandarte de cada um na ponta de fora, o olho sabe de quem é o número
    // antes de ler o nome — e é o mesmo pano que ele acabou de escolher na lista.
    const nomes = document.createElement('div');
    nomes.className = 'diplomacia__confronto-nomes';
    const meuLado = document.createElement('div');
    meuLado.className = 'diplomacia__confronto-lado';
    const meuNome = document.createElement('h3');
    meuNome.className = 'diplomacia__meu-reino';
    meuNome.textContent = eu.nome;
    meuLado.append(criarEstandarte(meuBrasao, 'reino'), meuNome);
    const ladoDele = document.createElement('div');
    ladoDele.className = 'diplomacia__confronto-lado';
    ladoDele.dataset['dele'] = 'sim';
    const nomeDele = document.createElement('h3');
    // ⚠️ A classe do nome DELE não muda: é por ela que o teste de tela confere com quem o
    // jogador está falando.
    nomeDele.className = 'diplomacia__reino';
    nomeDele.textContent = dele.nome;
    ladoDele.append(criarEstandarte(vizinho.brasao, 'reino'), nomeDele);
    nomes.append(meuLado, ladoDele);
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
    caixa.appendChild(linha(n(eu.tesouro), 'tesouro', n(dele.tesouro)));
    if (eu.capital !== eu.nome || dele.capital !== dele.nome) {
      caixa.appendChild(
        linha(eu.capital || '— exílio —', 'capital', dele.capital || '— exílio —'),
      );
    }

    // ⚠️ **AS TRÊS LINHAS DE ESCUDO, e são a metade nova da tira.** Antes o mundo em volta
    // aparecia só do lado DELE, em letra miúda no rodapé do dossiê — "em guerra com Tebas ·
    // comercia com Corinto". Espelhadas e em brasão, as mesmas relações valem para os dois
    // lados, ficam na linha a que pertencem, e ocupam menos espaço do que ocupavam para um
    // lado só. É o que responde *"quem está com quem"* sem uma frase.
    for (const [rotulo, meus, seus] of [
      ['aliados', eu.aliados, dele.aliados],
      ['em guerra com', eu.inimigos, dele.inimigos],
      ['comerciam com', eu.comercio, dele.comercio],
    ] as const) {
      if (meus.length === 0 && seus.length === 0) continue;
      const l = document.createElement('div');
      l.className = 'diplomacia__confronto-linha';
      l.dataset['brasoes'] = 'sim';
      const meio = document.createElement('span');
      meio.className = 'diplomacia__confronto-rotulo';
      meio.textContent = rotulo;
      const esquerda = fileiraDeBrasoes(meus, `${eu.nome} — ${rotulo}`);
      esquerda.classList.add('diplomacia__confronto-meu');
      const direita = fileiraDeBrasoes(seus, `${dele.nome} — ${rotulo}`);
      direita.classList.add('diplomacia__confronto-dele');
      l.append(esquerda, meio, direita);
      caixa.appendChild(l);
    }

    const rodape = document.createElement('p');
    rodape.className = 'diplomacia__confronto-rodape';
    // ⚠️ **Uma frase, e não uma lista de marcas.** Era `guerreiro · fronteira (2)` — dois
    // fragmentos telegráficos separados por ponto, que ninguém lê como frase e que repetem a
    // contagem da fronteira já contada no selo da lista. Agora o rodapé diz a única coisa que
    // não está escrita em nenhum outro canto: como ELE joga.
    rodape.textContent = `${dele.nome} joga como ${dele.linha}.`;
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
    // ⚠️ **A postura, sempre — e nunca mais "EM GUERRA" aqui.** A frase do alto já diz que há
    // guerra, e com quanto tempo; repetir a palavra três linhas abaixo gastava o lugar do
    // único dado que este rótulo tem para dar, que é o NOME da faixa em que a opinião caiu.
    rotulo.textContent = vizinho.postura.toUpperCase();

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
    // ⚠️ **Parcela de zero não entra.** "indiferença 0" ocupava uma linha inteira para dizer
    // que nada acontece — e é a primeira linha da conta, a que o olho lê antes das outras. Uma
    // conta de opinião só precisa mostrar o que mexeu nela.
    for (const parcela of vizinho.parcelas.filter((p) => p.pontos !== 0)) {
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

    // ⚠️ **Sem frase embaixo da régua.** "Atenas já considera marchar sobre você" era frase de
    // efeito sobre uma régua que já desenha a linha; Henrique: *"coisas inúteis e ruins"*. A
    // marca basta, e o número da linha fica no tooltip.
    definirTooltip(trilho, {
      titulo: `Linha de ataque: ${vizinho.linhaDeAtaque}`,
      corpo: `Com a opinião nesta marca ou abaixo, ${vizinho.nome} pode declarar guerra.`,
    });

    caixa.append(trilho);
    return caixa;
  }


  /**
   * Uma FICHA DE TRATADO: cabeçalho sempre visível, opções só quando ela está aberta.
   *
   * ⚠️ **O cabeçalho fechado tem de dizer alguma coisa, senão fechar não vale a pena.** Uma
   * lista de sete nomes de tratado responde *"o que existe no jogo"*, que é a mesma resposta
   * para os dezoito reinos; o que muda de reino para reino é o que já foi assinado. Por isso a
   * linha fechada carrega três marcas e nada mais: o nome, o RESUMO do que está em pé — *em
   * vigor · 34 turnos*, *você lidera*, *ele paga* — e a palavra com a vontade dele.
   *
   * ⚠️ **A palavra dele fica no cabeçalho, e não é um selo.** Henrique: *"não quero um sistema
   * de criança 'se der verde compra, vermelho erro'"*. São três palavras — assinaria,
   * relutante, fechado — e a ficha aberta mostra a CONTA: as parcelas da balança dele e, em
   * cada linha, o saldo no lugar onde havia um ✓ ou um ✗.
   */
  private grupo(vizinho: VizinhoNaMesa, grupo: GrupoDaMesa, aberto: boolean): HTMLElement {
    const caixa = document.createElement('div');
    caixa.className = 'diplomacia__grupo';
    caixa.dataset['grupo'] = grupo.titulo.toLowerCase();
    caixa.dataset['aberto'] = aberto ? 'sim' : 'nao';
    if (grupo.fixo) caixa.dataset['fixo'] = 'sim';

    const livres = grupo.propostas.filter((p) => p.pode);
    const vontade =
      grupo.vontadeDele !== true || livres.length === 0
        ? null
        : livres.some((p) => p.aceita)
          ? 'assinaria'
          : grupo.semSaida
            ? 'fechado'
            : 'relutante';

    caixa.appendChild(this.cabecalho(vizinho, grupo, aberto, vontade));
    if (!aberto) return caixa;

    const corpo = document.createElement('div');
    corpo.className = 'diplomacia__ficha-corpo';
    if (grupo.fala !== '') {
      const fala = document.createElement('p');
      fala.className = 'diplomacia__fala';
      // ⚠️ **A cor só entra quando a frase é DELE.** O `tom` espelha "ele assinaria isto?", e
      // pintar a descrição do acordo com ele fazia "Nenhum dos dois marcha sobre o outro" —
      // que é a definição de um pacto e vale sempre — sair em vermelho de alarme. Quem
      // responde se ele aceita é a palavra do cabeçalho.
      if (grupo.vozDele) fala.dataset['tom'] = grupo.tom;
      fala.dataset['voz'] = grupo.vozDele ? 'dele' : 'regra';
      fala.textContent = grupo.fala;
      corpo.appendChild(fala);
    }
    // A conta aberta: as parcelas da balança dele, no mesmo desenho das parcelas da opinião.
    if (grupo.balanca !== undefined && grupo.balanca.length > 0) {
      corpo.appendChild(this.balanca(grupo.balanca));
    }
    const opcoes = document.createElement('div');
    opcoes.className = 'diplomacia__opcoes';
    for (const proposta of grupo.propostas) {
      opcoes.appendChild(this.opcao(vizinho, grupo, proposta));
    }
    corpo.appendChild(opcoes);
    caixa.appendChild(corpo);
    return caixa;
  }

  /** As parcelas da balança dele, rótulo e número, com o saldo fechando a lista. */
  private balanca(parcelas: readonly { rotulo: string; pontos: number }[]): HTMLElement {
    const lista = document.createElement('ul');
    lista.className = 'diplomacia__parcelas diplomacia__balanca';
    for (const parcela of parcelas) {
      const linha = document.createElement('li');
      linha.dataset['tom'] = parcela.pontos >= 0 ? 'bom' : 'ruim';
      const nome = document.createElement('span');
      nome.textContent = parcela.rotulo;
      const pontos = document.createElement('span');
      pontos.className = 'diplomacia__pontos';
      pontos.textContent = sinal(parcela.pontos);
      linha.append(nome, pontos);
      lista.appendChild(linha);
    }
    const saldo = parcelas.reduce((soma, p) => soma + p.pontos, 0);
    const total = document.createElement('li');
    total.className = 'diplomacia__balanca-saldo';
    total.dataset['tom'] = saldo >= 0 ? 'bom' : 'ruim';
    const nome = document.createElement('span');
    nome.textContent = 'saldo';
    const pontos = document.createElement('span');
    pontos.className = 'diplomacia__pontos';
    pontos.textContent = sinal(saldo);
    total.append(nome, pontos);
    lista.appendChild(total);
    return lista;
  }

  /** A linha que abre e fecha a ficha — ou, em guerra e paz, só o título dela. */
  private cabecalho(
    vizinho: VizinhoNaMesa,
    grupo: GrupoDaMesa,
    aberto: boolean,
    vontade: 'assinaria' | 'relutante' | 'fechado' | null,
  ): HTMLElement {
    const topo = grupo.fixo ? document.createElement('div') : document.createElement('button');
    topo.className = 'diplomacia__ficha-topo';

    if (!grupo.fixo) {
      const seta = document.createElement('span');
      seta.className = 'diplomacia__seta';
      seta.setAttribute('aria-hidden', 'true');
      seta.textContent = aberto ? '\u25BE' : '\u25B8';
      topo.appendChild(seta);
    }

    const rotulo = document.createElement('span');
    rotulo.className = 'diplomacia__rotulo';
    rotulo.textContent = grupo.titulo;
    topo.appendChild(rotulo);

    // O resumo é o que a ficha fechada tem para dizer, e some quando não há nada em pé.
    if (grupo.resumo !== '') {
      const resumo = document.createElement('span');
      resumo.className = 'diplomacia__resumo-ficha';
      resumo.textContent = grupo.resumo;
      topo.appendChild(resumo);
    }

    // ⚠️ **A palavra só onde existe pergunta.** Ver `GrupoDaMesa.vontadeDele`: guerra, passagem
    // e presente são atos unilaterais, e a marca que a tela punha neles dizia "ele topa" sobre
    // coisas que ele não decide.
    if (vontade !== null) {
      const palavra = document.createElement('span');
      palavra.className = 'diplomacia__vontade';
      palavra.dataset['vontade'] = vontade;
      palavra.textContent = vontade;
      definirTooltip(palavra, {
        titulo: `${grupo.titulo} — ${vizinho.nome}`,
        corpo:
          vontade === 'assinaria'
            ? 'Ele assinaria isto hoje.'
            : vontade === 'relutante'
              ? 'Ele recusaria hoje. Abra a ficha: ela diz o que o faria mudar.'
              : 'Nada que você ofereça fecha isto hoje. Mude os fatos.',
      });
      topo.appendChild(palavra);
    }

    if (topo instanceof HTMLButtonElement) {
      topo.type = 'button';
      topo.setAttribute('aria-expanded', String(aberto));
      topo.addEventListener('click', () => {
        // Clicar na aberta FECHA — e o `''` é o que impede a primeira de reabrir sozinha no
        // redesenho seguinte. Ver `grupoAberto`.
        this.grupoAberto = aberto ? '' : grupo.titulo;
        this.desenhar(this.ultima);
      });
    }
    return topo;
  }

  /**
   * Uma opção dentro da ficha aberta — **uma LINHA de três colunas, e não um botão de rótulo.**
   *
   * ⚠️ **É a resposta direta ao que Henrique pediu:** *"quero que apareça quanto custa,
   * quantos rounds quando for mandar uma proposta"*. Antes as duas contas moravam dentro do
   * rótulo, e cada ficha as escrevia à sua maneira — `Pagar 155 · 20 turnos` numa, `20 turnos`
   * na de baixo, `1.550 ouro · +29` ao lado. Três gramáticas, nenhuma coluna, e comparar a
   * terceira parcela do tributo com a quinta era caçar um número dentro de uma frase.
   *
   * Agora o verbo alinha à esquerda e as duas contas à direita, uma sob a outra, com sinal: o
   * que é vermelho sai do cofre, o que é verde entra. A comparação vira uma descida de olho.
   *
   * ⚠️ **Três estados e não dois**, e a diferença entre eles é a tela inteira: ele assina, ele
   * recusa, e apagado quando é a REGRA que barra — cofre curto, guerra em curso, pacto em pé.
   * Um botão apagado porque falta ouro e um apagado porque ele te odeia são dois problemas com
   * duas soluções, e a tela nunca os pinta igual. E a recusa **não desabilita**: recusa é
   * resposta, não impedimento — o jogador propõe assim mesmo e ouve o não.
   *
   * ⚠️ **A última célula é o SALDO da balança dele, e não um ✓ ou um ✗.** O número com sinal
   * diz o quanto sobra ou falta nesta linha; as parcelas acima dizem por quê. Onde ainda não há
   * balança (tributo, paz), a célula diz a resposta em palavra.
   */
  private opcao(
    vizinho: VizinhoNaMesa,
    grupo: GrupoDaMesa,
    proposta: Proposta,
  ): HTMLButtonElement {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'diplomacia__acao';
    botao.dataset['acao'] = proposta.acao;
    if (proposta.valor !== 0) botao.dataset['valor'] = String(proposta.valor);
    botao.disabled = !proposta.pode;
    botao.dataset['resposta'] = !proposta.pode ? 'travado' : proposta.aceita ? 'sim' : 'nao';

    const verbo = document.createElement('span');
    verbo.className = 'diplomacia__acao-verbo';
    verbo.textContent = proposta.rotulo;

    // ⚠️ **Célula VAZIA no lugar do traço.** O `—` da vista é "aqui não se mexe no cofre", e
    // desenhado vira um sinal que o olho tem de conferir para descobrir que não diz nada — dois
    // deles na linha de declarar guerra, que não tem preço nem prazo. A largura da coluna é
    // fixa, então o alinhamento não depende de haver conteúdo.
    const custo = document.createElement('span');
    custo.className = 'diplomacia__acao-custo';
    custo.textContent = proposta.custo === '—' ? '' : proposta.custo;
    // O tom sai do SINAL e de mais nada: uma regra só para as nove fichas, sem uma lista de
    // ações no CSS para manter de acordo com a vista.
    if (proposta.custo.startsWith('+')) custo.dataset['tom'] = 'bom';
    else if (proposta.custo.startsWith('−')) custo.dataset['tom'] = 'ruim';

    const prazo = document.createElement('span');
    prazo.className = 'diplomacia__acao-prazo';
    prazo.textContent = proposta.prazo === '—' ? '' : proposta.prazo;
    // O presente escreve o GANHO nesta coluna, e o sinal vale nela igual: `+20 de opinião` é o
    // que a quantia compra, e é a única coisa que se compara entre as três linhas da ficha.
    if (proposta.prazo.startsWith('+')) prazo.dataset['tom'] = 'bom';

    // ⚠️ A célula tem lugar fixo mesmo vazia: sem ela, uma ficha em que só parte das linhas
    // leva resposta teria as colunas de prazo desalinhadas entre si.
    const selo = document.createElement('span');
    selo.className = 'diplomacia__selo';
    if (proposta.pode && grupo.vontadeDele === true) {
      if (proposta.saldo !== undefined) {
        selo.textContent = sinal(proposta.saldo);
        selo.dataset['tom'] = proposta.saldo >= 0 ? 'bom' : 'ruim';
      } else {
        selo.textContent = proposta.aceita ? 'aceita' : 'recusa';
      }
    }

    botao.append(verbo, custo, prazo, selo);
    definirTooltip(botao, {
      titulo: `${grupo.titulo} — ${vizinho.nome}`,
      corpo: !proposta.pode
        ? proposta.bloqueio || 'as regras não deixam agora'
        : proposta.aceita
          ? 'Ele assinaria isto hoje.'
          : proposta.pedido !== undefined && proposta.pedido !== ''
            ? `Ele recusaria. ${proposta.pedido[0]?.toUpperCase() ?? ''}${proposta.pedido.slice(1)}.`
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
        return this.aoFirmarPacto(id, proposta.valor, proposta.ouro ?? 0);
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
        return this.aoFirmarAlianca(id, proposta.valor, proposta.ouro ?? 0);
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
