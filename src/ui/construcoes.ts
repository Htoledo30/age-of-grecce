/**
 * A mesa de obras da província.
 *
 * O catálogo é uma lista para varrer, não uma grade de pequenas planilhas. Cada linha
 * responde só três perguntas — o que é, o que muda e quanto custa — e a obra selecionada
 * ganha o espaço de decisão à direita. Assim a comparação continua rápida sem encolher
 * texto nem repetir a mesma ação dez vezes.
 */

import { Janela } from './janela';
import { iconeDaConstrucao, iconeGrego } from './icones-gregos';
import type { NomeDoIconeGrego } from './icones-gregos';
import { imagemDaConstrucao } from './imagens-de-construcoes';
import { moedaAteniense } from './moeda';
import { definirTooltip } from './tooltip';

type CategoriaDaConstrucao = 'cidade' | 'guerra' | 'rotas' | 'terra';

export interface EfeitoDaConstrucao {
  valor: string;
  rotulo: string;
  icone: NomeDoIconeGrego;
  tom: 'ouro' | 'ganho' | 'perda' | 'neutro';
}

export interface ApresentacaoDaConstrucao {
  categoria: CategoriaDaConstrucao;
  categoriaNome: string;
  /** O primeiro efeito identifica a obra na lista; o detalhe mostra todos. */
  efeitos: readonly [EfeitoDaConstrucao, ...EfeitoDaConstrucao[]];
}

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
  /** `null` quando dá para construir; senão, o texto do impedimento. */
  recusa: string | null;
  ganhoPorTurno: number;
  turnosParaPagar: number;
  /** Ouro por turno para manter o nível alvo de pé, para sempre. */
  manutencao: number;
  apresentacao: ApresentacaoDaConstrucao;
}

/** O que a janela precisa saber para desenhar o catálogo desta província. */
export interface VistaDeConstrucoes {
  provincia: { id: string; nome: string };
  /** A região a que ela pertence — a âncora da janela. O poder é sempre o jogador aqui. */
  regiao: string;
  slots: { usados: number; total: number };
  construcoes: readonly OpcaoDeConstrucao[];
  /** O ouro do reino agora: o que separa "cara" de "impossível". */
  tesouro: number;
}

type EstadoDaOpcao = 'livre' | 'sem-ouro' | 'bloqueada' | 'obra' | 'maximo';

const ORDEM_DAS_CATEGORIAS: Record<CategoriaDaConstrucao, number> = {
  cidade: 0,
  guerra: 1,
  rotas: 2,
  terra: 3,
};

export class JanelaDeConstrucoes {
  private readonly janela: Janela;
  private readonly resumo = document.createElement('section');
  private readonly catalogo = document.createElement('div');
  private readonly detalhe = document.createElement('article');
  private vista: VistaDeConstrucoes | null = null;
  private selecionada: string | null = null;

  /** Chamado quando o jogador ergue uma construção. */
  aoConstruir: (idProvincia: string, idConstrucao: string) => void = () => {};
  /** Chamado quando o jogador derruba a obra aberta no detalhe. */
  aoDemolir: (idProvincia: string, idConstrucao: string) => void = () => {};

  constructor(pai: HTMLElement) {
    this.janela = new Janela(pai, 'Construções', 'martelo', '1200px');
    this.janela.corpo.classList.add('construcoes');
    this.resumo.className = 'construcoes__resumo';
    this.catalogo.className = 'construcoes__catalogo';
    this.detalhe.className = 'construcoes__detalhe';
    this.detalhe.setAttribute('aria-live', 'polite');

    const mesa = document.createElement('div');
    mesa.className = 'construcoes__mesa';
    mesa.append(this.catalogo, this.detalhe);
    this.janela.corpo.append(this.resumo, mesa);
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
    const opcoes = ordenar(vista.construcoes);
    if (!opcoes.some((opcao) => opcao.id === this.selecionada)) {
      this.selecionada =
        opcoes.find((opcao) => estadoDe(opcao, vista.tesouro) === 'livre')?.id ??
        opcoes[0]?.id ??
        null;
    }

    this.desenharResumo(opcoes);
    this.desenharCatalogo(opcoes);
    this.desenharDetalhe(opcoes.find((opcao) => opcao.id === this.selecionada) ?? null);
  }

