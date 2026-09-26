/**
 * O PAINEL DA PROVÍNCIA: quem ela é, quanto vale, e em que estado está.
 *
 * Reformado por inteiro depois de Henrique jogar. O que havia era uma coluna de três caixas
 * empilhadas — ficha, ações, recrutamento — que somavam oitocentos pixels de altura e
 * **rolavam**. Rolagem em painel de decisão é a coisa que nenhum jogo do gênero faz: o EU4
 * pendura as construções numa gaveta lateral, o Total War as manda para um navegador
 * próprio, e o painel principal cabe inteiro na tela porque é ele que se lê a cada clique.
 *
 * A ordem de leitura, de cima para baixo, é a hierarquia:
 *
 * 1. **quem é** — nome, reino, região e o que a terra dá, mais os selos do que a torna
 *    especial;
 * 2. **o que está errado** — cerco, revolta, obra: o urgente antes do rotineiro;
 * 3. **quanto vale** — as quatro medidas, em número grande (ver `medidas.ts`).
 *
 * ⚠️ **As construções ERGUIDAS não aparecem aqui.** Estavam logo abaixo dos produtos, com o
 * mesmo desenho de pastilha, e as duas listas se confundiam — "Azeite IV · Grãos II" e
 * "Fazenda I" liam-se como a mesma coisa, sendo uma o que a terra é e outra o que se
 * construiu nela. O contador do portão ("1/4") diz quantas existem; a janela diz quais.
 *
 * O que se FAZ com ela mora em `acoes-provincia.ts`, logo abaixo, dentro da mesma moldura.
 * São dois arquivos porque são dois assuntos — ler e mandar — e um só arquivo de província
 * viraria o lugar que sabe tudo, que é justamente o que a arquitetura do projeto proíbe.
 */

import { definirTooltip } from '../tooltip';
import { criarEstandarte } from '../estandartes';
import { medidasDa } from './medidas';
import { faseDoCerco, romano, tooltipDoCerco, tooltipDoHumor } from './textos';
import type { VistaDaProvincia } from './vista';

export type { VistaDaProvincia } from './vista';

export class FichaProvincia {
  private readonly raiz = document.createElement('div');
  private readonly topo = document.createElement('header');
  private readonly nome = document.createElement('h2');
  private readonly bandeira = document.createElement('p');
  private readonly estandarte = document.createElement('span');
  private readonly reino = document.createElement('span');
  private readonly regiao = document.createElement('span');
  private readonly producao = document.createElement('p');
  private readonly selos = document.createElement('div');
  private readonly avisos = document.createElement('div');
  private readonly medidas = document.createElement('div');

  constructor(pai: HTMLElement) {
    this.raiz.className = 'ficha';
    this.raiz.hidden = true;

    this.nome.className = 'ficha__nome';
    this.estandarte.className = 'ficha__estandarte';
    this.reino.className = 'ficha__reino';
    this.regiao.className = 'ficha__regiao';
    // ⚠️ **A BANDEIRA vem ACIMA do nome, e é a primeira coisa da ficha.** Henrique clicando:
    // *"ainda está muito confuso — qual o nome da província, da região e do reino? o reino tem
    // que ser o mais importante"*. E ele tinha razão pelo pior motivo: "ATENAS · MEGÁRIDA" saía
    // numa linha só, mesma fonte, mesmo tamanho, mesma cor, separados por um ponto. Os dois
    // nomes eram indistinguíveis, e o mais importante dos três era o mais fraco da tela.
    //
    // Agora são três tratamentos que não se confundem: o reino numa faixa própria com a tinta
    // dele cheia, a região na outra ponta da MESMA faixa e em tom apagado, e o nome da
    // província grande embaixo. Ninguém precisa de rótulo dizendo qual é qual.
    this.bandeira.className = 'ficha__bandeira';
    this.bandeira.append(this.estandarte, this.reino, this.regiao);
    this.producao.className = 'ficha__producao';
    this.selos.className = 'ficha__selos';

    const identidade = document.createElement('div');
    identidade.append(this.nome, this.producao);
    this.topo.className = 'ficha__topo';
    this.topo.append(identidade, this.selos);

    this.avisos.className = 'ficha__avisos';
    this.medidas.className = 'ficha__caixa-de-medidas';

    this.raiz.append(this.bandeira, this.topo, this.avisos, this.medidas);
    pai.appendChild(this.raiz);
  }

