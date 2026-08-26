/**
 * A rede de trocas do reino: **acesso a um bem, não estoque dele.**
 *
 * A regra em uma frase: *você alcança o mármore ou não alcança*. Não existe inventário de
 * mármore, não existe caravana, não existe transporte manual. Um bem que circula rende um
 * valor por turno, **uma vez só** — duas províncias de azeite não rendem duas vezes.
 *
 * ⚠️ **É o bem DISTINTO que paga, não a quantidade**, e é isso que dá à conquista um valor
 * não-linear: tomar a única terra de mármore ao seu alcance vale mais do que tomar a segunda
 * província de azeite. Sem essa regra, conquistar é sempre a mesma soma.
 *
 * Um bem circula quando a província que o dá cumpre TRÊS coisas:
 *
 * 1. **é sua** — território alheio não abastece ninguém;
 * 2. **não está sitiada** — cidade cercada sai da circulação inteira, como já sai da mesa;
 * 3. **chega à capital** — por terra sua, ou por mar entre dois Portos seus. Reino partido
 *    em dois não faz um mercado só; com porto nas duas metades, faz.
 *
 * O terceiro item é o que faz a geografia continuar mandando, e a resposta mora em
 * `circulacao.ts` — a mesma que a parcela de trânsito da renda usa, para as duas nunca
 * discordarem sobre a mesma província.
 */

import type { NucleoDaCampanha } from '../nucleo';
import { construcoesEm, fichaDe, nivelDaConstrucaoEm } from '../provincia/consultas';
import { estaSitiada } from '../guerra/cercos';
import { ligadasACapital } from './circulacao';
import { rendaDoAcordo, rendaTotalDeAcordos } from './acordos';
import { rendaBaseDe } from '../provincia/renda';

export interface BemEmCirculacao {
  id: string;
  nome: string;
  /** O que ele rende por turno ao reino. Sempre uma vez, por mais terras que o deem. */
  troca: number;
  /** As províncias suas que o abastecem, em ordem de id. Serve à tela, não à conta. */
  provincias: readonly string[];
}

/** Os bens distintos que chegam ao reino, em ordem de id. */
export function bensEmCirculacao(
  nucleo: NucleoDaCampanha,
  idPoder: string,
): readonly BemEmCirculacao[] {
  const ligadas = ligadasACapital(nucleo, idPoder);
  const porBem = new Map<string, string[]>();

  for (const id of [...nucleo.territorios.provinciasDe(idPoder)].sort()) {
    if (!ligadas.has(id) || estaSitiada(nucleo, id)) continue;
    const ficha = fichaDe(nucleo, id);
    if (!ficha) continue;
    for (const bem of [ficha.produto, ficha.secundario.produto]) {
      const terras = porBem.get(bem);
      if (terras) terras.push(id);
      else porBem.set(bem, [id]);
    }
  }

  return [...porBem.keys()].sort().flatMap((bem) => {
    const produto = nucleo.economia.produtos[bem];
    const provincias = porBem.get(bem);
    if (!produto || !provincias) return [];
    return [{ id: bem, nome: produto.nome, troca: produto.troca, provincias }];
  });
}

/** O que a rede acrescenta à renda do reino por turno. */
export function rendaDeTrocas(nucleo: NucleoDaCampanha, idPoder: string): number {
  const bruto = bensEmCirculacao(nucleo, idPoder).reduce((soma, bem) => soma + bem.troca, 0);
  return Math.round(bruto * fatorDeMercadoAtual(nucleo, idPoder));
}

/**
 * O que os Mercados do reino multiplicam na rede — **uma vez só, pelo melhor deles.**
 *
 * Vale por REINO e não por província porque a rede é uma coisa nacional: dois Mercados não
 * fazem o mesmo bem circular duas vezes. O que eles fazem é o reino tirar mais de cada bem
 * distinto que alcança — e por isso o Mercado vale mais quanto mais se conquistou, o que
 * liga construção a conquista em vez de deixar as duas em trilhos separados.
 *
 * ⚠️ Antes o Mercado multiplicava a parcela de comércio da PRÓPRIA província, e isso o
 * tornava uma armadilha: `transitoBase` é 0,18 em Tanagra contra 0,60 em Corinto, e
 * multiplicador em cima de quase nada não paga 2.000 moedas nem a manutenção.
 */
export function fatorDeMercadoAtual(nucleo: NucleoDaCampanha, idPoder: string): number {
  let melhor = 1;
  for (const idProvincia of nucleo.territorios.provinciasDe(idPoder)) {
    for (const id of construcoesEm(nucleo, idProvincia)) {
      const efeito = nucleo.catalogo[id]?.efeito;
      if (efeito?.tipo !== 'troca') continue;
      const nivel = nivelDaConstrucaoEm(nucleo, idProvincia, id);
      const fator = efeito.fatores[Math.max(0, Math.min(2, nivel - 1))] ?? 1;
      if (fator > melhor) melhor = fator;
    }
  }
  return melhor;
}

/** Os bens do catálogo que o reino NÃO alcança — a lista do que ainda há para conquistar. */
export function bensAusentes(
  nucleo: NucleoDaCampanha,
  idPoder: string,
): readonly { id: string; nome: string; troca: number }[] {
  const tenho = new Set(bensEmCirculacao(nucleo, idPoder).map((b) => b.id));
  return Object.keys(nucleo.economia.produtos)
    .sort()
    .flatMap((id) => {
      const produto = nucleo.economia.produtos[id];
      return produto && !tenho.has(id)
        ? [{ id, nome: produto.nome, troca: produto.troca }]
        : [];
    });
}

/**
 * O que os ACORDOS DE COMÉRCIO deste poder rendem por turno, somados e com saturação.
 *
 * Fica ao lado da rede de trocas porque são as duas parcelas nacionais da renda — nenhuma cabe
 * em província nenhuma. Mas são coisas diferentes, e de propósito: **a rede é o que a sua terra
 * alcança; o acordo é o que a diplomacia abriu.** Quem quer o bem toma a terra.
 */
export function rendaDeAcordos(nucleo: NucleoDaCampanha, idPoder: string): number {
  const ajustes = nucleo.ajustes.acordoDeComercio;
  const minha = rendaBaseDe(nucleo, idPoder);
  const valores: number[] = [];
  for (const par of Object.keys(nucleo.estado.acordos).sort()) {
    const [a, b] = par.split('|');
    if (a === undefined || b === undefined) continue;
    const outro = a === idPoder ? b : b === idPoder ? a : null;
    if (outro === null) continue;
    valores.push(rendaDoAcordo(minha, rendaBaseDe(nucleo, outro), ajustes));
  }
  return rendaTotalDeAcordos(valores, ajustes);
}

/** Com quem este poder tem acordo de comércio, em ordem de id. */
export function acordosDe(nucleo: NucleoDaCampanha, idPoder: string): readonly string[] {
  const parceiros: string[] = [];
  for (const par of Object.keys(nucleo.estado.acordos).sort()) {
    const [a, b] = par.split('|');
    if (a === undefined || b === undefined) continue;
    if (a === idPoder) parceiros.push(b);
    else if (b === idPoder) parceiros.push(a);
  }
  return parceiros.sort();
}
