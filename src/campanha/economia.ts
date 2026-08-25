/**
 * A economia de uma província: impostos, produção e comércio.
 *
 * Funções puras — nenhum estado mora aqui. É o que deixa a economia inteira ficar sob
 * teste no vitest, e é o que permite mostrar ao jogador de onde vem cada moeda em vez de
 * um número mágico.
 *
 * A regra que organiza tudo, e que veio do documento de design:
 *
 *     renda = impostos da população + produção do produto + comércio − manutenção
 *
 * **Área não gera dinheiro.** Uma província enorme e montanhosa não é rica por ser
 * grande — a fórmula antiga, que era função só da área, foi removida inteira, sem
 * sobrar como reserva pra ninguém: duas economias diferentes escondidas no mesmo jogo
 * seria pior que uma economia incompleta.
 *
 * O produto e o NÍVEL são fixos. O que o jogador gira é o NÍVEL DE IMPOSTO da província
 * — receita trocada por pressão social, como no GDD — e o que ele ergue são construções.
 * (O antigo decreto de investimento saiu: era redundante com as construções e de retorno
 * ilegível; a alavanca clara de "quero mais dinheiro desta terra AGORA" é o imposto.)
 *
 * O campo já se chamou `potencial`, e o nome foi trocado porque prometia o que o sistema
 * não faz: potencial soa como coisa que se desenvolve. Nível é grau, é identidade da
 * terra.
 */

import type { Ajustes, Construcoes, Economia } from '@/dados/esquema';
import { custoDaObra, manutencaoDaObra } from './custo-de-obra';

type AjustesEconomia = Ajustes['jogo']['economia'];
type FichaEconomica = Economia['provincias'][string];
type CatalogoDeConstrucoes = Construcoes['construcoes'];

/** Os três níveis de imposto de uma província. `normal` é o padrão de toda terra. */
export type NivelDeImposto = 'baixo' | 'normal' | 'alto';

/**
 * O que a província é AGORA, no momento do cálculo.
 *
 * Agrupado num objeto em vez de parâmetros soltos: ordem de argumento posicional é o
 * tipo de coisa que se troca sem o compilador reclamar quando vários são `number`.
 */
export interface BaseDaProvincia {
  /** Construções já erguidas ali, com nível I–III. */
  construcoes: Readonly<Record<string, number>>;
  /**
   * O multiplicador de preço e de folha das obras desta terra. 1 é a de referência.
   *
   * Vem calculado de fora, de `campanha/custo-de-obra.ts`, e sai da população AUTORAL —
   * ver o cabeçalho de lá para por que não é a viva.
   */
  escalaDeObra: number;
  /**
   * Fração do imposto perdida entre o campo e o tesouro. 0 é administração perfeita.
   *
   * Vem calculada de fora — tamanho da população e distância da capital são assunto da
   * campanha, que conhece o mapa e a capital; esta função só aplica a fração ao imposto.
   */
  corrupcao: number;
  /**
   * Quanto o nível de imposto escolhido multiplica a arrecadação. 1 é o normal.
   *
   * Vem resolvido de fora (nível → fator via `ajustes.json`): esta função aplica o
   * número e não conhece a tabela.
   */
  fatorDeImposto: number;
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
   * O povo está na faixa revoltosa: ninguém coleta imposto de quem está pronto pra
   * queimar o coletor. Produção e comércio continuam — a vida segue, o Estado é que não
   * entra — e a manutenção também: os prédios não deixam de custar.
   */
  revoltosa: boolean;
  /**
   * Há inimigo sentado em cima dela.
   *
   * ⚠️ **Sitiada perde produção e comércio, e NÃO perde impostos.** A escolha é
   * deliberada: o campo está tomado e a estrada está cortada, mas a cidade continua
   * cobrando de quem está dentro dela — e continua podendo levantar tropa. Cortar o
   * imposto também deixaria sem saída quem tem uma província só, que é a situação de 111
   * dos 139 poderes: sitiado e sem dinheiro é derrota anunciada, não decisão.
   */
  sitiada: boolean;
}

