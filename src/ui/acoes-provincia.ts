/**
 * O que dá pra FAZER com a província selecionada.
 *
 * Fica colado em cima da ficha, no canto de baixo à esquerda, porque ação e informação
 * sobre a mesma província pertencem ao mesmo canto da tela: o jogador clica no mapa e
 * encontra ali o que ela é e o que ele pode fazer com ela. O painel da direita continua
 * sendo só controle de MAPA — ele não fala de nenhuma província em particular.
 *
 * O bloco é dividido em **Construções** e **Decretos**, e a divisão não é enfeite: são
 * dois gastos que disputam o mesmo tesouro. Construção é cara e permanente; decreto é
 * barato e temporário. É essa disputa que faz investir virar decisão em vez de rotina.
 *
 * Com uma província selecionada, nada some quando é impossível: a linha fica desabilitada
 * com o motivo escrito. Sem seleção, o painel inteiro some porque não existe decisão nem
 * contexto para mostrar.
 */

import { definirTooltip } from './tooltip';
import { iconeDaConstrucao, rotularComIcone } from './icones-gregos';

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
  /** `null` quando dá pra construir; senão, o texto do impedimento. */
  recusa: string | null;
  /** Pra que ela serve, em uma frase. Vai pro tooltip. */
  motivo: string;
  ganhoPorTurno: number;
  turnosParaPagar: number;
  /** Ouro por turno para manter o nível alvo de pé, para sempre. */
  manutencao: number;
  /** O efeito desta construção é renda em moeda? Decide como falar de ganho negativo. */
  rendeMoeda: boolean;
  /**
   * O benefício, escrito, quando não paga em ouro.
   *
   * `null` nas que rendem moeda. Capacidade e população não têm "paga-se em N turnos".
   */
  promessa: string;
}

/** O que o bloco precisa saber pra oferecer — ou recusar com motivo — cada ação. */
export type VistaDeAcoes =
  | {
      pode: true;
      provincia: { id: string; nome: string };
      construcoes: readonly OpcaoDeConstrucao[];
      slots: { usados: number; total: number };
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
       * Substituiu o incentivo de investimento. Efeito imediato: a renda muda no clique
       * e o humor passa a caminhar pro alvo novo — receita trocada por pressão social.
       */
      imposto: {
        nivel: 'baixo' | 'normal' | 'alto';
        niveis: Record<'baixo' | 'normal' | 'alto', { fator: number; humor: number }>;
      };
    }
  | { pode: false; motivo: string };

export class AcoesProvincia {
  private readonly raiz = document.createElement('div');
  private readonly titulo = document.createElement('h2');
  private readonly alvo = document.createElement('p');
  private readonly botaoCapital = document.createElement('button');
  private readonly tituloConstrucoes = document.createElement('h3');
  private readonly listaConstrucoes = document.createElement('div');
  private readonly tituloDecretos = document.createElement('h3');
  private readonly blocoImposto = document.createElement('div');
  private readonly botoesDeImposto = new Map<'baixo' | 'normal' | 'alto', HTMLButtonElement>();
  private vista: VistaDeAcoes | null = null;

  /** Chamado quando o jogador decreta um nível de imposto. */
  aoDefinirImposto: (idProvincia: string, nivel: 'baixo' | 'normal' | 'alto') => void = () => {};
  /** Chamado quando o jogador ergue uma construção. */
  aoConstruir: (idProvincia: string, idConstrucao: string) => void = () => {};
  /** Chamado quando o jogador assenta a capital nesta província. */
  aoTornarCapital: (idProvincia: string) => void = () => {};

