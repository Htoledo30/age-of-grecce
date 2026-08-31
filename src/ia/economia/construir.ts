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
 * ## Come primeiro, e se defende quando batem na porta
 *
 * ⚠️ **Comida não é uma preferência, é uma trava.** Reino com saldo alimentar no chão para de
 * crescer e começa a perder gente — perde a corrida sem levar uma batalha. Quando a despensa
 * aperta, a obra de alimento passa a valer `alimentoApertado`, que é alto de propósito, e
 * atropela qualquer Ágora.
 *
 * ⚠️ **E "aperta" é uma pergunta sobre o FUTURO**, senão a fazenda vira obra de bombeiro. Ver
 * `percepcao/sustento.ts`: a despensa conta como apertada quando o exército que a economia
 * banca não caberia nela — e não quando o saldo já está no chão. Medido antes desta mudança,
 * com um ponto de comida para cada 500 soldados, **21 das 28 obras de comida saíam com a
 * parede já nas costas**: ela batia no teto, parava de recrutar, erguia a fazenda, recomeçava.
 *
 * ⚠️ **E por isso a comida tem TRÊS preços, não dois.** Emergência (`alimentoApertado`),
 * gargalo (`alimentoNoGargalo`) e gosto (`valorDaObra.alimento`). Cobrar o preço de
 * emergência na rotina do gargalo foi a primeira tentativa, e ela varreu a Ágora do mapa: 33%
 * menos riqueza e 5 poderes vivos de 18 em 150 turnos.
 *
 * ⚠️ **E o PORTO tem um preço só na primeira vez.** Ele não é uma obra de renda como as
 * outras: é a porta do mar — o comércio com quem não faz fronteira e a travessia até as ilhas.
 * Pela conta do ouro ele nunca vencia uma Ágora, e o resultado medido foi zero Portos em cem
 * turnos, com dezoito poderes e um Egeu inteiro do lado. `valorDoMar` é o que a porta vale, e
 * ele some assim que ela está aberta.
 *
 * ⚠️ **E a MURALHA segue a mesma regra, pelo mesmo motivo.** Um mercador acha muro caro — e
 * está certo, em paz. Com um exército alheio na fronteira ele deixa de estar: medido, numa
 * partida de 100 turnos com todos na IA, **os quatro únicos sobreviventes eram os quatro
 * `guerreiro`** — mercador, cauteloso e equilibrado morriam todos. O estilo não estava
 * descrevendo três jeitos de jogar, estava descrevendo um jeito de jogar e três de morrer,
 * porque ele era um gosto fixo em vez de uma reação. `defesaAmeacada` é o preço que a
 * segurança passa a ter quando a ameaça é real, e vale para qualquer estilo.
 */

import type { Campanha } from '@/campanha/campanha';
import type { Ajustes, EstiloDeIa } from '@/dados/esquema';
import { estaAmeacado } from '../percepcao/ameaca';
import { despensaApertada, despensaNoChao } from '../percepcao/sustento';

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
  /**
   * A obra que precisa CAIR antes, quando os quatro slots estão cheios.
   *
   * ⚠️ **Sem isto, metade do catálogo era enfeite.** Medido no turno 60: em 23 das 25
   * províncias que ofertavam a Armaria os quatro slots já estavam ocupados — a IA os enche
   * cedo com o que rende ouro, que é a decisão certa no começo, e depois não tem mais onde pôr
   * nada. Nenhum reino do mapa erguia uma obra de arma em 150 turnos, e o exército de toda a
   * Grécia era lança leve para sempre.
   */
  derrubar?: string;
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
  ajustes: Ajustes['jogo'],
): ObraCotada | null {
  const caixa = campanha.tesouroDe(idPoder);
  // ⚠️ A reserva não é frescura: sem ela a IA zera o cofre numa Ágora e não paga a folha no
  // turno seguinte. É o erro que todo jogador novo comete uma vez.
  const disponivel = caixa * (1 - estilo.guardaDoTesouro);
  // Dois degraus, e não um: a emergência é rara e cara, o gargalo é rotina e mais barato.
  const noChao = despensaNoChao(campanha, idPoder, estilo);
  const apertada = despensaApertada(campanha, idPoder, estilo, ajustes);
  // A mesma pergunta que separa a folha de paz da de guerra decide o preço do muro.
  const ameacado = estaAmeacado(campanha, idPoder);

  let melhor: ObraCotada | null = null;
  // Em ordem de id, e a comparação é estritamente maior: com duas obras de valor igual
  // ganha a primeira por id, e a mesma partida decide igual em qualquer máquina.
  for (const provincia of [...campanha.provinciasDe(idPoder)].sort()) {
    for (const construcao of Object.keys(campanha.construcoesDisponiveisEm(provincia)).sort()) {
      const permissao = campanha.podeConstruir(provincia, construcao, idPoder);
      // Barrada SÓ pelo espaço? Então talvez valha derrubar o que menos serve a este estilo.
      // ⚠️ Só a falta de ESPAÇO se cura derrubando. Se a recusa for outra — obra em andamento,
      // requisito da terra, nível máximo —, demolir não resolve e ainda destrói um prédio à toa.
      // ⚠️ Só a falta de ESPAÇO se cura derrubando, e só para obra NOVA. Se a recusa for
      // outra — obra em andamento, nível máximo, requisito da terra —, demolir não resolve e
      // ainda destrói um prédio à toa. O slot só é cobrado de quem ainda não está lá.
      const derrubar =
        permissao.pode ||
        campanha.nivelDaConstrucaoEm(provincia, construcao) > 0 ||
        !campanha.semSlotLivreEm(provincia) ||
        campanha.obraEm(provincia) !== undefined
          ? undefined
          : trocaPossivel(campanha, provincia, construcao, estilo, idPoder);
      if (!permissao.pode && derrubar === undefined) continue;
      const retorno = campanha.retornoDaConstrucaoEm(provincia, construcao);
      if (!retorno || retorno.custo > disponivel) continue;

      const valor =
        retorno.ganhoPorTurno +
        valorDoPapel(campanha, construcao, estilo, noChao, apertada, ameacado) +
        // ⚠️ **A porta do mar, e ela só se abre uma vez.** Sem esta parcela nenhuma IA erguia
        // Porto em cem turnos — ele custa 2.500 e paga em trânsito, a menor parcela da renda —
        // e sem Porto ninguém comercia com quem não faz fronteira nem embarca para ilha
        // nenhuma. Do segundo em diante ele volta a valer o trânsito que rende.
        (campanha.abreOMar(construcao) && !campanha.temPorto(idPoder) ? estilo.valorDoMar : 0);
      if (valor <= 0) continue;
      const porMoeda = retorno.custo > 0 ? valor / retorno.custo : valor;
      if (melhor === null || porMoeda > melhor.porMoeda) {
        melhor = { provincia, construcao, valor, custo: retorno.custo, porMoeda, ...(derrubar ? { derrubar } : {}) };
      }
    }
  }
  return melhor;
}

