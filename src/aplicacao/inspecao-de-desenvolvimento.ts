/**
 * O gancho de inspeção: **só existe em desenvolvimento.**
 *
 * É o que deixa a ferramenta de captura apontar a câmera pra qualquer ponto do mundo e o
 * teste de tela afirmar sobre a VERDADE da campanha, em vez de sobre o texto que por acaso
 * está desenhado nela. Nada aqui é regra do jogo, e nada disto existe no jogo empacotado —
 * quem chama vive atrás de `import.meta.env.DEV`.
 */

import type { Arma } from '@/combate/exercito';
import { forcaDe } from '@/combate/exercito';
import { homensEmFormacao } from '@/combate/formacao-de-leva';
import { entrarNaCampanha } from './comecar-campanha';
import type { Jogo } from './contexto';
import { virarTurno } from './virar-turno';

export function instalarInspecao(jogo: Jogo): void {
  const { campanha, atlas, cena, ajustes } = jogo;
  (window as unknown as { inspecao?: unknown }).inspecao = {
    /**
     * Tira a COMIDA do caminho para o resto do teste. O andaime dos testes de TELA.
     *
     * ⚠️ **Tem a mesma razão do `ajustesFartos` dos testes de unidade, e a mesma data.** Desde
     * que `subsistenciaPorReino` caiu para 1, Atenas abre com saldo ZERO e não sustenta um
     * soldado antes de erguer comida — então um teste de BATALHA que planta 900 homens via 855
     * na tela e passava a medir fome em vez de batalha. O teste de tela não tem como trocar os
     * ajustes na carga: ele abre o jogo de verdade, com o `dados/ajustes.json` de verdade.
     *
     * Quem TESTA comida não chama isto: é lá que a régua tem de doer.
     */
    saciar: () => {
      ajustes.jogo.alimento.soldadosPorPonto = 1_000_000;
      ajustes.jogo.alimento.subsistenciaPorReino = 1_000;
    },
    posicionar: (x: number, y: number, zoom: number) => cena.posicionar(x, y, zoom),
    calibrarFronteira: (largura?: number, forca?: number, cor?: string) =>
      cena.calibrarFronteira(largura, forca, cor),
    campanha: () => ({
      jogador: campanha.jogador?.id ?? null,
      ano: campanha.ano,
      turno: campanha.turno,
      tesouro: campanha.tesouro,
      renda: campanha.renda,
      provincias: campanha.jogador ? campanha.provinciasDe(campanha.jogador.id).length : 0,
      poderesVivos: campanha.poderesVivos().length,
    }),
    donoDe: (idProvincia: string) => campanha.donoDe(idProvincia),
    // O centro assado de uma província: é o que deixa o teste de tela apontar a câmera pra
    // qualquer terra e clicar nela sem cravar coordenada de pixel.
    centroDe: (idProvincia: string) => atlas.provincia(idProvincia).centro,
    provinciasSimuladas: () => campanha.provinciasSimuladas,
    resultado: () => campanha.resultado(),
    capitalDe: (idPoder: string) => campanha.capitalDe(idPoder),
    capitalPerdida: (idPoder: string) => campanha.capitalPerdida(idPoder),
    mudarCapital: (idProvincia: string) => campanha.mudarCapital(idProvincia),
    darOuro: (valor: number) => campanha.darOuro(valor),
    passarTurno: () => virarTurno(jogo),
    comecar: (idPoder: string) => entrarNaCampanha(jogo, idPoder),
    // O preço de uma obra deixou de ser o número do catálogo: ele acompanha a riqueza da
    // terra. O teste de tela pergunta em vez de cravar.
    custoDaObraEm: (idProvincia: string, idConstrucao: string, nivel: number) =>
      campanha.custoDaObraEm(idProvincia, idConstrucao, nivel),
    construir: (idProvincia: string, idConstrucao: string) =>
      campanha.construir(idProvincia, idConstrucao),
    recrutar: (idProvincia: string, homens: number, arma?: Arma) =>
      campanha.recrutar(idProvincia, homens, arma),
    forcaEm: (idProvincia: string, idPoder?: string) =>
      campanha.forcaEm(idProvincia, idPoder ?? campanha.donoDe(idProvincia)),
    // O total vem DERIVADO ao lado do detalhe, como em `hostesEm`: a leva guarda
    // contingentes, e quem inspeciona quase sempre quer só o número de homens.
    formacaoEm: (idProvincia: string) => {
      const formacao = campanha.formacaoEm(idProvincia);
      return formacao ? { ...formacao, homens: homensEmFormacao(formacao) } : undefined;
    },
    dispensar: (idProvincia: string, homens: number) => campanha.dispensar(idProvincia, homens),
    hostesEm: (idProvincia: string) =>
      campanha.hostesEm(idProvincia).map((h) => ({
        id: h.id,
        poder: h.poder,
        forca: forcaDe(h),
      })),
    noExilio: (idPoder: string) => campanha.noExilio(idPoder),
    // `porPoder` opcional: a ordem pertence ao dono da HOSTE. A inspeção usa isto para
    // montar cenários controlados com qualquer poder.
    ordenarMarcha: (
      idHoste: string,
      destino: string,
      homens: number,
      porPoder?: string,
      postura?: 'assaltar' | 'sitiar',
    ) =>
      campanha.ordenarMarcha(
        idHoste,
        destino,
        homens,
        porPoder ?? campanha.jogador?.id ?? null,
        postura ?? 'sitiar',
      ),
    cancelarOrdem: (idHoste: string) => campanha.cancelarOrdem(idHoste),
    surtir: (idHoste: string, porPoder?: string) =>
      campanha.surtir(idHoste, porPoder ?? campanha.jogador?.id ?? null),
    // Põe uma hoste de qualquer poder no mapa, do nada: é assim que se monta um inimigo no
    // tabuleiro pra ver a guerra rodar enquanto não há IA.
    plantarHoste: (idProvincia: string, idPoder: string, homens: number, arma?: Arma) =>
      campanha.plantarHoste(idProvincia, idPoder, homens, arma),
    rodada: () => campanha.rodada,
    miliciaEm: (idProvincia: string) => campanha.miliciaEm(idProvincia),
    ordens: () => campanha.ordens(),
    alcanceDaHoste: (idHoste: string) => [...campanha.alcanceDaHoste(idHoste)],
    populacaoDe: (idProvincia: string) => campanha.populacaoDe(idProvincia),
    // Estes três existem para o teste de tela conferir se o que está DESENHADO bate com o que
    // as regras dizem, em vez de cravar o número. Balanço muda; a ligação, não.
    crescimentoDe: (idProvincia: string) => campanha.crescimentoDe(idProvincia)?.crescimento ?? 0,
    disponivelParaLevaEm: (idProvincia: string) => campanha.disponivelParaLevaEm(idProvincia),
    economiaDe: (idProvincia: string) => campanha.economiaDe(idProvincia),
    alimentacao: () => campanha.alimentacao,
    rendaDeTrocas: (idPoder: string) => campanha.rendaDeTrocas(idPoder),
    bensEmCirculacao: (idPoder: string) => campanha.bensEmCirculacao(idPoder).map((b) => b.id),
    balancoAlimentarDe: (idPoder: string) => campanha.balancoAlimentarDe(idPoder),
    contribuicaoAlimentarEm: (idProvincia: string) =>
      campanha.contribuicaoAlimentarEm(idProvincia),
    nivelPopulacionalEm: (idProvincia: string) => campanha.nivelPopulacionalEm(idProvincia),
    matarPopulacao: (idProvincia: string, quantos: number) =>
      campanha.matarPopulacao(idProvincia, quantos),
    // Conquista crua, sem regra de guerra nenhuma: é o que deixa a fatia de propriedade ser
    // vista e testada antes de existir exército.
    conquistar: (idProvincia: string, idPoder: string) =>
      campanha.trocarDono(idProvincia, idPoder),
    // A mesa de propostas: é o único jeito de o teste de tela e a captura porem um pedido do
    // outro lado em cima da mesa sem esperar a IA querer.
    proporAoJogador: (de: string, tipo: 'pacto' | 'alianca' | 'liga' | 'anexacao' | 'comercio' | 'acesso', turnos?: number) =>
      campanha.proporAoJogador(turnos === undefined ? { de, tipo } : { de, tipo, turnos }),
    propostas: () => campanha.propostas().map((p) => `${p.de}:${p.tipo}`),
    concederAcesso: (para: string, turnos: number, porPoder?: string) =>
      campanha.concederAcesso(para, turnos, porPoder),
    acessosDe: (idPoder: string) => campanha.acessosDe(idPoder),
    // Diplomacia: o teste de tela confere contra a REGRA, e não contra o que a tela desenhou.
    emGuerra: (a: string, b: string) => campanha.emGuerra(a, b),
    guerrasDe: (idPoder: string) => [...campanha.guerrasDe(idPoder)],
    declararGuerra: (contra: string, porPoder?: string) =>
      campanha.declararGuerra(contra, porPoder),
  };
}
