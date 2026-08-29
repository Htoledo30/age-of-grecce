/**
 * A IA BLOQUEANDO — **a primeira razão que ela tem para FICAR numa água.**
 *
 * Até aqui toda decisão naval dela era de trânsito: zarpar, atravessar, desembarcar, voltar. A
 * água era estrada, e estrada não se ocupa. O bloqueio (`campanha/guerra/bloqueio.ts`) deu à
 * zona de mar a única coisa que ela podia ter sem ter dono — **o que passa por ela** —, e este
 * arquivo é a IA aprendendo a querer isso.
 *
 * ## A decisão, em três perguntas
 *
 * 1. **Que água vale a pena?** A que banha mais cais inimigos abertos. Uma zona de mar toca meia
 *    dúzia de províncias, então há posições que fecham três portos de uma vez — e é essa
 *    desigualdade que faz o Golfo Sarônico valer uma guerra e o Mar de Rodes não.
 * 2. **Eu aguento ficar lá?** A previsão é a mesma do resto: contra quem já está na zona, com o
 *    desempate para quem estava. Bloqueio perdido é o exército morrendo num lugar que não dá
 *    nem chão de consolo.
 * 3. **Sobra reino em casa?** A mesma fatia de sempre. Frota parada é exército em campanha —
 *    paga a folha cheia e não defende nada.
 *
 * ⚠️ **QUEM JÁ ESTÁ BLOQUEANDO FICA, e sem isto a regra não existiria.** Uma hoste na água é,
 * para a retirada, uma hoste fora do próprio reino — e *"a terra deixou de ser inimiga"* é
 * sempre verdade no mar, então ela seria trazida de volta na virada seguinte e o bloqueio
 * duraria um turno. A ordem de MANTER não é ordem nenhuma no tabuleiro: ela só reserva a hoste,
 * e é `ia.ts` quem passa a lista adiante para que a retirada não a reivindique. É a mesma
 * mecânica que já protege a travessia.
 *
 * ⚠️ **Não se bloqueia quem não tem cais.** Porto fechado por outro já não fecha de novo, e água
 * sem Porto nenhum na volta é só água.
 */

import type { Campanha } from '@/campanha/campanha';
import type { Ajustes, EstiloDeIa } from '@/dados/esquema';
import { estaAmeacado, forcaTotalDe } from '../percepcao/ameaca';
import { venceria } from '../percepcao/prever';

type AjustesDeCombate = Ajustes['jogo']['combate'];

/** Uma frota mandada a uma água, ou mantida na que já ocupa. */
export interface OrdemDeBloqueio {
  hoste: string;
  /** A zona de mar. Igual à posição atual quando `manter` é verdadeiro. */
  destino: string;
  homens: number;
  /** Ela já está lá: não há ordem a dar, só a hoste a reservar. */
  manter: boolean;
}

export function bloqueiosEscolhidos(
  campanha: Campanha,
  idPoder: string,
  estilo: EstiloDeIa,
  ajustes: AjustesDeCombate,
  jaMandadas: ReadonlySet<string>,
): readonly OrdemDeBloqueio[] {
  const zonas = aguasQueValem(campanha, idPoder);
  if (zonas.length === 0) return [];

  const ordens: OrdemDeBloqueio[] = [];
  const usadas = new Set(jaMandadas);

  // ── 1. Quem já está numa água que vale, fica ─────────────────────────────────────────
  //
  // Sem gastar fatia nenhuma, e pela mesma razão da travessia: `fracaoQueMarcha` já desconta
  // quem está fora de casa, e uma frota parada desconta a si mesma. Cobrando dela de novo a
  // cada virada, a conta zeraria no segundo turno e o bloqueio se desfaria sozinho.
  const valem = new Set(zonas.map((z) => z.zona));
  for (const hoste of campanha.hostes()) {
    if (hoste.poder !== idPoder || usadas.has(hoste.id)) continue;
    if (!valem.has(hoste.posicao)) continue;
    const homens = campanha.forcaDaHoste(hoste.id);
    if (homens <= 0) continue;
    usadas.add(hoste.id);
    ordens.push({ hoste: hoste.id, destino: hoste.posicao, homens, manter: true });
  }

  // ── 2. E quem sai hoje gasta a fatia que pode deixar a casa ──────────────────────────
  //
  // ⚠️ Casa em chamas fecha o cais, como na travessia: com inimigo pisando em terra minha,
  // exército que zarpa é exército que falta. Quem JÁ está bloqueando não é atingido — está a
  // turnos de distância de qualquer socorro, e desfazer o bloqueio não apaga incêndio nenhum.
  if (estaAmeacado(campanha, idPoder)) return ordens;

  let naEstrada =
    Math.floor(forcaTotalDe(campanha, idPoder) * estilo.fracaoQueMarcha) -
    emCampanha(campanha, idPoder);
  for (const { zona } of zonas) {
    if (naEstrada <= 0) break;
    if (campanha.hostesEm(zona).some((h) => h.poder === idPoder)) continue;
    const frota = frotaQueAguenta(campanha, idPoder, zona, ajustes, usadas, naEstrada);
    if (frota === null) continue;
    usadas.add(frota.hoste);
    naEstrada -= frota.homens;
    ordens.push({ ...frota, destino: zona, manter: false });
  }

  return ordens;
}

