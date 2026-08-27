/**
 * **O QUE ELE RESPONDERIA, PERGUNTADO ANTES DO CLIQUE.**
 *
 * ⚠️ **É a peça que separa uma negociação de um menu**, e a tela antiga não tinha nenhuma.
 * O jogador apertava um botão e descobria a resposta depois, numa linha de texto — o que
 * transforma diplomacia em tentativa e erro: aperta, lê a recusa, aperta o próximo. A mesa
 * some, e o que sobra é uma lista de coisas que talvez funcionem.
 *
 * Aqui a pergunta é feita ANTES, para cada ação, com a mesma função que a IA usa quando
 * decide de verdade. Não é estimativa nem chance: **é a resposta dela, consultada de graça.**
 * Se `aceitaPacto` diz não, o botão já chega dizendo não, e dizendo por quê.
 *
 * ⚠️ **E ela é honesta até quando não interessa ao jogador.** Um "ele recusaria" sobre um
 * presente que ele nem precisava mandar é informação boa: quer dizer que dali não vem invasão
 * nenhuma neste turno, e isso vale mais do que o ouro que ele economizou.
 *
 * Fica na camada de APLICAÇÃO e não na campanha porque é onde as duas metades se encontram —
 * a campanha não conhece a IA, e a IA não desenha tela. É a mesma junção que `ligar-acoes.ts`
 * faz na hora de assinar; esta aqui só a faz uma virada antes, para poder contá-la.
 */

import type { Jogo } from '../contexto';
import { estiloDe } from '@/ia/estilo';
import { aceitaPacto } from '@/ia/diplomacia/pactos';
import { querPaz, querPazComTributo } from '@/ia/diplomacia/paz';
import { aceitaPagarTributo, aceitaTributo } from '@/ia/diplomacia/tributos';
import { oportunidadesDe } from '@/ia/percepcao/oportunidade';
import { valeAPena } from '@/ia/guerra/marchar';

/** Uma resposta dele: aceita ou não, e a frase que explica. */
export interface Resposta {
  aceita: boolean;
  /** O que ele diria. Curto, na voz dele, e nunca vazio. */
  fala: string;
}

/** Um prazo cotado com a resposta dele junto. */
export interface PrazoComResposta {
  turnos: number;
  ouro: number;
  /** As regras permitem? Cofre, guerra, pacto em pé, travas. */
  pode: boolean;
  /** E ELE quer? Só faz sentido perguntar quando `pode` é verdadeiro. */
  resposta: Resposta;
}

const SIM_PACTO = 'Amarrar as mãos contra você não me custa nada. Assino.';
const NAO_PACTO = 'Não amarro minhas mãos contra você.';
const SIM_COMERCIO = 'Mercador atravessa fronteira que exército não atravessa. Assino.';
const NAO_COMERCIO = 'Não abro meu mercado a quem eu pretendo enfrentar.';
const SIM_PAZ = 'Esta guerra já não me serve. Aceito a paz.';
const NAO_PAZ = 'Ainda tenho o que ganhar aqui.';

/** Ele assinaria o pacto de não-agressão, se a opinião permitisse o prazo? */
export function respostaAoPacto(jogo: Jogo, com: string, eu: string): Resposta {
  const quer = aceitaPacto(jogo.campanha, com, eu, estiloDe(jogo.ia, com));
  return { aceita: quer, fala: quer ? SIM_PACTO : NAO_PACTO };
}

/** Ele abriria comércio? A mesma pergunta que a IA faz: *eu pretendo atacá-lo?* */
export function respostaAoComercio(jogo: Jogo, com: string, eu: string): Resposta {
  const estilo = estiloDe(jogo.ia, com);
  const quer = jogo.campanha.relacaoEntre(com, eu) > estilo.relacaoParaDeclarar;
  return { aceita: quer, fala: quer ? SIM_COMERCIO : NAO_COMERCIO };
}

/** Ele assinaria a paz de graça? */
export function respostaAPaz(jogo: Jogo, com: string, eu: string): Resposta {
  const quer = querPaz(
    jogo.campanha,
    com,
    eu,
    estiloDe(jogo.ia, com),
    jogo.ajustes.jogo.combate,
  );
  return { aceita: quer, fala: quer ? SIM_PAZ : NAO_PAZ };
}

/**
 * Os prazos de tributo que EU pagaria, cada um com a resposta dele.
 *
 * ⚠️ A resposta muda de prazo para prazo, e é por isso que ela é perguntada em cada degrau:
 * prazo curto é parcela cara, e a mesma Argos que recusa 48 por turno aceita 80.
 */
export function prazosQuePagoComResposta(
  jogo: Jogo,
  com: string,
  eu: string,
): readonly PrazoComResposta[] {
  const estilo = estiloDe(jogo.ia, com);
  const ajustes = jogo.ajustes.jogo.diplomacia.tributo;
  return jogo.campanha.prazosDeTributo(eu, com).map((prazo) => {
    const quer = aceitaTributo(jogo.campanha, com, eu, prazo.ouro, estilo, ajustes);
    return {
      ...prazo,
      resposta: {
        aceita: quer,
        fala: quer
          ? `${prazo.ouro} por turno compra o meu silêncio. Fechado.`
          : 'Ou não tenho nada contra você, ou isso é troco perto do que arrecado.',
      },
    };
  });
}

