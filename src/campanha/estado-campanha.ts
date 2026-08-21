import type { Investimento } from './economia';

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
   * Incentivos de exploração em curso, por id de província.
   *
   * É a única parte mutável da economia. Produto, nível, população e comércio-base
   * são autorais e ficam nos dados — investir compra trabalho temporário, não muda o que
   * a terra tem. Uma província some daqui quando o incentivo dela acaba.
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
