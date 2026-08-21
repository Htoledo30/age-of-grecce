/**
 * A economia de uma província: impostos, produção e comércio.
 *
 * Funções puras — nenhum estado mora aqui. É o que deixa a economia inteira ficar sob
 * teste no vitest, e é o que permite mostrar ao jogador de onde vem cada moeda em vez de
 * um número mágico.
 *
 * A regra que organiza tudo, e que veio do documento de design:
 *
 *     renda = impostos da população + produção do produto + comércio
 *
 * **Área não gera dinheiro.** Uma província enorme e montanhosa não é rica por ser
 * grande — a fórmula antiga, que era função só da área, foi removida inteira, sem
 * sobrar como reserva pra ninguém: duas economias diferentes escondidas no mesmo jogo
 * seria pior que uma economia incompleta.
 *
 * O produto e o NÍVEL são fixos. Investir não transforma uma costa de nível 2 numa de
 * nível 5, e não cria recurso que não existe: compra exploração temporária — mais
 * pescadores, mais mineiros, mais jornadas de colheita — por algumas arrecadações.
 *
 * O campo já se chamou `potencial`, e o nome foi trocado porque prometia o que o sistema
 * não faz: potencial soa como coisa que se desenvolve. Nível é grau, é identidade da
 * terra.
 */

import type { Ajustes, Construcoes, Economia } from '@/dados/esquema';

type AjustesEconomia = Ajustes['jogo']['economia'];
type FichaEconomica = Economia['provincias'][string];
type CatalogoDeConstrucoes = Construcoes['construcoes'];

/**
 * O que a província tem de permanente e de temporário no momento do cálculo.
 *
 * Agrupado num objeto em vez de virar mais dois parâmetros soltos: a função já tinha
 * quatro, e ordem de argumento posicional é o tipo de coisa que se troca sem o
 * compilador reclamar quando os dois são do mesmo tipo.
 */
export interface EstadoDaProvincia extends BaseDaProvincia {
  /** Incentivo em curso, se houver. */
  investimento: Investimento | undefined;
}

/**
 * O que a província é AGORA, tirando o incentivo.
 *
 * Separado porque as contas de retorno precisam comparar "com e sem incentivo" sobre a
 * mesma base — e porque acrescentar `populacao` como mais um parâmetro solto ao lado de
 * `valor` daria dois `number` adjacentes que o compilador deixaria trocar em silêncio.
 */
export interface BaseDaProvincia {
  /** Ids de construções já erguidas ali. */
  construcoes: readonly string[];
  /**
   * Habitantes que ainda estão na província.
   *
   * ⚠️ **Não é `ficha.populacao`.** Aquela é a população INICIAL, dado autoral de 700
   * a.C.; esta é a de agora, e ela encolhe quando o poder põe gente em armas. Usar a da
   * ficha aqui faria a cidade continuar pagando imposto por gente que está no campo de
   * batalha.
   */
  populacao: number;
  /**
   * Há inimigo sentado em cima dela.
   *
   * ⚠️ **Sitiada perde produção e comércio, e NÃO perde impostos.** A escolha é
   * deliberada: o campo está tomado e a estrada está cortada, mas a cidade continua
   * cobrando de quem está dentro dela — e continua podendo levantar tropa. Cortar o
   * imposto também deixaria sem saída quem tem uma província só, que é a situação de 120
   * dos 148 poderes: sitiado e sem dinheiro é derrota anunciada, não decisão.
   */
  sitiada: boolean;
}

/** Um investimento em curso numa província. Vive no estado da campanha. */
export interface Investimento {
  /** Fração somada à produção, já com o teto aplicado. 0,25 é 25%. */
  percentual: number;
  /** Quantas arrecadações ainda carregam o bônus. Chega a zero e o incentivo acaba. */
  arrecadacoesRestantes: number;
}

/** As três parcelas da renda, separadas — é assim que a ficha explica o número. */
export interface RendaDaProvincia {
  produto: { id: string; nome: string; valor: number };
  nivel: number;
  populacao: number;
  impostos: number;
  /** Produção já com construção e com o bônus do investimento, se houver. */
  producao: number;
  /** Quanto a produção seria sem incentivo (mas já com construção). */
  producaoSemIncentivo: number;
  comercio: number;
  total: number;
  bonus: number;
  /** O que cada construção erguida ali está somando, por parcela. */
  construcoes: readonly string[];
}

