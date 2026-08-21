/**
 * O que é um exército: gente em armas, e de onde ela veio.
 *
 * ⚠️ **A hoste tem IDENTIDADE PRÓPRIA, e não é "o exército da província X".** Foi assim
 * antes, e a província como chave impedia estruturalmente duas hostes no mesmo lugar — o
 * que o cerco exige (sitiante do lado de fora, guarnição trancada dentro) e o que
 * diplomacia (passagem militar), frota com tropa embarcada e general com nome vão exigir
 * depois. Com id, "uma hoste por poder por província" deixa de ser uma restrição da
 * estrutura e passa a ser POLÍTICA — que é o lugar certo dela, porque assim dá pra abrir
 * exceção quando uma regra pedir.
 *
 * ⚠️ **A força é DERIVADA de `origem`, nunca guardada ao lado dela.** Guardar um total
 * junto do detalhe é convidar os dois a discordarem: bastaria um caminho de código somar
 * num e esquecer o outro. Somar 1 a 3 números a cada leitura é de graça.
 */

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
   * Quantos homens vieram de cada província, por id. A soma é a força.
   *
   * Existe pra que dispensar a tropa devolva cada um à SUA terra. Sem isso, marchar de
   * uma província pobre até uma rica e dispensar ali seria um jeito de mudar gente de
   * lugar — economia de lavagem de população, que nenhuma regra proibiria explicitamente.
   */
  origem: Record<string, number>;
}

/** Quantos homens este exército tem ao todo. */
export function forcaDe(exercito: Exercito | undefined): number {
  if (!exercito) return 0;
  let total = 0;
  for (const homens of Object.values(exercito.origem)) total += homens;
  return total;
}

/** Um exército vazio, pronto pra receber a primeira leva. */
export function exercitoVazio(id: string, poder: string, posicao: string): Exercito {
  return { id, poder, posicao, origem: {} };
}

/** Junta uma leva ao exército, lembrando de onde ela saiu. */
export function somarLeva(exercito: Exercito, idProvincia: string, homens: number): void {
  exercito.origem[idProvincia] = (exercito.origem[idProvincia] ?? 0) + homens;
}

/**
 * Tira `homens` do exército e diz quantos saíram de cada província.
 *
 * Tira proporcionalmente de cada origem, e não da primeira da lista: perder metade de um
 * exército misto tem que custar metade a cada cidade que o formou, senão a ordem em que
 * as levas entraram viraria uma regra escondida.
 *
 * O ajuste do resto vai na origem que mais tem, pra que a soma feche exata — sobra de
 * arredondamento aqui viraria homem sumido ou homem inventado.
 */
export function retirar(exercito: Exercito, homens: number): Record<string, number> {
  const total = forcaDe(exercito);
  const alvo = Math.min(homens, total);
  if (alvo <= 0) return {};

  const saida: Record<string, number> = {};
  let somado = 0;
  for (const [id, quantos] of Object.entries(exercito.origem)) {
    const parte = Math.floor((quantos * alvo) / total);
    if (parte > 0) saida[id] = parte;
    somado += parte;
  }

  let resto = alvo - somado;
  while (resto > 0) {
    const maior = Object.entries(exercito.origem)
      .filter(([id]) => (exercito.origem[id] ?? 0) > (saida[id] ?? 0))
      .sort((a, b) => b[1] - a[1])[0];
    if (!maior) break;
    saida[maior[0]] = (saida[maior[0]] ?? 0) + 1;
    resto -= 1;
  }

  for (const [id, quantos] of Object.entries(saida)) {
    const restante = (exercito.origem[id] ?? 0) - quantos;
    if (restante > 0) exercito.origem[id] = restante;
    else delete exercito.origem[id];
  }
  return saida;
}
