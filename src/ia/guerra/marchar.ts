/**
 * A IA ATACANDO — a etapa 3, e a primeira em que uma hoste dela pisa em terra alheia.
 *
 * Até aqui o mapa reagia; agora ele avança. A regra dura da etapa 2 — *"nenhuma hoste pisa em
 * terra alheia"* — cai neste arquivo, e é só aqui que ela cai: quem defende continua sem sair
 * do reino, e a diferença entre as duas coisas continua sendo o nome do arquivo.
 *
 * ## As cinco perguntas, nesta ordem
 *
 * 1. **Tenho guerra na minha porta?** Se tenho, não saio. Atacar com o inimigo encostado é
 *    trocar de província com ele — e quem sai de casa numa troca dessas costuma sair perdendo,
 *    porque a terra que ele toma já está pronta e a que eu tomo dele ainda vai ferver.
 *
 *    ⚠️ **Uma revolta em casa cai nesta mesma pergunta, e por isso não ganhou regra própria.**
 *    Uma existiu por algumas horas — *"não se morde de novo enquanto a última não desce"* — e
 *    era redundante: a província que ferve levanta uma hoste REBELDE em cima da guarnição, e
 *    hoste alheia em terra minha já é ameaça. Medida, a regra separada disparava em 1% dos
 *    poder-turnos, e só nas três viradas entre o humor cair e o rebelde aparecer. Regra que
 *    quase nunca vale e que outra já cobre é regra que apodrece sem ninguém notar.
 * 2. **Que terra vale mais DO QUE CUSTA?** Renda, mais o bem que ainda não circula na minha
 *    rede, mais o que o estilo diz que uma capital vale — **menos o que uma província tomada à
 *    força custa enquanto não assenta.** Ver `percepcao/oportunidade.ts`.
 * 3. **Eu TOMO aquilo?** Não "eu ganho a batalha": eu tomo a cidade. São duas contas, e as
 *    duas rodam com as funções da própria rodada — o choque de campo contra o exército que
 *    estiver lá, e depois o assalto contra a milícia, **com o que sobrou do meu**.
 * 4. **Sobra exército depois?** Vitória que custa nove décimos entrega a província seguinte de
 *    graça a quem estiver olhando. `sobraMinima` é o estilo dizendo com quanto ele topa
 *    terminar em pé.
 * 5. **E sobra guarda em casa?** ⚠️ **Foi o que faltou na primeira versão, e o resultado foi
 *    sopa em três turnos.** Todos os dezessete poderes olhavam a milícia do vizinho no turno 1,
 *    viam que ganhavam, e marchavam ao mesmo tempo — cinco conquistas no primeiro turno e a
 *    capital de Atenas caindo no terceiro, sem ninguém ter levantado um exército de verdade.
 *    Nenhum deles estava errado sobre a batalha; todos estavam errados sobre a casa que
 *    deixavam. `fracaoQueMarcha` é o teto do que vai para a estrada.
 *
 * ## Ela senta, e o cerco é metade da guerra
 *
 * ⚠️ **Tomar a praça hoje não é a única jogada, e a primeira versão achava que era.** Se o
 * assalto não fecha, ela ACAMPA: a província sitiada para de produzir e de comerciar, a
 * despensa da cidade vence, a população cai e a milícia encolhe junto — até o assalto virar
 * possível, e aí `assaltosMaduros` o dispara. Medido sem esta jogada: **7 turnos de cerco no
 * mapa inteiro em 100 turnos.** A IA só sabia um golpe, e por isso parecia tímida mesmo com
 * dezessete poderes em guerra com todo mundo.
 *
 * ⚠️ **Sentar tem duas travas, e as duas existem porque o cerco DURA.**
 *
 * A primeira é o **cofre**: homem em terra alheia custa a taxa de campanha, três vezes a de
 * casa, e um cerco não tem fim marcado. A conta é a verdadeira — renda menos a folha de hoje,
 * menos o que o destacamento passa a custar a mais lá fora. Sem saldo de pé ela não vai, porque
 * exército parado diante de um muro sem ouro para pagá-lo é a estátua que Henrique já viu na
 * revolta, com o agravante de sangrar o reino inteiro junto.
 *
 * A segunda é o **socorro**: sentar dá ao dono turnos para juntar tudo o que ele tem em armas e
 * vir. Por isso o cerco exige ganhar do EXÉRCITO INTEIRO dele, e não só de quem está na
 * província. Prever contra o que está à vista faria a IA acampar com duzentos homens diante de
 * uma cidade cujo dono tem mil na terra ao lado — e o socorro dele é decidido pela mesma
 * previsão, então ele viria.
 *
 * ## O que ela deliberadamente NÃO faz ainda
 *
 * ⚠️ **Ela não LEVANTA um cerco que azedou.** Quem sentou fica sentado: a hoste acampada não
 * recebe ordem nova, e a decisão de voltar para casa é uma reação, não um ataque. Enquanto isso
 * não existir, a trava do cofre é o que segura — ela só senta com saldo de sobra, e por isso
 * não deveria chegar ao ponto de precisar voltar. Fica para a etapa das reações.
 *
 * ⚠️ **O que marcha é um DESTACAMENTO, e o resto fica em casa.** O jogo já deixa mandar parte
 * da hoste — o que sobra continua defendendo a origem —, e é essa a peça que `fracaoQueMarcha`
 * usa. A primeira versão do freio exigia que a hoste INTEIRA coubesse na fatia, e travou o mapa
 * por completo: hoste nasce onde a leva é levantada, quase todo poder tem uma província só, e
 * portanto uma hoste só — nenhuma cabia em fatia nenhuma, e ninguém atacou em cento e cinquenta
 * turnos. Dividir é o que a regra do jogo oferece, e é o que um general faz.
 */

