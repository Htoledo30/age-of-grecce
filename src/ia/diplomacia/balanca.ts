/**
 * A BALANÇA DE INTERESSE: **como um reino decide se um acordo lhe serve.**
 *
 * Henrique, 03/09/2026: *"o que você poderia melhorar no nosso sistema de diplomacia para
 * parecer mais negociação do que um 'sou amigo? então aceito'"* — e, sobre a resposta: *"quero
 * igual os jogos de estratégia fazem, só que melhor, mais vivo, posso influenciar dependendo do
 * que ofertar, dependendo se me odeiam muito seja impossível conseguir alguma coisa, não quero
 * um sistema de criança 'se der verde compra, vermelho erro'"*.
 *
 * ⚠️ **Antes disto, cinco dos sete acordos eram um limiar de UM número: a opinião.** Pacto,
 * aliança, liga, comércio e passagem perguntavam "a opinião chega a X?", e a "vontade" da IA
 * era a MESMA opinião contra outro corte. O código dizia, três vezes, *"a opinião É a
 * aceitação"*. Não entrava o que o reino ganhava nem o que perdia — e o presente virava opinião,
 * de modo que a mesa cotava, literalmente, o preço da amizade.
 *
 * ## O que a balança faz
 *
 * Cada lado SOMA parcelas com sinal e aceita quando o saldo não é negativo. A opinião é UMA
 * parcela — a confiança — e não o portão. As outras saem do que o jogo já sabe medir: o
 * exército dele e o seu, as guerras que cada um tem nas costas, as terras suas que ele
 * cobiça (a mesma leitura de `intencaoDe`), o prazo pedido, e o ouro que vier junto.
 *
 * É o modelo que o TRIBUTO e a PAZ COMPRADA já tinham — pergunta diferente de cada lado, e
 * ouro comparado com o que ele ainda ia tirar de você — estendido ao resto da mesa.
 *
 * ## O que ela garante por construção
 *
 * - **Ódio é impossível, e não "caro".** O ouro rende no máximo `ouro.maximo` pontos (a mesma
 *   curva do presente, que satura). Quem está a −60 não se compra com cofre nenhum: para
 *   virar essa balança é preciso mudar os FATOS — guarnecer a terra cobiçada, ganhar um
 *   inimigo em comum, esperar a opinião andar.
 * - **O forte não ata as próprias mãos de graça.** A cobiça pesa exatamente o que `valeAPena`
 *   diz que ele tomaria de você: um vizinho que pode tomar Maratona recusa o pacto mesmo
 *   gostando de você, a não ser que a terra deixe de valer a marcha. É a proteção contra o
 *   modo de falha medido quando o pacto era assinado sem o forte querer: 46 conquistas e 12
 *   poderes eliminados, contra 22 e 6.
 * - **A resposta é a mesma na mesa e na jogada da IA.** `vontade-do-vizinho.ts` pergunta a
 *   estas funções antes do clique; `ligar-acoes.ts` pergunta às mesmas no clique; `pactos.ts`
 *   e `aliancas.ts` perguntam quando dois computadores negociam. Não existe segunda pergunta.
 * - **Determinística.** Sem dado: a surpresa vem do mundo mudar entre um turno e outro, e
 *   `npm run partida` continua comparável sem repetição.
 *
 * ## Onde mora cada coisa
 *
 * Este arquivo é só o VOCABULÁRIO — o tipo, a soma e as parcelas que mais de um acordo usa.
 * Cada acordo monta a própria balança no arquivo que já é dele: `balancaDoPacto` em
 * `pactos.ts`, `balancaDaAlianca` em `aliancas.ts`. Os pesos vivem em `dados/ajustes.json`
 * (`diplomacia.balanca`) e os GOSTOS de cada temperamento em `dados/ia.json` (`gostos`): o
 * guerreiro pesa força, o mercador pesa renda, o cauteloso pesa segurança.
 */

import type { Campanha } from '@/campanha/campanha';
import { pontosDoPresente } from '@/campanha/diplomacia/relacao';
import type { Ajustes, EstiloDeIa } from '@/dados/esquema';
import { valeAPena } from '../guerra/marchar';
import { estaAmeacado, forcaTotalDe } from '../percepcao/ameaca';
import { oportunidadesDe } from '../percepcao/oportunidade';

type AjustesDoJogo = Ajustes['jogo'];

/** Uma razão com peso: o que a mesa mostra, linha a linha. */
export interface ParcelaDaBalanca {
  rotulo: string;
  pontos: number;
}

