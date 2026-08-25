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

import { bocasDe } from '@/combate/composicao';
import { homensEmFormacao } from '@/combate/formacao-de-leva';
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
  // ⚠️ **BOCAS, não homens.** Um cavaleiro pesa na mesa por vários soldados de pé, e é assim
  // que a cavalaria cobra o preço dela: sobre a terra, não sobre o tesouro. Exército só de
  // leves dá exatamente o mesmo número de antes, porque o leve é a régua.
  const bocas = nucleo.mobilizacao.bocasEmArmasDe(idPoder) - presosEmCercoDe(nucleo, idPoder).bocas;
  return balancoAlimentar(provincias, bocas, nucleo.ajustes.alimento);
}

/**
 * Quem o poder tem preso dentro das PRÓPRIAS cidades sitiadas — hostes e levas.
 *
 * ⚠️ **Devolve as duas contas de uma varredura só**, e elas não são a mesma coisa: `bocas`
 * sai da mesa do reino porque a cidade os alimenta, e `homens` é quem morre quando a fome
 * cobra. Um cavaleiro é várias bocas e um morto só. Separar em duas funções faria a mesma
 * lista de províncias ser percorrida duas vezes com a chance de as duas discordarem sobre
 * quem está sitiado.
 */
export function presosEmCercoDe(
  nucleo: NucleoDaCampanha,
  idPoder: string,
): { homens: number; bocas: number } {
  let homens = 0;
  let bocas = 0;
  for (const id of nucleo.territorios.provinciasDe(idPoder)) {
    if (!estaSitiada(nucleo, id)) continue;
    for (const hoste of nucleo.mobilizacao.hostesEm(id)) {
      if (hoste.poder !== idPoder) continue;
      homens += nucleo.mobilizacao.forcaDaHoste(hoste.id);
      bocas += nucleo.mobilizacao.bocasDaHoste(hoste.id);
    }
    const formacao = nucleo.mobilizacao.formacaoEm(id);
    if (formacao?.poder === idPoder) {
      homens += homensEmFormacao(formacao);
      bocas += bocasDe(formacao.contingentes, nucleo.ajustes.combate.batalha);
    }
  }
  return { homens, bocas };
}

/** As províncias sitiadas do poder — as que estão fora da circulação do reino. */
export function sitiadasDe(
  nucleo: NucleoDaCampanha,
  idPoder: string,
): readonly string[] {
  return simuladasDe(nucleo, idPoder).filter((id) => estaSitiada(nucleo, id));
}
