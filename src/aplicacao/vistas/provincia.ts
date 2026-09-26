/**
 * O painel da província e as duas janelas que ele abre: construções e recrutamento.
 *
 * Montar isto a cada desenho, em vez de guardar o resultado, é o que garante que conquistar
 * uma província atualize o painel dela no mesmo instante.
 *
 * ⚠️ **Números e nomes, nunca frases prontas.** Quem escreve "35.000 habitantes · Terra
 * grande" é a tela. Aqui a régua é traduzida — a posição do humor entre as faixas, por
 * exemplo — porque os limites vivem em `ajustes.json` e a tela não pode cravá-los.
 */

import { homensEmFormacao } from '@/combate/formacao-de-leva';
import type { VistaDeAcoes } from '@/ui/acoes-provincia';
import type { VistaDeConstrucoes } from '@/ui/construcoes';
import type { VistaDaProvincia } from '@/ui/ficha-provincia/ficha-provincia';
import { ARMAS } from '@/combate/exercito';
import { motivoDaArmaTrancada } from '@/combate/recrutamento';
import { nomeDaRegiao } from '@/mundo/regioes';
import type { VistaDeRecrutamento } from '@/ui/recrutamento';
import type { Jogo } from '../contexto';
import { apresentacaoDaConstrucao } from './apresentacao-de-construcoes';

/**
 * Junta as duas verdades: o atlas diz o que a província É, a campanha diz de quem ela É
 * AGORA.
 */
export function vistaDaProvincia(jogo: Jogo, id: string): VistaDaProvincia {
  const { atlas, campanha, ajustes } = jogo;
  const p = atlas.provincia(id);
  // ⚠️ **A água sai por aqui, antes de tudo.** Zona marítima não tem dono, e perguntar o
  // poder de um dono vazio estoura. Ela também não tem povo, humor, renda nem obra: o painel
  // dela é o nome e a natureza dela, e mais nada — inventar medidas vazias seria pior.
  if (atlas.ehMar(id)) {
    return {
      nome: p.nome,
      regiao: nomeDaRegiao(p.regiao),
      mar: true,
      poder: { id: '', nome: '', povo: '', cor: '' },
      minha: false,
      capital: false,
      povos: '',
      estranheza: null,
      faixa: '',
      milicia: 0,
      humor: null,
      cerco: null,
      bloqueio: null,
      faseCritica: 0,
      obra: null,
      economia: null,
    };
  }
  const dono = campanha.donoDe(id);
  const poder = campanha.poder(dono);
  const perfil = campanha.perfilDe(id);
  const cerco = campanha.cercoEm(id);
  const relogio = campanha.fomeDoCercoEm(id);
  const renda = campanha.economiaDe(id);
  const obra = campanha.obraEm(id);
  return {
    nome: p.nome,
    regiao: nomeDaRegiao(p.regiao),
    mar: false,
    poder: { id: poder.id, nome: poder.nome, povo: poder.povo, cor: poder.cor },
    minha: campanha.jogador?.id === dono,
    capital: campanha.capitalDe(dono) === id,
    povos: perfil ? composicaoDoPovo(perfil.nacionalidades) : poder.povo,
    estranheza: perfil ? campanha.estranhezaEm(id) : null,
    faixa: campanha.faixaDaProvinciaEm(id),
    milicia: campanha.miliciaEm(id),
    humor: perfil
      ? {
          valor: perfil.felicidade.valor,
          faixa: perfil.felicidade.faixa,
          posicao: posicaoNaRegua(perfil.felicidade.valor, ajustes.jogo.felicidade.faixas),
          alvo: campanha.alvoDeFelicidadeEm(id),
          alvoEmRisco:
            campanha.alvoDeFelicidadeEm(id) <= (ajustes.jogo.felicidade.faixas[1]?.ate ?? 0),
          parcelas: campanha.parcelasDeFelicidadeEm(id),
        }
      : null,
    cerco:
      cerco && relogio ? { sitiante: campanha.poder(cerco.sitiante).nome, ...relogio } : null,
    // O bloqueio é o cerco do mar, e a ficha o diz com as mesmas palavras: quem, e o que se
    // perde. Vários reinos podem estar na mesma água — a frase junta os nomes.
    bloqueio: (() => {
      const quem = campanha.bloqueiamEm(id);
      if (quem.length === 0) return null;
      return { por: quem.map((idp) => campanha.poder(idp).nome).join(' e ') };
    })(),
    faseCritica: campanha.povoEstranhoManda(id) ? campanha.faseCriticaEm(id) : 0,
    obra: obra
      ? {
          nome:
            `${campanha.construcoesDisponiveis[obra.construcao]?.nome ?? ''} ` +
            `${romano(obra.nivelAlvo)}`,
          turnosRestantes: obra.turnosRestantes,
        }
      : null,
    economia: renda
      ? {
          populacao: renda.populacao,
          crescimento: campanha.crescimentoDe(id),
          // A tropa levantada AQUI entra na conta: é despesa da campanha, não da terra, e
          // sem ela o saldo do painel discordaria do saldo do reino.
          saldo: renda.total - campanha.custoDaTropaDe(id),
          impostos: renda.impostos,
          corrupcao: renda.corrupcao,
          producao: renda.producao,
          transito: renda.transito,
          manutencao: renda.manutencao,
          tropa: campanha.custoDaTropaDe(id),
          revoltosa: renda.revoltosa,
          fatorDoHumor: campanha.fatorDoHumorEm(id),
          cortada: renda.cortada,
          produto: { nome: renda.produto.nome, nivel: renda.nivel },
          secundario: perfil
            ? { nome: perfil.secundario.nome, nivel: perfil.secundario.nivel }
            : null,
          construcoes: campanha.construcoesEm(id).map((idc) => ({
            nome: campanha.construcoesDisponiveis[idc]?.nome ?? idc,
            nivel: campanha.nivelDaConstrucaoEm(id, idc),
          })),
        }
      : null,
  };
}

