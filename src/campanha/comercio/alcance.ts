/**
 * O ALCANCE do comércio: até onde a mercadoria de um reino chega.
 *
 * Henrique jogando, sobre o acordo de comércio: *"comércio não rende quase nada, não sei o
 * porquê"*. Medido, o porquê apareceu inteiro — e não era o valor do acordo:
 *
 * | | o jogador | a IA |
 * |---|---|---|
 * | parceiros possíveis | **2** | **17** |
 * | acordos aos 100 turnos | 2 | 7 a 16 |
 * | comércio na renda | ~4% | 18% a 40% |
 *
 * A regra nunca exigiu fronteira; quem limitava era a TELA da diplomacia, que listava só os
 * vizinhos. E os dois vizinhos de Atenas são os poderes mais pobres da região — um acordo com
 * Elêusis paga 23 por turno, um com Argos pagaria 48. O jogador estava preso aos dois piores
 * parceiros do mapa enquanto Corinto assinava com quinze.
 *
 * ⚠️ **A resposta não foi abrir tudo: foi o PORTO.** Decisão de Henrique, e ela já estava
 * escrita no próprio catálogo — o motivo do Porto prometia a rota de mar desde antes de a
 * regra existir. Faltava a regra cumprir o que o dado prometia.
 *
 * A ressalva que aquele texto trazia — *"mas exército, não: isso é frota"* — caiu depois, e
 * caiu porque Henrique decidiu que não haveria frota: o exército atravessa **andando** pelas
 * zonas de mar. O Porto virou a porta das duas coisas.
 *
 * Três coisas caem sozinhas dessa escolha:
 *
 * 1. **Distância passa a custar**, e não a proibir. Quem quer comerciar longe constrói.
 * 2. **O Porto ganha uma segunda razão de existir** além do trânsito — e vira a obra que
 *    abre o mapa diplomático, que é o papel histórico dele.
 * 3. **Vale igual para os dois lados.** A IA deixa de negociar de graça com quem ela nunca
 *    alcançaria, e o jogador deixa de ser o único preso à fronteira.
 */

import type { NucleoDaCampanha } from '../nucleo';
import { bloqueadaEm } from '../guerra/bloqueio';

/** O id da obra que abre o mar. Um só lugar sabe disso. */
const PORTO = 'porto';

/** Estes dois poderes se tocam em alguma província? */
function fazemFronteira(nucleo: NucleoDaCampanha, a: string, b: string): boolean {
  const minhas = new Set(nucleo.territorios.provinciasDe(a));
  return nucleo.territorios
    .provinciasDe(b)
    .some((id) => nucleo.atlas.provincia(id).vizinhas.some((v) => minhas.has(v)));
}

/** Esta terra tem Porto de pé? É por ela que o exército embarca. */
export function temPortoEm(nucleo: NucleoDaCampanha, idProvincia: string): boolean {
  return (nucleo.estado.construcoes[idProvincia]?.[PORTO] ?? 0) > 0;
}

/**
 * Este reino tem Porto ABERTO em alguma terra? É o que põe a mercadoria dele no mar.
 *
 * ⚠️ **Cais bloqueado não conta**, e é por aqui que o bloqueio naval chega ao comércio: um reino
 * com todos os portos fechados por frota inimiga deixa de alcançar por mar, e os acordos que só
 * existiam por água param de render. Ver `guerra/bloqueio.ts`.
 */
export function temPorto(nucleo: NucleoDaCampanha, idPoder: string): boolean {
  return nucleo.territorios
    .provinciasDe(idPoder)
    .some((id) => temPortoEm(nucleo, id) && !bloqueadaEm(nucleo, id));
}

/**
 * A mercadoria destes dois se encontra em algum lugar?
 *
 * Por terra quando eles se tocam; por mar quando os DOIS têm Porto. Sem uma coisa nem outra
 * não há rota — e um acordo assinado sobre rota nenhuma seria dinheiro nascendo do nada.
 */
export function alcancaComercio(nucleo: NucleoDaCampanha, a: string, b: string): boolean {
  // ⚠️ **O mar é perguntado ANTES da fronteira, e é desempenho.** Desde que a renda confere a
  // rota de cada acordo TODO TURNO, esta função virou caminho quente; `fazemFronteira` cruza
  // as províncias de um com a vizinhança das do outro, e `temPorto` só varre uma lista curta.
  // O `||` dá o mesmo resultado nas duas ordens.
  return (temPorto(nucleo, a) && temPorto(nucleo, b)) || fazemFronteira(nucleo, a, b);
}
