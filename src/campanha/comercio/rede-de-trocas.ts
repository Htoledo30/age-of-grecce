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
 * 3. **chega à capital por terra própria** — reino partido em dois não faz um mercado só, e
 *    ilha sem ligação terrestre fica de fora até o Porto e o mar existirem.
 *
 * O terceiro item é o que faz a geografia continuar mandando, e é o mesmo caminho que a
 * hoste percorre: `alcanceDe` responde "este reino é contínuo a partir daqui?".
 */

import { alcanceDe } from '@/movimento/alcance';
import type { NucleoDaCampanha } from '../nucleo';
import { construcoesEm, donoDe, fichaDe, nivelDaConstrucaoEm } from '../provincia/consultas';
import { estaSitiada } from '../guerra/cercos';

export interface BemEmCirculacao {
  id: string;
  nome: string;
  /** O que ele rende por turno ao reino. Sempre uma vez, por mais terras que o deem. */
  troca: number;
  /** As províncias suas que o abastecem, em ordem de id. Serve à tela, não à conta. */
  provincias: readonly string[];
}

/**
 * As províncias do poder ligadas à capital por terra PRÓPRIA, a capital inclusive.
 *
 * Vazio quando não há capital — e isso é consequência, não descuido: sem sede não há
 * mercado, e o reino que perdeu a capital passa um turno sem a rede até assentar outra.
 */
function ligadasAcapital(nucleo: NucleoDaCampanha, idPoder: string): ReadonlySet<string> {
  const capital = nucleo.estado.capitais[idPoder];
  if (capital === undefined) return new Set();
  const alcancadas = alcanceDe(
    nucleo.atlas,
    capital,
    (id) => donoDe(nucleo, id) === idPoder,
  );
  return new Set([capital, ...alcancadas]);
}

/** Os bens distintos que chegam ao reino, em ordem de id. */
export function bensEmCirculacao(
  nucleo: NucleoDaCampanha,
  idPoder: string,
): readonly BemEmCirculacao[] {
  const ligadas = ligadasAcapital(nucleo, idPoder);
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
 * tornava uma armadilha: `comercioBase` é 0,18 em Tanagra contra 0,60 em Corinto, e
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
