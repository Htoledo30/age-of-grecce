/**
 * Ajudantes para os testes falarem de UMA hoste sem repetir a busca por id.
 *
 * ⚠️ **Existem porque a província deixou de ser endereço de hoste.** Desde que sitiar
 * parou de engajar o exército de dentro, duas hostes inimigas convivem no mesmo lugar, e
 * "a hoste de Elêusis" passou a não identificar nenhuma das duas. Toda função aqui exige o
 * PODER: é o que obriga cada teste a dizer de quem é o exército de que ele está falando.
 *
 * Se houver duas hostes do mesmo poder no mesmo lugar — que a política de fusão não
 * deveria permitir — as funções estouram em vez de escolher uma. Um teste que mede o
 * exército errado em silêncio é pior que um teste que quebra.
 */

import type { Campanha } from '../../src/campanha/campanha';
import type { Exercito } from '../../src/combate/exercito';
import type { Postura } from '../../src/combate/cerco';

/**
 * A ÚNICA hoste parada aqui, de qualquer poder — ou `undefined` se não há nenhuma.
 *
 * Estoura quando há duas, de propósito: substituiu `Campanha.exercitoEm`, que devolvia "a
 * primeira por id" e por isso media o exército errado numa província sitiada.
 */
export function unicaEm(c: Campanha, provincia: string): Exercito | undefined {
  const aqui = c.hostesEm(provincia);
  if (aqui.length > 1) throw new Error(`${aqui.length} hostes em ${provincia}: diga qual`);
  return aqui[0];
}

/** O id dela, ou um id que não existe — para os casos "não há hoste aqui". */
function idEm(c: Campanha, provincia: string, poder: string): string {
  const achadas = c.hostesEm(provincia).filter((h) => h.poder === poder);
  return achadas[0]?.id ?? `sem-hoste:${provincia}`;
}

/**
 * A guerra que a marcha passou a exigir, declarada em silêncio.
 *
 * ⚠️ **Para os testes de MOVIMENTO falarem de movimento.** Desde a diplomacia, marchar sobre
 * terra alheia exige guerra declarada — e sem isto cada teste de rota, cerco, assalto e
 * conquista teria uma linha de diplomacia no começo dizendo a mesma coisa. A regra em si tem
 * testes próprios em `testes/diplomacia.test.ts`, que é onde ela deve ser guardada.
 */
function comGuerra(c: Campanha, destino: string, poder: string): void {
  const dono = c.donoDe(destino);
  if (dono !== poder && !c.emGuerra(dono, poder)) c.declararGuerra(dono, poder);
}

/** Manda a hoste deste poder marchar. O poder omitido é Atenas, o jogador dos testes. */
export function ordenar(
  c: Campanha,
  origem: string,
  destino: string,
  homens: number,
  poder = 'atenas',
  postura: Postura = 'sitiar',
): void {
  comGuerra(c, destino, poder);
  c.ordenarMarcha(idEm(c, origem, poder), destino, homens, poder, postura);
}

/** A mesma pergunta, sem registrar nada. */
export function podeOrdenar(
  c: Campanha,
  origem: string,
  destino: string,
  homens: number,
  poder = 'atenas',
) {
  comGuerra(c, destino, poder);
  return c.podeOrdenarMarcha(idEm(c, origem, poder), destino, homens, poder);
}

/** Manda a hoste deste poder sair para atacar quem cerca a cidade dela. */
export function surtir(c: Campanha, provincia: string, poder: string): void {
  c.surtir(idEm(c, provincia, poder), poder);
}

/** A mesma pergunta, sem registrar nada. */
export function podeSurtir(c: Campanha, provincia: string, poder: string) {
  return c.podeSurtir(idEm(c, provincia, poder), poder);
}

/** Desfaz a ordem da hoste deste poder. */
export function cancelar(c: Campanha, origem: string, poder = 'atenas'): void {
  c.cancelarOrdem(idEm(c, origem, poder));
}

/** A ordem registrada para a hoste deste poder, se houver. */
export function ordemDe(c: Campanha, provincia: string, poder = 'atenas') {
  return c.ordemDaHoste(idEm(c, provincia, poder));
}
