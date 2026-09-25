/**
 * QUANDO A IA PEDE PASSAGEM — e a quem.
 *
 * A pergunta é de mapa, não de simpatia: **"a estrada até o meu inimigo passa pela casa de
 * quem?"** É essa a única razão de querer um acesso militar, e por isso a decisão nasce da
 * geografia da guerra que já está em curso.
 *
 * Três condições, e nenhuma inventa número novo:
 *
 * 1. **Tenho guerra.** Sem inimigo não há para onde ir, e uma licença guardada não vale nada —
 *    ela vence sozinha e ainda deixa a impressão de aliança onde não há.
 * 2. **A terra dele encosta na do meu inimigo.** É o que faz dele o caminho e não um vizinho
 *    qualquer. Sem esta condição a IA pediria passagem ao mapa inteiro todo turno, que é
 *    exatamente o tipo de diplomacia barulhenta que não significa nada.
 * 3. **Ele deixaria.** A opinião mínima do prazo é a consulta a ELE. O acesso ainda decide por
 *    opinião fixa, ao contrário do pacto e da aliança, que pesam uma balança.
 *
 * ⚠️ **O prazo é o mais LONGO que a confiança alcança**: campanha curta com
 * licença curta é exército preso do lado errado da fronteira quando o papel vence.
 *
 * ⚠️ **E ela não pede a quem ela mesma atacaria.** Pedir a chave da casa de alguém que se
 * pretende invadir é assinar para romper — e o mapa inteiro sente a reputação de quem rompe.
 */

import type { Campanha } from '@/campanha/campanha';
import type { EstiloDeIa } from '@/dados/esquema';

/**
 * ELE abriria a estrada dele por este prazo?
 *
 * ⚠️ **A vontade mora aqui, e a regra mora na campanha.** Abrir a própria estrada não pede
 * licença de ninguém — é decisão de quem a abre. O que pede confiança é o outro lado dizer
 * sim, e é isso que este limiar mede. É por aqui que presente e comércio compram alguma coisa
 * de verdade: eles são o caminho para este sim.
 */
export function aceitaAbrirAcesso(
  campanha: Campanha,
  concedente: string,
  para: string,
  turnos: number,
  prazos: readonly { turnos: number; opiniaoMinima: number }[],
): boolean {
  const prazo = prazos.find((p) => p.turnos === turnos);
  if (!prazo) return false;
  return campanha.relacaoEntre(concedente, para) >= prazo.opiniaoMinima;
}

/** Um pedido de passagem: a quem, e por quanto tempo. */
export interface PedidoDeAcesso {
  com: string;
  turnos: number;
}

/**
 * A quem este poder pediria passagem AGORA, e por quanto tempo. `null` quando a ninguém.
 *
 * Devolve a escolha em vez de executá-la — a mesma separação de todo o resto da IA: quando o
 * outro lado é o jogador, quem chama transforma isto numa proposta em vez de num acordo.
 */
export function acessoPedido(
  campanha: Campanha,
  idPoder: string,
  estilo: EstiloDeIa,
  prazos: readonly { turnos: number; opiniaoMinima: number }[],
): PedidoDeAcesso | null {
  const inimigos = campanha.guerrasDe(idPoder);
  if (inimigos.length === 0) return null;

  // As terras dos meus inimigos, para perguntar quem encosta nelas.
  const deles = new Set<string>();
  for (const inimigo of inimigos) for (const id of campanha.provinciasDe(inimigo)) deles.add(id);
  if (deles.size === 0) return null;

  // Do prazo mais longo para o mais curto: o primeiro que couber é o melhor que cabe.
  const porPrazo = [...prazos].sort((a, b) => b.turnos - a.turnos);

  let melhor: (PedidoDeAcesso & { opiniao: number }) | null = null;
  for (const outro of [...campanha.poderesVivos()].sort()) {
    if (outro === idPoder || campanha.emGuerra(idPoder, outro)) continue;
    // ⚠️ Não se pede a chave da casa de quem se pretende invadir: o mesmo limiar que decide a
    // guerra decide isto, e pelo mesmo motivo que o pacto o usa.
    const opiniao = campanha.relacaoEntre(idPoder, outro);
    if (opiniao <= estilo.relacaoParaDeclarar) continue;
    if (!encostaEm(campanha, outro, deles)) continue;
    const prazo = porPrazo.find(
      (p) =>
        campanha.podeConcederAcesso(outro, idPoder, p.turnos).pode &&
        aceitaAbrirAcesso(campanha, outro, idPoder, p.turnos, prazos),
    );
    if (!prazo) continue;
    // O vizinho de quem eu mais gosto primeiro; empate pelo id, para a partida ser a mesma.
    if (melhor === null || opiniao > melhor.opiniao) {
      melhor = { com: outro, turnos: prazo.turnos, opiniao };
    }
  }
  return melhor === null ? null : { com: melhor.com, turnos: melhor.turnos };
}

/** Alguma terra deste poder encosta em alguma daquelas? É o "por aqui se passa". */
function encostaEm(campanha: Campanha, idPoder: string, alvos: ReadonlySet<string>): boolean {
  for (const minha of campanha.provinciasDe(idPoder)) {
    for (const vizinha of campanha.vizinhasDe(minha)) {
      if (alvos.has(vizinha)) return true;
    }
  }
  return false;
}
