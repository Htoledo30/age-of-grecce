/**
 * Ficha da província selecionada, no canto inferior esquerdo.
 *
 * É informação, não controle — e por isso não mora no painel de opções nem abre e fecha.
 * Fica no canto, aparece quando há uma província escolhida e some quando não há. Sem
 * clique nenhum: o jogador escolhe no mapa e lê aqui.
 *
 * A economia aparece **decomposta**, e não como um total só. Impostos, produção e
 * comércio separados é o que deixa o jogador entender por que Sunião rende mais que
 * Maratona tendo menos gente e menos terra — e é o que faz o investimento ser uma
 * decisão em vez de um chute.
 */

import type { RendaDaProvincia } from '@/campanha/economia';
import type { CrescimentoPopulacional } from '@/populacao/crescimento';
import { definirTooltip } from './tooltip';

/**
 * A província como a ficha precisa vê-la.
 *
 * Composta pelo `main` a partir do atlas (nome, região) e da campanha (dono de AGORA).
 * A camada de mapa não monta isto: ela sabe onde cada província está desenhada, não de
 * quem ela é hoje — e quando montava, montava com o dono assado e mentia depois da
 * primeira conquista.
 */
export interface VistaDaProvincia {
  nome: string;
  regiao: string;
  poder: { nome: string; povo: string; cor: string };
  /**
   * Quantos milicianos a província põe em pé se alguém vier.
   *
   * Fica na tela porque decide: é o número que diz se o vizinho consegue tomar isto, e é
   * o que a Muralha compra. Zero onde não há população — e a ficha diz isso do mesmo jeito
   * que já diz "economia não configurada".
   */
  milicia: number;
  /**
   * Quem está sitiando esta província, se alguém estiver.
   *
   * Fica na ficha porque é a metade da mecânica que acontece COM o jogador: a renda dele
   * cai e ele precisa saber por quê. Sem isto o número mingua na barra e a causa fica
   * invisível.
   */
  cerco: { sitiante: string } | null;
}

export class FichaProvincia {
  /** Nomes das construções, pra ficha não ter que repetir o catálogo. */
  private nomes: Readonly<Record<string, string>> = {};
  private obra: { nome: string; turnosRestantes: number } | null = null;
  private readonly raiz = document.createElement('div');
  private readonly nome = document.createElement('h2');
  private readonly dono = document.createElement('p');
  private readonly tinta = document.createElement('span');
  private readonly nomeDoPoder = document.createElement('span');
  private readonly lista = document.createElement('dl');
  private readonly economia = document.createElement('div');

  constructor(pai: HTMLElement) {
    this.raiz.className = 'ficha';
    this.raiz.hidden = true;

    this.nome.className = 'ficha__nome';

    this.tinta.className = 'ficha__tinta';
    this.dono.className = 'ficha__dono';
    this.dono.append(this.tinta, this.nomeDoPoder);

    this.lista.className = 'ficha__lista';
    this.economia.className = 'ficha__economia';

    this.raiz.append(this.nome, this.dono, this.lista, this.economia);
    pai.appendChild(this.raiz);
  }

  /** Ensina os nomes das construções uma vez, na montagem da campanha. */
  usarCatalogo(nomes: Readonly<Record<string, string>>): void {
    this.nomes = nomes;
  }

  private nomeDaConstrucao(id: string): string {
    return this.nomes[id] ?? id;
  }

  /** `null` esconde a ficha — é o que acontece quando o clique cai no mar. */
  mostrar(
    provincia: VistaDaProvincia | null,
    renda: RendaDaProvincia | null = null,
    obra: { nome: string; turnosRestantes: number } | null = null,
    populacao: CrescimentoPopulacional | null = null,
  ): void {
    this.obra = obra;
    if (!provincia) {
      this.raiz.hidden = true;
      return;
    }

    this.nome.textContent = provincia.nome;
    this.tinta.style.background = provincia.poder.cor;
    this.nomeDoPoder.textContent = provincia.poder.nome;

    // Área e número de fronteiras saíram: são verdadeiros e não servem pra decidir nada.
    // A ficha mostra o que muda uma escolha; o resto é ruído competindo por atenção.
    //
    // População FICA, e pela mesma régua: ela decide. É a base do imposto, e portanto é
    // ela que diz se a Ágora vale — a construção existe pra multiplicar imposto, e sem
    // esse número na tela o jogador não tinha como fazer a conta que a escolha exige.
    // Ficou escondida até agora, o que tornava a decisão da Ágora um chute informado.
    this.lista.replaceChildren(
      ...campo('povo', provincia.poder.povo),
      ...campo('região', provincia.regiao),
      ...(provincia.cerco
        ? campo(
            'sitiada',
            `por ${provincia.cerco.sitiante}`,
            'ficha__cerco',
            {
              titulo:
                'Há exército inimigo acampado na divisa. Enquanto ele ficar, esta província ' +
                'não produz nem comercia. O cerco não toma a cidade por si — o imposto ' +
                'continua e ela ainda pode levantar tropa para expulsá-lo.',
            },
          )
        : []),
      ...campo('milícia', `${moeda(provincia.milicia)} homens`, 'ficha__milicia', {
        titulo:
          'Quem defende esta província sem ter sido recrutado. Sai da população, então ' +
          'recrutar aqui esvazia a muralha — e milícia morta na defesa não volta.',
      }),
      ...(renda
        ? campo('população', `${moeda(renda.populacao)} habitantes`, 'ficha__populacao', {
            titulo:
              `É a base do imposto: ${moeda(renda.populacao)} habitantes rendem ` +
              `${moeda(renda.impostos)} por turno.`,
          })
        : []),
      ...(populacao
        ? campo('crescimento', `+${moeda(populacao.crescimento)} por turno`, 'ficha__crescimento', {
            titulo:

              (populacao.fatorConstrucoes > 1
                ? ` · construções ×${populacao.fatorConstrucoes.toLocaleString('pt-BR')}`
                : ''),
          })
        : []),
    );
    this.mostrarEconomia(renda);
    this.raiz.hidden = false;
  }

