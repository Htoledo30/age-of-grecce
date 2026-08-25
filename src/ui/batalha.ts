/**
 * A JANELA DE BATALHA — o jogador assiste, não comanda.
 *
 * No espírito da tela de jogo do Brasfoot: não é tempo real, não tem boneco andando, não tem
 * ordem para dar. É uma tela de resultado **animada**, round a round, com tensão em vez de
 * controle.
 *
 * ⚠️ **Ela não recalcula NADA.** Recebe a lista de rounds que a regra já produziu e a
 * reproduz. É por isso que ela não consegue mentir: não existe uma fórmula para decidir a
 * batalha e outra para animá-la, e a mesma batalha resolvida sem janela — a da IA, um dia —
 * dá exatamente o mesmo resultado. Se um número aqui divergir do mapa, o defeito está na
 * regra, nunca aqui.
 *
 * ⚠️ **Abre só nas batalhas do jogador.** Assistir a guerra alheia seria transformar a
 * crônica numa fila de janelas.
 *
 * Segue o mesmo contrato da animação de marcha: a campanha JÁ resolveu a rodada, e isto só
 * põe diante do jogador o que aconteceu. Nenhum clique aqui muda o mapa.
 */

import { definirTooltip } from './tooltip';

/** Um lado como ele entrou na batalha. */
interface LadoNaTela {
  nome: string;
  cor: string;
  homens: number;
  /** Multiplicador de resistência: a muralha. 1 é campo aberto. */
  aguento: number;
}

/** Uma batalha inteira, pronta para ser reproduzida. */
export interface VistaDaBatalha {
  /** Onde foi, ou `null` no encontro na estrada — a única batalha sem lugar. */
  lugar: string | null;
  tipo: 'campo' | 'estrada' | 'assalto';
  lados: readonly [LadoNaTela, LadoNaTela];
  rounds: readonly { a: number; b: number; fase: 'choque' | 'perseguicao' | 'recuo' }[];
  /** `null` só existe por segurança de tipo: a regra sempre elege um vencedor. */
  vencedor: 'a' | 'b' | null;
  desfecho: 'quebrou' | 'recuou';
}

/** Milissegundos entre um round e o seguinte quando o jogador manda deixar correr. */
const RITMO = 900;

export class JanelaDeBatalha {
  readonly elemento = document.createElement('div');

  private readonly titulo = document.createElement('h2');
  private readonly placar = document.createElement('p');
  private readonly barras = document.createElement('div');
  private readonly narracao = document.createElement('p');
  private readonly botoes = document.createElement('div');
  private readonly seguir = document.createElement('button');
  private readonly correr = document.createElement('button');
  private readonly fechar = document.createElement('button');

  private vista: VistaDaBatalha | null = null;
  private round = 0;
  private temporizador: number | undefined;

  /** Chamado quando o jogador fecha a janela — a próxima batalha da fila entra. */
  aoFechar: () => void = () => {};

  constructor(pai: HTMLElement) {
    this.elemento.className = 'batalha';
    this.elemento.hidden = true;
    this.titulo.className = 'batalha__titulo';
    this.placar.className = 'batalha__placar';
    this.barras.className = 'batalha__barras';
    this.narracao.className = 'batalha__narracao';
    this.botoes.className = 'batalha__botoes';

    this.seguir.type = 'button';
    this.seguir.className = 'batalha__botao';
    this.seguir.textContent = 'Continuar';
    this.seguir.addEventListener('click', () => this.avancar());

    this.correr.type = 'button';
    this.correr.className = 'batalha__botao';
    this.correr.textContent = 'Deixar correr';
    this.correr.addEventListener('click', () => this.deixarCorrer());

    this.fechar.type = 'button';
    this.fechar.className = 'batalha__botao batalha__botao--fim';
    this.fechar.textContent = 'Fechar';
    this.fechar.addEventListener('click', () => this.encerrar());

    this.botoes.append(this.seguir, this.correr, this.fechar);
    this.elemento.append(this.titulo, this.placar, this.barras, this.narracao, this.botoes);
    pai.appendChild(this.elemento);
  }

  /** Põe uma batalha na tela, parada no round zero. */
  mostrar(vista: VistaDaBatalha): void {
    this.parar();
    this.vista = vista;
    this.round = 0;
    this.elemento.hidden = false;
    this.elemento.dataset['tipo'] = vista.tipo;
    this.titulo.textContent =
      vista.tipo === 'estrada'
        ? 'Encontro na estrada'
        : vista.tipo === 'assalto'
          ? `Assalto a ${vista.lugar ?? ''}`
          : `Batalha em ${vista.lugar ?? ''}`;
    this.desenhar();
  }

  esconder(): void {
    this.parar();
    this.vista = null;
    this.elemento.hidden = true;
  }

  private avancar(): void {
    const vista = this.vista;
    if (!vista) return;
    if (this.round < vista.rounds.length) this.round += 1;
    if (this.round >= vista.rounds.length) this.parar();
    this.desenhar();
  }

