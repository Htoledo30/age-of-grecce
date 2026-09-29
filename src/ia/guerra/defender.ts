/**
 * Defesa da terra própria e interceptação na costa. Reúne socorro capaz de vencer,
 * inclusive chamando tropas próximas em campanha, ou concentra reforços em terra segura.
 * Tropas reservadas para socorro não recebem uma segunda ordem ofensiva.
 */

import type { Exercito } from '@/combate/exercito';
import type { Campanha } from '@/campanha/campanha';
import type { Ajustes } from '@/dados/esquema';
import { ameacasDe } from '../percepcao/ameaca';
import { venceria } from '../percepcao/prever';

type AjustesDaBatalha = Ajustes['jogo']['combate']['batalha'];

/** Uma ordem defensiva que a IA daria agora. */
export interface OrdemDefensiva {
  hoste: string;
  /** Para onde ela marcha. Igual à posição atual quer dizer surtida. */
  destino: string;
  homens: number;
  tipo: 'socorro' | 'surtida' | 'intercepcao';
}

/** O que este poder mandaria as hostes dele fazerem AGORA, em defesa. */
export function defesasEscolhidas(
  campanha: Campanha,
  idPoder: string,
  ajustes: AjustesDaBatalha,
): readonly OrdemDefensiva[] {
  const ordens: OrdemDefensiva[] = [];
  const jaMandada = new Set<string>();

  for (const ameaca of ameacasDe(campanha, idPoder)) {
    const inimigas = campanha
      .hostesEm(ameaca.provincia)
      .filter((h) => campanha.emGuerra(idPoder, h.poder));

    // ── Quem já está lá dentro: sai para lutar, mas só se ganhar ─────────────────────
    if (ameaca.sitiada) {
      for (const hoste of campanha.hostesEm(ameaca.provincia)) {
        if (hoste.poder !== idPoder || jaMandada.has(hoste.id)) continue;
        // ⚠️ Surtida perdida é a guarnição inteira morrendo fora do muro, e a cidade caindo no
        // turno seguinte sem ninguém para fechar o portão. O desempate vai para quem sai,
        // porque quem senta na porta perde o cerco ao ser barrado.
        if (!venceria([hoste], inimigas, ajustes, 'a')) continue;
        if (!campanha.podeSurtir(hoste.id, idPoder).pode) continue;
        jaMandada.add(hoste.id);
        ordens.push({
          hoste: hoste.id,
          destino: ameaca.provincia,
          homens: campanha.forcaDaHoste(hoste.id),
          tipo: 'surtida',
        });
      }
    }

    // ── E quem está de fora marcha para lá, sitiada ou não ───────────────────────────
    //
    // ⚠️ **Vale TAMBÉM para a cidade sitiada**, e é o conserto do buraco: quem está trancado
    // dentro não pode sair sem perder o muro, então o socorro tem que vir de fora. Antes, a
    // ameaça sitiada pulava direto para a próxima e a capital cercada não recebia ordem
    // nenhuma com o exército parado na província ao lado.
    for (const socorro of hostesQueSocorrem(campanha, idPoder, ameaca.provincia, ajustes, jaMandada)) {
      jaMandada.add(socorro.hoste);
      ordens.push({ ...socorro, tipo: 'socorro' });
    }
  }

  // ── E a água que encosta em mim: barrar o desembarque ANTES da praia ─────────────────
  //
  // Depois das ameaças em terra de propósito: inimigo já pisando na minha província é problema
  // de hoje, e expedição na água é o de amanhã. A hoste é a mesma, e quem está dentro decide
  // primeiro.
  for (const zona of aguasAmeacadas(campanha, idPoder)) {
    const guarda = hosteQueIntercepta(campanha, idPoder, zona, ajustes, jaMandada);
    if (guarda === null) continue;
    jaMandada.add(guarda.hoste);
    ordens.push({ ...guarda, destino: zona, tipo: 'intercepcao' });
  }
  return ordens;
}

/**
 * As zonas de mar com expedição inimiga parada nelas **que encostam no meu chão**, por id.
 *
 * ⚠️ **Encostar na minha costa é a régua inteira, e ela é estreita de propósito.** Sem isso a
 * IA sairia caçando expedição alheia pelo Egeu inteiro — e uma frota atravessando de Rodes a
 * Corcira não é ameaça a ninguém no caminho. O que se defende aqui é a praia: quem está na
 * água ao lado da minha terra desembarca nela na virada seguinte, e depois dela a escolha do
 * lugar já foi dele.
 */
function aguasAmeacadas(campanha: Campanha, idPoder: string): readonly string[] {
  const minhas = new Set(campanha.provinciasDe(idPoder));
  const zonas = new Set<string>();
  for (const hoste of campanha.hostes()) {
    if (hoste.poder === idPoder) continue;
    if (!campanha.ehMar(hoste.posicao)) continue;
    // Sem guerra não há batalha na água — o choque pergunta pela guerra antes de emparelhar.
    // Mandar hoste contra quem está em paz seria pagar folha de campanha por nada.
    if (!campanha.emGuerra(idPoder, hoste.poder)) continue;
    if (campanha.forcaDaHoste(hoste.id) <= 0) continue;
    if (!campanha.vizinhasDe(hoste.posicao).some((v) => minhas.has(v))) continue;
    zonas.add(hoste.posicao);
  }
  return [...zonas].sort();
}