/**
 * Em que degrau da régua de humor este valor caiu, de 0 (a pior faixa) a 1 (a melhor).
 *
 * ⚠️ Traduzido aqui, e não na tela, porque os limites das faixas vivem no JSON: a cor da
 * medida não pode depender de um "abaixo de 40 é vermelho" escrito no CSS.
 */
function posicaoNaRegua(valor: number, faixas: readonly { ate: number }[]): number {
  if (faixas.length <= 1) return 1;
  const indice = faixas.findIndex((f) => valor <= f.ate);
  return (indice === -1 ? faixas.length - 1 : indice) / (faixas.length - 1);
}

/**
 * A composição da população numa linha: "Eleusina 85% · Ateniense 15%".
 *
 * Povo único sai sem porcentagem — "Ateniense 100%" é ruído, e a maioria das províncias
 * é assim. A porcentagem só aparece quando ela significa alguma coisa.
 */
function composicaoDoPovo(fatias: readonly { nome: string; fracao: number }[]): string {
  if (fatias.length === 1) return fatias[0]?.nome ?? '';
  return fatias.map((f) => `${f.nome} ${Math.round(f.fracao * 100)}%`).join(' · ');
}

function romano(nivel: number): string {
  return ['I', 'II', 'III', 'IV', 'V'][nivel - 1] ?? String(nivel);
}

/**
 * O que a barra de comandos mostra agora.
 *
 * Sem seleção, não existe alvo nem decisão: a barra some para devolver o mapa ao jogador. Com
 * uma província selecionada ela permanece visível mesmo quando não dá pra agir, explicando o
 * impedimento em vez de esconder a existência da mecânica.
 */
export function vistaDeAcoes(jogo: Jogo): VistaDeAcoes | null {
  const { campanha, atlas, ajustes, selecao } = jogo;
  if (selecao.fase !== 'campanha') return null;
  const alvo = selecao.provincia;
  if (!alvo) return null;
  // Zona marítima não recebe comando nenhum: nem obra, nem leva, nem imposto. A barra some
  // em vez de explicar por que cada botão está apagado — não há decisão aqui.
  if (atlas.ehMar(alvo)) return null;
  const nomeDoAlvo = atlas.nomeDe(alvo);
  // O portão é a PROVÍNCIA, não uma ação: estar sem dinheiro não pode esconder os comandos,
  // senão o jogador quebrado deixa de ver o que existe pra comprar.
  const portao = campanha.podeAgirEm(alvo);
  if (!portao.pode) return { pode: false, motivo: `${nomeDoAlvo}: ${portao.motivo}.` };

  const erguidas = campanha.construcoesEm(alvo);
  const obra = campanha.obraEm(alvo);
  const slotsUsados = erguidas.length + (obra && !erguidas.includes(obra.construcao) ? 1 : 0);
  const disponiveis = Object.keys(campanha.construcoesDisponiveisEm(alvo)).filter(
    (id) => campanha.podeConstruir(alvo, id).pode,
  ).length;
  const recrutamentoBloqueado = motivoDoRecrutamento(jogo, alvo, nomeDoAlvo);
  return {
    pode: true,
    provincia: { id: alvo, nome: nomeDoAlvo },
    slots: { usados: slotsUsados, total: ajustes.jogo.construcoes.slotsPorProvincia },
    disponiveis,
    recrutamentoBloqueado,
    capital: {
      atual: campanha.jogador ? campanha.capitalDe(campanha.jogador.id) === alvo : false,
      custo: campanha.custoDeMudancaDeCapital(),
      urgente: campanha.jogador ? campanha.capitalPerdida(campanha.jogador.id) : false,
      resposta: campanha.podeMudarCapital(alvo),
    },
    imposto: {
      nivel: campanha.nivelDeImpostoEm(alvo),
      niveis: ajustes.jogo.economia.imposto.niveis,
      // ⚠️ A previsão é POR PROVÍNCIA, e por isso vive aqui e não no ajuste: o mesmo decreto
      // rende +21% numa terra de gente e −2% numa terra de azeite, porque o imposto é uma
      // parcela e o humor cobra sobre o todo.
      previsao: {
        baixo: campanha.previsaoDeImpostoEm(alvo, 'baixo'),
        normal: campanha.previsaoDeImpostoEm(alvo, 'normal'),
        alto: campanha.previsaoDeImpostoEm(alvo, 'alto'),
        confisco: campanha.previsaoDeImpostoEm(alvo, 'confisco'),
      },
    },
  };
}