  /**
   * Os quatro slots são patrimônio, não estatística: mostram o que ocupa cada lugar.
   * Uma obra nova em andamento aparece tracejada no próximo espaço, antes de ficar pronta.
   */
  private desenharResumo(opcoes: readonly OpcaoDeConstrucao[]): void {
    const vista = this.vista;
    if (!vista) return;

    const titulo = document.createElement('div');
    titulo.className = 'construcoes__patrimonio';
    const rotulo = document.createElement('span');
    rotulo.textContent = 'Patrimônio';
    const ocupacao = document.createElement('strong');
    ocupacao.textContent = `${vista.slots.usados}/${vista.slots.total}`;
    titulo.append(rotulo, ocupacao);

    const trilha = document.createElement('div');
    trilha.className = 'construcoes__slots';
    trilha.setAttribute(
      'aria-label',
      `${vista.slots.usados} de ${vista.slots.total} espaços ocupados`,
    );
    const erguidas = opcoes.filter((opcao) => opcao.nivelAtual > 0);
    const novaEmObra = opcoes.find((opcao) => opcao.nivelAtual === 0 && opcao.emObra !== null);

    for (let indice = 0; indice < vista.slots.total; indice++) {
      const opcao = erguidas[indice] ?? (indice === erguidas.length ? novaEmObra : undefined);
      trilha.append(this.slot(opcao));
    }

    const tesouro = document.createElement('div');
    tesouro.className = 'construcoes__tesouro';
    const nome = document.createElement('span');
    nome.textContent = 'Tesouro';
    const valor = document.createElement('strong');
    valor.append(moedaAteniense(), document.createTextNode(moeda(vista.tesouro)));
    tesouro.append(nome, valor);

    this.resumo.replaceChildren(titulo, trilha, tesouro);
  }

  private slot(opcao: OpcaoDeConstrucao | undefined): HTMLElement {
    const slot = document.createElement('div');
    slot.className = 'construcoes__slot';
    if (!opcao) {
      slot.dataset['estado'] = 'livre';
      slot.setAttribute('role', 'img');
      slot.setAttribute('aria-label', 'Espaço livre');
      slot.append(iconeGrego('fundacao'));
      definirTooltip(slot, { titulo: 'Espaço livre' });
      return slot;
    }

    slot.dataset['estado'] = opcao.emObra === null ? 'erguida' : 'obra';
    slot.dataset['categoria'] = opcao.apresentacao.categoria;
    slot.dataset['construcao'] = opcao.id;
    slot.dataset['fase'] =
      opcao.emObra === null ? 'concluida' : opcao.nivelAtual > 0 ? 'ampliacao' : 'nova';
    const imagem = arteDaConstrucao(opcao.id, 'construcoes__slot-imagem');
    const textos = document.createElement('span');
    const nome = document.createElement('strong');
    nome.textContent = opcao.nome;
    const nivel = document.createElement('small');
    const destino = opcao.emObra === null ? '' : ` → ${romano(opcao.nivelAlvo)}`;
    const espera = opcao.emObra === null ? '' : ` · ${opcao.emObra}t`;
    nivel.textContent = `${opcao.nivelAtual > 0 ? romano(opcao.nivelAtual) : 'nova'}${destino}${espera}`;
    textos.append(nome, nivel);
    slot.append(...(imagem ? [imagem] : [iconeGrego(iconeDaConstrucao(opcao.id))]), textos);
    definirTooltip(slot, { titulo: opcao.nome, corpo: `Nível ${nivel.textContent}` });
    return slot;
  }

