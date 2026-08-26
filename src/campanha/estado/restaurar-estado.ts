/**
 * Retomar um salvamento: o estado do disco entra no lugar do estado vivo.
 *
 * ⚠️ **Substitui o CONTEÚDO das tabelas, nunca os objetos que outros seguram.**
 * `Territorios` guarda a referência viva de `estado.dono`, e `Mobilizacao` guarda o próprio
 * objeto de estado — trocar o objeto deixaria os dois lendo um mundo que não existe mais. É
 * por isso que `dono` é esvaziado e repovoado em vez de reatribuído, e o índice reverso é
 * remontado com `reindexar()`, que existe exatamente para isto.
 */

import type { EstadoCampanha } from '../estado-campanha';
import type { NucleoDaCampanha } from '../nucleo';
import { validarSalvamento } from './validar-estado';

export function restaurarEstado(nucleo: NucleoDaCampanha, salvo: EstadoCampanha): void {
  validarSalvamento(nucleo, salvo);
  const estado = nucleo.estado;

  estado.jogador = salvo.jogador;
  estado.ano = salvo.ano;
  estado.turno = salvo.turno;
  estado.tesouros = { ...salvo.tesouros };
  for (const id of Object.keys(estado.dono)) delete estado.dono[id];
  Object.assign(estado.dono, salvo.dono);
  nucleo.territorios.reindexar();
  estado.populacao = { ...salvo.populacao };
  estado.nacionalidades = Object.fromEntries(
    Object.entries(salvo.nacionalidades).map(([id, povos]) => [id, { ...povos }]),
  );
  estado.felicidade = { ...salvo.felicidade };
  estado.hostes = Object.fromEntries(
    Object.entries(salvo.hostes).map(([id, h]) => [
      id,
      { ...h, contingentes: h.contingentes.map((c) => ({ ...c })) },
    ]),
  );
  estado.proximaHoste = salvo.proximaHoste;
  estado.formacoes = Object.fromEntries(
    Object.entries(salvo.formacoes).map(([id, f]) => [id, { ...f }]),
  );
  estado.ordens = Object.fromEntries(
    Object.entries(salvo.ordens).map(([id, o]) => [id, { ...o, rota: [...o.rota] }]),
  );
  estado.surtidas = [...salvo.surtidas];
  estado.cercos = Object.fromEntries(
    Object.entries(salvo.cercos).map(([id, c]) => [id, { ...c }]),
  );
  estado.capitais = { ...salvo.capitais };
  estado.nivelDeImposto = { ...salvo.nivelDeImposto };
  estado.construcoes = Object.fromEntries(
    Object.entries(salvo.construcoes).map(([id, c]) => [id, { ...c }]),
  );
  estado.obras = Object.fromEntries(
    Object.entries(salvo.obras).map(([id, o]) => [id, { ...o }]),
  );
  estado.revoltas = { ...salvo.revoltas };
  estado.guerras = { ...salvo.guerras };
  estado.tregoas = { ...salvo.tregoas };
  estado.relacoes = { ...salvo.relacoes };
  estado.pactos = { ...salvo.pactos };
  estado.acordos = { ...salvo.acordos };
  estado.reputacao = { ...salvo.reputacao };
}
