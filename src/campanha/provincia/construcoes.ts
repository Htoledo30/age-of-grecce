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
import { baseDe, escalaDeObraEm } from './renda';
import { custoDaObra } from '../custo-de-obra';
import { fatorDeMercadoAtual, rendaDeTrocas } from '../comercio/rede-de-trocas';
import { alivioDasObras } from '../corrupcao';
import { corrupcaoEm } from '../governo/corrupcao-na-provincia';

/** A obra em andamento nesta província, se houver. */
export function obraEm(nucleo: NucleoDaCampanha, idProvincia: string): Obra | undefined {
  return nucleo.estado.obras[idProvincia];
}

/**
 * Catálogo curto: universais mais as explorações que combinam com esta terra.
 *
 * ⚠️ **Prédio que não serve HOJE não aparece.** Regra de Henrique: todo prédio comprável
 * tem que fazer alguma coisa agora; o que só promete fica escondido até ter função. O
 * Nenhum prédio está nessa situação hoje: o Quartel esteve e voltou ao catálogo quando passou
 * a carimbar treino na leva. A regra fica de pé para o próximo que prometer antes de entregar
 * — o campo `efeito.tipo === 'futuro'` continua no esquema exatamente para isso. ("qualidade
 * da tropa" tiver onde existir. Vender 1.500 moedas de promessa é pior que não vender nada:
 * o jogador paga, não vê diferença, e deixa de confiar no resto do catálogo.
 */
