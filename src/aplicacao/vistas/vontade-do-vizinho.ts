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
 * Se a balança não fecha, o botão já chega dizendo não e abre a conta que explica por quê.
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
import { balancaDaAlianca } from '@/ia/diplomacia/aliancas';
import {
  type Balanca,
  type Lados,
  aceita,
  cobicadasPor,
  ouroQueFecha,
  prazoMaisCurto,
} from '@/ia/diplomacia/balanca';
import { aceitaServir } from '@/ia/diplomacia/ligas';
import { aceitaComercio, balancaDoPacto } from '@/ia/diplomacia/pactos';
import { querPaz, querPazComTributo } from '@/ia/diplomacia/paz';
import { aceitaPagarTributo, aceitaTributo } from '@/ia/diplomacia/tributos';
import { oportunidadesDe } from '@/ia/percepcao/oportunidade';
import { valeAPena } from '@/ia/guerra/marchar';
import { milhar } from '@/nucleo/numeros';

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
  /** E, quando não permitem, POR QUÊ — a frase que a própria regra escreveu. */
  motivo: string;
  /** E ELE quer? Só faz sentido perguntar quando `pode` é verdadeiro. */
  resposta: Resposta;
}

const SIM_PACTO = 'Amarrar as mãos contra você não me custa nada. Assino.';
const NAO_PACTO = 'Não amarro minhas mãos contra você.';
const SIM_ALIANCA = 'As minhas lanças ao lado das suas. Assino.';
const NAO_ALIANCA = 'Não empresto o meu exército a você.';
const SIM_COMERCIO = 'Mercador atravessa fronteira que exército não atravessa. Assino.';
const NAO_COMERCIO = 'Não abro meu mercado a quem eu pretendo enfrentar.';
const SIM_LIGA = 'Melhor servir a você do que cair sozinho. Aceito.';
const NAO_LIGA = 'Não me dobro a quem não me protege.';
const SIM_PAZ = 'Esta guerra já não me serve. Aceito a paz.';
const NAO_PAZ = 'Ainda tenho o que ganhar aqui.';
const SEM_SAIDA = 'não há o que oferecer';

/**
 * Uma resposta com a CONTA aberta: a balança que a produziu e, quando é não, o que a viraria.
 *
 * ⚠️ **É o que Henrique pediu no lugar do selo:** *"quero igual os jogos de estratégia fazem,
 * só que melhor: posso influenciar dependendo do que ofertar, e se me odeiam muito seja
 * impossível"*. As parcelas dizem POR QUÊ; o pedido diz O QUE FAZER — ouro, guarnecer a terra
 * que ele cobiça, entrar na guerra dele — ou que não há saída hoje.
 */
export interface RespostaComBalanca extends Resposta {
  balanca: Balanca;
  /** O que viraria a balança. Vazio quando ele aceita. */
  pedido: string;
}

/** Um prazo cotado com a balança dele junto. */
export interface PrazoComBalanca extends PrazoComResposta {
  resposta: RespostaComBalanca;
}

/** Ele assinaria o pacto de não-agressão deste prazo? O mais curto, quando não se diz qual. */
export function respostaAoPacto(
  jogo: Jogo,
  com: string,
  eu: string,
  turnos = prazoMaisCurto(jogo.ajustes.jogo.diplomacia.pacto.prazos),
  cobicadas?: readonly string[],
  ouro = 0,
): RespostaComBalanca {
  const estilo = estiloDe(jogo.ia, com);
  const lados: Lados = { ele: com, voce: eu };
  const lidas = cobicadas ?? cobicadasPor(jogo.campanha, lados, estilo, jogo.ajustes.jogo);
  const balanca = balancaDoPacto(jogo.campanha, lados, turnos, estilo, jogo.ajustes.jogo, {
    cobicadas: lidas,
    ouro,
  });
  const quer = aceita(balanca);
  return {
    aceita: quer,
    fala: quer ? SIM_PACTO : NAO_PACTO,
    balanca,
    pedido: quer ? '' : pedidoQueFecha(jogo, lados, balanca, lidas, 'pacto'),
  };
}

