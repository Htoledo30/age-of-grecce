/**
 * A LIGA: **mandar num reino sem tomá-lo.**
 *
 * Pedido de Henrique, e o degrau que faltava. Até aqui havia dois estados possíveis para um
 * vizinho — independente ou conquistado —, e um caminho só entre eles: exército. A liga é o
 * terceiro estado, e é o que a Grécia de verdade tinha no lugar de império: a Liga do
 * Peloponeso e a Liga de Delos, em que o chefe manda e o membro **continua sendo ele mesmo**.
 *
 * ⚠️ **"Vassalagem" é a palavra do mesmo mecanismo em outro século.** Aqui não se usa porque é
 * feudal e medieval; o que o jogo mostra é *chefe* e *membro*, e é assim que se fala dela na
 * conversa com Henrique — ver a seção sobre perguntar em `AGENTS.md`.
 *
 * ## O que o membro mantém, e é quase tudo
 *
 * Governo, províncias, exército, tesouro e despensa. O chefe **não constrói** na terra dele,
 * **não define o imposto** dele e **não move** a hoste dele. Ele continua sendo tocado pela IA,
 * com o estilo dele, e no mapa continua com o nome e a bandeira dele.
 *
 * ## O que o chefe leva
 *
 * 1. **Tributo**, uma fatia da renda do membro, todo turno — e o nível é escolhido pelo chefe.
 *    ⚠️ **É o mesmo botão que o imposto de uma província**, de propósito: mais ouro agora, mais
 *    vontade de sair depois. Henrique já conhece essa forma.
 * 2. **As guerras**: o membro entra nas guerras do chefe como um aliado entra, no mesmo turno e
 *    sem perguntar. E o chefe entra nas do membro.
 * 3. **A paz entre os dois**: nenhum declara guerra ao outro enquanto a liga durar.
 *
 * ## O que segura o membro é UM número, e ele é a terceira vez que esta máquina aparece
 *
 * O **desejo de sair** anda em direção a um alvo feito de parcelas com nome, um passo por
 * turno — exatamente como o humor do povo e como a opinião entre reinos. Henrique já aprendeu
 * essa máquina duas vezes; esta é a terceira e não pede nada novo dele.
 *
 * ## E a ANEXAÇÃO só acontece com o SIM do membro
 *
 * ⚠️ **Esta regra nasceu de uma pergunta dele que derrubou o meu primeiro desenho.** Eu havia
 * proposto que o chefe pudesse anexar à força pagando reputação; ele perguntou *"e se eu fosse
 * Mégara nessa situação?"* — e a resposta era que o jogador perderia o reino por um botão que
 * outro apertou, sem batalha e sem reação. Inaceitável, e pior, seria regra diferente para o
 * jogador se eu abrisse exceção.
 *
 * Então: o chefe **pede**, e o membro responde. O membro da IA diz sim quando o desejo de sair
 * está no chão; o jogador recebe a proposta como recebe pacto e aliança, e **recusar não custa
 * nada**. Recusado, o chefe tem um caminho só — romper a liga, pagar a reputação com o mapa
 * inteiro, e invadir. Ninguém perde um reino por diplomacia neste jogo.
 */

import type { NucleoDaCampanha, Permissao } from '../nucleo';

/** Um membro e o que a liga dele guarda. A chave da tabela é o ID do MEMBRO. */
export interface VinculoDaLiga {
  /** Quem manda. Um membro tem um chefe só, e é a tabela que garante isso. */
  chefe: string;
  /** Turno em que ele entrou. É daqui que sai o costume. */
  desde: number;
  /** O nível de tributo que o chefe cobra dele. */
  tributo: string;
  /** De 0 a 100. Cheio, ele se revolta; no chão, ele aceita virar província. */
  desejoDeSair: number;
}

/** Uma parcela do alvo do desejo, com nome — a mesma legibilidade do humor e da opinião. */
export interface ParcelaDoDesejo {
  rotulo: string;
  pontos: number;
}

const TURNOS_DA_DECADA = 10;

/** A liga deste poder como MEMBRO, ou `undefined` se ele não serve a ninguém. */
export function ligaDe(nucleo: NucleoDaCampanha, membro: string): VinculoDaLiga | undefined {
  return nucleo.estado.ligas[membro];
}

/** Quem manda neste poder, ou `undefined`. */
export function chefeDe(nucleo: NucleoDaCampanha, membro: string): string | undefined {
  return nucleo.estado.ligas[membro]?.chefe;
}

/** Os membros deste chefe, em ordem de id. */
export function membrosDe(nucleo: NucleoDaCampanha, chefe: string): readonly string[] {
  return Object.keys(nucleo.estado.ligas)
    .filter((membro) => nucleo.estado.ligas[membro]?.chefe === chefe)
    .sort();
}

/**
 * Quem entra na guerra deste poder por causa da liga: o chefe dele e os membros dele.
 *
 * ⚠️ **Só um salto, como na aliança.** O membro do meu membro não é meu, e sem esta linha uma
 * liga de cinco viraria uma guerra de cinco por uma escaramuça na fronteira de um.
 */
