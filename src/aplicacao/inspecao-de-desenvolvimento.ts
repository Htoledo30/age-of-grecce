/**
 * O gancho de inspeção: **só existe em desenvolvimento.**
 *
 * É o que deixa a ferramenta de captura apontar a câmera pra qualquer ponto do mundo e o
 * teste de tela afirmar sobre a VERDADE da campanha, em vez de sobre o texto que por acaso
 * está desenhado nela. Nada aqui é regra do jogo, e nada disto existe no jogo empacotado —
 * quem chama vive atrás de `import.meta.env.DEV`.
 */

import { forcaDe } from '@/combate/exercito';
import { entrarNaCampanha } from './comecar-campanha';
import type { Jogo } from './contexto';
import { virarTurno } from './virar-turno';

export function instalarInspecao(jogo: Jogo): void {
  const { campanha, atlas, cena } = jogo;
  (window as unknown as { inspecao?: unknown }).inspecao = {
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
    construir: (idProvincia: string, idConstrucao: string) =>
      campanha.construir(idProvincia, idConstrucao),
    recrutar: (idProvincia: string, homens: number) => campanha.recrutar(idProvincia, homens),
    forcaEm: (idProvincia: string, idPoder?: string) =>
      campanha.forcaEm(idProvincia, idPoder ?? campanha.donoDe(idProvincia)),
    formacaoEm: (idProvincia: string) => campanha.formacaoEm(idProvincia),
    dispensar: (idProvincia: string, homens: number) => campanha.dispensar(idProvincia, homens),
    hostesEm: (idProvincia: string) =>
      campanha.hostesEm(idProvincia).map((h) => ({
        id: h.id,
        poder: h.poder,
        forca: forcaDe(h),
      })),
    noExilio: (idPoder: string) => campanha.noExilio(idPoder),
    // `porPoder` opcional: a ordem pertence ao dono da HOSTE, e é assim que se monta um
    // inimigo no tabuleiro enquanto a IA não existe.
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
    plantarHoste: (idProvincia: string, idPoder: string, homens: number) =>
      campanha.plantarHoste(idProvincia, idPoder, homens),
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
  };
}
