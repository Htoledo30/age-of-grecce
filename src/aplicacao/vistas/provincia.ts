/**
 * A ficha da província e os dois painéis que a seguem: ações e recrutamento.
 *
 * Montar isto a cada desenho, em vez de guardar o resultado, é o que garante que conquistar
 * uma província atualize a ficha dela no mesmo instante.
 */

import { homensEmFormacao } from '@/combate/formacao-de-leva';
import type { VistaDeAcoes } from '@/ui/acoes-provincia';
import type { VistaDaProvincia } from '@/ui/ficha-provincia/ficha-provincia';
import { ARMAS } from '@/combate/exercito';
import { motivoDaArmaTrancada } from '@/combate/recrutamento';
import type { VistaDeRecrutamento } from '@/ui/recrutamento';
import type { Jogo } from '../contexto';

/**
 * Junta as duas verdades: o atlas diz o que a província É, a campanha diz de quem ela É
 * AGORA.
 */
export function vistaDaProvincia(jogo: Jogo, id: string): VistaDaProvincia {
  const { atlas, campanha } = jogo;
  const p = atlas.provincia(id);
  const poder = campanha.poder(campanha.donoDe(id));
  const simulada = campanha.perfilDe(id) !== null;
  const cerco = campanha.cercoEm(id);
  const relogio = campanha.fomeDoCercoEm(id);
  return {
    nome: p.nome,
    regiao: p.regiao,
    poder: { nome: poder.nome, povo: poder.povo, cor: poder.cor },
    faixa: campanha.faixaDaProvinciaEm(id),
    milicia: campanha.miliciaEm(id),
    // A conta do humor, parcela a parcela — só onde há simulação pra contar.
    humor: simulada
      ? { alvo: campanha.alvoDeFelicidadeEm(id), parcelas: campanha.parcelasDeFelicidadeEm(id) }
      : null,
    cerco:
      cerco && relogio ? { sitiante: campanha.poder(cerco.sitiante).nome, ...relogio } : null,
  };
}

/**
 * O que o bloco de ações mostra agora.
 *
 * Sem seleção, não existe alvo nem decisão: o bloco some para devolver o mapa ao jogador. Com
 * uma província selecionada ele permanece visível mesmo quando não dá pra agir, explicando o
 * impedimento em vez de esconder a existência da mecânica.
 */
export function vistaDeAcoes(jogo: Jogo): VistaDeAcoes | null {
  const { campanha, atlas, ajustes, selecao } = jogo;
  if (selecao.fase !== 'campanha') return null;
  const alvo = selecao.provincia;
  if (!alvo) return null;
  const nomeDoAlvo = atlas.nomeDe(alvo);
  // O portão é a PROVÍNCIA, não uma ação: estar sem dinheiro não pode esconder a lista de
  // construções, senão o jogador quebrado deixa de ver o que existe pra comprar.
  const portao = campanha.podeAgirEm(alvo);
  if (!portao.pode) return { pode: false, motivo: `${nomeDoAlvo}: ${portao.motivo}.` };
  const erguidas = campanha.construcoesEm(alvo);
  const obra = campanha.obraEm(alvo);
  return {
    pode: true,
    provincia: { id: alvo, nome: nomeDoAlvo },
    capital: {
      atual: campanha.jogador ? campanha.capitalDe(campanha.jogador.id) === alvo : false,
      custo: campanha.custoDeMudancaDeCapital(),
      urgente: campanha.jogador ? campanha.capitalPerdida(campanha.jogador.id) : false,
      resposta: campanha.podeMudarCapital(alvo),
    },
    construcoes: Object.entries(campanha.construcoesDisponiveisEm(alvo)).map(([id, c]) => {
      const conta = campanha.retornoDaConstrucaoEm(alvo, id);
      const r = campanha.podeConstruir(alvo, id);
      const nivelAtual = campanha.nivelDaConstrucaoEm(alvo, id);
      const nivelAlvo = Math.min(ajustes.jogo.construcoes.nivelMaximo, nivelAtual + 1);
      return {
        id,
        nome: c.nome,
        custo: campanha.custoDaObraEm(alvo, id, nivelAlvo),
        turnos: c.turnos[nivelAlvo - 1] ?? c.turnos[2],
        nivelAtual,
        nivelAlvo,
        nivelMaximo: ajustes.jogo.construcoes.nivelMaximo,
        emObra: obra?.construcao === id ? obra.turnosRestantes : null,
        recusa: r.pode ? null : r.motivo,
        motivo: c.motivo,
        ganhoPorTurno: conta?.ganhoPorTurno ?? 0,
        turnosParaPagar: conta?.turnosParaPagar ?? Number.POSITIVE_INFINITY,
        manutencao: campanha.manutencaoDaObraEm(alvo, id, nivelAlvo),
        rendeMoeda: c.efeito.tipo === 'renda' || c.efeito.tipo === 'corrupcao' || c.efeito.tipo === 'troca',
        promessa: c.promessa,
      };
    }),
    slots: { usados: erguidas.length, total: ajustes.jogo.construcoes.slotsPorProvincia },
    imposto: {
      nivel: campanha.nivelDeImpostoEm(alvo),
      niveis: ajustes.jogo.economia.imposto.niveis,
    },
  };
}