/** Os prazos que ELE pagaria, se eu exigisse. A resposta é a mesma em todos: ele teme ou não. */
export function prazosQueElePagaComResposta(
  jogo: Jogo,
  com: string,
  eu: string,
): readonly PrazoComResposta[] {
  const ajustes = jogo.ajustes.jogo.diplomacia.tributo;
  const teme = aceitaPagarTributo(jogo.campanha, com, eu, ajustes);
  const resposta: Resposta = {
    aceita: teme,
    fala: teme ? 'Prefiro pagar a ser invadido. Aceito.' : 'Seu exército não me assusta.',
  };
  return jogo.campanha.prazosDeTributo(com, eu).map((prazo) => ({ ...prazo, resposta }));
}

/**
 * Os prazos de PAZ COMPRADA, cada um com a resposta dele.
 *
 * ⚠️ Quando ele já queria a paz de graça, a fala diz isso — e o jogador guarda o ouro. Deixar
 * que ele pagasse por uma coisa que sairia sozinha seria cobrar com uma informação que só o
 * jogo tinha.
 */
export function prazosDePazComResposta(
  jogo: Jogo,
  com: string,
  eu: string,
): readonly PrazoComResposta[] {
  const estilo = estiloDe(jogo.ia, com);
  const combate = jogo.ajustes.jogo.combate;
  const tributo = jogo.ajustes.jogo.diplomacia.tributo;
  const degraca = querPaz(jogo.campanha, com, eu, estilo, combate);
  return jogo.campanha.prazosDePazComTributo(com, eu).map((prazo) => {
    if (degraca) {
      return {
        ...prazo,
        resposta: { aceita: true, fala: 'Eu já queria esta paz. Não me deva nada.' },
      };
    }
    const quer = querPazComTributo(
      jogo.campanha,
      com,
      eu,
      prazo.ouro,
      prazo.turnos,
      estilo,
      combate,
      tributo,
    );
    return {
      ...prazo,
      resposta: {
        aceita: quer,
        fala: quer
          ? `${prazo.ouro} por turno vale mais do que o que eu ainda tomaria. Aceito.`
          : 'Ainda pretendo tomar de você mais do que isso.',
      },
    };
  });
}

/** O que ele quer de você — a intenção lida do mesmo lugar de onde a IA tira as ordens dela. */
export interface Intencao {
  /** Uma frase curta, na voz de um informante. Nunca vazia. */
  frase: string;
  /** `ameaca`, `oferta` ou `nada` — decide se a tela pinta de sangue, de bronze ou de nada. */
  tom: 'ameaca' | 'oferta' | 'nada';
  /**
   * As províncias SUAS que ele considera que valem a marcha, por nome.
   *
   * ⚠️ **É a informação mais valiosa desta tela inteira, e ela é honesta**: sai de
   * `oportunidadesDe` e `valeAPena`, exatamente as funções que a IA consulta quando escolhe
   * para onde mandar a hoste. Não é um aviso vago de perigo — é a lista de nomes que ela tem
   * na mão. Ver isso muda a partida: o jogador para de guarnecer o mapa inteiro e passa a
   * guarnecer aquelas duas.
   */
  cobicadas: readonly string[];
}

/**
 * O que este vizinho quer de você agora.
 *
 * ⚠️ **A ordem das perguntas é a ordem da urgência**, e não a das mecânicas: primeiro o que ele
 * pode te tomar, depois o que ele já te tomou, e só então o que ele assinaria. Um vizinho que
 * está de olho em duas províncias suas não tem "quer comércio" como a manchete dele.
 */
export function intencaoDe(jogo: Jogo, id: string, eu: string): Intencao {
  const { campanha } = jogo;
  const estilo = estiloDe(jogo.ia, id);
  const cobicadas = oportunidadesDe(campanha, id)
    .filter((o) => o.dono === eu)
    .filter((alvo) => valeAPena(campanha, id, alvo, estilo, jogo.ajustes.jogo.combate))
    .map((o) => campanha.nomeDe(o.provincia))
    .sort();

  if (cobicadas.length > 0) {
    const lista = cobicadas.join(', ');
    return {
      frase: campanha.emGuerra(eu, id)
        ? `Marcha sobre ${lista} — é o que ele ainda pretende tomar.`
        : `Tem os olhos em ${lista}. Falta-lhe a declaração, não a vontade.`,
      tom: 'ameaca',
      cobicadas,
    };
  }

  if (campanha.emGuerra(eu, id)) {
    return {
      frase: 'Não vê mais nada seu que valha a marcha. Esta guerra já não o serve.',
      tom: 'oferta',
      cobicadas,
    };
  }

  // Sem apetite pela sua terra: o que sobra é o que ele assinaria de bom grado.
  const querPacto = respostaAoPacto(jogo, id, eu).aceita;
  const querComercio = respostaAoComercio(jogo, id, eu).aceita;
  if (querPacto && querComercio) {
    return {
      frase: 'Não quer nada seu. Assinaria pacto e comércio hoje mesmo.',
      tom: 'oferta',
      cobicadas,
    };
  }
  if (querComercio) {
    return { frase: 'Abriria o mercado, mas não amarra as mãos.', tom: 'oferta', cobicadas };
  }
  if (querPacto) {
    return { frase: 'Amarraria as mãos, mas não confia no seu mercado.', tom: 'oferta', cobicadas };
  }
  return {
    frase: 'Nem te cobiça nem te quer por perto. Ouro é o que resta.',
    tom: 'nada',
    cobicadas,
  };
}

