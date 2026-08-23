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
      /**
       * Crescimento por turno, antes das construções.
       *
       * ⚠️ **Não existe mais capacidade máxima** (`DECISOES.md` #48A): esta taxa é aplicada
       * direta, sem freio. O freio será o alimento, no patch 0.0.4. Até lá o crescimento é
       * exponencial — estado intermediário conhecido.
       */
      taxaNatural: z.number().gt(0).max(1),
    }),
    /**
     * Quanto o mundo come.
     *
     * ⚠️ **O consumo ainda NÃO é cobrado de ninguém.** Isto existe hoje como a régua que
     * dimensiona o estoque inicial da região de teste: `DECISOES.md` #11A pede cerca de
     * cinco turnos de sobrevivência, e sem uma taxa de consumo "cinco turnos" não é uma
     * frase verificável. O patch 0.0.4 do `ROADMAP.md` é que faz isto morder.
     */
    alimento: z.object({
      /**
       * Unidades de alimento que um habitante come por turno.
       *
       * 0,02 quer dizer que uma unidade alimenta cinquenta pessoas durante um turno — a
       * escala é arbitrária e existe pra que os estoques sejam números legíveis em vez de
       * dezenas de milhares.
       */
      consumoPorHabitante: z.number().positive(),
    }),
    /**
     * Como o número de felicidade vira palavra na tela.
     *
     * Internamente é 0–100; o jogador nunca vê o número cru. Ver `DECISOES.md` #68 — as
     * cinco faixas são a interface oficial, e ficam nos dados porque são conteúdo: mexer
     * no ponto em que uma província passa a "Revoltosa" é balanço, não código.
     */
    felicidade: z.object({
      /**
       * Da mais infeliz para a mais feliz. `ate` é o último valor que ainda pertence à
       * faixa, e a última tem que fechar em 100 — senão existe felicidade sem nome.
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
         * O patch 0.0.4 soma o estoque de todos os alimentos de uma província contra o que a
         * população dela come. Mármore e prata nunca entram nessa conta por mais valiosos
         * que sejam — é a distinção que faz Atenas ser rica e faminta ao mesmo tempo.
         */
        alimento: z.boolean(),
      }),
    ),
    /**
     * Catálogo dos povos. Só nome: nacionalidade não tem número próprio.
     *
     * Ver `DECISOES.md` #70 — nacionalidade pertence à POPULAÇÃO, não à província nem ao
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
         * Ele não entra na renda atual de propósito: somar mais uma parcela à economia que
         * o patch 0.0.3 vai substituir seria balancear duas vezes. O dado existe agora porque a
         * região de teste precisa estar completa ANTES dos sistemas que a consomem.
         */
        secundario: z.object({
          produto: z.string().min(1),
          nivel: z.number().int().min(1).max(5),
        }),
        /**
         * De que povo é a população, em frações que somam 1.
         *
         * Enquanto cada cidade se governa isto não pesa em nada. Ele existe pro dia em que
         * Atenas tomar Elêusis e passar a mandar em 85% de gente que não é dela — ver
         * `DECISOES.md` #72. A tensão é consequência de conquista, e por isso o dado tem
         * que estar escrito antes da conquista, não depois.
         */
        nacionalidades: z.record(z.string().min(1), z.number().gt(0).max(1)),
        /** Humor inicial, de 0 a 100. As faixas com nome estão em `ajustes.json`. */
        felicidade: z.number().int().min(0).max(100),
        /**
         * O que a província tem guardado em 700 a.C., por produto.
         *
         * `DECISOES.md` #11A pede cerca de cinco turnos de alimento na região de teste — o
         * bastante pro patch 0.0.4 poder ser testado sem que ninguém morra de fome no turno 2.
         * Um teste confere esses cinco turnos contra `alimento.consumoPorHabitante`, pra que
         * mexer na população não invalide o estoque em silêncio.
         */
        estoque: z.record(z.string().min(1), z.number().nonnegative()),
        /** O que já está de pé em 700 a.C. Ids do catálogo de construções. */
        construcoes: z.array(z.string().min(1)),
        /**
         * Se a costa daqui abriga navio.
         *
         * **Não é um porto construído** — é a terra permitir um. Naval está fora do 0.0.2
         * (`PATCH_ATUAL.md`), e o Porto é adaptação do patch 0.0.11; este campo é a pergunta
         * que os dois vão fazer. Maratona é o caso que justifica o campo existir: ela é
         * litorânea e não tem abrigo nenhum, então estar no mar não vale de nada.
         */
        ancoradouro: z.boolean(),
        /** Por que esta província é assim. Documentação junto do dado, não longe dele. */
        motivo: z.string().min(1),
        /** Por que ela COMEÇA assim: povo, humor, estoque e o que já está de pé. */
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
      for (const guardado of Object.keys(ficha.estoque)) {
        if (!economia.produtos[guardado]) {
          ctx.addIssue({
            code: 'custom',
            path: [...onde, 'estoque'],
            message: `produto desconhecido: ${guardado}`,
          });
        }
      }
    }
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