  constructor(pai: HTMLElement) {
    this.raiz.className = 'acoes';
    this.raiz.hidden = true;

    this.titulo.className = 'acoes__titulo';
    rotularComIcone(this.titulo, 'martelo', 'Ações');

    this.alvo.className = 'acoes__alvo';

    // A capital é UMA decisão, não uma lista: um botão que diz o que faria e por quanto.
    this.botaoCapital.className = 'botao acoes__capital';
    this.botaoCapital.type = 'button';
    this.botaoCapital.addEventListener('click', () => {
      const vista = this.vista;
      if (!vista?.pode || !vista.capital.resposta.pode) return;
      this.aoTornarCapital(vista.provincia.id);
      this.botaoCapital.blur();
    });

    this.tituloConstrucoes.className = 'acoes__grupo';
    this.tituloConstrucoes.textContent = 'Construções';
    this.listaConstrucoes.className = 'acoes__lista';

    this.tituloDecretos.className = 'acoes__grupo';
    this.tituloDecretos.textContent = 'Decretos';

    // O imposto em três níveis: um botão por nível, o vigente marcado. A lição de Rome:
    // Total War — receita trocada por ordem pública — com o efeito escrito no tooltip.
    this.blocoImposto.className = 'acoes__imposto';
    for (const nivel of ['baixo', 'normal', 'alto'] as const) {
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'acoes__nivel-imposto';
      botao.textContent = { baixo: 'Baixo', normal: 'Normal', alto: 'Alto' }[nivel];
      botao.addEventListener('click', () => {
        const vista = this.vista;
        if (!vista?.pode || vista.imposto.nivel === nivel) return;
        this.aoDefinirImposto(vista.provincia.id, nivel);
        botao.blur();
      });
      this.botoesDeImposto.set(nivel, botao);
      this.blocoImposto.appendChild(botao);
    }

    this.raiz.append(
      this.titulo,
      this.alvo,
      this.botaoCapital,
      this.tituloConstrucoes,
      this.listaConstrucoes,
      this.tituloDecretos,
      this.blocoImposto,
    );
    pai.appendChild(this.raiz);
  }

  /** `null` esconde o bloco — fora da campanha ou sem província selecionada. */
  mostrar(vista: VistaDeAcoes | null): void {
    this.vista = vista;
    this.raiz.hidden = vista === null;
    if (!vista) return;

    const disponivel = vista.pode;
    for (const el of [
      this.botaoCapital,
      this.tituloConstrucoes,
      this.listaConstrucoes,
      this.tituloDecretos,
      this.blocoImposto,
    ]) {
      el.hidden = !disponivel;
    }

    if (!disponivel) {
      this.alvo.textContent = vista.motivo;
      return;
    }

    const marcaDeCapital = vista.capital.atual ? ' · capital do reino' : '';
    this.alvo.textContent =
      `${vista.slots.usados}/${vista.slots.total} slots ocupados · níveis I–III.` +
      marcaDeCapital;

    this.desenharCapital(vista.capital);

    this.listaConstrucoes.replaceChildren(
      ...vista.construcoes.map((o) => this.linhaDeConstrucao(vista.provincia.id, o)),
    );
    this.desenharImposto(vista.imposto);
  }

