/**
 * Os portões da província: o que ela aceita antes de qualquer ação específica.
 *
 * ⚠️ **São DOIS portões, e não um.** Construir e decretar imposto dependem mesmo de
 * economia configurada; recrutar depende de GENTE. Juntar as duas perguntas numa só foi o
 * que um dia criou a trava que impedia levantar tropa em terra sem ficha autoral.
 *
 * Ficar sem dinheiro **não** entra aqui — se entrasse, o jogador quebrado veria o painel de
 * ações inteiro sumir em vez de ver cada opção dizendo quanto falta.
 *
 * ⚠️ **Os dois perguntam POR QUEM, e o padrão é o jogador.** Enquanto só existia um jogador,
 * "é minha?" queria dizer "é do jogador?" e as duas coisas coincidiam. Com IA elas deixam de
 * coincidir — e a saída não é uma porta de serviço para ela: é esta, com o poder dito em voz
 * alta. **A IA constrói pela mesma função que a tela chama**, passa pela mesma recusa e recebe
 * o mesmo motivo. É a regra que impede a IA de jogar um jogo parecido em vez deste.
 *
 * A ordem de marcha já fazia assim (`porPoder`) desde que existiu inimigo no tabuleiro; isto
 * aqui só terminou de aplicar o padrão às ações da província.
 */

import type { NucleoDaCampanha, Recusa } from '../nucleo';
import { donoDe, populacaoDe } from './consultas';
import { economiaDe } from './renda';

/** Esta província aceita ALGUMA ação deste poder? Campanha começou, é dele, e tem economia. */
export function podeAgirEm(
  nucleo: NucleoDaCampanha,
  idProvincia: string,
  porPoder: string | null = nucleo.estado.jogador,
): Recusa {
  if (porPoder === null) return { pode: false, motivo: 'a campanha ainda não começou' };
  if (economiaDe(nucleo, idProvincia) === null) {
    return { pode: false, motivo: 'esta província não tem economia configurada' };
  }
  if (donoDe(nucleo, idProvincia) !== porPoder) {
    return { pode: false, motivo: 'esta província não é sua' };
  }
  return { pode: true, bonus: 0 };
}

/**
 * O portão do RECRUTAMENTO: a campanha começou e a província é minha.
 *
 * ⚠️ **Não pergunta se ela tem economia configurada.** Recrutar depende de gente; província
 * sem ficha continua não cedendo ninguém — mas porque a população dela é zero, que é um
 * requisito real, e a recusa passa a dizer isso em vez de falar de dado que falta.
 */
export function podeMobilizarEm(
  nucleo: NucleoDaCampanha,
  idProvincia: string,
  porPoder: string | null = nucleo.estado.jogador,
): Recusa {
  if (porPoder === null) return { pode: false, motivo: 'a campanha ainda não começou' };
  if (donoDe(nucleo, idProvincia) !== porPoder) {
    return { pode: false, motivo: 'esta província não é sua' };
  }
  return { pode: true, bonus: 0 };
}

/** Recrutamento leve é básico; prédios liberam armas e o Quartel carimba o treino da leva. */
export function podeRecrutarEm(
  nucleo: NucleoDaCampanha,
  idProvincia: string,
  porPoder: string | null = nucleo.estado.jogador,
): boolean {
  return (
    podeMobilizarEm(nucleo, idProvincia, porPoder).pode && populacaoDe(nucleo, idProvincia) > 0
  );
}
