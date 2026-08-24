/** Esquemas dos arquivos de dados do jogo.
 *  Regra do projeto: nenhum dado de conteúdo mora em código — tudo em JSON, validado aqui. */

import { z } from 'zod';

export const Mundo = z.object({
  versao: z.literal(1),
  nome: z.string().min(1),
  /** Precisa bater com assets/mundo/mapa.json — quem manda nos números é o gerador. */
  dimensoes: z.object({
    largura: z.number().positive(),
    altura: z.number().positive(),
  }),
});

export type Mundo = z.infer<typeof Mundo>;

/**
 * Ajustes de jogo — números que se calibram jogando, não algoritmo.
 *
 * A fronteira é essa: o que um designer mexe pra o jogo ficar bom mora aqui e em
 * `dados/ajustes.json`; matemática de algoritmo (pesos de suavização, transformada de
 * distância, conversão de coordenada) fica no código, porque mexer nela quebra a lógica
 * em vez de calibrar o jogo.
 *
 * Este esquema é a documentação do arquivo, e é o que um editor futuro vai ler pra saber
 * quais campos existem e que valores aceitam.
 */
/** Um nível de imposto: quanto multiplica a receita e quanto pesa no humor. */
const NivelDeImposto = z.object({
  fator: z.number().gt(0),
  humor: z.number().int(),
});

