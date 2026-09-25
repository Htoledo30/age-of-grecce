/**
 * O QUE A MESA DE DIPLOMACIA MOSTRA — só a forma dos dados, sem uma linha de DOM.
 *
 * Fica separado de `diplomacia.ts` porque a tela cresceu: um arquivo que descreve o dado e
 * desenha o dado passa a ter dois assuntos, e a regra da casa é que ele tenha um. Quem monta
 * este dado é `aplicacao/vistas/governo.ts`; quem o desenha é `ui/diplomacia.ts`.
 */

/**
 * Um reino reduzido ao que basta para desenhar o estandarte dele.
 *
 * ⚠️ **É a peça que faz a mesa ter pouco texto e mesmo assim se entender.** Henrique, sobre a
 * mesa do Rome: Total War: *"você vê que tem pouco texto e mesmo assim consigo entender o que
 * está acontecendo?"*. O que faz aquilo funcionar é que os aliados e os inimigos de cada lado
 * são FILEIRAS DE ESCUDO, e não listas de nomes — o olho conta três escudos contra um sem ler
 * uma palavra. Os dezoito emblemas já existiam em `ui/estandartes.ts`; faltava alguém pedi-los.
 */
export interface BrasaoNaMesa {
  id: string;
  nome: string;
  cor: string;
}

/**
 * Um dos dois lados da mesa. **Você e ele usam a MESMA moldura**, e é isso que faz a
 * comparação se ler sem legenda nenhuma — o olho compara os campos na mesma ordem, e a
 * diferença salta sozinha. É o truque que o Total War usa há dez anos e que não custa arte:
 * o cartão da direita é cópia exata do da esquerda, com valores diferentes.
 */
export interface CartaoDoPoder {
  nome: string;
  /** O cofre. Vai na tira de confronto: guerra longa se decide aqui tanto quanto no campo. */
  tesouro: number;
  /**
   * Com quem ele está aliado, em guerra e comerciando — **os dois lados, sempre.**
   *
   * ⚠️ **Substituíram a tira de laços em texto**, que só existia para o lado DELE e dizia
   * "em guerra com Tebas · comercia com Corinto" em letra miúda embaixo do dossiê. Como
   * fileira de escudos na tira espelhada, a mesma informação aparece para os dois lados, na
   * linha a que pertence, e ocupa menos espaço do que ocupava para um lado só.
   */
  aliados: readonly BrasaoNaMesa[];
  inimigos: readonly BrasaoNaMesa[];
  comercio: readonly BrasaoNaMesa[];
  /**
   * A segunda linha do cartão: `você` no seu, e o TEMPERAMENTO no dele.
   *
   * ⚠️ O temperamento já existia em `dados/ia.json` desde sempre e a tela nunca mostrou —
   * era o dado mais barato e mais forte que estava sobrando. Saber que Argos é guerreira
   * muda toda proposta que se faz a ela, e explica de antemão metade das recusas.
   */
  linha: string;
  provincias: number;
  exercito: number;
  /** A capital, por nome. Vazio para um exilado — e a ausência já conta a história. */
  capital: string;
  /** `palavra limpa` ou `promessa quebrada`. É a reputação dita em vez de numerada. */
  palavra: string;
  reputacao: number;
}


/**
 * Uma coisa que dá para propor, já com a resposta dele em cima.
 *
 * ⚠️ **`pode` e `aceita` são perguntas DIFERENTES e a tela nunca as mistura.** `pode` é a
 * regra — cofre curto, guerra em curso, pacto em pé; `aceita` é a vontade dele. Um botão
 * cinza porque você não tem ouro e um botão cinza porque ele te odeia são dois problemas
 * com duas soluções, e confundi-los faz o jogador tentar consertar o errado.
 */
