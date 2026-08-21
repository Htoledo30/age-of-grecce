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
       * Moedas por habitante, por turno. É a parcela mais estável da renda: população é
       * dado autoral fixo nesta etapa, então imposto não oscila.
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
       * Maior fatia da população de uma província que pode estar em armas ao mesmo tempo.
       *
       * É este número, e não o ouro, que torna população um recurso estratégico: uma
       * província despovoada não vira exército por mais rico que seja o reino.
       */
      fracaoRecrutavel: z.number().gt(0).max(1),
      /** Lote mínimo de recrutamento. Impede recrutar de um em um. */
      minimoPorLeva: z.number().int().positive(),
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
      ]),
      /** Por que ela existe e onde ela vale. Documentação junto do dado. */
      motivo: z.string().min(1),
    }),
  ),
});

export type Construcoes = z.infer<typeof Construcoes>;