export const Ajustes = z.object({
  versao: z.literal(1),
  jogo: z.object({
    /** Ano em que a campanha abre. Negativo é a.C.: 700 a.C. é -700. */
    anoInicial: z.number().int(),
    /**
     * Quantos anos um turno faz passar.
     *
     * **Decisão em aberto, de propósito exposta aqui.** Um turno por ano funciona no
     * protótipo, mas é a escolha que decide o ritmo da campanha inteira — 700 turnos pra
     * atravessar a era arcaica é muito ou é pouco? Enquanto o número mora neste arquivo,
     * mudar de ideia custa uma linha; escondido no código, custaria uma refatoração.
     */
    anosPorTurno: z.number().int().positive(),
    tesouroInicial: z.number().nonnegative(),
    economia: z.object({
      /**
       * Moedas por habitante, por turno. População é estado e cresce; por isso os
       * impostos acompanham nascimentos, recrutamento, deserção e desmobilização.
       */
      impostoPorHabitante: z.number().positive(),
      /**
       * Os níveis de imposto por província: receita trocada por pressão social.
       *
       * É o desenho do GDD, com a régua de Rome: Total War como referência (Low ×0,8
       * comprando ordem pública; High/Very High ×1,2–1,5 pagando em revolta). O `fator`
       * multiplica o imposto DEPOIS da corrupção; o `humor` entra no ALVO de felicidade
       * da província. Substituiu o decreto de investimento, que era redundante com as
       * construções e de retorno ilegível.
       */
      imposto: z.object({
        niveis: z.object({
          baixo: NivelDeImposto,
          normal: NivelDeImposto,
          alto: NivelDeImposto,
        }),
      }),
    }),
    /** Crescimento natural por província, aplicado uma vez ao passar o turno. */
    populacao: z.object({
      /**
       * Crescimento por turno, antes das construções.
       *
       * ⚠️ **Não existe capacidade máxima artificial:** esta taxa é aplicada diretamente,
       * e a disponibilidade de alimento funciona como freio.
       */
      taxaNatural: z.number().gt(0).max(1),
    }),
    construcoes: z.object({
      slotsPorProvincia: z.number().int().positive(),
      nivelMaximo: z.literal(3),
    }),
    /**
     * A corrupção: o freio do imposto, por tamanho e por distância da capital.
     *
     * Cada fatia é uma hipérbole saturante `teto × x / (x + meio)`; as duas se compõem
     * por `1 − (1−a)(1−b)` e nunca chegam a 100%. Fórmula e tabela de calibração no GDD.
     */
    corrupcao: z.object({
      tamanho: z.object({
        /** Habitantes que uma administração arcaica cobre sem perder nada. */
        limiar: z.number().int().nonnegative(),
        /** Fração máxima que o tamanho pode comer, no infinito. */
        teto: z.number().min(0).max(1),
        /** Excesso de habitantes que compra METADE do teto. Controla a inclinação. */
        meiaPopulacao: z.number().int().positive(),
      }),
      distancia: z.object({
        /** Fração máxima que a distância pode comer, no infinito. */
        teto: z.number().min(0).max(1),
        /** Saltos que compram metade do teto. 6 reproduz a tabela do GDD. */
        meioCaminho: z.number().int().positive(),
        /** Saltos atribuídos a quem NÃO tem caminho até a capital (ilha, sem capital). */
        semCaminho: z.number().int().positive(),
      }),
    }),
    capital: z.object({
      /**
       * O que custa mudar a capital por vontade própria.
       *
       * Zero quando a atual caiu em mãos alheias — a escolha forçada não é castigo. O
       * custo existe para a mudança voluntária não virar um interruptor grátis quando a
       * corrupção por distância passar a ler a capital.
       */
      custoDeMudanca: z.number().int().nonnegative(),
    }),
    /** Balanço alimentar anual em pontos inteiros: capacidade, não inventário. */
    alimento: z.object({
      /** Ponto básico dado uma vez a cada poder com território simulado. */
      subsistenciaPorReino: z.number().int().nonnegative(),
      /** Cada crescimento desta fração sobre a população inicial aumenta o custo em um. */
      fracaoPopulacionalPorNivel: z.number().gt(0).max(1),
      /** Quantos homens mobilizados, ou fração, custam um ponto. */
      soldadosPorPonto: z.number().int().positive(),
      /** Fatia fixa da população perdida quando o saldo civil é negativo. */
      mortePorFome: z.number().min(0).max(1),
      /** Fatia fixa dos homens mobilizados perdida quando o saldo final é negativo. */
      mortePorFomeNaTropa: z.number().min(0).max(1),
      /**
       * A despensa de uma cidade cercada — o relógio de Bannerlord, num contador só.
       *
       * A cidade aguenta `mantimentos + comida da própria terra` turnos de cerco (a
       * Fazenda é resistência de cerco). Enquanto a despensa dura, ninguém morre; quando
       * vence, povo (−1%) e guarnição (−5%) caem juntos, todo turno.
       */
      cerco: z.object({
        mantimentos: z.number().int().nonnegative(),
      }),
    }),
    /**
     * Como o número de felicidade vira palavra na tela.
     *
     * Internamente é 0–100; o jogador nunca vê o número cru. As
     * cinco faixas são a interface oficial, e ficam nos dados porque são conteúdo: mexer
     * no ponto em que uma província passa a "Revoltosa" é balanço, não código.
     */
    felicidade: z.object({
      /**
       * Da mais infeliz para a mais feliz. `ate` é o último valor que ainda pertence à
       * faixa, e a última tem que fechar em 100 — senão existe felicidade sem nome.
       *
       * A PRIMEIRA faixa é a revoltosa: é nela que o imposto para de ser pago e que a
       * contagem de revolta corre. O limiar sai da própria faixa, não de outro número.
       */
      faixas: z
        .array(z.object({ ate: z.number().int().min(0).max(100), nome: z.string().min(1) }))
        .min(2)
        .superRefine((faixas, ctx) => {
          for (let i = 1; i < faixas.length; i++) {
            if ((faixas[i]?.ate ?? 0) <= (faixas[i - 1]?.ate ?? 0)) {
              ctx.addIssue({ code: 'custom', message: 'as faixas têm que subir' });
            }
          }
          if (faixas[faixas.length - 1]?.ate !== 100) {
            ctx.addIssue({ code: 'custom', message: 'a última faixa tem que terminar em 100' });
          }
        }),
      /** Para onde o humor caminha quando nada o empurra. */
      alvoBase: z.number().int().min(0).max(100),
      /** Quanto o humor anda por turno em direção ao alvo. Gradual, nunca salto. */
      passoPorTurno: z.number().int().positive(),
      /** Queda imediata quando a cidade é tomada. É o único movimento não gradual. */
      choqueDaConquista: z.number().int().nonnegative(),
      /**
       * O que empurra o alvo, somado sobre a base — tudo pela situação da PRÓPRIA
       * província: só quem passa fome recebe o peso da fome, sem parcela nacional.
       */
      alvo: z.object({
        /** A própria província passando fome: dependente num reino de saldo civil
         *  negativo, ou sitiada com a despensa vencida. */
        fome: z.number().int(),
        sitiada: z.number().int(),
        /** Dono atual diferente do dono de 700 a.C.: o povo vive sob bandeira alheia. */
        dominioEstrangeiro: z.number().int(),
      }),
      revolta: z.object({
        /** Turnos consecutivos na faixa revoltosa até o levante armado. */
        turnos: z.number().int().positive(),
        /** Fração da população que pega em armas no levante. */
        fracaoRebelde: z.number().gt(0).max(1),
      }),
    }),
    /**
     * O que custa pôr e manter gente em armas.
     *
     * **Soldado sai da população da província**, não do nada: recrutar tira habitante de
     * onde se recruta, e por isso encolhe o imposto dali e aperta o próprio teto de
     * recrutamento. É o que impede exército de brotar de um tesouro grande.
     */
    combate: z.object({
      /** Ouro por homem, pago à vista no recrutamento. */
      custoPorHomem: z.number().positive(),
      /**
       * Ouro por homem por turno, enquanto ele estiver em armas.
       *
       * É o ralo que a economia não tinha: incentivo e construção não absorvem tesouro
       * grande, exército sim, porque cobra todo turno e não expira.
       */
      manutencaoPorHomem: z.number().positive(),
      /**
       * Habitantes que uma província **nunca** cede. Abaixo disso ela não levanta leva.
       *
       * A mesma ideia do mínimo de população de _Rome: Total War_: existe um resto de
       * gente — mulheres, crianças, velhos, quem lavra — que não vira soldado por mais
       * dinheiro que haja.
       *
       * ⚠️ **É piso no que SOBRA, não porteiro na entrada.** "Recusar quando a população
       * está abaixo do mínimo" deixaria uma cidade de 2.001 habitantes ceder os 2.001 de
       * uma vez. A conta é `população − mínimo`.
       *
       * ⚠️ **O que ele protege de verdade é a província pequena, e a razão está no
       * crescimento.** `calcularCrescimentoPopulacional` faz `Math.floor(bruto)`, e com
       * `taxaNatural` de 1% isso significa que **abaixo de ~100 habitantes o crescimento
       * arredonda para zero e a província morre para sempre.** Sem o piso, um império rico
       * paga para raspar uma vila até esse ponto e ela nunca mais volta.
       *
       * Em Atenas ele nem chega a agir: o custo da tropa trava a mobilização muito antes.
       */
      populacaoMinima: z.number().int().nonnegative(),
      /**
       * Quem defende a província sem ter sido recrutado.
       *
       * ⚠️ **Fraca de propósito.** 120 dos 148 poderes começam com uma província só, e uma
       * milícia forte tornaria a primeira conquista impossível pra 81% do mapa. Ela existe
       * pra não ser ignorada e pra que o CERCO possa existir — sem defensor, província
       * alheia cai no instante em que alguém pisa nela.
       */
      /**
       * O cerco.
       *
       * ⚠️ **Nenhum destes é velocidade de cerco.** Sitiar continua não tomando a cidade e
       * não andando em direção a nada; quem toma é o assalto, e o que decide o assalto é a
       * muralha. O segundo número diz há quanto tempo é preciso estar sentado para poder
       * ir para cima, não o quanto falta para a cidade cair sozinha.
       */
      cerco: z.object({
        /**
         * Quanto a milícia vale atrás da muralha, no assalto.
         *
         * É bônus de POSIÇÃO, de toda cidade. A construção Muralha dobra a milícia antes
         * disto, e os dois se multiplicam.
         */
        bonusDeMuralha: z.number().min(1),
        /**
         * Quantas rodadas de cerco uma cidade fortificada exige antes de poder ser
         * assaltada.
         *
         * Vale só para as construções marcadas com `impedeAssaltoImediato`; cidade aberta
         * cai no primeiro assalto. Valor inicial de teste, não de balanceamento final.
         */
        rodadasParaAssaltarMuralha: z.number().int().min(0),
      }),
      milicia: z.object({
        /** Fatia da população que pega em armas na defesa. 0,012 é 1,2%. */
        fracao: z.number().gt(0).max(1),
        /**
         * Fatia da milícia que MORRE quando a defesa é derrotada; o resto dispersa.
         *
         * Aniquilar a milícia inteira arruinaria a província pro resto da campanha — são
         * os mesmos lavradores que pagam tributo e que fornecem recruta.
         */
        fracaoMorta: z.number().gt(0).max(1),
      }),
      /**
       * Fronteiras que uma hoste atravessa por rodada. A regra-base é uma.
       *
       * A estrutura continua aceitando mais trechos para uma futura estrada ou marcha
       * forçada, mas isso precisa ser um bônus explícito — nunca a velocidade escondida
       * de toda hoste. Assim Atenas → Elêusis → Mégara exige duas rodadas.
       */
      saltosPorRodada: z.number().int().positive(),
    }),
  }),
  camera: z.object({
    /** Teto de aproximação. O piso não se ajusta: é o zoom em que o mapa inteiro cabe. */
    zoomMaximo: z.number().positive(),
    /** Velocidade da câmera pelo teclado, em pixels do palco por segundo. */
    velocidadeLivre: z.number().positive(),
    /** Fator de zoom por entalhe da roda do mouse. */
    passoDaRoda: z.number().gt(1),
  }),
  provincias: z.object({
    /** Quanto o preenchimento político cobre o terreno. 1 apaga o mapa físico. */
    opacidade: z.number().min(0).max(1),
    corFronteira: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'cor deve ser #rrggbb'),
    /** 0 some com a fronteira, 1 desenha linha cheia. */
    forcaFronteira: z.number().min(0).max(1),
    /**
     * Espessura da linha de fronteira, em pixels do palco. Vale em qualquer zoom: o
     * shader mede a distância até a fronteira em pixels de tela, não em texels.
     */
    larguraDaLinha: z.number().positive(),
    corSelecao: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'cor deve ser #rrggbb'),
    /** Cobertura que o destaque garante sozinho, mesmo com as cores dos reinos desligadas. */
    forcaSelecao: z.number().min(0).max(1),
  }),
  /**
   * Ritmo do que o mapa mostra ao virar o turno. **É ilustração, nunca regra** — mudar
   * estes números não muda resultado de partida nenhum.
   */
  animacao: z.object({
    /**
     * Quanto uma hoste leva pra andar UM trecho da rota.
     *
     * Por salto, e não por marcha: uma marcha de dois saltos leva o dobro, e é assim que
     * a distância percorrida se lê na tela. Curto demais e a peça pisca de um lado pro
     * outro; longo demais e passar o turno vira espera.
     */
    segundosPorSaltoDeMarcha: z.number().positive(),
    /** Quanto o pulso de chegada dura depois que a peça assenta no destino. */
    segundosDoPulsoDeChegada: z.number().positive(),
  }),
  detalhes: z.object({
    alturaArvore: z.number().positive(),
    /** Faixa de zoom em que a camada de objetos entra. */
    zoomInicio: z.number().positive(),
    zoomCheio: z.number().positive(),
    /** Faixa de zoom em que o grão de chão entra. */
    graoInicio: z.number().positive(),
    graoFim: z.number().positive(),
    graoOpacidade: z.number().min(0).max(1),
  }),
});

