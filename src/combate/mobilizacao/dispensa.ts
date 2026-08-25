/**
 * Mandar gente pra casa — o contrário exato de recrutar.
 *
 * Existe desde o primeiro dia porque sem ele a população seria uma catraca de sentido único:
 * cada guerra encolheria o reino para sempre, e a única estratégia possível seria nunca
 * mobilizar.
 *
 * ⚠️ **Cada um volta à SUA província de origem, mesmo que ela seja do inimigo agora.** É uma
 * regra só, sem exceção: gente pertence ao chão, não a quem manda no chão. A consequência é
 * dura e é de propósito — dispensar tropa levantada em província perdida **entrega aqueles
 * habitantes ao conquistador**, e por isso retomar a terra antes de desmobilizar passa a ser
 * uma decisão. A alternativa seria fazê-los sumir do mundo, e aí perder território encolheria
 * a humanidade do mapa toda vez.
 */

import { forcaDe, retirar } from '../exercito';
import type { Exercito } from '../exercito';
import { hoste, unicaEm } from './consultas';
import type { EstadoDeMobilizacao } from './estado';

/**
 * Tira homens da hoste e devolve cada um à população da terra dele.
 *
 * Apaga a hoste quando ela zera, em vez de deixar um objeto vazio no estado: hoste sem homem
 * nenhum viraria marcador fantasma no mapa e linha vazia na lista.
 */
export function devolver(
  estado: EstadoDeMobilizacao,
  exercito: Exercito,
  homens: number,
): void {
  const devolvidos = retirar(exercito, homens);
  for (const [origem, quantos] of Object.entries(devolvidos)) {
    estado.populacao[origem] = (estado.populacao[origem] ?? 0) + quantos;
  }
  if (forcaDe(exercito) === 0) delete estado.hostes[exercito.id];
}

/** Manda homens desta hoste pra casa. */
export function dispensarDe(
  estado: EstadoDeMobilizacao,
  idHoste: string,
  homens: number,
): void {
  if (!Number.isInteger(homens) || homens <= 0) {
    throw new Error('o número de homens dispensados precisa ser um inteiro positivo');
  }
  const exercito = hoste(estado, idHoste);
  if (!exercito) throw new Error(`não há hoste ${idHoste}`);
  devolver(estado, exercito, homens);
}

/** O mesmo, endereçado pela província. Estoura se houver duas hostes ali. */
export function dispensar(
  estado: EstadoDeMobilizacao,
  idProvincia: string,
  homens: number,
): void {
  const exercito = unicaEm(estado, idProvincia);
  if (!exercito) throw new Error(`não há uma hoste só em ${idProvincia}`);
  dispensarDe(estado, exercito.id, homens);
}