/**
 * Quanto de bônus um investimento compra.
 *
 * A conta é uma **regra de três contra o investimento máximo**: pôr o máximo compra o
 * teto, pôr metade compra metade do teto. É isso que dá sentido ao número na tela —
 * antes a curva era uma raiz solta no ar, e três moedas compravam 1%, o que faz o
 * jogador desconfiar do jogo inteiro.
 *
 * O `expoente` é a forma da curva: 1 é a regra de três pura, e abaixo de 1 as quantias
 * pequenas rendem mais que o proporcional. Fica em `dados/ajustes.json` porque é
 * exatamente o botão a girar se investir pouco parecer inútil demais.
 *
 * O teto garante que nenhuma quantia transforme uma província comum numa potência: o
 * nível da terra continua sendo quem manda.
 */
export function bonusDoInvestimento(valor: number, ajustes: AjustesEconomia): number {
  if (valor <= 0) return 0;
  const fracao = Math.min(1, valor / ajustes.investimento.maximo);
  return ajustes.investimento.teto * fracao ** ajustes.investimento.expoente;
}

/**
 * Calcula a renda de uma província configurada.
 *
 * O comércio sai da produção JÁ INCENTIVADA de propósito: mais azeite prensado é mais
 * azeite pra vender, e é isso que faz o porto valer a pena. Numa província sem saída, o
 * mesmo investimento rende bem menos — que é a decisão que o comércio-base existe pra
 * criar.
 */
/**
 * Quanto as construções erguidas multiplicam uma parcela da renda.
 *
 * Multiplicativo e não aditivo: duas construções na mesma parcela se compõem, e nenhuma
 * delas some porque a outra existe. Hoje só há uma por parcela, mas a regra tem que
 * valer antes de alguém acrescentar a segunda.
 */
function fatorDasConstrucoes(
  construcoes: readonly string[],
  catalogo: CatalogoDeConstrucoes,
  parcela: 'impostos' | 'producao' | 'comercio',
): number {
  let fator = 1;
  for (const id of construcoes) {
    const construcao = catalogo[id];
    if (!construcao) throw new Error(`construção inexistente no catálogo: ${id}`);
    // Construção de capacidade não entra na renda: o Quartel não rende moeda nenhuma, e
    // é justamente por isso que ele não é comparável com a Ágora numa conta só.
    const efeito = construcao.efeito;
    if (efeito.tipo === 'renda' && efeito.parcela === parcela) fator *= efeito.fator;
  }
  return fator;
}

export function rendaDaProvincia(
  ficha: FichaEconomica,
  catalogo: Economia['produtos'],
  construcoes: CatalogoDeConstrucoes,
  ajustes: AjustesEconomia,
  estado: EstadoDaProvincia,
): RendaDaProvincia {
  const produto = catalogo[ficha.produto];
  if (!produto) throw new Error(`produto inexistente no catálogo: ${ficha.produto}`);

  const bonus =
    estado.investimento && estado.investimento.arrecadacoesRestantes > 0
      ? estado.investimento.percentual
      : 0;
  const fator = (parcela: 'impostos' | 'producao' | 'comercio'): number =>
    fatorDasConstrucoes(estado.construcoes, construcoes, parcela);

  // Arredonda cada parcela, e não só o total: é o que faz a soma das três linhas da ficha
  // bater exata com o número da barra de turno, sem sobra de centavo em canto nenhum.
  const impostos = Math.round(estado.populacao * ajustes.impostoPorHabitante * fator('impostos'));

  // A construção entra ANTES do incentivo, e é isso que faz os dois se comporem: quem
  // ergue a Oficina primeiro tem uma produção maior pro incentivo multiplicar depois.
  // Existe uma ordem de operações pro jogador descobrir.
  const producaoSemIncentivo = produto.valor * ficha.nivel * fator('producao');
  // O cerco zera as duas parcelas que dependem do CAMPO e da ESTRADA. O imposto continua:
  // ver `sitiada` em `BaseDaProvincia`.
  const producao = estado.sitiada ? 0 : Math.round(producaoSemIncentivo * (1 + bonus));
  const comercio = estado.sitiada
    ? 0
    : Math.round(producao * ficha.comercioBase * fator('comercio'));

  return {
    produto: { id: ficha.produto, nome: produto.nome, valor: produto.valor },
    nivel: ficha.nivel,
    populacao: estado.populacao,
    impostos,
    producao,
    producaoSemIncentivo,
    comercio,
    total: impostos + producao + comercio,
    bonus,
    construcoes: estado.construcoes,
  };
}