export type Ajustes = z.infer<typeof Ajustes>;

/**
 * A tropa que já estava em pé em 700 a.C.
 *
 * Arquivo separado da economia de propósito: economia é o que a terra dá, isto é a
 * situação militar em que o mapa abre. Enquanto não há IA, é o que faz existir alguém
 * armado do outro lado da fronteira.
 */
export const Exercitos = z.object({
  versao: z.literal(1),
  comentario: z.string().optional(),
  /**
   * Homens em pé por província. A hoste é do dono dela no começo da partida.
   *
   * ⚠️ Eles **saem da população** escrita em `economia.json`. Ver
   * `src/combate/guarnicao-inicial.ts` — o manancial humano é um só.
   */
  guarnicoes: z.record(z.string(), z.number().int().positive()),
});

export type Exercitos = z.infer<typeof Exercitos>;

/**
 * O recorte político do mundo, assado por `npm run gerar-provincias`.
 *
 * Este arquivo é SAÍDA de ferramenta, não conteúdo escrito à mão — o conteúdo é
 * `dados/provincias.json`, com as sementes. Aqui chegam os índices, as áreas medidas e
 * a vizinhança, que é o que exército vai usar pra andar de província em província.
 */
export const Provincias = z.object({
  versao: z.literal(1),
  epoca: z.string().min(1),
  resolucao: z.object({ largura: z.number().positive(), altura: z.number().positive() }),
  dimensoes: z.object({ largura: z.number().positive(), altura: z.number().positive() }),
  poderes: z
    .array(
      z.object({
        id: z.string().min(1),
        nome: z.string().min(1),
        povo: z.string().min(1),
        cor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'cor deve ser #rrggbb'),
      }),
    )
    .min(1),
  provincias: z
    .array(
      z.object({
        /** Índice gravado em provincias.png. 0 é reservado pro mar. */
        indice: z.number().int().positive(),
        id: z.string().min(1),
        nome: z.string().min(1),
        regiao: z.string().min(1),
        dono: z.string().min(1),
        areaKm2: z.number().nonnegative(),
        centro: z.object({ x: z.number(), y: z.number() }),
        vizinhas: z.array(z.string().min(1)),
      }),
    )
    .min(1),
});

