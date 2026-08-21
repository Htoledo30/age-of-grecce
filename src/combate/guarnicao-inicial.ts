/**
 * A tropa que já estava em pé quando a partida abre.
 *
 * Não é recrutamento: ninguém paga por ela e nenhum Quartel é exigido — é a condição de
 * 700 a.C., do mesmo jeito que o dono e a população de cada província são. O que ela
 * compartilha com o recrutamento é a única regra que não pode ter exceção:
 *
 * ⚠️ **Os homens SAEM da população da própria terra.** O manancial humano é um só. Se a
 * guarnição inicial viesse de fora dele, dispensá-la no primeiro turno criaria quinhentos
 * habitantes do nada — e a província ficaria mais populosa por ter tido um exército.
 */

import type { Ajustes } from '@/dados/esquema';
import { type Exercito, exercitoVazio, somarLeva } from '@/combate/exercito';
import { disponivelParaLeva } from '@/combate/recrutamento';

type AjustesCombate = Ajustes['jogo']['combate'];

export interface TabuleiroInicial {
  hostes: Record<string, Exercito>;
  /** A população já descontada dos homens em armas. */
  populacao: Record<string, number>;
  /** Primeiro numero de hoste ainda livre, para o estado continuar a contagem. */
  proximaHoste: number;
}

/**
 * Põe as guarnições de pé e tira os homens da população.
 *
 * `populacao` entra como veio dos dados e sai descontada — a função não altera o que
 * recebe, pra que o mapa autoral continue sendo o que está escrito no arquivo.
 */
export function levantarGuarnicoes(
  guarnicoes: Readonly<Record<string, number>>,
  populacao: Readonly<Record<string, number>>,
  donoDe: (idProvincia: string) => string,
  ajustes: AjustesCombate,
): TabuleiroInicial {
  const hostes: Record<string, Exercito> = {};
  const restante = { ...populacao };
  let proxima = 1;

  // Ordem estável: o resultado não pode depender da ordem em que as chaves foram escritas
  // no arquivo, pela mesma razão que a resolução da rodada é determinística.
  for (const idProvincia of Object.keys(guarnicoes).sort()) {
    const homens = guarnicoes[idProvincia] ?? 0;
    if (homens <= 0) continue;

    const gente = restante[idProvincia];
    if (gente === undefined) {
      // Sem população escrita não há de onde tirar ninguém, e inventar seria abrir a
      // segunda fonte de gente que este módulo existe pra impedir.
      throw new Error(
        `exercitos.json põe guarnição em ${idProvincia}, que não tem população configurada`,
      );
    }
    const disponivel = disponivelParaLeva(gente, ajustes);
    if (homens > disponivel) {
      throw new Error(
        `exercitos.json põe ${homens} homens em ${idProvincia}, que só tem ${disponivel} ` +
          `disponíveis (${gente} habitantes, piso de ${ajustes.populacaoMinima})`,
      );
    }

    const exercito = exercitoVazio(`h${proxima++}`, donoDe(idProvincia), idProvincia);
    somarLeva(exercito, idProvincia, homens);
    hostes[exercito.id] = exercito;
    restante[idProvincia] = gente - homens;
  }

  // O contador sai daqui e continua no estado: as hostes de 700 a.C. ja gastaram os
  // primeiros numeros, e a proxima leva nao pode nascer com um id que ja existe.
  return { hostes, populacao: restante, proximaHoste: proxima };
}
