/**
 * A batalha: quem vence, quantos sobram **dos dois lados**, e o passo a passo do que houve.
 *
 * ⚠️ **Sem aleatoriedade, e não é preguiça.** A resolução da rodada precisa ser
 * determinística: a mesma rodada com as mesmas ordens tem que dar o mesmo resultado, senão
 * não há salvamento confiável nem teste de regressão. Quando entrar sorte, ela sai de uma
 * semente guardada no estado, nunca de `Math.random()`.
 *
 * ## As três partes de uma batalha
 *
 * **Choque**: as linhas se batem por até `rodadasDeChoque` rodadas, e cada rodada mata pouco.
 * **Quebra**: quem passa de `limiarDeQuebra` em baixas cede — e cede o CHÃO, que é o que se
 * disputa. **Perseguição**: um round só, muito letal, contra quem quebrou; é ele que separa
 * "empurrei o inimigo" de "destruí o inimigo", e é o round que a cavalaria multiplica.
 *
 * Entre a quebra e a perseguição existe a saída: quem recebeu ordem de recuar sai de campo
 * antes de ceder, paga uma fatia pequena, e **continua sendo um exército**.
 *
 * ⚠️ **Esta função não conhece hoplita nem arqueiro.** Cada lado chega com três números —
 * ataque e aguento por homem, e o multiplicador da caçada —, todos medidos em leves e todos
 * calculados por `composicao.ts`, que é quem lê as armas dos dois lados. A separação é o que
 * permite mexer no triângulo de counters sem reler o laço de rounds.
 *
 * ⚠️ **A lista de rounds vem SEMPRE**, inclusive nas batalhas que ninguém assiste. A IA joga a
 * lista fora e usa o resultado; o jogador vê a lista ser reproduzida. Assim não existe uma
 * fórmula para decidir e outra para animar, e a tela mostra exatamente a matemática que
 * decidiu.
 */

import { leves } from './composicao';
import type { ValorEmCampo } from './composicao';
import type { Ajustes } from '@/dados/esquema';

type AjustesDaBatalha = Ajustes['jogo']['combate']['batalha'];

/**
 * Um lado da batalha ao entrar nela: o que ele vale, mais a ordem que recebeu.
 *
 * ⚠️ **O que ele vale já vem pronto** — `ataque`, `aguento` e `perseguicao` saem de
 * `valorEmCampo`, que leu as armas dos dois lados. A batalha não conhece hoplita nem
 * arqueiro: ela recebe números e os aplica. É essa fronteira que deixa o triângulo de
 * counters mudar sem tocar no laço de rounds, e vice-versa.
 *
 * O `aguento` é também por onde a muralha entra, e ela entra **visível**: aparece round a
 * round na janela em vez de virar um multiplicador escondido. O número que a ficha mostra
 * tem que ser a força que luta.
 */
export interface LadoNaBatalha extends ValorEmCampo {
  /**
   * Em que fração de baixas este lado SAI DE CAMPO, ou `null` para lutar até quebrar.
   *
   * ⚠️ **Recuar não é quebrar, e é a diferença que dá sentido à decisão.** Quem quebra é
   * perseguido e perde a hoste — os homens voltam para casa, o exército acabou. Quem recua a
   * tempo paga uma fração pequena e fixa, **escapa da perseguição e continua sendo um
   * exército**. A pergunta "aguento mais um round ou saio agora?" só existe porque as duas
   * coisas têm preços diferentes.
   *
   * Quem preenche é quem chama: hoje ninguém preenche, e todo lado luta até quebrar. A janela
   * de batalha é que vai pôr o botão na mão do jogador, e a IA, uma heurística.
   */
  recuaAos: number | null;
}

/**
 * O que aconteceu num round. É isto que a janela reproduz.
 *
 * Sem `export` enquanto ninguém precisar do NOME: `ResultadoDaBatalha` já carrega a forma, e
 * o `codigo-morto` cobra tipo exportado que ninguém importa. A janela da fase 3 vai precisar
 * dele por nome, e aí ele sai daqui exportado.
 */
