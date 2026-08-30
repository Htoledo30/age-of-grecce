/**
 * O QUE A MESA DE DIPLOMACIA MOSTRA — só a forma dos dados, sem uma linha de DOM.
 *
 * Fica separado de `diplomacia.ts` porque a tela cresceu: um arquivo que descreve o dado e
 * desenha o dado passa a ter dois assuntos, e a regra da casa é que ele tenha um. Quem monta
 * este dado é `aplicacao/vistas/governo.ts`; quem o desenha é `ui/diplomacia.ts`.
 */

/**
 * Um dos dois lados da mesa. **Você e ele usam a MESMA moldura**, e é isso que faz a
 * comparação se ler sem legenda nenhuma — o olho compara os campos na mesma ordem, e a
 * diferença salta sozinha. É o truque que o Total War usa há dez anos e que não custa arte:
 * o cartão da direita é cópia exata do da esquerda, com valores diferentes.
 */
export interface CartaoDoPoder {
  nome: string;
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

/** Um laço dele com um TERCEIRO: é o que faz o mundo ter mais de duas pessoas dentro. */
interface LacoNaMesa {
  tipo: string;
  nome: string;
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
  rotulo: string;
  /** O parâmetro da ação: turnos de prazo, ou moedas de presente. */
  valor: number;
  /** As REGRAS deixam? */
  pode: boolean;
  /** E ELE quer? Só significa alguma coisa quando `pode` é verdadeiro. */
  aceita: boolean;
  /** Por que as regras barram. Vazio quando não barram. */
  bloqueio: string;
}

/**
 * Um grupo de propostas, com a fala dele embaixo.
 *
 * ⚠️ **A fala fica NA TELA, e não num tooltip.** A queixa mais repetida sobre estas telas em
 * todos os jogos pesquisados é informação que devia estar à vista escondida atrás do mouse
 * parado. Se ele vai recusar, o jogador lê o motivo sem precisar caçar.
 */
export interface GrupoDaMesa {
  titulo: string;
  propostas: readonly Proposta[];
  /** O que ele diria sobre este grupo. Nunca vazia. */
  fala: string;
  tom: string;
}

export interface VizinhoNaMesa {
  id: string;
  nome: string;
  emGuerra: boolean;
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
  /** A frase com que ele abre a conversa, antes de qualquer botão. */
  abertura: string;
  /** O nome da faixa: Fiel, Amistoso, Cordial, Frio, Hostil, Inimigo. */
  postura: string;
  /** O que a faixa significa na prática, em uma frase. */
  leitura: string;
  tomDaPostura: string;
  /** A conta da opinião, parcela por parcela. */
  parcelas: readonly { rotulo: string; pontos: number }[];
  /** O que ele quer de você, em uma frase de informante. */
  intencao: string;
  tomDaIntencao: string;
  /** As províncias SUAS que ele considera que valem a marcha. */
  cobicadas: readonly string[];
  /** Os laços dele com terceiros. */
  lacos: readonly LacoNaMesa[];
  /** O que ele faz por conduta, dado o temperamento. */
  conduta: string;
  /** O tributo em pé com ele, do seu lado da mesa. */
  tributo: { euPago: boolean; ouro: number; turnos: number } | null;
  /** Turnos de pacto que ainda faltam, ou 0. */
  pacto: number;
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
  vizinhos: readonly VizinhoNaMesa[];
  /** Quantas guerras você tem em curso, contando as de quem não é vizinho. */
  guerras: number;
}
