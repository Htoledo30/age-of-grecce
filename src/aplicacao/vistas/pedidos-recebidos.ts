/** Os pedidos na mesa do jogador, em poucas palavras, para os cartões embaixo da crônica. */

import type { Proposta } from '@/campanha/estado-campanha';
import type { PedidoRecebido } from '@/ui/pedidos-recebidos';
import type { Jogo } from '../contexto';

const TEXTO: Record<Proposta['tipo'], string> = {
  pacto: 'propõe pacto de não-agressão',
  alianca: 'propõe aliança',
  liga: 'convida para a liga',
  anexacao: 'quer anexar o seu reino',
  comercio: 'propõe comércio',
  acesso: 'pede passagem',
  paz: 'propõe paz',
};

export function vistaDosPedidos(jogo: Jogo): PedidoRecebido[] {
  const { campanha } = jogo;
  if (campanha.jogador === null) return [];
  return campanha.propostas().map((p) => {
    const poder = campanha.poder(p.de);
    return { de: p.de, nome: poder.nome, cor: poder.cor, texto: TEXTO[p.tipo] };
  });
}
