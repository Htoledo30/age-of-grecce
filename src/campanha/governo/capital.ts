/**
 * A capital do reino: perdê-la, escolher outra, e o reassentamento da virada.
 *
 * Para o JOGADOR, perder a capital trava a virada: escolher outra é decisão dele e tem que
 * acontecer antes de o mundo andar. Os demais poderes reassentam automaticamente pela regra
 * derivada de `capitais.ts`; isso é regra de campanha, não decisão estratégica da IA.
 */

import { melhorCapitalEntre } from '../capitais';
import type { NucleoDaCampanha, Recusa } from '../nucleo';
import { donoDe, fichaDe } from '../provincia/consultas';
import { estaSitiada } from '../guerra/cercos';
import { gastar, tesouroDe } from './tesouro';

/** Uma capital que mudou de mãos na rodada. */
export interface QuedaDeCapital {
  poder: string;
  provincia: string;
}

/** A capital deste poder, ou `undefined` para quem não tem província nenhuma. */
export function capitalDe(
  nucleo: NucleoDaCampanha,
  idPoder: string,
): string | undefined {
  return nucleo.estado.capitais[idPoder];
}

/** A capital deste poder caiu em mãos alheias? */
export function capitalPerdida(nucleo: NucleoDaCampanha, idPoder: string): boolean {
  const capital = capitalDe(nucleo, idPoder);
  return capital !== undefined && donoDe(nucleo, capital) !== idPoder;
}

/**
 * O que custaria assentar a capital do jogador em outra província AGORA.
 *
 * Zero quando a atual caiu ou quando não há capital: a escolha forçada não é castigo. O
 * custo só existe na mudança VOLUNTÁRIA — sem ele, a capital seria um interruptor grátis
 * para fugir da corrupção por distância.
 */
export function custoDeMudancaDeCapital(nucleo: NucleoDaCampanha): number {
  const jogador = nucleo.estado.jogador;
  if (jogador === null) return nucleo.ajustes.capital.custoDeMudanca;
  const atual = capitalDe(nucleo, jogador);
  if (atual === undefined || capitalPerdida(nucleo, jogador)) return 0;
  return nucleo.ajustes.capital.custoDeMudanca;
}

/** Pode assentar a capital do jogador AQUI? Devolve o motivo quando não pode. */
export function podeMudarCapital(
  nucleo: NucleoDaCampanha,
  idProvincia: string,
): Recusa {
  const jogador = nucleo.estado.jogador;
  if (jogador === null) return { pode: false, motivo: 'a campanha ainda não começou' };
  if (donoDe(nucleo, idProvincia) !== jogador) {
    return { pode: false, motivo: 'esta província não é sua' };
  }
  // ⚠️ **Terra sem economia não vira sede.** Das 196 províncias desenhadas, 171 não têm ficha
  // econômica nem população: elas existem no mapa e não são simuladas. Assentar a capital numa
  // delas daria um reino governado do vazio — a corrupção por distância mediria caminhos até
  // uma cidade fantasma, e a rede de trocas nasceria numa terra que não produz nada.
  if (fichaDe(nucleo, idProvincia) === undefined) {
    return { pode: false, motivo: 'esta terra não tem cidade que sirva de sede' };
  }
  if (capitalDe(nucleo, jogador) === idProvincia) {
    return { pode: false, motivo: 'já é a capital' };
  }
  // Assentar o governo dentro de uma cidade cercada seria mudar-se para a armadilha.
  if (estaSitiada(nucleo, idProvincia)) {
    return { pode: false, motivo: 'esta cidade está sitiada' };
  }
  const custo = custoDeMudancaDeCapital(nucleo);
  const caixa = tesouroDe(nucleo, jogador);
  if (custo > caixa) {
    return { pode: false, motivo: `faltam ${(custo - caixa).toLocaleString('pt-BR')} moedas` };
  }
  return { pode: true, bonus: 0 };
}

/** Assenta a capital do jogador nesta província, cobrando a mudança voluntária. */
export function mudarCapital(nucleo: NucleoDaCampanha, idProvincia: string): void {
  const r = podeMudarCapital(nucleo, idProvincia);
  if (!r.pode) throw new Error(r.motivo);
  const jogador = nucleo.estado.jogador;
  if (jogador === null) throw new Error('a campanha ainda não começou');
  gastar(nucleo, jogador, custoDeMudancaDeCapital(nucleo));
  nucleo.estado.capitais[jogador] = idProvincia;
}

/**
 * O destino das capitais depois da rodada: notícia da queda e reassentamento.
 *
 * A queda é detectada pelas CONQUISTAS da rodada — é o único caminho pelo qual uma capital
 * muda de mãos durante a virada. Depois dela: poder sem chão fica sem capital (não há o que
 * apontar); poder com chão e capital perdida reassenta pela regra derivada, EXCETO o
 * jogador, cuja escolha é travada na próxima virada. Um jogador que ficou sem capital
 * (exílio e volta) também recebe uma pela regra — a obrigação de escolher vale para a
 * perda, não para o recomeço.
 */
export function assentarCapitais(
  nucleo: NucleoDaCampanha,
  conquistas: readonly { provincia: string; de: string }[],
): readonly QuedaDeCapital[] {
  const quedas: QuedaDeCapital[] = [];
  for (const conquista of conquistas) {
    if (nucleo.estado.capitais[conquista.de] === conquista.provincia) {
      quedas.push({ poder: conquista.de, provincia: conquista.provincia });
    }
  }

  for (const poder of nucleo.atlas.poderes.map((p) => p.id).sort()) {
    if (!nucleo.territorios.temTerritorio(poder)) {
      delete nucleo.estado.capitais[poder];
      continue;
    }
    const capital = nucleo.estado.capitais[poder];
    const pendente = capital === undefined || donoDe(nucleo, capital) !== poder;
    if (!pendente) continue;
    if (poder === nucleo.estado.jogador && capital !== undefined) continue;
    const nova = melhorCapitalEntre(
      nucleo.atlas,
      poder,
      nucleo.territorios.provinciasDe(poder),
    );
    if (nova !== undefined) nucleo.estado.capitais[poder] = nova;
  }
  return quedas;
}
