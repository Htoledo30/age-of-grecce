/**
 * A ficha do exército: o que esta hoste é, e o único comando que ela aceita hoje.
 *
 * Arquivo próprio, e essa é a correção que o dono do projeto pediu na revisão: ver e
 * dispensar tropa morava dentro do painel de RECRUTAMENTO, e aquilo só funcionava
 * enquanto exército e Quartel estivessem na mesma província. Assim que a hoste marchar,
 * ela deixa de ter qualquer relação com o lugar onde foi levantada — e um painel
 * chamado "Recrutar" não é o lugar de comandar uma tropa que está a três províncias dali.
 *
 * A separação que vale: **recrutar é uma ação da PROVÍNCIA; dispensar é uma ação da
 * HOSTE.** São seleções diferentes e viram painéis diferentes.
 */

/** De onde saiu um pedaço da hoste, e se aquela terra ainda é de quem a comanda. */
interface OrigemDaHoste {
  provincia: string;
  nome: string;
  homens: number;
  /** A terra natal destes homens caiu para outro poder. */
  perdida: boolean;
  /** Quem manda nela agora. Só interessa quando `perdida`. */
  donoAtual: string;
}

/** O que a ficha precisa saber sobre a hoste selecionada. */
export interface VistaDoExercito {
  provincia: { id: string; nome: string };
  poder: { nome: string; cor: string };
  forca: number;
  manutencao: number;
  /** A hoste está parada em terra que não é do dono dela. */
  emTerraAlheia: boolean;
  /** É do jogador? Só a dele aceita comando. */
  minha: boolean;
  origens: readonly OrigemDaHoste[];
  /** Quantas províncias ela alcança daqui. Zero desabilita a marcha, dizendo por quê. */
  destinos: number;
  /** O jogador já mandou marchar e está escolhendo o destino no mapa. */
  marchando: boolean;
  /**
   * A ordem já registrada para esta hoste nesta rodada, se houver.
   *
   * Enquanto ela existe, a hoste não aceita outra: **uma ordem por hoste por rodada.**
   */
  ordem: { destino: string; homens: number } | null;
}

export class ExercitoFicha {
  private readonly raiz = document.createElement('div');
  private readonly titulo = document.createElement('h2');
  private readonly tinta = document.createElement('span');
  private readonly dono = document.createElement('span');
  private readonly forca = document.createElement('p');
  private readonly custo = document.createElement('p');
  private readonly aviso = document.createElement('p');
  private readonly tituloOrigens = document.createElement('h3');
  private readonly origens = document.createElement('dl');
  private readonly campoHomens = document.createElement('input');
  private readonly botaoMover = document.createElement('button');
  private readonly instrucao = document.createElement('p');
  private readonly linhaOrdem = document.createElement('p');
  private readonly botaoCancelar = document.createElement('button');
  /** De quem é a quantidade que está no campo. Trocar de hoste reinicia o campo. */
  private quantidadeDe: string | null = null;
  private readonly botaoDispensar = document.createElement('button');
  private vista: VistaDoExercito | null = null;

  /** Liga e desliga o modo de marcha. Quem sabe para onde dá pra ir é a campanha. */
  aoAlternarMarcha: (idProvincia: string) => void = () => {};
  /** Quantos homens o jogador quer mandar. Lida quando ele escolhe o destino no mapa. */
  aoMudarQuantidade: (homens: number) => void = () => {};
  aoCancelarOrdem: (idProvincia: string) => void = () => {};
  aoDispensar: (idProvincia: string, homens: number) => void = () => {};

  constructor(pai: HTMLElement) {
    this.raiz.className = 'exercito';
    this.raiz.hidden = true;

    this.titulo.className = 'exercito__titulo';
    this.titulo.textContent = 'Exército';

    const linhaDono = document.createElement('p');
    linhaDono.className = 'exercito__poder';
    this.tinta.className = 'exercito__tinta';
    this.dono.className = 'exercito__nome-do-poder';
    linhaDono.append(this.tinta, this.dono);

    this.forca.className = 'exercito__forca';
    this.custo.className = 'exercito__custo';
    this.aviso.className = 'exercito__aviso';

    this.tituloOrigens.className = 'exercito__grupo';
    this.tituloOrigens.textContent = 'De onde vieram';
    this.origens.className = 'exercito__origens';

    this.campoHomens.className = 'exercito__valor';
    this.campoHomens.type = 'number';
    this.campoHomens.min = '1';
    this.campoHomens.step = '100';
    this.campoHomens.title =
      'Quantos homens marcham. O resto fica defendendo esta província — mandar tudo é ' +
      'apostar a casa.';
    this.campoHomens.addEventListener('input', () => {
      this.aoMudarQuantidade(Number(this.campoHomens.value));
    });

    this.botaoCancelar.className = 'botao exercito__botao';
    this.botaoCancelar.type = 'button';
    this.botaoCancelar.textContent = 'Cancelar ordem';
    this.botaoCancelar.title = 'Nada foi gasto ainda, então nada é devolvido.';
    this.botaoCancelar.addEventListener('click', () => {
      const vista = this.vista;
      if (!vista?.ordem) return;
      this.aoCancelarOrdem(vista.provincia.id);
      this.botaoCancelar.blur();
    });

    this.linhaOrdem.className = 'exercito__ordem';

    this.botaoMover.className = 'botao botao--principal exercito__botao';
    this.botaoMover.type = 'button';
    this.botaoMover.addEventListener('click', () => {
      const vista = this.vista;
      if (!vista?.minha) return;
      this.aoAlternarMarcha(vista.provincia.id);
      // `blur` no fim do clique: sem isso o botão fica com foco e a barra de espaço, que
      // passa o turno, dispara um clique sintético nele.
      this.botaoMover.blur();
    });

    this.instrucao.className = 'exercito__instrucao';

    this.botaoDispensar.className = 'botao exercito__botao';
    this.botaoDispensar.type = 'button';
    this.botaoDispensar.title =
      'Manda a hoste pra casa. Cada homem volta à província de onde saiu — e volta a ser ' +
      'tributado por quem manda nela AGORA, mesmo que não seja mais você.';
    this.botaoDispensar.addEventListener('click', () => {
      const vista = this.vista;
      if (!vista?.minha || vista.forca <= 0) return;
      this.aoDispensar(vista.provincia.id, vista.forca);
      this.botaoDispensar.blur();
    });

    this.raiz.append(
      this.titulo,
      linhaDono,
      this.forca,
      this.custo,
      this.aviso,
      this.tituloOrigens,
      this.origens,
      this.campoHomens,
      this.botaoMover,
      this.instrucao,
      this.linhaOrdem,
      this.botaoCancelar,
      this.botaoDispensar,
    );
    pai.appendChild(this.raiz);
  }

