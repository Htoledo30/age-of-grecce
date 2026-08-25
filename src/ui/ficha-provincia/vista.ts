/**
 * A província como a ficha precisa vê-la.
 *
 * Composta pela aplicação a partir do atlas (nome, região) e da campanha (dono de AGORA).
 * A camada de mapa não monta isto: ela sabe onde cada província está desenhada, não de quem
 * ela é hoje — e quando montava, montava com o dono assado e mentia depois da primeira
 * conquista.
 */

export interface VistaDaProvincia {
  nome: string;
  regiao: string;
  poder: { nome: string; povo: string; cor: string };
  /**
   * O nome da faixa de população: a RÉGUA do número de habitantes.
   *
   * "35.000 habitantes" sozinho não diz nada — grande comparado com quê? A faixa responde,
   * e é a mesma que decide quanto a terra come da mesa do reino. Vazia onde não há gente.
   */
  faixa: string;
  /**
   * Quantos milicianos a província põe em pé se alguém vier.
   *
   * Fica na tela porque decide: é o número que diz se o vizinho consegue tomar isto, e é
   * o que a Muralha compra. Zero onde não há população — e a ficha diz isso do mesmo jeito
   * que já diz "economia não configurada".
   */
  milicia: number;
  /**
   * A conta do alvo do humor, parcela a parcela — a legibilidade da barra de comida
   * aplicada à felicidade. `null` onde não há simulação.
   */
  humor: { alvo: number; parcelas: readonly { rotulo: string; pontos: number }[] } | null;
  /**
   * Quem está sitiando esta província, e em que pé a despensa dela está.
   *
   * Fica na ficha porque é a metade da mecânica que acontece COM o jogador: a renda dele
   * cai, o relógio da fome corre, e ele precisa saber por quê e até quando.
   */
  cerco: {
    sitiante: string;
    mantimentosRestantes: number;
    fomeAtiva: boolean;
  } | null;
}