  /** A lista alinha efeito e custo; clicar escolhe, mas ainda não compra. */
  private desenharCatalogo(opcoes: readonly OpcaoDeConstrucao[]): void {
    const vista = this.vista;
    if (!vista) return;

    // ⚠️ **Agrupado por família, com a arte de cada obra.** Era uma tabela de dez linhas iguais —
    // ícone de traço, rótulos em caixa alta de 10px e "2T" no lugar de prazo —, e Henrique:
    // *"horrível, preguiçoso, sem vida e confuso"*. A família virou título de seção, a vinheta
    // da obra dá cara a cada linha, e o efeito é uma frase curta: "+45 moedas por turno".
    const lista = document.createElement('div');
    lista.className = 'construcoes__lista';
    for (const [categoria, nome] of FAMILIAS) {
      const daFamilia = opcoes.filter((o) => o.apresentacao.categoria === categoria);
      if (daFamilia.length === 0) continue;
      const secao = document.createElement('section');
      secao.className = 'construcoes__familia';
      secao.dataset['categoria'] = categoria;
      const titulo = document.createElement('h3');
      titulo.className = 'construcoes__familia-titulo';
      titulo.textContent = nome;
      secao.append(titulo, ...daFamilia.map((opcao) => this.cartao(opcao)));
      lista.append(secao);
    }
    this.catalogo.replaceChildren(lista);
  }

  private cartao(opcao: OpcaoDeConstrucao): HTMLElement {
    const vista = this.vista;
    const estado = estadoDe(opcao, vista?.tesouro ?? 0);
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'construcoes__cartao';
    botao.dataset['construcao'] = opcao.id;
    botao.dataset['estado'] = estado;
    botao.dataset['categoria'] = opcao.apresentacao.categoria;
    botao.setAttribute('aria-pressed', String(opcao.id === this.selecionada));
    botao.setAttribute('aria-label', `Ver ${opcao.nome}`);

    const marca = document.createElement('span');
    marca.className = 'construcoes__marca';
    const vinheta = arteDaConstrucao(opcao.id, 'construcoes__vinheta');
    marca.append(vinheta ?? iconeGrego(iconeDaConstrucao(opcao.id), 'construcoes__icone'));

    const identidade = document.createElement('span');
    identidade.className = 'construcoes__identidade';
    const linhaDoNome = document.createElement('span');
    linhaDoNome.className = 'construcoes__linha-do-nome';
    const nome = document.createElement('strong');
    nome.className = 'construcoes__nome';
    nome.textContent = opcao.nome;
    linhaDoNome.append(nome);
    // O nível só aparece quando diz alguma coisa: ampliar, em obra, pronta. "Nova" era ruído
    // em nove de dez linhas.
    const situacao = nivelNaLista(opcao, estado);
    if (situacao !== 'nova') {
      const nivel = document.createElement('small');
      nivel.className = 'construcoes__nivel';
      nivel.textContent = situacao;
      linhaDoNome.append(nivel);
    }
    const efeito = document.createElement('span');
    efeito.className = 'construcoes__efeito-lista';
    const principal = opcao.apresentacao.efeitos[0];
    efeito.dataset['tom'] = principal.tom;
    const efeitoValor = document.createElement('strong');
    efeitoValor.textContent = principal.valor;
    efeito.append(efeitoValor);
    if (principal.rotulo) {
      efeito.append(` ${principal.rotulo}`);
    }
    identidade.append(linhaDoNome, efeito);

    const preco = document.createElement('span');
    preco.className = 'construcoes__preco-lista';
    if (estado === 'maximo') {
      preco.textContent = 'pronta';
    } else if (estado === 'obra') {
      const t = opcao.emObra ?? 0;
      preco.textContent = `${t} ${t === 1 ? 'turno' : 'turnos'}`;
    } else {
      const ouro = document.createElement('strong');
      ouro.append(moedaAteniense(), moeda(opcao.custo));
      preco.append(ouro);
    }

    botao.append(marca, identidade, preco);
    botao.addEventListener('click', () => {
      this.selecionada = opcao.id;
      for (const item of this.catalogo.querySelectorAll<HTMLButtonElement>(
        '.construcoes__cartao',
      )) {
        item.setAttribute('aria-pressed', String(item.dataset['construcao'] === opcao.id));
      }
      this.desenharDetalhe(opcao);
    });
    return botao;
  }

