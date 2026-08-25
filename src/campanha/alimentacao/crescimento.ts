/**
 * O crescimento da população — e a trava que impede o paradoxo da Fazenda.
 *
 * **Trava preventiva, tudo-ou-nada por poder.** Antes de qualquer província crescer,
 * simula-se o crescimento de todas as livres do poder; se o saldo final PROJETADO ficaria
 * negativo, ninguém cresce naquele turno. É o que garante que construir uma Fazenda
 * aumente a capacidade e NUNCA cause fome — o cenário de 11 anos de fome e 10.403 mortos
 * que a auditoria encontrou virou regressão com 0 e 0.
 *
 * ⚠️ Crescer "em ordem de id até caber" faria a ordem alfabética virar regra econômica de
 * novo, e por isso não é feito.
 */

import { calcularCrescimentoPopulacional } from '@/populacao/crescimento';
import type { CrescimentoPopulacional } from '@/populacao/crescimento';
import { nivelPopulacional } from '@/producao/alimentacao';
import type { NucleoDaCampanha } from '../nucleo';
import { donoDe, fichaDe, populacaoDe } from '../provincia/consultas';
import { estaSitiada } from '../guerra/cercos';
import { balancoAlimentarDe } from './balanco';

export type CrescimentoNaProvincia = CrescimentoPopulacional & {
  limitadoPelaAlimentacao: boolean;
};

/** O crescimento do poder está TRAVADO pela alimentação neste turno? */
function crescimentoTravadoPara(
  nucleo: NucleoDaCampanha,
  idPoder: string,
): boolean {
  const balanco = balancoAlimentarDe(nucleo, idPoder);
  if (balanco.saldo <= 0) return false; // sem crescimento não há o que travar
  let populacaoProjetada = 0;
  for (const id of nucleo.territorios.provinciasDe(idPoder)) {
    const ficha = fichaDe(nucleo, id);
    if (!ficha || estaSitiada(nucleo, id)) continue;
    const proxima = projetar(nucleo, id, 1).proxima;
    populacaoProjetada += nivelPopulacional(
      proxima,
      ficha.populacao,
      nucleo.ajustes.alimento.fracaoPopulacionalPorNivel,
    );
  }
  const saldoProjetado =
    balanco.subsistencia + balanco.producao - populacaoProjetada - balanco.exercito;
  return saldoProjetado < 0;
}

/** 1 quando esta província cresce neste turno; 0 sitiada, sem sobra ou travada. */
function fatorDeCrescimentoDe(nucleo: NucleoDaCampanha, idProvincia: string): number {
  if (estaSitiada(nucleo, idProvincia)) return 0;
  const poder = donoDe(nucleo, idProvincia);
  if (balancoAlimentarDe(nucleo, poder).saldo <= 0) return 0;
  return crescimentoTravadoPara(nucleo, poder) ? 0 : 1;
}

/** O crescimento previsto para esta província, e se a trava está segurando. */
export function crescimentoDe(
  nucleo: NucleoDaCampanha,
  idProvincia: string,
): CrescimentoNaProvincia | null {
  if (!fichaDe(nucleo, idProvincia)) return null;
  const fator = fatorDeCrescimentoDe(nucleo, idProvincia);
  const crescimento = projetar(nucleo, idProvincia, fator);
  // "Limitado" é a trava agindo: haveria sobra pra crescer, mas crescer viraria fome.
  const limitado =
    fator === 0 &&
    !estaSitiada(nucleo, idProvincia) &&
    balancoAlimentarDe(nucleo, donoDe(nucleo, idProvincia)).saldo > 0;
  return { ...crescimento, limitadoPelaAlimentacao: limitado };
}

/** Cresce todas as províncias configuradas, inclusive as que não pertencem ao jogador. */
export function crescerPopulacao(nucleo: NucleoDaCampanha): void {
  // ⚠️ **O fator de cada reino é decidido UMA vez, antes de qualquer província crescer.**
  // Calculado dentro do laço, ele mudava a cada passo, e a ordem alfabética virava regra
  // econômica. A trava preventiva entra na mesma decisão: se crescer jogaria o saldo final
  // no negativo, o poder inteiro fica parado neste turno.
  const fatorPorPoder = new Map<string, number>();
  for (const id of Object.keys(nucleo.economia.provincias)) {
    const poder = donoDe(nucleo, id);
    if (fatorPorPoder.has(poder)) continue;
    const saldo = balancoAlimentarDe(nucleo, poder).saldo;
    fatorPorPoder.set(poder, saldo > 0 && !crescimentoTravadoPara(nucleo, poder) ? 1 : 0);
  }

  for (const id of Object.keys(nucleo.economia.provincias)) {
    // Cidade sitiada não cresce: a fome do cerco já está cobrando dela, e nascer mais
    // gente atrás de uma muralha bloqueada seria o cerco alimentando o sitiado.
    if (estaSitiada(nucleo, id)) continue;
    const fator = fatorPorPoder.get(donoDe(nucleo, id)) ?? 1;
    nucleo.estado.populacao[id] = projetar(nucleo, id, fator).proxima;
  }
}

function projetar(
  nucleo: NucleoDaCampanha,
  idProvincia: string,
  fator: number,
): CrescimentoPopulacional {
  return calcularCrescimentoPopulacional(
    populacaoDe(nucleo, idProvincia),
    nucleo.estado.construcoes[idProvincia] ?? {},
    nucleo.catalogo,
    nucleo.ajustes.populacao,
    fator,
  );
}
