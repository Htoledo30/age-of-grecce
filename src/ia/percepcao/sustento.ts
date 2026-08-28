/**
 * O que sustenta um exército: a FOLHA, em ouro, e a DESPENSA, em comida.
 *
 * As duas perguntas moram juntas porque a segunda precisa da primeira, e porque as duas são
 * de PERCEPÇÃO — elas leem o mundo e não mexem nele. Quem decide o que fazer com a resposta é
 * `guerra/recrutar.ts` (que leva levanta) e `economia/construir.ts` (que obra ergue).
 *
 * ## A despensa apertada olha para FRENTE, e não para o saldo de hoje
 *
 * ⚠️ **Esta é a diferença que faz a IA plantar para crescer, em vez de plantar por
 * emergência.** A regra antiga era `saldo <= limiarDeAperto`: a despensa só contava como
 * apertada quando já estava no chão. O efeito, medido em 100 turnos com o alimento apertado
 * (um ponto para cada 500 soldados), era um ciclo de bombeiro — **21 das 28 obras de comida
 * eram erguidas com a parede já nas costas.** Ela batia no teto, parava de recrutar, erguia a
 * fazenda, voltava a recrutar. Nunca "vou plantar agora porque quero um exército maior daqui
 * a dez turnos", que foi exatamente a queixa de Henrique.
 *
 * A pergunta certa é a que um jogador faz: **se eu puser em pé o exército que a minha economia
 * banca, a despensa fecha?** Se não fecha, a comida é o meu gargalo — e a fazenda vale o preço
 * de emergência AGORA, antes de o gargalo apertar.
 *
 * ⚠️ **O dial não mudou, só o que ele mede.** Continua sendo `limiarDeAperto`, no mesmo
 * número de pontos; o que se compara com ele é que passou a ser o saldo DEPOIS da leva, e não
 * o saldo de hoje. Um estilo que quiser a regra velha é só pôr um limiar muito negativo, como
 * os testes fazem.
 *
 * ⚠️ **E ela se ajusta sozinha a `soldadosPorPonto`.** É o número que Henrique mexeu, e o que
 * ele muda é quanto exército um ponto de comida compra — de 3.000 homens para 500. A conta
 * daqui é em BOCAS, então ela sente a mudança inteira sem ninguém reajustar um peso em
 * `dados/ia.json`. A regra velha não sentia: um ponto ficou seis vezes mais valioso em
 * soldado e o gatilho continuava disparando no mesmo lugar.
 */

import type { Campanha } from '@/campanha/campanha';
import type { Ajustes, EstiloDeIa } from '@/dados/esquema';
import { estaAmeacado } from './ameaca';

/**
 * Quanto ainda cabe na folha militar deste poder, em moedas por turno.
 *
 * A renda menos o que a tropa já custa, limitado pela fatia que o estilo topa gastar. É o
 * único teto que a IA se impõe sozinha — os outros dois (a comida e a gente) vêm do mundo.
 *
 * ⚠️ **A conta VERDADEIRA, e não uma estimativa.** `manutencaoDe` é a mesma que a barra de
 * turno mostra e que o tesouro paga: ela já sabe quem está em casa e quem pisa em terra alheia
 * pagando a taxa de campanha. Multiplicar homens pela taxa de casa dava no mesmo enquanto a IA
 * não saía do reino — e erraria feio no dia em que saísse.
 *
 * ⚠️ **E são DUAS folhas: a de paz e a de guerra.** Com uma só, ela alistava o exército
 * inteiro no turno 1. Guerra aqui é ter alguém nas suas terras ou na porta delas, e não uma
 * declaração — ver `estaAmeacado`.
 */
export function folgaDaFolha(campanha: Campanha, idPoder: string, estilo: EstiloDeIa): number {
  const renda = campanha.rendaDe(idPoder);
  const folhaAtual = campanha.manutencaoDe(idPoder);
  const teto = estaAmeacado(campanha, idPoder) ? estilo.folhaMilitar : estilo.folhaEmPaz;
  return renda * teto - folhaAtual;
}

/**
 * O que comeria, em pontos, o exército que a economia deste reino BANCA.
 *
 * ⚠️ **Pela folha de GUERRA, e nunca pela de paz — e a primeira versão errou justamente
 * aqui.** Usando `folgaDaFolha`, que troca de teto conforme haja ou não inimigo na porta, a
 * conta em paz dava menos de um ponto: a folha de paz é um décimo da renda, e a IA se
 * declarava folgada porque a leva que ela pagaria HOJE era minúscula. Medido, a antecipação
 * quase não disparava — 21 das 28 fazendas continuavam saindo com a parede nas costas.
 *
 * A pergunta que faz um reino estocar celeiro não é "cabe a leva de hoje". É **"cabe o
 * exército que eu poderia pôr em pé se amanhã eu precisasse"** — e esse é o da folha de
 * guerra. Celeiro se enche em paz; quem espera a guerra para plantar planta tarde.
 *
 * ⚠️ **E conta com a arma mais BARATA de alimentar, de propósito.** Um ponto por
 * `soldadosPorPonto` homens é o piso: cavalaria come quase o dobro. Se nem o mínimo cabe, a
 * comida é o gargalo sem discussão possível.
 */
function comidaDoExercitoQueOReinoBanca(
  campanha: Campanha,
  idPoder: string,
  estilo: EstiloDeIa,
  ajustes: Ajustes['jogo'],
): number {
  const folga = campanha.rendaDe(idPoder) * estilo.folhaMilitar - campanha.manutencaoDe(idPoder);
  if (folga <= 0) return 0;
  const homens = folga / ajustes.combate.manutencaoPorHomem.emCasa;
  return homens / ajustes.alimento.soldadosPorPonto;
}

/**
 * A despensa deste poder está NO CHÃO — o saldo de hoje já está no limiar ou abaixo.
 *
 * ⚠️ **É a emergência, e ela continua existindo depois que o aperto passou a olhar para
 * frente.** São duas perguntas diferentes e elas pedem respostas de tamanhos diferentes: aqui
 * a fazenda vale `alimentoApertado`, que é altíssimo e raro; no gargalo ela vale
 * `alimentoNoGargalo`, que é o preço de quem planeja. Cobrar a emergência na rotina fez a IA
 * construir só fazenda — 33% menos riqueza no mapa e 5 poderes vivos de 18 em 150 turnos.
 */
export function despensaNoChao(campanha: Campanha, idPoder: string, estilo: EstiloDeIa): boolean {
  return campanha.balancoAlimentarDe(idPoder).saldo <= estilo.limiarDeAperto;
}

/**
 * A despensa deste poder está apertada — ou seja, **a comida é o que trava o exército dele?**
 *
 * Não é "o saldo está baixo" (isso é `despensaNoChao`): é "o saldo não aguenta o exército que
 * o ouro bancaria". Ver o comentário longo no topo do arquivo.
 */
export function despensaApertada(
  campanha: Campanha,
  idPoder: string,
  estilo: EstiloDeIa,
  ajustes: Ajustes['jogo'],
): boolean {
  const saldo = campanha.balancoAlimentarDe(idPoder).saldo;
  const exercitoPossivel = comidaDoExercitoQueOReinoBanca(campanha, idPoder, estilo, ajustes);
  return saldo - exercitoPossivel <= estilo.limiarDeAperto;
}