  /** `null` esconde a ficha — é o estado em que nenhuma hoste está selecionada. */
  mostrar(vista: VistaDoExercito | null): void {
    this.vista = vista;
    this.raiz.hidden = vista === null;
    if (!vista) return;

    this.titulo.textContent = `Exército em ${vista.provincia.nome}`;
    this.tinta.style.background = vista.poder.cor;
    this.dono.textContent = vista.poder.nome;
    this.forca.textContent = `${numero(vista.forca)} homens`;
    this.custo.textContent = `custa ${numero(vista.manutencao)} por turno`;

    // Estar em terra alheia ainda não faz nada — não há guerra. Mas é um fato que o
    // jogador precisa ver desde já, senão a primeira marcha vai parecer que não aconteceu.
    this.aviso.hidden = !vista.emTerraAlheia;
    if (vista.emTerraAlheia) this.aviso.textContent = 'em território que não é seu';

    // As origens são o que torna dispensar uma decisão em vez de um botão: uma hoste
    // levantada em província que caiu devolve aquela gente ao inimigo.
    this.origens.replaceChildren(
      ...vista.origens.flatMap((o) => {
        const dt = document.createElement('dt');
        dt.textContent = o.nome;
        const dd = document.createElement('dd');
        dd.textContent = o.perdida
          ? `${numero(o.homens)} · voltam para ${o.donoAtual}`
          : numero(o.homens);
        if (o.perdida) {
          dt.className = 'exercito__perdida';
          dd.className = 'exercito__perdida';
          dd.title =
            'Esta província não é mais sua. Gente pertence ao chão: dispensados, estes ' +
            'homens voltam pra terra deles e passam a ser tributados por quem a tomou.';
        }
        return [dt, dd];
      }),
    );

    // Só a hoste do jogador aceita comando. A do vizinho continua com ficha — saber a
    // força de quem está do outro lado da fronteira é informação, não ação.
    this.botaoMover.hidden = !vista.minha;
    this.botaoDispensar.hidden = !vista.minha;
    this.botaoDispensar.textContent = `Dispensar ${numero(vista.forca)}`;

    // Uma ordem em pé tranca o resto: uma por hoste por rodada. Em vez de esconder os
    // controles, mostra-se a ordem e o jeito de desfazê-la.
    const temOrdem = vista.ordem !== null;
    this.linhaOrdem.hidden = !temOrdem;
    this.botaoCancelar.hidden = !temOrdem;
    if (vista.ordem) {
      this.linhaOrdem.textContent =
        `${numero(vista.ordem.homens)} marcham para ${vista.ordem.destino} ao passar o turno`;
    }

    // O campo reinicia com a força inteira quando o jogador troca de hoste — mandar tudo
    // é o caso comum, e digitar o total toda vez seria atrito.
    if (this.quantidadeDe !== vista.provincia.id) {
      this.quantidadeDe = vista.provincia.id;
      this.campoHomens.value = String(vista.forca);
      this.aoMudarQuantidade(vista.forca);
    }
    this.campoHomens.max = String(vista.forca);
    this.campoHomens.hidden = !vista.minha || temOrdem;

    // Nada de sumir em silêncio: sem destino, o botão fica na tela dizendo o motivo. É
    // assim que o jogador descobre que a marcha só passa por território dele.
    const semDestino = vista.destinos === 0;
    this.botaoMover.hidden = !vista.minha || temOrdem;
    this.botaoMover.disabled = semDestino;
    this.botaoMover.textContent = semDestino
      ? 'Mover · sem caminho pelo seu território'
      : vista.marchando
        ? 'Escolhendo destino — cancelar'
        : 'Mover';
    this.botaoMover.title =
      'A hoste marcha livre pelo seu território, mas só por ele: o caminho inteiro tem ' +
      'que passar por províncias suas.';

    this.instrucao.hidden = !vista.marchando;
    this.instrucao.textContent = vista.marchando
      ? `Clique num dos ${numero(vista.destinos)} destinos marcados no mapa. Clicar em outro lugar cancela.`
      : '';
  }
}

function numero(valor: number): string {
  return valor.toLocaleString('pt-BR');
}