/** Intercepta a frota inimiga antes do desembarque. */
function hosteQueIntercepta(
  campanha: Campanha,
  poder: string,
  zona: string,
  ajustes: AjustesDaBatalha,
  usadas: ReadonlySet<string>,
): { hoste: string; homens: number } | null {
  const deles = campanha.hostesEm(zona).filter((h) => campanha.emGuerra(poder, h.poder));
  const jaLa = campanha.hostesEm(zona).filter((h) => h.poder === poder && !usadas.has(h.id));
  let melhor: { hoste: string; homens: number } | null = null;
  for (const hoste of campanha.hostes()) {
    if (hoste.poder !== poder || usadas.has(hoste.id) || hoste.posicao === zona) continue;
    if (campanha.donoDe(hoste.posicao) !== poder && !campanha.ehMar(hoste.posicao)) continue;
    if (!campanha.alcanceDaHoste(hoste.id).includes(zona)) continue;
    const homens = campanha.forcaDaHoste(hoste.id);
    if (homens <= 0 || !campanha.podeOrdenarMarcha(hoste.id, zona, homens, poder).pode) continue;
    if (!venceria([hoste, ...jaLa], deles, ajustes, 'b')) continue;
    if (!melhor || homens > melhor.homens) melhor = { hoste: hoste.id, homens };
  }
  return melhor;
}

/** Reúne socorro suficiente; o restante do exército pode continuar atacando. */
function hostesQueSocorrem(
  campanha: Campanha,
  poder: string,
  destino: string,
  ajustes: AjustesDaBatalha,
  usadas: ReadonlySet<string>,
): { hoste: string; homens: number; destino: string }[] {
  const deles = campanha.hostesEm(destino).filter((h) => campanha.emGuerra(poder, h.poder));
  const dentro = campanha.hostesEm(destino).filter((h) => h.poder === poder);
  if (venceria(dentro, deles, ajustes, 'a')) return [];
  const livres = campanha.hostes().filter((h) => h.poder === poder && !usadas.has(h.id) &&
    h.posicao !== destino && !campanha.ehMar(h.posicao) && !campanha.surtidaDe(h.id));
  const perto = livres.filter((h) => campanha.alcanceDaHoste(h.id).includes(destino))
    .sort((a, b) => campanha.forcaDaHoste(b.id) - campanha.forcaDaHoste(a.id) || a.id.localeCompare(b.id));
  const socorro: Exercito[] = [];
  for (const h of perto) {
    socorro.push(h);
    if (venceria([...dentro, ...socorro], deles, ajustes, 'a')) {
      return socorro.map((h) => ({ hoste: h.id, homens: campanha.forcaDaHoste(h.id), destino }));
    }
  }
  // Não alimenta o cerco com derrotas sucessivas: junta os reforços numa terra segura.
  const ponto = campanha.vizinhasDe(destino).filter((id) => campanha.donoDe(id) === poder &&
    !campanha.hostesEm(id).some((h) => campanha.emGuerra(poder, h.poder)))
    .sort((a, b) => campanha.forcaEm(b, poder) - campanha.forcaEm(a, poder) || a.localeCompare(b))[0];
  if (!ponto) return [];
  const juntos = campanha.hostesEm(ponto).filter((h) => h.poder === poder);
  const candidatos = livres.filter((h) => h.posicao !== ponto && campanha.donoDe(h.posicao) === poder &&
    !campanha.cercoEm(h.posicao))
    .map((h) => ({ h, rota: campanha.rotasLongasDaHoste(h.id).get(ponto) }))
    .filter((c) => c.rota !== undefined)
    .sort((a, b) => a.rota!.length - b.rota!.length || a.h.id.localeCompare(b.h.id));
  const ordens: { hoste: string; homens: number; destino: string }[] = [];
  for (const { h } of candidatos) {
    if (venceria([...dentro, ...juntos], deles, ajustes, 'a')) break;
    juntos.push(h);
    ordens.push({ hoste: h.id, homens: campanha.forcaDaHoste(h.id), destino: ponto });
  }
  return ordens;
}

/** Guarnições sob ataque e tropas reunidas para socorro não saem para outra frente. */
export function reservasDaDefesa(campanha: Campanha, poder: string): ReadonlySet<string> {
  const ameacas = ameacasDe(campanha, poder);
  return new Set(campanha.hostes().filter((h) => h.poder === poder &&
    campanha.donoDe(h.posicao) === poder && ameacas.some((a) =>
      a.provincia === h.posicao || campanha.vizinhasDe(a.provincia).includes(h.posicao),
    )).map((h) => h.id));
}
