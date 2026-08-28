/**
 * As duas telas que existem antes da campanha: menu inicial e escolha de poder.
 *
 * A escolha acontece no próprio mapa. Quem decide se um poder é jogável é a CAMPANHA,
 * via `podeJogar` — a regra atual é ter todas as províncias com economia configurada, e
 * esta tela só pergunta, sem conhecer a regra.
 */

import { iconeGrego, rotularComIcone } from './icones-gregos';

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
  private readonly botaoIniciar = document.createElement('button');
  private readonly botaoContinuar = document.createElement('button');
  private readonly descricaoContinuar = document.createElement('p');
  private readonly notaRecomeco = document.createElement('p');

  private poderEscolhido: string | null = null;
  /** Há salvamento? Muda o que "iniciar" significa: começar de novo apaga a partida. */
  private temSalvamento = false;

  aoPedirEscolha: () => void = () => {};
  aoComecarCampanha: (idPoder: string) => void = () => {};
  /** Este poder pode ser escolhido? Quem responde é a campanha; o padrão recusa tudo. */
  podeJogar: (idPoder: string) => boolean = () => false;
  /** Retoma a campanha salva. Só é chamado quando `oferecerContinuacao` foi oferecida. */
  aoContinuar: () => void = () => {};
  /** Apaga o salvamento e recomeça do zero. A decisão destrutiva é explícita no rótulo. */
  aoRecomecar: () => void = () => {};

  constructor(pai: HTMLElement) {
    this.raiz.className = 'inicio-jogo';
    this.montarMenu();
    this.montarEscolha();
    pai.appendChild(this.raiz);
    this.mostrarMenu();
  }

  mostrarMenu(): void {
    // `encerrar` esconde a raiz inteira ao entrar na campanha; voltar pelo menu de pausa
    // precisa reabrir a cena do menu, não apenas trocar qual painel interno está oculto.
    this.raiz.hidden = false;
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
    const disponivel = this.podeJogar(poder.id);

    this.nomeEscolhido.textContent = poder.nome;
    this.amostraCor.style.background = poder.cor;
    this.detalhesEscolhidos.textContent = `${poder.povo} · ${quantidade} ${quantidade === 1 ? 'província' : 'províncias'}`;
    this.disponibilidade.textContent = disponivel
      ? 'Disponível para esta campanha.'
      : 'Ainda sem economia configurada: indisponível.';
    this.disponibilidade.dataset['disponivel'] = disponivel ? 'sim' : 'nao';
    this.poderEscolhido = disponivel ? poder.id : null;
    this.botaoComecar.disabled = !disponivel;
  }

  encerrar(idPoder: string): void {
    this.raiz.hidden = true;
    marcarFase('campanha');
    document.body.dataset['poderJogador'] = idPoder;
  }

  private montarMenu(): void {
    this.telaMenu.className = 'inicio-jogo__tela-menu';

    const cartao = document.createElement('div');
    cartao.className = 'inicio-jogo__cartao-menu';

    const emblema = document.createElement('div');
    emblema.className = 'inicio-jogo__emblema';
    emblema.appendChild(iconeGrego('coruja'));

    const titulo = document.createElement('h1');
    titulo.className = 'inicio-jogo__titulo';
    titulo.textContent = 'Age of Grecce';

    const subtitulo = document.createElement('p');
    subtitulo.className = 'inicio-jogo__subtitulo';
    subtitulo.textContent = 'O mundo grego, 700 a.C.';

    // O botão de continuar nasce escondido: só o boot, ao achar um salvamento válido,
    // o revela — e aí "iniciar" passa a significar recomeçar, com o custo escrito.
    this.botaoContinuar.className = 'inicio-jogo__acao';
    this.botaoContinuar.type = 'button';
    this.botaoContinuar.hidden = true;
    rotularComIcone(this.botaoContinuar, 'escudo', 'Continuar campanha');
    this.botaoContinuar.addEventListener('click', () => this.aoContinuar());

    this.descricaoContinuar.className = 'inicio-jogo__continuacao';
    this.descricaoContinuar.hidden = true;

    this.botaoIniciar.className = 'inicio-jogo__acao';
    this.botaoIniciar.type = 'button';
    rotularComIcone(this.botaoIniciar, 'lanca', 'Iniciar jogo');
    this.botaoIniciar.addEventListener('click', () => {
      if (this.temSalvamento) {
        this.aoRecomecar();
        return;
      }
      this.mostrarEscolha();
      this.aoPedirEscolha();
    });

    this.notaRecomeco.className = 'inicio-jogo__nota';
    this.notaRecomeco.hidden = true;
    this.notaRecomeco.textContent = 'Começar de novo apaga o salvamento.';

    cartao.append(
      emblema,
      titulo,
      subtitulo,
      this.botaoContinuar,
      this.descricaoContinuar,
      this.botaoIniciar,
      this.notaRecomeco,
    );
    this.telaMenu.appendChild(cartao);
    this.raiz.appendChild(this.telaMenu);
  }

  /** O boot achou um salvamento válido: o menu passa a oferecer a retomada. */
  oferecerContinuacao(descricao: string): void {
    this.temSalvamento = true;
    this.botaoContinuar.hidden = false;
    this.descricaoContinuar.hidden = false;
    this.descricaoContinuar.textContent = descricao;
    rotularComIcone(this.botaoIniciar, 'lanca', 'Nova campanha');
    this.notaRecomeco.hidden = false;
  }

  private montarEscolha(): void {
    this.painelEscolha.className = 'inicio-jogo__escolha';

    const titulo = document.createElement('h2');
    titulo.className = 'inicio-jogo__titulo-escolha';
    titulo.textContent = 'Escolha seu poder';

    const instrucao = document.createElement('p');
    instrucao.className = 'inicio-jogo__instrucao';
    instrucao.textContent =
      'Clique num território do mapa. As cidades da Grécia central estão disponíveis.';

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
    rotularComIcone(this.botaoComecar, 'escudo', 'Começar campanha');
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

    this.painelEscolha.append(titulo, instrucao, escolhido, this.botaoComecar, voltar);
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
