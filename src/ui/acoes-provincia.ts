/**
 * A BARRA DE COMANDOS da província: o que dá pra fazer aqui, em quatro botões.
 *
 * Era uma lista de oito construções em grade dupla, mais três botões de imposto, mais um de
 * capital — o maior bloco visual da tela inteira, empurrando a ficha para cima e o
 * recrutamento para fora do campo de visão. Erguer prédio é a coisa que se faz de vez em
 * quando; **ler a província é a coisa que se faz a cada clique**, e o espaço estava
 * distribuído ao contrário.
 *
 * Agora:
 *
 * - **Construções** e **Recrutar** abrem janela própria, com espaço para comparar de
 *   verdade — a solução do Total War (o navegador de construções) e do EU4 (a gaveta
 *   lateral). Construções leva o contador de slots, que é ESTADO da província; Recrutar não
 *   leva contador nenhum, porque "quantos homens dá para levantar" é resposta de uma
 *   pergunta que só se faz com a barra na mão, dentro da janela.
 * - **Imposto** fica aqui: são três botões que cabem numa linha e uma decisão que se muda
 *   olhando a província, não olhando um catálogo.
 * - **Capital** só aparece quando não é a atual — e grita quando o reino está sem sede.
 *
 * Com uma província selecionada, nada some quando é impossível: o botão fica desabilitado
 * com o motivo escrito. Sem seleção, a barra inteira some junto com o painel.
 */

import { definirTooltip, removerTooltip } from './tooltip';
import { iconeGrego, rotularComIcone } from './icones-gregos';

/**
 * Os quatro decretos. Espelha `campanha/economia.ts` — a tela não importa da campanha, e a
 * vista traduz; um nível novo mexe nos dois lugares de propósito.
 */
export type NivelDeImposto = 'baixo' | 'normal' | 'alto' | 'confisco';

/** O que um decreto faz com a renda DESTA terra. Espelha `governo/previsao-de-imposto.ts`. */
export interface PrevisaoDeImposto {
  agora: number;
  assentado: number;
  /** Turnos até o levante sob este decreto, ou `null` quando ele não acende nenhum. */
  levanteEm: number | null;
}

/** O que a barra precisa saber pra oferecer — ou recusar com motivo — cada comando. */
export type VistaDeAcoes =
  | {
      pode: true;
      provincia: { id: string; nome: string };
      /** Slots de construção usados e totais. Vai no contador do botão. */
      slots: { usados: number; total: number };
      /** Quantas construções dá pra pagar e erguer AGORA. Zero apaga o chamado à ação. */
      disponiveis: number;
      /** Por que não dá pra recrutar aqui. Vazio quando dá. */
      recrutamentoBloqueado: string;
      /** A capital do reino, vista desta província: já é? pode virar? a que custo? */
      capital: {
        atual: boolean;
        custo: number;
        /** A capital caiu e o reino está sem sede: assentar aqui é a decisão urgente. */
        urgente: boolean;
        resposta: { pode: true } | { pode: false; motivo: string };
      };
      /**
       * O decreto de imposto desta província: o nível atual e o que cada um faz.
       *
       * Efeito imediato: a renda muda no clique e o humor passa a caminhar pro alvo novo —
       * receita trocada por pressão social.
       */
      imposto: {
        nivel: NivelDeImposto;
        niveis: Record<NivelDeImposto, { fator: number; humor: number }>;
        /** O que cada decreto faz com a renda DESTA terra, em moedas por turno. */
        previsao: Record<NivelDeImposto, PrevisaoDeImposto | null>;
      };
    }
  | { pode: false; motivo: string };

export class AcoesProvincia {
  private readonly raiz = document.createElement('div');
  private readonly recusa = document.createElement('p');
  private readonly principais = document.createElement('div');
  private readonly botaoConstrucoes = document.createElement('button');
  private readonly botaoRecrutar = document.createElement('button');
  private readonly botaoCapital = document.createElement('button');
  private readonly linhaDeImposto = document.createElement('div');
  private readonly botoesDeImposto = new Map<NivelDeImposto, HTMLButtonElement>();
  private vista: VistaDeAcoes | null = null;

  /** Chamado quando o jogador decreta um nível de imposto. */
  aoDefinirImposto: (idProvincia: string, nivel: NivelDeImposto) => void = () => {};
  /** Chamado quando o jogador assenta a capital nesta província. */
  aoTornarCapital: (idProvincia: string) => void = () => {};
  /** Abre a janela de construções desta província. */
  aoAbrirConstrucoes: () => void = () => {};
  /** Abre a janela de recrutamento desta província. */
  aoAbrirRecrutamento: () => void = () => {};

