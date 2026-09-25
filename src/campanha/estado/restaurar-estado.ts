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
  // ⚠️ **Os reinos que a partida criou voltam ao mapa ANTES da validação, e a ordem é o
  // ponto.** A conferência recusa província de dono desconhecido — e uma terra que declarou
  // independência pertence justamente a um dono que o arquivo do mundo nunca teve. Registrar
  // depois faria todo salvamento com uma independência dentro ser recusado como corrompido.
  for (const poder of salvo.poderesNascidos) nucleo.atlas.registrarPoder(poder);

  validarSalvamento(nucleo, salvo);
  const estado = nucleo.estado;
  estado.poderesNascidos = salvo.poderesNascidos.map((p) => ({ ...p }));

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
  estado.aliancas = { ...salvo.aliancas };
  estado.ligas = { ...salvo.ligas };
  estado.acordos = { ...salvo.acordos };
  estado.tributos = { ...salvo.tributos };
  estado.reputacao = { ...salvo.reputacao };
  // ⚠️ Passagem e mesa também são estado, e nenhuma das duas voltava do disco: carregar a
  // partida apagava toda estrada aberta (desde que a passagem existe) e o pedido em cima da
  // mesa — que, desde que sobrevive à virada, é o que o jogador ia responder.
  estado.acessos = { ...salvo.acessos };
  estado.propostas = salvo.propostas.map((p) => ({ ...p }));
}
