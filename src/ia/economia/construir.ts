/**
 * A IA escolhendo o que erguer — **pela conta que o próprio jogo já faz**.
 *
 * Ela não tem uma tabela secreta de "bons prédios". Ela pergunta `retornoDaConstrucaoEm`,
 * que é a mesma função que escreve a tooltip do jogador, e escolhe o melhor número. Duas
 * consequências, e as duas são o ponto:
 *
 * 1. **Se um prédio for armadilha, a IA não cai nela** — e se ela cair, a armadilha é real e
 *    o jogador cairia também. A IA vira um detector de balanço que joga 200 turnos por
 *    segundo, que é o que nenhum teste faz.
 * 2. **A tooltip e a decisão da IA não podem divergir**, porque são o mesmo número.
 *
 * ## O que o ouro não mede
 *
 * Muralha, Armaria, Templo e Quartel rendem **zero moeda**: elas pagam noutra coisa. Uma IA
 * que só olhasse ouro nunca ergueria muro nenhum, e o mapa viraria uma vitrine de Ágoras
 * indefesas. O estilo resolve isso dizendo **quanto aquilo vale em moedas por turno para
 * ele** — ver `dados/ia.json`. Fica na mesma unidade e soma direto.
 *
 * ## Come primeiro
 *
 * ⚠️ **Comida não é uma preferência, é uma trava.** Reino com saldo alimentar no chão para de
 * crescer e começa a perder gente — perde a corrida sem levar uma batalha. Quando a despensa
 * aperta, a obra de alimento passa a valer `alimentoApertado`, que é alto de propósito, e
 * atropela qualquer Ágora. É a única regra dura desta etapa; o resto é comparação de números.
 */

import type { Campanha } from '@/campanha/campanha';
import type { EstiloDeIa } from '@/dados/esquema';

/** Uma obra que a IA considerou, com o valor que ela deu. */
export interface ObraCotada {
  provincia: string;
  construcao: string;
  /** Moedas por turno: o retorno real mais o que o estilo acrescenta. */
  valor: number;
  custo: number;
  /**
   * Moedas por turno por MOEDA GASTA — é por aqui que ela escolhe.
   *
   * ⚠️ **Não é pelo `valor` cru, e o primeiro `npm run partida` mostrou por quê.** Uma obra
   * de +30 por turno que custa 3.000 é pior que uma de +20 que custa 800: a segunda se paga
   * em 40 turnos e a primeira em 100, e quem tem um cofre só quer a que devolve mais rápido
   * para poder erguer a próxima. Escolher pelo número grande é o erro que faz um jogador
   * novo torrar o caixa na obra mais cara da lista.
   */
  porMoeda: number;
}

/**
 * A obra que este poder ergueria AGORA, ou `null` se nenhuma valer a pena.
 *
 * Devolve a escolha em vez de executá-la: é o que deixa a decisão inteira ficar sob teste
 * sem mexer no mundo, e é a separação que a IA promete — percepção lê, decisão pontua,
 * execução chama comando.
 */
export function obraEscolhida(
  campanha: Campanha,
  idPoder: string,
  estilo: EstiloDeIa,
): ObraCotada | null {
  const caixa = campanha.tesouroDe(idPoder);
  // ⚠️ A reserva não é frescura: sem ela a IA zera o cofre numa Ágora e não paga a folha no
  // turno seguinte. É o erro que todo jogador novo comete uma vez.
  const disponivel = caixa * (1 - estilo.guardaDoTesouro);
  const apertada = campanha.balancoAlimentarDe(idPoder).saldo <= estilo.limiarDeAperto;

  let melhor: ObraCotada | null = null;
  // Em ordem de id, e a comparação é estritamente maior: com duas obras de valor igual
  // ganha a primeira por id, e a mesma partida decide igual em qualquer máquina.
  for (const provincia of [...campanha.provinciasDe(idPoder)].sort()) {
    for (const construcao of Object.keys(campanha.construcoesDisponiveisEm(provincia)).sort()) {
      if (!campanha.podeConstruir(provincia, construcao, idPoder).pode) continue;
      const retorno = campanha.retornoDaConstrucaoEm(provincia, construcao);
      if (!retorno || retorno.custo > disponivel) continue;

      const valor = retorno.ganhoPorTurno + valorDoPapel(campanha, construcao, estilo, apertada);
      if (valor <= 0) continue;
      const porMoeda = retorno.custo > 0 ? valor / retorno.custo : valor;
      if (melhor === null || porMoeda > melhor.porMoeda) {
        melhor = { provincia, construcao, valor, custo: retorno.custo, porMoeda };
      }
    }
  }
  return melhor;
}

/**
 * O que esta obra vale ALÉM do ouro, para este estilo.
 *
 * Por TIPO DE EFEITO e não por id de prédio: um prédio novo com efeito conhecido entra
 * sozinho na conta da IA, sem ninguém lembrar de atualizá-la. O esquecimento contrário — a
 * IA parar de considerar metade do catálogo em silêncio — é o tipo de defeito que ninguém
 * percebe até a partida inteira ficar estranha.
 */
function valorDoPapel(
  campanha: Campanha,
  construcao: string,
  estilo: EstiloDeIa,
  despensaApertada: boolean,
): number {
  const tipo = campanha.efeitoDaObra(construcao);
  if (tipo === null) return 0;
  if (tipo === 'alimento') {
    return despensaApertada ? estilo.alimentoApertado : estilo.valorDaObra.alimento;
  }
  return tipo === 'futuro' ? 0 : estilo.valorDaObra[tipo];
}