/** Ele assinaria a aliança deste prazo? */
export function respostaAAlianca(
  jogo: Jogo,
  com: string,
  eu: string,
  turnos = prazoMaisCurto(jogo.ajustes.jogo.diplomacia.alianca.prazos),
  cobicadas?: readonly string[],
  ouro = 0,
): RespostaComBalanca {
  const estilo = estiloDe(jogo.ia, com);
  const lados: Lados = { ele: com, voce: eu };
  const lidas = cobicadas ?? cobicadasPor(jogo.campanha, lados, estilo, jogo.ajustes.jogo);
  const balanca = balancaDaAlianca(jogo.campanha, lados, turnos, estilo, jogo.ajustes.jogo, {
    cobicadas: lidas,
    ouro,
  });
  const quer = aceita(balanca);
  return {
    aceita: quer,
    fala: quer ? SIM_ALIANCA : NAO_ALIANCA,
    balanca,
    pedido: quer ? '' : pedidoQueFecha(jogo, lados, balanca, lidas, 'alianca'),
  };
}

/**
 * Os prazos de pacto da escada, cada um com a regra E a balança dele.
 *
 * A cobiça é lida uma vez: ela roda uma previsão de batalha por província, e três prazos não
 * mudam o que ele cobiça.
 */
export function prazosDePactoComResposta(
  jogo: Jogo,
  com: string,
  eu: string,
): readonly PrazoComBalanca[] {
  const lados: Lados = { ele: com, voce: eu };
  const cobicadas = cobicadasPor(jogo.campanha, lados, estiloDe(jogo.ia, com), jogo.ajustes.jogo);
  return jogo.campanha
    .prazosDePacto(com, eu)
    .map((p) =>
      cotarPrazo(jogo, lados, p, (ouro) =>
        respostaAoPacto(jogo, com, eu, p.turnos, cobicadas, ouro),
      ),
    );
}

/** Os prazos de aliança da escada, cada um com a regra E a balança dele. */
export function prazosDeAliancaComResposta(
  jogo: Jogo,
  com: string,
  eu: string,
): readonly PrazoComBalanca[] {
  const lados: Lados = { ele: com, voce: eu };
  const cobicadas = cobicadasPor(jogo.campanha, lados, estiloDe(jogo.ia, com), jogo.ajustes.jogo);
  return jogo.campanha
    .prazosDeAlianca(eu, com)
    .map((p) =>
      cotarPrazo(jogo, lados, p, (ouro) =>
        respostaAAlianca(jogo, com, eu, p.turnos, cobicadas, ouro),
      ),
    );
}

/**
 * Cota o menor ouro que faz ESTE prazo fechar e o põe dentro da proposta.
 *
 * Assim a coluna `custo` é uma oferta de verdade: o clique pesa a mesma quantia e a assinatura
 * a transfere. Antes a mesa prometia "N de ouro fechariam", mas não havia como oferecer N.
 */
function cotarPrazo(
  jogo: Jogo,
  lados: Lados,
  prazo: { turnos: number; pode: boolean; motivo: string },
  responder: (ouro: number) => RespostaComBalanca,
): PrazoComBalanca {
  const base = responder(0);
  if (!prazo.pode || base.aceita) return { ...prazo, ouro: 0, resposta: base };

  const { campanha } = jogo;
  const estilo = estiloDe(jogo.ia, lados.ele);
  const limite = Math.max(campanha.tesouroDe(lados.voce), campanha.rendaDe(lados.ele) * 60);
  const oferta = ouroQueFecha(
    campanha,
    lados,
    base.balanca.saldo,
    estilo,
    jogo.ajustes.jogo,
    limite,
  );
  if (oferta === null) return { ...prazo, ouro: 0, resposta: base };

  const cabeNoCofre = campanha.tesouroDe(lados.voce) >= oferta;
  if (!cabeNoCofre) {
    return {
      turnos: prazo.turnos,
      ouro: oferta,
      pode: false,
      motivo: `seu tesouro não tem ${milhar(oferta)} de ouro`,
      resposta: base,
    };
  }
  return {
    turnos: prazo.turnos,
    ouro: oferta,
    pode: true,
    motivo: '',
    resposta: responder(oferta),
  };
}

