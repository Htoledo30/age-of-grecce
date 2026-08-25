/**
 * O bloco de recrutamento: pôr gente em armas nesta província. **Só isso.**
 *
 * Ver e dispensar tropa moravam aqui e saíram para `exercito-ficha.ts`, e a razão é
 * estrutural: aquilo só funcionava enquanto a hoste estivesse na província de origem.
 * Assim que a tropa marchar, comandá-la a partir de um painel chamado
 * "Recrutar" deixa de fazer sentido. **Recrutar é ação da PROVÍNCIA; dispensar é ação da
 * HOSTE** — seleções diferentes, painéis diferentes.
 *
 * Arquivo próprio, e não mais uma seção dentro de `acoes-provincia.ts`, porque é outra
 * mecânica: investir e construir mexem em dinheiro, recrutar mexe em **gente**. Juntar as
 * duas num painel só faria daquele arquivo o lugar que sabe tudo o que se pode fazer com
 * uma província — que é exatamente o crescimento que a regra de arquitetura do projeto
 * proíbe.
 *
 * ⚠️ **Com uma província selecionada, fica na tela mesmo quando não dá pra recrutar e diz
 * o motivo.** Sem seleção, some junto com os demais comandos provinciais: não existe alvo
 * nem decisão a tomar.
 */

import type { Arma } from '@/combate/exercito';
import { NOME_DA_ARMA, PAPEL_DA_ARMA } from './armas';
import { definirTooltip, removerTooltip } from './tooltip';
import { rotularComIcone } from './icones-gregos';

/**
 * Uma arma como o painel a oferece.
 *
 * ⚠️ **As quatro aparecem sempre**, e as trancadas vêm apagadas com o motivo no tooltip. É
 * assim que o jogador descobre que existe cavalaria e o que ela exige — esconder o que ainda
 * não dá para fazer esconderia justamente a decisão de construir.
 */
export interface ArmaParaLeva {
  arma: Arma;
  liberada: boolean;
  /** Por que ela está trancada aqui. Vazio quando liberada. */
  motivo: string;
  custoPorHomem: number;
  /** Teto agora, já com o preço DESTA arma: o mesmo ouro põe mais leves que hoplitas. */
  maximo: number;
  /** Bocas por homem na mesa do reino. Cavalo come por vários. */
  comida: number;
  ataque: number;
  aguento: number;
}

/** O que o bloco precisa saber pra oferecer — ou recusar com motivo — uma leva. */
export type VistaDeRecrutamento =
  | {
      pode: true;
      provincia: { id: string; nome: string };
      /** Habitantes que ainda estão na província. */
      populacao: number;
      /** Quantos habitantes ainda estão disponíveis para uma leva. */
      disponivel: number;
      /** Homens pagos nesta província que ainda não podem marchar. */
      emFormacao: number;
      /** As quatro armas, liberadas ou não, na ordem fixa do jogo. */
      armas: readonly ArmaParaLeva[];
      /**
       * O treino que esta terra carimba na leva. 1 é tropa comum.
       *
       * Mostrado ANTES do clique porque é carimbado no recrutamento e nunca mais muda: quem
       * levanta hoje leva o treino de hoje para o resto da campanha.
       */
      treino: number;
      /** Por homem por turno com a tropa parada em casa. */
      manutencaoPorHomem: number;
      /** Por homem por turno com ela em terra alheia. É o preço de ir à guerra. */
      manutencaoEmCampanha: number;
      avaliar: (
        homens: number,
        arma: Arma,
      ) => { pode: true; ouro: number; homens: number } | { pode: false; motivo: string };
    }
  | { pode: false; motivo: string };

export class Recrutamento {
  private readonly raiz = document.createElement('div');
  private readonly cabecalho = document.createElement('button');
  private readonly titulo = document.createElement('span');
  private readonly indicador = document.createElement('span');
  private readonly corpo = document.createElement('div');
  private readonly alvo = document.createElement('p');
  private readonly seletor = document.createElement('div');
  private readonly botoesDeArma = new Map<Arma, HTMLButtonElement>();
  private readonly campoHomens = document.createElement('input');
  private readonly quantidade = document.createElement('p');
  private readonly atalhos = document.createElement('div');
  private readonly botoesDeAtalho: HTMLButtonElement[] = [];
  private readonly previsao = document.createElement('p');
  private readonly botaoRecrutar = document.createElement('button');
  private vista: VistaDeRecrutamento | null = null;
  /** A arma escolhida. Começa no leve, que toda província levanta. */
  private arma: Arma = 'leve';
  private recolhido = true;
  /** Trocar de província reinicia a escolha; repintar a mesma preserva o arraste. */
  private provinciaDaQuantidade: string | null = null;