/**
 * O que derrubar para abrir espaço, ou `undefined` se nada valer a pena derrubar.
 *
 * ⚠️ **A IA NUNCA vende a própria economia.** Obra que rende ouro — renda, troca, corrupção —
 * está fora de cogitação: derrubar uma Ágora para erguer uma Armaria seria trocar o motor do
 * reino por uma arma, e é exatamente o tipo de decisão que faz uma IA parecer burra. O que ela
 * troca é o que vale por GOSTO: um Templo num reino que não liga para felicidade, uma Muralha
 * num que não teme ninguém.
 *
 * ⚠️ E só troca por algo **claramente melhor**: o dobro do que perde. Sem essa folga a IA
 * ficaria derrubando e erguendo em ciclo, gastando o cofre inteiro para ganhar um ponto.
 */
function trocaPossivel(
  campanha: Campanha,
  provincia: string,
  desejada: string,
  estilo: EstiloDeIa,
  idPoder: string,
): string | undefined {
  const valorDesejado = valorPorGosto(campanha, desejada, estilo);
  if (valorDesejado <= 0) return undefined;
  let pior: { id: string; valor: number } | undefined;
  for (const erguida of campanha.construcoesEm(provincia)) {
    if (rendeOuro(campanha, erguida)) continue;
    if (!campanha.podeDemolir(provincia, erguida, idPoder).pode) continue;
    const valor = valorPorGosto(campanha, erguida, estilo);
    if (!pior || valor < pior.valor) pior = { id: erguida, valor };
  }
  if (!pior || valorDesejado < pior.valor * 2) return undefined;
  return pior.id;
}

/** Esta obra é motor de economia? Então ela não se derruba, e ponto. */
function rendeOuro(campanha: Campanha, construcao: string): boolean {
  const tipo = campanha.efeitoDaObra(construcao);
  return tipo === 'renda' || tipo === 'troca' || tipo === 'corrupcao';
}

/** O que a obra vale para este estilo, fora o ouro. Sem os degraus de emergência. */
function valorPorGosto(campanha: Campanha, construcao: string, estilo: EstiloDeIa): number {
  const tipo = campanha.efeitoDaObra(construcao);
  if (tipo === null || tipo === 'futuro') return 0;
  return estilo.valorDaObra[tipo];
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
  noChao: boolean,
  gargalo: boolean,
  ameacado: boolean,
): number {
  const tipo = campanha.efeitoDaObra(construcao);
  if (tipo === null) return 0;
  if (tipo === 'alimento') {
    // ⚠️ TRÊS degraus, e a ordem importa: emergência, gargalo, gosto. Ver `alimentoNoGargalo`
    // no esquema — foi ele que separou "estou morrendo" de "a comida é o que me trava".
    if (noChao) return estilo.alimentoApertado;
    if (gargalo) return estilo.alimentoNoGargalo;
    return estilo.valorDaObra.alimento;
  }
  // Muro em paz é gosto; muro com exército alheio na fronteira é sobrevivência.
  if (tipo === 'milicia' && ameacado) return estilo.defesaAmeacada;
  return tipo === 'futuro' ? 0 : estilo.valorDaObra[tipo];
}