export function construcoesDisponiveisEm(
  nucleo: NucleoDaCampanha,
  idProvincia: string,
): CatalogoDeConstrucoes {
  return Object.fromEntries(
    Object.entries(nucleo.catalogo).filter(
      ([id, construcao]) =>
        construcao.efeito.tipo !== 'futuro' && cumpreRequisito(nucleo, idProvincia, id),
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
  const base = baseDe(nucleo, idProvincia);
  const local = retornoDaConstrucao(
    ficha,
    nucleo.economia.produtos,
    nucleo.catalogo,
    nucleo.ajustes.economia,
    base,
    idConstrucao,
    corrupcaoComAObra(nucleo, idProvincia, idConstrucao, base),
  );
  // ⚠️ **A praça tem duas pernas, e a ficha tem que somar as duas.** A perna local já veio
  // acima, dentro da renda da província; a nacional é a rede do reino, que não cabe em
  // província nenhuma. Sem esta soma o Mercado apareceria pela metade — que foi exatamente o
  // defeito que a Ágora teve antes de a corrupção entrar na conta.
  const efeito = nucleo.catalogo[idConstrucao]?.efeito;
  if (efeito?.tipo !== 'troca') return local;
  const naRede = ganhoNaRede(nucleo, idProvincia, idConstrucao);
  const ganhoPorTurno = local.ganhoPorTurno + naRede;
  return {
    custo: local.custo,
    ganhoPorTurno,
    turnosParaPagar:
      ganhoPorTurno > 0 ? local.custo / ganhoPorTurno : Number.POSITIVE_INFINITY,
  };
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
  /** Quem quer erguer. O padrão é o jogador; a IA diz o poder dela. */
  porPoder: string | null = nucleo.estado.jogador,
): Recusa {
  const construcao = nucleo.catalogo[idConstrucao];
  if (!construcao) return { pode: false, motivo: `construção inexistente: ${idConstrucao}` };
  const naProvincia = podeAgirEm(nucleo, idProvincia, porPoder);
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
  // Quem paga a obra é o DONO da província, não necessariamente o jogador. A IA passa pela
  // mesma regra e usa o próprio cofre.
  const caixa = tesouroDe(nucleo, donoDe(nucleo, idProvincia));
  const custo = custoDaObra(construcao, nivelAtual + 1, escalaDeObraEm(nucleo, idProvincia));
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
  porPoder: string | null = nucleo.estado.jogador,
): void {
  const r = podeConstruir(nucleo, idProvincia, idConstrucao, porPoder);
  if (!r.pode) throw new Error(r.motivo);
  const construcao = nucleo.catalogo[idConstrucao];
  if (!construcao) throw new Error(`construção inexistente: ${idConstrucao}`);
  const nivelAlvo = nivelDaConstrucaoEm(nucleo, idProvincia, idConstrucao) + 1;
  const custo = custoDaObra(construcao, nivelAlvo, escalaDeObraEm(nucleo, idProvincia));
  const turnos = construcao.turnos[nivelAlvo - 1] ?? construcao.turnos[2];
  gastar(nucleo, donoDe(nucleo, idProvincia), custo);
  nucleo.estado.obras[idProvincia] = {
    construcao: idConstrucao,
    nivelAlvo,
    turnosRestantes: turnos,
  };
}

/** A corrupção desta terra se a obra estivesse de pé — só muda para Ágora e Estrada. */
function corrupcaoComAObra(
  nucleo: NucleoDaCampanha,
  idProvincia: string,
  idConstrucao: string,
  base: { readonly corrupcao: number; readonly construcoes: Readonly<Record<string, number>> },
): number {
  const efeito = nucleo.catalogo[idConstrucao]?.efeito;
  if (efeito?.tipo !== 'corrupcao') return base.corrupcao;
  const nivelAtual = base.construcoes[idConstrucao] ?? 0;
  const nivelAlvo = Math.min(3, nivelAtual + 1);
  const atual = corrupcaoEm(nucleo, idProvincia);
  const depois = alivioDasObras({ [idConstrucao]: nivelAlvo }, nucleo.catalogo);
  // ⚠️ **Desconta o alívio que esta MESMA obra já dá antes de aplicar o do nível novo.**
  // `atual` já está com o nível de hoje dentro dela; multiplicar o fator cheio do nível
  // seguinte por cima cobrava o desconto duas vezes e a tooltip prometia o que a obra não
  // entregava. Medido: Ágora I → II em Atenas anunciava +47 por turno e entregava +34.
  //
  // Dividir em vez de subtrair porque os fatores são MULTIPLICATIVOS: o que se quer é a
  // razão entre o degrau novo e o velho, e ela é o quanto a fatia ainda vai encolher.
  const antes =
    nivelAtual > 0
      ? alivioDasObras({ [idConstrucao]: nivelAtual }, nucleo.catalogo)
      : { tamanho: 1, distancia: 1 };
  const passo = {
    tamanho: antes.tamanho > 0 ? depois.tamanho / antes.tamanho : depois.tamanho,
    distancia: antes.distancia > 0 ? depois.distancia / antes.distancia : depois.distancia,
  };
  const tamanho = atual.porTamanho * passo.tamanho;
  const distancia = atual.porDistancia * passo.distancia;
  return 1 - (1 - tamanho) * (1 - distancia);
}

/**
 * O que o Mercado acrescenta à REDE do reino por turno — a perna nacional dele.
 *
 * Vale por REINO e pelo MELHOR Mercado: dois deles não fazem o mesmo bem circular duas
 * vezes. É por isso que o segundo Mercado só rende a diferença de nível, e é isso que
 * impede "um Mercado em cada província" de ser a jogada óbvia.
 */
function ganhoNaRede(
  nucleo: NucleoDaCampanha,
  idProvincia: string,
  idConstrucao: string,
): number {
  const construcao = nucleo.catalogo[idConstrucao];
  const idPoder = donoDe(nucleo, idProvincia);
  const nivelAlvo = Math.min(3, nivelDaConstrucaoEm(nucleo, idProvincia, idConstrucao) + 1);
  const antes = rendaDeTrocas(nucleo, idPoder);
  const efeito = construcao?.efeito;
  const fatorNovo = efeito?.tipo === 'troca' ? (efeito.fatores[nivelAlvo - 1] ?? 1) : 1;
  const fatorAtual = fatorDeMercadoAtual(nucleo, idPoder);
  if (fatorAtual <= 0) return 0;
  const depois = Math.round((antes / fatorAtual) * Math.max(fatorAtual, fatorNovo));
  return depois - antes;
}
