/**
 * A IA prevendo a batalha — **com a mesma função que a decide.**
 *
 * Ela não estima, não chuta e não compara cabeças: ela roda `resolverBatalha` com os dois
 * lados como estão e lê o vencedor. A resolução é determinística de ponta a ponta, então a
 * previsão é EXATA enquanto ninguém mais chegar ao campo.
 *
 * ⚠️ **Isto não é trapaça, e a diferença importa.** Ela não enxerga nada que o jogador não
 * enxergue — hostes no mapa são públicas para os dois lados — e não simula o futuro: simula
 * o choque de agora, com o que está à vista. É a mesma conta que o jogador faz de cabeça
 * quando olha 500 arqueiros contra 501 leves e desiste.
 *
 * ⚠️ **E é por isso que comparar HOMENS não servia.** A IA decidia surtida por número, e 501
 * leves contra 500 arqueiros parecia vantagem: o arqueiro vale 1,33 em campo contra 1,00 do
 * leve, e a guarnição saía para morrer fora do muro. Um homem não é uma unidade de força
 * desde que existem armas.
 */

import { resolverBatalha } from '@/combate/batalha';
import { choqueDoAssalto } from '@/combate/cerco';
import { valorEmCampo } from '@/combate/composicao';
import { forcaDe } from '@/combate/exercito';
import type { Contingente, Exercito } from '@/combate/exercito';
import type { Ajustes } from '@/dados/esquema';

type AjustesDaBatalha = Ajustes['jogo']['combate']['batalha'];

/**
 * O que a IA espera de um choque: se ela ganha, e **com quanto sobrando.**
 *
 * ⚠️ **A sobra é o que separa defender de atacar.** Para socorrer, ganhar basta: a
 * alternativa é perder a cidade. Para ATACAR, ganhar não basta — uma vitória que custa nove
 * décimos do exército entrega a província seguinte de graça a quem estiver olhando. É a conta
 * que o jogador faz sozinho quando desiste de uma briga que ele venceria.
 */
export interface Previsao {
  venci: boolean;
  /** Fração dos MEUS homens que fica de pé, de 0 a 1. */
  sobra: number;
}

/**
 * Este lado venceria aquele, agora?
 *
 * `desempate` é quem leva a batalha se nada mais separar os dois — quem chama passa o lado
 * que SEGURA O CHÃO, exatamente como a resolução da rodada faz.
 */
export function venceria(
  meus: readonly Exercito[],
  deles: readonly Exercito[],
  ajustes: AjustesDaBatalha,
  desempate: 'a' | 'b',
): boolean {
  return prever(meus, deles, ajustes, desempate).venci;
}

/** A mesma previsão, com a sobra junto. Ver {@link Previsao}. */
export function prever(
  meus: readonly Exercito[],
  deles: readonly Exercito[],
  ajustes: AjustesDaBatalha,
  desempate: 'a' | 'b',
): Previsao {
  const a = contingentesDe(meus);
  const b = contingentesDe(deles);
  if (b.length === 0) return { venci: true, sobra: 1 };
  if (a.length === 0) return { venci: false, sobra: 0 };
  const homens = meus.reduce((soma, h) => soma + forcaDe(h), 0);
  const r = resolverBatalha(
    { ...valorEmCampo(a, b, ajustes), recuaAos: null },
    { ...valorEmCampo(b, a, ajustes), recuaAos: null },
    ajustes,
    desempate,
  );
  return { venci: r.vencedor === 'a', sobra: fracao(r.sobreviventesA, homens) };
}

/**
 * E se eu subir a muralha desta cidade agora?
 *
 * ⚠️ **Roda a MESMA função que a rodada roda** — `choqueDoAssalto`, que mora em `cerco.ts`
 * justamente por ter estes dois leitores. Uma segunda conta escrita à mão aqui seria a IA
 * mandando o exército contra um muro que a regra sabe que não cai.
 */
export function preverAssalto(
  contingentes: readonly Contingente[],
  milicianos: number,
  ajustes: AjustesDaBatalha,
): Previsao {
  const homens = contingentes.reduce((soma, c) => soma + c.homens, 0);
  if (homens <= 0) return { venci: false, sobra: 0 };
  if (milicianos <= 0) return { venci: true, sobra: 1 };
  const r = choqueDoAssalto(contingentes, milicianos, ajustes);
  return { venci: r.vencedor === 'a', sobra: fracao(r.sobreviventesA, homens) };
}

function fracao(sobreviventes: number, homens: number): number {
  return homens > 0 ? Math.max(0, Math.min(1, sobreviventes / homens)) : 0;
}

function contingentesDe(hostes: readonly Exercito[]): readonly Contingente[] {
  return hostes.flatMap((h) => h.contingentes);
}