export interface Proposta {
  /** Vai para `data-acao`: é por onde o teste de tela e o CSS pegam o botão. */
  acao: string;
  /**
   * O VERBO, e só ele — `Propor`, `Pagar`, `Exigir`, `Romper`, `Dar`.
   *
   * ⚠️ **Era a linha inteira, e é por isso que a coluna virava um amontoado.** O rótulo dizia
   * `Pagar 155 · 20 turnos` numa ficha, `20 turnos` na de baixo e `1.550 ouro · +29` na de
   * lado: três gramáticas diferentes para a mesma pergunta, e nenhuma coluna em que o olho
   * pudesse comparar. Henrique, sobre a tela: *"esses quadrados jogados (...) quero que
   * apareça quanto custa, quantos rounds quando for mandar uma proposta"*. Partido em três
   * campos, o verbo alinha à esquerda e as duas contas alinham à direita, uma sob a outra.
   */
  rotulo: string;
  /** O que sai (ou entra) do seu cofre, já com sinal: `−155 por turno`. `—` quando nada sai. */
  custo: string;
  /**
   * Quanto tempo dura: `20 turnos`, `até a guerra`, `faltam 34 turnos`.
   *
   * ⚠️ **O presente é a exceção, e ela é honesta:** um presente não dura, ele MUDA alguma
   * coisa — e o que se quer saber ao escolher entre 200 e 1.550 moedas é quanto cada quantia
   * compra de opinião. Nessa ficha a célula traz `+20 de opinião`, que é o efeito no lugar do
   * prazo. Sem cabeçalho de coluna, a linha se lê como frase e não como tabela mal preenchida.
   */
  prazo: string;
  /** O parâmetro da ação: turnos de prazo, ou moedas de presente. */
  valor: number;
  /** Ouro oferecido junto de pacto ou aliança. Ausente nas demais ações. */
  ouro?: number;
  /** As REGRAS deixam? */
  pode: boolean;
  /** E ELE quer? Só significa alguma coisa quando `pode` é verdadeiro. */
  aceita: boolean;
  /** Por que as regras barram. Vazio quando não barram. */
  bloqueio: string;
  /**
   * O saldo da balança dele para ESTA linha, quando o acordo tem balança.
   *
   * ⚠️ **É o que ocupa o lugar do selo ✓/✗.** Henrique: *"não quero um sistema de criança 'se
   * der verde compra, vermelho erro'"*. O número com sinal diz o quanto falta ou sobra, e as
   * parcelas do grupo dizem por quê — o veredito continua sendo lido, mas como conta e não
   * como cor.
   */
  saldo?: number;
  /** O que viraria a balança desta linha, quando ele recusa. */
  pedido?: string;
}

/**
 * Um grupo de propostas, com a fala dele embaixo.
 *
 * ⚠️ **A fala fica NA TELA, e não num tooltip.** A queixa mais repetida sobre estas telas em
 * todos os jogos pesquisados é informação que devia estar à vista escondida atrás do mouse
 * parado. Se ele vai recusar, o jogador lê o motivo sem precisar caçar.
 */
export interface GrupoDaMesa {
  /**
   * A ficha não fecha: fica sempre aberta, no pé da coluna.
   *
   * ⚠️ **Guerra e paz não são um tratado entre outros, e escondê-las atrás de um clique seria
   * mentir sobre o que elas são.** As sete fichas de tratado são coisas que se comparam antes
   * de escolher — prazo, preço, se ele assina. Guerra e paz são a decisão que ABRE o resto do
   * jogo, e a única desta tela que é pré-requisito de outra: sem guerra declarada a ordem de
   * marcha recusa. Ficam à vista, no fim da lista, com moldura própria.
   */
  fixo?: true;
  /**
   * Esta ficha CONSULTA a vontade dele — e só ela leva a palavra dele no cabeçalho.
   *
   * ⚠️ **Sem este campo a tela pendurava um veredito onde não há pergunta.** `aceita` é um
   * booleano obrigatório da proposta, e três fichas o deixam sempre em `true` porque não há
   * o que ele aceite: a GUERRA se declara, a PASSAGEM é a sua estrada, o PRESENTE ninguém
   * recusa. O resultado eram marcas dizendo *"ele topa"* sobre atos unilaterais — e a da
   * guerra, lida em voz alta, virava *"boa ideia"*.
   *
   * ⚠️ **A palavra não é um selo verde ou vermelho.** Henrique: *"não quero um sistema de
   * criança"*. É uma de três — *assinaria*, *relutante*, *fechado* — e a ficha aberta mostra a
   * conta: as parcelas da balança e o que a viraria.
   */
  vontadeDele?: true;
  /**
   * As parcelas da balança dele para este acordo, no prazo mais curto — a conta aberta.
   *
   * ⚠️ Só os acordos com balança a têm (pacto e aliança; os outros chegam depois). A tela a
   * desenha com o mesmo desenho das parcelas da opinião: rótulo, filete, número com sinal.
   */
  balanca?: readonly { rotulo: string; pontos: number }[];
  /** Nada do que você ofereça fecha isto hoje: a palavra do cabeçalho vira "fechado". */
  semSaida?: true;
  titulo: string;
  /**
   * O que já está em pé, em duas ou três palavras — `em vigor · 34 turnos`, `você lidera`.
   *
   * ⚠️ **É o que uma ficha fechada precisa dizer para valer a pena estar fechada.** Fechadas,
   * as sete linhas responderiam só *"que tratados existem"*, que é a mesma resposta para os
   * dezoito reinos da lista. Com o resumo elas respondem *"o que eu já assinei com ESTE"*, que
   * é a pergunta de quem abriu a mesa — e sem obrigar a abrir as sete uma por uma.
   *
   * Vazio quando não há nada em pé, e aí a linha não mostra nada: ausência é informação.
   */
  resumo: string;
  propostas: readonly Proposta[];
  /** O que ele diria sobre este grupo. Nunca vazia. */
  fala: string;
  tom: string;
  /**
   * A frase é a VOZ DELE, e não a descrição do acordo.
   *
   * ⚠️ **Existe porque a cor estava mentindo.** O `tom` espelha *"ele assinaria isto?"*, e a
   * tela pintava a frase com ele — de modo que "Nenhum dos dois marcha sobre o outro", que é a
   * definição de um pacto de não-agressão e vale sempre, saía em vermelho de alarme sempre que
   * ele fosse recusar. Três blocos vermelhos seguidos, todos descrevendo mecânica.
   *
   * A palavra do cabeçalho já diz se ele aceita. A cor da frase fica reservada para onde a
   * frase é mesmo dele — a paz, que é a única em que ele fala entre aspas.
   */
  vozDele?: true;
}