interface RoundDaBatalha {
  /** Homens do lado A ao FIM deste round. */
  a: number;
  /** Homens do lado B ao fim deste round. */
  b: number;
  /**
   * Em que parte da batalha este round aconteceu.
   *
   * `choque` mata pouco; `perseguicao` mata muito; `recuo` é a saída ordenada, que custa uma
   * fatia pequena e fixa. São botões separados em `ajustes.json` de propósito: é a diferença
   * entre eles que faz recuar antes de quebrar ser decisão em vez de covardia.
   */
  fase: 'choque' | 'perseguicao' | 'recuo';
}

/** O resultado completo de uma batalha. */
export interface ResultadoDaBatalha {
  /** `null` no aniquilamento mútuo: forças iguais não deixam ninguém em pé. */
  vencedor: 'a' | 'b' | null;
  /** Homens do lado A que continuam de pé. */
  sobreviventesA: number;
  /** Homens do lado B que continuam de pé. */
  sobreviventesB: number;
  /**
   * O passo a passo, sempre — inclusive quando ninguém vai assistir.
   *
   * Produzir a lista mesmo nas batalhas da IA é o que garante que a janela reproduza a
   * matemática em vez de ilustrar um resultado calculado por outra conta.
   */
  rounds: readonly RoundDaBatalha[];
  /**
   * Como a batalha terminou PARA O PERDEDOR.
   *
   * `quebrou`: a linha cedeu, veio a perseguição, e a hoste se desfaz — os sobreviventes
   * voltam para a terra natal. `recuou`: saiu de campo antes disso, pagou pouco, e **continua
   * sendo um exército**. Quem lê precisa saber qual dos dois foi: são consequências
   * diferentes no mapa, não só números diferentes.
   */
  desfecho: 'quebrou' | 'recuou';
}

/** Um lado só de leves comuns, lutando até quebrar — a milícia, e o teste que só quer massa. */
export function lado(homens: number): LadoNaBatalha {
  return { ...leves(homens), recuaAos: null };
}

/**
 * Resolve uma batalha: choque, quebra, perseguição.
 *
 * Determinística e pura. Os dois lados batem **ao mesmo tempo**, com a força que tinham no
 * começo da rodada — resolver "A bate, depois B bate com o que sobrou" faria a ordem dos
 * argumentos virar uma vantagem escondida.
 *
 * ⚠️ **Não existe empate.** `desempate` diz quem leva a batalha quando os dois cedem na mesma
 * rodada e sangraram a mesma fração — e quem chama passa o DEFENSOR, porque num jogo de
 * conquista quem ataca precisa vencer: parar o inimigo já é a vitória de quem segura o chão.
 * Sem isto, duas forças iguais ficavam as duas na província e o jogo não saía do lugar.
 */