/** O veredito e a conta aberta que o produziu. */
export interface Balanca {
  saldo: number;
  parcelas: readonly ParcelaDaBalanca[];
}

/** Quem DECIDE (`ele`) e quem PROPÕE (`voce`). A balança é sempre a de quem decide. */
export interface Lados {
  ele: string;
  voce: string;
}

/** O que vem junto da proposta e a balança não lê do mundo. */
export interface ExtrasDaBalanca {
  /** Ouro oferecido junto da assinatura. */
  ouro?: number;
  /**
   * As províncias do proponente que ele cobiça, já lidas.
   *
   * ⚠️ `cobicadasPor` roda uma previsão de batalha por província (`valeAPena`), e a mesa
   * pergunta a balança de três prazos por acordo. Quem já leu passa a lista e ela não é relida.
   */
  cobicadas?: readonly string[];
}

/** Soma. Parcela de zero não entra: ela não decide nada e só ocuparia uma linha na mesa. */
export function pesar(parcelas: readonly ParcelaDaBalanca[]): Balanca {
  const vivas = parcelas
    .map((p) => ({ rotulo: p.rotulo, pontos: Math.round(p.pontos) }))
    .filter((p) => p.pontos !== 0);
  return { saldo: vivas.reduce((soma, p) => soma + p.pontos, 0), parcelas: vivas };
}

/** Ele aceita? Saldo zero é sim: indiferença não é recusa. */
export function aceita(balanca: Balanca): boolean {
  return balanca.saldo >= 0;
}

/** A opinião dele sobre você, pesada pelo quanto o temperamento dele liga para confiança. */
export function confianca(
  campanha: Campanha,
  lados: Lados,
  estilo: EstiloDeIa,
): ParcelaDaBalanca {
  return {
    rotulo: 'confiança',
    pontos: campanha.relacaoEntre(lados.ele, lados.voce) * estilo.gostos.confianca,
  };
}

/**
 * O temperamento: **o mesmo número que decide a guerra, pelo avesso.**
 *
 * `relacaoParaDeclarar` é a opinião até a qual ele ainda considera atacar alguém. Um guerreiro
 * (16) começa toda balança dezesseis pontos abaixo de zero: ele precisa de razão para não
 * atacar. Um cauteloso (−2) começa dois acima. É a parcela que faz dois vizinhos com a mesma
 * opinião responderem coisas diferentes.
 */
export function temperamento(estilo: EstiloDeIa): ParcelaDaBalanca {
  return { rotulo: 'temperamento', pontos: -estilo.relacaoParaDeclarar };
}

/**
 * O prazo: quanto mais longo, mais custa amarrar as mãos. O prazo mais curto da escada é de
 * graça — é a partir dele que cada turno a mais cobra.
 */
export function prazo(turnos: number, maisCurto: number, ajustes: AjustesDoJogo): ParcelaDaBalanca {
  const custo = ajustes.diplomacia.balanca.prazo.custoPorTurno;
  return { rotulo: `prazo de ${turnos} turnos`, pontos: -custo * Math.max(0, turnos - maisCurto) };
}

/**
 * O medo: **você é maior do que ele, em terra ou em armas.**
 *
 * Henrique, sobre o pacto: *"olha na vida real quantos países se odeiam e fazem pactos de não
 * agressão"*. Não-agressão nunca foi confiança — é medo e conveniência. Quem é claramente menor
 * assina para não ser o próximo. Conta só quando VOCÊ é o maior: o medo é dele, não seu.
 */
export function medo(
  campanha: Campanha,
  lados: Lados,
  estilo: EstiloDeIa,
  ajustes: AjustesDoJogo,
): ParcelaDaBalanca {
  const d = ajustes.diplomacia.balanca.medo;
  const terras =
    campanha.provinciasDe(lados.voce).length - campanha.provinciasDe(lados.ele).length;
  const porTerra =
    terras >= d.limiar ? Math.min(d.provinciasMaximo, (terras - d.limiar + 1) * d.porProvincia) : 0;
  const dele = forcaTotalDe(campanha, lados.ele);
  const seu = forcaTotalDe(campanha, lados.voce);
  // Quem não tem exército nenhum vê qualquer lança como o teto do medo.
  const vezesAMais = dele > 0 ? seu / dele - 1 : seu > 0 ? Number.POSITIVE_INFINITY : 0;
  const porArmas = vezesAMais > 0 ? Math.min(d.exercitoMaximo, vezesAMais * d.porVezDeExercito) : 0;
  return { rotulo: 'teme você', pontos: (porTerra + porArmas) * estilo.gostos.forca };
}

