/**
 * A IA levantando tropa — **quanto ela aguenta, e não quanto ela quer.**
 *
 * Um exército neste jogo é limitado por três coisas ao mesmo tempo, e uma IA que olhasse só
 * uma delas quebraria pela outra:
 *
 * 1. **A FOLHA**, todo turno, em ouro. É o teto que a IA respeita de propósito: o estilo diz
 *    que fatia da renda ela topa gastar mantendo gente em armas. Passar disso é o caminho
 *    curto para a deserção por falta de pagamento.
 *
 *    ⚠️ **A folha vigente vem de `manutencaoDe`, que é a conta VERDADEIRA.** Estimá-la
 *    multiplicando homens pela taxa de casa erra em dois lugares: tropa em terra alheia paga
 *    a taxa de campanha, várias vezes maior, e a soma por província perde quem nasceu em
 *    terra que caiu. Enquanto a IA não sai de casa isso dá no mesmo — e é justamente por isso
 *    que tem de ser consertado antes de ela sair.
 *
 *    ⚠️ **E são DUAS folhas: a de paz e a de guerra.** Com uma só, ela alistava o exército
 *    inteiro no turno 1 — 8.524 homens num mundo onde ninguém tinha marchado, e vários
 *    poderes ficando mais pobres na hora, porque recrutar tira gente da lavoura e do imposto.
 *    Em paz ela mantém uma GUARDA; exército se levanta quando alguém aparece na porta. É a
 *    mesma decisão que o jogador toma.
 * 2. **A COMIDA**, que é do reino inteiro. ⚠️ **E ela limita o TAMANHO da leva, não só a
 *    decisão de levantar uma.** Parar só quando o saldo já está negativo é chegar tarde:
 *    medido, com saldo ZERO a IA levantava vinte mil homens e terminava o turno em −6. O
 *    teto é a comida que sobra, convertida em bocas — e cavalo conta por vários.
 *
 *    ⚠️ **E "apertada" olha para frente**, não para o saldo de hoje: é `despensaApertada`, em
 *    `percepcao/sustento.ts`, que pergunta se a leva que o cofre já paga ainda cabe na
 *    despensa. Ver o comentário longo lá.
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
import { despensaApertada, folgaDaFolha } from '../percepcao/sustento';

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
  ajustes: Ajustes['jogo'],
): LevaCotada | null {
  const combate = ajustes.combate;
  const folgaNaFolha = folgaDaFolha(campanha, idPoder, estilo);
  if (folgaNaFolha <= 0) return null;

  const balanco = campanha.balancoAlimentarDe(idPoder);
  const apertada = despensaApertada(campanha, idPoder, estilo, ajustes);
  // ⚠️ Despensa no vermelho tranca o recrutamento inteiro. Não é excesso de zelo: cada boca a
  // mais come de um saldo que já não fecha, e a fome mata civil, não só soldado.
  if (balanco.saldo < 0) return null;
  // E o que sobra na despensa vira TETO da leva, em bocas. Sem isto ela recrutava até o saldo
  // virar dentro do mesmo turno: medido, vinte mil homens com saldo zero e o turno fechando
  // em −6.
  const bocasQueSobram = balanco.saldo * ajustes.alimento.soldadosPorPonto;

  let melhor: LevaCotada | null = null;
  let melhorValor = 0;
  for (const provincia of [...campanha.provinciasDe(idPoder)].sort()) {
    const arma = armaEscolhida(campanha, provincia, estilo, combate, apertada);
    if (arma === null) continue;
    const teto = Math.min(
      campanha.maximoParaLevaEm(provincia, arma.arma),
      Math.floor(folgaNaFolha / combate.manutencaoPorHomem.emCasa),
      // Bocas em homens: cavalo come por vários, e por isso um ponto de comida compra menos
      // cavaleiros do que hoplitas.
      Math.floor(bocasQueSobram / combate.batalha.armas[arma.arma].comida),
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
