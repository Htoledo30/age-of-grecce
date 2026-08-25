/**
 * O que uma MISTURA de armas vale em campo.
 *
 * A batalha não pergunta "quantos homens"; pergunta "quantos homens de quê". Este arquivo é
 * a tradução entre as duas perguntas: entra uma lista de contingentes, sai o que aquele
 * amontoado entrega e aguenta — e é só isso que `resolverBatalha` precisa saber.
 *
 * ⚠️ **Fica separado da batalha de propósito.** `batalha.ts` responde *como uma batalha se
 * desenrola*; este arquivo responde *quanto vale quem entrou nela*. Juntos, os dois assuntos
 * ficariam presos: mexer no triângulo de counters obrigaria a reler o laço de rounds, e
 * qualquer ajuste de letalidade obrigaria a reler a tabela de armas.
 *
 * ## Por que tudo vira DOIS números por lado
 *
 * As baixas são proporcionais entre os contingentes — quem perde 30% perde 30% de cada
 * grupo. Então a composição **não muda durante a batalha**, e ataque e aguento POR HOMEM são
 * constantes do primeiro round ao último. Calcular uma vez e multiplicar pelos vivos dá
 * exatamente o mesmo resultado que resomar a lista a cada round, e mantém o laço legível.
 *
 * ⚠️ **Baixa proporcional é escolha, não acaso.** Matar primeiro a arma que está sendo
 * contada seria mais "realista" e faria a composição derreter no meio do choque — e aí
 * ninguém conseguiria olhar dois exércitos e prever nada. Aqui, o que você montou é o que
 * luta até o fim.
 */

import type { Arma, Contingente } from './exercito';
import { ARMAS } from './exercito';
import type { Ajustes } from '@/dados/esquema';

type AjustesDaBatalha = Ajustes['jogo']['combate']['batalha'];

/** O mínimo que um grupo precisa ter para valer alguma coisa em campo. */
export type GrupoEmCampo = Pick<Contingente, 'arma' | 'qualidade' | 'homens'>;

/**
 * O triângulo: cada arma diz QUAL ela bate.
 *
 * Hoplita quebra cavalaria (parede de lanças), cavalaria atropela arqueiro (chega antes do
 * terceiro disparo), arqueiro fura hoplita (o escudo não cobre o dia inteiro). O leve não
 * bate ninguém e não é batido por ninguém: ele é a régua, e uma régua não tem vantagem.
 *
 * ⚠️ **Não existe "sofre de".** A vantagem é do lado que TEM a arma certa; o outro não leva
 * penalidade nenhuma. Contar as duas pontas dobraria o efeito e transformaria o counter suave
 * numa dominância — cem arqueiros derrubando trezentos hoplitas, que é o que este jogo
 * decidiu não ser.
 */
const BATE: Readonly<Record<Arma, Arma | null>> = {
  leve: null,
  hoplita: 'cavalaria',
  arqueiro: 'hoplita',
  cavalaria: 'arqueiro',
};

/** O que um lado entrega e aguenta, já com o inimigo à frente levado em conta. */
export interface ValorEmCampo {
  homens: number;
  /**
   * Dano que cada homem deste lado entrega, medido em leves. 1 é um exército só de leves.
   *
   * ⚠️ Já inclui o treino e o counter contra ESTE inimigo: o mesmo exército vale coisas
   * diferentes contra composições diferentes, e é isso que faz olhar o inimigo importar.
   */
  ataque: number;
  /** Quanto cada homem deste lado divide o dano que recebe. 1 é um exército só de leves. */
  aguento: number;
  /** Multiplicador da perseguição QUANDO ESTE LADO VENCE. É o papel da cavalaria. */
  perseguicao: number;
}

/** Um lado só de leves comuns — a milícia, e qualquer número solto de homens. */
export function leves(homens: number): ValorEmCampo {
  return { homens, ataque: 1, aguento: 1, perseguicao: 1 };
}

/**
 * O que esta mistura vale contra AQUELA.
 *
 * ⚠️ **A qualidade multiplica o ataque e NÃO o aguento.** Homem treinado acerta melhor;
 * deixá-lo também absorver melhor faria o Quartel virar multiplicador quadrático — o
 * nível III renderia 1,69 e a ficha continuaria dizendo 1,3. O número que o jogador lê tem
 * que ser o efeito que ele recebe.
 */
