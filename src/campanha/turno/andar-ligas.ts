/**
 * O desejo de sair de cada membro anda um passo, e quem enche pega em armas.
 *
 * Um passo por turno, nunca um salto — a mesma máquina do humor do povo e da opinião entre
 * reinos, e é de propósito que seja a terceira aparição dela. Ver `diplomacia/liga.ts`.
 */

import {
  alvoDoDesejo,
  aproximarDesejo,
  apagarVinculo,
  ligaDe,
  parcelasDoDesejo,
  vaiSeRevoltar,
} from '../diplomacia/liga';
import { parDe } from '../diplomacia/par';
import { declararGuerra, emGuerra, guerrasDe } from '../diplomacia/relacoes';
import type { NucleoDaCampanha } from '../nucleo';
import { povoDoPoder } from '../sociedade/nacionalidade';

/** Um membro que saiu da liga à força nesta virada. */
export interface RevoltaDaLiga {
  membro: string;
  chefe: string;
}

/**
 * Anda o desejo de todos os membros e devolve as revoltas que estouraram.
 *
 * ⚠️ **A revolta é uma SAÍDA e uma guerra, nesta ordem.** Enquanto a liga está de pé nenhum dos
 * dois pode declarar guerra ao outro — então o vínculo tem de morrer antes de a guerra nascer,
 * senão a própria regra da liga impediria a revolta contra ela.
 *
 * ⚠️ **E não há preço de reputação para quem se revolta.** Quem quebra a promessa aqui é quem
 * apertou até o povo estourar: cobrar do revoltado seria cobrar a conta do chefe no bolso de
 * quem a pagou. É a mesma decisão do levante de uma província, que também não paga nada.
 */
export function andarLigas(nucleo: NucleoDaCampanha): readonly RevoltaDaLiga[] {
  const revoltas: RevoltaDaLiga[] = [];
  const passo = nucleo.ajustes.diplomacia.liga.passoPorTurno;
  // Em ordem de id: a mesma partida estoura as mesmas revoltas em qualquer máquina.
  for (const membro of Object.keys(nucleo.estado.ligas).sort()) {
    const vinculo = ligaDe(nucleo, membro);
    if (vinculo === undefined) continue;
    const chefe = vinculo.chefe;

    const povoDoMembro = povoDoPoder(nucleo, membro);
    const parcelas = parcelasDoDesejo(
      nucleo,
      membro,
      povoDoMembro !== undefined && povoDoMembro === povoDoPoder(nucleo, chefe),
      nucleo.territorios.provinciasDe(chefe).length,
      nucleo.territorios.provinciasDe(membro).length,
      guerrasDe(nucleo, chefe).length > 0,
    );
    vinculo.desejoDeSair = aproximarDesejo(
      vinculo.desejoDeSair,
      alvoDoDesejo(parcelas),
      passo,
    );

    if (!vaiSeRevoltar(nucleo, membro)) continue;
    apagarVinculo(nucleo, membro);
    if (!emGuerra(nucleo, membro, chefe)) {
      // ⚠️ **A revolta RASGA o papel, e o levante de uma província já fazia isso.** Quem pega em
      // armas contra quem o apertou não consultou tratado nenhum — e sem esta linha a revolta
      // saía em SILÊNCIO: medido, o membro deixava a liga no turno 6 e a guerra simplesmente
      // não nascia, porque o pacto entre os dois a recusava. Um reino que se revolta e não
      // luta é um reino que desapareceu do mapa por um bug.
      delete nucleo.estado.pactos[parDe(membro, chefe)];
      delete nucleo.estado.aliancas[parDe(membro, chefe)];
      declararGuerra(nucleo, membro, chefe, true);
    }
    revoltas.push({ membro, chefe });
  }
  return revoltas;
}

/**
 * Quem perdeu tudo sai da liga sozinho, dos dois lados.
 *
 * Um membro sem chão não serve a ninguém, e um chefe sem chão não lidera ninguém — os membros
 * dele ficam livres sem revolta e sem preço, porque não houve traição: houve o fim de um reino.
 */
export function limparLigasMortas(nucleo: NucleoDaCampanha): void {
  for (const membro of Object.keys(nucleo.estado.ligas)) {
    const vinculo = nucleo.estado.ligas[membro];
    if (vinculo === undefined) continue;
    if (
      !nucleo.territorios.temTerritorio(membro) ||
      !nucleo.territorios.temTerritorio(vinculo.chefe)
    ) {
      apagarVinculo(nucleo, membro);
    }
  }
}
