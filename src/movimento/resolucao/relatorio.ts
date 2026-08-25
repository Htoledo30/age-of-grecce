/**
 * Os contratos da resolução: o recorte do estado que ela mexe, o que ela pergunta ao mundo,
 * e o que ela conta depois.
 *
 * Ficam num arquivo próprio porque **todo passo da resolução escreve no mesmo relatório** —
 * se os tipos morassem no orquestrador, cada passo teria de importar dele, e o orquestrador
 * de cada passo.
 */

import type { Cerco, Postura } from '@/combate/cerco';
import type { Exercito } from '@/combate/exercito';
import type { Ajustes } from '@/dados/esquema';
import type { OrdemDeMarcha } from '../ordens';

type AjustesDaBatalha = Ajustes['jogo']['combate']['batalha'];

/** O recorte do estado que a resolução mexe. Nada além disto. */
export interface EstadoDaResolucao {
  /** Por ID de hoste. A provincia esta em `hoste.posicao`. */
  hostes: Record<string, Exercito>;
  proximaHoste: number;
  /** Por ID de hoste: **uma ordem por hoste por rodada**, agora literalmente. */
  ordens: Record<string, OrdemDeMarcha>;
  /**
   * Hostes que SURTEM nesta rodada, por id. Ver `quemLuta` e `choqueObrigadoEm`.
   *
   * Não é uma ordem de marcha porque não há marcha nenhuma: a hoste fica onde está e obriga
   * quem a cerca a lutar. Some na virada junto com as ordens.
   */
  surtidas: readonly string[];
  /** Cercos em curso, por província sitiada. Sobrevive à virada — cerco leva turnos. */
  cercos: Record<string, Cerco>;
}

/** O que a resolução precisa perguntar e mudar no mundo em volta. */
export interface MundoDaResolucao {
  /**
   * As regras da batalha: rodadas de choque, letalidades e limiar de quebra.
   *
   * ⚠️ **Isto não contradiz o `miliciaPerdida` logo abaixo.** Aquela fração é balanço que a
   * campanha APLICA depois, e por isso não mora aqui. Estas são as regras do próprio choque,
   * e o choque acontece aqui dentro — quem resolve a batalha precisa saber como ela funciona.
   */
  batalha: AjustesDaBatalha;
  donoDe: (idProvincia: string) => string;
  trocarDono: (idProvincia: string, idPoder: string) => void;
  /** Quantos milicianos esta província põe em pé. Zero onde não há população. */
  miliciaDe: (idProvincia: string) => number;
  /**
   * Esta província tem obra que obriga a sitiar antes de assaltar?
   *
   * A resolução não conhece catálogo de construções — pergunta e recebe sim ou não. Quem
   * responde é a campanha, lendo o campo `impedeAssaltoImediato` do dado.
   */
  impedeAssaltoImediato: (idProvincia: string) => boolean;
  /**
   * Avisa quantos milicianos a província PERDEU no choque.
   *
   * ⚠️ Perdido não é o mesmo que morto: milícia derrotada **dispersa**, e quem decide a fatia
   * que morreu é a campanha, que é onde os ajustes moram. A resolução não conhece essa
   * fração — se conhecesse, o número de balanço estaria em dois lugares.
   */
  miliciaPerdida: (idProvincia: string, perdidos: number) => void;
  /**
   * Homens que DISPERSARAM depois de quebrar, por terra natal.
   *
   * ⚠️ **Quebrar custa o exército, não a geração.** Quem escapa da perseguição está vivo, e
   * volta para casa: a província recupera aqueles habitantes, que voltam a pagar tributo e a
   * poder ser recrutados. É a mesma regra que a milícia derrotada já seguia, agora valendo
   * para a hoste — antes, perder uma batalha apagava os homens do mundo.
   *
   * É por isso que o RECUO ordenado vai valer alguma coisa: quem sai antes de quebrar
   * preserva a HOSTE; quem quebra preserva só a gente.
   */
  dispersaram: (porOrigem: Readonly<Record<string, number>>) => void;
  /**
   * Para onde este poder recua saindo desta província, ou `null` se não houver para onde.
   *
   * ⚠️ **É a última província que decide.** Quem tem duas ou mais terras ligadas salva o
   * exército: ele marcha para a vizinha e continua sendo um exército. Quem está na última não
   * tem para onde ir — a hoste se desfaz e os homens voltam à população de onde saíram. Ainda
   * é melhor que quebrar, porque escapa da perseguição, mas o exército acabou.
   *
   * A resolução não conhece o mapa nem a tabela de donos: pergunta e recebe um id ou `null`.
   */
  refugio: (provincia: string, poder: string) => string | null;
}