  private deixarCorrer(): void {
    if (this.temporizador !== undefined) return;
    this.temporizador = window.setInterval(() => {
      const vista = this.vista;
      if (!vista || this.round >= vista.rounds.length) {
        this.parar();
        return;
      }
      this.avancar();
    }, RITMO);
    this.desenhar();
  }

  private parar(): void {
    if (this.temporizador !== undefined) window.clearInterval(this.temporizador);
    this.temporizador = undefined;
  }

  private encerrar(): void {
    this.esconder();
    this.aoFechar();
  }

  private desenhar(): void {
    const vista = this.vista;
    if (!vista) return;
    const [a, b] = vista.lados;
    const agora = vista.rounds[this.round - 1];
    const vivosA = agora?.a ?? a.homens;
    const vivosB = agora?.b ?? b.homens;
    const acabou = this.round >= vista.rounds.length;

    this.placar.textContent = acabou
      ? `${this.round} de ${vista.rounds.length} — fim`
      : `round ${this.round} de ${vista.rounds.length}`;

    this.barras.replaceChildren(
      barraDoLado(a, vivosA, agora?.fase ?? null),
      barraDoLado(b, vivosB, agora?.fase ?? null),
    );

    this.narracao.textContent = narrar(vista, this.round, vivosA, vivosB);
    this.narracao.dataset['fase'] = agora?.fase ?? 'inicio';

    this.seguir.disabled = acabou;
    this.correr.disabled = acabou || this.temporizador !== undefined;
    this.fechar.hidden = !acabou;
    definirTooltip(this.fechar, {
      titulo: 'A batalha já aconteceu',
      corpo:
        'Esta janela reproduz o que a regra decidiu quando o turno virou. Fechar não muda ' +
        'nada no mapa — o resultado já está lá.',
    });
  }
}

/** Uma barra que encolhe: o nome, o número em pé, e a fatia do que era. */
function barraDoLado(lado: LadoNaTela, vivos: number, fase: string | null): HTMLElement {
  const linha = document.createElement('div');
  linha.className = 'batalha__lado';

  const nome = document.createElement('span');
  nome.className = 'batalha__nome';
  nome.textContent = lado.nome;
  // A muralha é modificador VISÍVEL, e é esta a promessa: ela aparece ao lado de quem a tem,
  // em vez de sumir dentro do número da defesa como um multiplicador escondido.
  if (lado.aguento > 1) {
    const muro = document.createElement('span');
    muro.className = 'batalha__muro';
    muro.textContent = `muralha ×${lado.aguento}`;
    nome.appendChild(muro);
  }

  const trilho = document.createElement('div');
  trilho.className = 'batalha__trilho';
  const cheio = document.createElement('div');
  cheio.className = 'batalha__cheio';
  cheio.style.width = `${lado.homens > 0 ? (vivos / lado.homens) * 100 : 0}%`;
  cheio.style.background = lado.cor;
  if (fase === 'perseguicao') cheio.dataset['fase'] = 'perseguicao';
  trilho.appendChild(cheio);

  const conta = document.createElement('span');
  conta.className = 'batalha__conta';
  conta.textContent = `${vivos.toLocaleString('pt-BR')} de ${lado.homens.toLocaleString('pt-BR')}`;

  linha.append(nome, trilho, conta);
  return linha;
}

/**
 * O que se diz de cada round.
 *
 * Texto e não número solto: a barra já mostra quanto encolheu, e a frase existe para dizer o
 * que aquilo FOI — a linha segurando, a linha cedendo, a caçada, a saída ordenada.
 */
function narrar(vista: VistaDaBatalha, round: number, vivosA: number, vivosB: number): string {
  const [a, b] = vista.lados;
  if (round === 0) {
    const muro = b.aguento > 1 ? `, atrás de muralha` : '';
    return `${a.nome} traz ${a.homens.toLocaleString('pt-BR')}; ${b.nome} tem ${b.homens.toLocaleString('pt-BR')}${muro}.`;
  }

  const fase = vista.rounds[round - 1]?.fase;
  if (fase === 'recuo') {
    const quemSaiu = vista.vencedor === 'a' ? b.nome : a.nome;
    return `${quemSaiu} sai de campo antes de a linha ceder: paga o preço da retirada e escapa da perseguição.`;
  }
  if (fase === 'perseguicao') {
    const perdedor = vista.vencedor === 'a' ? b.nome : a.nome;
    const vencedor = vista.vencedor === 'a' ? a.nome : b.nome;
    return `A linha de ${perdedor} cede e corre. ${vencedor} caça os fugitivos — é aqui que morre gente.`;
  }

  const anterior = round === 1 ? { a: a.homens, b: b.homens } : vista.rounds[round - 2]!;
  const perdeuA = anterior.a - vivosA;
  const perdeuB = anterior.b - vivosB;
  if (perdeuA > perdeuB * 1.3) return `${b.nome} leva a melhor no empurrão; ${a.nome} recua um passo.`;
  if (perdeuB > perdeuA * 1.3) return `${a.nome} ganha terreno; a linha de ${b.nome} range.`;
  return 'As duas linhas se seguram, e ninguém cede.';
}