/** Por que não dá pra levantar tropa aqui. Vazio quando dá. */
function motivoDoRecrutamento(jogo: Jogo, alvo: string, nome: string): string {
  const { campanha } = jogo;
  const naProvincia = campanha.podeAgirEm(alvo);
  if (!naProvincia.pode) return `${nome}: ${naProvincia.motivo}.`;
  if (!campanha.podeRecrutarEm(alvo)) {
    return `${nome}: não há população disponível para reunir tropa.`;
  }
  return '';
}

/** O catálogo desta província, como a janela de construções precisa vê-lo. */
export function vistaDeConstrucoes(jogo: Jogo): VistaDeConstrucoes | null {
  const { campanha, atlas, ajustes, selecao } = jogo;
  if (selecao.fase !== 'campanha') return null;
  const alvo = selecao.provincia;
  if (!alvo || !campanha.podeAgirEm(alvo).pode) return null;
  const obra = campanha.obraEm(alvo);
  const erguidas = campanha.construcoesEm(alvo);
  const slotsUsados = erguidas.length + (obra && !erguidas.includes(obra.construcao) ? 1 : 0);
  return {
    provincia: { id: alvo, nome: atlas.nomeDe(alvo) },
    regiao: nomeDaRegiao(atlas.provincia(alvo).regiao),
    slots: { usados: slotsUsados, total: ajustes.jogo.construcoes.slotsPorProvincia },
    tesouro: campanha.tesouro,
    construcoes: Object.entries(campanha.construcoesDisponiveisEm(alvo)).map(([id, c]) => {
      const conta = campanha.retornoDaConstrucaoEm(alvo, id);
      const r = campanha.podeConstruir(alvo, id);
      const nivelAtual = campanha.nivelDaConstrucaoEm(alvo, id);
      const nivelMaximo = c.nivelMaximo ?? ajustes.jogo.construcoes.nivelMaximo;
      const nivelAlvo = Math.min(nivelMaximo, nivelAtual + 1);
      return {
        id,
        nome: c.nome,
        custo: campanha.custoDaObraEm(alvo, id, nivelAlvo),
        turnos: c.turnos[nivelAlvo - 1] ?? c.turnos[2],
        nivelAtual,
        nivelAlvo,
        nivelMaximo,
        emObra: obra?.construcao === id ? obra.turnosRestantes : null,
        recusa: r.pode ? null : r.motivo,
        ganhoPorTurno: conta?.ganhoPorTurno ?? 0,
        turnosParaPagar: conta?.turnosParaPagar ?? Number.POSITIVE_INFINITY,
        manutencao: campanha.manutencaoDaObraEm(alvo, id, nivelAlvo),
        apresentacao: apresentacaoDaConstrucao(c, nivelAlvo, conta?.ganhoPorTurno ?? 0),
      };
    }),
  };
}

/**
 * O que a janela de recrutamento mostra agora.
 *
 * Mesma regra dos comandos: sem província selecionada, some. Quando há alvo, mas não dá
 * pra recrutar, diz o motivo.
 */
export function vistaDeRecrutamento(jogo: Jogo): VistaDeRecrutamento | null {
  const { campanha, atlas, ajustes, selecao } = jogo;
  if (selecao.fase !== 'campanha') return null;
  const alvo = selecao.provincia;
  if (!alvo) return null;
  const nome = atlas.nomeDe(alvo);
  const bloqueio = motivoDoRecrutamento(jogo, alvo, nome);
  if (bloqueio !== '') return { pode: false, motivo: bloqueio };
  const liberadas = campanha.armasEm(alvo);
  return {
    pode: true,
    provincia: { id: alvo, nome },
    regiao: nomeDaRegiao(atlas.provincia(alvo).regiao),
    populacao: campanha.populacaoDe(alvo),
    disponivel: campanha.disponivelParaLevaEm(alvo),
    emFormacao: homensEmFormacao(campanha.formacaoEm(alvo)),
    // ⚠️ **As quatro, sempre**, e não só as liberadas: é a janela que ensina que existe
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
    // próximo turno. O preço de marchar é outro, e a janela diz qual.
    /**
     * Quantos homens A MAIS a despensa do reino ainda alimenta.
     *
     * ⚠️ **O aviso mora AQUI e não na barra do topo**, e Henrique estava certo: *"aqueles
     * 1500 jogados na UI é ridículo"*. Um número solto no HUD é ruído permanente; a informação
     * pertence ao instante da decisão, quando a mão já está na barra do recrutamento.
     */
    homensQueAComidaSustenta: campanha.alimentacao.homensQueSustenta,
    manutencaoPorHomem: campanha.taxaDaTropaEmCasaEm(alvo),
    manutencaoEmCampanha: ajustes.jogo.combate.manutencaoPorHomem.emCampanha,
    avaliar: (homens, arma) => campanha.podeRecrutar(alvo, homens, arma),
  };
}
