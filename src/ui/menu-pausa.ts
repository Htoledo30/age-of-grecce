/** Menu de pausa e opções locais da sessão. Não conhece campanha nem salvamento. */

import type { MotorDeAudio } from '@/audio/motor-de-audio';
import {
  definirTamanhoDaInterface,
  TAMANHOS_DA_INTERFACE,
  type TamanhoDaInterface,
} from '@/estilo/escala';
import { iconeGrego } from './icones-gregos';

type TelaDaPausa = 'menu' | 'opcoes';

export class MenuPausa {
  private readonly raiz = document.createElement('div');
  private readonly menu = document.createElement('section');
  private readonly opcoes = document.createElement('section');
  private tela: TelaDaPausa = 'menu';

  /**
   * O jogador ligou ou desligou os nomes das províncias no mapa.
   *
   * ⚠️ **Isto mora nas OPÇÕES e não no painel do mapa, e a decisão é de Henrique:** *"essa
   * opção tem que estar ativa 24 horas por dia (...) o único jeito de desligar seria indo em
   * opções no menu"*. Nome de província não é modo de visualização como as cores ou as
   * relações — é parte de como o mapa se lê, e um interruptor à mão convida a desligar o que
   * deveria estar sempre lá.
   */
  aoTrocarNomes: (ligados: boolean) => void = () => {};

  aoSairParaMenu: () => void = () => {};
  aoSairDoJogo: () => void = () => {};
  aoAlternar: (aberto: boolean) => void = () => {};

  constructor(
    pai: HTMLElement,
    private readonly audio: MotorDeAudio,
  ) {
    this.raiz.className = 'menu-pausa';
    this.raiz.hidden = true;
    this.montarMenu();
    this.montarOpcoes();
    pai.appendChild(this.raiz);

    // Captura antes das janelas. Se Governo ou outra folha estiver aberta, o primeiro Esc
    // pertence a ela; só o Esc seguinte chega a abrir a pausa.
    window.addEventListener('keydown', (evento) => this.reagirAoEscape(evento), true);
  }

  get visivel(): boolean {
    return !this.raiz.hidden;
  }

  abrir(): void {
    if (this.visivel || document.body.dataset['faseJogo'] !== 'campanha') return;
    this.mostrar('menu');
    this.raiz.hidden = false;
    document.body.dataset['pausado'] = 'sim';
    this.aoAlternar(true);
    this.menu.querySelector<HTMLButtonElement>('button')?.focus();
  }

  fechar(): void {
    if (!this.visivel) return;
    this.raiz.hidden = true;
    delete document.body.dataset['pausado'];
    this.aoAlternar(false);
  }

  private montarMenu(): void {
    this.menu.className = 'menu-pausa__cartao';
    this.menu.dataset['tela'] = 'menu';
    this.menu.append(this.cabecalho('Jogo pausado', ''));

    const acoes = document.createElement('div');
    acoes.className = 'menu-pausa__acoes';
    acoes.append(
      this.botao('Continuar jogo', () => this.fechar()),
      this.botao('Opções', () => this.mostrar('opcoes')),
      this.botao('Sair para o menu principal', () => this.aoSairParaMenu()),
      this.botao('Sair para a área de trabalho', () => this.aoSairDoJogo(), true),
    );
    this.menu.appendChild(acoes);
    this.raiz.appendChild(this.menu);
  }

  private montarOpcoes(): void {
    this.opcoes.className = 'menu-pausa__cartao';
    this.opcoes.dataset['tela'] = 'opcoes';
    this.opcoes.hidden = true;
    this.opcoes.append(this.cabecalho('Opções', 'Áudio e interface'));

    const controles = document.createElement('div');
    controles.className = 'menu-pausa__controles';
    controles.append(
      this.volume('Música', 'musica', this.audio.volumes.musica, (n) =>
        this.audio.definirMusica(n),
      ),
      this.volume('Efeitos', 'efeitos', this.audio.volumes.efeitos, (n) =>
        this.audio.definirEfeitos(n),
      ),
      this.escolha(
        'Tamanho da interface',
        'Aumenta o texto e os painéis sem perder nitidez. Em troca, cabe menos mapa na tela.',
        tamanhoDaInterface(),
        (tamanho) => {
          guardarTamanhoDaInterface(tamanho);
          definirTamanhoDaInterface(tamanho);
        },
      ),
      this.chave(
        'Nomes das províncias no mapa',
        'nomes',
        nomesNoMapa(),
        'O nome de cada terra e de cada zona de mar, escrito dentro dela.',
        (ligados) => {
          guardarNomesNoMapa(ligados);
          this.aoTrocarNomes(ligados);
        },
      ),
    );

    const voltar = this.botao('Voltar', () => this.mostrar('menu'));
    voltar.classList.add('menu-pausa__voltar');
    this.opcoes.append(controles, voltar);
    this.raiz.appendChild(this.opcoes);
  }