import type { Campanha } from '@/campanha/campanha';
import type { Postura } from '@/combate/cerco';
import type { Contingente, Exercito } from '@/combate/exercito';
import type { Ajustes, EstiloDeIa } from '@/dados/esquema';
import { estaAmeacado, forcaTotalDe } from '../percepcao/ameaca';
import { oportunidadesAlcancaveis, oportunidadesNoLitoral } from '../percepcao/oportunidade';
import type { Oportunidade } from '../percepcao/oportunidade';
import { prever, preverAssalto } from '../percepcao/prever';
import type { Previsao } from '../percepcao/prever';
import { objetivoEscolhido } from './objetivo';

type AjustesDeCombate = Ajustes['jogo']['combate'];
type AjustesDaBatalha = Ajustes['jogo']['combate']['batalha'];

/** Uma hoste marchando sobre terra alheia. */
export interface OrdemDeAtaque {
  hoste: string;
  destino: string;
  homens: number;
  postura: Postura;
  /** O que a IA achou que aquilo valia, em moedas por turno. Serve ao banco de provas. */
  valor: number;
}

/**
 * Sobre o que este poder marcharia AGORA, e com que postura.
 *
 * `jaMandadas` são as hostes que a defesa já usou nesta virada: **uma ordem por hoste por
 * rodada** é regra do jogo, e a defesa vem primeiro de propósito.
 */
export function ataquesEscolhidos(
  campanha: Campanha,
  idPoder: string,
  estilo: EstiloDeIa,
  ajustes: AjustesDeCombate,
  jaMandadas: ReadonlySet<string>,
): readonly OrdemDeAtaque[] {
  // A defesa reserva as hostes necessárias em jaMandadas; o resto continua a campanha.

  // O que pode sair de casa nesta virada, em homens — e ele ENCOLHE a cada ordem dada. Sem
  // descontar, um poder com três hostes mandava as três, cada uma cabendo na fatia sozinha e
  // as três juntas esvaziando o reino: o freio existiria e não freiaria nada.
  //
  // ⚠️ **E desconta quem JÁ está lá fora**, que é o furo da primeira versão: a fatia era
  // recalculada do zero a cada virada, então um poder mandava 40% hoje, 40% amanhã e 40% depois
  // — e acabava com o exército inteiro em terra alheia justamente porque existia um teto.
  let naEstrada =
    Math.floor(forcaTotalDe(campanha, idPoder) * estilo.fracaoQueMarcha) -
    emTerraAlheia(campanha, idPoder);

  const ordens: OrdemDeAtaque[] = [];
  const usadas = new Set(jaMandadas);
  const objetivo = campanha.objetivoMilitarDe(idPoder);
  const alvos = porValor(oportunidadesAlcancaveis(campanha, idPoder), estilo);
  for (const alvo of [...alvos].sort((a, b) =>
    Number(b.oportunidade.provincia === objetivo?.alvo) - Number(a.oportunidade.provincia === objetivo?.alvo),
  )) {
    // ⚠️ **Só se marcha sobre quem se está em guerra.** A ordem de marcha já recusaria, mas a
    // IA pergunta antes de escolher para não gastar a fatia que pode marchar com um alvo que
    // ela não tem direito de atacar. Quem decide DECLARAR é `diplomacia/declarar.ts`.
    if (!campanha.emGuerra(idPoder, alvo.oportunidade.dono)) continue;
    const escolhida = hosteQueToma(
      campanha,
      idPoder,
      alvo.oportunidade,
      estilo,
      ajustes,
      usadas,
      naEstrada,
      (idHoste, quantos) =>
        campanha.podeOrdenarMarcha(idHoste, alvo.oportunidade.provincia, quantos, idPoder).pode,
      (idHoste) => campanha.rotasLongasDaHoste(idHoste).has(alvo.oportunidade.provincia),
    );
    if (escolhida === null) continue;
    usadas.add(escolhida.hoste);
    const origem = campanha.hoste(escolhida.hoste)?.posicao;
    if (origem && campanha.donoDe(origem) === idPoder) naEstrada -= escolhida.homens;
    ordens.push({ ...escolhida, destino: alvo.oportunidade.provincia, valor: alvo.valor });
  }
  return ordens;
}

