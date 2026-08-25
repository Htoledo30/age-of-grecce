/**
 * Os objetos espalhados pelo mapa: árvores, pedras, o que o zoom aproxima.
 *
 * Amostrado em passo fixo sobre o terreno já pintado — quem decide o que nasce onde é o
 * bioma, não um sorteio solto.
 */

import { ruidoSemente } from './campos';
import { INDICE } from './terreno';
import type { Terreno } from './terreno';

export interface Detalhes {
  arvores: Array<[number, number]>;
  rochas: Array<[number, number]>;
}

/**
 * Espalha árvores e pedras pelo mundo a partir do mapa de biomas.
 *
 * É a camada que o Mount & Blade acende quando você aproxima: de longe o mapa é uma
 * pintura só; de perto aparecem objetos, e o terreno para de ser borrão. As posições
 * saem daqui em unidades de mundo e o jogo só desenha, sem decidir nada.
 */
export function espalharDetalhes(terreno: Terreno, tamanhoMundo: number, passo = 20): Detalhes {
  const { biomas, resolucao } = terreno;
  const arvores: Array<[number, number]> = [];
  // Sem pedras: o sombreamento de relevo já desenha a serra. Símbolo de montanha por
  // cima de relevo sombreado vira adesivo — ou um, ou outro.
  const rochas: Array<[number, number]> = [];

  const iFloresta = INDICE.get('floresta')!;

  const sorte = ruidoSemente(31_337);
  const paraMundo = tamanhoMundo / resolucao;

  for (let y = passo; y < resolucao - passo; y += passo) {
    for (let x = passo; x < resolucao - passo; x += passo) {
      const bioma = biomas[y * resolucao + x]!;
      // desloca dentro da célula pra não virar grade visível
      const px = (x + (sorte() - 0.5) * passo * 1.6) * paraMundo;
      const py = (y + (sorte() - 0.5) * passo * 1.6) * paraMundo;

      if (bioma === iFloresta) {
        if (sorte() < 0.85) arvores.push([Math.round(px), Math.round(py)]);
      }
    }
  }

  return { arvores, rochas };
}

// ============================================================================
// Limpeza de istmos: nem terra fina demais, nem canal fino demais
// ============================================================================
//
// Costa real tem detalhes de largura zero — línguas de terra que afinam até virar um fio,
// e braços de mar que quase se fecham. No mapa isso vira dois defeitos ao mesmo tempo:
//
//   - O "rabinho": a terra afina até acabar num fio, e fica feio.
//   - A gota: duas margens quase se tocam e PARECEM ligadas, mas o corredor é mais
//     estreito que o grupo. O jogador vê terra contínua e não consegue passar — que é o
//     pior tipo de defeito, porque parece bug do jogo e não geografia.
//