  aoRecrutar: (idProvincia: string, homens: number, arma: Arma) => void = () => {};

  constructor(pai: HTMLElement) {
    this.raiz.className = 'recrutamento';
    this.raiz.hidden = true;

    this.cabecalho.className = 'recrutamento__cabecalho';
    this.cabecalho.type = 'button';
    this.cabecalho.setAttribute('aria-controls', 'recrutamento-corpo');
    this.cabecalho.addEventListener('click', () => {
      this.recolhido = !this.recolhido;
      this.atualizarAbertura();
      this.cabecalho.blur();
    });

    this.titulo.className = 'recrutamento__titulo';
    rotularComIcone(this.titulo, 'capacete', 'Recrutar');
    this.indicador.className = 'recrutamento__indicador';
    this.indicador.setAttribute('aria-hidden', 'true');

    this.corpo.className = 'recrutamento__corpo';
    this.corpo.id = 'recrutamento-corpo';
    this.cabecalho.append(this.titulo, this.indicador);

    this.alvo.className = 'recrutamento__alvo';

    this.seletor.className = 'recrutamento__armas';
    this.seletor.setAttribute('role', 'group');
    this.seletor.setAttribute('aria-label', 'Arma da leva');
    for (const arma of ['leve', 'hoplita', 'arqueiro', 'cavalaria'] as const) {
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'recrutamento__arma';
      botao.textContent = NOME_DA_ARMA[arma];
      botao.addEventListener('click', () => {
        this.arma = arma;
        // Trocar de arma troca o preço, e com ele o teto: manter o número anterior ofereceria
        // uma leva que a regra recusaria no clique seguinte.
        this.mostrar(this.vista);
        botao.blur();
      });
      this.botoesDeArma.set(arma, botao);
      this.seletor.appendChild(botao);
    }

    this.campoHomens.className = 'recrutamento__valor';
    this.campoHomens.type = 'range';
    this.campoHomens.min = '0';
    this.campoHomens.step = '1';
    this.campoHomens.value = '0';
    this.campoHomens.setAttribute('aria-label', 'Quantidade de soldados para recrutar');
    definirTooltip(this.campoHomens, {
      titulo: 'Tamanho da leva',
      corpo: 'Limitado pelo ouro e pela reserva civil.',
      tom: 'custo',
    });
    this.campoHomens.addEventListener('input', () => this.avaliar());

    this.quantidade.className = 'recrutamento__quantidade';
    this.quantidade.setAttribute('aria-live', 'polite');

    this.atalhos.className = 'recrutamento__atalhos';
    for (const [rotulo, fracao] of [
      ['25%', 0.25],
      ['50%', 0.5],
      ['75%', 0.75],
      ['Máximo', 1],
    ] as const) {
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'recrutamento__atalho';
      botao.textContent = rotulo;
      botao.addEventListener('click', () => {
        const vista = this.vista;
        if (!vista?.pode) return;
        const maximo = this.escolhida(vista).maximo;
        if (maximo === 0) return;
        this.campoHomens.value = String(Math.max(1, Math.floor(maximo * fracao)));
        this.avaliar();
        botao.blur();
      });
      this.botoesDeAtalho.push(botao);
      this.atalhos.appendChild(botao);
    }

    this.previsao.className = 'recrutamento__previsao';

    this.botaoRecrutar.className = 'botao botao--principal recrutamento__botao';
    this.botaoRecrutar.type = 'button';
    this.botaoRecrutar.textContent = 'Reunir leva';
    this.botaoRecrutar.addEventListener('click', () => {
      const vista = this.vista;
      if (!vista?.pode) return;
      const homens = Number(this.campoHomens.value);
      if (vista.avaliar(homens, this.arma).pode) {
        // Uma nova decisão começa do zero; evita recrutar duas levas enormes por engano.
        this.campoHomens.value = '0';
        this.aoRecrutar(vista.provincia.id, homens, this.arma);
      }
      // `blur` no fim do clique: sem isso o botão fica com foco e a barra de espaço,
      // que passa o turno, dispara um clique sintético nele.
      this.botaoRecrutar.blur();
    });

    this.corpo.append(
      this.alvo,
      this.seletor,
      this.quantidade,
      this.campoHomens,
      this.atalhos,
      this.previsao,
      this.botaoRecrutar,
    );
    this.raiz.append(this.cabecalho, this.corpo);
    this.atualizarAbertura();
    pai.appendChild(this.raiz);
  }

