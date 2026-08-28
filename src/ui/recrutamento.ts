/**
 * A JANELA DE RECRUTAMENTO: pôr gente em armas nesta província. **Só isso.**
 *
 * Era o terceiro bloco de uma coluna que já não cabia na tela — recolhido por padrão,
 * embaixo de oito construções, e por isso a única parte do jogo que exigia ROLAR para
 * encontrar. Levantar exército não é rodapé de nada: é a metade militar do jogo inteiro, e
 * agora tem porta própria no painel da província.
 *
 * ⚠️ **Ver e dispensar tropa NÃO moram aqui** — estão em `exercito-ficha.ts`, e a razão é
 * estrutural: aquilo só funciona enquanto a hoste estiver na província de origem. Assim que
 * ela marchar, comandá-la de um painel chamado "Recrutar" deixa de fazer sentido. **Recrutar
 * é ação da PROVÍNCIA; dispensar é ação da HOSTE** — seleções diferentes, janelas diferentes.
 *
 * As quatro armas aparecem SEMPRE, e as trancadas vêm apagadas com o motivo escrito. É assim
 * que o jogador descobre que existe cavalaria e o que ela exige: esconder o que ainda não dá
 * para fazer esconderia justamente a decisão de construir.
 */

import type { Arma } from '@/combate/exercito';
import { NOME_DA_ARMA, PAPEL_DA_ARMA } from './armas';
import { Janela } from './janela';
import { definirTooltip, removerTooltip } from './tooltip';

/** Uma arma como a janela a oferece. */
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