  /** A segunda batida: agora há contexto suficiente para comprar com intenção. */
  private desenharDetalhe(opcao: OpcaoDeConstrucao | null): void {
    const vista = this.vista;
    if (!vista || !opcao) {
      this.detalhe.replaceChildren();
      return;
    }

    const estado = estadoDe(opcao, vista.tesouro);
    this.detalhe.dataset['estado'] = estado;
    this.detalhe.dataset['categoria'] = opcao.apresentacao.categoria;
    this.detalhe.dataset['construcao'] = opcao.id;

    const cabecalho = document.createElement('header');
    cabecalho.className = 'construcoes__detalhe-cabecalho';
    const imagem = arteDaConstrucao(opcao.id, 'construcoes__arte');
    if (imagem) cabecalho.append(imagem);
    const identidade = document.createElement('div');
    const supra = document.createElement('p');
    supra.className = 'construcoes__detalhe-supra';
    supra.textContent = `${opcao.apresentacao.categoriaNome} · ${destinoDaObra(opcao, estado)}`;
    const nome = document.createElement('h3');
    nome.textContent = opcao.nome;
    identidade.append(supra, nome, degraus(opcao));
    cabecalho.append(identidade);

    const impacto = document.createElement('section');
    impacto.className = 'construcoes__impacto';
    impacto.setAttribute('aria-label', 'Efeitos da construção');
    impacto.append(...opcao.apresentacao.efeitos.map(linhaDeEfeito));

    const conta = document.createElement('dl');
    conta.className = 'construcoes__conta';
    if (estado !== 'maximo') {
      const custo = dado('Custo', moeda(opcao.custo), estado === 'sem-ouro' ? 'perda' : 'ouro');
      if (opcao.ganhoPorTurno > 0 && Number.isFinite(opcao.turnosParaPagar)) {
        const retorno = Math.ceil(opcao.turnosParaPagar);
        custo.tabIndex = 0;
        definirTooltip(custo, {
          titulo: 'Retorno estimado',
          corpo: `${retorno} ${retorno === 1 ? 'turno' : 'turnos'}`,
        });
      }
      conta.append(custo);
      conta.append(
        dado(
          'Prazo',
          estado === 'obra'
            ? `${opcao.emObra ?? 0} ${opcao.emObra === 1 ? 'turno' : 'turnos'}`
            : `${opcao.turnos} ${opcao.turnos === 1 ? 'turno' : 'turnos'}`,
        ),
      );
    }
    conta.append(
      dado(
        'Manutenção',
        opcao.manutencao > 0 ? `−${moeda(opcao.manutencao)} / turno` : 'sem custo',
        opcao.manutencao > 0 ? 'perda' : '',
      ),
    );

    this.detalhe.replaceChildren(cabecalho, impacto, conta, this.acoes(opcao, estado));
  }

  /**
   * A linha de decisão do detalhe: erguer, e — quando já existe — derrubar.
   *
   * ⚠️ **O botão de derrubar existe porque os quatro slots eram um beco sem saída.** Cheios os
   * quatro, o resto do catálogo virava enfeite: sem demolição, quem erguesse Ágora, Mercado,
   * Templo e Muralha cedo nunca mais poria uma Armaria naquela terra. Ele fica pequeno e ao
   * lado, e não compete com o de erguer: derrubar é a saída rara, não a ação do dia.
   */
  private acoes(opcao: OpcaoDeConstrucao, estado: EstadoDaOpcao): HTMLElement {
    const linha = document.createElement('div');
    linha.className = 'construcoes__decisao';
    linha.append(this.acao(opcao, estado));
    if (opcao.nivelAtual > 0) linha.append(this.derrubar(opcao));
    return linha;
  }

