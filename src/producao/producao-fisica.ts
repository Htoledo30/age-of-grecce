/**
 * A produção física: o que a terra tira do chão a cada ano, em unidades.
 *
 * É a primeira metade da economia real. Até aqui, "produção" era uma parcela de MOEDA na
 * renda da província (`src/campanha/economia.ts`): a terra virava dinheiro direto, sem
 * nunca existir como coisa. Isto aqui é o contrário — grão, gado, azeite e prata passam a
 * ser quantidades que se acumulam no estoque da própria província, e só muito depois
 * viram dinheiro, comida ou pedra de construção.
 *
 * ⚠️ **As duas camadas convivem por enquanto, e é de propósito.** A renda monetária antiga
 * continua funcionando enquanto os patches de dinheiro e mercado não chegam; esta camada
 * nasce ao lado dela. Não somar uma na outra é o que impede o mesmo trigo de ser contado
 * duas vezes.
 *
 * A fórmula é a da decisão #42, sem invenção nenhuma:
 *
 * > `produção = potencial natural × população produtiva × modificadores`
 *
 * - **potencial natural** é o `nivel` do recurso (1 a 5), e ele é FIXO (#41): investir paga
 *   mais gente para explorar a terra, nunca muda o que a terra tem;
 *   é por isso que ele entra aqui como um número lido do dado e nunca escrito de volta;
 * - **população produtiva** é uma fatia implícita da população atual (#43): não existe
 *   alocação de trabalhadores, e não vai existir. Menos gente é menos produção, e é assim
 *   que recrutar, morrer e ser saqueado chegam à economia sem nenhuma regra nova;
 * - **modificadores** ainda não existem. Ver a nota em `producaoDeUmRecurso`.
 *
 * ⚠️ **Nenhum número de balanceamento mora aqui.** Os dois vêm de `dados/ajustes.json`
 * (`economia.producao`) porque o patch 0.0.4 vai mexer neles ao ligar o consumo de
 * alimento — e mexer em balanceamento não pode significar reescrever regra.
 */

/** Os dois números de escala, como vêm de `ajustes.json`. */
export interface AjustesDeProducao {
  /** Fatia da população que trabalha a terra. Implícita, nunca escolhida pelo jogador. */
  fracaoProdutiva: number;
  /** Quanto cada produtor tira por ponto de potencial natural, por turno. */
  porProdutorPorNivel: number;
}

/** O que uma província tira de UM recurso por turno. */
export interface RecursoProduzido {
  /** Id do produto, como em `dados/economia.json`. */
  produto: string;
  /** O potencial natural da terra para este produto. Fixo, vem do dado. */
  nivel: number;
  /** Unidades por turno. Inteiro, nunca negativo. */
  unidades: number;
  /** O principal da província, ou o secundário mais fraco. */
  principal: boolean;
}

/** A parte da ficha autoral que a produção precisa conhecer. */
export interface TerraProdutiva {
  produto: string;
  nivel: number;
  secundario: { produto: string; nivel: number };
}

/**
 * Quantos habitantes trabalham a terra.
 *
 * Derivado e nunca guardado, pela mesma razão que a milícia: um campo `produtores` no
 * estado seria um segundo manancial humano, e o dia em que ele discordasse da população
 * seria impossível de encontrar.
 */
export function produtoresEm(populacao: number, ajustes: AjustesDeProducao): number {
  if (populacao <= 0) return 0;
  return Math.floor(populacao * ajustes.fracaoProdutiva);
}

/**
 * Quanto sai de um recurso, dado o potencial da terra e a gente que trabalha nela.
 *
 * ⚠️ **Sem modificadores ainda, e isso é escolha e não esquecimento.** Os candidatos
 * óbvios não servem hoje: a Oficina multiplica a parcela de MOEDA chamada "produção", e
 * usá-la aqui contaria o mesmo bônus duas vezes enquanto as duas economias convivem; o
 * incentivo temporário é dinheiro comprando exploração, e já aparece na renda antiga. Os
 * dois são reescritos nos patches próprios — construções no `0.0.11`, dinheiro no `0.0.6` —
 * e é lá que eles voltam a esta conta, com o efeito escrito no catálogo em vez de deduzido
 * aqui.
 *
 * `floor` no fim: unidade física é coisa inteira. Terra fraca com pouca gente devolve zero,
 * e zero é a resposta honesta — não existe meio boi.
 */
export function producaoDeUmRecurso(
  populacao: number,
  nivel: number,
  ajustes: AjustesDeProducao,
): number {
  if (nivel <= 0) return 0;
  return Math.max(0, Math.floor(produtoresEm(populacao, ajustes) * nivel * ajustes.porProdutorPorNivel));
}

/**
 * O que esta província produz por turno, principal e secundário.
 *
 * ⚠️ **Os dois entram, e pela MESMA regra.** São a mesma categoria de dado — potencial
 * natural da terra —, e ativar só o principal deixaria metade da ficha decorativa. O
 * secundário sai menor sozinho, porque o nível dele é menor: não existe multiplicador de
 * "ser secundário" em lugar nenhum, e não deve existir.
 *
 * A ordem é estável — principal primeiro — porque a interface desenha esta lista e o
 * relatório de turno a percorre; ordem por acaso viraria linha dançando na tela.
 */
export function producaoFisicaDe(
  terra: TerraProdutiva,
  populacao: number,
  ajustes: AjustesDeProducao,
): RecursoProduzido[] {
  return [
    {
      produto: terra.produto,
      nivel: terra.nivel,
      unidades: producaoDeUmRecurso(populacao, terra.nivel, ajustes),
      principal: true,
    },
    {
      produto: terra.secundario.produto,
      nivel: terra.secundario.nivel,
      unidades: producaoDeUmRecurso(populacao, terra.secundario.nivel, ajustes),
      principal: false,
    },
  ];
}

/**
 * Soma a colheita ao que a província já tinha guardado. **Muta o estoque recebido.**
 *
 * Fica junto do cálculo porque as duas coisas são o mesmo fato — colher é encher o
 * celeiro — e separá-las convidaria alguém a calcular sem creditar, ou a creditar duas
 * vezes na mesma virada.
 *
 * ⚠️ **O estoque é da PROVÍNCIA** (#49). Não existe depósito do poder: o que está em
 * Elêusis está em Elêusis, e é por isso que tomar a cidade vai capturar o que ela guardava
 * e sitiá-la vai doer. Um total do reino é uma vista somada, nunca um lugar.
 */
export function creditarNoEstoque(
  estoque: Record<string, number>,
  colheita: readonly RecursoProduzido[],
): void {
  for (const recurso of colheita) {
    if (recurso.unidades <= 0) continue;
    estoque[recurso.produto] = (estoque[recurso.produto] ?? 0) + recurso.unidades;
  }
}