export function ligadosDe(nucleo: NucleoDaCampanha, idPoder: string): readonly string[] {
  const chefe = chefeDe(nucleo, idPoder);
  return [...membrosDe(nucleo, idPoder), ...(chefe === undefined ? [] : [chefe])].sort();
}

/**
 * O alvo do desejo de sair, parcela a parcela.
 *
 * Só entram as que valem alguma coisa. A base entra sempre e é POSITIVA: ninguém serve a
 * ninguém por gosto, e a liga é uma troca — proteção por obediência. Todo o resto é o que
 * empurra para cima ou para baixo dessa desconfiança de partida.
 */
export function parcelasDoDesejo(
  nucleo: NucleoDaCampanha,
  membro: string,
  mesmoPovo: boolean,
  provinciasDoChefe: number,
  provinciasDoMembro: number,
  chefeEmGuerra: boolean,
): readonly ParcelaDoDesejo[] {
  const vinculo = ligaDe(nucleo, membro);
  if (vinculo === undefined) return [];
  const liga = nucleo.ajustes.diplomacia.liga;
  const parcelas: ParcelaDoDesejo[] = [{ rotulo: 'servir a alguém', pontos: liga.alvo.base }];

  const nivel = liga.niveisDeTributo[vinculo.tributo];
  if (nivel !== undefined && nivel.desejo !== 0) {
    parcelas.push({ rotulo: `tributo ${vinculo.tributo}`, pontos: nivel.desejo });
  }

  if (mesmoPovo) parcelas.push({ rotulo: 'mesma gente', pontos: liga.alvo.mesmoPovo });

  // ⚠️ **A sombra do chefe SEGURA o membro**, ao contrário da sombra do maior na opinião entre
  // reinos, que afasta. Não é contradição: lá o grande dá medo de quem o vê de fora; aqui o
  // membro já está dentro, e o mesmo medo é o que o faz pensar duas vezes antes de sair.
  const vantagem = provinciasDoChefe - provinciasDoMembro;
  if (vantagem > 0) {
    const pontos = Math.max(liga.alvo.sombraMaxima, vantagem * liga.alvo.porProvinciaDeVantagem);
    parcelas.push({ rotulo: `ele é maior (${vantagem})`, pontos });
  }

  const decadas = Math.floor((nucleo.estado.turno - vinculo.desde) / TURNOS_DA_DECADA);
  if (decadas > 0) {
    const pontos = Math.max(liga.alvo.costumeMaximo, decadas * liga.alvo.porDecadaNaLiga);
    parcelas.push({ rotulo: `${decadas} décadas de costume`, pontos });
  }

  // A guerra do chefe é a guerra do membro, e é a parte da conta que ele não escolheu.
  if (chefeEmGuerra) parcelas.push({ rotulo: 'a guerra dele', pontos: liga.alvo.chefeEmGuerra });

  return parcelas;
}

/** Onde o desejo quer chegar, de 0 a 100. */
export function alvoDoDesejo(parcelas: readonly ParcelaDoDesejo[]): number {
  const soma = parcelas.reduce((total, p) => total + p.pontos, 0);
  return Math.min(100, Math.max(0, soma));
}

/** Um passo em direção ao alvo. Nunca passa dele — a mesma regra do humor e da opinião. */
export function aproximarDesejo(atual: number, alvo: number, passo: number): number {
  if (atual < alvo) return Math.min(alvo, atual + passo);
  if (atual > alvo) return Math.max(alvo, atual - passo);
  return atual;
}

/** O que o membro paga por turno, dado o que ele arrecada. */
export function tributoDaLiga(
  nucleo: NucleoDaCampanha,
  membro: string,
  rendaBaseDoMembro: number,
): number {
  const vinculo = ligaDe(nucleo, membro);
  if (vinculo === undefined) return 0;
  const nivel = nucleo.ajustes.diplomacia.liga.niveisDeTributo[vinculo.tributo];
  if (nivel === undefined) return 0;
  return Math.max(0, Math.round(rendaBaseDoMembro * nivel.fracaoDaRenda));
}

/**
 * O que a liga soma ou tira do cofre deste poder por turno.
 *
 * ⚠️ **Entra na RENDA, como o tributo comum, e pelo mesmo motivo**: um poder que decide obra e
 * recrutamento pela renda gastaria dinheiro que já tem dono. Positivo no chefe, negativo no
 * membro, e a soma do mapa é sempre zero.
 *
 * ⚠️ **Recebe `rendaBase` de fora para a conta não se morder.** A fatia é da renda BASE do
 * membro — sem acordos e sem o que ele já move —, senão um chefe de três membros passaria a
 * cobrar mais de cada um só por cobrar dos outros.
 */
