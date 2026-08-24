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

import { definirTooltip, removerTooltip } from './tooltip';
import { rotularComIcone } from './icones-gregos';

/** O que o bloco precisa saber pra oferecer — ou recusar com motivo — uma leva. */
export type VistaDeRecrutamento =
  | {
      pode: true;
      provincia: { id: string; nome: string };
      /** Habitantes que ainda estão na província. */
      populacao: number;
      /** Quantos habitantes ainda estão disponíveis para uma leva. */
      disponivel: number;
      /** Teto real neste instante: população disponível limitada pelo tesouro. */
      maximo: number;
      /** Homens pagos nesta província que ainda não podem marchar. */
      emFormacao: number;
      custoPorHomem: number;
      manutencaoPorHomem: number;
      avaliar: (
        homens: number,
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
  private readonly campoHomens = document.createElement('input');
  private readonly quantidade = document.createElement('p');
  private readonly atalhos = document.createElement('div');
  private readonly botoesDeAtalho: HTMLButtonElement[] = [];
  private readonly previsao = document.createElement('p');
  private readonly botaoRecrutar = document.createElement('button');
  private vista: VistaDeRecrutamento | null = null;
  private recolhido = true;
  /** Trocar de província reinicia a escolha; repintar a mesma preserva o arraste. */
  private provinciaDaQuantidade: string | null = null;

  aoRecrutar: (idProvincia: string, homens: number) => void = () => {};

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
        if (!vista?.pode || vista.maximo === 0) return;
        this.campoHomens.value = String(Math.max(1, Math.floor(vista.maximo * fracao)));
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
      if (vista.avaliar(homens).pode) {
        // Uma nova decisão começa do zero; evita recrutar duas levas enormes por engano.
        this.campoHomens.value = '0';
        this.aoRecrutar(vista.provincia.id, homens);
      }
      // `blur` no fim do clique: sem isso o botão fica com foco e a barra de espaço,
      // que passa o turno, dispara um clique sintético nele.
      this.botaoRecrutar.blur();
    });

    this.corpo.append(
      this.alvo,
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

    for (const el of [this.quantidade, this.campoHomens, this.atalhos, this.botaoRecrutar])
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

    if (this.provinciaDaQuantidade !== vista.provincia.id) {
      const trocouDeProvincia = this.provinciaDaQuantidade !== null;
      this.provinciaDaQuantidade = vista.provincia.id;
      this.campoHomens.value = '0';
      if (trocouDeProvincia) {
        this.recolhido = true;
        this.atualizarAbertura();
      }
    }
    this.campoHomens.max = String(vista.maximo);
    this.campoHomens.value = String(Math.min(Number(this.campoHomens.value), vista.maximo));
    this.campoHomens.disabled = vista.maximo === 0;
    for (const botao of this.botoesDeAtalho) botao.disabled = vista.maximo === 0;

    this.avaliar();
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

    this.quantidade.textContent =
      `${numero(homens)} soldados` +
      (vista.maximo > 0 ? ` · máximo agora: ${numero(vista.maximo)}` : '');

    if (vista.maximo === 0) {
      this.previsao.textContent =
        vista.disponivel === 0
          ? 'A reserva civil mínima foi alcançada.'
          : `O tesouro não paga nem 1 soldado (${numero(vista.custoPorHomem)} moedas).`;
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
    const r = vista.avaliar(homens);

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
    definirTooltip(this.previsao, {
      titulo: 'Custo da mobilização',
      corpo:
        `−${numero(r.ouro)} moedas agora\n` +
        `−${numero(manutencao)} por turno\n` +
        `−${numero(r.homens)} habitantes`,
      tom: 'custo',
    });
    this.botaoRecrutar.textContent = `Reunir ${numero(r.homens)}`;
    this.botaoRecrutar.disabled = false;
  }
}

function numero(valor: number): string {
  return valor.toLocaleString('pt-BR');
}