export function resolverBatalha(
  a: LadoNaBatalha,
  b: LadoNaBatalha,
  ajustes: AjustesDaBatalha,
  desempate: 'a' | 'b',
): ResultadoDaBatalha {
  let vivosA = Math.max(0, Math.floor(a.homens));
  let vivosB = Math.max(0, Math.floor(b.homens));
  const rounds: RoundDaBatalha[] = [];

  // Lado vazio não é batalha: quem tem gente ocupa o lugar sem perder ninguém.
  if (vivosA <= 0 || vivosB <= 0) {
    rounds.push({ a: vivosA, b: vivosB, fase: 'choque' });
    return {
      vencedor: vivosA > 0 ? 'a' : vivosB <= 0 ? desempate : 'b',
      sobreviventesA: vivosA,
      sobreviventesB: vivosB,
      rounds,
      desfecho: 'quebrou',
    };
  }

  const inicioA = vivosA;
  const inicioB = vivosB;
  let quebrouA = false;
  let quebrouB = false;
  let recuou: 'a' | 'b' | null = null;

  for (let rodada = 0; rodada < ajustes.rodadasDeChoque; rodada++) {
    // ⚠️ Os dois danos saem dos valores do COMEÇO da rodada. `ataque` multiplica o que se
    // entrega e `aguento` divide o que se recebe — os dois já medidos em leves, que é a
    // régua do jogo inteiro. É por aqui que a muralha entra, e ela aparece round a round na
    // janela em vez de virar um multiplicador escondido.
    const perdeB = Math.ceil((vivosA * a.ataque * ajustes.letalidadeDoChoque) / b.aguento);
    const perdeA = Math.ceil((vivosB * b.ataque * ajustes.letalidadeDoChoque) / a.aguento);
    vivosA = Math.max(0, vivosA - perdeA);
    vivosB = Math.max(0, vivosB - perdeB);
    rounds.push({ a: vivosA, b: vivosB, fase: 'choque' });

    quebrouA = vivosA <= 0 || inicioA - vivosA >= inicioA * ajustes.limiarDeQuebra;
    quebrouB = vivosB <= 0 || inicioB - vivosB >= inicioB * ajustes.limiarDeQuebra;
    if (quebrouA || quebrouB) break;

    // ⚠️ **O recuo é olhado DEPOIS da quebra, e de propósito.** Quem já cedeu não recua mais:
    // a linha quebrou, o inimigo está em cima, e sair ordenado deixou de ser uma opção. É essa
    // ordem que faz o recuo ser uma decisão de HORA — sair cedo custa pouco, tarde demais não
    // custa nada porque não existe mais.
    if (a.recuaAos !== null && inicioA - vivosA >= inicioA * a.recuaAos) recuou = 'a';
    else if (b.recuaAos !== null && inicioB - vivosB >= inicioB * b.recuaAos) recuou = 'b';
    if (recuou) break;
  }

  // Saiu de campo a tempo: paga uma fatia pequena, escapa da perseguição, e a hoste continua
  // existindo. O outro lado fica com o chão, que é o que ele queria.
  //
  // ⚠️ **A cavalaria do outro lado encarece a saída**, pelo mesmo multiplicador da caçada:
  // recuar diante de infantaria é sair andando, recuar diante de cavalo é sair correndo. Sem
  // isto, quem tivesse ordem de recuo ficaria imune ao cavalo — e a arma que existe para
  // impedir o inimigo de escapar não impediria nada.
  if (recuou) {
    const custoDaSaida =
      ajustes.fracaoDoRecuo * (recuou === 'a' ? b.perseguicao : a.perseguicao);
    const fatia = Math.min(1, custoDaSaida);
    if (recuou === 'a') vivosA = Math.max(0, vivosA - Math.ceil(vivosA * fatia));
    else vivosB = Math.max(0, vivosB - Math.ceil(vivosB * fatia));
    rounds.push({ a: vivosA, b: vivosB, fase: 'recuo' });
    return {
      vencedor: recuou === 'a' ? 'b' : 'a',
      sobreviventesA: vivosA,
      sobreviventesB: vivosB,
      rounds,
      desfecho: 'recuou',
    };
  }

  // ⚠️ **Sempre sai um vencedor.** Quem cedeu perde; se os dois cederam, vence quem sangrou
  // menos em FRAÇÃO; se nem isso separa, vence o defensor. E se ninguém cedeu dentro das
  // rodadas, o atacante gastou o dia e não passou — o chão fica com quem já o tinha.
  const fracaoA = (inicioA - vivosA) / inicioA;
  const fracaoB = (inicioB - vivosB) / inicioB;
  let vencedor: 'a' | 'b';
  if (quebrouA === quebrouB) {
    vencedor = fracaoA < fracaoB ? 'a' : fracaoB < fracaoA ? 'b' : desempate;
  } else {
    vencedor = quebrouA ? 'b' : 'a';
  }

  // A caçada. Só o lado que cedeu é perseguido, e só uma vez: a fuga não é uma segunda
  // batalha, é o preço de ter quebrado.
  //
  // ⚠️ **Quem caça é a cavalaria do VENCEDOR**, e é aqui que ela paga o preço que cobrou:
  // sem cavalo o inimigo escapa e volta no turno seguinte; com cavalo, a derrota dele vira
  // aniquilação. Teto em 1 porque não se mata mais gente do que fugiu.
  const cacada = Math.min(
    1,
    ajustes.letalidadeDaPerseguicao * (vencedor === 'a' ? a.perseguicao : b.perseguicao),
  );
  if (vencedor === 'a') vivosB = Math.max(0, vivosB - Math.ceil(vivosB * cacada));
  else vivosA = Math.max(0, vivosA - Math.ceil(vivosA * cacada));
  rounds.push({ a: vivosA, b: vivosB, fase: 'perseguicao' });

  return { vencedor, sobreviventesA: vivosA, sobreviventesB: vivosB, rounds, desfecho: 'quebrou' };
}
