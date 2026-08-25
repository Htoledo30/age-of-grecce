/**
 * O humor de cada província anda um passo rumo ao alvo, e o pavio das revoltas corre.
 *
 * Um passo por turno, nunca um salto: o único movimento brusco de humor é o choque da
 * conquista, e ele mora no caminho da conquista, não aqui.
 */

import { aproximarFelicidade, revoltosa } from '../felicidade';
import type { NucleoDaCampanha } from '../nucleo';
import { alvoDeFelicidadeEm } from './humor';
import { acenderPavioEm } from './processar-revoltas';
import type { Levante } from './processar-revoltas';

/** Anda o humor de todas as províncias simuladas e devolve os levantes que nasceram. */
export function atualizarFelicidade(nucleo: NucleoDaCampanha): readonly Levante[] {
  const levantes: Levante[] = [];
  for (const id of Object.keys(nucleo.economia.provincias)) {
    const atual = nucleo.estado.felicidade[id];
    if (atual === undefined) continue;
    const alvo = alvoDeFelicidadeEm(nucleo, id);
    const novo = aproximarFelicidade(atual, alvo, nucleo.ajustes.felicidade.passoPorTurno);
    nucleo.estado.felicidade[id] = novo;

    // Revolta não guarda rancor pela metade: sair da faixa apaga o pavio.
    if (!revoltosa(novo, nucleo.ajustes.felicidade)) {
      delete nucleo.estado.revoltas[id];
      continue;
    }
    const levante = acenderPavioEm(nucleo, id);
    if (levante) levantes.push(levante);
  }
  return levantes;
}