  /** O botão de derrubar. Só aparece onde há o que derrubar. */
  private derrubar(opcao: OpcaoDeConstrucao): HTMLElement {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'construcoes__derrubar';
    botao.textContent = 'Derrubar';
    definirTooltip(botao, {
      titulo: `Derrubar ${opcao.nome}`,
      // ⚠️ O aviso é a informação, não um pedido de confirmação: o jogo não pergunta "tem
      // certeza?" em lugar nenhum, e não vai começar aqui.
      corpo: 'Libera o espaço na hora. Não devolve moeda nenhuma, e some com todos os níveis.',
      tom: 'perigo',
    });
    botao.addEventListener('click', () => {
      const vista = this.vista;
      if (!vista) return;
      this.aoDemolir(vista.provincia.id, opcao.id);
      botao.blur();
    });
    return botao;
  }

  private acao(opcao: OpcaoDeConstrucao, estado: EstadoDaOpcao): HTMLElement {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'construcoes__erguer';

    if (estado === 'maximo') {
      botao.disabled = true;
      botao.textContent = 'Nível máximo';
      return botao;
    }
    if (estado === 'obra') {
      botao.disabled = true;
      botao.textContent = `Em obra · ${opcao.emObra ?? 0} ${opcao.emObra === 1 ? 'turno' : 'turnos'}`;
      return botao;
    }

    const verbo = opcao.nivelAtual > 0 ? 'Ampliar para' : 'Erguer nível';
    const texto = `${verbo} ${romano(opcao.nivelAlvo)}`;
    if (estado === 'sem-ouro') {
      // O custo está logo acima e o tesouro no topo. O botão apaga sem fazer a subtração
      // pelo jogador nem transformar uma falta de ouro numa frase repetida.
      botao.disabled = true;
      botao.dataset['motivo'] = 'ouro';
      botao.textContent = texto;
      return botao;
    }
    if (estado === 'bloqueada') {
      botao.disabled = true;
      botao.dataset['motivo'] = 'regra';
      botao.textContent = recusaCurta(opcao.recusa);
      return botao;
    }

    botao.append(iconeGrego('martelo'), document.createTextNode(texto));
    botao.addEventListener('click', () => {
      const vista = this.vista;
      if (!vista || botao.disabled) return;
      this.aoConstruir(vista.provincia.id, opcao.id);
      botao.blur();
    });
    return botao;
  }
}

/** A mesma arte serve ao detalhe e ao patrimônio; texto adjacente já dá o nome acessível. */
function arteDaConstrucao(id: string, classe: string): HTMLImageElement | null {
  const origem = imagemDaConstrucao(id);
  if (!origem) return null;
  const imagem = document.createElement('img');
  imagem.className = classe;
  imagem.src = origem;
  imagem.alt = '';
  imagem.draggable = false;
  imagem.decoding = 'async';
  return imagem;
}

function ordenar(opcoes: readonly OpcaoDeConstrucao[]): readonly OpcaoDeConstrucao[] {
  return [...opcoes].sort(
    (a, b) =>
      ORDEM_DAS_CATEGORIAS[a.apresentacao.categoria] -
      ORDEM_DAS_CATEGORIAS[b.apresentacao.categoria],
  );
}

function estadoDe(opcao: OpcaoDeConstrucao, tesouro: number): EstadoDaOpcao {
  if (opcao.nivelAtual >= opcao.nivelMaximo) return 'maximo';
  if (opcao.emObra !== null) return 'obra';
  if (opcao.recusa && !/^faltam [\d.]+ moedas$/.test(opcao.recusa)) return 'bloqueada';
  if (opcao.custo > tesouro) return 'sem-ouro';
  return 'livre';
}

