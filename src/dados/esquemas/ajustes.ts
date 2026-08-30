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

/**
 * Uma arma: o que ela tira por rodada e o que ela suporta.
 *
 * ⚠️ Os dois números são RELATIVOS entre si, não absolutos: a letalidade do choque continua
 * mandando na escala. Dobrar os dois em todas as armas não muda batalha nenhuma.
 */
const Arma = z.object({
  /** Quanto este homem tira do inimigo por rodada, comparado a um hoplita. */
  ataque: z.number().positive(),
  /** Quanto ele suporta antes de virar baixa. Alto é linha que segura. */
  aguento: z.number().positive(),
  /** Ouro por homem no recrutamento, multiplicando `custoPorHomem`. */
  custo: z.number().positive(),
  /** Pontos de comida por homem, multiplicando o custo alimentar. Cavalo come. */
  comida: z.number().positive(),
});

/**
 * ⚠️ **Não existe teto de composição, e a ausência dele foi decidida com número na mão.**
 *
 * A primeira versão limitava cada arma a uma fração do exército. A medição mostrou que a
 * regra quase nunca morderia: cavalaria custa 2,2× em ouro e come 2,5× para bater 1,5×, ou
 * seja, **metade da eficiência do hoplita por ponto de comida**. Ninguém montaria exército de
 * cavalaria mesmo sem teto — o preço já dizia não, e um teto que não morde é uma regra que se
 * explica de graça.
 *
 * Quem raciona é o PREÇO e a CONSTRUÇÃO: o leve é livre, e as outras três exigem um prédio
 * naquela província — a Armaria em qualquer terra, o acampamento só onde há madeira, o
 * treinamento só onde há cavalos.
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
       * O que `transitoBase` vale em moedas quando cheio.
       *
       * ⚠️ **O trânsito deixou de ser filho da produção.** Era `produção × transitoBase`,
       * e por isso Corinto — a potência comercial grega, com o maior `transitoBase` do mapa
       * — tirava 21% da renda dali: um entreposto cujo pedágio é um quinto da renda não é
       * entreposto. Trânsito é POSIÇÃO, porto e rota; ele não pode depender do tamanho da
       * própria lavoura. Agora `transitoBase` multiplica esta escala e nada mais, e uma
       * cidadezinha de porto pode viver do mar sem plantar nada.
       *
       * ⚠️ **E ele exige ROTA até a capital.** Terra cortada do resto do reino não manda o
       * pedágio ao tesouro — é a única parcela em que isso vale, porque é a única que existe
       * por causa de um caminho. Imposto e produção continuam: o lavrador colhe e o coletor
       * cobra mesmo com o reino partido ao meio.
       */
      escalaDeTransito: z.number().positive(),
      /**
       * Os níveis de imposto por província: receita trocada por pressão social.
       *
       * O `fator` multiplica o imposto DEPOIS da corrupção; o `humor` entra no ALVO de
       * felicidade da província.
       *
       * ⚠️ **Os fatores são grandes porque o imposto é uma PARCELA, e o humor cobra sobre o
       * TODO.** Medido: o imposto é 13% a 48% da renda de uma província (mediana 27%), e
       * cada ponto de humor vale 1% da renda inteira. Com ×1,35 e −8 de humor, "alto" era
       * **negativo no equilíbrio em 6 das 25 províncias** — um botão que prometia mais
       * dinheiro e entregava menos. Foi a queixa de Henrique: *"mudar entre imposto baixo,
       * médio ou alto é uma mudança muito fraca"*. Com ×1,8 e −10, nenhuma fica negativa.
       *
       * ⚠️ **`confisco` é a alavanca de emergência, e ela se cobra sozinha.** ×3 no imposto
       * paga a guerra deste turno; −25 de humor derruba a província para a faixa do levante
       * em poucas viradas. Ela não é "alto, porém mais": é uma decisão com prazo.
       */
      imposto: z.object({
        niveis: z.object({
          baixo: NivelDeImposto,
          normal: NivelDeImposto,
          alto: NivelDeImposto,
          confisco: NivelDeImposto,
        }),
      }),
    }),
    /**
     * Diplomacia: os números de paz e guerra.
     *
     * Poucos de propósito. A diplomacia básica existe para uma coisa só — dar ao mapa um
     * motivo para NÃO estar em guerra com todo mundo —, e cada número a mais aqui é uma
     * regra a mais que o jogador teria de aprender antes de entender a primeira.
     */
    diplomacia: z.object({
      /**
       * Quantos turnos a trégua segura depois de uma paz assinada.
       *
       * ⚠️ **É o que faz a paz valer.** Sem trégua, fazer as pazes e redeclarar na virada
       * seguinte é grátis: a paz vira uma pausa para respirar no meio do mesmo assalto, e
       * quem está perdendo compra fôlego sem ceder nada.
       */
      tregoaEmTurnos: z.number().int().positive(),
      /**
       * Quantos pontos a opinião anda por turno em direção ao alvo.
       *
       * ⚠️ Gradual pela mesma razão que o humor do povo é: ninguém vira aliado de um dia para
       * o outro, e ninguém passa a te odiar porque uma fronteira mudou de lugar ontem.
       */
      passoPorTurno: z.number().positive(),
      /**
       * As parcelas do alvo da opinião — a conta que a tela mostra linha a linha.
       *
       * ⚠️ **Nenhuma parcela existe que o jogador não consiga ver no mapa.** É o que faz a
       * opinião nunca parecer arbitrária: guerra, trégua, fronteira comum e a terra dele que
       * está na sua mão são todas visíveis.
       */
      alvo: z.object({
        /** Onde dois reinos que nunca se esbarraram ficam. Zero: nem amor nem ódio. */
        base: z.number(),
        guerra: z.number(),
        /** Guerra recente ainda dói enquanto a trégua durar. */
        tregoa: z.number(),
        porProvinciaDeFronteira: z.number(),
        /** Teto do atrito de fronteira: o vigésimo quilômetro de divisa não dói mais. */
        fronteiraMaxima: z.number(),
        /** Por terra dele que está na sua mão — a memória da conquista, sem guardar memória. */
        porTerraTomada: z.number(),
        /** Dinheiro entrando dos dois lados aproxima. Ver `acordoDeComercio`. */
        acordoDeComercio: z.number(),
        terraTomadaMaxima: z.number(),
        /**
         * O que vale ser da MESMA TRIBO grega — dois jônios, dois dórios.
         *
         * ⚠️ **A única parcela positiva que a geografia produz sozinha, e ela nasceu de um
         * número medido: 250 dos 306 pares de poderes ficavam em opinião zero para sempre.**
         * As três parcelas positivas que existiam — comércio, pacto, tributo — só chegam por
         * assinatura, e ninguém assina com quem não conhece. Sem uma razão para gostar de
         * alguém do outro lado do mar, 82% da mesa era indiferença permanente.
         */
        mesmoPovo: z.number(),
        /** Por reino contra quem os DOIS lutam ao mesmo tempo. O inimigo do meu inimigo. */
        porInimigoComum: z.number(),
        /** Com teto, como a fronteira: o quinto inimigo comum não aproxima mais que o primeiro. */
        inimigoComumMaximo: z.number(),
        /**
         * Por década sem se enfrentarem. É o que faz a fronteira parar de ser veneno eterno.
         *
         * ⚠️ Sem ele, vizinhança dava −5 por província e NADA cicatrizava: dois vizinhos que
         * nunca se bateram seguiam em −20 no turno trezentos, e a IA não abre comércio com
         * opinião negativa. O parceiro natural era o pior parceiro possível.
         */
        porDecadaDePaz: z.number(),
        /** Teto da paz: ela sara a fronteira, não compra amizade eterna de graça. */
        pazMaxima: z.number(),
        /**
         * Por província de diferença de porte entre os dois — **a sombra do maior**.
         *
         * ⚠️ **A única parcela que reage à POSIÇÃO de alguém no mapa.** Antes dela um reino
         * engolia meia Grécia e só a vítima sentia: a conquista abalava um par. É a expansão
         * agressiva do EU4 e o "poderoso demais" do Total War — e, neste jogo, é Tucídides.
         */
        /**
         * Diferença de porte a partir da qual a sombra começa a pesar.
         *
         * ⚠️ **É o que separa sombra de ruído.** Sem limiar a parcela disparava entre dois
         * reinos pequenos — três províncias contra uma é o mapa inicial, não uma ameaça — e o
         * efeito medido foi a mesa inteira afundar: **as propostas ao jogador caíram de 54 para
         * ZERO em 150 turnos, em toda dose testada.**
         */
        sombraLimiar: z.number().int().nonnegative(),
        porProvinciaDeVantagem: z.number(),
        /** Teto: passado certo ponto ele já é grande demais, e mais uma não assusta mais. */
        sombraMaxima: z.number(),
        /**
         * Por reino que abraça o inimigo do outro — **o amigo do meu inimigo**.
         *
         * ⚠️ É o que faz a diplomacia ser ESCOLHA: sem ele, ser amigo de todo mundo é grátis e
         * sempre certo. Tínhamos só a metade positiva, o inimigo em comum.
         */
        porAmigoDoInimigo: z.number(),
        /** Teto, como o do inimigo em comum. */
        amigoDoInimigoMaximo: z.number(),
      }),
      /**
       * Os choques: o que um ATO faz com a opinião na hora, antes de ela voltar a caminhar.
       *
       * É por esta porta que toda ação diplomática entra — e é a mesma ideia do choque da
       * conquista sobre o humor do povo.
       */
      choque: z.object({
        /** Tomar uma terra dele à força. Some devagar se você não repetir. */
        conquista: z.number(),
      }),
      /**
       * O presente em ouro: quanto ele move a opinião, e até onde.
       *
       * ⚠️ Medido em TURNOS DE RENDA de quem recebe, e não em moedas: quinhentas moedas são
       * uma fortuna para quem arrecada cento e vinte e um troco para quem arrecada dois mil.
       */
      presente: z.object({
        /** O máximo que um presente pode valer, por maior que ele seja. */
        pontosMaximos: z.number().positive(),
        /**
         * Quantos turnos de renda dele compram METADE do efeito máximo.
         *
         * É a mesma curva de saturação da perseguição da cavalaria: os primeiros compram
         * quase tudo, e o resto rende pouco. Sem ela, dobrar o presente dobraria a amizade.
         */
        meiaRenda: z.number().positive(),
        /**
         * Quanto o ouro consegue levantar a opinião ACIMA do que os fatos justificam.
         *
         * ⚠️ É o freio que impede a diplomacia de virar loja: presente compra TEMPO, não
         * amizade. Quem quer o número lá em cima muda os fatos — assina pacto, abre comércio,
         * devolve a terra tomada.
         */
        tetoAcimaDoAlvo: z.number().positive(),
      }),
      /**
       * O pacto de não-agressão: prazos, o que ele vale, e o que custa rompê-lo.
       *
       * ⚠️ **O que estica o prazo não é ouro, é CONFIANÇA.** Pagar mais por um pacto mais longo
       * transformaria diplomacia em loja; exigir mais opinião faz o presente virar a entrada do
       * pacto — o ouro compra o momento, e o momento compra o prazo.
       */
      pacto: z.object({
        /** Os prazos oferecidos, do mais curto ao mais longo, com a opinião que cada um pede. */
        prazos: z
          .array(
            z.object({
              turnos: z.number().int().positive(),
              opiniaoMinima: z.number().min(-100).max(100),
            }),
          )
          .min(1),
        /** O que um pacto em pé vale na conta da opinião, enquanto durar. */
        pontos: z.number(),
        /** O tombo na opinião de quem foi traído. */
        choqueDeRuptura: z.number(),
        /** E o tombo na REPUTAÇÃO de quem traiu — este o mapa inteiro sente. */
        reputacaoDaRuptura: z.number(),
        /** Quantos pontos de reputação voltam por turno. Rancor não é eterno. */
        reputacaoPorTurno: z.number().positive(),
      }),
      /**
       * A ALIANÇA: o topo da escada, e o único acordo que obriga a FAZER.
       *
       * ⚠️ **Pede muito mais opinião que o pacto, e é por isso que ela não o canibaliza.** O
       * pacto é de graça e só te impede de atacar; a aliança te põe em guerras que você não
       * escolheu. Quem quer segurança sem risco assina pacto — e é a resposta certa para quase
       * todo mundo. Ver `campanha/diplomacia/alianca.ts`.
       */
      alianca: z.object({
        /** Os prazos oferecidos, com a opinião que cada um pede. Guerra emprestada é cara. */
        prazos: z
          .array(
            z.object({
              turnos: z.number().int().positive(),
              opiniaoMinima: z.number().min(-100).max(100),
            }),
          )
          .min(1),
        /** O que uma aliança em pé vale na conta da opinião. Acima do pacto, por definição. */
        pontos: z.number(),
        /** O tombo na opinião de quem foi abandonado. Maior que o do pacto. */
        choqueDeRuptura: z.number(),
        /** E o tombo na REPUTAÇÃO de quem abandonou — abandonar aliado é pior que romper pacto. */
        reputacaoDaRuptura: z.number(),
      }),
      /**
       * A LIGA: mandar num reino sem tomá-lo. Ver `campanha/diplomacia/liga.ts`.
       *
       * ⚠️ **O tributo daqui é para o membro o que o imposto é para uma província**, e a forma
       * é a mesma de propósito: mais ouro agora, mais vontade de sair depois. E o *desejo de
       * sair* é a terceira aparição da máquina do humor — um valor que anda em direção a um
       * alvo feito de parcelas com nome.
       */
      liga: z.object({
        /** Quanto cada nível tira da renda do membro, e o quanto ele empurra o desejo de sair. */
        niveisDeTributo: z.record(
          z.string().min(1),
          z.object({
            fracaoDaRenda: z.number().min(0).max(1),
            desejo: z.number(),
          }),
        ),
        /** O nível com que uma liga nasce. Tem de existir em `niveisDeTributo`. */
        tributoInicial: z.string().min(1),
        /** Passos do desejo por turno. Ninguém se revolta da noite para o dia. */
        passoPorTurno: z.number().positive(),
        alvo: z.object({
          /** Ninguém serve por gosto: a base é POSITIVA, e o resto empurra dela. */
          base: z.number(),
          /** Servir a quem é da tua tribo pesa menos. */
          mesmoPovo: z.number(),
          /**
           * Por província de vantagem do chefe. NEGATIVO: a sombra dele SEGURA o membro.
           *
           * ⚠️ Ao contrário da sombra do maior na opinião entre reinos, que afasta. Não é
           * contradição: lá o grande dá medo a quem o vê de fora; aqui o membro já está
           * dentro, e o mesmo medo é o que o faz pensar duas vezes antes de sair.
           */
          porProvinciaDeVantagem: z.number(),
          sombraMaxima: z.number(),
          /** Por década de liga. Costume acalma. */
          porDecadaNaLiga: z.number(),
          costumeMaximo: z.number(),
          /** A guerra do chefe é a parte da conta que o membro não escolheu. */
          chefeEmGuerra: z.number(),
        }),
        /** Cheio o desejo, ele sai e pega em armas. */
        limiarDaRevolta: z.number().min(0).max(100),
        /** No chão, ele aceita virar província — se o chefe pedir. */
        limiarDoSim: z.number().min(0).max(100),
        /**
         * Turnos de liga antes de a anexação ser sequer possível.
         *
         * ⚠️ **"Não se anexa quem entrou ontem", e sem esta linha a liga virava um cano.**
         * Medido em 150 turnos: as 6 ligas formadas terminaram em 4 anexações e nenhum membro
         * de pé — entrar e ser engolido virou um passo só, e o degrau que a liga deveria ser
         * desapareceu. Com o prazo, converter um membro é um investimento de décadas, que é o
         * que a Liga de Delos levou para virar império.
         */
        turnosParaAnexar: z.number().int().nonnegative(),
        /** Opinião mínima para entrar. Servir pede mais confiança que qualquer acordo. */
        opiniaoMinima: z.number().min(-100).max(100),
        /** O tombo na REPUTAÇÃO de quem rompe a liga antes da hora. */
        reputacaoDaRuptura: z.number(),
      }),
      /**
       * O ACESSO MILITAR: a licença de atravessar a terra de quem não é inimigo.
       *
       * ⚠️ **Exige MAIS confiança que o pacto curto, e menos que o longo.** O pacto é uma
       * promessa de não fazer; o acesso é uma chave da porta de casa. Pedir opinião de menos
       * transformaria toda fronteira em corredor, e a geografia — que é metade deste jogo —
       * deixaria de decidir qualquer coisa.
       *
       * ⚠️ **Revogar custa, mas custa menos que romper um pacto.** Fechar a própria estrada é
       * um direito; trair uma promessa de não atacar é outra coisa. Sem preço nenhum, porém, a
       * licença viraria armadilha: abre-se, o exército entra, fecha-se atrás dele.
       */
      acesso: z.object({
        prazos: z
          .array(
            z.object({
              turnos: z.number().int().positive(),
              opiniaoMinima: z.number().min(-100).max(100),
            }),
          )
          .min(1),
        /** O que uma passagem aberta vale na conta da opinião, enquanto durar. */
        pontos: z.number(),
        /** O tombo na opinião de quem teve a estrada fechada na cara. */
        choqueDeRevogacao: z.number(),
      }),
      /**
       * O TRIBUTO: o ano de sossego que se compra quando não há confiança para pedi-lo de graça.
       *
       * ⚠️ **É o pacto pelo avesso, e é isso que o mantém honesto.** O pacto não custa moeda e
       * exige opinião; o tributo não exige opinião nenhuma e custa ouro todo turno. Quem tem
       * confiança para o pacto seria tolo de pagar por um — então os dois nunca competem pelo
       * mesmo momento da partida, e o ouro entra exatamente onde a confiança não chega.
       */
      tributo: z.object({
        /**
         * Os prazos oferecidos, e o que cada um cobra por turno.
         *
         * ⚠️ **Prazo longo custa MENOS por turno, e é a lógica do aluguel.** Quem se compromete
         * por quarenta turnos ganha desconto; quem quer poder sair em dez paga o preço da
         * liberdade. Do lado de quem recebe a conta fecha igual: uma renda garantida por muito
         * tempo vale aceitar uma parcela menor, e amarrar as próprias mãos por só dez turnos
         * tem de ser bem pago para compensar a chance perdida de simplesmente invadir.
         *
         * ⚠️ E é o que dá peso ao rompimento: **assinar quarenta turnos barato e depois ficar
         * forte é estar preso** — ou pagar a reputação para sair. O desconto tem dono.
         *
         * A fatia é medida no bolso do PAGADOR, como o presente é medido no de quem recebe: um
         * número fixo seria esmola para o rico e ruína para o pobre.
         */
        prazos: z
          .array(
            z.object({
              turnos: z.number().int().positive(),
              fracaoDaRenda: z.number().positive(),
            }),
          )
          .min(1),
        /**
         * Que fatia da renda de QUEM RECEBE o tributo precisa alcançar para ser aceito.
         *
         * ⚠️ **É o freio que impede o pequeno de comprar o gigante.** Sem ele, Plateia compraria
         * Argos com troco e abriria mão de uma conquista por dezoito moedas. A consequência que
         * interessa cai de graça: só se compra quem é da sua escala.
         */
        materialidade: z.number().positive(),
        /**
         * De quantas vezes o exército do outro o recebedor precisa ter antes de o tributo fazer
         * sentido. Não se compra proteção de quem não te ameaça — seria ouro por nada.
         */
        vantagemMinima: z.number().positive(),
        /**
         * De quantos TURNOS de renda uma província conquistada vale, aos olhos da IA.
         *
         * ⚠️ **É a régua que compara ouro com terra**, e ela existe porque as duas coisas não
         * têm a mesma unidade: o tributo é uma renda que ACABA, a província é uma renda que
         * fica. Sem um horizonte escrito, comparar as duas seria comparar um pagamento com o
         * infinito, e a IA jamais venderia paz nenhuma.
         *
         * Número baixo faz a IA vender a paz fácil demais e a guerra vira pedágio; número alto
         * a faz recusar sempre e o tributo de pós-guerra morre. ⚠️ **Medir com `npm run
         * partida` antes de mexer** — é um dial de IA, e a resposta dela é caótica.
         */
        turnosDePremio: z.number().positive(),
        /**
         * O que um tributo em pé vale na conta da opinião.
         *
         * ⚠️ **Pequeno de propósito, e menor que o do comércio.** Ouro que se paga por medo não
         * é amizade: ele acalma o par o bastante para a opinião sair do fundo do poço com o
         * tempo, e não o bastante para virar atalho até um pacto de quarenta turnos.
         */
        pontos: z.number(),
        /** O tombo na opinião de quem foi traído por quem recebia e atacou assim mesmo. */
        choqueDeRuptura: z.number(),
        /** E o tombo na REPUTAÇÃO de quem rompeu. Vender o ano e invadir custa com todo mundo. */
        reputacaoDaRuptura: z.number(),
        /** O tombo na opinião quando o cofre do pagador não cobre o pagamento. */
        choqueDoCalote: z.number(),
        /** E o tombo na reputação do caloteiro. Prometer o que não se paga também é promessa. */
        reputacaoDoCalote: z.number(),
      }),
    }),
    /**
     * O acordo de comércio: a fonte de renda que a diplomacia abre.
     *
     * ⚠️ **Os dois lados ganham o MESMO número, sempre.** Decisão de Henrique, e ela reescreveu
     * o desenho: pagar só pelo bem que falta ao outro deixava metade dos pares do mapa ganhando
     * zero, porque quase todo mundo faz grãos e azeite.
     */
    acordoDeComercio: z.object({
      /**
       * Que fatia da renda do MENOR dos dois o acordo rende, por turno, para cada um.
       *
       * O menor dos dois porque um parceiro minúsculo não tem mercado a oferecer, e um gigante
       * não despeja em você mais do que você absorve. Sem esse teto, um reino de 118 de renda
       * dobraria de tamanho se pendurando num de 732.
       */
      fracaoDaMenorRenda: z.number().positive(),
      /**
       * Quantos parceiros valem METADE do rendimento total — a saturação.
       *
       * ⚠️ Sem ela a diplomacia vira um concurso de assinaturas, e comerciar passa a pagar
       * melhor que administrar. Mesma curva da perseguição da cavalaria e do presente.
       */
      meiosParceiros: z.number().positive(),
      /**
       * Opinião mínima para assinar.
       *
       * ⚠️ **Abaixo do que dois vizinhos normais têm, e é de propósito.** O atrito de fronteira
       * segura qualquer par de vizinhos em torno de −15; exigir opinião positiva tornaria o
       * comércio impossível justamente entre quem tem mais motivo para comerciar. Mercador
       * atravessa fronteira que exército não atravessa — o que barra o acordo é ódio de
       * verdade, do tamanho de uma terra tomada, e não a implicância de dividir uma divisa.
       */
      opiniaoMinima: z.number().min(-100).max(100),
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
        .array(
          z.object({
            ate: z.number().int().min(0).max(100),
            nome: z.string().min(1),
            /**
             * Turnos nesta faixa até o povo pegar em armas. Ausente = nunca se levanta.
             *
             * A faixa mais infeliz ferve rápido; a seguinte ferve devagar, e é essa a
             * diferença entre uma província que dá trabalho e uma que se perde.
             */
            levanteEm: z.number().int().positive().optional(),
          }),
        )
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
      /**
       * O que o humor faz com a RENDA da província — uma reta, e não degraus.
       *
       * ⚠️ **É a consequência que o humor não tinha.** A única em todo o sistema era a greve
       * fiscal da faixa revoltosa: entre 20 e 100 o número não mexia em nada, e por isso o
       * Templo não se pagava, o imposto alto não doía e o jogador dizia que o humor estava
       * *"todo travado"*. Medido antes: metade das províncias vivia em "Neutra" e "Muito
       * feliz" nunca acontecia.
       *
       * ⚠️ **Reta, e não faixa, porque faixa cria degrau invisível.** Com o fator preso à
       * faixa, o Templo I subia o alvo de 50 para 55 e não mudava nada — os dois valores
       * caem em "Neutra" —, e a obra continuava parecendo inútil. Na reta, cada ponto de
       * humor vale dinheiro, e qualquer coisa que acalme o povo se paga um pouco.
       *
       * ⚠️ **Sobre a renda INTEIRA, e não só o imposto.** Imposto é a menor das três parcelas
       * (13% da renda de Atenas): preso a ele, nenhum ajuste de humor competiria com um
       * Mercado. Povo contente lavra e comercia melhor; povo azedo faz corpo mole.
       */
      renda: z.object({
        /** O humor em que a província rende exatamente 1 — o ponto neutro da reta. */
        centro: z.number().int().min(0).max(100),
        /** Quanto cada ponto de humor acima ou abaixo do centro soma ao fator. */
        porPonto: z.number().min(0),
        minimo: z.number().gt(0),
        maximo: z.number().gt(0),
      }),
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
        /**
         * Os dois degraus do domínio estranho, e os dois são PROPORCIONAIS à fatia do povo.
         *
         * ⚠️ **Substituíram um `dominioEstrangeiro` binário que perguntava a coisa errada:**
         * *"o dono mudou desde 700 a.C.?"*. Aquilo dava o mesmo peso para Atenas em Elêusis —
         * jônia, vizinha, já com 15% de atenienses — e para Atenas na Beócia; e dava zero para
         * Mégara segurando uma Salamina que é 20% ateniense.
         *
         * `outraCidade` é outra nacionalidade da MESMA tribo; `povoEstrangeiro` é outra tribo.
         * O degrau entre os dois é o que dá direção à expansão: unificar os seus sai barato,
         * atravessar o Istmo sai caro. Ver `sociedade/nacionalidade.ts`.
         */
        outraCidade: z.number().int(),
        povoEstrangeiro: z.number().int(),
        /**
         * Quanto uma guarnição CHEIA acalma a província. Ordem pública com lança na porta.
         *
         * ⚠️ **É a única coisa que o jogador pode FAZER contra o descontentamento no mesmo
         * turno.** Templo leva turnos para erguer, imposto baixo custa renda, e o domínio
         * estrangeiro (−12) não sai enquanto a assimilação não acontecer — antes disto,
         * conquistar uma terra e vê-la ferver era esperar e torcer. Pedido de Henrique
         * jogando: *"nessa fase de assimilação, ter um exército na província deve subir a
         * moral por ordem pública"*.
         *
         * ⚠️ **Não substitui o Templo.** O Templo é permanente e não come; a guarnição cobra
         * folha todo turno e some no dia em que a tropa marchar. Segurar a província com
         * exército é uma decisão com preço, e é isso que a torna interessante.
         */
        guarnicao: z.number(),
        /**
         * Que fatia da população em armas ali já conta como guarnição CHEIA.
         *
         * Proporcional à cidade, e não um número fixo de homens: quinhentos soldados são uma
         * ocupação numa vila de 5.000 e uma ronda numa metrópole de 35.000. Abaixo disso o
         * efeito é proporcional, para que cem homens numa vila já valham alguma coisa.
         */
        guarnicaoPlena: z.number().gt(0).max(1),
        /**
         * O reino desta província está em guerra com alguém.
         *
         * ⚠️ Guerra pesa em TODA a terra do reino, e não só na fronteira: é o filho que
         * marchou e a colheita que ficou sem braço. É também o que dá preço social a uma
         * campanha longa — quem guerreia por vinte turnos governa um reino mais azedo.
         */
        reinoEmGuerra: z.number().int(),
        /**
         * A província perdeu a estrada até a capital — ninguém governa o que não alcança.
         *
         * Mesma pergunta que a rede de trocas e a corrupção já fazem, e por isso não custa
         * regra nova: quem está cortado já perde o trânsito, e agora perde a ordem também.
         */
        isoladaDaCapital: z.number().int(),
        /**
         * O peso do TAMANHO da cidade, por faixa de população — da menor para a maior.
         *
         * ⚠️ **Metrópole é mais difícil de governar que vila**, e é isto que impede o humor
         * de ser o mesmo número em todo o mapa: sem ele, a régua inteira do jogo cabia em
         * meia dúzia de valores. Uma entrada por faixa de `populacao.faixas`.
         */
        porTamanho: z.array(z.number().int()).min(1),
      }),
      revolta: z.object({
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
         * Compatibilidade com catálogos antigos que marcavam apenas
         * `impedeAssaltoImediato`. O catálogo atual declara 2/3/4 por nível diretamente na
         * construção; cidade aberta continua caindo no primeiro assalto.
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
        /**
         * As três armas, e o que separa uma da outra.
         *
         * **Hoplita compra tempo; arqueiro compra dano.** Um exército só de arqueiros mata
         * muito e quebra na terceira rodada; um só de hoplitas aguenta o dia inteiro e não
         * decide nada. A cavalaria quase não muda o choque — ela muda **o depois**: é ela que
         * decide se você destruiu o exército inimigo ou só o empurrou.
         *
         * ⚠️ **O counter é SUAVE.** Ter a arma certa é vantagem, não dominância: cem
         * arqueiros não destroem trezentos hoplitas. Se `counter` subir muito, composição
         * vira tudo e o número deixa de importar; se descer, as armas viram enfeite.
         */
        armas: z.object({
          /**
           * A infantaria de vala: **toda província levanta, sempre, sem construir nada.**
           *
           * ⚠️ **Ela vale exatamente o que vale um miliciano**, e é isso que ancora a escala
           * inteira: 1 leve = 1 miliciano num choque. As outras três são o que está ACIMA
           * dessa linha de base, e por isso `ataque` e `aguento` do leve são 1.
           *
           * Fraca e barata: pelo mesmo ouro se põem quase dois leves onde caberia um hoplita.
           * Ela aguenta por QUANTIDADE, não por qualidade — e ninguém no jogo fica sem
           * exército por não ter erguido prédio nenhum.
           */
          leve: Arma,
          hoplita: Arma,
          arqueiro: Arma,
          cavalaria: Arma,
          /** Quanto a arma certa multiplica o próprio dano contra a que ela conta. */
          counter: z.number().min(1),
          /**
           * Quanto a cavalaria do vencedor multiplica a perseguição, no máximo.
           *
           * É o papel dela, e é por isso que ela não é "o hoplita caro": sem cavalo o
           * inimigo escapa e volta no turno seguinte; com cavalo, a derrota dele vira
           * aniquilação. Dá à terra do cavalo um valor que não é renda.
           */
          perseguicaoPorCavalaria: z.number().min(1),
          /**
           * Que fatia de cavalaria já entrega METADE do bônus de perseguição.
           *
           * ⚠️ **Satura, e é o que salva a cavalaria de ser armadilha.** A força de um lado
           * cresce com o QUADRADO do número de homens, então toda tropa cara perde a corrida
           * de cabeças: 20% de cavalaria custa 20% do orçamento e devolve bem menos que 20%
           * de vantagem no choque. Se o bônus fosse proporcional, esquadrão nenhum
           * compensaria — e é falso, além de chato: não é preciso um cavalo por fugitivo para
           * caçar fugitivos, basta ter cavalo. Com 0,08 aqui, um décimo do exército a cavalo
           * já entrega a maior parte da caçada.
           */
          meiaCavalaria: z.number().gt(0).max(1),
        }),
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
    /**
     * O preço que a cidade paga por ser tomada À FORÇA.
     *
     * ⚠️ **Só o assalto cobra isto.** Marchar para uma província sem ninguém em pé continua
     * custando zero: não houve luta, não há o que destruir. É o que dá dois preços à
     * pergunta "sitiar ou assaltar?" — sentar demora e entrega a cidade inteira, assaltar
     * entrega hoje uma cidade quebrada.
     */
    conquista: z.object({
      /**
       * Fatia da população CIVIL que morre na tomada. 0,03 é 3%.
       *
       * Civis, e não milicianos: aqueles já morreram na batalha, pela fração da milícia. Isto
       * é o resto da cidade — *"não é só soldado e milícia que morre em invasão"*.
       */
      mortosNoSaque: z.number().min(0).max(1),
      /**
       * Quantos níveis a obra atingida perde. 1 deixa a cidade ferida, não arrasada.
       *
       * A obra é a MURALHA quando há uma — foi ela que se quebrou para entrar —, e a mais
       * cara de pé quando não há. Nada de sorteio: a rodada é determinística de ponta a
       * ponta, e o jogador tem que conseguir prever o estrago antes de clicar.
       */
      niveisPerdidos: z.number().int().min(0),
    }),
  }),
  camera: z.object({
    /**
     * Teto de aproximação. O piso não se ajusta: é o zoom em que o mapa inteiro cabe.
     *
     * ⚠️ **O terreno tem mais detalhe do que o teto deixava ver.** Em 0,4 a Ática inteira
     * cabia na tela e a vegetação pintada no `terreno.png` nunca aparecia — havia uma camada
     * de arte que o jogador não alcançava. Em 1,0 as árvores aparecem e o traço ainda está
     * limpo; comparado lado a lado, é em 1,4 que a textura começa a papar e as árvores a se
     * repetir. Subir daqui é possível e custa nitidez, não desempenho.
     */
    zoomMaximo: z.number().positive(),
    /** Velocidade da câmera pelo teclado, em pixels do palco por segundo. */
    velocidadeLivre: z.number().positive(),
    /**
     * Fator de zoom por entalhe da roda do mouse.
     *
     * ⚠️ **Anda junto com o `zoomMaximo`, e é fácil esquecer.** O número de entalhes de ponta
     * a ponta é `ln(máximo/mínimo) / ln(passo)`: quando o teto subiu de 0,4 para 1,0, o mesmo
     * passo de 1,12 passou de 8 para 16 voltas de roda para atravessar a faixa. 1,18 devolve
     * o percurso a 11 voltas sem tornar o passo brusco.
     */
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
    /**
     * Quanto da linha de fronteira sobra na divisa entre duas ZONAS MARÍTIMAS.
     *
     * Fração da linha de terra. A divisa do mar existe pra o jogador saber onde uma zona
     * acaba; passar de meio-tom faz o Egeu virar uma grade e roubar a leitura dos reinos.
     */
    forcaDoMar: z.number().min(0).max(1),
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
  /**
   * O GRÃO DO CHÃO, e só ele.
   *
   * ⚠️ **Aqui moravam as ÁRVORES, e elas saíram a pedido de Henrique.** Eram sprites
   * espalhados nas matas que acendiam ao aproximar — o truque do Mount & Blade. Num mapa
   * político em que a cor do reino é a informação, elas competiam com o que importa.
   */
  detalhes: z.object({
    /** Faixa de zoom em que o grão de chão entra. */
    graoInicio: z.number().positive(),
    graoFim: z.number().positive(),
    graoOpacidade: z.number().min(0).max(1),
  }),
});

export type Ajustes = z.infer<typeof Ajustes>;
