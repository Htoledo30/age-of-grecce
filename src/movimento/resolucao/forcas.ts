/**
 * A FORÇA — guarnição parada e destacamento em marcha são a MESMA coisa aqui.
 *
 * ⚠️ Sem essa unificação, cada linha da tabela de adjudicação viraria um `if` diferente —
 * "hoste contra hoste", "hoste contra quem chegou", "quem chegou contra quem chegou" — e as
 * três teriam que concordar. Uma estrutura só, e o choque não pergunta de onde a força veio.
 */

import { forcaDe, retirar } from '@/combate/exercito';
import type { Contingente } from '@/combate/exercito';
import type { EstadoDaResolucao } from './relatorio';
import type { OrdemDeMarcha } from '../ordens';

/**
 * Uma força durante a resolução.
 *
 * **Enquanto marcha, ela não está na origem nem no destino**: está onde o passo a deixou. Sem
 * isso, "interceptar no meio do caminho" não teria onde acontecer.
 */
export interface Forca {
  /**
   * A hoste de onde esta forca saiu.
   *
   * Guardada para que a que pousa REAPROVEITE a identidade em vez de nascer outra: uma hoste
   * que marcha e a mesma hoste do outro lado, e um id novo a cada passo faria a selecao do
   * jogador se perder toda virada de turno.
   */
  hoste: string;
  poder: string;
  /**
   * Os contingentes que vieram: terra natal, arma e treino de cada grupo.
   *
   * Fatia proporcional da hoste de origem — `retirar` já reparte de cada contingente, e é
   * isso que impede um destacamento de levar a cavalaria inteira por acidente de índice.
   */
  contingentes: Contingente[];
  /** Trechos que ainda vai andar. Vazio na guarnição parada. */
  rota: readonly string[];
  posicao: string;
  partiuDe: string;
  /** Fração de baixas em que esta força sai de campo. `null` = luta até quebrar. */
  recuarAos: number | null;
  /** A viagem que originou esta força. Ausente em quem ficou parado. */
  ordem?: OrdemDeMarcha;
  /** Morreu num choque. Não some da lista: sair no meio da varredura muda o resultado. */
  viva: boolean;
}

export function soma(contingentes: readonly Contingente[]): number {
  let total = 0;
  for (const c of contingentes) total += c.homens;
  return total;
}

/**
 * FASE PARTIDA — todos saem antes de qualquer um chegar, e o tabuleiro fica vazio.
 *
 * Tira TODAS as hostes do estado, não só as que marcham: quem fica vira uma força de rota
 * vazia. É o que permite o choque tratar guarnição e destacamento pela mesma régua.
 *
 * ⚠️ **A origem fica vazia já aqui**, mesmo com destino a dois trechos. Quem manda a
 * guarnição inteira embora deixa a casa aberta desde o primeiro instante da rodada.
 *
 * ⚠️ **Ordenado por id**, nunca pela ordem do registro: `Object.entries` devolve as chaves na
 * ordem de criação, e percorrer isso cru faria o resultado depender de quem foi recrutado
 * primeiro.
 */
export function partir(estado: EstadoDaResolucao): Forca[] {
  const forcas: Forca[] = [];
  // ⚠️ Guarda a lista ANTES de esvaziar o tabuleiro. Esvaziar primeiro e percorrer depois
  // percorre o vazio — nenhuma força parte, e o mapa fica sem exército nenhum.
  const antes = Object.keys(estado.hostes).sort();
  const emPe = { ...estado.hostes };
  // O tabuleiro fica vazio: quem fica volta em `pousar`, com a própria identidade.
  estado.hostes = {};

  for (const id of antes) {
    const hoste = emPe[id];
    if (!hoste) continue;
    const onde = hoste.posicao;
    const ordem = estado.ordens[id];

    if (ordem) {
      // `retirar` já tira proporcionalmente de cada terra natal — é o que faz o destacamento
      // levar uma parcela de cada origem em vez da primeira da lista.
      // ⚠️ **Id NOVO só quando sobra alguém para trás.** Marchar com a hoste INTEIRA rebatizava
      // a tropa a cada rodada — medido: h1 vai a Maratona e vira h2, volta e vira h3 —, e o
      // jogador perdia a seleção na virada porque a ficha aponta para um id que deixou de
      // existir. O comentário deste arquivo já prometia que quem pousa reaproveita a
      // identidade; era só a marcha inteira que não cumpria.
      const inteira = ordem.homens >= forcaDe(hoste);
      const partem = retirar(hoste, Math.min(ordem.homens, forcaDe(hoste)));
      if (Object.keys(partem).length > 0) {
        forcas.push({
          // O destacamento e uma hoste NOVA: parte da antiga fica, parte vai, e as duas
          // passam a existir ao mesmo tempo. Indo tudo, não há antiga: o id continua sendo dela.
          hoste: inteira ? id : `h${estado.proximaHoste++}`,
          poder: hoste.poder,
          contingentes: partem,
          rota: ordem.rota,
          posicao: onde,
          partiuDe: onde,
          recuarAos: ordem.recuarAos,
          ordem,
          viva: true,
        });
      }
    }

    if (forcaDe(hoste) > 0) {
      forcas.push({
        hoste: id,
        poder: hoste.poder,
        contingentes: hoste.contingentes.map((c) => ({ ...c })),
        rota: [],
        // ⚠️ Quem FICA não recua: o recuo é ordem dada com a marcha, e quem está parado em
        // casa não recebeu nenhuma. Um defensor que quisesse recuar teria de ter marchado.
        recuarAos: null,
        posicao: onde,
        partiuDe: onde,
        viva: true,
      });
    }
  }

  return forcas;
}

/** FASE CHEGADA — todos os sobreviventes avançam um trecho. */
export function chegar(forcas: readonly Forca[], passo: number): void {
  for (const forca of forcas) {
    if (!forca.viva) continue;
    const proxima = forca.rota[passo];
    if (proxima === undefined) continue;
    forca.posicao = proxima;
  }
}
