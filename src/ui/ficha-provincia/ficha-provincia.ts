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

import type { PerfilDaProvincia } from '@/campanha/perfil-da-provincia';
import type { RendaDaProvincia } from '@/campanha/economia';
import type { CrescimentoPopulacional } from '@/populacao/crescimento';
import { definirTooltip } from '../tooltip';
import {
  campo,
  comSinal,
  faseDoCerco,
  moeda,
  povos,
  romano,
  tooltipDaPopulacao,
  tooltipDoCerco,
  tooltipDoHumor,
} from './textos';
import type { VistaDaProvincia } from './vista';

export type { VistaDaProvincia } from './vista';

export class FichaProvincia {
  /** Nomes das construções, pra ficha não ter que repetir o catálogo. */
  private nomes: Readonly<Record<string, string>> = {};
  private obra: { nome: string; turnosRestantes: number } | null = null;
  private perfil: PerfilDaProvincia | null = null;
  private niveisDasConstrucoes: Readonly<Record<string, number>> = {};
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
    renda: (RendaDaProvincia & { tropaDeOrigem: number }) | null = null,
    obra: { nome: string; turnosRestantes: number } | null = null,
    populacao: (CrescimentoPopulacional & { limitadoPelaAlimentacao: boolean }) | null = null,
    perfil: PerfilDaProvincia | null = null,
    niveisDasConstrucoes: Readonly<Record<string, number>> = {},
  ): void {
    this.obra = obra;
    this.perfil = perfil;
    this.niveisDasConstrucoes = niveisDasConstrucoes;
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
      // O povo da FICHA é quem mora aqui, não quem manda. São coisas diferentes desde
      // que a nacionalidade existe, e é justamente a diferença entre as duas que vai
      // machucar quando Atenas tomar Elêusis. Sem ficha autoral
      // não há composição escrita, e aí a única resposta honesta é o povo do poder.
      ...campo(
        'povo',
        perfil ? povos(perfil) : provincia.poder.povo,
        undefined,
        perfil
          ? {
              titulo: 'Povo local',
              corpo: 'Composição da população desta província.',
            }
          : undefined,
      ),
      ...(perfil && provincia.humor
        ? campo(
            'humor',
            `${perfil.felicidade.valor} · ${perfil.felicidade.faixa}`,
            'ficha__humor',
            tooltipDoHumor(perfil.felicidade.valor, provincia.humor),
          )
        : []),
      ...campo('região', provincia.regiao),
      ...(provincia.cerco
        ? campo(
            'sitiada',
            `por ${provincia.cerco.sitiante} · ${faseDoCerco(provincia.cerco)}`,
            'ficha__cerco',
            tooltipDoCerco(provincia.cerco),
          )
        : []),
      ...campo('milícia', `${moeda(provincia.milicia)} homens`, 'ficha__milicia', {
        titulo: 'Defesa automática',
        corpo: `${moeda(provincia.milicia)} habitantes defendem a província quando ela é atacada.`,
      }),
      ...(renda
        ? campo(
            'população',
            provincia.faixa
              ? `${moeda(renda.populacao)} habitantes · ${provincia.faixa}`
              : `${moeda(renda.populacao)} habitantes`,
            'ficha__populacao',
            {
              ...(populacao
                ? tooltipDaPopulacao(populacao)
                : {
                    titulo: 'População',
                    corpo: `${moeda(renda.populacao)} habitantes.`,
                  }),
            },
          )
        : []),
    );
    this.mostrarEconomia(renda);
    this.raiz.hidden = false;
  }

  private mostrarEconomia(renda: (RendaDaProvincia & { tropaDeOrigem: number }) | null): void {
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
        `${renda.produto.valor * renda.nivel}`,
      tom: 'custo',
    });

    // Uma linha de dinheiro, não três. A decomposição em impostos, produção e comércio
    // mora na janela de Governo — aqui ela era informação de contador competindo com a
    // identidade do território. Clicar numa província e não saber quanto ela vale seria
    // pior que o excesso, então o total fica.
    const renderimento = document.createElement('p');
    renderimento.className = 'ficha__renda';
    const saldo = renda.total - renda.tropaDeOrigem;
    renderimento.dataset['tom'] = saldo < 0 ? 'negativo' : 'positivo';
    renderimento.textContent = `saldo ${comSinal(saldo)} por turno`;
    definirTooltip(renderimento, {
      titulo: saldo < 0 ? 'Província no vermelho' : 'Saldo provincial',
      corpo:
        `+${moeda(renda.impostos)} impostos` +
        (renda.corrupcao > 0 ? ` (corrupção ${Math.round(renda.corrupcao * 100)}%)` : '') +
        `\n+${moeda(renda.producao)} produção` +
        `\n+${moeda(renda.comercio)} comércio` +
        (renda.manutencao > 0 ? `\n−${moeda(renda.manutencao)} construções` : '') +
        (renda.tropaDeOrigem > 0
          ? `\n−${moeda(renda.tropaDeOrigem)} tropas`
          : '') +
        `\n= ${comSinal(saldo)} por turno`,
      tom: saldo < 0 ? 'perigo' : 'informacao',
    });

    const filhos: HTMLElement[] = [titulo, renderimento];
    if (this.perfil) {
      // O secundário é uma LINHA, não uma segunda parcela: ele ainda não entra na renda,
      // porque somar dinheiro antes do comércio existir seria balancear duas
      // vezes. Ele está na tela porque é identidade da terra — Atenas dar grão
      // nível 2 é o que explica a fome dela.
      const segundo = document.createElement('p');
      segundo.className = 'ficha__secundario';
      segundo.textContent = `também dá ${this.perfil.secundario.nome} ${romano(this.perfil.secundario.nivel)}`;
      filhos.push(segundo);

      // A conta da comida mora no Governo. Aqui fica só a identidade da terra: produtos e força.
    }
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
      erguidas.textContent = renda.construcoes
        .map((c) => `${this.nomeDaConstrucao(c)} ${romano(this.niveisDasConstrucoes[c] ?? 1)}`)
        .join(' · ');
      filhos.push(erguidas);
    }
    this.economia.replaceChildren(...filhos);
  }
}