/** O que a janela precisa saber pra oferecer — ou recusar com motivo — uma leva. */
export type VistaDeRecrutamento =
  | {
      pode: true;
      provincia: { id: string; nome: string };
      /** A região a que ela pertence — a âncora da janela. */
      regiao: string;
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
  private readonly janela: Janela;
  private readonly recusa = document.createElement('p');
  private readonly conteudo = document.createElement('div');
  private readonly resumo = document.createElement('div');
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
  /** Trocar de província reinicia a escolha; repintar a mesma preserva o arraste. */
  private provinciaDaQuantidade: string | null = null;

  aoRecrutar: (idProvincia: string, homens: number, arma: Arma) => void = () => {};

  constructor(pai: HTMLElement) {
    this.janela = new Janela(pai, 'Recrutar', 'capacete', '620px');

    this.recusa.className = 'recrutamento__recusa';
    this.recusa.hidden = true;
    this.conteudo.className = 'recrutamento__conteudo';
    this.resumo.className = 'recrutamento__resumo';

    this.seletor.className = 'recrutamento__armas';
    this.seletor.setAttribute('role', 'group');
    this.seletor.setAttribute('aria-label', 'Arma da leva');
    for (const arma of ['leve', 'hoplita', 'arqueiro', 'cavalaria'] as const) {
      this.seletor.appendChild(this.cartaoDeArma(arma));
    }

    const escolha = document.createElement('div');
    escolha.className = 'recrutamento__escolha';

    this.quantidade.className = 'recrutamento__quantidade';
    this.quantidade.setAttribute('aria-live', 'polite');

    this.campoHomens.className = 'recrutamento__valor';
    this.campoHomens.type = 'range';
    this.campoHomens.min = '0';
    this.campoHomens.step = '1';
    this.campoHomens.value = '0';
    this.campoHomens.setAttribute('aria-label', 'Quantidade de soldados para recrutar');
    this.campoHomens.addEventListener('input', () => this.avaliar());

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

    escolha.append(this.quantidade, this.campoHomens, this.atalhos, this.previsao, this.botaoRecrutar);
    this.conteudo.append(this.resumo, this.seletor, escolha);
    this.janela.corpo.append(this.recusa, this.conteudo);
  }

  get visivel(): boolean {
    return this.janela.visivel;
  }

  set aoAlternar(ouvinte: (aberta: boolean) => void) {
    this.janela.aoAlternar = ouvinte;
  }

  abrir(): void {
    this.janela.abrir();
  }

  fechar(): void {
    this.janela.fechar();
  }

  /**
   * Um cartão por arma: **o nome e os quatro números.** Nada de prosa.
   *
   * ⚠️ Cada cartão trazia uma frase explicando o papel da arma — *"A parede: encaixa o
   * choque e não quebra"* — e escolher entre quatro botões virava ler quatro parágrafos.
   * Custo, ataque, aguento e comida respondem a mesma pergunta de relance, e o papel
   * escrito continua no tooltip para quem quiser.
   */
  private cartaoDeArma(arma: Arma): HTMLButtonElement {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'recrutamento__arma';
    const nome = document.createElement('span');
    nome.className = 'recrutamento__arma-nome';
    nome.textContent = NOME_DA_ARMA[arma];
    const numeros = document.createElement('dl');
    numeros.className = 'recrutamento__arma-numeros';
    const trava = document.createElement('span');
    trava.className = 'recrutamento__arma-trava';
    botao.append(nome, numeros, trava);
    botao.addEventListener('click', () => {
      this.arma = arma;
      // Trocar de arma troca o preço, e com ele o teto: manter o número anterior ofereceria
      // uma leva que a regra recusaria no clique seguinte.
      this.mostrar(this.vista);
      botao.blur();
    });
    this.botoesDeArma.set(arma, botao);
    return botao;
  }

  /** `null` fecha a janela — a província deixou de existir para o jogador. */
  mostrar(vista: VistaDeRecrutamento | null): void {
    this.vista = vista;
    if (!vista) {
      this.fechar();
      return;
    }

    if (!vista.pode) {
      this.recusa.hidden = false;
      this.conteudo.hidden = true;
      this.recusa.textContent = vista.motivo;
      this.janela.dizer('');
      return;
    }
    this.recusa.hidden = true;
    this.conteudo.hidden = false;
    // Os habitantes vão para a LEGENDA, e não para uma faixa própria: é o número que dá
    // contexto à janela inteira, e uma faixa só para ele custava 55 px de altura.
    this.janela.dizer(
      `${vista.provincia.nome} · ${vista.regiao} · ${numero(vista.populacao)} habitantes`,
    );

    // ⚠️ **Só a população.** "Podem pegar em armas" saiu: é um teto que o jogador descobre
    // arrastando a barra, e quando ele acaba de vez o recrutamento fecha e diz por quê.
    this.resumo.replaceChildren(
      ...(vista.emFormacao > 0 ? [dado('em formação', numero(vista.emFormacao))] : []),
      ...(vista.treino > 1 ? [dado('treino', `×${vista.treino.toFixed(2)}`)] : []),
    );

    this.pintarArmas(vista);
    if (this.provinciaDaQuantidade !== vista.provincia.id) {
      this.provinciaDaQuantidade = vista.provincia.id;
      this.campoHomens.value = '0';
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

  /** Acende a escolhida, apaga as trancadas, e diz em cada uma o que ela é e o que falta. */
  private pintarArmas(vista: Extract<VistaDeRecrutamento, { pode: true }>): void {
    const escolhida = this.escolhida(vista).arma;
    for (const dados of vista.armas) {
      const botao = this.botoesDeArma.get(dados.arma);
      if (!botao) continue;
      botao.disabled = !dados.liberada;
      botao.setAttribute('aria-pressed', String(dados.arma === escolhida));
      botao.dataset['escolhida'] = dados.arma === escolhida ? 'sim' : 'nao';
      const numeros = botao.querySelector('.recrutamento__arma-numeros');
      if (numeros) {
        numeros.replaceChildren(
          stat('custo', numero(dados.custoPorHomem)),
          stat('ataque', `×${dados.ataque}`),
          stat('aguento', `×${dados.aguento}`),
          stat('comida', `×${dados.comida}`),
        );
      }
      const trava = botao.querySelector('.recrutamento__arma-trava');
      if (trava) trava.textContent = dados.liberada ? '' : dados.motivo;
      definirTooltip(botao, {
        titulo: NOME_DA_ARMA[dados.arma],
        corpo: PAPEL_DA_ARMA[dados.arma],
        tom: dados.liberada ? 'informacao' : 'bloqueio',
      });
    }
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
      (escolhida.maximo > 0 ? ` · máximo agora: ${numero(escolhida.maximo)}` : '');

    if (escolhida.maximo === 0) {
      this.previsao.textContent =
        vista.disponivel === 0
          ? 'A reserva civil mínima foi alcançada: não há mais quem levantar aqui.'
          : `O tesouro não paga nem 1 soldado (${numero(escolhida.custoPorHomem)} moedas).`;
      this.previsao.dataset['pode'] = 'nao';
      this.botaoRecrutar.textContent = 'Reunir leva';
      this.botaoRecrutar.disabled = true;
      removerTooltip(this.previsao);
      return;
    }

    if (homens === 0) {
      // Nada escrito: a barra está na tela e ninguém precisa ser ensinado a arrastá-la.
      this.previsao.textContent = '';
      this.previsao.dataset['pode'] = 'espera';
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
    const emCampanha = Math.round(r.homens * vista.manutencaoEmCampanha);
    this.previsao.textContent =
      `${numero(r.ouro)} moedas agora · ${numero(manutencao)} por turno em casa · ` +
      `${numero(emCampanha)} por turno em terra alheia · prontos no próximo turno`;
    this.previsao.dataset['pode'] = 'sim';
    definirTooltip(this.previsao, {
      titulo: 'Custo da mobilização',
      corpo:
        `−${numero(r.ouro)} moedas agora\n` +
        `−${numero(manutencao)} por turno em casa\n` +
        `−${numero(emCampanha)} por turno em terra alheia\n` +
        `−${numero(r.homens)} habitantes`,
      tom: 'custo',
    });
    this.botaoRecrutar.textContent = `Reunir ${numero(r.homens)} ${NOME_DA_ARMA[
      escolhida.arma
    ].toLowerCase()}`;
    this.botaoRecrutar.disabled = false;
  }
}

function numero(valor: number): string {
  return valor.toLocaleString('pt-BR');
}

/** Um número da arma: rótulo micro à esquerda, valor à direita. */
function stat(rotulo: string, valor: string): DocumentFragment {
  const fragmento = document.createDocumentFragment();
  const dt = document.createElement('dt');
  dt.textContent = rotulo;
  const dd = document.createElement('dd');
  dd.textContent = valor;
  fragmento.append(dt, dd);
  return fragmento;
}

function dado(rotulo: string, valor: string): HTMLElement {
  const caixa = document.createElement('div');
  caixa.className = 'recrutamento__dado';
  const nome = document.createElement('span');
  nome.className = 'recrutamento__dado-rotulo';
  nome.textContent = rotulo;
  const forte = document.createElement('strong');
  forte.textContent = valor;
  caixa.append(nome, forte);
  return caixa;
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
