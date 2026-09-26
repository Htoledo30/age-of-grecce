/**
 * O reino que nasce de uma revolta contra o PRÓPRIO rei.
 *
 * ⚠️ **Existe porque o levante tinha um buraco com o nome do dono.** Os rebeldes sempre
 * pegaram em armas *em nome do dono antigo* — a bandeira de 700 a.C. —, e por isso a terra
 * legítima nunca podia se levantar: contra quem? O dono antigo era o próprio rei. Na prática
 * isso deixava o Confisco eterno sem castigo nenhum na terra de sempre. Henrique, ao descobrir:
 * *"revolta ali é impossível? não era para ser impossível, se eu meter o louco tem q se
 * revoltar sim"*.
 *
 * A resposta é dar bandeira a eles: a província **declara independência** e vira um reino como
 * qualquer outro, com nome, cor e opinião própria. Você não perde só o imposto — perde a terra,
 * e ela passa a ser um vizinho que você tem de reconquistar ou com quem tem de negociar.
 */

import type { NucleoDaCampanha } from '../nucleo';
import { donoDe } from '../provincia/consultas';

/** O poder que vive só na partida: nasceu de um levante, não do arquivo do mundo. */
export interface PoderLivre {
  id: string;
  nome: string;
  povo: string;
  cor: string;
}

/**
 * O id do reino livre que sai desta província.
 *
 * ⚠️ **O prefixo não é enfeite: 106 dos 244 ids de província JÁ são ids de poder.** Argos a
 * cidade e Argos o reino dividem a palavra, e usar o id cru faria a independência de Argos
 * colidir com o reino de quem ela está se libertando.
 */
export function idLivreDe(idProvincia: string): string {
  return `livre-${idProvincia}`;
}

/**
 * A cor do reino novo: o tom de quem ele deixou, mais claro.
 *
 * ⚠️ **Parecido de propósito, e não uma cor sorteada.** Quem olha o mapa precisa ler a
 * história em um segundo: "aquele pedaço claro ali era do azul ao lado". Uma cor aleatória
 * contaria que apareceu um reino, e não que um reino RACHOU. O índice da província entra como
 * um empurrão pequeno para que duas independências do mesmo rei não saiam gêmeas.
 */
function corDaRuptura(corDoRei: string, indiceDaProvincia: number): string {
  const n = Number.parseInt(corDoRei.replace('#', ''), 16);
  const canais = [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
  const empurrao = [
    ((indiceDaProvincia * 37) % 24) - 12,
    ((indiceDaProvincia * 53) % 24) - 12,
    ((indiceDaProvincia * 71) % 24) - 12,
  ];
  const clara = canais.map((c, i) =>
    Math.max(0, Math.min(255, Math.round(c + (255 - c) * 0.38) + (empurrao[i] ?? 0))),
  );
  return `#${clara.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Cria — ou recupera — o reino livre desta província, e o põe no mapa.
 *
 * Devolve o id. Chamar duas vezes para a mesma terra devolve o mesmo reino: uma província que
 * se libertou, foi reconquistada e se levantou de novo levanta a MESMA bandeira, que é o que
 * qualquer um esperaria dela.
 */
export function poderLivreDe(
  nucleo: NucleoDaCampanha,
  idProvincia: string,
  /** A tribo dos rebeldes, quando não é a do rei de hoje — a terra do jogador vencido. */
  povo?: string,
): string {
  const id = idLivreDe(idProvincia);
  if (nucleo.atlas.existePoder(id)) return id;

  const provincia = nucleo.atlas.provincia(idProvincia);
  const rei = nucleo.atlas.poder(donoDe(nucleo, idProvincia));
  // ⚠️ O nome ganha "Livre" só quando já existe alguém com o mesmo nome VIVO no mapa. Sem a
  // ressalva, a independência de Maratona viraria "Maratona Livre" sem que nada se chamasse
  // Maratona — palavra a mais para o jogador ler em toda linha de diplomacia.
  const repetido = nucleo.atlas.poderes.some((p) => p.nome === provincia.nome);
  const poder: PoderLivre = {
    id,
    nome: repetido ? `${provincia.nome} Livre` : provincia.nome,
    // Os rebeldes SÃO o povo do rei — é exatamente essa a condição para o levante nascer aqui.
    povo: povo ?? rei.povo,
    cor: corDaRuptura(rei.cor, provincia.indice),
  };
  nucleo.atlas.registrarPoder(poder);
  nucleo.estado.poderesNascidos.push(poder);
  // ⚠️ O índice de territórios é montado a partir dos poderes do atlas: sem remontá-lo, o
  // reino recém-nascido não tem sequer uma lista vazia, e a primeira pergunta sobre ele —
  // "quantas províncias tem?" — estoura em vez de responder zero.
  nucleo.territorios.reindexar();
  return id;
}