/** As parcelas da renda, separadas — é assim que a ficha explica o número. */
export interface RendaDaProvincia {
  produto: { id: string; nome: string; valor: number };
  nivel: number;
  populacao: number;
  impostos: number;
  /** A fração de corrupção que o imposto desta província pagou. */
  corrupcao: number;
  /** O fator do nível de imposto que o jogador escolheu. 1 é o normal. */
  fatorDeImposto: number;
  /** O povo recusou o coletor: os impostos acima são zero por revolta, não por conta. */
  revoltosa: boolean;
  /** Produção já com o fator das construções. */
  producao: number;
  comercio: number;
  /**
   * O que as construções erguidas custam por turno para ficar de pé.
   *
   * É o que faz o `total` ser LÍQUIDO e permite província no vermelho: um Mercado numa
   * terra pobre pode custar mais do que rende, e "não construir" vira decisão. Cobra
   * inclusive sob cerco — a muralha não deixa de precisar de reparo porque há um exército
   * na porta, e é mais um jeito de o cerco apertar quem está dentro.
   */
  manutencao: number;
  /** Impostos + produção + comércio − manutenção. Pode ser negativo, e isso é o aviso. */
  total: number;
  /** O que cada construção erguida ali está somando, por parcela. */
  construcoes: readonly string[];
}

/**
 * Quanto as construções erguidas multiplicam uma parcela da renda.
 *
 * Multiplicativo e não aditivo: duas construções na mesma parcela se compõem, e nenhuma
 * delas some porque a outra existe. Hoje só há uma por parcela, mas a regra tem que
 * valer antes de alguém acrescentar a segunda.
 */
function fatorDasConstrucoes(
  construcoes: Readonly<Record<string, number>>,
  catalogo: CatalogoDeConstrucoes,
  parcela: 'impostos' | 'producao' | 'comercio',
): number {
  let fator = 1;
  for (const [id, nivel] of Object.entries(construcoes)) {
    const construcao = catalogo[id];
    if (!construcao) throw new Error(`construção inexistente no catálogo: ${id}`);
    const efeito = construcao.efeito;
    if (efeito.tipo === 'renda' && efeito.parcela === parcela) {
      fator *= efeito.fatores[Math.max(0, Math.min(2, nivel - 1))] ?? 1;
    }
  }
  return fator;
}