/**
 * Um lado como ele entrou na batalha. A janela precisa do nome e do tamanho de partida.
 *
 * Sem `export` enquanto ninguém precisar do NOME: `RelatorioDaRodada` já carrega a forma, e o
 * `codigo-morto` cobra tipo exportado que ninguém importa.
 */
interface LadoNoRelatorio {
  poder: string;
  homens: number;
  /** Multiplicador de resistência — a muralha. 1 é campo aberto. */
  aguento: number;
}

/** O que aconteceu na rodada — pra crônica, pra interface e pros testes. */
export interface RelatorioDaRodada {
  /**
   * Quem se moveu, e **por onde**.
   *
   * ⚠️ A trilha é o caminho INTEIRO, com as duas pontas: `trilha[0]` é de onde saiu e
   * `trilha.at(-1)` é onde parou. Guardar origem e destino ao lado dela seria guardar um
   * resumo junto do detalhe, e um dia os dois discordariam. Quem desenha a marcha precisa das
   * paradas do meio: com dois saltos por rodada, a reta entre as pontas passa por fora do
   * caminho que a seta prometeu.
   */
  marchas: readonly { hoste: string; trilha: readonly string[]; homens: number }[];
  /** Choques resolvidos. `provincia` é `null` no encontro na estrada, que não tem lugar. */
  batalhas: readonly {
    provincia: string | null;
    vencedor: string | null;
    perdedores: readonly string[];
    sobreviventes: number;
    /**
     * Os dois lados como entraram, e o passo a passo do que houve entre eles.
     *
     * ⚠️ **Vem SEMPRE, inclusive nas batalhas que ninguém vai assistir.** É o que garante que
     * a janela reproduza a matemática que decidiu em vez de ilustrar por cima de um resultado
     * calculado por outra conta — quem não assiste joga a lista fora e usa só o desfecho.
     */
    lados: readonly [LadoNoRelatorio, LadoNoRelatorio];
    rounds: readonly { a: number; b: number; fase: 'choque' | 'perseguicao' | 'recuo' }[];
    /** Como terminou para o perdedor: a linha cedeu, ou ele saiu de campo a tempo. */
    desfecho: 'quebrou' | 'recuou';
    /**
     * Que tipo de choque foi.
     *
     * ⚠️ Existe porque um assalto produz **duas** batalhas na mesma província e na mesma
     * rodada — o exército de fora contra o de dentro, e depois o vencedor contra a muralha.
     * Sem distinguir, a crônica escrevia duas linhas iguais e o jogador lia como repetição de
     * um evento só.
     */
    tipo: 'campo' | 'estrada' | 'assalto';
  }[];
  conquistas: readonly { provincia: string; de: string; para: string }[];
  /**
   * Milicianos que a província PERDEU defendendo, por província.
   *
   * Perdidos, não mortos: parte dispersa e volta pra casa. Quem aplica a fração é a campanha.
   */
  milicianosMortos: readonly { provincia: string; mortos: number }[];
  /**
   * Cidades sob cerco ao fim da rodada, com a postura de quem senta.
   *
   * `novo` separa quem acabou de sentar de quem já estava lá. É o que permite contar a
   * notícia uma vez só: um cerco que dura oito rodadas não é oito notícias.
   */
  cercos: readonly { provincia: string; sitiante: string; postura: Postura; novo: boolean }[];
  /**
   * Cercos que ACABARAM nesta rodada, e por qualquer motivo: o sitiante marchou embora,
   * morreu na surtida, foi desfeito no assalto rechaçado.
   *
   * ⚠️ Conquista não entra aqui. A cidade tomada também deixa de estar sitiada, mas a notícia
   * daquele dia é a conquista — dizer as duas coisas seria contar o mesmo fato duas vezes, e
   * a segunda soaria como alívio no dia em que a praça caiu.
   */
  cercosLevantados: readonly { provincia: string; sitiante: string }[];
}

/** O relatório enquanto está sendo escrito: as mesmas listas, ainda mutáveis. */
export type RelatorioEmConstrucao = {
  -readonly [C in keyof RelatorioDaRodada]: RelatorioDaRodada[C][number][];
};

export function relatorioVazio(): RelatorioEmConstrucao {
  return {
    marchas: [],
    batalhas: [],
    conquistas: [],
    milicianosMortos: [],
    cercos: [],
    cercosLevantados: [],
  };
}