export function valorEmCampo(
  nossos: readonly GrupoEmCampo[],
  deles: readonly GrupoEmCampo[],
  ajustes: AjustesDaBatalha,
): ValorEmCampo {
  const homens = somaDe(nossos);
  if (homens <= 0) return leves(0);

  const inimigo = fracoesPorArma(deles);
  let ataque = 0;
  let aguento = 0;
  let cavalos = 0;
  for (const grupo of nossos) {
    const arma = ajustes.armas[grupo.arma];
    const alvo = BATE[grupo.arma];
    // O bônus vale só contra a FATIA do inimigo que esta arma bate: metade de cavalaria pela
    // frente é metade do bônus. Sem isso, um único cavaleiro no lado de lá daria ao hoplita
    // a vantagem inteira.
    const vantagem = alvo === null ? 1 : 1 + (ajustes.armas.counter - 1) * (inimigo[alvo] ?? 0);
    ataque += grupo.homens * arma.ataque * grupo.qualidade * vantagem;
    aguento += grupo.homens * arma.aguento;
    if (grupo.arma === 'cavalaria') cavalos += grupo.homens;
  }

  return {
    homens,
    ataque: ataque / homens,
    aguento: aguento / homens,
    // ⚠️ **Satura, e não é proporcional.** Não é preciso um cavalo por fugitivo para caçar
    // fugitivos — e, se fosse proporcional, cavalaria nenhuma se pagaria: a força cresce com
    // o quadrado das cabeças, então uma tropa cara sempre perde a corrida de números. Com a
    // saturação, um esquadrão pequeno já muda o que sobra do derrotado, que é exatamente o
    // que a cavalaria deve comprar.
    perseguicao: perseguicaoDe(cavalos / homens, ajustes),
  };
}

/**
 * Quantas BOCAS esta tropa é — e cavalo come por vários homens.
 *
 * ⚠️ **É aqui que a cavalaria cobra caro, e não na folha de pagamento.** Cavalo se sustenta
 * em pasto e cevada, não em moeda: fazer a manutenção em ouro subir junto seria cobrar o
 * mesmo custo duas vezes. Assim, cavalaria é uma pressão sobre a TERRA, e um reino faminto
 * não consegue mantê-la mesmo com o tesouro cheio.
 */
export function bocasDe(
  contingentes: readonly GrupoEmCampo[],
  ajustes: AjustesDaBatalha,
): number {
  let bocas = 0;
  for (const c of contingentes) bocas += c.homens * ajustes.armas[c.arma].comida;
  return bocas;
}

/** Quantos homens de cada arma. Para a janela de batalha e para a ficha da hoste. */
export function porArma(
  contingentes: readonly GrupoEmCampo[],
): Readonly<Record<Arma, number>> {
  const conta: Record<Arma, number> = { leve: 0, hoplita: 0, arqueiro: 0, cavalaria: 0 };
  for (const c of contingentes) conta[c.arma] += c.homens;
  return conta;
}

/** O multiplicador da caçada, dada a fatia do exército que vai a cavalo. */
function perseguicaoDe(fracaoACavalo: number, ajustes: AjustesDaBatalha): number {
  if (fracaoACavalo <= 0) return 1;
  const meia = ajustes.armas.meiaCavalaria;
  return 1 + (ajustes.armas.perseguicaoPorCavalaria - 1) * (fracaoACavalo / (fracaoACavalo + meia));
}

/** Que fatia do lado é cada arma. Zero em toda parte se não há ninguém. */
function fracoesPorArma(grupos: readonly GrupoEmCampo[]): Readonly<Record<Arma, number>> {
  const total = somaDe(grupos);
  const conta = porArma(grupos);
  const fracoes: Record<Arma, number> = { leve: 0, hoplita: 0, arqueiro: 0, cavalaria: 0 };
  if (total <= 0) return fracoes;
  for (const arma of ARMAS) fracoes[arma] = conta[arma] / total;
  return fracoes;
}

function somaDe(grupos: readonly GrupoEmCampo[]): number {
  let total = 0;
  for (const g of grupos) total += g.homens;
  return total;
}
