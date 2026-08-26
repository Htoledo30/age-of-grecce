/**
 * O que a IA VÊ de perigoso — e nada mais que isso.
 *
 * Camada de percepção: **lê e não escreve.** Ela não decide o que fazer com a ameaça, só diz
 * que ela existe e de que tamanho é. A separação não é cerimônia: é o que deixa a decisão
 * inteira ficar sob teste sem mexer no mundo, e é o que impede o arquivo de decidir crescer
 * até virar "a IA".
 *
 * ⚠️ **Ela não enxerga nada que o jogador não enxergue.** Hostes no mapa são públicas para os
 * dois lados hoje; no dia em que houver névoa, esta é a única camada que precisa mudar — e é
 * por isso que ela existe separada desde já.
 */

import type { Campanha } from '@/campanha/campanha';

/** Uma terra minha com inimigo em cima dela. */
export interface Ameaca {
  provincia: string;
  /** Homens inimigos parados ali agora. */
  inimigos: number;
  /** Meus homens parados ali agora. Zero quer dizer que só a milícia responde. */
  meus: number;
  /** Há cerco em pé nesta terra? Muda a resposta: sitiado sai, ameaçado reforça. */
  sitiada: boolean;
}

/**
 * As terras deste poder com exército alheio em cima, da mais apertada para a menos.
 *
 * "Apertada" é a diferença entre o que está lá e o que eu tenho lá — não o tamanho bruto do
 * inimigo. Um invasor de 2.000 diante de 1.900 meus é menos urgente que um de 400 diante de
 * uma cidade sem ninguém, e é essa a ordem em que os reforços devem sair.
 */
export function ameacasDe(campanha: Campanha, idPoder: string): readonly Ameaca[] {
  const ameacas: Ameaca[] = [];
  for (const provincia of [...campanha.provinciasDe(idPoder)].sort()) {
    let inimigos = 0;
    let meus = 0;
    for (const hoste of campanha.hostesEm(provincia)) {
      const forca = campanha.forcaDaHoste(hoste.id);
      if (hoste.poder === idPoder) meus += forca;
      else inimigos += forca;
    }
    if (inimigos <= 0) continue;
    ameacas.push({
      provincia,
      inimigos,
      meus,
      sitiada: campanha.cercoEm(provincia) !== undefined,
    });
  }
  // Ordem por aperto, e por id quando empata: a mesma partida decide igual em toda máquina.
  return ameacas.sort(
    (a, b) => b.inimigos - b.meus - (a.inimigos - a.meus) || a.provincia.localeCompare(b.provincia),
  );
}

/**
 * Há guerra na minha porta?
 *
 * Duas coisas contam, e nenhuma outra:
 *
 * 1. **exército alheio pisando na minha terra** — não há o que discutir;
 * 2. **exército alheio acampado FORA DE CASA na porta da minha terra** — alguém em campanha,
 *    e o próximo passo pode ser aqui. Levantar tropa quando ele já pisou é tarde: a leva
 *    demora um turno para virar hoste e a batalha é hoje.
 *
 * ⚠️ **Guarnição do vizinho parada em casa NÃO é ameaça, e a primeira versão disto errava
 * justamente aí.** Com dezessete poderes mantendo guarda nas próprias fronteiras, todo mundo
 * era vizinho do exército de alguém — e o mapa inteiro vivia em pé de guerra permanente,
 * gastando folha de guerra numa paz completa. Um soldado em casa é a mesma coisa que uma
 * muralha: existe, e não quer dizer nada.
 *
 * É esta pergunta que separa a folha de PAZ da de GUERRA. Sem ela a IA alistava o exército
 * inteiro no turno 1, num mundo onde ninguém tinha marchado ainda.
 */
export function estaAmeacado(campanha: Campanha, idPoder: string): boolean {
  const minhas = new Set(campanha.provinciasDe(idPoder));
  for (const hoste of campanha.hostes()) {
    if (hoste.poder === idPoder) continue;
    if (minhas.has(hoste.posicao)) return true;
    // Em casa não é campanha. Só conta quem já saiu da própria terra.
    if (campanha.donoDe(hoste.posicao) === hoste.poder) continue;
    for (const vizinha of campanha.vizinhasDe(hoste.posicao)) {
      if (minhas.has(vizinha)) return true;
    }
  }
  return false;
}

/** Quantos homens este poder tem em pé no mundo todo, fora os que ainda se formam. */
export function forcaTotalDe(campanha: Campanha, idPoder: string): number {
  let total = 0;
  for (const hoste of campanha.hostes()) {
    if (hoste.poder === idPoder) total += campanha.forcaDaHoste(hoste.id);
  }
  return total;
}
