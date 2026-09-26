/**
 * Trocar o dono de uma província — a primitiva, e a conquista que a usa.
 *
 * `trocarDono` é deliberadamente **sem regra de guerra nenhuma**: não pergunta se há
 * fronteira, se há exército, se há paz. Quem decide se pode é quem chama — misturar as duas
 * coisas faria deste arquivo o lugar onde toda regra do jogo acabaria morando.
 *
 * `conquistar` é o caminho da GUERRA, e é lá que mora o choque de humor da queda: pô-lo na
 * primitiva faria uma conquista de desenvolvimento castigar o povo sem batalha nenhuma.
 */

import type { NucleoDaCampanha } from '../nucleo';

/**
 * O que a administração anterior deixa para trás ao perder a terra.
 *
 * O decreto de imposto morre com a posse: a administração nova começa no normal. A obra em
 * andamento morre junto — o dinheiro já saiu, e quem perdeu a província não vai entregar a
 * obra ao inimigo pronta. A construção FICA: ela é da província, não de quem mandava nela,
 * e é isso que faz tomar uma cidade rica valer mais que tomar uma pobre.
 */
function limparAdministracao(nucleo: NucleoDaCampanha, idProvincia: string): void {
  delete nucleo.estado.nivelDeImposto[idProvincia];
  delete nucleo.estado.obras[idProvincia];
  // A fase crítica é da conquista: a troca sem guerra não a abre, e apaga a do dono anterior.
  delete nucleo.estado.conquistadaEm[idProvincia];
}

/**
 * Passa uma província de um dono a outro. Devolve `false` quando não havia o que mudar.
 *
 * É o único caminho: a tabela `estado.dono` e o índice reverso são consertados juntos,
 * aqui, e por isso não existe estado em que os dois discordem.
 */
export function trocarDono(
  nucleo: NucleoDaCampanha,
  idProvincia: string,
  idPoder: string,
): boolean {
  if (!nucleo.territorios.trocarDono(idProvincia, idPoder)) return false;
  limparAdministracao(nucleo, idProvincia);
  return true;
}

/** A troca de posse pela guerra: a mesma primitiva, mais o choque da queda no humor. */
export function conquistar(
  nucleo: NucleoDaCampanha,
  idProvincia: string,
  idPoder: string,
): void {
  nucleo.territorios.trocarDono(idProvincia, idPoder);
  limparAdministracao(nucleo, idProvincia);
  nucleo.estado.conquistadaEm[idProvincia] = nucleo.estado.turno;
  // A cidade tomada odeia o novo dono no dia da queda. É o único movimento de humor que
  // não é gradual, e mora aqui — no caminho da CONQUISTA.
  const humor = nucleo.estado.felicidade[idProvincia];
  if (humor !== undefined) {
    nucleo.estado.felicidade[idProvincia] = Math.max(
      0,
      humor - nucleo.ajustes.felicidade.choqueDaConquista,
    );
  }
}