  private mostrarEconomia(renda: RendaDaProvincia | null): void {
    if (!renda) {
      // Dizer com todas as letras é melhor que inventar um número. Só a Ática tem
      // economia autoral por enquanto, e o mapa não deve fingir o contrário.
      const aviso = document.createElement('p');
      aviso.className = 'ficha__sem-economia';
      aviso.textContent = 'Economia ainda não configurada.';
      this.economia.replaceChildren(aviso);
      return;
    }

    // "Produção: Azeite IV" — produto e grau numa linha só.
    //
    // Já foi "potencial", com cinco losangos. O nome saiu porque prometia o que o jogo
    // não faz: potencial soa como coisa que se desenvolve, e o jogador fica procurando
    // como subir. Algarismo romano lê como GRAU, que é o que isso é — a terra é assim e
    // continua assim. O que se compra é exploração temporária, e isso aparece embaixo.
    // A conta virou tooltip: quem quer conferir passa o mouse, quem já entendeu não
    // precisa reler a fórmula toda vez que clica numa província.
    const titulo = document.createElement('h3');
    titulo.className = 'ficha__subtitulo';
    titulo.textContent = `Produção: ${renda.produto.nome} ${romano(renda.nivel)}`;
    definirTooltip(titulo, {
      titulo: 'Produção local',
      corpo:
        `${renda.produto.valor} moedas por nível × nível ${renda.nivel} = ` +
        `${Math.round(renda.producaoSemIncentivo)}` +
        (renda.bonus > 0 ? `, com +${Math.round(renda.bonus * 100)}% de incentivo` : ''),
      tom: 'custo',
    });

    // Uma linha de dinheiro, não três. A decomposição em impostos, produção e comércio
    // mora na janela de Governo — aqui ela era informação de contador competindo com a
    // identidade do território. Clicar numa província e não saber quanto ela vale seria
    // pior que o excesso, então o total fica.
    const renderimento = document.createElement('p');
    renderimento.className = 'ficha__renda';
    renderimento.textContent = `rende ${moeda(renda.total)} por turno`;
    definirTooltip(renderimento, {
      titulo: 'Renda provincial',
      corpo:
        `${moeda(renda.impostos)} de impostos\n` +
        `${moeda(renda.producao)} de produção\n` +
        `${moeda(renda.comercio)} de comércio` +
        (renda.bonus > 0 ? `\nIncentivo de +${Math.round(renda.bonus * 100)}%` : ''),
      tom: 'custo',
    });

    const filhos: HTMLElement[] = [titulo, renderimento];
    if (this.obra) {
      const emObra = document.createElement('p');
      emObra.className = 'ficha__obra';
      emObra.textContent =
        `${this.obra.nome} em obra · ${this.obra.turnosRestantes} ` +
        `${this.obra.turnosRestantes === 1 ? 'turno' : 'turnos'}`;
      filhos.push(emObra);
    }
    if (renda.construcoes.length > 0) {
      // A ficha é leitura: diz O QUE existe. Erguer é no bloco de ações, acima dela.
      const erguidas = document.createElement('p');
      erguidas.className = 'ficha__construcoes';
      erguidas.textContent = renda.construcoes.map((c) => this.nomeDaConstrucao(c)).join(' · ');
      filhos.push(erguidas);
    }
    this.economia.replaceChildren(...filhos);
  }
}

/** Grau de 1 a 5 em algarismo romano. A tabela é o mapa inteiro: não existe nível 6. */
function romano(nivel: number): string {
  return ['I', 'II', 'III', 'IV', 'V'][nivel - 1] ?? String(nivel);
}

function moeda(valor: number): string {
  return valor.toLocaleString('pt-BR');
}

function campo(
  rotulo: string,
  valor: string,
  classe?: string,
  extra?: { titulo: string },
): [HTMLElement, HTMLElement] {
  const dt = document.createElement('dt');
  dt.textContent = rotulo;
  const dd = document.createElement('dd');
  dd.textContent = valor;
  if (classe) {
    dt.className = classe;
    dd.className = classe;
  }
  if (extra) {
    const conteudo = { titulo: rotulo, corpo: extra.titulo };
    definirTooltip(dt, conteudo);
    definirTooltip(dd, conteudo);
  }
  return [dt, dd];
}
