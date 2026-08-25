/**
 * A conta única da comida do reino — a que alimenta regra, barra e Governo.
 *
 * Duas contas curtas, nesta ordem: `saldo civil = subsistência + alimentos − população` e
 * `saldo final = saldo civil − exército`. **O povo come primeiro**, e é a diferença entre
 * as duas que separa Fome de "exército sem mantimentos".
 *
 * As cidades sitiadas ficam fora de tudo: não contribuem, não pesam, e as tropas presas
 * dentro delas não entram no custo do exército — elas comem da despensa da cidade, não da
 * mesa do reino, e ninguém paga a mesma fome duas vezes.
 */

import { balancoAlimentar } from '@/producao/alimentacao';
import type { BalancoAlimentarDoPoder } from '@/producao/alimentacao';
import type { NucleoDaCampanha } from '../nucleo';
import { simuladasDe } from '../provincia/consultas';
import { estaSitiada } from '../guerra/cercos';
import { contribuicaoAlimentarLivreEm, nivelPopulacionalEm } from './contribuicao';

/** Conta única que alimenta regra, barra e Governo. */
export function balancoAlimentarDe(
  nucleo: NucleoDaCampanha,
  idPoder: string,
): BalancoAlimentarDoPoder {
  const provincias = simuladasDe(nucleo, idPoder).map((id) => ({
    custoDaPopulacao: nivelPopulacionalEm(nucleo, id),
    producaoAlimentar: contribuicaoAlimentarLivreEm(nucleo, id),
    sitiada: estaSitiada(nucleo, id),
  }));
  const soldados = nucleo.mobilizacao.homensDe(idPoder) - homensSitiadosDe(nucleo, idPoder);
  return balancoAlimentar(provincias, soldados, nucleo.ajustes.alimento);
}

/** Homens do poder presos dentro das PRÓPRIAS cidades sitiadas: hostes e levas. */
export function homensSitiadosDe(nucleo: NucleoDaCampanha, idPoder: string): number {
  let homens = 0;
  for (const id of nucleo.territorios.provinciasDe(idPoder)) {
    if (!estaSitiada(nucleo, id)) continue;
    for (const hoste of nucleo.mobilizacao.hostesEm(id)) {
      if (hoste.poder === idPoder) homens += nucleo.mobilizacao.forcaDaHoste(hoste.id);
    }
    const formacao = nucleo.mobilizacao.formacaoEm(id);
    if (formacao?.poder === idPoder) homens += formacao.homens;
  }
  return homens;
}

/** As províncias sitiadas do poder — as que estão fora da circulação do reino. */
export function sitiadasDe(
  nucleo: NucleoDaCampanha,
  idPoder: string,
): readonly string[] {
  return simuladasDe(nucleo, idPoder).filter((id) => estaSitiada(nucleo, id));
}
