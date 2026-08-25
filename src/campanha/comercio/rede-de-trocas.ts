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
import { donoDe, fichaDe } from '../provincia/consultas';
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
  return bensEmCirculacao(nucleo, idPoder).reduce((soma, bem) => soma + bem.troca, 0);
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
