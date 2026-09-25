/**
 * Construções permanentes em quatro slots, com níveis I–III.
 *
 * O efeito mora no catálogo e não se repete nas províncias — balancear todas as Ágoras do
 * mapa é mudar um número só, exatamente como acontece com o valor dos produtos.
 *
 * **Por que uma parcela cada, e não um bônus genérico:** como impostos, produção e comércio
 * pesam diferente em cada província, a melhor construção muda de lugar pra lugar. Atenas tem
 * muita gente e quer Ágora; Sunião tem minério e pode erguer Mina.
 */

import { z } from 'zod';

const TresNiveisPositivos = z.tuple([
  z.number().positive(),
  z.number().positive(),
  z.number().positive(),
]);
const TresPrazosPositivos = z.tuple([
  z.number().int().positive(),
  z.number().int().positive(),
  z.number().int().positive(),
]);
const TresCustosInteiros = z.tuple([
  z.number().int().positive(),
  z.number().int().positive(),
  z.number().int().positive(),
]);

export const Construcoes = z.object({
  versao: z.literal(1),
  comentario: z.string().min(1),
  construcoes: z.record(
    z.string().min(1),
    z.object({
      nome: z.string().min(1),
      /**
       * Exceção ao teto geral I–III. Obras que apenas liberam uma capacidade binária não
       * vendem melhorias sem efeito: ficam no nível I.
       */
      nivelMaximo: z.number().int().min(1).max(3).optional(),
      /**
       * Por padrão, custo e manutenção acompanham o peso econômico da terra. `false` reserva
       * o mesmo preço final em qualquer província para obras cujo efeito é idêntico em todas.
       */
      escalaPorProvincia: z.literal(false).optional(),
      /** Custo e prazo explícitos de I, II e III. Upgrade paga somente o nível novo. */
      custos: TresNiveisPositivos,
      turnos: TresPrazosPositivos,
      /**
       * Ouro por turno para manter cada nível de pé, para sempre.
       *
       * É o custo próprio que faz a renda provincial ser LÍQUIDA e permite província no
       * vermelho (ver GDD): um Mercado numa terra pobre pode custar mais do que rende, e
       * "não construir" vira decisão. Também é o ralo contínuo que faltava ao tesouro —
       * quem enche os doze slots do reino assume uma folha permanente.
       */
      manutencao: TresCustosInteiros,
      requisito: z
        .object({
          /** Basta possuir um destes produtos, principal ou secundário. */
          produtos: z.array(z.string().min(1)).min(1).optional(),
          ancoradouro: z.literal(true).optional(),
        })
        .optional(),
      /**
       * Em que moeda esta construção paga.
       *
       * **Nem toda construção paga em ouro, e é isso que faz a lista ser uma escolha.**
       * Se todas rendessem moeda, escolher seria aritmética: bastaria pegar a de maior
       * retorno. O Quartel não rende moeda: reserva um slot para carimbar treino nas levas,
       * enquanto Fazenda compra alimento e Ágora compra arrecadação.
       *
       * União discriminada e não campos opcionais: assim o compilador obriga quem lê a
       * decidir de que tipo é antes de usar `fator`, em vez de deixar um `undefined`
       * atravessar a fórmula da renda em silêncio.
       */
      efeito: z.discriminatedUnion('tipo', [
        z.object({
          tipo: z.literal('renda'),
          /**
           * Qual das três parcelas da renda esta construção melhora.
           *
           * É `enum` e não `string` de propósito: aponta pra uma parcela que não existe e
           * o carregamento falha com o caminho do campo, em vez de a construção
           * silenciosamente não fazer nada.
           */
          parcela: z.enum(['impostos', 'producao', 'transito']),
          /** Fator total no nível I, II e III. */
          fatores: TresNiveisPositivos,
        }),
        z.object({
          tipo: z.literal('alimento'),
          /** Pontos acrescentados pela construção no nível I, II e III. */
          pontos: z.tuple([
            z.number().int().nonnegative(),
            z.number().int().nonnegative(),
            z.number().int().nonnegative(),
          ]),
        }),
        z.object({
          tipo: z.literal('milicia'),
          /**
           * Multiplica a milícia da província. 2 é o dobro de defensores.
           *
           * Multiplica a DERIVAÇÃO. Não existe número de guarnição guardado em lugar
           * nenhum para isto somar.
           */
          fatores: TresNiveisPositivos,
        }),
        z.object({
          tipo: z.literal('felicidade'),
          /** Pontos somados ao ALVO de felicidade da província no nível I, II e III. */
          pontos: z.tuple([
            z.number().int().nonnegative(),
            z.number().int().nonnegative(),
            z.number().int().nonnegative(),
          ]),
        }),
        z.object({
          tipo: z.literal('corrupcao'),
          /**
           * Qual METADE da corrupção esta obra alivia.
           *
           * A conta tem duas: perde-se por haver gente demais para uma administração
           * arcaica (`tamanho`) e por a terra ficar longe de quem governa (`distancia`).
           * Ágora e Estrada são as contrapartidas de construção: uma reduz tamanho e a
           * outra distância. É este campo que liga a obra à parcela correta.
           *
           * Cada obra ataca UMA metade, e por isso elas não são a mesma obra com números
           * diferentes: Estrada espalha o império, Ágora engole população.
           */
          alvo: z.enum(['tamanho', 'distancia']),
          /**
           * O que SOBRA da fatia, por nível. 0,8 corta um quinto dela.
           *
           * Fração do que resta e não pontos subtraídos: assim a obra vale mais onde a
           * corrupção dói mais, e nunca produz corrupção negativa.
           */
          fatores: TresNiveisPositivos,
        }),
        z.object({
          tipo: z.literal('troca'),
          /**
           * A praça: multiplica a REDE do reino **e** o trânsito desta província.
           *
           * ⚠️ **Duas pernas, e o mesmo número move as duas** — porque uma praça faz duas
           * coisas: cobra de quem passa por AQUI e distribui o que o reino inteiro alcança.
           *
           * Cada perna sozinha já foi armadilha, e as duas medições estão registradas. Só
           * LOCAL: `transitoBase` é 0,18 em Tanagra contra 0,60 em Corinto, e multiplicador
           * em cima de quase nada não paga obra nenhuma. Só NACIONAL: o preço da obra escala
           * pelo peso da terra que a ergue, então Corinto pagava o preço mais alto do
           * catálogo por um ganho que dependia de quantas províncias ela tinha — e ela tem
           * uma; o Mercado ia a 1.729 turnos de retorno ali e a "nunca" em metade do mapa.
           *
           * Juntas, elas se corrigem: **a perna local paga a encruzilhada rica, a nacional
           * paga o império largo.** Medido do poder mais pobre ao mais rico, o retorno caiu
           * para uma faixa comparável à dos outros prédios.
           *
           * ⚠️ A perna NACIONAL vale uma vez por reino, pelo melhor nível erguido: dois
           * Mercados não multiplicam a mesma rede duas vezes. A perna LOCAL é de cada praça,
           * como qualquer obra de renda.
           */
          fatores: TresNiveisPositivos,
        }),
        z.object({
          tipo: z.literal('arma'),
          /**
           * A arma que esta obra LIBERA nesta província.
           *
           * ⚠️ **Libera por PROVÍNCIA, não por reino.** Armaria em Atenas quer dizer hoplita
           * recrutado em Atenas; Maratona sem ela levanta leves. É isso que transforma "qual
           * das minhas terras é a militar?" numa pergunta com resposta no mapa, e é como as
           * explorações já funcionam — Mina só onde há ferro.
           *
           * O `leve` não aparece aqui: ele é a linha de base e toda terra o levanta sem
           * construir nada. Ninguém fica sem exército por não ter erguido prédio.
           */
          arma: z.enum(['hoplita', 'arqueiro', 'cavalaria']),
        }),
        z.object({
          tipo: z.literal('qualidade'),
          /**
           * O treino que esta obra CARIMBA na tropa levantada aqui, por nível.
           *
           * ⚠️ **Carimbado no recrutamento, não consultado na batalha.** Se fosse lido da
           * província na hora do choque, perder a terra transformaria veteranos em recrutas no
           * meio da campanha. Tomar o Quartel do inimigo não piora o exército que ele tem —
           * piora os que virão, e essa é uma pressão de campanha muito melhor.
           *
           * ⚠️ **Fica ABAIXO do número.** Mesmo princípio do counter: vantagem, não
           * dominância. Um poder pequeno com treino alto ficaria intocável, e a gente
           * quebraria o "defensor menor tem chance" pelo outro lado.
           */
          fatores: TresNiveisPositivos,
        }),
        z.object({
          tipo: z.literal('futuro'),
        }),
      ]),
      /** Benefício atual e, quando houver, papel futuro escrito para o jogador. */
      promessa: z.string().min(1),
      /**
       * Esta obra obriga o inimigo a sitiar antes de poder assaltar.
       *
       * ⚠️ **Fora do `efeito`, e de propósito.** Impedir o assalto imediato não é o mesmo
       * que multiplicar a milícia: a Muralha faz as duas coisas hoje, mas uma torre, um
       * fosso ou uma cidadela futura podem fazer só uma. Ler a regra pelo id `muralha`
       * amarraria o combate a um id de conteúdo, e o `0.0.10` vai refazer o catálogo.
       */
      impedeAssaltoImediato: z.boolean().optional(),
      /**
       * Rodadas completas de cerco exigidas antes do assalto, por nível da obra.
       *
       * Fica no catálogo porque é propriedade da fortificação, não uma regra global: uma
       * Muralha I compra menos tempo que a mesma obra no nível III.
       */
      rodadasParaAssaltar: TresPrazosPositivos.optional(),
      /**
       * Fração abatida da folha da tropa parada NESTA província, por nível.
       *
       * Só vale em território próprio. Estrada abastece a guarnição local; não barateia
       * campanha em terra alheia nem tropa parada em outra província do reino.
       */
      descontoDaFolhaEmCasa: z
        .tuple([z.number().min(0).max(1), z.number().min(0).max(1), z.number().min(0).max(1)])
        .optional(),
      /**
       * Pontos extras por turno quando o humor sobe em direção ao alvo, por nível.
       *
       * Não impede a queda causada por fome, cerco ou imposto: acelera recuperação da ordem,
       * que é o papel cívico do Templo depois de uma conquista.
       */
      recuperacaoDaOrdem: z
        .tuple([
          z.number().int().nonnegative(),
          z.number().int().nonnegative(),
          z.number().int().nonnegative(),
        ])
        .optional(),
      /**
       * Quanto esta obra soma à taxa de crescimento da província, por nível.
       *
       * ⚠️ **Fora do `efeito`, pela mesma razão das outras capacidades.** O Mercado rende
       * ouro E atrai gente; uma oficina futura pode fazer só uma das duas. Obras diferentes
       * somam — ver `taxaDeCrescimento`.
       */
      prosperidade: z
        .tuple([z.number().nonnegative(), z.number().nonnegative(), z.number().nonnegative()])
        .optional(),
      /**
       * Quantos pontos de comida o reino pode COMPRAR de fora por causa desta obra, por nível.
       *
       * É a porta por onde o grão entra: sem cais nem praça, não há de quem comprar. Obra em
       * cidade sitiada não conta, e obra que liga por mar não conta com o cais bloqueado —
       * ver `alimentacao/importacao.ts`.
       */
      importaGrao: z
        .tuple([
          z.number().int().nonnegative(),
          z.number().int().nonnegative(),
          z.number().int().nonnegative(),
        ])
        .optional(),
      /**
       * Esta obra liga a província ao resto do reino POR MAR.
       *
       * ⚠️ **Fora do `efeito`, pela mesma razão do `impedeAssaltoImediato`.** Multiplicar
       * uma parcela de renda e abrir uma rota marítima são coisas diferentes: o Porto faz as
       * duas, mas um farol, um estaleiro ou uma feitoria futura podem fazer só uma. E ler a
       * regra pelo id `porto` amarraria a circulação a um id de conteúdo.
       *
       * ⚠️ **Vale para MERCADORIA e para EXÉRCITO, por rotas diferentes.** A mercadoria pula
       * de Porto a Porto — rota abstrata, sem navio no mapa. A hoste é peça concreta: ela
       * ANDA pelas zonas de mar, um salto por rodada, e pode ser interceptada. O que esta
       * bandeira diz nos dois casos é a mesma coisa — **daqui se embarca**.
       */
      ligaPorMar: z.boolean().optional(),
      /** Por que ela existe e onde ela vale. Documentação junto do dado. */
      motivo: z.string().min(1),
    }),
  ),
});

export type Construcoes = z.infer<typeof Construcoes>;
