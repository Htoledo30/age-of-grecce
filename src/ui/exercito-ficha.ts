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
  private readonly botaoDispensar = document.createElement('button');
  private vista: VistaDoExercito | null = null;

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

    this.botaoDispensar.hidden = !vista.minha;
    this.botaoDispensar.textContent = `Dispensar ${numero(vista.forca)}`;
  }
}

function numero(valor: number): string {
  return valor.toLocaleString('pt-BR');
}