/** Se este investimento se paga, e em quantos turnos. */
export interface RetornoDoInvestimento {
  bonus: number;
  /** Quanto a província passa a render a mais por turno. */
  ganhoPorTurno: number;
  /** O que o incentivo rende ao todo, nas arrecadações que ele dura. */
  ganhoTotal: number;
  /** Turnos até o ganho cobrir o que foi pago. `Infinity` quando não cobre nunca. */
  turnosParaPagar: number;
  /** O incentivo devolve o que custou antes de acabar? */
  vale: boolean;
}

/**
 * Faz a conta que o jogador precisa antes de gastar: **isto se paga?**
 *
 * Compara a renda com e sem o incentivo em vez de estimar por fórmula — assim o número
 * mostrado é o mesmo que o jogo vai somar no tesouro, arredondamento incluído. Sem isso
 * a tela prometeria um ganho e a arrecadação entregaria outro.
 */
export function retornoDoInvestimento(
  ficha: FichaEconomica,
  catalogo: Economia['produtos'],
  construcoes: CatalogoDeConstrucoes,
  ajustes: AjustesEconomia,
  base: BaseDaProvincia,
  valor: number,
): RetornoDoInvestimento {
  const bonus = bonusDoInvestimento(valor, ajustes);
  const arrecadacoes = ajustes.investimento.arrecadacoes;
  const sem = rendaDaProvincia(ficha, catalogo, construcoes, ajustes, {
    ...base,
    investimento: undefined,
  }).total;
  const com = rendaDaProvincia(ficha, catalogo, construcoes, ajustes, {
    ...base,
    investimento: { percentual: bonus, arrecadacoesRestantes: arrecadacoes },
  }).total;

  const ganhoPorTurno = com - sem;
  const ganhoTotal = ganhoPorTurno * arrecadacoes;
  return {
    bonus,
    ganhoPorTurno,
    ganhoTotal,
    turnosParaPagar: ganhoPorTurno > 0 ? valor / ganhoPorTurno : Number.POSITIVE_INFINITY,
    vale: ganhoTotal >= valor,
  };
}

/** O que uma construção acrescenta, e em quantos turnos ela se paga. */
export interface RetornoDaConstrucao {
  custo: number;
  /** Quanto a província passa a render a mais, para sempre. */
  ganhoPorTurno: number;
  /** Turnos até o ganho cobrir o custo. `Infinity` quando a construção não muda nada. */
  turnosParaPagar: number;
}

/**
 * Faz a conta da obra: **quanto ela acrescenta e em quantos turnos devolve o preço.**
 *
 * Diferente do incentivo, não existe "vale ou não vale": construção é permanente, então
 * ela sempre se paga um dia. O que importa é *quando* — uma Ágora que devolve em 40
 * turnos é outra coisa de uma que devolve em 300.
 *
 * Compara duas rendas reais em vez de estimar por fórmula, pelo mesmo motivo do
 * incentivo: o número mostrado tem que ser o que o jogo vai somar no tesouro,
 * arredondamento incluído.
 */
export function retornoDaConstrucao(
  ficha: FichaEconomica,
  catalogo: Economia['produtos'],
  construcoes: CatalogoDeConstrucoes,
  ajustes: AjustesEconomia,
  base: BaseDaProvincia,
  idConstrucao: string,
): RetornoDaConstrucao {
  const construcao = construcoes[idConstrucao];
  if (!construcao) throw new Error(`construção inexistente no catálogo: ${idConstrucao}`);

  // Duas perguntas diferentes, mesma conta: pra construção que ainda não existe, "quanto
  // ela ACRESCENTARIA"; pra que já existe, "quanto ela ESTÁ dando". Sem essa distinção a
  // linha de uma Ágora construída mostrava o efeito de uma segunda Ágora por cima dela.
  const erguidas = base.construcoes;
  const jaErguida = erguidas.includes(idConstrucao);
  const sem = jaErguida ? erguidas.filter((id) => id !== idConstrucao) : erguidas;
  const com = jaErguida ? erguidas : [...erguidas, idConstrucao];

  const antes = rendaDaProvincia(ficha, catalogo, construcoes, ajustes, {
    ...base,
    construcoes: sem,
    investimento: undefined,
  }).total;
  const depois = rendaDaProvincia(ficha, catalogo, construcoes, ajustes, {
    ...base,
    construcoes: com,
    investimento: undefined,
  }).total;

  const ganhoPorTurno = depois - antes;
  return {
    custo: construcao.custo,
    ganhoPorTurno,
    turnosParaPagar:
      ganhoPorTurno > 0 ? construcao.custo / ganhoPorTurno : Number.POSITIVE_INFINITY,
  };
}
