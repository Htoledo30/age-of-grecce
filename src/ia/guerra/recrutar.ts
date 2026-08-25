/**
 * A IA levantando tropa — **quanto ela aguenta, e não quanto ela quer.**
 *
 * Um exército neste jogo é limitado por três coisas ao mesmo tempo, e uma IA que olhasse só
 * uma delas quebraria pela outra:
 *
 * 1. **A FOLHA**, todo turno, em ouro. É o teto que a IA respeita de propósito: o estilo diz
 *    que fatia da renda ela topa gastar mantendo gente em armas. Passar disso é o caminho
 *    curto para a deserção por falta de pagamento.
 * 2. **A COMIDA**, que é do reino inteiro. Tropa a mais com a despensa no zero mata civil e
 *    para o crescimento — perde-se a corrida sem levar uma batalha.
 * 3. **A GENTE**, província por província. Quem vai pras armas sai da lavoura e do imposto.
 *
 * ⚠️ **Ela recruta na paz, e não quando o inimigo aparece.** Leva demora um turno para virar
 * hoste; esperar a ameaça é chegar tarde. É a mesma razão pela qual o jogador que só recruta
 * quando vê a marcha inimiga já perdeu a província.
 *
 * ## Qual arma
 *
 * O estilo diz o que ele valoriza, e o resto sai dos dados do jogo — nenhuma tabela secreta
 * de "boas armas" aqui dentro:
 *
 * - **`melhor`** pega o soldado que mais vale em campo (`ataque × aguento`), custe o que
 *   custar. É o guerreiro, que prefere quinhentos hoplitas a oitocentos leves.
 * - **`barata`** pega o que rende mais luta por moeda. É o mercador, que prefere a massa.
 *
 * ⚠️ **Com a despensa apertada, arma que come por dois sai da lista.** Cavalaria é pressão
 * sobre a terra antes de ser pressão sobre o tesouro, e uma IA faminta que levanta cavalaria
 * está se matando com o próprio exército.
 */

import type { Campanha } from '@/campanha/campanha';
import type { Arma } from '@/combate/exercito';
import type { Ajustes, EstiloDeIa } from '@/dados/esquema';

type AjustesCombate = Ajustes['jogo']['combate'];

/** Uma leva que a IA levantaria agora. */
export interface LevaCotada {
  provincia: string;
  arma: Arma;
  homens: number;
}

/**
 * A leva que este poder levantaria AGORA, ou `null` se ele já tem tropa demais para o que
 * ganha, para o que come, ou para o que tem no cofre.
 */
export function levaEscolhida(
  campanha: Campanha,
  idPoder: string,
  estilo: EstiloDeIa,
  ajustes: AjustesCombate,
): LevaCotada | null {
  const folgaNaFolha = folgaDaFolha(campanha, idPoder, estilo, ajustes);
  if (folgaNaFolha <= 0) return null;

  const balanco = campanha.balancoAlimentarDe(idPoder);
  const apertada = balanco.saldo <= estilo.limiarDeAperto;
  // ⚠️ Despensa no vermelho tranca o recrutamento inteiro. Não é excesso de zelo: cada boca a
  // mais come de um saldo que já não fecha, e a fome mata civil, não só soldado.
  if (balanco.saldo < 0) return null;

  let melhor: LevaCotada | null = null;
  let melhorValor = 0;
  for (const provincia of [...campanha.provinciasDe(idPoder)].sort()) {
    const arma = armaEscolhida(campanha, provincia, estilo, ajustes, apertada);
    if (arma === null) continue;
    const teto = Math.min(
      campanha.maximoParaLevaEm(provincia, arma.arma),
      Math.floor(folgaNaFolha / ajustes.manutencaoPorHomem.emCasa),
    );
    if (teto <= 0) continue;
    if (!campanha.podeRecrutar(provincia, teto, arma.arma, idPoder).pode) continue;
    // Entre duas terras, a que põe mais gente boa em campo. Empate fica com a primeira por
    // id, que é a ordem em que o laço anda.
    const valor = teto * arma.valor;
    if (valor > melhorValor) {
      melhorValor = valor;
      melhor = { provincia, arma: arma.arma, homens: teto };
    }
  }
  return melhor;
}

/**
 * Quanto ainda cabe na folha militar deste poder, em moedas por turno.
 *
 * A renda menos o que a tropa já custa, limitado pela fatia que o estilo topa gastar. É o
 * único teto que a IA se impõe sozinha — os outros dois vêm do mundo.
 */
function folgaDaFolha(
  campanha: Campanha,
  idPoder: string,
  estilo: EstiloDeIa,
  ajustes: AjustesCombate,
): number {
  const renda = campanha.rendaDe(idPoder);
  const emArmas = campanha
    .provinciasDe(idPoder)
    .reduce((soma, id) => soma + campanha.homensEmArmasDe(id), 0);
  const folhaAtual = emArmas * ajustes.manutencaoPorHomem.emCasa;
  return renda * estilo.folhaMilitar - folhaAtual;
}

/** A arma que esta terra levanta e que este estilo prefere, com o que ela vale. */
function armaEscolhida(
  campanha: Campanha,
  provincia: string,
  estilo: EstiloDeIa,
  ajustes: AjustesCombate,
  despensaApertada: boolean,
): { arma: Arma; valor: number } | null {
  let escolhida: { arma: Arma; valor: number } | null = null;
  for (const arma of campanha.armasEm(provincia)) {
    const dados = ajustes.batalha.armas[arma];
    // Boca dupla com a despensa apertada é o exército comendo o próprio reino.
    if (despensaApertada && dados.comida > 1) continue;
    // ⚠️ **O que um homem vale em campo é `ataque × aguento`**, e não um dos dois: a força de
    // um lado é `homens² × ataque × aguento`, então os dois modificadores entram juntos.
    const emCampo = dados.ataque * dados.aguento;
    // ⚠️ **E o preço entra ao QUADRADO na conta do barato.** Não é capricho: as cabeças
    // entram ao quadrado, então dobrar o preço de um soldado divide por quatro o que o mesmo
    // ouro põe em campo. Dividir só uma vez faria "barata" escolher hoplita — o aguento 1,5
    // dele cobre o custo 1,25 numa divisão simples e não cobre na verdadeira. É a mesma conta
    // que o `npm run armas` usa para dizer quem vence a coluna da moeda.
    const valor = estilo.arma === 'melhor' ? emCampo : emCampo / (dados.custo * dados.custo);
    if (escolhida === null || valor > escolhida.valor) escolhida = { arma, valor };
  }
  return escolhida;
}
