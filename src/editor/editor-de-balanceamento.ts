import type { Ajustes } from '@/dados/esquema';
import { ABAS_DO_EDITOR } from './abas';
import { camposDoCombate } from './catalogo-combate';
import { camposDoExercito } from './catalogo-exercito';
import { criarControleNumerico } from './campo-numerico';
import type { ControleNumerico } from './campo-numerico';
import { apagarPerfil, carregarPerfil, salvarPerfil } from './perfil-local';
import type { AbaDoEditor, CampoNumerico, IdDaAba } from './tipos';

type AjustesDoJogo = Ajustes['jogo'];

/** A ferramenta de balanceamento do Henrique. F2 abre; Esc ou F2 fecham. */
export class EditorDeBalanceamento {
  private readonly raiz = document.createElement('div');
  private readonly navegacao = document.createElement('nav');
  private readonly conteudo = document.createElement('main');
  private readonly titulo = document.createElement('h2');
  private readonly subtitulo = document.createElement('p');
  private readonly busca = document.createElement('input');
  private readonly estado = document.createElement('span');
  private readonly controles: ControleNumerico[] = [];
  private readonly padroes = new Map<string, number>();
  private aba: IdDaAba = 'exercito';

  /** A aplicação redesenha os números que já estiverem visíveis atrás da janela. */
  aoAplicar: () => void = () => {};

  constructor(pai: HTMLElement, ajustes: AjustesDoJogo) {
    this.raiz.className = 'editor-balanceamento janela';
    this.raiz.hidden = true;
    const campos = [...camposDoExercito(ajustes), ...camposDoCombate(ajustes)];
    for (const campo of campos) this.padroes.set(campo.id, campo.ler());

    // O perfil entra sobre os dados validados, e antes de a campanha começar a consultá-los.
    const perfil = carregarPerfil(campos);
    for (const campo of campos) {
      const salvo = perfil[campo.id];
      if (salvo !== undefined) campo.escrever(salvo);
    }

    const janela = document.createElement('section');
    janela.className = 'editor-balanceamento__janela';
    janela.append(this.montarCabecalho(), this.montarCorpo(campos), this.montarRodape());
    this.raiz.appendChild(janela);
    pai.appendChild(this.raiz);
    this.mostrarAba('exercito');

    window.addEventListener('keydown', (evento) => {
      if (evento.repeat || !this.visivel) return;
      // F2 pertence ao laço de entrada, que abre e fecha pelo mesmo caminho. Aqui só o Esc
      // fecha; capturar F2 também faria o evento fechar agora e o laço reabrir no mesmo quadro.
      if (evento.key !== 'Escape') return;
      evento.preventDefault();
      evento.stopImmediatePropagation();
      this.fechar();
    });
  }

  get visivel(): boolean {
    return !this.raiz.hidden;
  }

  alternar(): void {
    if (this.visivel) this.fechar();
    else this.abrir();
  }

  abrir(): void {
    this.raiz.hidden = false;
    document.body.dataset['editorAberto'] = 'sim';
    this.busca.focus();
  }

  fechar(): void {
    this.raiz.hidden = true;
    delete document.body.dataset['editorAberto'];
  }

  private montarCabecalho(): HTMLElement {
    const cabecalho = document.createElement('header');
    cabecalho.className = 'editor-balanceamento__cabecalho';
    const marca = document.createElement('div');
    marca.className = 'editor-balanceamento__marca';
    const sobrelinha = document.createElement('span');
    sobrelinha.textContent = 'FERRAMENTA DE DESENVOLVIMENTO · F2';
    this.titulo.textContent = 'Editor de balanceamento';
    this.subtitulo.textContent = 'Altere, jogue e ajuste novamente sem sair da campanha.';
    marca.append(sobrelinha, this.titulo, this.subtitulo);

    this.busca.type = 'search';
    this.busca.className = 'editor-balanceamento__busca';
    this.busca.placeholder = 'Buscar nesta aba';
    this.busca.setAttribute('aria-label', 'Buscar campo');
    this.busca.addEventListener('input', () => this.filtrar());
    const fechar = document.createElement('button');
    fechar.type = 'button';
    fechar.className = 'editor-balanceamento__fechar';
    fechar.textContent = '×';
    fechar.setAttribute('aria-label', 'Fechar editor');
    fechar.addEventListener('click', () => this.fechar());
    cabecalho.append(marca, this.busca, fechar);
    return cabecalho;
  }