/**
 * **A LINHA EM QUE ESTE VIZINHO PASSA A TE OLHAR** — e o que ela vale saber.
 *
 * ⚠️ **É o que dava ESCALA ao número da opinião, e a tela nunca mostrou.** O jogador via
 * "+12" sem ter como saber se +12 é sossego ou véspera de invasão — e a resposta é diferente
 * para cada vizinho, porque ela sai do temperamento dele: o mercador só considera atacar
 * abaixo de −40, o guerreiro já considera abaixo de +20. Cinquenta e dois pontos de diferença
 * entre dois vizinhos, e a mesma opinião "+12" significando coisas opostas nos dois.
 *
 * ⚠️ **E é UMA linha para DUAS mecânicas**, o que é o que a torna barata e honesta: o mesmo
 * `relacaoParaDeclarar` decide se ele te ataca (`guerraEscolhida`) e se ele assina um pacto
 * com você (`aceitaPacto`). Um traço na régua explica de uma vez "acima daqui ele assina e
 * não te ataca; abaixo daqui ele não assina e começa a te olhar".
 */
export function linhaDeAtaqueDe(jogo: Jogo, id: string): number {
  return estiloDe(jogo.ia, id).relacaoParaDeclarar;
}

/**
 * O menor presente que cobre estes pontos de opinião, ou `null` se nem o seu cofre alcança.
 *
 * ⚠️ **É o que transforma uma recusa em PREÇO.** A tela tinha as duas metades da conta — o
 * quanto falta de opinião, num tooltip de botão cinza, e três presentes cotados em pontos a
 * três centímetros dali — e nunca fazia a subtração para o jogador. Dizer "faltam 13 pontos,
 * e 2.500 de ouro cobrem" é a diferença entre um veredito e uma decisão.
 *
 * Procura de baixo para cima em degraus de meio turno de renda dele: o objetivo é COBRIR, não
 * impressionar, e cada moeda a mais é uma moeda que não vira muro.
 */
export function ouroQueCobre(jogo: Jogo, id: string, pontos: number): number | null {
  if (pontos <= 0) return 0;
  const { campanha } = jogo;
  const passo = Math.max(50, Math.round(campanha.rendaDe(id) / 2));
  const teto = campanha.tesouroDe(campanha.jogador?.id ?? '');
  for (let ouro = passo; ouro <= teto; ouro += passo) {
    if (campanha.valorDoPresente(id, ouro) >= pontos) return ouro;
  }
  return null;
}

/**
 * A frase com que ele ABRE a conversa — antes de qualquer botão.
 *
 * ⚠️ **Porque só uma pessoa tinha voz nesta tela: você.** Todo elemento era um comando seu, e
 * a contraparte era o rótulo do dossiê e depois o silêncio contra o qual se apertavam botões.
 * Uma linha dita por ele, no alto, converte a IA de juiz em parte interessada — e é ancoragem
 * de negociação: quem fala primeiro define o enquadramento.
 *
 * ⚠️ **E ela é GERADA dos mesmos números que decidem**, nunca escrita à mão por vizinho. Uma
 * personalidade anunciada e não cumprida é pior do que nenhuma: se a fala promete um mercador
 * conciliador e a mecânica entrega um invasor, o jogador aprende a não ler a tela.
 */
export function aberturaDe(jogo: Jogo, id: string, eu: string): string {
  const { campanha } = jogo;
  if (campanha.emGuerra(eu, id)) {
    return respostaAPaz(jogo, id, eu).aceita
      ? 'Já sangramos o bastante. Diga o que propõe.'
      : 'Não vim conversar. Vim tomar o que é meu.';
  }
  const relacao = campanha.relacaoEntre(eu, id);
  const linha = linhaDeAtaqueDe(jogo, id);
  const temperamento = estiloDe(jogo.ia, id);
  // Abaixo da linha dele a conversa é outra: ele já está pesando a marcha.
  if (relacao <= linha) {
    return temperamento.arma === 'melhor'
      ? 'Falo com você porque ainda não decidi. Não confunda isso com amizade.'
      : 'Escute rápido. A paciência do meu conselho é curta.';
  }
  if (relacao >= 45) return 'Entre. Nesta casa a sua palavra tem peso.';
  if (relacao >= 15) return 'Sente-se. Temos mais a ganhar juntos do que separados.';
  return 'Diga o que quer. Não prometo nada antes de ouvir.';
}
