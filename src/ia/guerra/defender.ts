/**
 * A IA defendendo o que é dela — **e só isso.**
 *
 * ⚠️ **Regra dura DESTE ARQUIVO: nenhuma hoste dele pisa em terra alheia.** Socorrer é marchar
 * para uma província SUA que está com inimigo em cima. Atacar mora em `marchar.ts`, e a
 * separação não é arrumação: enquanto a IA só reagia, cada defeito dela aparecia numa província
 * e não numa guerra em cascata pelo mapa inteiro — foi assim que os seis da etapa 2 foram
 * achados. Misturar as duas aqui apagaria a fronteira que torna isso possível de novo.
 *
 * Três reações, e **as três só saem se a conta fechar**:
 *
 * 1. **Socorro à terra invadida.** Inimigo acampado numa terra minha chama a hoste que o
 *    alcance sem sair do reino.
 * 2. **Socorro à cidade SITIADA.** ⚠️ Faltava, e era um buraco grande: toda ameaça sitiada
 *    pulava direto para a próxima, então uma capital cercada com oitocentos homens na
 *    província vizinha recebia **zero ordens**. Cidade sitiada é justamente a que mais precisa
 *    de gente vindo de fora — quem está dentro não pode sair sem perder o muro.
 * 3. **Surtida.** Cidade minha sitiada, com guarnição que GANHA de quem senta na porta, sai
 *    para lutar. Ficar dentro esperando é entregar a praça à fome do cerco.
 *
 * ⚠️ **"Ganha" é previsto com a função que decide a batalha**, e não comparando cabeças. A
 * primeira versão comparava número de homens, e 501 leves contra 500 arqueiros parecia
 * vantagem — o arqueiro vale 1,33 em campo contra 1,00 do leve, e a guarnição saía para morrer
 * fora do muro. Ver `percepcao/prever.ts`.
 *
 * ⚠️ **Uma ordem por hoste por rodada**, e é regra do jogo, não escolha da IA: a hoste que já
 * recebeu ordem sai da lista antes de a próxima ameaça ser atendida.
 */

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
  tipo: 'socorro' | 'surtida';
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
      .filter((h) => h.poder !== idPoder);

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
    const socorro = hosteQueSocorre(campanha, idPoder, ameaca.provincia, ajustes, jaMandada);
    if (socorro === null) continue;
    jaMandada.add(socorro.hoste);
    ordens.push({ ...socorro, destino: ameaca.provincia, tipo: 'socorro' });
  }
  return ordens;
}

/**
 * A hoste que vale a pena mandar para este lugar — a maior que alcança e que GANHA.
 *
 * A maior e não a mais perto: socorro que chega em menor número é reforço que morre junto. E
 * `alcanceDaHoste` já responde por onde ela pode ir — a IA não recalcula geografia, pergunta.
 *
 * ⚠️ **Conta com quem já está lá dentro.** O socorro não briga sozinho: ele soma à guarnição
 * que resistiu. Ignorar isso faria a IA recusar reforço que decidiria a batalha.
 */
function hosteQueSocorre(
  campanha: Campanha,
  idPoder: string,
  destino: string,
  ajustes: AjustesDaBatalha,
  jaMandada: ReadonlySet<string>,
): { hoste: string; homens: number } | null {
  const deles = campanha.hostesEm(destino).filter((h) => h.poder !== idPoder);
  const dentro = campanha
    .hostesEm(destino)
    .filter((h) => h.poder === idPoder && !jaMandada.has(h.id));

  let melhor: { hoste: string; homens: number } | null = null;
  for (const hoste of campanha.hostes()) {
    if (hoste.poder !== idPoder || jaMandada.has(hoste.id)) continue;
    if (hoste.posicao === destino) continue;
    // ⚠️ Nada de pisar em terra alheia nesta etapa: a hoste só se move dentro do reino.
    if (campanha.donoDe(hoste.posicao) !== idPoder) continue;
    if (!campanha.alcanceDaHoste(hoste.id).includes(destino)) continue;
    const homens = campanha.forcaDaHoste(hoste.id);
    if (homens <= 0) continue;
    if (!campanha.podeOrdenarMarcha(hoste.id, destino, homens, idPoder).pode) continue;
    // O socorro chega e briga junto com quem está lá: a conta é dos dois contra o invasor. O
    // desempate vai para o defensor, que é quem segura o chão.
    if (!venceria([hoste, ...dentro], deles, ajustes, 'a')) continue;
    if (melhor === null || homens > melhor.homens) melhor = { hoste: hoste.id, homens };
  }
  return melhor;
}
