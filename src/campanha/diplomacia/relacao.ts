/**
 * A RELAÇÃO entre dois poderes, de −100 a +100 — **e ela é o humor do povo, outra vez.**
 *
 * ⚠️ **A mecânica é deliberadamente a MESMA da felicidade, e isso é o desenho, não preguiça.**
 * O jogador já aprendeu uma vez que existe um VALOR caminhando em direção a um ALVO, e que o
 * alvo é uma soma de parcelas com nome que ele pode abrir e ler: `−12 domínio estrangeiro`,
 * `+12 guarnição`, `−15 sitiada`. Pedir que ele aprenda uma segunda máquina para dizer a mesma
 * coisa sobre reinos seria inventar vocabulário novo para uma ideia que ele já tem.
 *
 * Três consequências caem de graça dessa escolha:
 *
 * 1. **Nada salta.** Opinião anda alguns pontos por turno; ninguém vira aliado de um dia para
 *    o outro nem odeia você porque uma fronteira mudou de lugar.
 * 2. **O passado se apaga sozinho.** O valor caminha PARA o alvo — então o efeito de uma
 *    conquista antiga vai sumindo enquanto os fatos não a renovam. Não existe rancor eterno
 *    guardado numa tabela; existe uma situação atual e a distância até ela.
 * 3. **O choque cabe.** Assim como a conquista derruba o humor no dia em que a cidade cai, um
 *    ato diplomático empurra a opinião na hora — presente para cima, tomar a terra dele para
 *    baixo — e a partir dali ela recomeça a caminhar. É por aqui que TODA ação diplomática
 *    futura entra, sem regra nova nenhuma.
 *
 * ## O que o alvo NÃO tem
 *
 * ⚠️ **Nenhuma parcela existe que o jogador não consiga ver no mapa.** Fronteira comum, guerra
 * em curso, trégua, e a terra dele que está na sua mão — as quatro são visíveis, e é por isso
 * que a opinião nunca vai parecer arbitrária. No dia em que houver pacto, comércio e aliança,
 * cada um entra como mais uma linha nesta mesma lista.
 *
 * ⚠️ **E ela só existe entre os poderes COM FICHA**, decisão de Henrique. Opinião de um poder
 * que não arrecada, não recruta e não decide nada é um número que não vira decisão nenhuma —
 * seriam 9.591 pares em que nada acontece.
 */

import type { Ajustes } from '@/dados/esquema';

type AjustesDiplomacia = Ajustes['jogo']['diplomacia'];

/** O que decide a opinião de um poder sobre outro. Tudo visível no mapa. */
export interface SituacaoDaRelacao {
  emGuerra: boolean;
  /** Turnos de trégua ainda em pé. Guerra recente ainda dói. */
  tregoa: number;
  /** Províncias DELE que encostam nas minhas. Vizinho é atrito. */
  fronteira: number;
  /**
   * Terras que eu tenho e que eram DELE em 700 a.C.
   *
   * ⚠️ É a memória da conquista sem guardar memória nenhuma: enquanto a bandeira estiver na
   * minha mão, ele lembra. Devolver a terra apaga a mágoa sozinho, e é assim que uma paz com
   * cessão de província vai poder existir sem regra nova.
   */
  terrasTomadas: number;
}

/** Uma parcela do alvo, com nome — a mesma legibilidade da conta da felicidade. */
export interface ParcelaDaRelacao {
  rotulo: string;
  pontos: number;
}

/**
 * A conta do alvo, parcela a parcela.
 *
 * Só entram as que valem alguma coisa: listar "fronteira 0" entre dois reinos que não se
 * tocam seria ruído. A base entra sempre, porque é dela que as outras somam e subtraem — e ela
 * é ZERO de propósito: dois reinos que nunca se esbarraram não se amam nem se odeiam.
 */
export function parcelasDaRelacao(
  situacao: SituacaoDaRelacao,
  ajustes: AjustesDiplomacia,
): readonly ParcelaDaRelacao[] {
  const alvo = ajustes.alvo;
  const parcelas: ParcelaDaRelacao[] = [{ rotulo: 'indiferença', pontos: alvo.base }];

  if (situacao.emGuerra) parcelas.push({ rotulo: 'em guerra', pontos: alvo.guerra });
  else if (situacao.tregoa > 0) {
    parcelas.push({ rotulo: 'guerra recente', pontos: alvo.tregoa });
  }

  if (situacao.fronteira > 0) {
    // Com teto: o vigésimo quilômetro de divisa não incomoda mais que o primeiro, e sem o
    // teto um império grande odiaria automaticamente todo vizinho grande.
    const pontos = Math.max(
      alvo.fronteiraMaxima,
      situacao.fronteira * alvo.porProvinciaDeFronteira,
    );
    parcelas.push({ rotulo: `fronteira comum (${situacao.fronteira})`, pontos });
  }

  if (situacao.terrasTomadas > 0) {
    const pontos = Math.max(
      alvo.terraTomadaMaxima,
      situacao.terrasTomadas * alvo.porTerraTomada,
    );
    parcelas.push({ rotulo: `terra dele na sua mão (${situacao.terrasTomadas})`, pontos });
  }

  return parcelas;
}

/** Para onde a opinião caminha, de −100 a 100: a soma das parcelas, contida. */
export function alvoDaRelacao(
  situacao: SituacaoDaRelacao,
  ajustes: AjustesDiplomacia,
): number {
  const soma = parcelasDaRelacao(situacao, ajustes).reduce((t, p) => t + p.pontos, 0);
  return conter(soma);
}

/** Um passo da opinião em direção ao alvo. Gradual por regra: nunca passa do alvo. */
export function aproximarRelacao(atual: number, alvo: number, passo: number): number {
  if (atual < alvo) return Math.min(alvo, atual + passo);
  if (atual > alvo) return Math.max(alvo, atual - passo);
  return atual;
}

/**
 * O choque de um ato: a opinião salta AGORA e volta a caminhar a partir dali.
 *
 * ⚠️ É por esta porta que toda ação diplomática entra — presente, traição de pacto, aliança
 * honrada, terra devolvida. A regra é uma só, e nova ação nenhuma precisa de mecânica nova:
 * ela empurra o número e deixa o tempo fazer o resto.
 */
export function comChoque(atual: number, pontos: number): number {
  return conter(atual + pontos);
}

function conter(valor: number): number {
  return Math.max(-100, Math.min(100, Math.round(valor)));
}
