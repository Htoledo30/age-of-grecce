/**
 * Pôr gente em armas: a leva paga, o levante do povo e a peça de desenvolvimento.
 *
 * Os três criam hoste, e os três tiram gente do MESMO manancial — a população da província.
 * Uma hoste que viesse de fora dele criaria gente ao ser dispensada.
 */

import type { Arma } from '../exercito';
import { exercitoVazio, somarLeva } from '../exercito';
import { concluirFormacoes as concluir, iniciarFormacao } from '../formacao-de-leva';
import type { ResultadoDasFormacoes } from '../formacao-de-leva';
import { hostesEm } from './consultas';
import { populacaoDe, proximoId, tesouroDe } from './estado';
import type { EstadoDeMobilizacao } from './estado';

/**
 * Aplica uma leva autorizada: cobra agora, tira os homens da terra e inicia a formação. Ela
 * só entra em `hostes` na próxima rodada.
 *
 * ⚠️ Tropa alheia parada aqui NÃO bloqueia: a cidade sitiada continua levantando gente, como
 * `cerco.ts` promete. A guarda que existia era do tempo em que a hoste tinha a província como
 * chave e a leva podia engordar o exército errado; hoje a formação carrega o poder e
 * `concluirFormacoes` entrega à hoste do MESMO poder.
 */
export function recrutar(
  estado: EstadoDeMobilizacao,
  idProvincia: string,
  poder: string,
  leva: { ouro: number; homens: number },
  turnoAtual: number,
  arma: Arma = 'leve',
  qualidade = 1,
): void {
  estado.tesouros[poder] = tesouroDe(estado, poder) - leva.ouro;
  estado.populacao[idProvincia] = populacaoDe(estado, idProvincia) - leva.homens;
  iniciarFormacao(estado.formacoes, idProvincia, poder, leva.homens, turnoAtual, arma, qualidade);
}

/** Torna ativas as levas cujo turno chegou, depois de resolver as marchas da rodada. */
export function concluirFormacoes(
  estado: EstadoDeMobilizacao,
  turnoAtual: number,
  donoDe: (idProvincia: string) => string,
): ResultadoDasFormacoes {
  return concluir(estado, turnoAtual, donoDe);
}

/**
 * O levante: parte da população pega em armas CONTRA o dono atual da província.
 *
 * Os rebeldes saem da população — o manancial humano é um só, como no recrutamento — e nascem
 * como hoste do poder a que a terra pertencia em 700 a.C. Se esse poder tinha sido eliminado,
 * a hoste o traz de volta ao jogo: restauração pela arma do povo.
 */
export function levantarRebeldes(
  estado: EstadoDeMobilizacao,
  idProvincia: string,
  idPoder: string,
  homens: number,
): string | null {
  const disponivel = Math.min(
    Math.max(0, Math.floor(homens)),
    populacaoDe(estado, idProvincia),
  );
  if (disponivel <= 0) return null;
  estado.populacao[idProvincia] = populacaoDe(estado, idProvincia) - disponivel;
  const exercito = exercitoVazio(proximoId(estado), idPoder, idProvincia);
  somarLeva(exercito, idProvincia, disponivel);
  estado.hostes[exercito.id] = exercito;
  return exercito.id;
}

/**
 * Põe uma hoste no mapa do nada. **Só desenvolvimento** — ver `Campanha.plantarHoste`.
 *
 * Serve para testes, inspeção e cenários controlados. Não cobra ouro, não tira gente da
 * população, e por isso nenhuma regra normal do jogo pode chamar isto.
 */
export function plantar(
  estado: EstadoDeMobilizacao,
  idProvincia: string,
  idPoder: string,
  homens: number,
  arma: Arma = 'leve',
  qualidade = 1,
): string {
  // ⚠️ Substitui só o que é DESTE poder. Apagava tudo o que estivesse ali, e isso deixou de
  // servir quando duas forças inimigas passaram a caber no mesmo lugar: plantar uma guarnição
  // aniquilaria o sitiante sem batalha nenhuma.
  for (const antiga of hostesEm(estado, idProvincia)) {
    if (antiga.poder === idPoder) delete estado.hostes[antiga.id];
  }
  const exercito = exercitoVazio(proximoId(estado), idPoder, idProvincia);
  somarLeva(exercito, idProvincia, homens, arma, qualidade);
  estado.hostes[exercito.id] = exercito;
  return exercito.id;
}
