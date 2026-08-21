/**
 * As duas telas que existem antes da campanha: menu inicial e escolha de poder.
 *
 * A escolha acontece no próprio mapa. Hoje apenas Atenas é jogável, mas clicar em
 * qualquer território já mostra qual poder seria escolhido; quando os demais forem
 * liberados, não será necessário trocar o método de seleção.
 */

const PODER_DISPONIVEL = 'atenas';

/**
 * O poder sob o cursor, como a tela de escolha precisa vê-lo.
 *
 * A contagem de províncias vem da CAMPANHA, não do arquivo assado: quando a conquista
 * existir, escolher um poder tem que mostrar o tamanho que ele tem agora.
 */
export interface VistaDeEscolha {
  poder: { id: string; nome: string; povo: string; cor: string };
  provincias: number;
}

export class InicioJogo {
  private readonly raiz = document.createElement('div');
  private readonly telaMenu = document.createElement('section');
  private readonly painelEscolha = document.createElement('section');
  private readonly nomeEscolhido = document.createElement('h3');
  private readonly detalhesEscolhidos = document.createElement('p');
  private readonly disponibilidade = document.createElement('p');
  private readonly amostraCor = document.createElement('span');
  private readonly botaoComecar = document.createElement('button');

  private poderEscolhido: string | null = null;

  aoPedirEscolha: () => void = () => {};
  aoComecarCampanha: (idPoder: string) => void = () => {};

  constructor(pai: HTMLElement) {
    this.raiz.className = 'inicio-jogo';
    this.montarMenu();
    this.montarEscolha();
    pai.appendChild(this.raiz);
    this.mostrarMenu();
  }

  mostrarMenu(): void {
    this.raiz.dataset['tela'] = 'menu';
    this.telaMenu.hidden = false;
    this.painelEscolha.hidden = true;
    this.limparEscolha();
    marcarFase('menu');
  }

  mostrarEscolha(): void {
    this.raiz.dataset['tela'] = 'escolha';
    this.telaMenu.hidden = true;
    this.painelEscolha.hidden = false;
    this.limparEscolha();
    marcarFase('escolha');
  }

  selecionar(escolha: VistaDeEscolha | null): void {
    if (!escolha) {
      this.limparEscolha();
      return;
    }

    const { poder, provincias: quantidade } = escolha;
    const disponivel = poder.id === PODER_DISPONIVEL;

    this.nomeEscolhido.textContent = poder.nome;
    this.amostraCor.style.background = poder.cor;
    this.detalhesEscolhidos.textContent =
      `${poder.povo} · ${quantidade} ${quantidade === 1 ? 'província' : 'províncias'}`;
    this.disponibilidade.textContent = disponivel
      ? 'Disponível para esta campanha de teste.'
      : 'Indisponível neste protótipo.';
    this.disponibilidade.dataset['disponivel'] = disponivel ? 'sim' : 'nao';
    this.poderEscolhido = disponivel ? poder.id : null;
    this.botaoComecar.disabled = !disponivel;
  }

  encerrar(): void {
    this.raiz.hidden = true;
    marcarFase('campanha');
    document.body.dataset['poderJogador'] = PODER_DISPONIVEL;
  }

  private montarMenu(): void {
    this.telaMenu.className = 'inicio-jogo__tela-menu';

    const cartao = document.createElement('div');
    cartao.className = 'inicio-jogo__cartao-menu';

    const titulo = document.createElement('h1');
    titulo.className = 'inicio-jogo__titulo';
    titulo.textContent = 'Age of Grecce';

    const subtitulo = document.createElement('p');
    subtitulo.className = 'inicio-jogo__subtitulo';
    subtitulo.textContent = 'O mundo grego, 700 a.C.';

    const iniciar = document.createElement('button');
    iniciar.className = 'inicio-jogo__acao';
    iniciar.type = 'button';
    iniciar.textContent = 'Iniciar jogo';
    iniciar.addEventListener('click', () => {
      this.mostrarEscolha();
      this.aoPedirEscolha();
    });

    cartao.append(titulo, subtitulo, iniciar);
    this.telaMenu.appendChild(cartao);
    this.raiz.appendChild(this.telaMenu);
  }

  private montarEscolha(): void {
    this.painelEscolha.className = 'inicio-jogo__escolha';

    const titulo = document.createElement('h2');
    titulo.className = 'inicio-jogo__titulo-escolha';
    titulo.textContent = 'Escolha seu poder';

    const instrucao = document.createElement('p');
    instrucao.className = 'inicio-jogo__instrucao';
    instrucao.textContent = 'Clique num território do mapa. Neste teste, somente Atenas está disponível.';

    const escolhido = document.createElement('div');
    escolhido.className = 'inicio-jogo__poder';
    const cabecalho = document.createElement('div');
    cabecalho.className = 'inicio-jogo__cabecalho-poder';
    this.amostraCor.className = 'inicio-jogo__cor';
    this.nomeEscolhido.className = 'inicio-jogo__nome-poder';
    cabecalho.append(this.amostraCor, this.nomeEscolhido);
    this.detalhesEscolhidos.className = 'inicio-jogo__detalhes';
    this.disponibilidade.className = 'inicio-jogo__disponibilidade';
    escolhido.append(cabecalho, this.detalhesEscolhidos, this.disponibilidade);

    this.botaoComecar.className = 'inicio-jogo__acao';
    this.botaoComecar.type = 'button';
    this.botaoComecar.textContent = 'Começar campanha';
    this.botaoComecar.disabled = true;
    this.botaoComecar.addEventListener('click', () => {
      if (!this.poderEscolhido) return;
      this.aoComecarCampanha(this.poderEscolhido);
    });

    const voltar = document.createElement('button');
    voltar.className = 'inicio-jogo__voltar';
    voltar.type = 'button';
    voltar.textContent = 'Voltar';
    voltar.addEventListener('click', () => this.mostrarMenu());

    this.painelEscolha.append(
      titulo,
      instrucao,
      escolhido,
      this.botaoComecar,
      voltar,
    );
    this.raiz.appendChild(this.painelEscolha);
  }

  private limparEscolha(): void {
    this.poderEscolhido = null;
    this.nomeEscolhido.textContent = 'Nenhum poder selecionado';
    this.amostraCor.style.background = 'transparent';
    this.detalhesEscolhidos.textContent = 'Selecione uma província no mapa.';
    this.disponibilidade.textContent = '';
    delete this.disponibilidade.dataset['disponivel'];
    this.botaoComecar.disabled = true;
  }
}

function marcarFase(fase: 'menu' | 'escolha' | 'campanha'): void {
  document.body.dataset['faseJogo'] = fase;
  if (fase !== 'campanha') delete document.body.dataset['poderJogador'];
}