/** Expedições marítimas recebem o destino final e conservam a viagem. */
export function travessiasEscolhidas(
  campanha: Campanha,
  idPoder: string,
  estilo: EstiloDeIa,
  ajustes: AjustesDeCombate,
  jaMandadas: ReadonlySet<string>,
): readonly OrdemDeAtaque[] {
  // ⚠️ **A percepção aqui é a do LITORAL, e não a da vizinhança.** Nada encosta em ninguém
  // através da água: a lista de vizinhos nunca conteria a ilha, e a travessia não teria para
  // onde ir. Ver `oportunidadesNoLitoral`.
  const alvos = porValor(oportunidadesNoLitoral(campanha, idPoder), estilo).filter((a) =>
    campanha.emGuerra(idPoder, a.oportunidade.dono),
  );
  if (alvos.length === 0) return [];

  const ordens: OrdemDeAtaque[] = [];
  const usadas = new Set(jaMandadas);

  // ── 1. Quem já está na água segue viagem ────────────────────────────────────────────
  // ⚠️ **Sem gastar fatia nenhuma**, e isto não é generosidade: `fracaoQueMarcha` desconta
  // quem já está fora de casa, e uma hoste no meio do Egeu desconta a si mesma. Cobrando dela
  // de novo a cada virada, a conta zeraria no segundo turno da viagem, a expedição não se
  // renovaria e a retirada a traria de volta — todo exército que zarpasse daria meia-volta no
  // meio do mar, para sempre. Quem embarcou já pagou a passagem.
  for (const hoste of campanha.hostes()) {
    if (hoste.poder !== idPoder || usadas.has(hoste.id)) continue;
    if (!campanha.ehMar(hoste.posicao)) continue;
    const homens = campanha.forcaDaHoste(hoste.id);
    if (homens <= 0) continue;
    const passo = trechoDeHoje(campanha, idPoder, hoste, homens, alvos, estilo, ajustes);
    if (passo === null) continue;
    usadas.add(hoste.id);
    ordens.push({ hoste: hoste.id, homens, ...passo });
  }

  // Novas expedições respeitam a reserva definida pela defesa.
  const objetivo = campanha.objetivoMilitarDe(idPoder);
  const alvosDaCampanha = objetivo
    ? alvos.filter((a) => a.oportunidade.provincia === objetivo.alvo)
    : alvos;
  let naEstrada =
    Math.floor(forcaTotalDe(campanha, idPoder) * estilo.fracaoQueMarcha) -
    emTerraAlheia(campanha, idPoder);
  for (const hoste of campanha.hostes()) {
    if (naEstrada <= 0) break;
    if (hoste.poder !== idPoder || usadas.has(hoste.id)) continue;
    if (campanha.donoDe(hoste.posicao) !== idPoder) continue;
    const homens = Math.min(campanha.forcaDaHoste(hoste.id), naEstrada);
    if (homens <= 0) continue;
    const passo = trechoDeHoje(campanha, idPoder, hoste, homens, alvosDaCampanha, estilo, ajustes);
    if (passo === null) continue;
    usadas.add(hoste.id);
    naEstrada -= homens;
    ordens.push({ hoste: hoste.id, homens, ...passo });
  }

  return ordens;
}

/** Escolhe uma costa alcançável e a postura que será usada ao chegar. */
function trechoDeHoje(
  campanha: Campanha,
  idPoder: string,
  hoste: Exercito,
  homens: number,
  alvos: readonly { oportunidade: Oportunidade; valor: number }[],
  estilo: EstiloDeIa,
  ajustes: AjustesDeCombate,
): { destino: string; valor: number; postura: Postura } | null {
  // Todas as outras hostes ficam de fora da escolha: aqui a pergunta não é "qual delas vai",
  // e sim "ESTA vai?". É a mesma conta de `hosteQueToma`, com uma candidata só.
  const outras = new Set(campanha.hostes().map((h) => h.id));
  outras.delete(hoste.id);
  // Uma busca em largura por hoste, e não uma por alvo: as rotas saem todas juntas.
  const rotas = campanha.rotasLongasDaHoste(hoste.id);
  // Quem já embarcou está NUMA travessia: o que falta dela é a viagem, curta ou longa.
  const naAgua = campanha.ehMar(hoste.posicao);

  // ⚠️ **A VIAGEM ENTRA NA CONTA, e sem ela a expedição nunca chegava.** `alvos` vem ordenado
  // por valor puro, e `oportunidadesNoLitoral` é deliberadamente larga — toda costa alheia do
  // mapa. Escolhendo o primeiro que passa, a frota zarpava atrás da costa mais RICA e não da
  // mais perto: uma hoste de Mégara punha-se a caminho de Rodes, a oito trechos, e a guerra
  // acabava, a casa pegava fogo ou o alvo mudava de dono muito antes de ela chegar.
  //
  // **Medido em 6 partidas de 120 turnos, com a trava da casa em chamas consertada junto: os
  // desembarques em terra alheia subiram de 1,5 para 2,0 por partida COM MENOS trechos de
  // travessia andados (24,3 para 22,2).** Menos frota circulando e mais frota chegando é
  // exatamente o que se espera de parar de perseguir o alvo do outro lado do mapa.
  //
  // A régua é o valor POR TRECHO. Não é sofisticada de propósito: a distância já virou tempo
  // quando o exército passou a andar um salto por rodada, e tempo aqui é a folha de campanha
  // — três vezes a de casa, paga toda virada em que a frota está na água. Um alvo que vale o
  // dobro e fica quatro vezes mais longe perde, e é o que qualquer general responderia.
  const porPerto = [...alvos]
    .map((alvo) => ({ alvo, rota: rotas.get(alvo.oportunidade.provincia) }))
    .filter((c): c is { alvo: (typeof alvos)[number]; rota: readonly string[] } =>
      c.rota !== undefined && c.rota.length > 0,
    )
    .sort(
      (a, b) =>
        b.alvo.valor / b.rota.length - a.alvo.valor / a.rota.length ||
        a.alvo.oportunidade.provincia.localeCompare(b.alvo.oportunidade.provincia),
    );

  for (const { alvo, rota } of porPerto) {
    // Rota de um trecho só é o ataque de hoje, e ele já rodou. Rota sem água é marcha por
    // terra, que é assunto da concentração — duas regras mandando a mesma hoste para lados
    // diferentes é como se perde um exército. Nenhuma das duas vale para quem está na água.
    if (!naAgua && (rota.length < 2 || !rota.some((id) => campanha.ehMar(id)))) continue;
    const proximo = rota[0];
    if (proximo === undefined) continue;
    if (!campanha.podeOrdenarMarcha(hoste.id, alvo.oportunidade.provincia, homens, idPoder).pode) continue;
    const toma = hosteQueToma(
      campanha,
      idPoder,
      alvo.oportunidade,
      estilo,
      ajustes,
      outras,
      homens,
      () => true,
      () => true,
    );
    if (toma === null) continue;
    // A resolução só aplica a postura ao chegar ao destino final.
    return {
      destino: alvo.oportunidade.provincia,
      valor: alvo.valor,
      postura: toma.postura,
    };
  }
  return null;
}