  /** `null` esconde o bloco — fora da campanha ou sem província selecionada. */
  mostrar(vista: VistaDeRecrutamento | null): void {
    this.vista = vista;
    this.raiz.hidden = vista === null;
    if (!vista) {
      this.recolhido = true;
      this.atualizarAbertura();
      return;
    }

    for (const el of [
      this.seletor,
      this.quantidade,
      this.campoHomens,
      this.atalhos,
      this.botaoRecrutar,
    ])
      el.hidden = !vista.pode;

    if (!vista.pode) {
      this.alvo.textContent = vista.motivo;
      removerTooltip(this.alvo);
      this.previsao.textContent = '';
      return;
    }

    this.alvo.textContent =
      `${vista.provincia.nome} · ${numero(vista.populacao)} habitantes · ` +
      `${numero(vista.disponivel)} disponíveis para recrutar` +
      (vista.emFormacao > 0 ? ` · ${numero(vista.emFormacao)} em formação` : '');
    definirTooltip(this.alvo, {
      titulo: 'Reserva civil',
      corpo: `${numero(vista.disponivel)} habitantes podem ser recrutados.`,
    });

    this.pintarArmas(vista);
    if (this.provinciaDaQuantidade !== vista.provincia.id) {
      const trocouDeProvincia = this.provinciaDaQuantidade !== null;
      this.provinciaDaQuantidade = vista.provincia.id;
      this.campoHomens.value = '0';
      if (trocouDeProvincia) {
        this.recolhido = true;
        this.atualizarAbertura();
      }
    }
    const maximo = this.escolhida(vista).maximo;
    this.campoHomens.max = String(maximo);
    this.campoHomens.value = String(Math.min(Number(this.campoHomens.value), maximo));
    this.campoHomens.disabled = maximo === 0;
    for (const botao of this.botoesDeAtalho) botao.disabled = maximo === 0;

    this.avaliar();
  }

  /** A arma escolhida, e o leve se a escolhida não existir nesta terra. */
  private escolhida(vista: Extract<VistaDeRecrutamento, { pode: true }>): ArmaParaLeva {
    const atual = vista.armas.find((a) => a.arma === this.arma);
    if (atual?.liberada) return atual;
    // Cair no leve em vez de manter uma escolha impossível: deixar a seleção numa arma que
    // esta terra não levanta faria a barra oferecer homens que o botão recusa.
    this.arma = 'leve';
    return vista.armas.find((a) => a.arma === 'leve') ?? atual ?? SEM_ARMA;
  }

  /** Acende a escolhida, apaga as trancadas, e diz no tooltip o que falta em cada uma. */
  private pintarArmas(vista: Extract<VistaDeRecrutamento, { pode: true }>): void {
    const escolhida = this.escolhida(vista).arma;
    for (const dados of vista.armas) {
      const botao = this.botoesDeArma.get(dados.arma);
      if (!botao) continue;
      botao.disabled = !dados.liberada;
      botao.setAttribute('aria-pressed', String(dados.arma === escolhida));
      botao.dataset['escolhida'] = dados.arma === escolhida ? 'sim' : 'nao';
      definirTooltip(botao, {
        titulo: NOME_DA_ARMA[dados.arma],
        corpo: dados.liberada
          ? `${PAPEL_DA_ARMA[dados.arma]}\n` +
            `${numero(dados.custoPorHomem)} moedas por homem\n` +
            `ataque ×${dados.ataque} · aguento ×${dados.aguento}` +
            (dados.comida > 1 ? `\ncome por ${dados.comida} homens` : '')
          : `${PAPEL_DA_ARMA[dados.arma]}\n\nTrancada: ${dados.motivo}.`,
        tom: dados.liberada ? 'informacao' : 'bloqueio',
      });
    }
  }

