/**
 * O que é um exército: gente em armas, de onde ela veio, **com que arma e quão bem treinada**.
 *
 * ⚠️ **A hoste tem IDENTIDADE PRÓPRIA, e não é "o exército da província X".** Foi assim
 * antes, e a província como chave impedia estruturalmente duas hostes no mesmo lugar — o
 * que o cerco exige (sitiante do lado de fora, guarnição trancada dentro) e o que
 * diplomacia (passagem militar), frota com tropa embarcada e general com nome vão exigir
 * depois. Com id, "uma hoste por poder por província" deixa de ser uma restrição da
 * estrutura e passa a ser POLÍTICA — que é o lugar certo dela, porque assim dá pra abrir
 * exceção quando uma regra pedir.
 *
 * ⚠️ **A força é DERIVADA dos contingentes, nunca guardada ao lado deles.** Guardar um total
 * junto do detalhe é convidar os dois a discordarem: bastaria um caminho de código somar
 * num e esquecer o outro. Somar meia dúzia de números a cada leitura é de graça.
 *
 * ## Por que uma LISTA de contingentes, e não um mapa por província
 *
 * A hoste guardava `Record<província, homens>` — um número por terra natal. Não cabe mais:
 * dois grupos da mesma terra podem ser coisas diferentes. Trezentos hoplitas levantados em
 * Atenas depois do Quartel não são os mesmos trezentos levantados antes dele, nem os mesmos
 * trezentos leves. **Terra, arma e qualidade juntas é que identificam um contingente**, e as
 * três precisam sobreviver à marcha, ao destacamento e à baixa.
 */

/**
 * As quatro armas.
 *
 * ⚠️ **`leve` é a linha de base do jogo inteiro, e vale exatamente o que vale um miliciano.**
 * Toda província levanta leves sem construir nada; as outras três são o que está ACIMA do
 * lavrador com uma lança, e cada uma exige um prédio naquela terra.
 */
export type Arma = 'leve' | 'hoplita' | 'arqueiro' | 'cavalaria';

/** Todas as armas, em ordem fixa. Determinismo: nada aqui pode depender de ordem de chave. */
export const ARMAS: readonly Arma[] = ['leve', 'hoplita', 'arqueiro', 'cavalaria'];

/** Um grupo de homens da mesma terra, com a mesma arma e o mesmo treino. */
export interface Contingente {
  /** A terra natal. É pra cá que eles voltam ao dispensar, desertar ou dispersar. */
  terra: string;
  arma: Arma;
  /**
   * Multiplicador de treino, **carimbado no recrutamento**.
   *
   * ⚠️ Carimbado e não consultado: se a qualidade fosse lida da província na hora da
   * batalha, perder a terra transformaria veteranos em recrutas no meio da campanha. Tomar o
   * Quartel do inimigo não piora o exército que ele tem — piora os que virão.
   */
  qualidade: number;
  homens: number;
}

/** Um exército em pé em algum lugar do mundo. */
export interface Exercito {
  /**
   * Identidade própria, estável enquanto a hoste existir.
   *
   * Vem de um contador no estado, nunca de sorteio: a resolução da rodada precisa ser
   * determinística, e id aleatório faria a mesma partida divergir de si mesma.
   */
  id: string;
  /** Onde ela está agora. Muda quando ela marcha. */
  posicao: string;
  /**
   * De quem ele é.
   *
   * Guardado no exército e não deduzido do dono da província: assim que a tropa puser o
   * pé em terra inimiga, as duas coisas deixam de coincidir — e é exatamente aí que
   * saber de quem é o exército passa a importar.
   */
  poder: string;
  /**
   * Os grupos que o formam. A soma dos homens é a força.
   *
   * Em ordem estável: terra, depois arma, depois qualidade. Sem ordem fixa, dois caminhos de
   * código que somam a mesma hoste em ordens diferentes dariam arredondamentos diferentes.
   */
  contingentes: Contingente[];
}