  constructor(pai: HTMLElement) {
    this.raiz.className = 'acoes';
    this.raiz.hidden = true;

    this.recusa.className = 'acoes__recusa';

    this.principais.className = 'acoes__principais';
    this.montarPortao(this.botaoConstrucoes, 'martelo', 'Construções', () =>
      this.aoAbrirConstrucoes(),
    );
    this.montarPortao(this.botaoRecrutar, 'capacete', 'Recrutar', () =>
      this.aoAbrirRecrutamento(),
    );
    this.principais.append(this.botaoConstrucoes, this.botaoRecrutar);

    // A capital é UMA decisão, não uma lista: um botão que diz o que faria e por quanto.
    this.botaoCapital.className = 'acoes__capital';
    this.botaoCapital.type = 'button';
    this.botaoCapital.addEventListener('click', () => {
      const vista = this.vista;
      if (!vista?.pode || !vista.capital.resposta.pode) return;
      this.aoTornarCapital(vista.provincia.id);
      this.botaoCapital.blur();
    });

    // O imposto em três níveis: um botão por nível, o vigente marcado. A lição de Rome:
    // Total War — receita trocada por ordem pública — com o efeito escrito no tooltip.
    this.linhaDeImposto.className = 'acoes__imposto';
    const rotulo = document.createElement('span');
    rotulo.className = 'acoes__rotulo';
    rotulo.textContent = 'Imposto';
    this.linhaDeImposto.appendChild(rotulo);
    const grupo = document.createElement('div');
    grupo.className = 'acoes__niveis';
    grupo.setAttribute('role', 'group');
    grupo.setAttribute('aria-label', 'Nível de imposto');
    for (const nivel of ['baixo', 'normal', 'alto', 'confisco'] as const) {
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'acoes__nivel-imposto';
      botao.textContent = {
        baixo: 'Baixo',
        normal: 'Normal',
        alto: 'Alto',
        confisco: 'Confisco',
      }[nivel];
      botao.addEventListener('click', () => {
        const vista = this.vista;
        if (!vista?.pode || vista.imposto.nivel === nivel) return;
        this.aoDefinirImposto(vista.provincia.id, nivel);
        botao.blur();
      });
      this.botoesDeImposto.set(nivel, botao);
      grupo.appendChild(botao);
    }
    this.linhaDeImposto.appendChild(grupo);

    this.raiz.append(this.recusa, this.principais, this.botaoCapital, this.linhaDeImposto);
    pai.appendChild(this.raiz);
  }

  /** Os dois portões grandes: ícone em cima, nome, e o contador que evita abrir à toa. */
  private montarPortao(
    botao: HTMLButtonElement,
    icone: 'martelo' | 'capacete',
    nome: string,
    aoClicar: () => void,
  ): void {
    botao.type = 'button';
    botao.className = 'acoes__portao';
    const textos = document.createElement('span');
    textos.className = 'acoes__portao-textos';
    const titulo = document.createElement('span');
    titulo.className = 'acoes__portao-nome';
    titulo.textContent = nome;
    const contador = document.createElement('span');
    contador.className = 'acoes__portao-contador';
    textos.append(titulo, contador);
    botao.append(iconeGrego(icone, 'acoes__portao-icone'), textos);
    botao.addEventListener('click', () => {
      if (botao.disabled) return;
      aoClicar();
      botao.blur();
    });
  }

  /** `null` esconde a barra — fora da campanha ou sem província selecionada. */
  mostrar(vista: VistaDeAcoes | null): void {
    this.vista = vista;
    this.raiz.hidden = vista === null;
    if (!vista) return;

    const disponivel = vista.pode;
    this.recusa.hidden = disponivel;
    for (const el of [this.principais, this.linhaDeImposto]) el.hidden = !disponivel;

    if (!disponivel) {
      this.botaoCapital.hidden = true;
      this.recusa.textContent = vista.motivo;
      return;
    }

    this.desenharPortoes(vista);
    this.desenharCapital(vista.capital);
    this.desenharImposto(vista.imposto);
  }

  /** Os contadores e os bloqueios dos dois portões. */
  private desenharPortoes(vista: Extract<VistaDeAcoes, { pode: true }>): void {
    // O contador de slots FICA: é estado da província, não promessa de compra.
    const livres = vista.slots.total - vista.slots.usados;
    marcarPortao(this.botaoConstrucoes, `${vista.slots.usados}/${vista.slots.total}`, {
      chamando: livres > 0,
    });
    definirTooltip(this.botaoConstrucoes, {
      titulo: 'Construções',
      corpo: livres === 0 ? 'Slots cheios. Dá para subir de nível o que já existe.' : 'Slots ocupados.',
    });

    // ⚠️ **Sem contador de homens aqui.** O portão dizia "2.500 homens", e isso é a resposta
    // de uma pergunta que só se faz DENTRO da janela, com a barra na mão. Anunciar o teto
    // antes de o jogador querer levantar tropa é o painel decidindo por ele.
    const bloqueado = vista.recrutamentoBloqueado !== '';
    marcarPortao(this.botaoRecrutar, '', { chamando: false });
    this.botaoRecrutar.disabled = bloqueado;
    if (bloqueado) {
      definirTooltip(this.botaoRecrutar, {
        titulo: 'Recrutar',
        corpo: vista.recrutamentoBloqueado,
        tom: 'bloqueio',
      });
    } else {
      removerTooltip(this.botaoRecrutar);
    }
  }

