/**
 * O pavio do levante e o levante em si.
 *
 * O levante só nasce onde há CONTRA QUEM se levantar: província sob bandeira que não é a
 * de 700 a.C. Os rebeldes saem da população e nascem como hoste do dono antigo — que volta
 * ao jogo se tinha sido eliminado. Província revoltosa de dono legítimo faz greve fiscal
 * (imposto zero) e nada mais, por enquanto.
 */

import type { NucleoDaCampanha } from '../nucleo';
import { dominioEstrangeiroEm, populacaoDe } from '../provincia/consultas';

export interface Levante {
  provincia: string;
  poder: string;
  homens: number;
}

/**
 * Corre o pavio desta província revoltosa e, no limite, arma o levante.
 *
 * Devolve o levante quando ele nasce, e `null` quando o pavio só andou. Quem chama já
 * conferiu que o humor está na faixa revoltosa; sair da faixa apaga o registro lá.
 */
export function acenderPavioEm(
  nucleo: NucleoDaCampanha,
  idProvincia: string,
): Levante | null {
  if (!dominioEstrangeiroEm(nucleo, idProvincia)) return null;

  const pavio = (nucleo.estado.revoltas[idProvincia] ?? 0) + 1;
  if (pavio < nucleo.ajustes.felicidade.revolta.turnos) {
    nucleo.estado.revoltas[idProvincia] = pavio;
    return null;
  }
  // Não empilha levante sobre levante: enquanto os rebeldes anteriores estiverem de pé na
  // província, o pavio fica aceso mas nada nasce.
  const donoAntigo = nucleo.atlas.donoInicial(idProvincia);
  if (nucleo.mobilizacao.hostesEm(idProvincia).some((h) => h.poder === donoAntigo)) {
    nucleo.estado.revoltas[idProvincia] = pavio;
    return null;
  }
  const homens = Math.round(
    populacaoDe(nucleo, idProvincia) * nucleo.ajustes.felicidade.revolta.fracaoRebelde,
  );
  const idHoste = nucleo.mobilizacao.levantarRebeldes(idProvincia, donoAntigo, homens);
  delete nucleo.estado.revoltas[idProvincia];
  if (idHoste === null) return null;

  // ⚠️ **O levante SENTA na cidade, e é isso que faz dele uma ameaça em vez de uma estátua.**
  // Ele nascia como uma hoste solta em terra alheia, sem ordem e sem cerco — e uma hoste
  // assim não luta, não sitia e não toma nada: o `quemLuta` responde que ela não quer briga.
  // Henrique encontrou jogando: *"a província se revoltou e criou um exército no local, só
  // que o exército está na minha província e não tomou a província"*. Ficava lá, para sempre.
  //
  // Sitiando, o resto do jogo já sabe o que fazer: a cidade para de produzir e de comerciar,
  // o dono pode esmagá-los com uma surtida ou com socorro de fora, e eles assaltam quando a
  // muralha permitir. A revolta virou a pergunta que ela devia ser desde sempre — **esmaga ou
  // perde a terra?**
  nucleo.estado.cercos[idProvincia] = {
    sitiante: donoAntigo,
    // Assaltar, e não sentar: quem pegou em armas contra o ocupante não veio esperar. Cidade
    // murada continua barrando o assalto de hoje, e aí eles ficam na porta — o que é o cerco
    // de qualquer jeito.
    postura: 'assaltar',
    rodadas: 0,
  };
  return {
    provincia: idProvincia,
    poder: donoAntigo,
    homens: nucleo.mobilizacao.forcaDaHoste(idHoste),
  };
}