  private cabecalho(titulo: string, subtitulo: string): HTMLElement {
    const cabecalho = document.createElement('header');
    cabecalho.className = 'menu-pausa__cabecalho';
    const marca = iconeGrego('coruja', 'menu-pausa__icone');
    const textos = document.createElement('div');
    const h = document.createElement('h2');
    h.className = 'menu-pausa__titulo';
    h.textContent = titulo;
    textos.append(h);
    if (subtitulo) {
      const p = document.createElement('p');
      p.className = 'menu-pausa__subtitulo';
      p.textContent = subtitulo;
      textos.append(p);
    }
    cabecalho.append(marca, textos);
    return cabecalho;
  }

  private botao(texto: string, acao: () => void, perigo = false): HTMLButtonElement {
    const botao = document.createElement('button');
    botao.className = 'menu-pausa__botao';
    botao.type = 'button';
    botao.textContent = texto;
    if (perigo) botao.dataset['tom'] = 'perigo';
    botao.addEventListener('click', acao);
    return botao;
  }

  /**
   * Uma opção de liga-desliga, no mesmo desenho das barras de volume.
   *
   * A explicação vai NA TELA e não num tooltip: a tela de opções é lida uma vez a cada muitos
   * meses, e é justamente onde o mouse parado não ajuda ninguém.
   */
  private chave(
    rotulo: string,
    id: string,
    ligado: boolean,
    explicacao: string,
    aoMudar: (ligado: boolean) => void,
  ): HTMLElement {
    const linha = document.createElement('label');
    linha.className = 'menu-pausa__chave';
    linha.htmlFor = `chave-${id}`;
    const textos = document.createElement('div');
    const nome = document.createElement('span');
    nome.className = 'menu-pausa__chave-nome';
    nome.textContent = rotulo;
    const nota = document.createElement('span');
    nota.className = 'menu-pausa__chave-nota';
    nota.textContent = explicacao;
    textos.append(nome, nota);
    const controle = document.createElement('input');
    controle.type = 'checkbox';
    controle.id = `chave-${id}`;
    controle.className = 'menu-pausa__caixa';
    controle.checked = ligado;
    controle.addEventListener('change', () => aoMudar(controle.checked));
    linha.append(textos, controle);
    return linha;
  }

  /**
   * O tamanho da interface, em quatro botões.
   *
   * ⚠️ **Botões e não uma barra deslizante, e a razão é que a escolha se APLICA na hora.**
   * Arrastar uma barra refaria o palco inteiro a cada pixel percorrido — e o jogador veria a
   * tela pulsando em vez de comparar dois tamanhos. Com quatro paradas ele clica, olha, e
   * clica na vizinha se não gostou.
   *
   * A porcentagem é o rótulo inteiro porque é o que ele veio procurar. "Grande" não diz quanto.
   */
  private escolha(
    rotulo: string,
    explicacao: string,
    atual: TamanhoDaInterface,
    aoMudar: (tamanho: TamanhoDaInterface) => void,
  ): HTMLElement {
    const linha = document.createElement('div');
    linha.className = 'menu-pausa__chave menu-pausa__escolha';
    const textos = document.createElement('div');
    const nome = document.createElement('span');
    nome.className = 'menu-pausa__chave-nome';
    nome.textContent = rotulo;
    const nota = document.createElement('span');
    nota.className = 'menu-pausa__chave-nota';
    nota.textContent = explicacao;
    textos.append(nome, nota);

    const paradas = document.createElement('div');
    paradas.className = 'menu-pausa__paradas';
    const nomes = Object.keys(TAMANHOS_DA_INTERFACE) as TamanhoDaInterface[];
    const botoes = nomes.map((tamanho) => {
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'menu-pausa__parada';
      botao.dataset['tamanho'] = tamanho;
      botao.textContent = `${Math.round(TAMANHOS_DA_INTERFACE[tamanho] * 100)}%`;
      botao.setAttribute('aria-pressed', String(tamanho === atual));
      botao.addEventListener('click', () => {
        for (const outro of botoes) outro.setAttribute('aria-pressed', String(outro === botao));
        aoMudar(tamanho);
      });
      paradas.appendChild(botao);
      return botao;
    });

    linha.append(textos, paradas);
    return linha;
  }