/**
 * Os cercos meus que já podem virar assalto — e que eu venceria.
 *
 * ⚠️ **Sem isto o cerco da IA nunca termina.** Sentar não toma a praça; quem toma é o assalto,
 * e a hoste que já está sentada não recebe ordem de marcha nenhuma para mudar de ideia. A
 * decisão é a mesma de sempre: a muralha já deixa, e a conta do assalto fecha.
 */
export function assaltosMaduros(
  campanha: Campanha,
  idPoder: string,
  estilo: EstiloDeIa,
  ajustes: AjustesDaBatalha,
): readonly string[] {
  const maduros: string[] = [];
  for (const { provincia, cerco } of campanha.cercos()) {
    if (cerco.sitiante !== idPoder || cerco.postura === 'assaltar') continue;
    // A paz já levanta o cerco; esta é a mesma tranca do lado de quem decide.
    if (!campanha.emGuerra(idPoder, campanha.donoDe(provincia))) continue;
    if (campanha.assaltoEm(provincia).faltam > 0) continue;
    const minhas = campanha.hostesEm(provincia).filter((h) => h.poder === idPoder);
    const deles = campanha.hostesEm(provincia).filter((h) => campanha.emGuerra(idPoder, h.poder));
    // ⚠️ **Exército alheio de pé ali não trava a decisão — é ela.** A primeira versão pulava
    // esses cercos, e era um beco sem saída: a hoste sentada não recebe ordem de marcha, então
    // trocar a postura era a ÚNICA forma de engajar o defensor, e o cerco ficava para sempre com
    // os dois acampados lado a lado. As duas contas são as mesmas da marcha — o campo primeiro,
    // a muralha com o que sobrou dele.
    const campo =
      deles.length > 0 ? prever(minhas, deles, ajustes, 'b') : { venci: true, sobra: 1 };
    if (!basta(campo, estilo)) continue;
    const restam = escalar(minhas.flatMap((h) => h.contingentes), campo.sobra);
    const muralha = preverAssalto(restam, campanha.miliciaEm(provincia), ajustes);
    if (!basta({ venci: muralha.venci, sobra: campo.sobra * muralha.sobra }, estilo)) continue;
    maduros.push(provincia);
  }
  return maduros.sort();
}

/** Retira tropas sem guerra ou de cercos que perderam viabilidade. Socorro é decidido à parte. */
export function retiradasEscolhidas(
  campanha: Campanha,
  idPoder: string,
  ajustes: AjustesDeCombate,
  jaMandadas: ReadonlySet<string>,
): readonly { hoste: string; destino: string; homens: number }[] {
  const ordens: { hoste: string; destino: string; homens: number }[] = [];
  for (const hoste of campanha.hostes()) {
    if (hoste.poder !== idPoder || jaMandadas.has(hoste.id)) continue;
    const dono = campanha.donoDe(hoste.posicao);
    if (dono === idPoder) continue;
    const homens = campanha.forcaDaHoste(hoste.id);
    if (homens <= 0) continue;
    if (!voltaria(campanha, idPoder, hoste, dono, ajustes)) continue;
    const casa = rumoDeCasa(campanha, idPoder, hoste.id);
    if (casa === undefined) continue;
    if (!campanha.podeOrdenarMarcha(hoste.id, casa, homens, idPoder).pode) continue;
    ordens.push({ hoste: hoste.id, destino: casa, homens });
  }
  return ordens;
}

