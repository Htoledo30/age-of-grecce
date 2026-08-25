/**
 * As perguntas curtas sobre uma província — as que todo o resto usa.
 *
 * Nenhuma regra mora aqui: são leituras do estado com a resposta honesta para quem não
 * existe (zero habitantes, nenhuma construção, ficha ausente). Fica no fundo da pilha de
 * dependências de propósito — não importa nada do próprio pacote, e por isso pode ser
 * importada por qualquer módulo sem risco de ciclo.
 */

import type { Economia } from '@/dados/esquema';
import { perfilDaProvincia } from '../perfil-da-provincia';
import type { PerfilDaProvincia } from '../perfil-da-provincia';
import type { NucleoDaCampanha } from '../nucleo';

type FichaDaProvincia = Economia['provincias'][string];

/** De quem é esta província AGORA. Não é o dono assado: é o dono corrente. */
export function donoDe(nucleo: NucleoDaCampanha, idProvincia: string): string {
  return nucleo.territorios.donoDe(idProvincia);
}

/**
 * A ficha autoral desta terra, ou `undefined`.
 *
 * `undefined` é resposta legítima: 180 das 205 províncias não são simuladas, e o jogo
 * admite isso com todas as letras em vez de inventar número.
 */
export function fichaDe(
  nucleo: NucleoDaCampanha,
  idProvincia: string,
): FichaDaProvincia | undefined {
  return nucleo.economia.provincias[idProvincia];
}

/**
 * Habitantes que ainda estão na província.
 *
 * Zero quando ela não tem economia configurada — mesma resposta honesta que `economiaDe`
 * dá, em vez de um número inventado.
 */
export function populacaoDe(nucleo: NucleoDaCampanha, idProvincia: string): number {
  return nucleo.estado.populacao[idProvincia] ?? 0;
}

/** O que já foi erguido nesta província, em ordem de id. Vazio quando não há nada. */
export function construcoesEm(
  nucleo: NucleoDaCampanha,
  idProvincia: string,
): readonly string[] {
  return Object.keys(nucleo.estado.construcoes[idProvincia] ?? {}).sort();
}

export function nivelDaConstrucaoEm(
  nucleo: NucleoDaCampanha,
  idProvincia: string,
  idConstrucao: string,
): number {
  return nucleo.estado.construcoes[idProvincia]?.[idConstrucao] ?? 0;
}

/**
 * Povo, humor e ancoradouro — o retrato que não é dinheiro.
 *
 * `null` na província sem ficha autoral, exatamente como `economiaDe`: a maior parte do
 * mapa não é simulada, e a interface diz isso com todas as letras em vez de inventar.
 */
export function perfilDe(
  nucleo: NucleoDaCampanha,
  idProvincia: string,
): PerfilDaProvincia | null {
  return perfilDaProvincia(
    idProvincia,
    nucleo.economia,
    {
      felicidade: nucleo.estado.felicidade[idProvincia] ?? 0,
      nacionalidades: nucleo.estado.nacionalidades[idProvincia] ?? {},
    },
    nucleo.ajustes.felicidade.faixas,
  );
}

/** O povo desta província vive sob bandeira que não é a de 700 a.C.? */
export function dominioEstrangeiroEm(
  nucleo: NucleoDaCampanha,
  idProvincia: string,
): boolean {
  return donoDe(nucleo, idProvincia) !== nucleo.atlas.donoInicial(idProvincia);
}

/** As províncias do poder que TÊM ficha autoral — as que a campanha simula. */
export function simuladasDe(
  nucleo: NucleoDaCampanha,
  idPoder: string,
): readonly string[] {
  return nucleo.territorios
    .provinciasDe(idPoder)
    .filter((id) => nucleo.economia.provincias[id] !== undefined);
}

/**
 * Os poderes em ordem de id.
 *
 * ⚠️ Ordenado sempre: sem isso, o resultado da virada dependeria de quem entrou primeiro
 * no mapa, e a passagem de turno tem que ser determinística pelo mesmo motivo que a
 * resolução da rodada é.
 */
export function poderesEmOrdem(nucleo: NucleoDaCampanha): readonly string[] {
  return nucleo.atlas.poderes.map((p) => p.id).sort();
}