/** Mãos ocupadas: ele já tem guerra em outro lugar, e ninguém quer duas. */
export function maosOcupadas(
  campanha: Campanha,
  lados: Lados,
  estilo: EstiloDeIa,
  ajustes: AjustesDoJogo,
): ParcelaDaBalanca {
  const d = ajustes.diplomacia.balanca.maosOcupadas;
  const guerras = campanha.guerrasDe(lados.ele).filter((id) => id !== lados.voce).length;
  return {
    rotulo: guerras === 1 ? 'já tem uma guerra' : `já tem ${guerras} guerras`,
    pontos: Math.min(d.maximo, guerras * d.porGuerra) * estilo.gostos.seguranca,
  };
}

/**
 * As províncias SUAS que ele considera que valem a marcha — a mesma lista que a IA tem na mão
 * quando escolhe para onde mandar a hoste, e a mesma que a mesa mostra em "o que ele quer".
 */
export function cobicadasPor(
  campanha: Campanha,
  lados: Lados,
  estilo: EstiloDeIa,
  ajustes: AjustesDoJogo,
): readonly string[] {
  return oportunidadesDe(campanha, lados.ele)
    .filter((o) => o.dono === lados.voce)
    .filter((alvo) => valeAPena(campanha, lados.ele, alvo, estilo, ajustes.combate))
    .map((o) => o.provincia)
    .sort();
}

/**
 * A cobiça: **ele pretende tomar terra sua, e um acordo o impediria.**
 *
 * ⚠️ É a parcela que impede o fraco de amarrar o forte e o rico de comprar o mapa: cada
 * província que vale a marcha pesa `porProvincia`, e três delas já passam do que o ouro consegue
 * cobrir. A saída não é pagar mais — é guarnecer a terra até ela deixar de valer a marcha.
 */
export function cobica(
  campanha: Campanha,
  lados: Lados,
  estilo: EstiloDeIa,
  ajustes: AjustesDoJogo,
  cobicadas: readonly string[] = cobicadasPor(campanha, lados, estilo, ajustes),
): ParcelaDaBalanca {
  const d = ajustes.diplomacia.balanca.cobica;
  const primeira = cobicadas[0];
  const rotulo =
    primeira !== undefined && cobicadas.length === 1
      ? `cobiça ${campanha.nomeDe(primeira)}`
      : `cobiça ${cobicadas.length} terras suas`;
  return { rotulo, pontos: -Math.min(d.maximo, cobicadas.length * d.porProvincia) };
}

/**
 * O ouro oferecido junto, em pontos — **pela curva do presente, e com o mesmo teto.**
 *
 * Medido na renda DELE, como o presente: quinhentas moedas são fortuna para Plateia e troco
 * para Argos. O gosto do temperamento muda o preço (o mercador sente mais o ouro), mas não o
 * teto: satura DEPOIS do gosto, senão o mercador venderia o mapa.
 */
export function ouro(
  campanha: Campanha,
  lados: Lados,
  quantia: number,
  estilo: EstiloDeIa,
  ajustes: AjustesDoJogo,
): ParcelaDaBalanca {
  if (quantia <= 0) return { rotulo: 'ouro oferecido', pontos: 0 };
  const pontos = pontosDoPresente(quantia, campanha.rendaDe(lados.ele), ajustes.diplomacia);
  return {
    rotulo: `${quantia.toLocaleString('pt-BR')} de ouro`,
    pontos: Math.min(ajustes.diplomacia.balanca.ouro.maximo, pontos * estilo.gostos.renda),
  };
}

/** O inimigo em comum: os dois já sangram contra o mesmo reino. É a aliança de conveniência. */
export function inimigoEmComum(
  campanha: Campanha,
  lados: Lados,
  ajustes: AjustesDoJogo,
): ParcelaDaBalanca {
  const d = ajustes.diplomacia.balanca.alianca;
  const dele = new Set(campanha.guerrasDe(lados.ele));
  const comuns = campanha.guerrasDe(lados.voce).filter((id) => id !== lados.ele && dele.has(id));
  return {
    rotulo: comuns.length === 1 ? 'inimigo em comum' : `${comuns.length} inimigos em comum`,
    pontos: Math.min(d.inimigoComumMaximo, comuns.length * d.porInimigoComum),
  };
}