/**
 * Para onde esta hoste anda HOJE se quer voltar para casa. `undefined` quando não há volta.
 *
 * ⚠️ **A volta precisa da mesma vista longa que a ida ganhou, e por um tempo não teve.** A
 * retirada perguntava só "que terra minha eu alcanço nesta rodada"; no meio do Egeu a resposta
 * é nenhuma, e a hoste ficava. Medido: **159 hoste-turnos parados na água em 100 turnos, e uma
 * delas passou 56 turnos boiando** — pagando a folha de campanha, três vezes a de casa, sem
 * fazer nada. Henrique viu isso jogando: *"ao sair do mar ela não lembra que precisa ir para um
 * território dela"*.
 *
 * Chegar é melhor que caminhar: se alguma terra própria está a um salto, ela é o destino. Só
 * quando não há é que se conserva uma viagem até a terra própria mais próxima.
 */
function rumoDeCasa(campanha: Campanha, idPoder: string, idHoste: string): string | undefined {
  const agora = [...campanha.alcanceDaHoste(idHoste)]
    .filter((id) => campanha.donoDe(id) === idPoder)
    .sort()[0];
  if (agora !== undefined) return agora;

  let melhor: readonly string[] | undefined;
  // Ordenado por destino antes de comparar: com duas casas à mesma distância ganha a de menor
  // id, e a mesma partida decide igual em qualquer máquina.
  for (const [destino, rota] of [...campanha.rotasLongasDaHoste(idHoste)].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    if (campanha.donoDe(destino) !== idPoder) continue;
    if (melhor === undefined || rota.length < melhor.length) melhor = rota;
  }
  return melhor?.at(-1);
}

/** Reavalia a guerra e a viabilidade de manter o cerco. */
function voltaria(
  campanha: Campanha,
  idPoder: string,
  hoste: Exercito,
  dono: string,
  ajustes: AjustesDeCombate,
): boolean {
  if (!campanha.emGuerra(idPoder, dono)) return true;
  // Sentado: a conta que autorizou sentar é refeita, e ela pode ter virado.
  if (campanha.cercoEm(hoste.posicao)?.sitiante !== idPoder) return false;
  if (!aguentaOCerco(campanha, idPoder, 0, ajustes, campanha.assaltoEm(hoste.posicao).faltam + 1)) return true;
  return !prever([hoste], socorroProximo(campanha, dono, hoste.posicao), ajustes.batalha, 'b').venci;
}

/** O valor de cada terra para ESTE estilo, da maior para a menor, e por id no empate. */
function porValor(
  oportunidades: readonly Oportunidade[],
  estilo: EstiloDeIa,
): readonly { oportunidade: Oportunidade; valor: number }[] {
  return oportunidades
    .map((oportunidade) => ({
      oportunidade,
      // Tudo em moedas por turno, que é a unidade em que o resto das decisões dela já pensa —
      // a mesma escolha que `valorDaObra` fez, e pelo mesmo motivo: dá para discutir o número
      // olhando para a renda de uma província.
      // ⚠️ **Aqui morava um preço fingido por conquista, e ele foi aposentado pela diplomacia.**
      // `custoDaConquista` existia para segurar um mapa onde todo mundo estava em guerra com
      // todo mundo desde o turno 1 — e, medido, se comportava como cara ou coroa: andar na
      // mesma direção dele dava 20 conquistas numa configuração e 105 na vizinha. Quem segura
      // o mapa agora é a decisão de DECLARAR, que é uma pergunta de verdade e aparece na tela.
      valor:
        oportunidade.renda +
        oportunidade.bemNovo +
        (oportunidade.capital ? estilo.valorDaCapital : 0),
    }))
    // Terra que não rende nada não é conquista: é fronteira nova para defender.
    .filter((a) => a.valor > 0)
    .sort(
      (a, b) =>
        b.valor - a.valor || a.oportunidade.provincia.localeCompare(b.oportunidade.provincia),
    );
}

/**
 * O maior destacamento que alcança este alvo E resolve alguma coisa lá. `null` quando nenhum.
 *
 * O MAIOR, e não o que baste: a força de um lado tem os homens ao quadrado dentro dela, e
 * mandar metade do exército duas vezes é mandar um quarto da força duas vezes.
 */