export function rendaDaProvincia(
  ficha: FichaEconomica,
  catalogo: Economia['produtos'],
  construcoes: CatalogoDeConstrucoes,
  ajustes: AjustesEconomia,
  estado: BaseDaProvincia,
): RendaDaProvincia {
  const produto = catalogo[ficha.produto];
  if (!produto) throw new Error(`produto inexistente no catálogo: ${ficha.produto}`);

  const fator = (parcela: 'impostos' | 'producao' | 'comercio'): number =>
    fatorDasConstrucoes(estado.construcoes, construcoes, parcela);

  // Arredonda cada parcela, e não só o total: é o que faz a soma das linhas da ficha
  // bater exata com o número da barra de turno, sem sobra de centavo em canto nenhum.
  // A fórmula do GDD, inteira e numa multiplicação só: população × taxa × (1−corrupção)
  // × nível de imposto × construções. O povo revoltoso não paga nada.
  // ⚠️ **A corrupção come as TRÊS parcelas, não só o imposto.**
  //
  // Ela nasceu como freio do imposto, e enquanto o imposto era metade da renda isso quase
  // dava no mesmo. Deixou de dar quando a economia passou a ser sobre a TERRA: com o
  // imposto valendo um quinto da renda, "perder 30% do imposto" virou perder 6% do total,
  // e a corrupção deixou de ser freio de coisa nenhuma — junto com ela, a Ágora e a
  // Estrada, que existem para aliviá-la, viraram prejuízo.
  //
  // E é o que a palavra sempre quis dizer: corrupção é **o que se perde entre a província e
  // o tesouro**. O que se perde no caminho não pergunta se aquela moeda veio de imposto, de
  // lavoura ou de porto.
  //
  // Aplicada parcela a parcela, e não sobre o total: é o que faz a soma das três linhas da
  // ficha bater exata com a barra de turno, sem centavo sobrando em canto nenhum.
  const chega = (bruto: number): number => Math.round(bruto * (1 - estado.corrupcao));

  const impostos = estado.revoltosa
    ? 0
    : chega(
        estado.populacao *
          ajustes.impostoPorHabitante *
          estado.fatorDeImposto *
          fator('impostos'),
      );

  // O cerco zera as duas parcelas que dependem do CAMPO e da ESTRADA. O imposto continua:
  // ver `sitiada` em `BaseDaProvincia`.
  //
  // A produção soma os DOIS produtos da terra: o principal inteiro e o secundário com
  // peso. Toda província tem os dois escritos com nível, e por muito tempo o segundo não
  // rendia nada — metade da autoria econômica ficava fora da economia.
  const secundario = catalogo[ficha.secundario.produto];
  if (!secundario) {
    throw new Error(`produto secundário inexistente no catálogo: ${ficha.secundario.produto}`);
  }
  const producao = estado.sitiada
    ? 0
    : chega(
        (produto.valor * ficha.nivel +
          secundario.valor * ficha.secundario.nivel * ajustes.pesoDoSecundario) *
          fator('producao'),
      );
  // ⚠️ **O comércio NÃO é uma fatia da produção.** Era `producao × comercioBase`, e isso
  // fazia o entreposto depender da própria lavoura: Corinto, com o maior `comercioBase` do
  // mapa, tirava um quinto da renda do comércio. Posição não se planta — `comercioBase`
  // multiplica uma escala própria, e uma vila de porto pode viver do mar.
  const comercio = estado.sitiada
    ? 0
    : chega(ficha.comercioBase * ajustes.escalaDeComercio * fator('comercio'));

  // A folha das construções: soma da manutenção de cada nível erguido. Não depende de
  // cerco nem de imposto — é compromisso permanente, e é isso que a torna um ralo.
  let manutencao = 0;
  for (const [id, nivel] of Object.entries(estado.construcoes)) {
    const construcao = construcoes[id];
    if (!construcao) throw new Error(`construção inexistente no catálogo: ${id}`);
    manutencao += manutencaoDaObra(construcao, nivel, estado.escalaDeObra);
  }

  return {
    produto: { id: ficha.produto, nome: produto.nome, valor: produto.valor },
    nivel: ficha.nivel,
    populacao: estado.populacao,
    impostos,
    corrupcao: estado.corrupcao,
    fatorDeImposto: estado.fatorDeImposto,
    revoltosa: estado.revoltosa,
    producao,
    comercio,
    manutencao,
    total: impostos + producao + comercio - manutencao,
    construcoes: Object.keys(estado.construcoes),
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
 * Construção é permanente, então ela sempre se paga um dia — o que importa é *quando*:
 * uma Ágora que devolve em 40 turnos é outra coisa de uma que devolve em 300. Compara
 * duas rendas reais em vez de estimar por fórmula: o número mostrado tem que ser o que o
 * jogo vai somar no tesouro, arredondamento incluído.
 */
export function retornoDaConstrucao(
  ficha: FichaEconomica,
  catalogo: Economia['produtos'],
  construcoes: CatalogoDeConstrucoes,
  ajustes: AjustesEconomia,
  base: BaseDaProvincia,
  idConstrucao: string,
  /**
   * A corrupção que a província teria COM a obra de pé.
   *
   * Vem de fora porque a corrupção depende de população e de saltos até a capital, que
   * esta função não conhece. Sem isto, uma obra que só alivia corrupção — Ágora, Estrada —
   * apareceria como puro prejuízo: a manutenção entrava na conta e o benefício não.
   */
  corrupcaoComAObra = base.corrupcao,
): RetornoDaConstrucao {
  const construcao = construcoes[idConstrucao];
  if (!construcao) throw new Error(`construção inexistente no catálogo: ${idConstrucao}`);

  const erguidas = base.construcoes;
  const nivelAtual = erguidas[idConstrucao] ?? 0;
  const nivelAlvo = Math.min(3, nivelAtual + 1);

  const antes = rendaDaProvincia(ficha, catalogo, construcoes, ajustes, base).total;
  const depois = rendaDaProvincia(ficha, catalogo, construcoes, ajustes, {
    ...base,
    corrupcao: corrupcaoComAObra,
    construcoes: { ...erguidas, [idConstrucao]: nivelAlvo },
  }).total;

  const ganhoPorTurno = depois - antes;
  return {
    custo: custoDaObra(construcao, nivelAlvo, base.escalaDeObra),
    ganhoPorTurno,
    turnosParaPagar:
      ganhoPorTurno > 0
        ? custoDaObra(construcao, nivelAlvo, base.escalaDeObra) / ganhoPorTurno
        : Number.POSITIVE_INFINITY,
  };
}
