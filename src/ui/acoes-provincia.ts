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

import { definirTooltip, removerTooltip } from './tooltip';
import { iconeDaConstrucao, rotularComIcone } from './icones-gregos';

/** Uma construção oferecida nesta província, já avaliada. */
export interface OpcaoDeConstrucao {
  id: string;
  nome: string;
  custo: number;
  /** Turnos de obra até render. */
  turnos: number;
  /** Já existe aqui. */
  erguida: boolean;
  /** Turnos que ainda faltam, quando esta é a obra em andamento. */
  emObra: number | null;
  /** `null` quando dá pra construir; senão, o texto do impedimento. */
  recusa: string | null;
  /** Pra que ela serve, em uma frase. Vai pro tooltip. */
  motivo: string;
  ganhoPorTurno: number;
  turnosParaPagar: number;
  /**
   * O benefício, escrito, quando não paga em ouro.
   *
   * `null` nas que rendem moeda. Capacidade e população não têm "paga-se em N turnos".
   */
  promessa: string | null;
}

/** O que o bloco precisa saber pra oferecer — ou recusar com motivo — cada ação. */
export type VistaDeAcoes =
  | {
      pode: true;
      provincia: { id: string; nome: string };
      construcoes: readonly OpcaoDeConstrucao[];
      /** Bônus em curso, 0 quando não há incentivo ativo. */
      bonusAtual: number;
      arrecadacoesRestantes: number;
      /** Quantas arrecadações um incentivo novo dura. */
      duracao: number;
      /** Teto real agora: limite do decreto e tesouro disponível. */
      maximo: number;
      /** Resposta da campanha pro valor escolhido agora. */
      avaliar: (valor: number) => { pode: true; bonus: number } | { pode: false; motivo: string };
      /** A conta do retorno: quanto rende por turno e se chega a pagar o que custou. */
      retorno: (valor: number) => {
        ganhoPorTurno: number;
        ganhoTotal: number;
        turnosParaPagar: number;
        vale: boolean;
      } | null;
    }
  | { pode: false; motivo: string };

export class AcoesProvincia {
  private readonly raiz = document.createElement('div');
  private readonly titulo = document.createElement('h2');
  private readonly alvo = document.createElement('p');
  private readonly tituloConstrucoes = document.createElement('h3');
  private readonly listaConstrucoes = document.createElement('div');
  private readonly tituloDecretos = document.createElement('h3');
  private readonly quantidade = document.createElement('p');
  private readonly campoValor = document.createElement('input');
  private readonly atalhos = document.createElement('div');
  private readonly botoesDeAtalho: HTMLButtonElement[] = [];
  private readonly previsao = document.createElement('p');
  private readonly botaoInvestir = document.createElement('button');
  private vista: VistaDeAcoes | null = null;
  private provinciaDoValor: string | null = null;

  /** Chamado quando o jogador confirma um investimento. */
  aoInvestir: (idProvincia: string, valor: number) => void = () => {};
  /** Chamado quando o jogador ergue uma construção. */
  aoConstruir: (idProvincia: string, idConstrucao: string) => void = () => {};