function hosteQueToma(
  campanha: Campanha,
  idPoder: string,
  alvo: Oportunidade,
  estilo: EstiloDeIa,
  ajustes: AjustesDeCombate,
  usadas: ReadonlySet<string>,
  naEstrada: number,
  /**
   * A ordem seria aceita agora?
   *
   * ⚠️ **É parâmetro porque esta conta tem dois usos, e só um deles vai dar a ordem.** Quem
   * ataca precisa que a marcha seja registrável hoje; quem está DECIDINDO DECLARAR GUERRA
   * pergunta *"se eu declarasse, eu tomaria?"* — e para esse a marcha é recusada justamente
   * por ainda não haver guerra. Sem separar, a IA nunca declararia guerra nenhuma.
   */
  podeIr: (idHoste: string, homens: number) => boolean,
  /**
   * Esta hoste CHEGA no alvo? Parâmetro pelo mesmo motivo que `podeIr`: são duas perguntas.
   *
   * Ataque e travessia podem conservar uma viagem de várias rodadas até o destino.
   */
  alcanca: (idHoste: string) => boolean,
): { hoste: string; homens: number; postura: Postura } | null {
  const deles = campanha.hostesEm(alvo.provincia).filter((h) => campanha.emGuerra(idPoder, h.poder));
  const sitiante = campanha.cercoEm(alvo.provincia)?.sitiante;
  if (sitiante && sitiante !== idPoder && !campanha.emGuerra(idPoder, sitiante)) return null;
  // A muralha decide se o assalto pode ser HOJE. Ela não impede a marcha: impede o assalto.
  const muralhaDeixa = campanha.assaltoEm(alvo.provincia).faltam === 0;

  let melhor: { hoste: string; homens: number; postura: Postura } | null = null;
  for (const hoste of campanha.hostes()) {
    if (hoste.poder !== idPoder || usadas.has(hoste.id)) continue;
    const emPe = campanha.forcaDaHoste(hoste.id);
    if (emPe <= 0) continue;
    // ⚠️ Só o destacamento marcha; o resto da hoste fica defendendo a origem, que é o que a
    // ordem de marcha já faz com os homens que ficam.
    const jaEmCampanha = campanha.donoDe(hoste.posicao) !== idPoder;
    const homens = jaEmCampanha ? emPe : Math.min(emPe, naEstrada);
    if (homens <= 0) continue;
    if (!alcanca(hoste.id)) continue;
    if (!podeIr(hoste.id, homens)) continue;
    // O destacamento leva uma parcela de cada contingente — `retirar` tira proporcionalmente
    // de cada terra natal e de cada arma —, e por isso encolher todos pela mesma fração é
    // exatamente o exército que vai chegar lá.
    const partem = { ...hoste, contingentes: escalar(hoste.contingentes, homens / emPe) };
    const postura = posturaQueToma(
      partem,
      deles,
      alvo,
      muralhaDeixa,
      estilo,
      ajustes.batalha,
      () =>
        // ⚠️ **Não se cerca uma cidade com menos gente do que ela tem em pé.** Sem esta linha a
        // IA acampava com 142 homens diante dos 415 milicianos de Atenas — e continuava lá no
        // turno 59, porque a fome do cerco derruba 1% da população por virada e a conta só
        // viraria depois de cento e cinquenta turnos. Três estátuas dessas consumiam a fatia que
        // podia marchar do mapa inteiro, e o resultado foi **3 conquistas em 100 turnos**: a IA
        // ficou menos agressiva por ter aprendido a sentar.
        homens > alvo.milicia &&
        aguentaOCerco(campanha, idPoder, jaEmCampanha ? 0 : homens, ajustes,
          campanha.assaltoEm(alvo.provincia).faltam + 1 + Math.ceil(
            (campanha.rotasLongasDaHoste(hoste.id).get(alvo.provincia)?.length ?? 0) / ajustes.saltosPorRodada,
          )) &&
        // Conta o socorro que consegue chegar durante o preparo.
        prever([partem], socorroProximo(campanha, alvo.dono, alvo.provincia), ajustes.batalha, 'b').venci,
    );
    if (postura === null) continue;
    if (melhor === null || homens > melhor.homens) melhor = { hoste: hoste.id, homens, postura };
  }
  return melhor;
}

/** Homens já fora do reino ou com saída ordenada nesta rodada. */
function emTerraAlheia(campanha: Campanha, idPoder: string): number {
  let total = 0;
  for (const hoste of campanha.hostes()) {
    if (hoste.poder !== idPoder) continue;
    const destino = campanha.ordemDaHoste(hoste.id)?.rota.at(-1);
    if (campanha.donoDe(hoste.posicao) === idPoder &&
        (!destino || campanha.donoDe(destino) === idPoder)) continue;
    total += campanha.forcaDaHoste(hoste.id);
  }
  return total;
}

/** Tropas do defensor que alcançam a cidade durante o preparo do assalto. */
function socorroProximo(campanha: Campanha, poder: string, provincia: string): readonly Exercito[] {
  const prazo = Math.max(1, campanha.assaltoEm(provincia).faltam + 1);
  return campanha.hostes().filter((h) => {
    if (h.poder !== poder) return false;
    if (h.posicao === provincia) return true;
    const rota = campanha.rotasLongasDaHoste(h.id).get(provincia);
    return rota !== undefined && rota.length <= prazo;
  });
}

