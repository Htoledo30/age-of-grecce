/**
 * A IA comprando grão — **o cofre parado virando exército.**
 *
 * Ela compra pelo mesmo motivo que planta: a despensa é o que trava o exército. Duas
 * necessidades, e vale a maior:
 *
 * 1. **Fome.** Saldo negativo mata tropa e, se for civil, gente. Compra o que falta para zerar.
 * 2. **Gargalo.** A despensa não aguenta o exército que a folha de guerra dela bancaria — a
 *    mesma pergunta de `despensaApertada`. Compra o que falta para ela deixar de ser apertada.
 *
 * E paga como um reino paga: pela fatia da renda que o estilo topa (`fatiaParaGrao`) ou pelo
 * cofre, se ele aguentar a conta por `TURNOS_NO_COFRE` turnos. ⚠️ **O cofre é a razão de isto
 * existir.** Medido em 250 turnos, quem vencia a expansão guardava 120 mil moedas com três mil
 * homens em armas; sem o cofre na conta, a renda de hoje decidiria sozinha e o dinheiro
 * continuaria parado.
 *
 * Fora dessas duas necessidades ela não compra: grão para o povo crescer é luxo que ela deixa
 * para o jogador decidir.
 */

import type { Campanha } from '@/campanha/campanha';
import type { Ajustes, EstiloDeIa } from '@/dados/esquema';
import { comidaDoExercitoQueOReinoBanca } from '../percepcao/sustento';

/** Quantos turnos de grão o cofre precisa pagar sozinho para ela comprar por ele. */
const TURNOS_NO_COFRE = 40;

/** A encomenda que este poder quer AGORA, ou `null` quando a de hoje já está certa. */
export function importacaoEscolhida(
  campanha: Campanha,
  idPoder: string,
  estilo: EstiloDeIa,
  ajustes: Ajustes['jogo'],
): number | null {
  const atual = campanha.encomendaDeGraoDe(idPoder);
  const capacidade = campanha.capacidadeDeImportacaoDe(idPoder);
  const chegando = campanha.importacaoDe(idPoder);

  // O saldo SEM o grão de hoje: a pergunta é quanto falta, não quanto já se compra.
  const saldo = campanha.balancoAlimentarDe(idPoder).saldo - chegando;
  const contraFome = Math.max(0, -saldo);
  const exercitoPossivel = comidaDoExercitoQueOReinoBanca(campanha, idPoder, estilo, ajustes);
  const contraGargalo = Math.max(0, Math.ceil(exercitoPossivel + estilo.limiarDeAperto + 1 - saldo));
  let quer = Math.min(capacidade, Math.max(contraFome, contraGargalo));

  const rendaSemGrao = campanha.rendaDe(idPoder) + campanha.custoDaImportacao(chegando);
  const pelaRenda = Math.max(0, rendaSemGrao) * estilo.fatiaParaGrao;
  const peloCofre = campanha.tesouroDe(idPoder) / TURNOS_NO_COFRE;
  const teto = Math.max(pelaRenda, peloCofre);
  while (quer > 0 && campanha.custoDaImportacao(quer) > teto) quer -= 1;

  return quer === atual ? null : quer;
}