/** As famílias do catálogo, na ordem em que aparecem. */
const FAMILIAS: readonly (readonly [string, string])[] = [
  ['cidade', 'Cidade'],
  ['terra', 'Terra'],
  ['rotas', 'Rotas'],
  ['guerra', 'Guerra'],
];

function nivelNaLista(opcao: OpcaoDeConstrucao, estado: EstadoDaOpcao): string {
  if (estado === 'maximo') return `nível ${romano(opcao.nivelAtual)}`;
  if (estado === 'obra') {
    return opcao.nivelAtual > 0
      ? `${romano(opcao.nivelAtual)} → ${romano(opcao.nivelAlvo)}`
      : `nível ${romano(opcao.nivelAlvo)} em obra`;
  }
  return opcao.nivelAtual > 0 ? `${romano(opcao.nivelAtual)} → ${romano(opcao.nivelAlvo)}` : 'nova';
}

function destinoDaObra(opcao: OpcaoDeConstrucao, estado: EstadoDaOpcao): string {
  if (estado === 'maximo') return `nível ${romano(opcao.nivelAtual)}`;
  // O botão e o patrimônio já dizem "em obra" e o prazo; aqui basta situar o nível.
  if (estado === 'obra') return `nível ${romano(opcao.nivelAlvo)}`;
  return opcao.nivelAtual > 0
    ? `ampliar para ${romano(opcao.nivelAlvo)}`
    : `novo · nível ${romano(opcao.nivelAlvo)}`;
}

/** A progressão fica no detalhe, onde os romanos dizem claramente o nível atual e o alvo. */
function degraus(opcao: OpcaoDeConstrucao): HTMLElement {
  const trilha = document.createElement('div');
  trilha.className = 'construcoes__degraus';
  trilha.setAttribute('aria-label', `nível ${opcao.nivelAtual} de ${opcao.nivelMaximo}`);
  for (let nivel = 1; nivel <= opcao.nivelMaximo; nivel++) {
    const degrau = document.createElement('span');
    degrau.textContent = romano(nivel);
    degrau.dataset['estado'] =
      nivel <= opcao.nivelAtual ? 'erguido' : nivel === opcao.nivelAlvo ? 'alvo' : 'futuro';
    if (opcao.emObra !== null && nivel === opcao.nivelAlvo) degrau.dataset['estado'] = 'obra';
    trilha.append(degrau);
  }
  return trilha;
}

function dado(rotulo: string, valor: string, tom = ''): HTMLElement {
  const grupo = document.createElement('div');
  if (tom) grupo.dataset['tom'] = tom;
  const dt = document.createElement('dt');
  dt.textContent = rotulo;
  const dd = document.createElement('dd');
  if (tom === 'ouro' || tom === 'perda') dd.append(moedaAteniense());
  dd.append(valor);
  grupo.append(dt, dd);
  return grupo;
}

function linhaDeEfeito(efeito: EfeitoDaConstrucao): HTMLElement {
  const linha = document.createElement('div');
  linha.className = 'construcoes__efeito';
  linha.dataset['tom'] = efeito.tom;
  const valor = document.createElement('strong');
  valor.textContent = efeito.valor;
  const icone = efeito.icone === 'moeda' ? moedaAteniense() : iconeGrego(efeito.icone);
  const rotulo = document.createElement('span');
  rotulo.textContent = efeito.rotulo;
  linha.append(valor, icone, rotulo);
  return linha;
}

function recusaCurta(recusa: string | null): string {
  if (!recusa) return 'Indisponível';
  if (recusa.includes('slots estão ocupados')) return 'Sem espaço livre';
  if (recusa.includes('em obra aqui')) return 'Outra obra em andamento';
  if (recusa === 'nível máximo') return 'Nível máximo';
  return `${recusa.charAt(0).toUpperCase()}${recusa.slice(1)}`;
}

function romano(nivel: number): string {
  return ['I', 'II', 'III', 'IV', 'V'][nivel - 1] ?? String(nivel);
}

function moeda(valor: number): string {
  return valor.toLocaleString('pt-BR');
}
