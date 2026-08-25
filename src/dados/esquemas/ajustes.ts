/**
 * Ajustes de jogo — números que se calibram jogando, não algoritmo.
 *
 * A fronteira é essa: o que um designer mexe pra o jogo ficar bom mora aqui e em
 * `dados/ajustes.json`; matemática de algoritmo (pesos de suavização, transformada de
 * distância, conversão de coordenada) fica no código, porque mexer nela quebra a lógica em
 * vez de calibrar o jogo.
 *
 * Este esquema é a documentação do arquivo, e é o que um editor futuro vai ler pra saber
 * quais campos existem e que valores aceitam.
 */

import { z } from 'zod';

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
       *
       * ⚠️ **Este número decide se a economia é sobre TERRA ou sobre CABEÇAS.** Ele já
       * esteve em 0,005, e nessa altura o imposto sozinho variava 15,8× no mapa (8 a 126)
       * enquanto a produção variava 3,3× — população era o único dial com faixa larga, e
       * por isso mandava em tudo. Uma província pequena e rica não conseguia existir.
       */
      impostoPorHabitante: z.number().positive(),
      /**
       * Quanto do SEGUNDO produto da terra entra na produção. 0,5 é metade.
       *
       * Toda província tem dois produtos autorais, com nível escrito, e por muito tempo o
       * segundo não rendia um centavo — metade da autoria econômica estava desligada da
       * economia. O esquema de `economia.json` dizia que era de propósito, "sem a regra de
       * circulação pronta seria balancear duas vezes": a rede de trocas é essa regra, e ela
       * existe desde a 0.0.5. A condição do adiamento foi cumprida.
       *
       * Entra com peso menor que 1 porque o principal continua sendo o principal — a
       * validação cruzada de `economia.json` garante que ele rende mais.
       */
      pesoDoSecundario: z.number().nonnegative().max(1),
      /**
       * O que `comercioBase` vale em moedas quando cheio.
       *
       * ⚠️ **O comércio deixou de ser filho da produção.** Era `produção × comercioBase`,
       * e por isso Corinto — a potência comercial grega, com o maior `comercioBase` do mapa
       * — tirava 21% da renda do comércio: um entreposto cujo comércio é um quinto da renda
       * não é entreposto. Comércio é POSIÇÃO, porto e rota; ele não pode depender do
       * tamanho da própria lavoura. Agora `comercioBase` multiplica esta escala e nada
       * mais, e uma cidadezinha de porto pode viver do mar sem plantar nada.
       */
      escalaDeComercio: z.number().positive(),
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
      /**
       * As faixas de população: **quanto cada província pesa na mesa do reino.**
       *
       * ⚠️ **Absolutas, não relativas à própria província.** A regra anterior media o
       * crescimento de cada terra contra ela mesma, e por isso Atenas com 35.000 e Salamina
       * com 3.000 custavam o mesmo ponto: o tamanho não importava para a comida, só a
       * variação dele. Com faixas absolutas, a Ática populosa e pobre em cereal passa a
       * sentir o que os próprios dados dizem sobre ela.
       *
       * **Não é upgrade de província.** Não se compra faixa, não há prédio de governo que a
       * suba, e não existe punição por "não atualizar" a cidade — quem faz a província
       * evoluir são as construções. A faixa só lê a população e diz quanto ela come.
       *
       * A ÚLTIMA faixa não tem `ate`: ela pega tudo acima da anterior, e é isso que garante
       * que nenhuma população fique sem faixa. As demais sobem em ordem.
       */
      faixas: z
        .array(
          z.object({
            /** Último habitante que ainda pertence à faixa. Ausente só na última. */
            ate: z.number().int().positive().optional(),
            nome: z.string().min(1),
            /** Pontos de alimento que a província consome por turno. */
            custo: z.number().int().nonnegative(),
          }),
        )
        .min(1)
        .superRefine((faixas, ctx) => {
          for (let i = 1; i < faixas.length; i++) {
            const anterior = faixas[i - 1]?.ate;
            const atual = faixas[i]?.ate;
            if (anterior === undefined) {
              ctx.addIssue({ code: 'custom', message: 'só a última faixa pode não ter `ate`' });
            } else if (atual !== undefined && atual <= anterior) {
              ctx.addIssue({ code: 'custom', message: 'as faixas têm que subir' });
            }
          }
          if (faixas[faixas.length - 1]?.ate !== undefined) {
            ctx.addIssue({
              code: 'custom',
              message: 'a última faixa tem que ficar sem `ate` para pegar o resto',
            });
          }
        }),
    }),
    construcoes: z.object({
      slotsPorProvincia: z.number().int().positive(),
      /**
       * O peso econômico cujo preço de obra é o do catálogo. Acima custa mais, abaixo menos.
       *
       * Ver `campanha/custo-de-obra.ts`: preço fixo contra renda variável deixava a terra
       * pequena sem decisão nenhuma por quinze turnos, e escalar por população punia a
       * grande, cuja produção não cresce com o número de habitantes.
       */
      pesoDeReferencia: z.number().positive(),
      /** Piso do multiplicador de preço, para a vila de 3.000 não construir de graça. */
      escalaMinima: z.number().positive(),
      /** Teto do multiplicador, para a metrópole futura não ficar sem construir nunca. */
      escalaMaxima: z.number().positive(),
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
       * Ouro por homem por turno — e **o preço muda com onde o homem está pisando.**
       *
       * É o ralo que a economia não tinha: incentivo e construção não absorvem tesouro
       * grande, exército sim, porque cobra todo turno e não expira. Mas cobrar soldo de
       * mercenário por uma falange parada em casa quebrava justamente as cidades que a
       * autoria fez fortes e pobres — Tebas abria em −42 por turno.
       *
       * Em casa (qualquer província SUA) o homem é cidadão-lavrador: come da própria
       * terra, e a comida já o cobra no balanço alimentar. Em terra alheia ele é campanha:
       * comboio, forragem e soldo, e o cofre sente. **É sair de casa que custa.**
       *
       * A consequência de desenho: sitiar drena, e TOMAR a província faz a tropa virar
       * guarnição e o custo despencar no mesmo turno — cerco longo pesa, conquista
       * decisiva alivia. E a divisão de trabalho fica limpa: a COMIDA diz quantos homens
       * você pode ter, o OURO diz por quanto tempo pode mantê-los fora.
       */
      manutencaoPorHomem: z.object({
        /** Em província do próprio poder. */
        emCasa: z.number().positive(),
        /** Em terra de outro — inclusive sitiando. */
        emCampanha: z.number().positive(),
      }),
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
       * ⚠️ **Fraca de propósito.** 111 dos 139 poderes começam com uma província só, e uma
       * milícia forte tornaria a primeira conquista impossível pra 80% do mapa. Ela existe
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
         * Quantas rodadas de cerco uma cidade fortificada exige antes de poder ser
         * assaltada.
         *
         * Vale só para as construções marcadas com `impedeAssaltoImediato`; cidade aberta
         * cai no primeiro assalto. Valor inicial de teste, não de balanceamento final.
         */
        rodadasParaAssaltarMuralha: z.number().int().min(0),
      }),
      /**
       * A BATALHA: choque e perseguição, com dois botões de letalidade separados.
       *
       * ⚠️ **É a diferença entre os dois que faz a guerra ter forma.** No choque morre
       * pouco; na fuga morre muito. Um exército que sai antes de quebrar preserva quase
       * tudo, e é por isso que recuar é decisão em vez de covardia — sem os dois botões
       * separados, recuar seria só perder mais devagar.
       *
       * O choque é a lei quadrada em forma de rodadas: cada lado tira do outro uma fatia
       * da PRÓPRIA força, simultaneamente. Levada até o fim, ela dá exatamente
       * `√(maior² − menor²)`, que era a conta anterior — a diferença é que **ela para
       * antes**, na quebra. É a parada que salva o perdedor e preserva o vencedor: exército
       * antigo não lutava até o último homem, e o que decidia a batalha era a linha ceder.
       */
      batalha: z.object({
        /** Quantas rodadas o choque dura, no máximo, se ninguém quebrar antes. */
        rodadasDeChoque: z.number().int().positive(),
        /**
         * Fatia da própria força que um lado tira do inimigo por rodada de choque.
         *
         * Sobe isto e as batalhas viram aniquilação mútua; desce e ninguém quebra dentro
         * das rodadas, e toda batalha termina empatada e cara.
         */
        letalidadeDoChoque: z.number().gt(0).max(1),
        /**
         * Fatia das baixas que faz a linha CEDER. 0,4 é "perdi 40% e quebrei".
         *
         * É este número que dá chance ao defensor menor: o atacante também quebra, e uma
         * força maior que sangra primeiro perde a batalha que a aritmética dizia ser dela.
         */
        limiarDeQuebra: z.number().gt(0).max(1),
        /**
         * Fatia dos que sobraram do lado quebrado que morre na fuga.
         *
         * Alta de propósito: falange quebrada é chacina, e é aqui que a guerra antiga
         * cobra. O que escapa é gente viva — volta para a terra natal, e essa é a
         * diferença entre perder um exército e perder uma geração.
         */
        letalidadeDaPerseguicao: z.number().gt(0).max(1),
        /**
         * Fatia que um lado perde ao SAIR DE CAMPO ordenado, antes de quebrar.
         *
         * Pequena de propósito, e é a diferença para a perseguição que faz o recuo ser
         * decisão: quem sai a tempo continua sendo um exército; quem quebra perde a hoste e
         * manda os homens para casa.
         */
        fracaoDoRecuo: z.number().gt(0).max(1),
        /**
         * Em que fração de baixas a ordem "recuar se virar" sai de campo.
         *
         * Tem que ser MENOR que `limiarDeQuebra`, senão a linha cede antes e a ordem nunca
         * chega a valer nada — recuar é decisão de hora.
         */
        limiarDeRecuo: z.number().gt(0).max(1),
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
