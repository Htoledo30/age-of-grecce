/**
 * A IA escolhendo com quem se ALIAR — **e ela só se alia quando tem por quê.**
 *
 * ⚠️ **Aliança não é um pacto melhor, é um pacto caro.** Ela te põe nas guerras do outro sem
 * perguntar, e por isso uma IA que assinasse aliança sempre que a opinião permitisse estaria
 * comprando guerras alheias de graça. O pacto continua sendo a resposta certa para quase todo
 * mundo: ele custa nada e já garante a fronteira.
 *
 * Então existe um PORTÃO antes da opinião, e ele é o motivo de existir da aliança:
 *
 * 1. **o inimigo em comum** — os dois já sangram contra o mesmo reino. É a aliança de
 *    conveniência, e é a razão mais honesta que este jogo sabe produzir: ela nasce da guerra de
 *    um terceiro e morre com ela;
 * 2. **ou a ameaça na porta** — há exército alheio nas suas terras ou encostado nelas, e o
 *    parceiro é mais forte que você. É a aliança do fraco, e ela é o que dá a um reino pequeno
 *    uma resposta que não seja pagar tributo ou morrer.
 *
 * Fora desses dois casos ela não assina, por mais que goste do vizinho.
 *
 * ⚠️ **A RAZÃO é do par; a VONTADE é de cada um.** São duas perguntas e elas se checam
 * diferente. Basta um lado ter razão — exigir os dois matava a aliança do fraco por construção,
 * porque quem está ameaçado tem motivo e o forte que poderia salvá-lo justamente não está
 * ameaçado. Medido com a exigência dupla: **9 pares-turno de 13.247, e zero alianças em 150
 * turnos.** Já a vontade continua sendo consultada nos dois sentidos, como no pacto: ninguém
 * assina com quem pretende atacar.
 */

import type { Campanha } from '@/campanha/campanha';
import type { EstiloDeIa, Ia } from '@/dados/esquema';
import { estiloDe } from '../estilo';
import { estaAmeacado, forcaTotalDe } from '../percepcao/ameaca';

/**
 * Este poder tem RAZÃO para se aliar àquele — e não apenas simpatia por ele?
 *
 * Basta que UM dos dois lados responda sim. Ver o portão no topo do arquivo.
 */
function temRazaoParaAliar(campanha: Campanha, idPoder: string, com: string): boolean {
  const meus = new Set(campanha.guerrasDe(idPoder));
  const comuns = campanha.guerrasDe(com).filter((id) => id !== idPoder && meus.has(id));
  if (comuns.length > 0) return true;
  // A aliança do fraco: só vale contra quem pode de fato ajudar.
  return estaAmeacado(campanha, idPoder) && forcaTotalDe(campanha, com) > forcaTotalDe(campanha, idPoder);
}

/**
 * A aliança que este poder assinaria AGORA, ou `null`.
 *
 * ⚠️ **Só entre quem já não vai se atacar.** A busca varre os poderes com ficha e não só os
 * vizinhos — ao contrário do pacto, que é sobre a fronteira. Uma aliança pelo inimigo em comum
 * faz todo sentido através do mar, e é justamente ela que dá um uso à opinião que a tribo e o
 * inimigo comum passaram a produzir à distância.
 */
export function aliancaEscolhida(
  campanha: Campanha,
  idPoder: string,
  estilo: EstiloDeIa,
  dados: Ia,
): { com: string; turnos: number } | null {
  let escolhido: { com: string; turnos: number } | null = null;
  let maisForte = 0;
  // Em ordem de id: a mesma partida assina as mesmas alianças em qualquer máquina.
  for (const outro of [...campanha.poderesComFicha()].sort()) {
    if (outro === idPoder) continue;
    if (campanha.emGuerra(idPoder, outro)) continue;
    if (campanha.aliancaAte(idPoder, outro) !== undefined) continue;
    // ⚠️ **A razão é do PAR, e basta um lado tê-la.** Exigir os dois matava a aliança do fraco
    // por construção: quem está ameaçado tem razão, e o forte que poderia salvá-lo justamente
    // não está ameaçado — logo nunca tinha. Medido com a exigência dupla: **9 pares-turno de
    // 13.247 passavam**, e zero alianças em 150 turnos. Uma aliança precisa de um motivo para
    // existir, não de dois; o que os dois ainda precisam ter é a vontade, logo abaixo.
    if (!temRazaoParaAliar(campanha, idPoder, outro) && !temRazaoParaAliar(campanha, outro, idPoder)) {
      continue;
    }
    // Assinar com quem se pretende atacar seria assinar para romper — a mesma pergunta do pacto.
    if (campanha.relacaoEntre(idPoder, outro) <= estilo.relacaoParaDeclarar) continue;
    if (campanha.relacaoEntre(outro, idPoder) <= estiloDe(dados, outro).relacaoParaDeclarar) {
      continue;
    }
    // O prazo mais longo que a confiança alcança: `prazosDeAlianca` vem do maior ao menor.
    const prazo = campanha.prazosDeAlianca(idPoder, outro).find((p) => p.pode);
    if (!prazo) continue;
    // Entre dois possíveis, o mais forte: aliança é exército emprestado, e o do forte vale mais.
    const dele = forcaTotalDe(campanha, outro);
    if (dele <= maisForte && escolhido !== null) continue;
    maisForte = dele;
    escolhido = { com: outro, turnos: prazo.turnos };
  }
  return escolhido;
}