/**
 * O que o bloco de recrutamento mostra agora.
 *
 * Mesma regra do bloco de ações: sem província selecionada, some. Quando há alvo, mas não dá
 * pra recrutar, diz o motivo.
 */
export function vistaDeRecrutamento(jogo: Jogo): VistaDeRecrutamento | null {
  const { campanha, atlas, ajustes, selecao } = jogo;
  if (selecao.fase !== 'campanha') return null;
  const alvo = selecao.provincia;
  if (!alvo) return null;
  const naProvincia = campanha.podeAgirEm(alvo);
  if (!naProvincia.pode) {
    return { pode: false, motivo: `${atlas.nomeDe(alvo)}: ${naProvincia.motivo}.` };
  }
  if (!campanha.podeRecrutarEm(alvo)) {
    return {
      pode: false,
      motivo: `${atlas.nomeDe(alvo)}: não há população disponível para reunir tropa.`,
    };
  }
  const liberadas = campanha.armasEm(alvo);
  return {
    pode: true,
    provincia: { id: alvo, nome: atlas.nomeDe(alvo) },
    populacao: campanha.populacaoDe(alvo),
    disponivel: campanha.disponivelParaLevaEm(alvo),
    emFormacao: homensEmFormacao(campanha.formacaoEm(alvo)),
    // ⚠️ **As quatro, sempre**, e não só as liberadas: é o painel que ensina que existe
    // cavalaria e o que ela exige. Mostrar só o que já dá para fazer esconderia a decisão
    // de construir, que é a parte interessante.
    armas: ARMAS.map((arma) => {
      const dados = ajustes.jogo.combate.batalha.armas[arma];
      const liberada = liberadas.includes(arma);
      return {
        arma,
        liberada,
        motivo: liberada ? '' : motivoDaArmaTrancada(arma),
        custoPorHomem: ajustes.jogo.combate.custoPorHomem * dados.custo,
        maximo: liberada ? campanha.maximoParaLevaEm(alvo, arma) : 0,
        comida: dados.comida,
        ataque: dados.ataque,
        aguento: dados.aguento,
      };
    }),
    treino: campanha.treinoEm(alvo),
    // A leva nasce e fica EM CASA: a previsão mostra o que ela vai custar de verdade no
    // próximo turno. O preço de marchar é outro, e o painel diz qual.
    manutencaoPorHomem: ajustes.jogo.combate.manutencaoPorHomem.emCasa,
    manutencaoEmCampanha: ajustes.jogo.combate.manutencaoPorHomem.emCampanha,
    avaliar: (homens, arma) => campanha.podeRecrutar(alvo, homens, arma),
  };
}
