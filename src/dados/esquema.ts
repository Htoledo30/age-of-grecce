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
      investimento: z.object({
        /**
         * Maior quantia que se pode pôr numa província de uma vez, e a que compra o teto.
         *
         * O bônus é medido EM RELAÇÃO a ela: investir o máximo dá o teto, metade dá
         * metade do teto. Sem essa âncora o número não significava nada — três moedas
         * compravam 1%, que é o tipo de conta que faz o jogador desconfiar do jogo.
         */
        maximo: z.number().int().positive(),
        /** Teto do bônus. O nível da terra continua sendo quem manda. */
        teto: z.number().gt(0).max(1),
        /**
         * Forma da curva entre zero e o máximo. **1 é regra de três**: 30.000 está para
         * 25% assim como 300 está para 0,25%. Abaixo de 1 a curva encurva pra cima e as
         * quantias pequenas passam a render mais que o proporcional — é o botão pra girar
         * se investir pouco parecer inútil demais.
         */
        expoente: z.number().gt(0).max(1),
        /** Quantas ARRECADAÇÕES o incentivo atravessa antes de acabar. */
        arrecadacoes: z.number().int().positive(),
      }),
    }),
    /** Crescimento natural por província, aplicado uma vez ao passar o turno. */
    populacao: z.object({
      /** Taxa máxima por turno, antes da falta de espaço e das construções. */
      taxaNatural: z.number().gt(0).max(1),
      /** Capacidade da província como múltiplo de sua população inicial autoral. */
      fatorCapacidade: z.number().gt(1),
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
       * ⚠️ Um número só, e é de propósito: **sitiar não toma a cidade**, então não existe
       * velocidade de cerco para ajustar. Quem toma é o assalto, e o que decide o assalto
       * é a muralha.
       */
      cerco: z.object({
        /**
         * Quanto a milícia vale atrás da muralha, no assalto.
         *
         * É bônus de POSIÇÃO, de toda cidade. A construção Muralha dobra a milícia antes
         * disto, e os dois se multiplicam.
         */
        bonusDeMuralha: z.number().min(1),
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
export const Economia = z.object({
  versao: z.literal(1),
  comentario: z.string().min(1),
  produtos: z.record(
    z.string().min(1),
    z.object({
      nome: z.string().min(1),
      /** Moedas por nível. Grão e prata não valem o mesmo. */
      valor: z.number().positive(),
    }),
  ),
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
      /** Por que esta província é assim. Documentação junto do dado, não longe dele. */
      motivo: z.string().min(1),
    }),
  ),
});

export type Economia = z.infer<typeof Economia>;

/**
 * Construções econômicas: permanentes, caras, e cada uma melhora UMA parcela da renda.
 *
 * O efeito mora no catálogo e não se repete nas províncias — balancear todas as Ágoras
 * do mapa é mudar um número só, exatamente como acontece com o valor dos produtos.
 *
 * **Por que uma parcela cada, e não um bônus genérico:** como impostos, produção e
 * comércio pesam diferente em cada província, a melhor construção muda de lugar pra
 * lugar. Atenas tem 35.000 habitantes e quer Ágora; Sunião tem metais preciosos nível V
 * e quer Oficina. A decisão nasce dos números, sem regra especial nenhuma.
 */
export const Construcoes = z.object({
  versao: z.literal(1),
  comentario: z.string().min(1),
  construcoes: z.record(
    z.string().min(1),
    z.object({
      nome: z.string().min(1),
      /** Pago à vista e uma vez só. O efeito não expira. */
      custo: z.number().int().positive(),
      /**
       * Turnos de obra antes de a construção começar a render.
       *
       * Varia por construção de propósito: prazo igual pra todas não informaria nada e
       * seria só atrito. Variando, ele vira mais um eixo da escolha — barata e rápida
       * contra cara e lenta — e acompanhar o custo faz isso ler sem explicação.
       */
      turnos: z.number().int().positive(),
      /**
       * Em que moeda esta construção paga.
       *
       * **Nem toda construção paga em ouro, e é isso que faz a lista ser uma escolha.**
       * Se todas rendessem moeda, escolher seria aritmética: bastaria pegar a de maior
       * retorno. O Quartel não rende nada e mesmo assim é a obra mais cara do catálogo,
       * porque o que ele compra é a capacidade de recrutar — e isso não se compara com
       * "+70 por turno" numa conta só.
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
          /** Multiplica a parcela. 1,4 é mais 40%. */
          fator: z.number().gt(1),
        }),
        z.object({
          tipo: z.literal('capacidade'),
          /** O que a província passa a poder fazer. */
          capacidade: z.enum(['recrutar']),
          /** A promessa, escrita pro jogador. Fica no dado, não no código da interface. */
          promessa: z.string().min(1),
        }),
        z.object({
          tipo: z.literal('milicia'),
          /**
           * Multiplica a milícia da província. 2 é o dobro de defensores.
           *
           * Mesmo desenho do Celeiro sobre o crescimento: multiplica a DERIVAÇÃO. Não
           * existe número de guarnição guardado em lugar nenhum pra isto somar.
           */
          fatorMilicia: z.number().gt(1),
          /** A promessa genérica; a interface acrescenta os números da província. */
          promessa: z.string().min(1),
        }),
        z.object({
          tipo: z.literal('populacao'),
          /** Multiplica somente o crescimento natural. 1,5 é mais 50%. */
          fatorCrescimento: z.number().gt(1),
          /** A promessa genérica; a interface acrescenta os números da província. */
          promessa: z.string().min(1),
        }),
      ]),
      /** Por que ela existe e onde ela vale. Documentação junto do dado. */
      motivo: z.string().min(1),
    }),
  ),
});

export type Construcoes = z.infer<typeof Construcoes>;