/**
 * As águas que fecham cais inimigo, da que fecha mais para a que fecha menos.
 *
 * ⚠️ **Conta o cais que EU fecharia, e não o cais aberto.** Um porto que OUTRO reino já bloqueia
 * não se fecha duas vezes, e mandar uma segunda frota para lá seria pagar folha de campanha por
 * nada — mas o porto que a minha própria frota está fechando continua valendo, e é uma distinção
 * que custou um teste vermelho: sem ela, a frota bloqueando tornava a própria água inútil na
 * virada seguinte, saía da lista, e a retirada a levava para casa. O bloqueio se desfazia
 * sozinho por ter dado certo.
 */
function aguasQueValem(
  campanha: Campanha,
  idPoder: string,
): readonly { zona: string; cais: number }[] {
  const porZona = new Map<string, number>();
  for (const provincia of campanha.terras()) {
    const dono = campanha.donoDe(provincia);
    if (dono === idPoder || !campanha.emGuerra(idPoder, dono)) continue;
    if (!campanha.temPortoEm(provincia)) continue;
    if (campanha.bloqueiamEm(provincia).some((quem) => quem !== idPoder)) continue;
    for (const vizinha of campanha.vizinhasDe(provincia)) {
      if (!campanha.ehMar(vizinha)) continue;
      porZona.set(vizinha, (porZona.get(vizinha) ?? 0) + 1);
    }
  }
  return [...porZona]
    .map(([zona, cais]) => ({ zona, cais }))
    // Empate por id: a mesma partida decide igual em qualquer máquina.
    .sort((a, b) => b.cais - a.cais || a.zona.localeCompare(b.zona));
}

/**
 * A maior frota que alcança esta água e AGUENTA ficar nela. `null` quando nenhuma.
 *
 * A maior e não a que baste, como no socorro: força tem os homens ao quadrado dentro dela, e
 * meia frota duas vezes é um quarto da força duas vezes.
 *
 * ⚠️ **O desempate vai para quem já está na água.** No mar ninguém segura chão, e estar ali é o
 * que mais se parece com defender — a mesma escolha que a interceptação faz.
 */
function frotaQueAguenta(
  campanha: Campanha,
  idPoder: string,
  zona: string,
  ajustes: AjustesDeCombate,
  usadas: ReadonlySet<string>,
  naEstrada: number,
): { hoste: string; homens: number } | null {
  const deles = campanha
    .hostesEm(zona)
    .filter((h) => h.poder !== idPoder && campanha.emGuerra(idPoder, h.poder));

  let melhor: { hoste: string; homens: number } | null = null;
  for (const hoste of campanha.hostes()) {
    if (hoste.poder !== idPoder || usadas.has(hoste.id)) continue;
    // Sai de casa ou da própria água: nunca de terra alheia, que é onde há cerco a segurar.
    if (campanha.donoDe(hoste.posicao) !== idPoder && !campanha.ehMar(hoste.posicao)) continue;
    const emPe = campanha.forcaDaHoste(hoste.id);
    const homens = Math.min(emPe, naEstrada);
    if (homens <= 0) continue;
    if (!campanha.alcanceDaHoste(hoste.id).includes(zona)) continue;
    if (!campanha.podeOrdenarMarcha(hoste.id, zona, homens, idPoder).pode) continue;
    if (deles.length > 0 && !venceria([hoste], deles, ajustes.batalha, 'b')) continue;
    if (melhor === null || homens > melhor.homens) melhor = { hoste: hoste.id, homens };
  }
  return melhor;
}

/** Homens deste poder parados fora do próprio reino agora — terra alheia ou água. */
function emCampanha(campanha: Campanha, idPoder: string): number {
  let total = 0;
  for (const hoste of campanha.hostes()) {
    if (hoste.poder !== idPoder) continue;
    if (campanha.donoDe(hoste.posicao) === idPoder) continue;
    total += campanha.forcaDaHoste(hoste.id);
  }
  return total;
}