function aguentaOCerco(
  campanha: Campanha,
  idPoder: string,
  homens: number,
  ajustes: AjustesDeCombate,
  prazo = 1,
): boolean {
  const saindo = campanha.hostes().filter((h) => h.poder === idPoder &&
    campanha.donoDe(h.posicao) === idPoder && campanha.ordemDaHoste(h.id)?.rota.some(
      (id) => campanha.donoDe(id) !== idPoder,
    )).reduce((s, h) => s + campanha.forcaDaHoste(h.id), 0);
  const aMais = (homens + saindo) * (ajustes.manutencaoPorHomem.emCampanha - ajustes.manutencaoPorHomem.emCasa);
  const deficit = campanha.manutencaoDe(idPoder) + aMais - campanha.rendaDe(idPoder);
  if (deficit <= 0) return true;
  // Guarda uma folha e exige caixa para a viagem e o preparo da cidade escolhida.
  const caixa = Math.max(0, campanha.tesouroDe(idPoder) - campanha.manutencaoDe(idPoder));
  return caixa >= deficit * Math.max(1, prazo);
}

/**
 * Com que postura esta hoste resolve esta terra — ou `null` se ela não resolve.
 *
 * As duas contas da conquista, na ordem em que a rodada as faz: **primeiro o campo, depois a
 * muralha, e a segunda com o que sobrou da primeira.** Se a segunda não fecha, ainda há a
 * terceira saída — acampar e esperar a cidade encolher —, e ela depende do cofre.
 */
function posturaQueToma(
  hoste: Exercito,
  deles: readonly Exercito[],
  alvo: Oportunidade,
  muralhaDeixa: boolean,
  estilo: EstiloDeIa,
  ajustes: AjustesDaBatalha,
  podeSentar: () => boolean,
): Postura | null {
  // Terra sem ninguém para fechar o portão cai ao primeiro ingresso, e não há o que prever.
  //
  // ⚠️ Postura `sitiar` mesmo assim, e de propósito: a postura é decidida com o que se vê
  // AGORA, e as ordens são simultâneas — se o dono mandar um exército para lá na mesma virada,
  // quem declarou assalto briga com ele e quem declarou cerco acampa. Contra uma província que
  // ia cair de graça, acampar é o erro barato.
  if (alvo.vazia && deles.length === 0) return 'sitiar';

  let campo: Previsao = { venci: true, sobra: 1 };
  if (deles.length > 0) {
    // O defensor segura o chão: ele leva o empate, exatamente como na resolução.
    campo = prever([hoste], deles, ajustes, 'b');
    if (!basta(campo, estilo)) return null;
  }

  // ⚠️ **O assalto luta com o que SOBROU do campo.** As perdas da batalha são proporcionais
  // entre os contingentes, então encolher cada um pela mesma fração é exato, e não estimativa.
  const muralha = preverAssalto(escalar(hoste.contingentes, campo.sobra), alvo.milicia, ajustes);
  // A praça cai HOJE quando as duas coisas valem: a conta do assalto fecha e a muralha deixa.
  const tomoHoje =
    basta({ venci: muralha.venci, sobra: campo.sobra * muralha.sobra }, estilo) && muralhaDeixa;
  // Não cai hoje: então é cerco, e cerco DURA — passa pelas travas de sentar. Vale tanto para a
  // cidade forte demais quanto para a que só está esperando as escadas: as duas deixam um
  // exército parado em terra alheia, e é isso que custa.
  if (!tomoHoje && !podeSentar()) return null;

  // Com exército alheio de pé ali, `assaltar` é o que faz o choque acontecer: sitiar é declarar
  // que não se quer lutar, e a hoste acamparia ao lado do inimigo sem tocá-lo. Vale mesmo quando
  // a praça não cai hoje — o choque acontece, e a cidade vira cerco por conta da regra.
  if (deles.length > 0) return 'assaltar';
  return tomoHoje ? 'assaltar' : 'sitiar';
}

/**
 * **Com o meu EXÉRCITO, eu tomo esta terra?**
 *
 * ⚠️ **Com o exército, e não com uma hoste — e essa distinção é a diferença entre uma IA
 * agressiva e uma que parece com medo.** Hoste nasce onde a leva é levantada: um poder com oito
 * províncias tem oito hostes de setecentos homens, e nenhuma delas toma uma cidade de
 * seiscentos milicianos. Medido no turno 151 de uma partida: Tebas com **6.099 homens** não
 * "tomava" Opunte, que tinha 200 milicianos — porque a pergunta estava sendo feita hoste a
 * hoste. Nenhum general do mundo pensa assim; quem tem seis mil homens junta os seis mil.
 *
 * Esta é a pergunta do PLANO: vale declarar, vale insistir, vale continuar a guerra. Quem
 * responde *"e já posso ir hoje?"* é `hosteQueToma`, dentro de `ataquesEscolhidos` — e é a
 * distância entre as duas respostas que faz a IA passar alguns turnos juntando o exército.
 *
 * ⚠️ **`continuando` é a pergunta da PAZ, e ela é outra.** Começar uma guerra pede a casa em
 * ordem e gente livre para sair; continuar uma só pergunta se ainda há o que tomar. Medido em 250
 * turnos, 29 de 37 pazes entre computadores eram o ATACANTE desistindo no turno em que declarou
 * ou no seguinte — 18 porque o inimigo tinha posto um barco de 85 homens na água em frente
 * ("ameaçado"), 11 porque o exército que já marchava deixava de contar como exército. A guerra
 * acabava antes da primeira batalha, e vinte turnos de trégua congelavam o par.
 */
