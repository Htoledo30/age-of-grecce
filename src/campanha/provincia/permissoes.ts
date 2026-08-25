/**
 * Os portões da província: o que ela aceita antes de qualquer ação específica.
 *
 * ⚠️ **São DOIS portões, e não um.** Construir e decretar imposto dependem mesmo de
 * economia configurada; recrutar depende de GENTE. Juntar as duas perguntas numa só foi o
 * que um dia criou a trava que impedia levantar tropa em terra sem ficha autoral.
 *
 * Ficar sem dinheiro **não** entra aqui — se entrasse, o jogador quebrado veria o painel de
 * ações inteiro sumir em vez de ver cada opção dizendo quanto falta.
 */

import type { NucleoDaCampanha, Recusa } from '../nucleo';
import { donoDe, populacaoDe } from './consultas';
import { economiaDe } from './renda';

/** Esta província aceita ALGUMA ação minha? Campanha começou, é minha, e tem economia. */
export function podeAgirEm(nucleo: NucleoDaCampanha, idProvincia: string): Recusa {
  const jogador = nucleo.estado.jogador;
  if (jogador === null) return { pode: false, motivo: 'a campanha ainda não começou' };
  if (economiaDe(nucleo, idProvincia) === null) {
    return { pode: false, motivo: 'esta província não tem economia configurada' };
  }
  if (donoDe(nucleo, idProvincia) !== jogador) {
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
export function podeMobilizarEm(nucleo: NucleoDaCampanha, idProvincia: string): Recusa {
  const jogador = nucleo.estado.jogador;
  if (jogador === null) return { pode: false, motivo: 'a campanha ainda não começou' };
  if (donoDe(nucleo, idProvincia) !== jogador) {
    return { pode: false, motivo: 'esta província não é sua' };
  }
  return { pode: true, bonus: 0 };
}

/** Recrutamento é ação básica; Quartel melhorará a qualidade da leva no futuro. */
export function podeRecrutarEm(nucleo: NucleoDaCampanha, idProvincia: string): boolean {
  return (
    podeMobilizarEm(nucleo, idProvincia).pode && populacaoDe(nucleo, idProvincia) > 0
  );
}