  private volume(
    rotulo: string,
    id: string,
    inicial: number,
    aoMudar: (volume: number) => void,
  ): HTMLElement {
    const linha = document.createElement('label');
    linha.className = 'menu-pausa__volume';
    linha.htmlFor = `volume-${id}`;
    const nome = document.createElement('span');
    nome.textContent = rotulo;
    const valor = document.createElement('output');
    valor.className = 'menu-pausa__valor';
    valor.htmlFor = `volume-${id}`;
    valor.textContent = `${inicial}%`;

    const topo = document.createElement('span');
    topo.className = 'menu-pausa__volume-topo';
    topo.append(nome, valor);

    const controle = document.createElement('input');
    controle.id = `volume-${id}`;
    controle.type = 'range';
    controle.min = '0';
    controle.max = '100';
    controle.step = '1';
    controle.value = String(inicial);
    controle.addEventListener('input', () => {
      const volume = Number(controle.value);
      valor.textContent = `${volume}%`;
      aoMudar(volume);
    });
    if (id === 'efeitos') {
      controle.addEventListener('change', () => this.audio.reproduzir('confirmar'));
    }

    linha.append(topo, controle);
    return linha;
  }

  private mostrar(tela: TelaDaPausa): void {
    this.tela = tela;
    this.menu.hidden = tela !== 'menu';
    this.opcoes.hidden = tela !== 'opcoes';
    const alvo = tela === 'menu' ? this.menu : this.opcoes;
    alvo.querySelector<HTMLButtonElement>('button, input')?.focus();
  }

  private reagirAoEscape(evento: KeyboardEvent): void {
    if (evento.key !== 'Escape' || evento.repeat) return;
    if (this.visivel) {
      evento.preventDefault();
      evento.stopImmediatePropagation();
      this.audio.reproduzir('fechar');
      if (this.tela === 'opcoes') this.mostrar('menu');
      else this.fechar();
      return;
    }
    if (document.body.dataset['faseJogo'] !== 'campanha' || this.haOutraJanelaAberta()) return;
    evento.preventDefault();
    evento.stopImmediatePropagation();
    this.abrir();
    this.audio.reproduzir('abrir');
  }

  private haOutraJanelaAberta(): boolean {
    return document.querySelector(
      '.janela:not([hidden]), .governo:not([hidden]), .diplomacia:not([hidden]), .fim-de-jogo:not([hidden])',
    ) !== null;
  }
}

/**
 * A preferência de nomes no mapa, guardada no navegador.
 *
 * ⚠️ **O padrão é LIGADO**, e é o pedido dele com todas as letras: *"tem que estar ativa 24
 * horas por dia"*. Ausente do armazenamento quer dizer "nunca mexeu", e quem nunca mexeu vê
 * os nomes.
 */
const CHAVE_NOMES = 'grecce:nomes-no-mapa';

export function nomesNoMapa(): boolean {
  try {
    return localStorage.getItem(CHAVE_NOMES) !== 'nao';
  } catch {
    return true;
  }
}

function guardarNomesNoMapa(ligados: boolean): void {
  try {
    localStorage.setItem(CHAVE_NOMES, ligados ? 'sim' : 'nao');
  } catch {
    // Navegador sem armazenamento: a escolha vale esta sessão e pronto.
  }
}

/**
 * O tamanho da interface escolhido, guardado entre partidas.
 *
 * ⚠️ **Quem precisa de letra maior precisa dela SEMPRE**, e não uma vez por sessão. Um valor
 * estranho no armazenamento — de uma versão antiga, ou de um dedo no console — cai em `normal`
 * em vez de quebrar o palco.
 */
const CHAVE_TAMANHO = 'grecce:tamanho-da-interface';

export function tamanhoDaInterface(): TamanhoDaInterface {
  try {
    const guardado = localStorage.getItem(CHAVE_TAMANHO);
    if (guardado && guardado in TAMANHOS_DA_INTERFACE) return guardado as TamanhoDaInterface;
  } catch {
    // Navegador sem armazenamento: o tamanho padrão serve.
  }
  return 'normal';
}

function guardarTamanhoDaInterface(tamanho: TamanhoDaInterface): void {
  try {
    localStorage.setItem(CHAVE_TAMANHO, tamanho);
  } catch {
    // Navegador sem armazenamento: a escolha vale esta sessão e pronto.
  }
}