/** Ele entraria na sua liga? A mesma pergunta que a IA faz a si mesma. */
export function respostaALiga(jogo: Jogo, com: string, eu: string): Resposta {
  const quer = aceitaServir(jogo.campanha, com, eu, estiloDe(jogo.ia, com));
  return { aceita: quer, fala: quer ? SIM_LIGA : NAO_LIGA };
}

/**
 * O que viraria esta balança — **a recusa como PEDIDO, e não como veredito.**
 *
 * Na ordem do que o jogador consegue fazer agora: ouro que o cofre tem; ouro que o cofre não
 * tem; guarnecer a terra que ele cobiça; entrar na guerra que ele já tem; ou nada — e "nada"
 * é a resposta honesta para quem te odeia, porque o ouro rende no máximo `ouro.maximo` pontos.
 */
function pedidoQueFecha(
  jogo: Jogo,
  lados: Lados,
  balanca: Balanca,
  cobicadas: readonly string[],
  acordo: 'pacto' | 'alianca',
): string {
  if (aceita(balanca)) return '';
  const { campanha } = jogo;
  const estilo = estiloDe(jogo.ia, lados.ele);
  const ajustes = jogo.ajustes.jogo;
  const cofre = campanha.tesouroDe(lados.voce);
  const noCofre = ouroQueFecha(campanha, lados, balanca.saldo, estilo, ajustes, cofre);
  if (noCofre !== null) return `faltam ${milhar(noCofre)} de ouro`;
  // Até sessenta turnos da renda dele: além disso não é preço, é o teto do ouro.
  const semCofre = ouroQueFecha(
    campanha,
    lados,
    balanca.saldo,
    estilo,
    ajustes,
    Math.max(cofre, campanha.rendaDe(lados.ele) * 60),
  );
  if (semCofre !== null) {
    return `faltam ${milhar(semCofre)} de ouro`;
  }
  if (cobicadas.length > 0) {
    const nomes = cobicadas.map((id) => campanha.nomeDe(id));
    return `cobiça ${nomes.join(', ')}`;
  }
  if (acordo === 'alianca') {
    const guerraDele = campanha
      .guerrasDe(lados.ele)
      .find((id) => id !== lados.voce && !campanha.emGuerra(lados.voce, id));
    if (guerraDele !== undefined) {
      return `quer você na guerra contra ${campanha.poder(guerraDele).nome}`;
    }
  }
  return SEM_SAIDA;
}

/** A frase que diz que nada fecha hoje — a mesa a reconhece para dizer "fechado". */
export function semSaida(pedido: string): boolean {
  return pedido === SEM_SAIDA;
}

/** Ele abriria comércio? A mesma pergunta que a IA faz: *eu pretendo atacá-lo?* */
export function respostaAoComercio(jogo: Jogo, com: string, eu: string): Resposta {
  const estilo = estiloDe(jogo.ia, com);
  const quer = aceitaComercio(jogo.campanha, com, eu, estilo);
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
  const cobicadasIds = oportunidadesDe(campanha, id)
    .filter((o) => o.dono === eu)
    .filter((alvo) =>
      valeAPena(campanha, id, alvo, estilo, jogo.ajustes.jogo.combate, campanha.emGuerra(eu, id)),
    )
    .map((o) => o.provincia)
    .sort();
  const cobicadas = cobicadasIds.map((provincia) => campanha.nomeDe(provincia));

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
  const curto = prazoMaisCurto(jogo.ajustes.jogo.diplomacia.pacto.prazos);
  const querPacto =
    campanha.podeFirmarPacto(id, curto, eu).pode &&
    respostaAoPacto(jogo, id, eu, curto, cobicadasIds).aceita;
  const querComercio =
    campanha.podeAcordarComercio(id, eu).pode && respostaAoComercio(jogo, id, eu).aceita;
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
 * ⚠️ **E é a mesma linha que entra em toda balança como o TEMPERAMENTO dele**: o mesmo
 * `relacaoParaDeclarar` decide se ele te ataca (`guerraEscolhida`) e é a primeira parcela
 * contra qualquer acordo (`balanca.ts › temperamento`). Um traço na régua explica de uma vez
 * "abaixo daqui ele começa a te olhar, e acima daqui a confiança passa a contar a favor".
 */
export function linhaDeAtaqueDe(jogo: Jogo, id: string): number {
  return estiloDe(jogo.ia, id).relacaoParaDeclarar;
}