  /** `null` esconde o painel — é o que acontece quando o clique cai no mar. */
  mostrar(vista: VistaDaProvincia | null): void {
    if (!vista) {
      this.raiz.hidden = true;
      return;
    }
    this.raiz.hidden = false;
    this.raiz.dataset['minha'] = vista.minha ? 'sim' : 'nao';
    this.raiz.dataset['mar'] = vista.mar ? 'sim' : 'nao';

    this.nome.textContent = vista.nome;
    // ⚠️ **A zona marítima é nome e natureza, e nada mais.** Sem dono não há tinta de reino;
    // sem povo, sem renda e sem obra não há medida nenhuma a mostrar. O painel encolhe até o
    // que existe em vez de exibir quatro zeros — quatro zeros não são informação, são ruído.
    this.estandarte.hidden = vista.mar;
    this.estandarte.replaceChildren(
      ...(vista.mar ? [] : [criarEstandarte(vista.poder, 'provincia')]),
    );
    this.reino.textContent = vista.mar ? 'Zona marítima' : vista.poder.nome;
    this.regiao.textContent = vista.mar ? '' : vista.regiao;
    this.desenharProducao(vista);
    this.selos.replaceChildren(...this.selosDe(vista));
    this.avisos.replaceChildren(...this.avisosDe(vista));
    this.medidas.replaceChildren(...(vista.mar ? [] : [medidasDa(vista)]));
  }

  /**
   * O que a terra dá, na terceira linha da identidade: *Azeite IV · Grãos II*.
   *
   * Aqui, e não num bloco próprio, porque é isto que ela É — como o reino e a região. O grau
   * vem em algarismo romano porque é GRAU, não progresso: a terra é assim e continua assim.
   */
  private desenharProducao(vista: VistaDaProvincia): void {
    const e = vista.economia;
    if (!e) {
      this.producao.textContent = '';
      this.producao.hidden = true;
      return;
    }
    this.producao.hidden = false;
    const partes = [`${e.produto.nome} ${romano(e.produto.nivel)}`];
    if (e.secundario) partes.push(`${e.secundario.nome} ${romano(e.secundario.nivel)}`);
    this.producao.textContent = partes.join(' · ');
    definirTooltip(this.producao, {
      titulo: 'O que a terra dá',
      corpo: e.secundario
        ? `${e.produto.nome} rende moeda; ${e.secundario.nome} alimenta o reino.`
        : `${e.produto.nome} rende moeda todo turno.`,
    });
  }

  /**
   * Os selos: o que esta província tem de especial, em uma palavra cada.
   *
   * ⚠️ **Capital era uma frase de rodapé** — "0/4 slots ocupados · níveis I–III · capital do
   * reino" — grudada no fim de uma linha de contabilidade. A sede do reino é a coisa mais
   * importante que uma província pode ser, e agora é a primeira que se vê.
   */
  private selosDe(vista: VistaDaProvincia): HTMLElement[] {
    const selos: HTMLElement[] = [];
    if (vista.capital) selos.push(selo('capital', 'ouro'));
    if (vista.cerco) selos.push(selo('sitiada', 'perigo'));
    if (vista.bloqueio) selos.push(selo('bloqueada', 'perigo'));
    if (vista.humor && vista.humor.posicao <= 0.25) selos.push(selo('revolta', 'perigo'));
    return selos;
  }

