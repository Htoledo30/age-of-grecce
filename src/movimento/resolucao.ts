/**
 * A resolução da rodada: executa todas as ordens juntas, em passos.
 *
 * O princípio, e ele responde quase tudo sozinho:
 *
 * > **A rodada resolve em PASSOS. Dentro de cada passo: primeiro todos PARTEM, depois
 * > todos CHEGAM, e só então se resolve quem ficou junto de quem.**
 *
 * É essa separação que faz a simultaneidade ser real. Se partida e chegada acontecessem
 * hoste por hoste, quem fosse processado primeiro veria um mundo que os outros ainda não
 * mexeram — que é exatamente o defeito que a resolução simultânea existe pra consertar.
 *
 * Ver `documentacao/design/resolucao-da-rodada.md` para a tabela de adjudicação completa.
 */

import { exercitoVazio, forcaDe, retirar, somarLeva } from '@/combate/exercito';
import type { Exercito } from '@/combate/exercito';
import type { OrdemDeMarcha } from './ordens';

/** O recorte do estado que a resolução mexe. Nada além disto. */
export interface EstadoDaResolucao {
  exercitos: Record<string, Exercito>;
  ordens: Record<string, OrdemDeMarcha>;
}

/**
 * Um destacamento em marcha.
 *
 * **Enquanto marcha, ele não está na origem nem no destino**: está onde o passo o deixou.
 * Sem isso, "interceptar no meio do caminho" não teria onde acontecer.
 */
interface EmMarcha {
  poder: string;
  /** De onde saiu. Guardado porque `posicao` anda, e o relatório precisa das duas pontas. */
  partiuDe: string;
  /** Quantos homens de cada terra natal. Fatia proporcional da hoste de origem. */
  origem: Record<string, number>;
  rota: readonly string[];
  /** Onde ele está agora. Começa na província de partida. */
  posicao: string;
  /** Quantos trechos já andou. */
  passo: number;
}

/** O que aconteceu na rodada, pra crônica e pros testes. */
export interface RelatorioDaRodada {
  /** Uma linha por destacamento que chegou: de onde saiu, onde parou, quantos. */
  marchas: readonly { origem: string; destino: string; homens: number }[];
}

/**
 * Executa todas as ordens da rodada e limpa o registro.
 *
 * ⚠️ **As ordens são da RODADA, não da partida.** Elas são esvaziadas no fim daqui — se
 * sobrevivessem à virada, executariam de novo, e o sintoma seria tropa andando sozinha.
 */
export function resolverRodada(
  estado: EstadoDaResolucao,
  saltosPorRodada: number,
): RelatorioDaRodada {
  const emMarcha = partir(estado);
  for (let passo = 0; passo < saltosPorRodada; passo++) chegar(emMarcha, passo);
  const marchas = pousar(estado, emMarcha);
  estado.ordens = {};
  return { marchas };
}

/**
 * FASE PARTIDA — todos saem antes de qualquer um chegar.
 *
 * ⚠️ **A origem fica vazia já aqui**, mesmo que o destino esteja a dois trechos. Quem
 * manda a guarnição inteira embora deixa a casa aberta desde o primeiro instante da
 * rodada, e isso é a mecânica funcionando.
 *
 * ⚠️ **Ordenado por id de província**, nunca pela ordem do registro. `Object.entries`
 * devolve as chaves na ordem em que foram criadas — percorrer isso cru faria o resultado
 * da rodada depender de quem foi recrutado primeiro.
 */
function partir(estado: EstadoDaResolucao): EmMarcha[] {
  const emMarcha: EmMarcha[] = [];

  for (const origem of Object.keys(estado.ordens).sort()) {
    const ordem = estado.ordens[origem];
    if (!ordem) continue;
    const hoste = estado.exercitos[origem];
    // Ordem cuja hoste sumiu entre o registro e a virada (dispensada, desertada) não é
    // erro: simplesmente não há quem marche.
    if (!hoste) continue;

    // `retirar` já tira proporcionalmente de cada terra natal, e é o que faz o
    // destacamento levar uma parcela de cada origem em vez da primeira da lista.
    const homens = retirar(hoste, Math.min(ordem.homens, forcaDe(hoste)));
    if (Object.keys(homens).length === 0) continue;
    if (forcaDe(hoste) === 0) delete estado.exercitos[origem];

    emMarcha.push({
      poder: hoste.poder,
      partiuDe: origem,
      origem: homens,
      rota: ordem.rota,
      posicao: origem,
      passo: 0,
    });
  }

  return emMarcha;
}

/**
 * FASE CHEGADA — todos avançam um trecho.
 *
 * A fase de CHOQUE entra logo depois desta, quando a batalha existir: é aqui que se
 * descobre quem ficou junto de quem, e é aqui que o encontro na estrada — duas forças
 * hostis atravessando a mesma aresta em sentidos opostos — vai ser detectado.
 *
 * Enquanto só se marcha por território próprio, não há hostil nenhum para encontrar, e a
 * fase é só o avanço.
 */
function chegar(emMarcha: readonly EmMarcha[], passo: number): void {
  for (const destacamento of emMarcha) {
    const proxima = destacamento.rota[passo];
    if (proxima === undefined) continue; // rota de um trecho não participa do passo 2
    destacamento.posicao = proxima;
    destacamento.passo = passo + 1;
  }
}

/**
 * Põe os destacamentos no chão onde pararam, fundindo com a hoste que já estiver ali.
 *
 * **Uma hoste por província**: chegar onde já há tropa sua junta as duas, somando a terra
 * natal de cada homem — e por isso quem veio de Maratona continua voltando pra Maratona
 * quando for dispensado.
 */
function pousar(
  estado: EstadoDaResolucao,
  emMarcha: readonly EmMarcha[],
): RelatorioDaRodada['marchas'] {
  const marchas: { origem: string; destino: string; homens: number }[] = [];

  for (const destacamento of emMarcha) {
    const naChegada = estado.exercitos[destacamento.posicao] ?? exercitoVazio(destacamento.poder);
    let total = 0;
    for (const [terra, homens] of Object.entries(destacamento.origem)) {
      somarLeva(naChegada, terra, homens);
      total += homens;
    }
    estado.exercitos[destacamento.posicao] = naChegada;
    marchas.push({
      origem: destacamento.partiuDe,
      destino: destacamento.posicao,
      homens: total,
    });
  }

  return marchas;
}
