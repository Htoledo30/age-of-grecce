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
 *
 * ⚠️ **Só duas perguntas: quantos homens, e quanto custa.** Henrique: *"o jogador só quer
 * saber quanto ele vai gastar pra contratar e quanto soldados ele tá contratando, só isso"*.
 * Saíram da janela a folha em casa e em campanha, o treino, a leva em formação e os números
 * de combate de cada arma — ataque, aguento e comida ficam no tooltip do cartão. A comida só
 * aparece quando falta: é o único aviso que muda a decisão.
 */

import type { Arma } from '@/combate/exercito';
import { NOME_DA_ARMA, PAPEL_DA_ARMA } from './armas';
import { imagemDaConstrucao } from './imagens-de-construcoes';
import { Janela } from './janela';
import { moedaAteniense } from './moeda';
import { definirTooltip } from './tooltip';

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
      /** O treino que esta terra carimba na leva. 1 é tropa comum. */
      treino: number;
      /**
       * Quantos homens A MAIS a despensa do reino ainda alimenta.
       *
       * ⚠️ **É o único aviso que ficou na janela**, e só aparece quando a leva passa dele: com
       * a comida curta, 5% da tropa morre na virada seguinte.
       */
      homensQueAComidaSustenta: number;
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
  private readonly seletor = document.createElement('div');
  private readonly botoesDeArma = new Map<Arma, HTMLButtonElement>();
  private readonly campoHomens = document.createElement('input');
  private readonly quantidade = document.createElement('p');
  private readonly contador = document.createElement('strong');
  private readonly unidade = document.createElement('span');
  private readonly atalhos = document.createElement('div');
  private readonly botoesDeAtalho: HTMLButtonElement[] = [];
  private readonly custo = document.createElement('p');
  private readonly custoValor = document.createElement('strong');
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

    this.seletor.className = 'recrutamento__armas';
    this.seletor.setAttribute('role', 'group');
    this.seletor.setAttribute('aria-label', 'Arma da leva');
    for (const arma of ['leve', 'hoplita', 'arqueiro', 'cavalaria'] as const) {
      this.seletor.appendChild(this.cartaoDeArma(arma));
    }

    // O NÚMERO DE HOMENS é o centro da janela, grande: é a primeira das duas perguntas.
    this.quantidade.className = 'recrutamento__quantidade';
    this.quantidade.setAttribute('aria-live', 'polite');
    this.contador.className = 'recrutamento__contador';
    this.unidade.className = 'recrutamento__unidade';
    this.quantidade.append(this.contador, this.unidade);

    this.campoHomens.className = 'recrutamento__barra';
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

    // O CUSTO é a segunda pergunta: a dracma e o número em ouro, e nada mais.
    this.custo.className = 'recrutamento__custo';
    const rotuloDoCusto = document.createElement('span');
    rotuloDoCusto.className = 'recrutamento__custo-rotulo';
    rotuloDoCusto.textContent = 'Custo';
    this.custoValor.className = 'recrutamento__custo-valor';
    this.custo.append(rotuloDoCusto, this.custoValor);

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

    const escolha = document.createElement('div');
    escolha.className = 'recrutamento__escolha';
    escolha.append(this.quantidade, this.campoHomens, this.atalhos);
    const fecho = document.createElement('div');
    fecho.className = 'recrutamento__fecho';
    fecho.append(this.custo, this.botaoRecrutar);
    this.conteudo.append(this.seletor, escolha, fecho, this.previsao);
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
   * Um cartão por arma: **a arte da casa que a forma, o nome e o preço por homem.**
   *
   * A vinheta é a do prédio que libera a arma — Quartel, Armaria, Acampamento, Treinamento —,
   * a mesma do catálogo de Construções: quem vê o cartão apagado já reconhece o que falta.
   */
  private cartaoDeArma(arma: Arma): HTMLButtonElement {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'recrutamento__arma';
    botao.dataset['arma'] = arma;
    const origem = imagemDaConstrucao(ARTE_DA_ARMA[arma]);
    if (origem) {
      const arte = document.createElement('img');
      arte.className = 'recrutamento__arma-arte';
      arte.src = origem;
      arte.alt = '';
      arte.draggable = false;
      arte.decoding = 'async';
      botao.appendChild(arte);
    }
    const nome = document.createElement('span');
    nome.className = 'recrutamento__arma-nome';
    nome.textContent = NOME_DA_ARMA[arma];
    const preco = document.createElement('span');
    preco.className = 'recrutamento__arma-preco';
    const trava = document.createElement('span');
    trava.className = 'recrutamento__arma-trava';
    botao.append(nome, preco, trava);
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
    this.janela.dizer(
      `${vista.provincia.nome} · ${vista.regiao} · ${numero(vista.populacao)} habitantes`,
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

  /** Acende a escolhida, apaga as trancadas, e diz em cada uma o preço ou o que falta. */
  private pintarArmas(vista: Extract<VistaDeRecrutamento, { pode: true }>): void {
    const escolhida = this.escolhida(vista).arma;
    for (const dados of vista.armas) {
      const botao = this.botoesDeArma.get(dados.arma);
      if (!botao) continue;
      botao.disabled = !dados.liberada;
      botao.setAttribute('aria-pressed', String(dados.arma === escolhida));
      botao.dataset['escolhida'] = dados.arma === escolhida ? 'sim' : 'nao';
      const preco = botao.querySelector('.recrutamento__arma-preco');
      if (preco) preco.replaceChildren(moedaAteniense(), ` ${numero(dados.custoPorHomem)}`);
      const trava = botao.querySelector('.recrutamento__arma-trava');
      if (trava) trava.textContent = dados.liberada ? '' : dados.motivo;
      // O papel e os números de combate ficam aqui, para quem quiser: a janela não os impõe.
      definirTooltip(botao, {
        titulo: NOME_DA_ARMA[dados.arma],
        corpo:
          `${PAPEL_DA_ARMA[dados.arma]}\n` +
          `ataque ×${dados.ataque} · aguento ×${dados.aguento} · comida ×${dados.comida}`,
        tom: dados.liberada ? 'informacao' : 'bloqueio',
      });
    }
  }

  /** Atualiza as duas respostas — quantos e quanto — e o botão. */
  private avaliar(): void {
    const vista = this.vista;
    if (!vista?.pode) return;
    const homens = Number(this.campoHomens.value);
    const escolhida = this.escolhida(vista);

    this.contador.textContent = numero(homens);
    this.unidade.textContent = NOME_DA_ARMA[escolhida.arma].toLowerCase();
    // ⚠️ **Não é uma trava.** Passar da despensa continua sendo decisão do jogador, como é para
    // a IA: o número fica vermelho, uma linha curta diz quantos a comida alimenta, e o botão
    // segue liberado. Cavalo come por vários, então o que cabe depende da arma.
    const cabemNaDespensa = Math.floor(vista.homensQueAComidaSustenta / escolhida.comida);
    const passaDaDespensa = homens > cabemNaDespensa;
    this.quantidade.dataset['fome'] = passaDaDespensa ? 'sim' : 'nao';

    const semCusto = (): void => {
      this.custoValor.replaceChildren(moedaAteniense(), ' 0');
      this.custo.dataset['vazio'] = 'sim';
    };

    if (escolhida.maximo === 0) {
      semCusto();
      this.previsao.textContent =
        vista.disponivel === 0
          ? 'Ninguém mais para levantar aqui.'
          : 'O tesouro não paga nem 1 soldado.';
      this.previsao.dataset['pode'] = 'nao';
      this.botaoRecrutar.textContent = 'Reunir leva';
      this.botaoRecrutar.disabled = true;
      return;
    }

    if (homens === 0) {
      semCusto();
      this.previsao.textContent = '';
      this.previsao.dataset['pode'] = 'espera';
      this.botaoRecrutar.textContent = 'Reunir leva';
      this.botaoRecrutar.disabled = true;
      return;
    }
    const r = vista.avaliar(homens, escolhida.arma);

    if (!r.pode) {
      semCusto();
      this.previsao.textContent = r.motivo;
      this.previsao.dataset['pode'] = 'nao';
      this.botaoRecrutar.disabled = true;
      return;
    }

    this.custoValor.replaceChildren(moedaAteniense(), ` ${numero(r.ouro)}`);
    this.custo.dataset['vazio'] = 'nao';
    this.previsao.textContent = !passaDaDespensa
      ? ''
      : cabemNaDespensa === 0
        ? 'Sem comida para esta leva.'
        : `Comida para ${numero(cabemNaDespensa)}.`;
    this.previsao.dataset['pode'] = passaDaDespensa ? 'fome' : 'sim';
    this.botaoRecrutar.textContent = `Reunir ${numero(r.homens)} ${NOME_DA_ARMA[
      escolhida.arma
    ].toLowerCase()}`;
    this.botaoRecrutar.disabled = false;
  }
}

/** A casa que forma cada arma — e é a arte dela que o cartão mostra. */
const ARTE_DA_ARMA: Readonly<Record<Arma, string>> = {
  leve: 'quartel',
  hoplita: 'armaria',
  arqueiro: 'acampamento-de-arqueiro',
  cavalaria: 'treinamento-de-cavaleiros',
};

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