export function saldoDaLigaDe(
  nucleo: NucleoDaCampanha,
  idPoder: string,
  rendaBase: (id: string) => number,
): number {
  const ligas = nucleo.estado.ligas;
  let saldo = 0;
  // `for...in` e não `Object.entries`: isto roda dentro de `rendaDe`, a conta mais chamada do
  // jogo, e a tabela está vazia na esmagadora maioria das partidas. Ver `saldoDeTributosDe`.
  for (const membro in ligas) {
    const vinculo = ligas[membro];
    if (vinculo === undefined) continue;
    if (membro === idPoder) saldo -= tributoDaLiga(nucleo, membro, rendaBase(membro));
    else if (vinculo.chefe === idPoder) saldo += tributoDaLiga(nucleo, membro, rendaBase(membro));
  }
  return saldo;
}

/**
 * Este poder pode ser convidado para a liga daquele?
 *
 * ⚠️ **A opinião É a aceitação, como no pacto e na aliança** — mas aqui ela pede muito mais,
 * porque o que se assina é obediência. E há uma trava a mais que os outros acordos não têm:
 * **um membro não pode ter dois chefes, e um chefe não pode ser membro de ninguém.** Sem ela a
 * liga viraria uma corrente de suseranias, e a convocação de guerra andaria por ela.
 */
export function podeEntrarNaLiga(
  nucleo: NucleoDaCampanha,
  chefe: string,
  membro: string,
  emGuerra: boolean,
  vivo: boolean,
  opiniao: number,
): Permissao {
  if (chefe === membro) return { pode: false, motivo: 'não se lidera a si mesmo' };
  if (!vivo) return { pode: false, motivo: 'este poder não está mais no jogo' };
  if (emGuerra) return { pode: false, motivo: 'vocês estão em guerra' };
  if (ligaDe(nucleo, membro) !== undefined) {
    return { pode: false, motivo: 'ele já serve a alguém' };
  }
  if (ligaDe(nucleo, chefe) !== undefined) {
    return { pode: false, motivo: 'quem serve a alguém não lidera ninguém' };
  }
  if (membrosDe(nucleo, membro).length > 0) {
    return { pode: false, motivo: 'ele lidera a própria liga' };
  }
  const minima = nucleo.ajustes.diplomacia.liga.opiniaoMinima;
  if (opiniao < minima) {
    return { pode: false, motivo: `servir pede confiança: a opinião precisa chegar a ${minima}` };
  }
  return { pode: true };
}

/** Põe o membro na liga. Quem chama já checou `podeEntrarNaLiga`. */
export function entrarNaLiga(nucleo: NucleoDaCampanha, chefe: string, membro: string): void {
  nucleo.estado.ligas[membro] = {
    chefe,
    desde: nucleo.estado.turno,
    tributo: nucleo.ajustes.diplomacia.liga.tributoInicial,
    // Entra pela metade: nem satisfeito nem prestes a sair. O costume e o tributo decidem daí.
    desejoDeSair: nucleo.ajustes.diplomacia.liga.alvo.base,
  };
}

/** Tira o membro da liga. O preço, quando há, é cobrado por quem chama. */
export function apagarVinculo(nucleo: NucleoDaCampanha, membro: string): boolean {
  if (nucleo.estado.ligas[membro] === undefined) return false;
  delete nucleo.estado.ligas[membro];
  return true;
}

/** O chefe cobra mais ou menos. Devolve `false` se o nível não existe. */
export function mudarTributoDaLiga(
  nucleo: NucleoDaCampanha,
  membro: string,
  nivel: string,
): boolean {
  const vinculo = ligaDe(nucleo, membro);
  if (vinculo === undefined) return false;
  if (nucleo.ajustes.diplomacia.liga.niveisDeTributo[nivel] === undefined) return false;
  vinculo.tributo = nivel;
  return true;
}

/**
 * O membro está pronto para virar província — se o chefe pedir e ele disser sim.
 *
 * ⚠️ **Duas condições, e o TEMPO é a que faz a liga ser um degrau.** Sem ele, medido em 150
 * turnos, as 6 ligas formadas terminaram em 4 anexações e nenhum membro de pé: entrar e ser
 * engolido virou um passo só. Com ele, converter um membro é um investimento de décadas — que é
 * quanto a Liga de Delos levou para virar império.
 */
export function aceitaSerAnexado(nucleo: NucleoDaCampanha, membro: string): boolean {
  const vinculo = ligaDe(nucleo, membro);
  if (vinculo === undefined) return false;
  const liga = nucleo.ajustes.diplomacia.liga;
  if (nucleo.estado.turno - vinculo.desde < liga.turnosParaAnexar) return false;
  return vinculo.desejoDeSair <= liga.limiarDoSim;
}

/** O desejo encheu: ele sai e pega em armas. */
export function vaiSeRevoltar(nucleo: NucleoDaCampanha, membro: string): boolean {
  const vinculo = ligaDe(nucleo, membro);
  if (vinculo === undefined) return false;
  return vinculo.desejoDeSair >= nucleo.ajustes.diplomacia.liga.limiarDaRevolta;
}
