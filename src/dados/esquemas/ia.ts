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
  /**
   * O que a comida vale quando ela é o GARGALO — e não quando já é emergência.
   *
   * ⚠️ **É a irmã de `alimentoApertado`, e existe porque um preço só não servia para as duas
   * perguntas.** A despensa "no chão" (saldo já no limiar) é rara e dramática, e por isso
   * `alimentoApertado` é altíssimo. Mas desde que a IA passou a olhar para FRENTE — cabe na
   * despensa o exército que a minha economia banca? (ver `ia/percepcao/sustento.ts`) — a
   * resposta "não cabe" virou rotina, e cobrar o preço de emergência numa rotina fez a IA
   * construir só fazenda. Medido em 150 turnos com um ponto de comida para cada 500 soldados:
   * a riqueza do mapa caiu 33% e sobraram 5 poderes vivos de 18.
   *
   * Este é o preço do planejamento: acima do gosto de `valorDaObra.alimento`, bem abaixo da
   * emergência. Ele é que faz a fazenda sair ANTES da parede sem varrer a Ágora do mapa.
   */
  alimentoNoGargalo: z.number(),
  /** Em que saldo a despensa já conta como no chão. 1 é "uma folga e nada mais". */
  limiarDeAperto: z.number().int(),
  /**
   * O que uma obra de DEFESA vale quando há exército alheio na porta, em moedas por turno.
   *
   * ⚠️ **É a irmã de `alimentoApertado`, e existe pelo mesmo motivo.** Medido numa partida de
   * 100 turnos com todos na IA, os quatro únicos sobreviventes eram os quatro `guerreiro`:
   * mercador, cauteloso e equilibrado morriam todos. O estilo não descrevia três jeitos de
   * jogar — descrevia um de jogar e três de morrer, porque `valorDaObra.milicia` era um gosto
   * fixo em vez de uma reação. Um mercador acha muro caro, e está certo em paz; com o inimigo
   * na fronteira ele deixa de estar.
   *
   * Alto de propósito, como o alimento apertado, e para todo estilo: a diferença entre eles
   * volta a aparecer no dia em que a ameaça passar.
   */
  defesaAmeacada: z.number(),
  /**
   * O que ABRIR O MAR vale para este estilo, em moedas por turno — só o PRIMEIRO Porto.
   *
   * ⚠️ **Sem isto o mar seria uma mecânica morta do lado da IA.** O Porto custa 2.500 e paga
   * em trânsito, que é a menor parcela da renda: medido, nenhum dos dezoito poderes ergueu um
   * em cem turnos, e sem Porto ninguém embarca. O mar existia, o exército sabia navegar, e
   * nenhum reino chegava à porta.
   *
   * O que o ouro não mede aqui é o que o Porto virou: **a porta.** Ele abre o comércio com
   * quem não faz fronteira e abre a travessia para as ilhas — as duas coisas de uma vez, e
   * as duas só na primeira vez. Do segundo Porto em diante a porta já está aberta, e ele
   * volta a valer exatamente o trânsito que rende. É a mesma ideia de `defesaAmeacada`: um
   * preço que muda com a situação, e não um gosto fixo.
   */
  valorDoMar: z.number(),
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
   *
   * ⚠️ **Ela é ALTA para todo estilo, e a diferença entre eles mora em `folhaEmPaz`.** O
   * mercador tinha 0,15 aqui contra 0,20 do guerreiro em PAZ: ele, em guerra, gastava menos
   * com tropa do que o guerreiro gastava sem inimigo nenhum à vista. Isso não é uma
   * personalidade, é uma sentença — e a partida confirmou, matando todo estilo que não fosse
   * guerreiro. Quem não quer guerra ainda decide isso na paz; com o inimigo na porta, todo
   * mundo paga o que tem.
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
   * Quanto ela topa pagar por GRÃO COMPRADO, por turno, em fração da renda.
   *
   * ⚠️ **O cofre também paga, e é ele que dá sentido a isto.** Medido em 250 turnos, o reino
   * que vencia a expansão guardava 120 mil moedas e três mil homens, porque a comida travava o
   * exército e o ouro não comprava comida. Com esta fatia ela compra pela renda; com o cofre
   * cheio, compra pelo cofre — ver `economia/importar.ts`.
   */
  fatiaParaGrao: z.number().min(0).max(1),
  /**
   * Que fração do cofre, acima da guarda, vira folha militar a cada turno.
   *
   * É o que faz o reino rico ser reino armado. Zero devolve a IA antiga, que só gastava a renda
   * de hoje e deixava o cofre crescer para sempre — ver `percepcao/sustento.ts`.
   */
  cofreNaFolha: z.number().min(0).max(1),
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
  /**
   * O que a CAPITAL alheia vale para ela, em moedas por turno, além da renda da província.
   *
   * A capital não rende mais que outra terra por ser capital — o que ela faz é ser o coração
   * da rede de trocas do dono e o lugar de onde o reino se organiza. Perdê-la é um golpe que
   * a renda da província não mede, e o estilo é quem diz o tamanho desse golpe: um guerreiro
   * marcha por ela; um mercador prefere a terra do bem que lhe falta.
   */
  valorDaCapital: z.number(),
  /**
   * Com quanto do exército de pé ela topa terminar uma conquista, de 0 a 1.
   *
   * ⚠️ **É o freio do ataque, e sem ele a IA sangra até morrer ganhando.** Vencer não basta
   * para atacar: uma vitória que custa nove décimos do exército entrega a província seguinte
   * de graça a quem estiver olhando — e no turno seguinte ela não tem com que defender a que
   * acabou de tomar. Para SOCORRER, ganhar continua bastando: lá a alternativa é perder a
   * cidade.
   *
   * 0,3 é o guerreiro, que topa sair da batalha com um terço; 0,7 é o cauteloso, que só entra
   * em briga que já está ganha.
   */
  sobraMinima: z.number().min(0).max(1),
  /**
   * Que fatia do próprio exército ela topa pôr em campanha longe de casa, de 0 a 1.
   *
   * ⚠️ **É o freio que faltava, e sem ele o mapa virava sopa no turno 3.** Medido: com as
   * ordens simultâneas, dezessete poderes olhavam a milícia do vizinho no turno 1, viam que
   * ganhavam, e marchavam TODOS ao mesmo tempo — cinco conquistas no primeiro turno, a
   * capital de Atenas caindo no terceiro, e ninguém tendo levantado um exército de verdade.
   * O erro não era achar que ganhava: era esvaziar a própria casa para ganhar.
   *
   * **Atacar é ficar mais fraco em casa.** Este número é a IA dizendo o quanto disso ela
   * aceita. 0,7 é o guerreiro, que põe quase tudo na estrada; 0,35 é o cauteloso, que só sai
   * com um exército de sobra. Com uma hoste só, a fatia é sempre 1 — e é por isso que ninguém
   * marcha antes de conseguir sustentar o SEGUNDO exército, que é a mesma coisa que a
   * história cobrava de uma cidade grega.
   */
  fracaoQueMarcha: z.number().min(0).max(1),
  /**
   * De quantas vezes o exército do vizinho ela precisa antes de DECLARAR guerra a ele.
   *
   * ⚠️ **Substituiu um preço fingido por conquista, e é melhor por ser verdadeiro.** O número
   * anterior (`custoDaConquista`) existia só para segurar um mapa onde todo mundo estava em
   * guerra com todo mundo desde o turno 1; medido, ele se comportava como cara ou coroa — a
   * mesma direção do dial dava 20 conquistas numa configuração e 105 na vizinha. Este aqui
   * pergunta uma coisa que existe: *declarar é assinar que o outro vem atrás; eu ganho essa?*
   *
   * 1,0 é o guerreiro, que topa uma guerra parelha; 2,0 é o cauteloso, que só entra com o
   * dobro em armas. Vale sobre o exército do REINO inteiro do alvo, e não sobre a guarnição da
   * província — quem declara passa a enfrentar tudo o que o outro tem.
   */
  vantagemParaDeclarar: z.number().min(0),
  /**
   * Até que opinião ela ainda considera declarar guerra a alguém, de −100 a 100.
   *
   * ⚠️ **É o que impede a relação de ser enfeite.** Um número que sobe e desce e não muda
   * decisão nenhuma é um número que o jogador aprende a ignorar. Aqui ele vira a primeira
   * pergunta da guerra: *gosto demais deste para atacá-lo?*
   *
   * +20 é o guerreiro, que ataca até quem lhe é indiferente; −40 é o mercador, que só marcha
   * sobre quem ele já detesta. É por este número que um presente ou um acordo de comércio
   * compram segurança de verdade — eles empurram a opinião para longe do limiar.
   */
  relacaoParaDeclarar: z.number().min(-100).max(100),
  /**
   * A partir de quantos turnos uma guerra é longa demais e ela assina a paz.
   *
   * ⚠️ **É o que faz as guerras EMPATADAS terminarem.** Duas cidades do mesmo tamanho, nenhuma
   * capaz de tomar a outra, ficariam se olhando para sempre — as duas achando que ganham e
   * nenhuma conseguindo —, e um mapa com todos os poderes travados numa guerra que não anda é
   * o mesmo mapa parado de antes, só que pagando folha de campanha.
   *
   * O guerreiro aguenta mais tempo antes de desistir; o mercador quer voltar a vender.
   */
  guerraLonga: z.number().int().positive(),
  /**
   * Os GOSTOS: o que este temperamento pesa mais na balança de um acordo.
   *
   * ⚠️ **É o que faz dois reinos com a mesma opinião responderem coisas diferentes** — e o que
   * `ESTADO_DO_JOGO.md` listava como pendente: "estilos ainda não alteram o que a
   * personalidade aprecia diplomaticamente". Cada gosto multiplica um grupo de parcelas:
   * `confianca` a opinião; `forca` o medo, a proteção e a fraqueza do parceiro; `renda` o ouro
   * oferecido; `seguranca` as mãos ocupadas e as guerras herdadas. Em 1,0 o gosto não pesa.
   * Ver `ia/diplomacia/balanca.ts`.
   */
  gostos: z.object({
    confianca: z.number().nonnegative(),
    forca: z.number().nonnegative(),
    renda: z.number().nonnegative(),
    seguranca: z.number().nonnegative(),
  }),
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
