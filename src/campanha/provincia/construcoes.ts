/**
 * Erguer construções: o catálogo que esta terra aceita, o que cada obra rende e o gasto.
 *
 * Paga à vista e **não expira nunca** — é essa permanência que faz da construção o destino
 * do dinheiro que nenhuma outra decisão absorve. Não existe cancelar: devolver o dinheiro
 * faria da obra um cofre com juros, onde estacionar tesouro sem risco nenhum.
 */

import { retornoDaConstrucao } from '../economia';
import type { RetornoDaConstrucao } from '../economia';
import type { Obra } from '../estado-campanha';
import type { CatalogoDeConstrucoes, NucleoDaCampanha, Recusa } from '../nucleo';
import { gastar, tesouroDe } from '../governo/tesouro';
import { construcoesEm, donoDe, fichaDe, nivelDaConstrucaoEm } from './consultas';
import { podeAgirEm } from './permissoes';
import { baseDe } from './renda';

/** A obra em andamento nesta província, se houver. */
export function obraEm(nucleo: NucleoDaCampanha, idProvincia: string): Obra | undefined {
  return nucleo.estado.obras[idProvincia];
}

/** Catálogo curto: universais mais as explorações que combinam com esta terra. */
export function construcoesDisponiveisEm(
  nucleo: NucleoDaCampanha,
  idProvincia: string,
): CatalogoDeConstrucoes {
  return Object.fromEntries(
    Object.entries(nucleo.catalogo).filter(([id]) =>
      cumpreRequisito(nucleo, idProvincia, id),
    ),
  );
}

function cumpreRequisito(
  nucleo: NucleoDaCampanha,
  idProvincia: string,
  idConstrucao: string,
): boolean {
  const ficha = fichaDe(nucleo, idProvincia);
  const requisito = nucleo.catalogo[idConstrucao]?.requisito;
  if (!ficha || !requisito) return ficha !== undefined;
  if (requisito.ancoradouro && !ficha.ancoradouro) return false;
  if (requisito.produtos) {
    const produtos = new Set([ficha.produto, ficha.secundario.produto]);
    if (!requisito.produtos.some((produto) => produtos.has(produto))) return false;
  }
  return true;
}

/**
 * Quanto esta construção acrescentaria aqui, e em quantos turnos ela se paga.
 *
 * `null` quando a província não tem economia. Construção é permanente e sempre se paga um
 * dia — o que importa é quando.
 */
export function retornoDaConstrucaoEm(
  nucleo: NucleoDaCampanha,
  idProvincia: string,
  idConstrucao: string,
): RetornoDaConstrucao | null {
  const ficha = fichaDe(nucleo, idProvincia);
  if (!ficha) return null;
  return retornoDaConstrucao(
    ficha,
    nucleo.economia.produtos,
    nucleo.catalogo,
    nucleo.ajustes.economia,
    baseDe(nucleo, idProvincia),
    idConstrucao,
  );
}

/**
 * Pode erguer isto aqui?
 *
 * Devolve o MOTIVO da recusa, como toda permissão do jogo — a interface mostra o texto em
 * vez de esconder a opção, que é a regra da casa.
 */
export function podeConstruir(
  nucleo: NucleoDaCampanha,
  idProvincia: string,
  idConstrucao: string,
): Recusa {
  const construcao = nucleo.catalogo[idConstrucao];
  if (!construcao) return { pode: false, motivo: `construção inexistente: ${idConstrucao}` };
  const naProvincia = podeAgirEm(nucleo, idProvincia);
  if (!naProvincia.pode) return naProvincia;
  if (!cumpreRequisito(nucleo, idProvincia, idConstrucao)) {
    return { pode: false, motivo: 'esta terra não cumpre os requisitos' };
  }
  const nivelAtual = nivelDaConstrucaoEm(nucleo, idProvincia, idConstrucao);
  if (nivelAtual >= nucleo.ajustes.construcoes.nivelMaximo) {
    return { pode: false, motivo: 'nível máximo' };
  }
  if (
    nivelAtual === 0 &&
    construcoesEm(nucleo, idProvincia).length >= nucleo.ajustes.construcoes.slotsPorProvincia
  ) {
    return {
      pode: false,
      motivo: `todos os ${nucleo.ajustes.construcoes.slotsPorProvincia} slots estão ocupados`,
    };
  }
  const obra = obraEm(nucleo, idProvincia);
  if (obra) {
    const nome = nucleo.catalogo[obra.construcao]?.nome ?? obra.construcao;
    return { pode: false, motivo: `${nome} em obra aqui (${obra.turnosRestantes} turnos)` };
  }
  // Quem paga a obra é o DONO da província, não o jogador. Hoje dá no mesmo porque só o
  // jogador constrói; quando a IA construir, o cofre certo já é o que está aqui.
  const caixa = tesouroDe(nucleo, donoDe(nucleo, idProvincia));
  const custo = construcao.custos[nivelAtual] ?? construcao.custos[2];
  if (custo > caixa) {
    return { pode: false, motivo: `faltam ${(custo - caixa).toLocaleString('pt-BR')} moedas` };
  }
  return { pode: true, bonus: 0 };
}

/** Ergue uma construção: cobra à vista e registra a obra, que entrega depois. */
export function construir(
  nucleo: NucleoDaCampanha,
  idProvincia: string,
  idConstrucao: string,
): void {
  const r = podeConstruir(nucleo, idProvincia, idConstrucao);
  if (!r.pode) throw new Error(r.motivo);
  const construcao = nucleo.catalogo[idConstrucao];
  if (!construcao) throw new Error(`construção inexistente: ${idConstrucao}`);
  const nivelAlvo = nivelDaConstrucaoEm(nucleo, idProvincia, idConstrucao) + 1;
  const custo = construcao.custos[nivelAlvo - 1] ?? construcao.custos[2];
  const turnos = construcao.turnos[nivelAlvo - 1] ?? construcao.turnos[2];
  gastar(nucleo, donoDe(nucleo, idProvincia), custo);
  nucleo.estado.obras[idProvincia] = {
    construcao: idConstrucao,
    nivelAlvo,
    turnosRestantes: turnos,
  };
}
