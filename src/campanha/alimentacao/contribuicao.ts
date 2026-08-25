/**
 * O que cada terra põe na mesa, e quanto a gente dela come.
 *
 * É a camada mais baixa da alimentação: nenhuma consequência mora aqui, só as contas
 * locais que o balanço do reino soma e que a fome usa pra decidir quem morre.
 */

import { estadoAlimentarLocal, nivelPopulacional } from '@/producao/alimentacao';
import type { EstadoAlimentarLocal } from '@/producao/alimentacao';
import type { NucleoDaCampanha } from '../nucleo';
import { construcoesEm, fichaDe, nivelDaConstrucaoEm, populacaoDe } from '../provincia/consultas';
import { estaSitiada } from '../guerra/cercos';

/** É comida? Pergunta ao catálogo de produtos, que é quem sabe. */
function ehAlimento(nucleo: NucleoDaCampanha, produto: string): boolean {
  return nucleo.economia.produtos[produto]?.alimento === true;
}

/** Produtos alimentares da terra. Cerco zera a contribuição, mas não apaga sua identidade. */
export function produtosAlimentaresEm(
  nucleo: NucleoDaCampanha,
  idProvincia: string,
): readonly { id: string; nome: string; nivel: number }[] {
  const ficha = fichaDe(nucleo, idProvincia);
  if (!ficha) return [];
  return [
    { id: ficha.produto, nivel: ficha.nivel },
    { id: ficha.secundario.produto, nivel: ficha.secundario.nivel },
  ]
    .filter((produto) => ehAlimento(nucleo, produto.id))
    .map((produto) => ({
      ...produto,
      nome: nucleo.economia.produtos[produto.id]?.nome ?? produto.id,
    }));
}

/**
 * O que a terra daria LIVRE: produtos e construções, ignorando o cerco.
 *
 * É a conta que separa os dois regimes da fome: a despensa da cidade sitiada é medida por
 * ela, e é dela que sai o saldo local de quem está solto.
 */
export function contribuicaoAlimentarLivreEm(
  nucleo: NucleoDaCampanha,
  idProvincia: string,
): number {
  const natural = produtosAlimentaresEm(nucleo, idProvincia).reduce(
    (soma, produto) => soma + produto.nivel,
    0,
  );
  let construcoes = 0;
  for (const id of construcoesEm(nucleo, idProvincia)) {
    const nivel = nivelDaConstrucaoEm(nucleo, idProvincia, id);
    const efeito = nucleo.catalogo[id]?.efeito;
    if (efeito?.tipo === 'alimento') construcoes += efeito.pontos[nivel - 1] ?? 0;
  }
  return natural + construcoes;
}

/** O que esta terra entrega ao reino NESTE turno. Cidade sitiada não entrega nada. */
export function contribuicaoAlimentarEm(
  nucleo: NucleoDaCampanha,
  idProvincia: string,
): number {
  return estaSitiada(nucleo, idProvincia)
    ? 0
    : contribuicaoAlimentarLivreEm(nucleo, idProvincia);
}

/** Quantos pontos de alimento a população desta província consome. */
export function nivelPopulacionalEm(
  nucleo: NucleoDaCampanha,
  idProvincia: string,
): number {
  const ficha = fichaDe(nucleo, idProvincia);
  if (!ficha) return 0;
  return nivelPopulacional(
    populacaoDe(nucleo, idProvincia),
    ficha.populacao,
    nucleo.ajustes.alimento.fracaoPopulacionalPorNivel,
  );
}

/**
 * O saldo local da província: o que a terra dá menos o que a gente dela come.
 *
 * É o número que dá papel a cada território — Sustentadora, Equilibrada ou Dependente —
 * e é ele que decide QUEM morre quando o saldo civil do reino não fecha.
 */
export function saldoAlimentarLocalEm(
  nucleo: NucleoDaCampanha,
  idProvincia: string,
): number {
  return (
    contribuicaoAlimentarLivreEm(nucleo, idProvincia) - nivelPopulacionalEm(nucleo, idProvincia)
  );
}

/** O papel alimentar desta província dentro do reino. */
export function estadoAlimentarLocalEm(
  nucleo: NucleoDaCampanha,
  idProvincia: string,
): EstadoAlimentarLocal {
  return estadoAlimentarLocal(saldoAlimentarLocalEm(nucleo, idProvincia));
}
