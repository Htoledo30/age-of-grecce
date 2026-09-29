/**
 * Alimentação em pontos: capacidade anual do reino, não estoque de mercadoria.
 *
 * Duas contas curtas que o jogador confere de cabeça, nesta ordem:
 *
 *     saldo civil = subsistência + alimentos + grão comprado − população
 *     saldo final = saldo civil − exército
 *
 * **O povo come primeiro.** Se o saldo civil fecha e o final não, quem passa aperto é o
 * EXÉRCITO — não existe fome civil causada só por soldado demais. Se nem o saldo civil
 * fecha, aí sim é Fome: e ela cobra das províncias DEPENDENTES (as que não se sustentam
 * sozinhas), nunca das sustentadoras — quem planta pra dois não morre porque o vizinho
 * não planta pra um.
 *
 * **O tamanho da província importa**: quanto ela come sai da FAIXA de população dela (ver
 * `populacao/faixas.ts`), não de um ponto fixo por terra. Atenas pesa mais que Salamina.
 *
 * **Cidade sitiada está fora da circulação inteira**: não contribui, não pesa, e as
 * tropas dentro dela não entram no custo do exército — ela vive do próprio relógio de
 * mantimentos (ver `Campanha.fomeDoCercoEm`).
 */

import type { Ajustes } from '@/dados/esquema';

type AjustesAlimento = Ajustes['jogo']['alimento'];

export type CategoriaAlimentar =
  | 'fome'
  | 'exercito-sem-mantimentos'
  | 'no-limite'
  | 'abastecido';

/** O papel alimentar de uma província dentro do reino, pelo saldo local dela. */
export type EstadoAlimentarLocal = 'sustentadora' | 'equilibrada' | 'dependente';

export interface ProvinciaNoBalanco {
  /**
   * O que ela come por turno, já resolvido pela faixa de população.
   *
   * ⚠️ Chega PRONTO, e não como população crua: a régua das faixas vive em `ajustes.json` e
   * quem a lê é `populacao/faixas.ts`. Esta função soma pontos, não classifica terras.
   */
  custoDaPopulacao: number;
  /** Soma dos níveis alimentares e construções da terra, LIVRE (sem olhar cerco). */
  producaoAlimentar: number;
  /** Sitiada fica fora da circulação: não contribui, não pesa, não entra na conta. */
  sitiada: boolean;
}

export interface BalancoAlimentarDoPoder {
  subsistencia: number;
  producao: number;
  /** Grão comprado de fora, já limitado pelo que as obras deixam entrar. */
  importacao: number;
  /** Custos são positivos aqui; os saldos é que os subtraem. */
  populacao: number;
  exercito: number;
  /** O que sobra pro povo antes de alimentar soldado: subsistência + produção + importação − população. */
  saldoCivil: number;
  /** O saldo civil menos o exército. É o número da barra. */
  saldo: number;
  /**
   * Quantos homens A MAIS a despensa ainda sustenta.
   *
   * ⚠️ **É o mesmo saldo, dito na única unidade que o jogador entende.** "+1" não significa
   * nada para quem abre a partida; "500 homens" significa tudo — e medido, Atenas abre com o
   * MENOR teto militar do mapa, 18º de 18, sem que nada na tela diga por quê. Ela é a mais rica
   * (renda 774, o dobro do segundo) e a que menos alimenta, porque tem 63.000 bocas numa terra
   * de azeite e prata. A resposta é erguer Fazenda, e é o próprio número que a ensina ao subir.
   */
  homensQueSustenta: number;
  categoria: CategoriaAlimentar;
}

/** O exército inteiro é somado antes de arredondar: dez hostes pequenas não pagam dez vezes. */
export function custoMilitar(totalDeSoldados: number, soldadosPorPonto: number): number {
  if (totalDeSoldados <= 0 || soldadosPorPonto <= 0) return 0;
  return Math.ceil(totalDeSoldados / soldadosPorPonto);
}

/** O papel local: quem produz mais do que come sustenta; quem come mais depende. */
export function estadoAlimentarLocal(saldoLocal: number): EstadoAlimentarLocal {
  if (saldoLocal > 0) return 'sustentadora';
  if (saldoLocal === 0) return 'equilibrada';
  return 'dependente';
}

/**
 * A categoria sai do PAR de saldos, porque a consequência depende de quem não comeu:
 * civil negativo é Fome de gente; civil fechado com final negativo é aperto SÓ da tropa.
 */
export function categoriaAlimentar(saldoCivil: number, saldoFinal: number): CategoriaAlimentar {
  if (saldoCivil < 0) return 'fome';
  if (saldoFinal < 0) return 'exercito-sem-mantimentos';
  if (saldoFinal === 0) return 'no-limite';
  return 'abastecido';
}

/**
 * O balanço do poder. `totalDeSoldados` já vem SEM as tropas presas em cidades sitiadas
 * do próprio poder — elas comem da despensa da cidade, não da mesa do reino.
 */
export function balancoAlimentar(
  provincias: readonly ProvinciaNoBalanco[],
  totalDeSoldados: number,
  ajustes: AjustesAlimento,
  /** Grão comprado que chega neste turno. Só entra se o reino tem terra livre. */
  importacaoComprada = 0,
): BalancoAlimentarDoPoder {
  const livres = provincias.filter((p) => !p.sitiada);
  const subsistencia = livres.length > 0 ? ajustes.subsistenciaPorReino : 0;
  const producao = livres.reduce((soma, p) => soma + Math.max(0, p.producaoAlimentar), 0);
  const populacao = livres.reduce((soma, p) => soma + p.custoDaPopulacao, 0);
  const importacao = livres.length > 0 ? Math.max(0, importacaoComprada) : 0;
  const exercito = custoMilitar(totalDeSoldados, ajustes.soldadosPorPonto);
  const saldoCivil = subsistencia + producao + importacao - populacao;
  const saldo = saldoCivil - exercito;
  return {
    subsistencia,
    producao,
    importacao,
    populacao,
    exercito,
    saldoCivil,
    saldo,
    homensQueSustenta: Math.max(0, Math.floor(
      saldoCivil * ajustes.soldadosPorPonto - totalDeSoldados,
    )),
    categoria: categoriaAlimentar(saldoCivil, saldo),
  };
}

/** Fome é um estado: qualquer saldo negativo cobra a mesma fração, com mínimo de uma morte. */
export function mortosPelaFome(quantidade: number, fator: number): number {
  if (quantidade <= 0 || fator <= 0) return 0;
  return Math.min(Math.floor(quantidade), Math.max(1, Math.floor(quantidade * fator)));
}