export interface VizinhoNaMesa {
  id: string;
  nome: string;
  /**
   * O estandarte dele — **a lista e a tira de confronto identificam por IMAGEM, não por nome.**
   *
   * ⚠️ **Henrique, jogando:** *"falta os banners de cada reino, falta distinguir, atualmente
   * tenho que decorar nomes, ser humano é melhor em decorar imagem do que nomes"*. Ele está
   * certo, e a tela era um caso extremo do problema: dezoito linhas de texto em ordem
   * alfabética, com nomes gregos parecidos entre si — Cálcis, Cáristo, Corinto; Erétria,
   * Epidauro, Elêusis — e nada além da letra inicial para separá-los. Achar Corinto custava
   * uma leitura; reconhecê-lo, uma partida inteira de memorização.
   *
   * Os dezoito emblemas já existiam em `ui/estandartes.ts` e já apareciam nas fileiras de
   * aliado e inimigo da tira. Faltavam justamente nos dois lugares onde o jogador PROCURA um
   * reino: a linha da lista e o cabeçalho da tira de confronto.
   */
  brasao: BrasaoNaMesa;
  emGuerra: boolean;
  /**
   * O QUE VOCÊS SÃO UM DO OUTRO, em uma frase — *"Em guerra há 22 turnos"*.
   *
   * ⚠️ **A tela nunca disse isto, e é a primeira coisa que qualquer um pergunta.** Havia o
   * número da opinião, a faixa dela, o prazo do pacto e o da aliança — cada um num canto —, e
   * em nenhum lugar a frase inteira. Quem abrisse a mesa sem nunca ter jogado tinha de montar
   * a situação a partir de cinco pedaços. Agora ela abre com a resposta, do jeito que o Rome:
   * Total War abre: uma linha, no meio, acima de tudo.
   *
   * Escrita aqui e não na tela pela regra da casa: a vista traduz o dado em palavra, a tela
   * decide a tipografia.
   */
  desde: string;
  /** Turnos que ainda faltam de trégua, ou 0. */
  tregoa: number;
  /** As províncias DELE que encostam nas suas, por nome. */
  fronteira: readonly string[];
  /** O cartão dele. O seu vem uma vez só, na vista. */
  cartao: CartaoDoPoder;
  /** A opinião de hoje, de −100 a 100. */
  relacao: number;
  /**
   * Para onde ela CAMINHA — a soma das parcelas.
   *
   * ⚠️ **Dois números e não um, e isto é o achado da pesquisa que mais coube aqui.** O Total
   * War mostra "Trending towards" e os jogadores citam como a melhor coisa daquela tela; o
   * nosso jogo já calculava exatamente isso desde o primeiro dia — o valor caminha para um
   * alvo, um passo por turno — e a tela jogava fora metade da informação. Saber que −37 está
   * indo para −45 é uma decisão diferente de saber que −37 está indo para +10.
   */
  alvo: number;
  /**
   * A opinião abaixo da qual ESTE vizinho passa a considerar te atacar.
   *
   * ⚠️ **É o que dava escala ao número, e a tela nunca mostrou.** Sai do temperamento dele: o
   * mercador só olha para a sua terra abaixo de −40, o guerreiro já olha abaixo de +20. São
   * sessenta pontos de diferença entre dois vizinhos, e a mesma opinião "+12" significando
   * sossego num e véspera de invasão no outro.
   */
  linhaDeAtaque: number;
  /** O nome da faixa: Fiel, Amistoso, Cordial, Frio, Hostil, Inimigo. */
  postura: string;
  tomDaPostura: string;
  /** A conta da opinião, parcela por parcela. */
  parcelas: readonly { rotulo: string; pontos: number }[];
  /** O que ele quer de você, em uma frase de informante. */
  intencao: string;
  tomDaIntencao: string;
  /** As províncias SUAS que ele considera que valem a marcha. */
  cobicadas: readonly string[];
  /** O que ele faz por conduta, dado o temperamento. */
  conduta: string;
  /** O tributo em pé com ele, do seu lado da mesa. */
  tributo: { euPago: boolean; ouro: number; turnos: number } | null;
  /** Turnos de pacto que ainda faltam, ou 0. */
  pacto: number;
  /** Turnos de aliança que ainda faltam, ou 0. */
  alianca: number;
  /** O lugar dele na sua liga: você manda nele, ele manda em você, ou nada. */
  liga: 'membro' | 'chefe' | null;
  /**
   * O vínculo mais forte entre vocês, em uma palavra, e o prazo quando há.
   *
   * ⚠️ **Existe para a LISTA, e é o campo que a fazia inútil por ausência.** Ela mostrava a
   * postura — que dizia "cordial" em 11 de 12 linhas — e o exército, que já aparece duas vezes
   * no dossiê. A pergunta que o jogador faz ao correr a lista é *"eu já assinei alguma coisa
   * com esse aí?"*, e ela custava dezessete cliques para responder.
   */
  vinculo: string;
  /**
   * POR QUE este reino está na sua frente agora — a linha de baixo da lista.
   *
   * ⚠️ **Existe porque a lista não respondia a pergunta que a faz existir.** Medido na rodada
   * 1 de Atenas: dezessete reinos, e dezesseis deles mostrando a mesma coisa — `0 =`. Mesma
   * opinião, mesmo tom, ordem alfabética. Pior: naquela mesma rodada Corinto declarou guerra a
   * Tebas e a lista não mencionava isso em lugar nenhum. Henrique, olhando: *"com quem eu devo
   * fazer diplomacia?"* — e a tela não tinha resposta.
   *
   * O motivo é uma frase curta e concreta: *"Fronteira · 255 em armas"*, *"Em guerra com
   * Tebas"*, *"Aliado por 34 turnos"*. Um número igual em toda linha não escolhe nada; um
   * motivo diferente em cada linha escolhe sozinho.
   */
  motivo: string;
  /**
   * A força dele contra a maior do mapa, de 0 a 1 — a barrinha sob a linha da lista.
   *
   * Barra e não número: comparar dezessete números de tropa é conta, comparar dezessete
   * barras é um olhar. O número exato continua na tira de confronto, onde ele decide.
   */
  forcaRelativa: number;
  temAcordo: boolean;
  /** Ganho marginal do acordo para o jogador, já com a carteira e a rota atuais. */
  rendaDoAcordo: number;
  /**
   * O que ELE está te pedindo nesta virada, e que espera um sim ou um não.
   *
   * ⚠️ **É a metade da diplomacia que faltava.** Todo o resto desta tela é o jogador
   * propondo; isto é o outro lado abrindo a boca. Henrique: *"não sinto a IA tentando se
   * conectar comigo (...) e eu ter opção de aceitar ou recusar"*. `null` quando ele não pediu
   * nada — que é o caso da esmagadora maioria das viradas, e por isso o bloco só aparece
   * quando existe.
   */
  pedido: { tipo: 'pacto' | 'alianca' | 'liga' | 'anexacao' | 'comercio' | 'acesso'; frase: string } | null;
  /** Turnos que faltam da passagem que VOCÊ deu a ele, ou 0. */
  passagemConcedida: number;
  /** Turnos que faltam da passagem que ELE te deu, ou 0. */
  passagemRecebida: number;
  /** Os grupos de proposta, na ordem em que a tela os empilha. */
  grupos: readonly GrupoDaMesa[];
}

export interface VistaDaDiplomacia {
  /** O seu cartão: o lado esquerdo da mesa, igual para todos os interlocutores. */
  eu: CartaoDoPoder;
  /** O seu id e a sua cor, para o estandarte do alto da janela. */
  meuBrasao: BrasaoNaMesa;
  /** Quando esta conversa está acontecendo. Vai no rodapé, uma vez. */
  ano: number;
  turno: number;
  vizinhos: readonly VizinhoNaMesa[];
}