/** A proteção: ele está ameaçado e você é mais forte. É a aliança do fraco. */
export function protecao(
  campanha: Campanha,
  lados: Lados,
  estilo: EstiloDeIa,
  ajustes: AjustesDoJogo,
): ParcelaDaBalanca {
  const vale =
    estaAmeacado(campanha, lados.ele) &&
    forcaTotalDe(campanha, lados.voce) > forcaTotalDe(campanha, lados.ele);
  return {
    rotulo: 'precisa de proteção',
    pontos: vale ? ajustes.diplomacia.balanca.alianca.protecao * estilo.gostos.forca : 0,
  };
}

/**
 * O patrocínio: **você está ameaçado e ele é mais forte — ele ganha um protegido.**
 *
 * ⚠️ É a outra metade da aliança do fraco, e sem ela o forte nunca a assinava. A razão da
 * aliança é do PAR: o pequeno ameaçado tem motivo para pedir, e o grande tem motivo para
 * aceitar — um vizinho que lhe deve a sobrevivência é fronteira que não precisa guarnecer.
 * Medido sem esta parcela: as alianças caíram pela metade em cem turnos, todas do lado do forte.
 */
export function patrocinio(
  campanha: Campanha,
  lados: Lados,
  estilo: EstiloDeIa,
  ajustes: AjustesDoJogo,
): ParcelaDaBalanca {
  const vale =
    estaAmeacado(campanha, lados.voce) &&
    forcaTotalDe(campanha, lados.ele) > forcaTotalDe(campanha, lados.voce);
  return {
    rotulo: 'ganha um protegido',
    pontos: vale ? ajustes.diplomacia.balanca.alianca.patrocinio * estilo.gostos.forca : 0,
  };
}

/** As SUAS guerras, que ele herdaria. Fora as que já são dele também. */
export function suasGuerras(
  campanha: Campanha,
  lados: Lados,
  estilo: EstiloDeIa,
  ajustes: AjustesDoJogo,
): ParcelaDaBalanca {
  const d = ajustes.diplomacia.balanca.alianca;
  const dele = new Set(campanha.guerrasDe(lados.ele));
  const suas = campanha.guerrasDe(lados.voce).filter((id) => id !== lados.ele && !dele.has(id));
  return {
    rotulo: suas.length === 1 ? 'herdaria a sua guerra' : `herdaria as suas ${suas.length} guerras`,
    pontos: -suas.length * d.porGuerraSua * estilo.gostos.seguranca,
  };
}

/** A sua fraqueza: um aliado que não segura a própria terra é um peso, não uma ajuda. */
export function fraquezaSua(
  campanha: Campanha,
  lados: Lados,
  estilo: EstiloDeIa,
  ajustes: AjustesDoJogo,
): ParcelaDaBalanca {
  const d = ajustes.diplomacia.balanca.alianca;
  const fraco = forcaTotalDe(campanha, lados.voce) < forcaTotalDe(campanha, lados.ele) * d.fracoAbaixoDe;
  return { rotulo: 'você é fraco demais', pontos: fraco ? -d.fraquezaSua * estilo.gostos.forca : 0 };
}

/**
 * O menor ouro que zera esta balança, ou `null` quando ouro nenhum zera.
 *
 * ⚠️ **É o que transforma uma recusa em PEDIDO.** Procura de baixo para cima em degraus de
 * meio turno de renda dele — o objetivo é fechar, não impressionar. E devolve `null` cedo
 * quando nem o teto do ouro alcança: aí não é caro, é impossível, e a mesa diz outra coisa.
 */
export function ouroQueFecha(
  campanha: Campanha,
  lados: Lados,
  saldo: number,
  estilo: EstiloDeIa,
  ajustes: AjustesDoJogo,
  ateOnde: number,
): number | null {
  if (saldo >= 0) return 0;
  const teto = ajustes.diplomacia.balanca.ouro.maximo;
  if (saldo + teto < 0) return null;
  const passo = Math.max(50, Math.round(campanha.rendaDe(lados.ele) / 2));
  for (let quantia = passo; quantia <= ateOnde; quantia += passo) {
    if (saldo + ouro(campanha, lados, quantia, estilo, ajustes).pontos >= 0) return quantia;
  }
  return null;
}

/** O prazo mais curto de uma escada: é o que a balança dá de graça. */
export function prazoMaisCurto(prazos: readonly { turnos: number }[]): number {
  return Math.min(...prazos.map((p) => p.turnos));
}