  /**
   * Os quatro decretos, com o vigente marcado e a consequência EM MOEDA no tooltip.
   *
   * ⚠️ **Antes saía daqui "135% da arrecadação · humor −8", e os dois números pareciam falar
   * de coisas diferentes.** Não falavam: o fator incide sobre a PARCELA do imposto — 13% a
   * 48% da renda —, e o humor cobra sobre o total. Medido, o imposto alto chegava a ser
   * negativo em terra onde o imposto é pouco. A tela agora responde o que o jogador quer
   * saber: quanto entra na próxima virada, e quanto sobra quando o povo terminar de reagir.
   */
  private desenharImposto(imposto: {
    nivel: NivelDeImposto;
    niveis: Record<NivelDeImposto, { fator: number; humor: number }>;
    previsao: Record<NivelDeImposto, PrevisaoDeImposto | null>;
  }): void {
    for (const [nivel, botao] of this.botoesDeImposto) {
      const efeito = imposto.niveis[nivel];
      const vigente = imposto.nivel === nivel;
      botao.dataset['vigente'] = vigente ? 'sim' : 'nao';
      botao.disabled = vigente;
      const humor =
        efeito.humor === 0
          ? 'humor inalterado'
          : efeito.humor > 0
            ? `humor +${efeito.humor}`
            : `humor −${-efeito.humor}`;
      const conta = imposto.previsao[nivel];
      // ⚠️ **Com levante marcado, o "assentado" é mentira e sai da tela.** A província não
      // chega ao equilíbrio: ela pega em armas antes, e a arrecadação vai a zero. O que o
      // jogador precisa comparar é o dinheiro de agora contra o prazo.
      const segunda = !conta
        ? humor
        : conta.levanteEm !== null
          ? `levante em ${conta.levanteEm} ${conta.levanteEm === 1 ? 'turno' : 'turnos'}`
          : `${moeda(conta.assentado)} quando o humor assentar`;
      const corpo =
        vigente || !conta
          ? `${Math.round(efeito.fator * 100)}% da arrecadação
${humor}`
          : `${moeda(conta.agora)} por turno já na próxima virada
${segunda}
${humor}`;
      definirTooltip(botao, {
        titulo: `Imposto ${botao.textContent ?? ''}`,
        corpo,
        // Confisco é PERIGO e não custo: ele não cobra um preço, ele marca uma data.
        tom: vigente ? 'informacao' : nivel === 'confisco' ? 'perigo' : 'custo',
      });
    }
  }


  /** O botão da capital: escondido na própria sede, urgente quando o reino está sem uma. */
  private desenharCapital(capital: {
    atual: boolean;
    custo: number;
    urgente: boolean;
    resposta: { pode: true } | { pode: false; motivo: string };
  }): void {
    if (capital.atual) {
      this.botaoCapital.hidden = true;
      return;
    }
    this.botaoCapital.hidden = false;
    this.botaoCapital.disabled = !capital.resposta.pode;
    this.botaoCapital.dataset['urgente'] = capital.urgente ? 'sim' : 'nao';
    const rotulo = capital.urgente
      ? 'Assentar a capital aqui'
      : capital.custo > 0
        ? `Tornar capital · ${capital.custo.toLocaleString('pt-BR')} moedas`
        : 'Tornar capital';
    rotularComIcone(this.botaoCapital, 'templo', rotulo);
    definirTooltip(this.botaoCapital, {
      titulo: 'Capital do reino',
      corpo: capital.resposta.pode
        ? capital.urgente
          ? 'Grátis. Destrava a próxima virada.'
          : `${capital.custo.toLocaleString('pt-BR')} moedas para mudar a sede.`
        : capital.resposta.motivo,
      tom: capital.resposta.pode ? 'custo' : 'bloqueio',
    });
  }
}

/** Escreve o contador do portão e acende o realce de "tem coisa pra fazer aqui". */
function marcarPortao(botao: HTMLButtonElement, contador: string, estado: { chamando: boolean }): void {
  const alvo = botao.querySelector('.acoes__portao-contador');
  if (alvo) alvo.textContent = contador;
  botao.dataset['chamando'] = estado.chamando ? 'sim' : 'nao';
  botao.disabled = false;
}

/** Moedas por turno com o sinal na frente: é sempre uma DIFERENÇA que se lê aqui. */
function moeda(valor: number): string {
  const n = Math.round(valor);
  return `${n >= 0 ? '+' : '−'}${Math.abs(n)}`;
}