export type Provincias = z.infer<typeof Provincias>;

/**
 * Economia autoral por província: o que é permanente e vive nos dados.
 *
 * Produto e nível são fixos — investir compra exploração temporária, não
 * muda o que a terra tem. O valor de cada produto mora no CATÁLOGO e não se repete nas
 * províncias: assim balancear todos os territórios de um produto é mudar um número só.
 *
 * **Província que não está aqui não tem economia configurada.** Ela não arrecada e não é
 * simulada, e a interface diz isso com todas as letras. Não existe fórmula de reserva:
 * duas economias diferentes escondidas no mesmo jogo seria pior que uma economia
 * incompleta.
 */
export const Economia = z
  .object({
    versao: z.literal(1),
    comentario: z.string().min(1),
    produtos: z.record(
      z.string().min(1),
      z.object({
        nome: z.string().min(1),
        /** Moedas por nível. Grão e prata não valem o mesmo. */
        valor: z.number().positive(),
        /**
         * Se este produto alimenta gente.
         *
         * O nível de cada produto alimentar soma pontos à capacidade anual do reino.
         * Mármore e prata nunca entram nessa conta por mais valiosos que sejam.
         */
        alimento: z.boolean(),
      }),
    ),
    /**
     * Catálogo dos povos. Só nome: nacionalidade não tem número próprio.
     *
     * Nacionalidade pertence à POPULAÇÃO, não à província nem ao
     * poder, e uma província tem várias ao mesmo tempo. Manter um catálogo aqui é o que
     * impede "eleusina" e "eleusino" virarem dois povos por causa de um erro de digitação.
     */
    nacionalidades: z.record(z.string().min(1), z.object({ nome: z.string().min(1) })),
    provincias: z.record(
      z.string().min(1),
      z.object({
        populacao: z.number().int().positive(),
        /** Id de uma entrada do catálogo de produtos. */
        produto: z.string().min(1),
        /**
         * Quanto a terra dá daquele produto, de 1 a 5. **Fixo.**
         *
         * Chamava-se "potencial", e o nome foi trocado porque prometia o que o sistema não
         * faz: potencial soa como coisa que se desenvolve. Nível é grau, é identidade da
         * terra — investir paga mais gente pra explorar o que já existe, e nunca sobe isto.
         */
        nivel: z.number().int().min(1).max(5),
        /**
         * Quanto da produção vira comércio. É posição, porto e rota — é o que deixa uma
         * província enriquecer vendendo, e não só produzindo.
         */
        comercioBase: z.number().nonnegative(),
        /**
         * O segundo produto da terra, sempre mais fraco que o principal.
         *
         * ⚠️ **Mais fraco em RENDIMENTO, não em nível** — o cruzamento é conferido embaixo.
         * "Nível menor" seria a regra errada: grão nível 3 rende menos que prata nível 2, e
         * o que faz o principal ser o principal é o que ele entrega, não o algarismo.
         *
         * Ele não entra na renda atual de propósito: somar mais uma parcela sem a regra de
         * circulação pronta seria balancear duas vezes. O dado já existe porque a região de
         * teste deve estar completa antes dos sistemas que a consomem.
         */
        secundario: z.object({
          produto: z.string().min(1),
          nivel: z.number().int().min(1).max(5),
        }),
        /**
         * De que povo é a população, em frações que somam 1.
         *
         * Enquanto cada cidade se governa isto não pesa em nada. Ele existe pro dia em que
         * Atenas tomar Elêusis e passar a mandar em 85% de gente que não é dela. A tensão é
         * consequência de conquista, e por isso o dado tem
         * que estar escrito antes da conquista, não depois.
         */
        nacionalidades: z.record(z.string().min(1), z.number().gt(0).max(1)),
        /** Humor inicial, de 0 a 100. As faixas com nome estão em `ajustes.json`. */
        felicidade: z.number().int().min(0).max(100),
        /** O que já está de pé em 700 a.C.: id do catálogo para nível I, II ou III. */
        construcoes: z.record(z.string().min(1), z.number().int().min(1).max(3)),
        /**
         * Se a costa daqui abriga navio.
         *
         * **Não é um porto construído** — é a terra permitir um. Este campo é a pergunta
         * que os futuros sistemas naval e de construção de portos vão fazer. Maratona é o
         * caso que justifica o campo existir: ela é
         * litorânea e não tem abrigo nenhum, então estar no mar não vale de nada.
         */
        ancoradouro: z.boolean(),
        /** Por que esta província é assim. Documentação junto do dado, não longe dele. */
        motivo: z.string().min(1),
        /** Por que ela COMEÇA assim: povo, humor e o que já está de pé. */
        motivoDaFicha: z.string().min(1),
      }),
    ),
  })
  .superRefine((economia, ctx) => {
    // ⚠️ Cruzamentos que o Zod não faz sozinho. Um id de produto errado numa província
    // passaria como string válida e viraria produção zero em silêncio meses depois — o
    // tipo de bug que aparece como "por que Tanagra não rende nada?" muito longe daqui.
    for (const [id, ficha] of Object.entries(economia.provincias)) {
      const onde = ['provincias', id];
      const principal = economia.produtos[ficha.produto];
      const segundo = economia.produtos[ficha.secundario.produto];

      if (!principal) {
        ctx.addIssue({
          code: 'custom',
          path: [...onde, 'produto'],
          message: `produto desconhecido: ${ficha.produto}`,
        });
      }
      if (!segundo) {
        ctx.addIssue({
          code: 'custom',
          path: [...onde, 'secundario'],
          message: `produto desconhecido: ${ficha.secundario.produto}`,
        });
      }
      // ⚠️ A terra dá duas coisas DIFERENTES. Repetir o produto passaria pela regra de
      // rendimento (basta o nível ser menor) e chegaria aos sistemas como duas fontes do
      // mesmo item — uma soma que ninguém entenderia ao ler o dado.
      if (ficha.secundario.produto === ficha.produto) {
        ctx.addIssue({
          code: 'custom',
          path: [...onde, 'secundario'],
          message: `o secundário não pode ser o próprio principal: ${ficha.produto}`,
        });
      }
      if (
        principal &&
        segundo &&
        segundo.valor * ficha.secundario.nivel >= principal.valor * ficha.nivel
      ) {
        ctx.addIssue({
          code: 'custom',
          path: [...onde, 'secundario'],
          message: 'o secundário tem que render menos que o principal',
        });
      }

      const soma = Object.values(ficha.nacionalidades).reduce((total, f) => total + f, 0);
      if (Math.abs(soma - 1) > 0.001) {
        ctx.addIssue({
          code: 'custom',
          path: [...onde, 'nacionalidades'],
          message: `as frações somam ${soma}, e têm que somar 1`,
        });
      }
      for (const povo of Object.keys(ficha.nacionalidades)) {
        if (!economia.nacionalidades[povo]) {
          ctx.addIssue({
            code: 'custom',
            path: [...onde, 'nacionalidades'],
            message: `povo desconhecido: ${povo}`,
          });
        }
      }
    }
  });

export type Economia = z.infer<typeof Economia>;

/**
 * Construções permanentes em quatro slots, com níveis I–III.
 *
 * O efeito mora no catálogo e não se repete nas províncias — balancear todas as Ágoras
 * do mapa é mudar um número só, exatamente como acontece com o valor dos produtos.
 *
 * **Por que uma parcela cada, e não um bônus genérico:** como impostos, produção e
 * comércio pesam diferente em cada província, a melhor construção muda de lugar pra
 * lugar. Atenas tem muita gente e quer Ágora; Sunião tem minério e pode erguer Mina.
 */
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
       * retorno. O Quartel não rende nada hoje: reserva um slot para qualidade militar
       * futura, enquanto Fazenda compra alimento e Ágora compra arrecadação.
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
          parcela: z.enum(['impostos', 'producao', 'comercio']),
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
      /** Por que ela existe e onde ela vale. Documentação junto do dado. */
      motivo: z.string().min(1),
    }),
  ),
});

export type Construcoes = z.infer<typeof Construcoes>;
