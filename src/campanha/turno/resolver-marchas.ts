/**
 * A rodada de movimento e guerra: a campanha entrega ao resolvedor o que só ela sabe.
 *
 * `movimento/resolucao/` não conhece economia, humor nem construção — ele pergunta. Este
 * arquivo é a lista completa dessas perguntas, e por isso é aqui que se vê o que a guerra
 * depende do resto do jogo.
 */

import { resolverRodada } from '@/movimento/resolucao/resolver-rodada';
import type { RelatorioDaRodada } from '@/movimento/resolucao/relatorio';
import { mortosDaMilicia } from '@/combate/milicia';
import type { NucleoDaCampanha } from '../nucleo';
import { donoDe, populacaoDe } from '../provincia/consultas';
import { conquistar } from '../provincia/posse';
import { impedeAssaltoImediatoEm } from '../guerra/cercos';
import { miliciaEm } from '../guerra/defesa-local';

export function resolverMarchas(nucleo: NucleoDaCampanha): RelatorioDaRodada {
  return resolverRodada(nucleo.estado, nucleo.ajustes.combate, {
    donoDe: (id) => donoDe(nucleo, id),
    miliciaDe: (id) => miliciaEm(nucleo, id),
    impedeAssaltoImediato: (id) => impedeAssaltoImediatoEm(nucleo, id),
    miliciaPerdida: (id, perdidos) => {
      // ⚠️ Só os MORTOS saem da população; o resto dispersa e volta pra casa. Aniquilar a
      // milícia inteira arruinaria a província pro resto da campanha — são os mesmos
      // lavradores que pagam tributo e que forneceriam recruta.
      const mortos = mortosDaMilicia(perdidos, nucleo.ajustes.combate);
      nucleo.estado.populacao[id] = Math.max(0, populacaoDe(nucleo, id) - mortos);
    },
    // A conquista passa pela MESMA primitiva de sempre: índice reverso e tabela de donos
    // consertados juntos, sem um segundo caminho que possa discordar.
    trocarDono: (id, poder) => conquistar(nucleo, id, poder),
  });
}
