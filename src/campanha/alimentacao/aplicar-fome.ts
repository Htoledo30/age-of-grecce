/**
 * A fome, nas duas contas do desenho: **o povo come primeiro, e a fome é local.**
 *
 * 1. **Cidade sitiada vive da própria despensa**, fora da circulação do reino. Vencidos os
 *    mantimentos, povo (−1%) e guarnição (−5%) caem juntos, todo turno.
 * 2. **Saldo civil negativo é Fome**: as províncias DEPENDENTES (as que não se sustentam
 *    sozinhas) perdem 1% — sustentadoras e equilibradas nunca morrem por causa das outras
 *    — e o exército perde 5%.
 * 3. **Saldo civil fechado com saldo final negativo** não mata civil nenhum: é o EXÉRCITO
 *    sem mantimentos, e só ele perde 5%.
 *
 * As tropas dentro de cidades sitiadas do próprio poder ficam fora da cobrança do
 * exército — já pagam o relógio da cidade, e ninguém paga a mesma fome duas vezes.
 */

import { homensEmFormacao } from '@/combate/formacao-de-leva';
import { mortosPelaFome } from '@/producao/alimentacao';
import type { NucleoDaCampanha } from '../nucleo';
import { populacaoDe, poderesEmOrdem, simuladasDe } from '../provincia/consultas';
import { estaSitiada } from '../guerra/cercos';
import { balancoAlimentarDe, presosEmCercoDe, sitiadasDe } from './balanco';
import { saldoAlimentarLocalEm } from './contribuicao';
import { fomeDoCercoEm } from './mantimentos-de-cerco';

/** Quem passou fome na última virada, para a crônica contar. */
export interface RelatorioDaFome {
  provincias: readonly { provincia: string; mortos: number }[];
  tropas: readonly { poder: string; homens: number }[];
}

/** Passa a fome do turno por todos os poderes e devolve o que ela fez. */
export function alimentar(nucleo: NucleoDaCampanha): RelatorioDaFome {
  const provincias: { provincia: string; mortos: number }[] = [];
  const tropas: { poder: string; homens: number }[] = [];

  for (const poder of poderesEmOrdem(nucleo)) {
    const minhas = simuladasDe(nucleo, poder);
    const homens = nucleo.mobilizacao.homensDe(poder);
    if (minhas.length === 0 && homens === 0) continue;

    const sitiadas = sitiadasDe(nucleo, poder);

    // A fome do cerco, cidade a cidade — no ritmo da despensa de cada uma.
    let mortosDeTropa = 0;
    for (const id of sitiadas) {
      const relogio = fomeDoCercoEm(nucleo, id);
      if (!relogio || !relogio.fomeAtiva) continue; // a despensa ainda aguenta
      const mortos = matarCivis(nucleo, id);
      if (mortos > 0) provincias.push({ provincia: id, mortos });
      mortosDeTropa += matarTropaSitiada(nucleo, poder, [id]);
    }

    // A mesa do reino, sem as sitiadas — elas não contribuem, não pesam e não comem.
    const balanco = balancoAlimentarDe(nucleo, poder);
    const pouparSitiadas = new Set(sitiadas);

    if (balanco.saldoCivil < 0) {
      // Fome de verdade: morrem os civis das províncias que dependem do reino.
      for (const id of minhas) {
        if (estaSitiada(nucleo, id)) continue; // a dela é o relógio
        if (saldoAlimentarLocalEm(nucleo, id) >= 0) continue; // quem se sustenta não morre
        const mortos = matarCivis(nucleo, id);
        if (mortos > 0) provincias.push({ provincia: id, mortos });
      }
    }

    if (balanco.saldo < 0) {
      // O exército passa aperto sempre que o saldo final não fecha — seja porque nem o
      // povo comeu (fome), seja porque só ele ficou sem (sem mantimentos). Morte não é
      // dispensa: ninguém volta para a população de origem.
      const alvo = mortosPelaFome(
        homens - presosEmCercoDe(nucleo, poder).homens,
        nucleo.ajustes.alimento.mortePorFomeNaTropa,
      );
      mortosDeTropa += nucleo.mobilizacao.matarPorFome(poder, alvo, pouparSitiadas);
    }

    if (mortosDeTropa > 0) tropas.push({ poder, homens: mortosDeTropa });
  }
  return { provincias, tropas };
}

/** Cobra a fração de fome da população desta terra. Devolve quantos caíram. */
function matarCivis(nucleo: NucleoDaCampanha, idProvincia: string): number {
  const mortos = mortosPelaFome(
    populacaoDe(nucleo, idProvincia),
    nucleo.ajustes.alimento.mortePorFome,
  );
  if (mortos <= 0) return 0;
  nucleo.estado.populacao[idProvincia] = Math.max(
    0,
    populacaoDe(nucleo, idProvincia) - mortos,
  );
  return mortos;
}

/** A fome do cerco mata quem está atrás da muralha: hostes do dono e a leva em formação. */
function matarTropaSitiada(
  nucleo: NucleoDaCampanha,
  poder: string,
  sitiadas: readonly string[],
): number {
  const taxa = nucleo.ajustes.alimento.mortePorFomeNaTropa;
  let mortos = 0;
  for (const id of sitiadas) {
    for (const hoste of nucleo.mobilizacao.hostesEm(id)) {
      if (hoste.poder !== poder) continue;
      mortos += nucleo.mobilizacao.matarDaHoste(
        hoste.id,
        mortosPelaFome(nucleo.mobilizacao.forcaDaHoste(hoste.id), taxa),
      );
    }
    const formacao = nucleo.mobilizacao.formacaoEm(id);
    if (formacao?.poder === poder) {
      mortos += nucleo.mobilizacao.matarDaFormacao(id, mortosPelaFome(homensEmFormacao(formacao), taxa));
    }
  }
  return mortos;
}