  /** Os três níveis de imposto, com o vigente marcado e o efeito escrito no tooltip. */
  private desenharImposto(imposto: {
    nivel: 'baixo' | 'normal' | 'alto';
    niveis: Record<'baixo' | 'normal' | 'alto', { fator: number; humor: number }>;
  }): void {
    for (const [nivel, botao] of this.botoesDeImposto) {
      const efeito = imposto.niveis[nivel];
      const vigente = imposto.nivel === nivel;
      botao.dataset['vigente'] = vigente ? 'sim' : 'nao';
      botao.disabled = vigente;
      const arrecadacao =
        efeito.fator === 1
          ? 'arrecadação normal'
          : `${Math.round(efeito.fator * 100)}% da arrecadação`;
      const humor =
        efeito.humor === 0
          ? 'sem peso no humor'
          : efeito.humor > 0
            ? `humor +${efeito.humor}`
            : `humor −${-efeito.humor}`;
      definirTooltip(botao, {
        titulo: `Imposto ${botao.textContent ?? ''}`,
        corpo: `${arrecadacao}\n${humor}`,
        tom: vigente ? 'informacao' : 'custo',
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
      ? 'Assentar capital aqui'
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

  /**
   * Uma linha por construção, sempre visível.
   *
   * Custo e retorno na mesma linha é o que deixa comparar as opções de relance, sem abrir
   * nada — a lição da referência do Age of History. O que muda aqui é que o número vem
   * escrito por extenso, em vez de um `1.4` solto que só se entende consultando manual.
   */
  private linhaDeConstrucao(idProvincia: string, opcao: OpcaoDeConstrucao): HTMLElement {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'acoes__construcao';
    const noMaximo = opcao.nivelAtual >= opcao.nivelMaximo;
    botao.disabled = noMaximo || opcao.emObra !== null || opcao.recusa !== null;
    botao.dataset['estado'] = noMaximo ? 'erguida' : opcao.emObra !== null ? 'obra' : 'livre';

    // Uma linha só: nome e o que ela custa AGORA. O que ela faz, quanto rende e em
    // quantos turnos se paga vão pro tooltip — a lista tem que dar pra varrer com o olho,
    // e quem quer conferir a conta passa o mouse.
    let rotulo: string;
    if (noMaximo) rotulo = `${opcao.nome} III · nível máximo`;
    else if (opcao.emObra !== null) {
      rotulo = `${opcao.nome} ${romano(opcao.nivelAlvo)} · em obra, ${opcao.emObra} ${opcao.emObra === 1 ? 'turno' : 'turnos'}`;
    } else if (opcao.recusa) {
      // O impedimento fica NO LUGAR do custo, não escondido: opção desabilitada sem
      // explicação é exatamente o que não pode acontecer aqui.
      const progresso =
        opcao.nivelAtual > 0
          ? `${romano(opcao.nivelAtual)} → ${romano(opcao.nivelAlvo)}`
          : romano(opcao.nivelAlvo);
      rotulo = `${opcao.nome} ${progresso} · ${opcao.recusa}`;
    } else {
      const progresso = opcao.nivelAtual > 0 ? `${romano(opcao.nivelAtual)} → ${romano(opcao.nivelAlvo)}` : 'I';
      rotulo = `${opcao.nome} ${progresso} · ${opcao.custo.toLocaleString('pt-BR')} moedas`;
    }
    rotularComIcone(botao, iconeDaConstrucao(opcao.id), rotulo);

    definirTooltip(botao, {
      titulo: opcao.nome,
      corpo: this.explicacao(opcao),
      tom: opcao.recusa ? 'bloqueio' : noMaximo ? 'informacao' : 'custo',
    });
    botao.addEventListener('click', () => {
      if (botao.disabled) return;
      this.aoConstruir(idProvincia, opcao.id);
      botao.blur();
    });
    return botao;
  }

  /** O tooltip da construção: pra que serve, prazo, manutenção, quanto rende e quando se paga. */
  private explicacao(opcao: OpcaoDeConstrucao): string {
    const efeito = opcao.promessa || opcao.motivo;
    const linhas = efeito ? [efeito] : [];

    if (opcao.nivelAtual >= opcao.nivelMaximo) return linhas.join('\n');
    if (opcao.emObra !== null) {
      linhas.push(`Pronta em ${opcao.emObra} ${opcao.emObra === 1 ? 'turno' : 'turnos'}.`);
      return linhas.join('\n');
    }

    linhas.push(`${opcao.custo.toLocaleString('pt-BR')} moedas agora`);
    if (opcao.manutencao > 0) {
      linhas.push(`−${opcao.manutencao.toLocaleString('pt-BR')} por turno`);
    }
    linhas.push(`${opcao.turnos} ${opcao.turnos === 1 ? 'turno' : 'turnos'} para concluir`);
    if (opcao.ganhoPorTurno > 0) {
      linhas.push(`+${opcao.ganhoPorTurno} por turno`);
      if (Number.isFinite(opcao.turnosParaPagar)) {
        linhas.push(`paga-se em ${Math.ceil(opcao.turnosParaPagar)} turnos`);
      }
    } else if (opcao.rendeMoeda && opcao.ganhoPorTurno < 0) {
      linhas.push(`saldo local −${-opcao.ganhoPorTurno} por turno`);
    }
    return linhas.join('\n');
  }

}

function romano(nivel: number): string {
  return ['0', 'I', 'II', 'III'][nivel] ?? String(nivel);
}
