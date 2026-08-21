import type { Investimento } from './economia';
import type { Exercito } from '@/combate/exercito';
import type { OrdemDeMarcha } from '@/movimento/ordens';

/**
 * O estado mínimo de uma campanha — e nada além do mínimo.
 *
 * Quem eu sou, que ano é, que turno é, quanto tenho, **de quem é cada província**, e o
 * que está em curso nelas.
 *
 * A regra que vale desde já, mesmo sem salvamento existir: **este objeto é, e vai
 * continuar sendo, exatamente o que um dia vai pro disco.** O que não estiver nele é
 * efêmero por definição. Manter essa disciplina agora é o que faz salvar/carregar ser
 * barato depois em vez de virar uma caça a estado escondido.
 */
export interface EstadoCampanha {
  /**
   * Quem o jogador escolheu, ou `null` enquanto ele ainda está olhando o mapa.
   *
   * É este campo que distingue "abertura" de "partida em curso". Existe uma tela de menu
   * separada na interface, mas a campanha já existe por baixo dela desde que o jogo abre,
   * ainda sem jogador. Assim menu e mapa não mantêm duas cópias do estado da partida.
   */
  jogador: string | null;
  /** Negativo é a.C.: 700 a.C. é -700. Não existe ano 0. */
  ano: number;
  /** 0 na abertura; vira 1 quando o jogador escolhe um poder. */
  turno: number;
  /** Tesouro do jogador. Vira uma tabela por poder quando a IA entrar. */
  tesouro: number;
  /**
   * Dono ATUAL de cada província, por id. **Sempre completo: as 205 entradas.**
   *
   * O `dono` do arquivo assado passa a significar dono INICIAL — a condição de 700 a.C. —
   * e esta tabela é a verdade corrente. Quem pergunta "de quem é isto?" pergunta aqui.
   *
   * ⚠️ **Tabela cheia, e não um diff contra o assado.** O diff é menor e é armadilha: se
   * o `provincias.json` for reassado com uma fronteira movida, o diff mistura dois
   * recortes em silêncio e a partida continua rodando errada. A tabela cheia, conferida
   * contra o atlas na carga, falha alto.
   */
  dono: Record<string, string>;
  /**
   * Habitantes de cada província AGORA, por id. Só as que têm economia configurada.
   *
   * ⚠️ **População é estado, não dado fixo.** O `dados/economia.json` guarda a população
   * INICIAL, de 700 a.C.; esta tabela é a de agora, e ela encolhe quando o poder põe
   * gente em armas — quem marcha deixa de ser tributado e deixa de lavrar. Ao fim de
   * cada turno ela cresce até a capacidade definida pela população inicial. É o que faz
   * mobilizar ter preço contínuo sem condenar uma província a encolher para sempre.
   */
  populacao: Record<string, number>;
  /**
   * Exércitos em pé, pela província onde estão.
   *
   * Um por província: é o modelo que o mapa pede — tropa salta de vizinha em vizinha, sem
   * peça com pontos de movimento. Entrar numa província onde já há tropa sua junta as
   * duas, e por isso não existe pilha de exércitos no mesmo lugar pra gerenciar.
   */
  exercitos: Record<string, Exercito>;
  /**
   * Ordens de marcha registradas nesta RODADA, pela província de onde partem.
   *
   * Uma por hoste. Mover não muda o mapa no clique: a ordem fica aqui, revisável e
   * cancelável, e só acontece quando o turno vira — junto com as de todo mundo.
   *
   * ⚠️ **Esvaziado no fim da resolução.** Se uma ordem sobrevivesse à virada, executaria
   * de novo, e o sintoma seria tropa andando sozinha.
   */
  ordens: Record<string, OrdemDeMarcha>;
  /**
   * Incentivos de exploração em curso, por id de província.
   *
   * Produto, nível e comércio-base são autorais e ficam nos dados — investir compra
   * trabalho temporário, não muda o que a terra tem. Uma província some daqui quando o
   * incentivo dela acaba. (População já foi autoral também, e deixou de ser: ela é
   * estado desde que recrutar passou a custá-la.)
   */
  investimentos: Record<string, Investimento>;
  /**
   * Construções erguidas, por id de província.
   *
   * Ao contrário do incentivo, isto **nunca sai** daqui: construção é permanente, e é
   * por isso que ela consegue absorver dinheiro que o incentivo não absorve.
   */
  construcoes: Record<string, string[]>;
  /**
   * Obras em andamento, por id de província. Uma por vez em cada uma.
   *
   * O dinheiro já saiu quando a obra entra aqui: paga-se no início e recebe-se no fim.
   * É isso que faz o custo ser sentido, em vez de o número subir no mesmo instante do
   * clique.
   */
  obras: Record<string, Obra>;
}

/** Uma construção em andamento. */
export interface Obra {
  construcao: string;
  turnosRestantes: number;
}

/**
 * Escreve o ano como se lê em voz alta.
 *
 * `-700` → `700 a.C.`, `-1` → `1 a.C.`, `1` → `1 d.C.`
 */
export function formatarAno(ano: number): string {
  return ano < 0 ? `${-ano} a.C.` : `${ano} d.C.`;
}

/**
 * Avança o calendário pulando o ano zero.
 *
 * Não existe ano 0: depois de 1 a.C. vem 1 d.C. Com um turno por ano e começando em 700
 * a.C. ninguém chega lá tão cedo, mas isso custa três linhas e é exatamente o tipo de
 * coisa que quem descobre é o jogador, não o programador.
 */
export function avancarAno(ano: number, anos: number): number {
  const bruto = ano + anos;
  if (ano < 0 && bruto >= 0) return bruto + 1;
  return bruto;
}