/** Quantos homens este exército tem ao todo. */
export function forcaDe(exercito: Exercito | undefined): number {
  if (!exercito) return 0;
  let total = 0;
  for (const c of exercito.contingentes) total += c.homens;
  return total;
}

/** Um exército vazio, pronto pra receber a primeira leva. */
export function exercitoVazio(id: string, poder: string, posicao: string): Exercito {
  return { id, poder, posicao, contingentes: [] };
}

/**
 * Junta uma leva ao exército.
 *
 * Contingentes idênticos — mesma terra, mesma arma, mesmo treino — se fundem: sem isso a
 * lista cresceria uma entrada por recrutamento e a hoste viraria um diário.
 */
export function somarLeva(
  exercito: Exercito,
  terra: string,
  homens: number,
  arma: Arma = 'leve',
  qualidade = 1,
): void {
  if (homens <= 0) return;
  const igual = exercito.contingentes.find(
    (c) => c.terra === terra && c.arma === arma && c.qualidade === qualidade,
  );
  if (igual) igual.homens += homens;
  else exercito.contingentes.push({ terra, arma, qualidade, homens });
  ordenar(exercito);
}

/** Quantos homens desta hoste nasceram em cada província. */
export function porTerra(exercito: Exercito): Record<string, number> {
  const conta: Record<string, number> = {};
  for (const c of exercito.contingentes) conta[c.terra] = (conta[c.terra] ?? 0) + c.homens;
  return conta;
}

/** O mesmo, para uma lista solta de contingentes — o que `retirar` devolve. */
export function terrasDe(contingentes: readonly Contingente[]): Record<string, number> {
  const conta: Record<string, number> = {};
  for (const c of contingentes) conta[c.terra] = (conta[c.terra] ?? 0) + c.homens;
  return conta;
}

/**
 * Tira `homens` do exército e diz exatamente quem saiu.
 *
 * Tira proporcionalmente de CADA contingente, e não do primeiro da lista: perder metade de
 * um exército misto tem que custar metade a cada cidade que o formou e a cada arma que ele
 * traz, senão a ordem em que as levas entraram viraria uma regra escondida — e um
 * destacamento levaria a cavalaria inteira por acidente de índice.
 *
 * O ajuste do resto vai no contingente que mais tem, pra que a soma feche exata: sobra de
 * arredondamento aqui viraria homem sumido ou homem inventado.
 */
export function retirar(exercito: Exercito, homens: number): Contingente[] {
  const total = forcaDe(exercito);
  const alvo = Math.min(homens, total);
  if (alvo <= 0) return [];

  const saida = exercito.contingentes.map((c) => ({
    ...c,
    homens: Math.floor((c.homens * alvo) / total),
  }));
  let resto = alvo - saida.reduce((s, c) => s + c.homens, 0);
  while (resto > 0) {
    const i = maiorSobra(exercito.contingentes, saida);
    if (i < 0) break;
    saida[i]!.homens += 1;
    resto -= 1;
  }

  for (const [i, tirado] of saida.entries()) {
    const dele = exercito.contingentes[i];
    if (dele) dele.homens -= tirado.homens;
  }
  exercito.contingentes = exercito.contingentes.filter((c) => c.homens > 0);
  return saida.filter((c) => c.homens > 0);
}

/** O índice do contingente com mais gente ainda não retirada. Desempata pela ordem fixa. */
function maiorSobra(atuais: readonly Contingente[], saida: readonly Contingente[]): number {
  let escolhido = -1;
  let melhor = 0;
  for (const [i, c] of atuais.entries()) {
    const sobra = c.homens - (saida[i]?.homens ?? 0);
    if (sobra > melhor) {
      melhor = sobra;
      escolhido = i;
    }
  }
  return escolhido;
}

/** Ordem estável: terra, arma, qualidade. Determinismo antes de qualquer soma. */
function ordenar(exercito: Exercito): void {
  exercito.contingentes.sort(
    (a, b) =>
      a.terra.localeCompare(b.terra) ||
      ARMAS.indexOf(a.arma) - ARMAS.indexOf(b.arma) ||
      a.qualidade - b.qualidade,
  );
}