  private montarCorpo(campos: readonly CampoNumerico[]): HTMLElement {
    const corpo = document.createElement('div');
    corpo.className = 'editor-balanceamento__corpo';
    this.navegacao.className = 'editor-balanceamento__abas';
    for (const aba of ABAS_DO_EDITOR) this.navegacao.appendChild(this.botaoDaAba(aba));

    this.conteudo.className = 'editor-balanceamento__conteudo';
    // O catálogo pode declarar assuntos intercalados — custo e comida de cada arma, por
    // exemplo. A tela agrupa pelo NOME, não pela posição, para produzir uma seção única com
    // Leves, Hoplitas, Arqueiros e Cavalaria alinhados embaixo do mesmo título.
    const grupos = new Map<string, HTMLElement>();
    for (const campo of campos) {
      const chaveDoGrupo = `${campo.aba}:${campo.grupo}`;
      let secao = grupos.get(chaveDoGrupo);
      if (!secao) {
        secao = document.createElement('section');
        secao.className = 'editor-balanceamento__grupo';
        secao.dataset['grupo'] = campo.grupo.toLocaleLowerCase('pt-BR');
        secao.dataset['aba'] = campo.aba;
        const titulo = document.createElement('h3');
        titulo.textContent = campo.grupo;
        secao.appendChild(titulo);
        this.conteudo.appendChild(secao);
        grupos.set(chaveDoGrupo, secao);
      }
      const controle = criarControleNumerico(campo, campo.ler(), () => this.atualizarEstado());
      this.controles.push(controle);
      secao.appendChild(controle.elemento);
    }
    corpo.append(this.navegacao, this.conteudo);
    return corpo;
  }

  private montarRodape(): HTMLElement {
    const rodape = document.createElement('footer');
    rodape.className = 'editor-balanceamento__rodape';
    this.estado.className = 'editor-balanceamento__estado';
    const acoes = document.createElement('div');
    acoes.className = 'editor-balanceamento__acoes';
    acoes.append(
      this.botaoDeAcao('Desfazer', () => this.desfazer()),
      this.botaoDeAcao('Restaurar padrões', () => this.restaurar()),
      this.botaoDeAcao('Aplicar alterações', () => this.aplicar(), true),
    );
    rodape.append(this.estado, acoes);
    this.atualizarEstado();
    return rodape;
  }

  private botaoDaAba(aba: AbaDoEditor): HTMLButtonElement {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.dataset['aba'] = aba.id;
    const nome = document.createElement('strong');
    nome.textContent = aba.nome;
    const descricao = document.createElement('span');
    descricao.textContent = aba.descricao;
    botao.append(nome, descricao);
    botao.addEventListener('click', () => this.mostrarAba(aba.id));
    return botao;
  }

  private mostrarAba(id: IdDaAba): void {
    this.aba = id;
    const aba = ABAS_DO_EDITOR.find((item) => item.id === id) ?? ABAS_DO_EDITOR[0];
    if (!aba) return;
    for (const botao of this.navegacao.querySelectorAll<HTMLButtonElement>('button')) {
      botao.dataset['ativa'] = botao.dataset['aba'] === id ? 'sim' : 'nao';
    }
    this.titulo.textContent = aba.nome;
    this.subtitulo.textContent = aba.descricao;
    this.busca.value = '';
    this.busca.disabled = !aba.disponivel;
    if (aba.disponivel) this.mostrarCampos();
    else this.mostrarEspera(aba);
  }