  /** Uma linha fechada por padrão; os detalhes só ocupam espaço quando solicitados. */
  private atualizarAbertura(): void {
    this.corpo.hidden = this.recolhido;
    this.cabecalho.setAttribute('aria-expanded', String(!this.recolhido));
    this.raiz.dataset['aberto'] = this.recolhido ? 'nao' : 'sim';
    this.indicador.textContent = this.recolhido ? '+' : '−';
  }

  /**
   * Diz o que aquela leva custaria — ou por que não pode.
   *
   * Escrever a conta antes do clique é o que torna isto uma decisão: o jogador vê que
   * mil homens custam duas mil moedas AGORA e duzentas TODO TURNO, e é a segunda parcela
   * que decide, não a primeira.
   */
  private avaliar(): void {
    const vista = this.vista;
    if (!vista?.pode) return;
    const homens = Number(this.campoHomens.value);
    const escolhida = this.escolhida(vista);

    this.quantidade.textContent =
      `${numero(homens)} ${NOME_DA_ARMA[escolhida.arma].toLowerCase()}` +
      (vista.treino > 1 ? ` · treino ×${vista.treino.toFixed(2)}` : '') +
      (escolhida.maximo > 0 ? ` · máximo agora: ${numero(escolhida.maximo)}` : '');

    if (escolhida.maximo === 0) {
      this.previsao.textContent =
        vista.disponivel === 0
          ? 'A reserva civil mínima foi alcançada.'
          : `O tesouro não paga nem 1 soldado (${numero(escolhida.custoPorHomem)} moedas).`;
      this.previsao.dataset['pode'] = 'nao';
      this.botaoRecrutar.textContent = 'Reunir leva';
      this.botaoRecrutar.disabled = true;
      removerTooltip(this.previsao);
      return;
    }

    if (homens === 0) {
      this.previsao.textContent = 'Arraste a barra ou escolha uma porcentagem.';
      this.previsao.dataset['pode'] = 'nao';
      this.botaoRecrutar.textContent = 'Reunir leva';
      this.botaoRecrutar.disabled = true;
      removerTooltip(this.previsao);
      return;
    }
    const r = vista.avaliar(homens, escolhida.arma);

    if (!r.pode) {
      this.previsao.textContent = r.motivo;
      this.previsao.dataset['pode'] = 'nao';
      this.botaoRecrutar.disabled = true;
      removerTooltip(this.previsao);
      return;
    }

    const manutencao = Math.round(r.homens * vista.manutencaoPorHomem);
    this.previsao.textContent =
      `${numero(r.homens)} homens · ${numero(r.ouro)} moedas agora · ` +
      `${numero(manutencao)} por turno · prontos no próximo turno`;
    this.previsao.dataset['pode'] = 'sim';
    const emCampanha = Math.round(r.homens * vista.manutencaoEmCampanha);
    definirTooltip(this.previsao, {
      titulo: 'Custo da mobilização',
      corpo:
        `−${numero(r.ouro)} moedas agora\n` +
        `−${numero(manutencao)} por turno em casa\n` +
        `−${numero(emCampanha)} por turno em terra alheia\n` +
        `−${numero(r.homens)} habitantes`,
      tom: 'custo',
    });
    this.botaoRecrutar.textContent =
      `Reunir ${numero(r.homens)} ${NOME_DA_ARMA[escolhida.arma].toLowerCase()}`;
    this.botaoRecrutar.disabled = false;
  }
}

function numero(valor: number): string {
  return valor.toLocaleString('pt-BR');
}

/** Recorte de segurança: nenhuma vista real chega sem o leve na lista. */
const SEM_ARMA: ArmaParaLeva = {
  arma: 'leve',
  liberada: false,
  motivo: 'esta terra não levanta tropa',
  custoPorHomem: 0,
  maximo: 0,
  comida: 1,
  ataque: 1,
  aguento: 1,
};
