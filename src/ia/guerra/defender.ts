/**
 * A IA defendendo o que é dela — **e só isso.**
 *
 * ⚠️ **Regra dura desta etapa: nenhuma hoste pisa em terra alheia.** Socorrer é marchar para
 * uma província SUA que está com inimigo em cima. Atacar é a etapa 3, e misturar as duas aqui
 * faria a etapa 2 virar a etapa 3 por acidente — que é exatamente o tipo de coisa que depois
 * ninguém consegue depurar, porque o mapa inteiro se mexe de uma vez.
 *
 * Duas decisões, e as duas são reações:
 *
 * 1. **Socorro.** Terra minha com invasor em cima chama a hoste mais próxima que esteja em
 *    terra minha. A mais apertada primeiro — a diferença entre o que o inimigo tem lá e o que
 *    eu tenho lá, e não o tamanho bruto dele: 2.000 diante de 1.900 meus é menos urgente que
 *    400 diante de uma cidade vazia.
 * 2. **Surtida.** Cidade minha sitiada, com guarnição maior que quem senta na porta, sai para
 *    lutar. Ficar dentro esperando é entregar a praça à fome do cerco — e a fome não negocia.
 *
 * ⚠️ **Uma ordem por hoste por rodada**, e é a regra do jogo, não uma escolha da IA: a hoste
 * que já recebeu ordem sai da lista antes de a próxima ameaça ser atendida.
 */

import type { Campanha } from '@/campanha/campanha';
import { ameacasDe } from '../percepcao/ameaca';

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
): readonly OrdemDefensiva[] {
  const ordens: OrdemDefensiva[] = [];
  const jaMandada = new Set<string>();

  for (const ameaca of ameacasDe(campanha, idPoder)) {
    // ── Quem já está lá dentro: sai para lutar, se for mais forte ────────────────────
    if (ameaca.sitiada) {
      for (const hoste of campanha.hostesEm(ameaca.provincia)) {
        if (hoste.poder !== idPoder || jaMandada.has(hoste.id)) continue;
        // ⚠️ Só sai quem ganha. Surtida perdida é a guarnição inteira morrendo fora do muro,
        // e aí a cidade cai no turno seguinte sem ninguém para fechar o portão.
        if (campanha.forcaDaHoste(hoste.id) <= ameaca.inimigos) continue;
        if (!campanha.podeSurtir(hoste.id, idPoder).pode) continue;
        jaMandada.add(hoste.id);
        ordens.push({
          hoste: hoste.id,
          destino: ameaca.provincia,
          homens: campanha.forcaDaHoste(hoste.id),
          tipo: 'surtida',
        });
      }
      continue;
    }

    // ── Quem está por perto: marcha para lá ──────────────────────────────────────────
    const socorro = hosteMaisProxima(campanha, idPoder, ameaca.provincia, jaMandada);
    if (socorro === null) continue;
    jaMandada.add(socorro.hoste);
    ordens.push({ ...socorro, destino: ameaca.provincia, tipo: 'socorro' });
  }
  return ordens;
}

/**
 * A maior hoste minha que alcança este lugar nesta rodada, sem sair de terra minha.
 *
 * A maior e não a mais perto: socorro que chega em menor número é reforço que morre junto. E
 * `alcanceDaHoste` já responde por onde ela pode ir — a IA não recalcula geografia, ela
 * pergunta.
 */
function hosteMaisProxima(
  campanha: Campanha,
  idPoder: string,
  destino: string,
  jaMandada: ReadonlySet<string>,
): { hoste: string; homens: number } | null {
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
    if (melhor === null || homens > melhor.homens) melhor = { hoste: hoste.id, homens };
  }
  return melhor;
}