  private mostrarCampos(): void {
    for (const grupo of this.conteudo.querySelectorAll<HTMLElement>('.editor-balanceamento__grupo')) {
      grupo.hidden = grupo.dataset['aba'] !== this.aba;
    }
    this.conteudo.querySelector('.editor-balanceamento__espera')?.remove();
    this.filtrar();
  }

  private mostrarEspera(aba: AbaDoEditor): void {
    for (const grupo of this.conteudo.querySelectorAll<HTMLElement>('.editor-balanceamento__grupo')) {
      grupo.hidden = true;
    }
    this.conteudo.querySelector('.editor-balanceamento__espera')?.remove();
    const espera = document.createElement('div');
    espera.className = 'editor-balanceamento__espera';
    const titulo = document.createElement('strong');
    titulo.textContent = `${aba.nome} será uma fase própria.`;
    const texto = document.createElement('p');
    texto.textContent = 'A estrutura já está pronta; os controles entrarão aqui sem misturar assuntos.';
    espera.append(titulo, texto);
    this.conteudo.appendChild(espera);
  }

  private filtrar(): void {
    const termo = this.busca.value.trim().toLocaleLowerCase('pt-BR');
    for (const controle of this.controles) {
      if (controle.campo.aba !== this.aba) {
        controle.elemento.hidden = true;
        continue;
      }
      const texto = `${controle.campo.nome} ${controle.campo.descricao} ${controle.campo.grupo}`.toLocaleLowerCase('pt-BR');
      controle.elemento.hidden = termo.length > 0 && !texto.includes(termo);
    }
    for (const grupo of this.conteudo.querySelectorAll<HTMLElement>('.editor-balanceamento__grupo')) {
      grupo.hidden =
        grupo.dataset['aba'] !== this.aba ||
        [...grupo.querySelectorAll<HTMLElement>('.editor-balanceamento__campo')].every(
          (campo) => campo.hidden,
        );
    }
  }

  private aplicar(): void {
    const valores = Object.fromEntries(this.controles.map((c) => [c.campo.id, c.valor()]));
    const quebra = valores['combate.batalha.limiarDeQuebra'];
    const recuo = valores['combate.batalha.limiarDeRecuo'];
    if (quebra !== undefined && recuo !== undefined && recuo >= quebra) {
      this.estado.textContent = 'O recuo precisa acontecer antes do limiar de quebra.';
      this.estado.dataset['pendente'] = 'erro';
      return;
    }
    const salvos: Record<string, number> = {};
    for (const controle of this.controles) {
      const valor = controle.valor();
      controle.campo.escrever(valor);
      if (valor !== this.padroes.get(controle.campo.id)) salvos[controle.campo.id] = valor;
    }
    if (Object.keys(salvos).length > 0) salvarPerfil(salvos);
    else apagarPerfil();
    this.atualizarEstado();
    this.aoAplicar();
  }

  private desfazer(): void {
    for (const controle of this.controles) controle.definir(controle.campo.ler());
    this.atualizarEstado();
  }

  private restaurar(): void {
    for (const controle of this.controles) {
      controle.definir(this.padroes.get(controle.campo.id) ?? controle.campo.ler());
    }
    this.atualizarEstado();
  }

  private atualizarEstado(): void {
    const pendentes = this.controles.filter((c) => c.valor() !== c.campo.ler());
    for (const controle of this.controles) {
      controle.mudou(controle.valor() !== this.padroes.get(controle.campo.id));
    }
    this.estado.textContent =
      pendentes.length === 0
        ? 'Tudo aplicado · perfil salvo automaticamente'
        : `${pendentes.length} ${pendentes.length === 1 ? 'alteração pendente' : 'alterações pendentes'}`;
    this.estado.dataset['pendente'] = pendentes.length > 0 ? 'sim' : 'nao';
  }

  private botaoDeAcao(texto: string, acao: () => void, principal = false): HTMLButtonElement {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.textContent = texto;
    botao.dataset['principal'] = principal ? 'sim' : 'nao';
    botao.addEventListener('click', acao);
    return botao;
  }
}