  constructor(pai: HTMLElement) {
    this.raiz.className = 'acoes';
    this.raiz.hidden = true;

    this.titulo.className = 'acoes__titulo';
    rotularComIcone(this.titulo, 'martelo', 'Ações');

    this.alvo.className = 'acoes__alvo';

    this.tituloConstrucoes.className = 'acoes__grupo';
    this.tituloConstrucoes.textContent = 'Construções';
    this.listaConstrucoes.className = 'acoes__lista';

    this.tituloDecretos.className = 'acoes__grupo';
    this.tituloDecretos.textContent = 'Decretos';

    this.quantidade.className = 'acoes__quantidade';
    this.quantidade.setAttribute('aria-live', 'polite');

    this.campoValor.className = 'acoes__valor';
    this.campoValor.type = 'range';
    this.campoValor.min = '0';
    this.campoValor.step = '1';
    this.campoValor.value = '0';
    this.campoValor.setAttribute('aria-label', 'Moedas para investir na produção');
    definirTooltip(this.campoValor, {
      titulo: 'Incentivo à produção',
      corpo:
        'Escolha quanto destinar a esta província. A barra respeita o tesouro e o limite ' +
        'deste decreto.',
      tom: 'custo',
    });
    this.campoValor.addEventListener('input', () => this.avaliar());

    this.atalhos.className = 'acoes__atalhos';
    for (const [rotulo, fracao] of [
      ['25%', 0.25],
      ['50%', 0.5],
      ['75%', 0.75],
      ['Máximo', 1],
    ] as const) {
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'acoes__atalho';
      botao.textContent = rotulo;
      botao.addEventListener('click', () => {
        const vista = this.vista;
        if (!vista?.pode || vista.maximo === 0) return;
        this.campoValor.value = String(Math.max(1, Math.floor(vista.maximo * fracao)));
        this.avaliar();
        botao.blur();
      });
      this.botoesDeAtalho.push(botao);
      this.atalhos.appendChild(botao);
    }

    this.previsao.className = 'acoes__previsao';

    this.botaoInvestir.className = 'botao botao--principal acoes__botao';
    this.botaoInvestir.type = 'button';
    this.botaoInvestir.textContent = 'Investir na produção';
    this.botaoInvestir.addEventListener('click', () => {
      const vista = this.vista;
      if (!vista?.pode) return;
      const valor = Number(this.campoValor.value);
      if (vista.avaliar(valor).pode) {
        this.campoValor.value = '0';
        this.aoInvestir(vista.provincia.id, valor);
      }
      this.botaoInvestir.blur();
    });

    this.raiz.append(
      this.titulo,
      this.alvo,
      this.tituloConstrucoes,
      this.listaConstrucoes,
      this.tituloDecretos,
      this.quantidade,
      this.campoValor,
      this.atalhos,
      this.previsao,
      this.botaoInvestir,
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
      this.tituloConstrucoes,
      this.listaConstrucoes,
      this.tituloDecretos,
      this.quantidade,
      this.campoValor,
      this.atalhos,
      this.botaoInvestir,
    ]) {
      el.hidden = !disponivel;
    }

    if (!disponivel) {
      this.alvo.textContent = vista.motivo;
      this.previsao.textContent = '';
      return;
    }

    this.alvo.textContent =
      vista.arrecadacoesRestantes > 0
        ? `Incentivo de +${Math.round(vista.bonusAtual * 100)}% por mais ` +
          `${vista.arrecadacoesRestantes} ${vista.arrecadacoesRestantes === 1 ? 'turno' : 'turnos'}`
        : 'Construção é permanente; decreto dura alguns turnos.';

    this.listaConstrucoes.replaceChildren(
      ...vista.construcoes.map((o) => this.linhaDeConstrucao(vista.provincia.id, o)),
    );
    this.campoValor.max = String(vista.maximo);
    if (this.provinciaDoValor !== vista.provincia.id) {
      this.provinciaDoValor = vista.provincia.id;
      this.campoValor.value = String(Math.min(250, vista.maximo));
    } else {
      this.campoValor.value = String(Math.min(Number(this.campoValor.value), vista.maximo));
    }
    this.campoValor.disabled = vista.maximo === 0;
    for (const botao of this.botoesDeAtalho) botao.disabled = vista.maximo === 0;
    this.avaliar();
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
    botao.disabled = opcao.erguida || opcao.emObra !== null || opcao.recusa !== null;
    botao.dataset['estado'] = opcao.erguida ? 'erguida' : opcao.emObra !== null ? 'obra' : 'livre';

    // Uma linha só: nome e o que ela custa AGORA. O que ela faz, quanto rende e em
    // quantos turnos se paga vão pro tooltip — a lista tem que dar pra varrer com o olho,
    // e quem quer conferir a conta passa o mouse.
    let rotulo: string;
    if (opcao.erguida) rotulo = `${opcao.nome} · construída`;
    else if (opcao.emObra !== null) {
      rotulo = `${opcao.nome} · em obra, ${opcao.emObra} ${opcao.emObra === 1 ? 'turno' : 'turnos'}`;
    } else if (opcao.recusa) {
      // O impedimento fica NO LUGAR do custo, não escondido: opção desabilitada sem
      // explicação é exatamente o que não pode acontecer aqui.
      rotulo = `${opcao.nome} · ${opcao.recusa}`;
    } else {
      rotulo = `${opcao.nome} · ${opcao.custo.toLocaleString('pt-BR')} moedas`;
    }
    rotularComIcone(botao, iconeDaConstrucao(opcao.id), rotulo);