  /**
   * As linhas de alarme, com a causa e o prazo escritos.
   *
   * Só aparecem quando há o que dizer: painel de estratégia não guarda espaço vazio para
   * uma emergência que talvez nunca aconteça.
   */
  private avisosDe(vista: VistaDaProvincia): HTMLElement[] {
    const linhas: HTMLElement[] = [];
    if (vista.cerco) {
      const aviso = alarme(
        'perigo',
        `Sitiada por ${vista.cerco.sitiante} · ${faseDoCerco(vista.cerco)}`,
      );
      definirTooltip(aviso, tooltipDoCerco(vista.cerco));
      linhas.push(aviso);
    }
    if (vista.bloqueio) {
      const aviso = alarme('perigo', `Cais bloqueado por ${vista.bloqueio.por}`);
      definirTooltip(aviso, {
        titulo: 'Bloqueio naval',
        corpo:
          'Frota inimiga na água ao lado. O Porto para de ligar por mar e de levar ' +
          'mercadoria: terra que só chegava à capital embarcando fica cortada, e os acordos ' +
          'de comércio por água param de render. Embarcar continua livre — sair é atacar.',
      });
      linhas.push(aviso);
    }
    if (vista.economia?.revoltosa) {
      linhas.push(alarme('perigo', 'Em revolta: nenhum imposto entra.'));
    }
    if (vista.faseCritica > 0) {
      const t = vista.faseCritica;
      const aviso = alarme('atencao', `Recém-conquistada · ${t} ${t === 1 ? 'turno' : 'turnos'}`);
      definirTooltip(aviso, {
        titulo: 'Fase crítica',
        corpo: 'Até o fim do prazo, este povo se levanta já insatisfeito. Depois, só no desespero.',
      });
      linhas.push(aviso);
    }
    const aviso = this.avisoDoHumor(vista);
    if (aviso) linhas.push(aviso);
    if (vista.economia?.cortada) {
      linhas.push(alarme('atencao', 'Rota até a capital cortada.'));
    }
    if (vista.obra) {
      const t = vista.obra.turnosRestantes;
      linhas.push(
        alarme('obra', `${vista.obra.nome} em obra · ${t} ${t === 1 ? 'turno' : 'turnos'}`),
      );
    }
    return linhas;
  }

  /**
   * POR QUE este povo está assim — a frase que faltava, e o pedido literal de Henrique.
   *
   * ⚠️ **A conta já existia inteira e vivia escondida atrás do mouse parado.** O painel
   * mostrava `12 ↓` e as parcelas só apareciam no tooltip da medida; ele resumiu o problema
   * assim: *"quero olhar para uma província e entender 'esse povo está revoltado porque eu
   * conquistei recentemente, aumentei impostos e existe uma guerra acontecendo' — e não apenas
   * humor = 27"*. A informação estava pronta; faltava pô-la na tela.
   *
   * Mora nos AVISOS, e não na nota da medida, por uma razão de espaço: a coluna da medida tem
   * 95 px, e "de outro povo (85%)" sozinho já quebra em três linhas ali, desalinhando as
   * outras três medidas. O aviso ocupa a largura da ficha e é justamente a faixa do "o que
   * está errado".
   *
   * Só as TRÊS maiores, e só as negativas: a lista inteira é o tooltip, que continua aqui.
   * Quem lê um alarme quer a causa principal, não o balancete.
   */
  private avisoDoHumor(vista: VistaDaProvincia): HTMLElement | null {
    const h = vista.humor;
    if (!h) return null;
    // Duas situações merecem alarme: a terra que JÁ está no fundo, e a que está caindo PARA a
    // faixa em que o povo pega em armas. ⚠️ **Cair de 62 para 50 não é alarme** — era, e
    // Henrique chamou de inútil: o número e a seta já estão na medida, e a conta no tooltip.
    const caindo = h.alvo < h.valor && h.alvoEmRisco;
    const ruim = h.posicao <= 0.25;
    if (!caindo && !ruim) return null;
    const causas = h.parcelas
      .filter((p) => p.pontos < 0)
      .slice()
      .sort((a, b) => a.pontos - b.pontos)
      .slice(0, 3)
      .map((p) => p.rotulo);
    if (causas.length === 0) return null;
    const aviso = alarme(
      ruim ? 'perigo' : 'atencao',
      `${caindo ? `Humor caindo para ${h.alvo}` : `Humor em ${h.valor}`}: ${causas.join(', ')}.`,
    );
    definirTooltip(aviso, tooltipDoHumor(h.valor, h));
    return aviso;
  }
}

function selo(texto: string, tom: string): HTMLElement {
  const marca = document.createElement('span');
  marca.className = 'ficha__selo';
  marca.dataset['tom'] = tom;
  marca.textContent = texto;
  return marca;
}

function alarme(tom: string, texto: string): HTMLElement {
  const aviso = document.createElement('p');
  aviso.className = 'ficha__aviso';
  aviso.dataset['tom'] = tom;
  aviso.textContent = texto;
  return aviso;
}
