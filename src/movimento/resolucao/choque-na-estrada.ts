/**
 * O ENCONTRO NA ESTRADA — duas forças hostis atravessando a mesma aresta em sentidos opostos.
 *
 * Sem esta fase, as duas passariam uma pela outra e trocariam de território sem se tocar, o
 * que abre uma esquiva: adivinhando de onde vem o ataque, bastava marchar pra lá e **nunca ser
 * pego**.
 *
 * ⚠️ **É a única batalha do jogo sem lugar** — não acontece em província nenhuma, e por isso
 * não tem defensor nem terreno. Quem vence **continua a rota**; quem perde some.
 *
 * ⚠️ **"Hostis" é uma palavra que o código não estava cumprindo.** Ele emparelhava qualquer par
 * de poderes diferentes, e o encontro na estrada acontecia entre gente em PAZ — o único lugar
 * do jogo onde isso ainda podia acontecer, já que o choque na província pergunta pela guerra
 * antes de escolher o segundo lado. Duas expedições em paz cruzando o mesmo golfo em sentidos
 * opostos se aniquilavam, e é no mar que a troca de aresta é mais fácil de acontecer: a rota
 * longa põe muita gente na mesma água.
 */

import type { Forca } from './forcas';
import type { Ajustes } from '@/dados/esquema';
import type { RelatorioEmConstrucao } from './relatorio';

type AjustesDaBatalha = Ajustes['jogo']['combate']['batalha'];
import { travarLados } from './travar-lados';

export function naEstrada(
  forcas: readonly Forca[],
  passo: number,
  batalhas: RelatorioEmConstrucao['batalhas'],
  batalha: AjustesDaBatalha,
  dispersaram: (porOrigem: Readonly<Record<string, number>>) => void,
  refugio: (provincia: string, poder: string) => string | null,
  emGuerra: (a: string, b: string) => boolean,
): void {
  const andando = forcas.filter((f) => f.viva && f.rota[passo] !== undefined);

  for (let i = 0; i < andando.length; i++) {
    for (let j = i + 1; j < andando.length; j++) {
      const a = andando[i];
      const b = andando[j];
      if (!a?.viva || !b?.viva) continue;
      if (a.poder === b.poder) continue;
      // Sem guerra não há encontro: dois exércitos em paz se cruzam e seguem viagem.
      if (!emGuerra(a.poder, b.poder)) continue;
      // A troca: o destino de um é a origem do outro, nos dois sentidos.
      if (a.rota[passo] !== b.posicao || b.rota[passo] !== a.posicao) continue;
      // Quem vence na estrada CONTINUA: não há província onde parar.
      // Na estrada não há chão de ninguém para segurar: o desempate sai do id, que é
      // arbitrário mas nunca varia — e duas forças exatamente iguais se cruzando de
      // frente é caso de laboratório, não de partida.
      travarLados(
        [a],
        [b],
        null,
        batalhas,
        false,
        batalha,
        dispersaram,
        a.poder.localeCompare(b.poder) <= 0 ? 'a' : 'b',
        refugio,
      );
    }
  }
}