    definirTooltip(botao, {
      titulo: opcao.nome,
      corpo: this.explicacao(opcao),
      tom: opcao.recusa ? 'bloqueio' : opcao.erguida ? 'informacao' : 'custo',
    });
    botao.addEventListener('click', () => {
      if (botao.disabled) return;
      this.aoConstruir(idProvincia, opcao.id);
      botao.blur();
    });
    return botao;
  }

  /** O tooltip da construção: pra que serve, prazo, quanto rende e quando se paga. */
  private explicacao(opcao: OpcaoDeConstrucao): string {
    const linhas = [opcao.motivo];
    const custoEPrazo = `${opcao.custo.toLocaleString('pt-BR')} moedas · ${opcao.turnos} turnos de obra.`;

    // Construção de capacidade não tem retorno em moeda, e forçá-la na mesma frase
    // produziria "não muda nada aqui" — que é verdade aritmética e mentira sobre o que
    // ela é. O Quartel não rende: ele destrava.
    if (opcao.promessa !== null) {
      if (opcao.erguida) linhas.push(opcao.promessa);
      else if (opcao.emObra !== null) linhas.push(`Pronta em ${opcao.emObra}. ${opcao.promessa}`);
      else linhas.push(custoEPrazo, opcao.promessa);
      return linhas.join('\n');
    }

    if (opcao.erguida) {
      linhas.push(`Rendendo +${opcao.ganhoPorTurno} moedas por turno.`);
    } else if (opcao.emObra !== null) {
      linhas.push(`Pronta em ${opcao.emObra}; depois rende +${opcao.ganhoPorTurno} por turno.`);
    } else {
      const paga = Number.isFinite(opcao.turnosParaPagar)
        ? `paga-se em ${Math.ceil(opcao.turnosParaPagar)} turnos`
        : 'não muda nada aqui';
      linhas.push(custoEPrazo, `Depois de pronta: +${opcao.ganhoPorTurno} por turno, ${paga}.`);
    }
    return linhas.join('\n');
  }

  /**
   * Diz o que aquele valor compraria — ou por que não compra nada.
   *
   * Escrever o motivo em vez de só desabilitar o botão é o que ensina a regra sem
   * tutorial: o jogador descobre o teto e o retorno enquanto arrasta.
   */
  private avaliar(): void {
    const vista = this.vista;
    if (!vista?.pode) return;
    const valor = Number(this.campoValor.value);
    this.quantidade.textContent =
      `${valor.toLocaleString('pt-BR')} moedas` +
      (vista.maximo > 0 ? ` · máximo agora: ${vista.maximo.toLocaleString('pt-BR')}` : '');

    if (vista.maximo === 0 || valor === 0) {
      this.previsao.textContent =
        vista.maximo === 0 ? 'O tesouro não permite investir agora.' : 'Escolha um valor.';
      this.previsao.dataset['vale'] = 'nao';
      this.botaoInvestir.textContent = 'Investir na produção';
      this.botaoInvestir.disabled = true;
      removerTooltip(this.previsao);
      return;
    }
    const r = vista.avaliar(valor);
    this.botaoInvestir.disabled = !r.pode;

    if (!r.pode) {
      this.previsao.textContent = r.motivo;
      this.previsao.dataset['vale'] = 'nao';
      removerTooltip(this.previsao);
      return;
    }

    // A conta que decide: quanto entra por turno, quanto entra ao todo, e se isso chega
    // a cobrir o que saiu. Mostrar só a porcentagem esconde justamente o que importa.
    const conta = vista.retorno(valor);
    const porcento = (r.bonus * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
    if (!conta) {
      this.previsao.textContent = `+${porcento}% de produção`;
      return;
    }
    const paga = Number.isFinite(conta.turnosParaPagar)
      ? `paga-se em ${Math.ceil(conta.turnosParaPagar)} turnos`
      : 'nunca se paga';
    // O veredito fica na tela; a conta que o sustenta fica no tooltip. Esconder o
    // "nunca se paga" seria esconder justamente o que impede a armadilha.
    this.previsao.textContent = `+${porcento}% · ${paga}`;
    definirTooltip(this.previsao, {
      titulo: 'Retorno estimado',
      corpo:
        `Mais ${conta.ganhoPorTurno} moedas por turno durante ${vista.duracao} turnos.\n` +
        `${conta.ganhoTotal} moedas ao todo.`,
      tom: conta.vale ? 'custo' : 'perigo',
    });
    this.previsao.dataset['vale'] = conta.vale ? 'sim' : 'nao';
    this.botaoInvestir.textContent = `Investir ${valor.toLocaleString('pt-BR')}`;
  }
}
