/**
 * A ficha do exército: o que esta hoste é, e os comandos que ela aceita.
 *
 * Arquivo próprio desde a revisão do dono do projeto: ver e dispensar tropa morava dentro do
 * painel de RECRUTAMENTO, e aquilo só funcionava enquanto exército e Quartel estivessem na
 * mesma província. **Recrutar é uma ação da PROVÍNCIA; dispensar é uma ação da HOSTE.**
 *
 * Esta classe é a moldura: cabeçalho, origens e dispensa. As decisões — quantos vão, para
 * quê, e o que fazer no cerco — vivem cada uma no seu componente, e a **ordem em que são
 * montadas aqui é a ordem em que aparecem na tela**.
 */

import { rotularComIcone } from '../icones-gregos';
import { definirTooltip } from '../tooltip';
import { ComandoDeCerco } from './comando-de-cerco';
import { ComandoDeMarcha } from './comando-de-marcha';
import { EscolhaDaMarcha } from './escolha-da-marcha';
import { EscolhaDePostura } from './escolha-de-postura';
import { numero } from './vista';
import type { VistaDoExercito } from './vista';

export type { VistaDoExercito } from './vista';

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

  private readonly escolhaDaMarcha: EscolhaDaMarcha;
  private readonly escolhaDePostura: EscolhaDePostura;
  private readonly comandoDeMarcha: ComandoDeMarcha;
  private readonly comandoDeCerco: ComandoDeCerco;
  private vista: VistaDoExercito | null = null;

  /** Liga e desliga o modo de marcha. Quem sabe para onde dá pra ir é a campanha. */
  aoAlternarMarcha: (idHoste: string) => void = () => {};
  /** Quantos homens o jogador quer mandar. Lida quando ele escolhe o destino no mapa. */
  aoMudarQuantidade: (homens: number) => void = () => {};
  aoCancelarOrdem: (idHoste: string) => void = () => {};
  /** A postura da ordem que está sendo composta. */
  aoEscolherPostura: (postura: 'assaltar' | 'sitiar') => void = () => {};
  /** A ordem de recuo da marcha que está sendo composta. */
  aoTrocarRecuo: (recuar: boolean) => void = () => {};
  /** A postura de um cerco JÁ em pé. Vale na próxima virada, como toda ordem. */
  aoTrocarPosturaDoCerco: (idProvincia: string, postura: 'assaltar' | 'sitiar') => void =
    () => {};
  /** Manda a hoste sitiada sair para lutar. Vale na próxima virada, como toda ordem. */
  aoSurtir: (idHoste: string) => void = () => {};
  aoDispensar: (idHoste: string, homens: number) => void = () => {};

  constructor(pai: HTMLElement) {
    this.raiz.className = 'exercito';
    this.raiz.hidden = true;

    this.titulo.className = 'exercito__titulo';
    rotularComIcone(this.titulo, 'escudo', 'Exército');

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

    this.raiz.append(
      this.titulo,
      linhaDono,
      this.forca,
      this.custo,
      this.aviso,
      this.tituloOrigens,
      this.origens,
    );

    // A escolha de postura mora entre a quantidade e o botão de mover porque é a mesma
    // decisão: quantos vão, e para quê.
    this.escolhaDaMarcha = new EscolhaDaMarcha(this.raiz);
    this.escolhaDePostura = new EscolhaDePostura(this.raiz);
    this.comandoDeMarcha = new ComandoDeMarcha(this.raiz);
    this.comandoDeCerco = new ComandoDeCerco(this.raiz);

    this.escolhaDaMarcha.aoMudarQuantidade = (homens) => this.aoMudarQuantidade(homens);
    this.escolhaDePostura.aoEscolher = (postura) => this.aoEscolherPostura(postura);
    this.escolhaDePostura.aoTrocarRecuo = (recuar) => this.aoTrocarRecuo(recuar);
    this.comandoDeMarcha.aoAlternarMarcha = (id) => this.aoAlternarMarcha(id);
    this.comandoDeMarcha.aoCancelarOrdem = (id) => this.aoCancelarOrdem(id);
    this.comandoDeCerco.aoSurtir = (id) => this.aoSurtir(id);
    this.comandoDeCerco.aoTrocarPostura = (id, postura) =>
      this.aoTrocarPosturaDoCerco(id, postura);

    this.botaoDispensar.className = 'botao exercito__botao';
    this.botaoDispensar.type = 'button';
    definirTooltip(this.botaoDispensar, {
      titulo: 'Dispensar hoste',
      corpo: 'Os homens retornam às populações de origem.',
      tom: 'perigo',
    });
    this.botaoDispensar.addEventListener('click', () => {
      const vista = this.vista;
      if (!vista?.minha || vista.forca <= 0) return;
      this.aoDispensar(vista.hoste.id, vista.forca);
      this.botaoDispensar.blur();
    });
    this.raiz.appendChild(this.botaoDispensar);

    pai.appendChild(this.raiz);
  }

  /** `null` esconde a ficha — é o estado em que nenhuma hoste está selecionada. */
  mostrar(vista: VistaDoExercito | null): void {
    this.vista = vista;
    this.raiz.hidden = vista === null;
    if (!vista) return;

    rotularComIcone(this.titulo, 'escudo', `Exército em ${vista.provincia.nome}`);
    this.tinta.style.background = vista.poder.cor;
    this.dono.textContent = vista.poder.nome;
    this.forca.textContent = `${numero(vista.forca)} homens`;
    this.custo.textContent = `custa ${numero(vista.manutencao)} por turno`;
    // Estar em terra alheia é um fato que o jogador precisa ver, senão a primeira marcha vai
    // parecer que não aconteceu.
    if (vista.emTerraAlheia) this.aviso.textContent = 'em território que não é seu';

    this.desenharOrigens(vista);
    rotularComIcone(this.botaoDispensar, 'capacete', `Dispensar ${numero(vista.forca)}`);

    // Uma ordem em pé tranca o resto: uma por hoste por rodada. A surtida conta como ordem.
    const temOrdem = vista.ordem !== null || vista.surtida?.declarada === true;
    this.escolhaDaMarcha.mostrar(vista, temOrdem);
    this.escolhaDePostura.mostrar(vista);
    this.comandoDeMarcha.mostrar(vista, temOrdem);
    this.comandoDeCerco.mostrar(vista, temOrdem);

    // ⚠️ **Enquanto se escolhe destino, o painel encolhe.** Ele fica em baixo-direita, por
    // cima do mapa, e cresceu com o seletor de postura até cobrir um destino clicável — o
    // jogador via o alvo e o clique não chegava nele. Some o que não é a decisão do momento:
    // de onde os homens vieram e o botão de dispensar. Nada disso desaparece de vez, e é o
    // próprio botão "Mover" que traz tudo de volta ao cancelar. O cabeçalho de força é
    // redundante aqui — a linha da quantidade já diz "1.000 de 1.000 marcham".
    this.forca.hidden = vista.marchando;
    this.custo.hidden = vista.marchando;
    this.aviso.hidden = vista.marchando || !vista.emTerraAlheia;
    this.tituloOrigens.hidden = vista.marchando;
    this.origens.hidden = vista.marchando;
    this.botaoDispensar.hidden = vista.marchando || !vista.minha;
  }

  /**
   * As origens são o que torna dispensar uma decisão em vez de um botão: uma hoste levantada
   * em província que caiu devolve aquela gente ao inimigo.
   */
  private desenharOrigens(vista: VistaDoExercito): void {
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
          definirTooltip(dd, {
            titulo: 'Terra natal perdida',
            corpo:
              'Dispensados, estes homens retornam para quem atualmente controla sua ' +
              'província de origem.',
            tom: 'perigo',
          });
        }
        return [dt, dd];
      }),
    );
  }
}
