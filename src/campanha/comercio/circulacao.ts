/**
 * O que o reino ALCANÇA a partir da própria capital — por terra sua, e agora por mar.
 *
 * Uma pergunta só, três consumidores: a rede de trocas (que bens circulam), a parcela de
 * TRÂNSITO da renda (que terras conseguem mandar o pedágio ao tesouro) e a tela, que mostra
 * as duas coisas. Antes cada um responderia por conta própria, e um dia diriam coisas
 * diferentes sobre a mesma província.
 *
 * ## O mar
 *
 * ⚠️ **Duas terras suas com Porto estão ligadas entre si, por mais mar que haja no meio.**
 * É o que o Porto sempre prometeu e nunca entregou: até aqui ele só multiplicava um número.
 * Com esta regra, Salamina deixa de estar fora do jogo, um reino partido ao meio volta a ser
 * um mercado só se as duas metades tiverem porto, e "onde ergo o segundo Porto?" vira uma
 * pergunta de mapa.
 *
 * ⚠️ **Precisa de porto NOS DOIS lados**, e não de um só. Navio mercante atraca em algum
 * lugar: uma ponta sozinha não é rota, é um cais olhando para o horizonte. É também o que
 * transforma o Porto numa decisão emparelhada — dois slots, duas obras — em vez de um
 * interruptor.
 *
 * ⚠️ **Isto NÃO move exército, e continua não movendo.** Mercadoria neste jogo é abstrata: não
 * há inventário, não há caravana, não há navio no mapa — então uma rota de mar abstrata cabe.
 * Hoste é peça concreta, com posição e batalha, e ela atravessa o mar **andando**, zona por
 * zona, um salto por rodada, podendo ser interceptada — ver `movimento/alcance.ts`. As duas
 * rotas saem da mesma porta, o Porto, e param aí de se parecer: confundi-las daria
 * teletransporte de exército com nome de comércio.
 */

import { alcanceDe } from '@/movimento/alcance';
import type { NucleoDaCampanha } from '../nucleo';
import { construcoesEm, donoDe } from '../provincia/consultas';

/**
 * As terras do poder ligadas à capital, a capital inclusive.
 *
 * Vazio quando não há capital — e isso é consequência, não descuido: sem sede não há
 * mercado nem tesouro que receba, e o reino que perdeu a capital passa um turno assim até
 * assentar outra.
 */
export function ligadasACapital(
  nucleo: NucleoDaCampanha,
  idPoder: string,
): ReadonlySet<string> {
  const capital = nucleo.estado.capitais[idPoder];
  if (capital === undefined) return new Set();

  const minhas = (id: string): boolean => donoDe(nucleo, id) === idPoder;
  const ligadas = new Set<string>([capital]);
  // Os portos entram de uma vez: a lista não muda durante a busca, e recalculá-la a cada
  // salto faria o custo virar quadrático sem mudar resposta nenhuma.
  const portos = portosDe(nucleo, idPoder);

  // Fila de ilhas: cada rodada expande uma cabeça de ponte por terra, e depois embarca para
  // todo porto ainda não alcançado. Duas rodadas bastam no mapa de hoje, mas o laço não
  // supõe isso — reino em três pedaços com porto em cada um continua sendo um mercado só.
  const porVisitar = [capital];
  while (porVisitar.length > 0) {
    const daqui = porVisitar.pop();
    if (daqui === undefined) break;
    for (const id of alcanceDe(nucleo.atlas, daqui, minhas)) ligadas.add(id);
    // Chegando a um porto seu, embarca-se para todos os outros.
    if (![...ligadas].some((id) => portos.has(id))) continue;
    for (const porto of portos) {
      if (ligadas.has(porto)) continue;
      ligadas.add(porto);
      porVisitar.push(porto);
    }
  }

  return ligadas;
}

/**
 * Esta província manda o que produz ao tesouro do próprio dono?
 *
 * `false` na terra cortada do resto do reino — e é isso que dá à guerra uma consequência
 * econômica que não é cerco: partir um império ao meio passa a custar caro a ele.
 */
export function ligadaACapital(nucleo: NucleoDaCampanha, idProvincia: string): boolean {
  return ligadasACapital(nucleo, donoDe(nucleo, idProvincia)).has(idProvincia);
}

/**
 * As terras deste poder que têm obra de ligação marítima.
 *
 * Lê o CATÁLOGO e não o id `porto`: amarrar a regra a um id de conteúdo quebraria no dia em
 * que existir um segundo tipo de ancoradouro — e é a mesma razão pela qual a Muralha declara
 * `impedeAssaltoImediato` em vez de o combate procurar por `muralha`.
 */
function portosDe(nucleo: NucleoDaCampanha, idPoder: string): ReadonlySet<string> {
  const portos = new Set<string>();
  for (const idProvincia of nucleo.territorios.provinciasDe(idPoder)) {
    for (const id of construcoesEm(nucleo, idProvincia)) {
      if (nucleo.catalogo[id]?.ligaPorMar === true) portos.add(idProvincia);
    }
  }
  return portos;
}
