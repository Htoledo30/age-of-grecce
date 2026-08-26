/**
 * QUEM é cada IA — a personalidade dos poderes, em dados.
 *
 * ⚠️ **Nenhum número de comportamento mora no código da IA.** É a mesma regra do balanço:
 * trocar Esparta de "guerreiro" para "mercador" não pode exigir recompilar nada, e comparar
 * dois estilos tem que ser comparar dois blocos de JSON lado a lado.
 *
 * ## Por que "valor por turno" e não "peso"
 *
 * A IA escolhe obra pela conta que o próprio jogo já faz: `retornoDaConstrucaoEm` diz quanto
 * cada prédio rende por turno. Mas Muralha, Armaria e Templo rendem **zero moeda** — elas
 * pagam noutra coisa, e uma IA que só olhasse ouro nunca ergueria muro nenhum.
 *
 * A saída podia ser um peso abstrato multiplicando um número inventado. Em vez disso, o estilo
 * escreve **quanto aquilo vale para ele em moedas por turno**: *"uma Muralha vale 8 moedas por
 * turno de sossego"*. Fica na mesma unidade do resto da conta, soma direto, e dá para discutir
 * o número olhando para a renda de uma província — que é como Henrique lê o jogo.
 */

import { z } from 'zod';

/** O que um estilo de IA valoriza, e o quanto ele guarda. */
const Estilo = z.object({
  /**
   * O que cada tipo de obra vale para esta IA, EM MOEDAS POR TURNO, além do que ela rende.
   *
   * Some ao retorno real da obra. Zero quer dizer "só me interessa o que ela põe no cofre";
   * é o caso da Ágora e do Mercado, que já se pagam em ouro.
   *
   * ⚠️ Não é uma tabela de prédios: é por TIPO DE EFEITO. Um prédio novo com efeito conhecido
   * entra sozinho na conta, sem ninguém lembrar de atualizar a IA — que é exatamente o
   * esquecimento que faria a IA parar de considerar metade do catálogo em silêncio.
   */
  valorDaObra: z.object({
    renda: z.number(),
    corrupcao: z.number(),
    troca: z.number(),
    /** Comida vale MUITO quando a despensa aperta; ver `alimentoApertado`. */
    alimento: z.number(),
    milicia: z.number(),
    felicidade: z.number(),
    arma: z.number(),
    qualidade: z.number(),
  }),
  /**
   * O que a comida vale quando o saldo do reino está no limiar ou abaixo.
   *
   * Come primeiro: um reino que para de crescer por falta de comida perde a corrida sem
   * levar uma batalha. Este número é alto de propósito, e só vale no aperto.
   */
  alimentoApertado: z.number(),
  /** Em que saldo a despensa já conta como apertada. 1 é "uma folga e nada mais". */
  limiarDeAperto: z.number().int(),
  /**
   * Fatia do tesouro que esta IA NÃO gasta em obra.
   *
   * Sem reserva ela zera o caixa numa Ágora e não tem com que pagar a folha no turno
   * seguinte — que é o erro que todo jogador novo comete uma vez.
   */
  guardaDoTesouro: z.number().min(0).max(1),
  /** O nível de imposto que ela prefere quando o povo aguenta. */
  imposto: z.enum(['baixo', 'normal', 'alto']),
  /**
   * Abaixo deste humor ela alivia o imposto, mesmo preferindo alto.
   *
   * É a única inteligência de imposto da primeira etapa, e é a que importa: província que
   * se revolta para de pagar qualquer coisa, e aí o imposto alto rendeu zero.
   */
  humorParaAliviar: z.number(),
  /**
   * Fatia da RENDA que esta IA topa gastar mantendo gente em armas.
   *
   * É o único teto que ela se impõe sozinha; os outros dois — comida e população — vêm do
   * mundo. 0,3 quer dizer "um terço do que entra vai para a folha militar", e com a taxa de
   * casa em 0,1 por homem isso são três homens por moeda de renda.
   *
   * ⚠️ **Sem este teto ela recruta até a deserção.** O jogo deixa levantar tropa enquanto
   * houver ouro no cofre, e o cofre é o de HOJE — a folha é todo turno.
   */
  folhaMilitar: z.number().min(0),
  /**
   * A mesma fatia, mas **em paz** — quando não há exército alheio nas suas terras nem na
   * porta delas.
   *
   * ⚠️ **Sem esta separação a IA alistava tudo no turno 1.** Medido: 8.524 homens em armas no
   * primeiro turno de um mundo onde ninguém tinha marchado, e vários poderes ficando mais
   * pobres na hora, porque recrutar tira gente da lavoura e do imposto. Henrique viu jogando:
   * *"todas as províncias geram soldados, todas no round 1 já vão direto para soldados"*.
   *
   * Em paz o que se mantém é uma GUARDA: gente suficiente para a ordem pública e para não ser
   * tomado por um bando. Exército de verdade se levanta quando alguém aparece — e é a mesma
   * decisão que o jogador toma, que é o teste de se a IA está jogando este jogo.
   */
  folhaEmPaz: z.number().min(0),
  /**
   * Que soldado ela levanta quando a terra oferece mais de um.
   *
   * `melhor` pega quem mais vale em campo (`ataque × aguento`), custe o que custar — é o
   * guerreiro, que prefere quinhentos hoplitas a oitocentos leves. `barata` pega quem rende
   * mais luta por moeda — é o mercador, que prefere a massa.
   *
   * ⚠️ Nenhuma tabela de armas mora no código da IA: os dois cálculos saem de
   * `ajustes.batalha.armas`, que é o mesmo lugar de onde a batalha lê.
   */
  arma: z.enum(['melhor', 'barata']),
});

export const Ia = z.object({
  versao: z.number().int().positive(),
  comentario: z.string().min(1),
  /** O estilo usado por quem não tiver um escrito. */
  padrao: z.string().min(1),
  estilos: z.record(z.string(), Estilo),
  /** Quem joga com qual estilo. Poder que não estiver aqui usa o `padrao`. */
  porPoder: z.record(z.string(), z.string()),
});

export type Ia = z.infer<typeof Ia>;
export type EstiloDeIa = z.infer<typeof Estilo>;