export function valeAPena(
  campanha: Campanha,
  idPoder: string,
  alvo: Oportunidade,
  estilo: EstiloDeIa,
  ajustes: AjustesDeCombate,
  continuando = false,
): boolean {
  if (!continuando && estaAmeacado(campanha, idPoder)) return false;
  const emPe = forcaTotalDe(campanha, idPoder);
  // Quem já está em campo é o exército que toma; só para COMEÇAR ele deixa de estar livre.
  const naEstrada =
    Math.floor(emPe * estilo.fracaoQueMarcha) -
    (continuando ? 0 : emTerraAlheia(campanha, idPoder));
  if (naEstrada <= 0 || emPe <= 0) return false;

  // Todas as minhas hostes como um exército só, encolhido à fatia que pode sair de casa.
  const meu = campanha.hostes().filter((h) => h.poder === idPoder &&
    (h.posicao === alvo.provincia || campanha.rotasLongasDaHoste(h.id).has(alvo.provincia)));
  const juntos = escalar(
    meu.flatMap((h) => h.contingentes),
    Math.min(1, naEstrada / emPe),
  );
  if (juntos.length === 0) return false;
  const exercito = { ...meu[0]!, contingentes: juntos };
  const deles = campanha.hostesEm(alvo.provincia).filter((h) => campanha.emGuerra(idPoder, h.poder) || h.poder === alvo.dono);
  const muralhaDeixa = campanha.assaltoEm(alvo.provincia).faltam === 0;
  return (
    posturaQueToma(exercito, deles, alvo, muralhaDeixa, estilo, ajustes.batalha, () =>
      juntos.reduce((s, c) => s + c.homens, 0) > alvo.milicia &&
      aguentaOCerco(campanha, idPoder, continuando ? 0 : naEstrada, ajustes,
        campanha.assaltoEm(alvo.provincia).faltam + 1) &&
      prever([exercito], socorroProximo(campanha, alvo.dono, alvo.provincia), ajustes.batalha, 'b').venci,
    ) !== null
  );
}

/**
 * JUNTAR O EXÉRCITO — as marchas dentro de casa que precedem a campanha.
 *
 * ⚠️ **Sem isto a IA nunca ataca nada que valha a pena.** Hoste nasce onde a leva é levantada,
 * e um poder com oito províncias tem oito exércitos pequenos em vez de um grande. Ela declarava
 * a guerra que o plano aprovava e depois não achava uma hoste capaz de executar o plano — e
 * ficava parada, com seis mil homens espalhados, olhando uma cidade de duzentos milicianos.
 *
 * A regra é a de qualquer general: **quem tem um alvo e não o toma hoje, junta o exército no
 * ponto mais perto dele.** Marchar dentro do próprio reino não pede guerra nenhuma e não gasta
 * a fatia que pode sair de casa; o que ela gasta é a rodada da hoste, e é por isso que a
 * concentração vem depois das ordens de defesa e ataque.
 *
 * O ponto de encontro é a terra própria escolhida junto do objetivo militar: a fronteira ou
 * o porto de saída. O plano conserva esse ponto enquanto o alvo e o caminho forem válidos.
 */
export function concentracoesEscolhidas(
  campanha: Campanha,
  idPoder: string,
  estilo: EstiloDeIa,
  jaMandadas: ReadonlySet<string>,
): readonly { hoste: string; destino: string; homens: number }[] {
  const objetivo = campanha.objetivoMilitarDe(idPoder) ?? objetivoEscolhido(campanha, idPoder, estilo);
  if (!objetivo) return [];
  const ponto = objetivo.ponto;

  const ordens: { hoste: string; destino: string; homens: number }[] = [];
  for (const hoste of campanha.hostes()) {
    if (hoste.poder !== idPoder || jaMandadas.has(hoste.id)) continue;
    if (hoste.posicao === ponto) continue;
    // ⚠️ Só quem está em casa se junta: quem já está em campanha tem trabalho a fazer lá, e
    // mandá-lo voltar seria desfazer o cerco que ele está segurando.
    if (campanha.donoDe(hoste.posicao) !== idPoder) continue;
    const homens = campanha.forcaDaHoste(hoste.id);
    if (homens <= 0) continue;
    if (!campanha.rotasLongasDaHoste(hoste.id).has(ponto)) continue;
    if (!campanha.podeOrdenarMarcha(hoste.id, ponto, homens, idPoder).pode) continue;
    ordens.push({ hoste: hoste.id, destino: ponto, homens });
  }
  return ordens;
}

/** Ganhou, e ficou de pé o bastante para o estilo topar a briga. */
function basta(previsao: Previsao, estilo: EstiloDeIa): boolean {
  return previsao.venci && previsao.sobra >= estilo.sobraMinima;
}

/** O mesmo exército depois de perder esta fração — proporcional, como a batalha perde. */
function escalar(contingentes: readonly Contingente[], sobra: number): Contingente[] {
  return contingentes
    .map((c) => ({ ...c, homens: Math.floor(c.homens * sobra) }))
    .filter((c) => c.homens > 0);
}
