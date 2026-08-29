/**
 * A IA defendendo o que é dela — **e só isso.**
 *
 * ⚠️ **Regra dura DESTE ARQUIVO: nenhuma hoste dele pisa em terra alheia.** Socorrer é marchar
 * para uma província SUA que está com inimigo em cima. Atacar mora em `marchar.ts`, e a
 * separação não é arrumação: enquanto a IA só reagia, cada defeito dela aparecia numa província
 * e não numa guerra em cascata pelo mapa inteiro — foi assim que os seis da etapa 2 foram
 * achados. Misturar as duas aqui apagaria a fronteira que torna isso possível de novo.
 *
 * Quatro reações, e **as quatro só saem se a conta fechar**:
 *
 * 1. **Socorro à terra invadida.** Inimigo acampado numa terra minha chama a hoste que o
 *    alcance sem sair do reino.
 * 2. **Socorro à cidade SITIADA.** ⚠️ Faltava, e era um buraco grande: toda ameaça sitiada
 *    pulava direto para a próxima, então uma capital cercada com oitocentos homens na
 *    província vizinha recebia **zero ordens**. Cidade sitiada é justamente a que mais precisa
 *    de gente vindo de fora — quem está dentro não pode sair sem perder o muro.
 * 3. **Surtida.** Cidade minha sitiada, com guarnição que GANHA de quem senta na porta, sai
 *    para lutar. Ficar dentro esperando é entregar a praça à fome do cerco.
 * 4. **Interceptação no mar.** Expedição inimiga parada na água que ENCOSTA no meu chão é
 *    desembarque a caminho; se eu ganho dela lá, eu vou.
 *
 * ⚠️ **A quarta não fura a regra dura: água não é terra alheia.** Zona marítima não tem dono,
 * não se conquista e não se sitia — sair para ela continua sendo defender, e é a única saída
 * de casa que este arquivo autoriza. Antes dela a IA só reagia depois que o inimigo já estava
 * pisando na província: quem escolhia o lugar do desembarque era sempre o invasor, e ele
 * escolhia a terra mais fraca. Era o que faltava para o mar ser DISPUTADO em vez de uma
 * estrada vazia — a batalha na água só acontecia quando duas expedições se cruzavam por acaso.
 *
 * ⚠️ **Quem não tem Porto não disputa o mar, e isso cai sozinho.** A interceptação usa
 * `alcanceDaHoste`, e embarcar exige Porto na terra de onde se sai: um reino sem cais vê a
 * frota passar e espera na praia. É a quarta razão de existir da obra, e não precisou de
 * regra nova.
 *
 * ⚠️ **"Ganha" é previsto com a função que decide a batalha**, e não comparando cabeças. A
 * primeira versão comparava número de homens, e 501 leves contra 500 arqueiros parecia
 * vantagem — o arqueiro vale 1,33 em campo contra 1,00 do leve, e a guarnição saía para morrer
 * fora do muro. Ver `percepcao/prever.ts`.
 *
 * ⚠️ **Uma ordem por hoste por rodada**, e é regra do jogo, não escolha da IA: a hoste que já
 * recebeu ordem sai da lista antes de a próxima ameaça ser atendida.
 */

import type { Campanha } from '@/campanha/campanha';
import type { Ajustes } from '@/dados/esquema';
import { ameacasDe } from '../percepcao/ameaca';
import { venceria } from '../percepcao/prever';

type AjustesDaBatalha = Ajustes['jogo']['combate']['batalha'];

/** Uma ordem defensiva que a IA daria agora. */
export interface OrdemDefensiva {
  hoste: string;
  /** Para onde ela marcha. Igual à posição atual quer dizer surtida. */
  destino: string;
  homens: number;
  tipo: 'socorro' | 'surtida' | 'intercepcao';
}

/** O que este poder mandaria as hostes dele fazerem AGORA, em defesa. */
export function defesasEscolhidas(
  campanha: Campanha,
  idPoder: string,
  ajustes: AjustesDaBatalha,
): readonly OrdemDefensiva[] {
  const ordens: OrdemDefensiva[] = [];
  const jaMandada = new Set<string>();

  for (const ameaca of ameacasDe(campanha, idPoder)) {
    const inimigas = campanha
      .hostesEm(ameaca.provincia)
      .filter((h) => h.poder !== idPoder);

    // ── Quem já está lá dentro: sai para lutar, mas só se ganhar ─────────────────────
    if (ameaca.sitiada) {
      for (const hoste of campanha.hostesEm(ameaca.provincia)) {
        if (hoste.poder !== idPoder || jaMandada.has(hoste.id)) continue;
        // ⚠️ Surtida perdida é a guarnição inteira morrendo fora do muro, e a cidade caindo no
        // turno seguinte sem ninguém para fechar o portão. O desempate vai para quem sai,
        // porque quem senta na porta perde o cerco ao ser barrado.
        if (!venceria([hoste], inimigas, ajustes, 'a')) continue;
        if (!campanha.podeSurtir(hoste.id, idPoder).pode) continue;
        jaMandada.add(hoste.id);
        ordens.push({
          hoste: hoste.id,
          destino: ameaca.provincia,
          homens: campanha.forcaDaHoste(hoste.id),
          tipo: 'surtida',
        });
      }
    }

    // ── E quem está de fora marcha para lá, sitiada ou não ───────────────────────────
    //
    // ⚠️ **Vale TAMBÉM para a cidade sitiada**, e é o conserto do buraco: quem está trancado
    // dentro não pode sair sem perder o muro, então o socorro tem que vir de fora. Antes, a
    // ameaça sitiada pulava direto para a próxima e a capital cercada não recebia ordem
    // nenhuma com o exército parado na província ao lado.
    const socorro = hosteQueSocorre(campanha, idPoder, ameaca.provincia, ajustes, jaMandada);
    if (socorro === null) continue;
    jaMandada.add(socorro.hoste);
    ordens.push({ ...socorro, destino: ameaca.provincia, tipo: 'socorro' });
  }

  // ── E a água que encosta em mim: barrar o desembarque ANTES da praia ─────────────────
  //
  // Depois das ameaças em terra de propósito: inimigo já pisando na minha província é problema
  // de hoje, e expedição na água é o de amanhã. A hoste é a mesma, e quem está dentro decide
  // primeiro.
  for (const zona of aguasAmeacadas(campanha, idPoder)) {
    const guarda = hosteQueIntercepta(campanha, idPoder, zona, ajustes, jaMandada);
    if (guarda === null) continue;
    jaMandada.add(guarda.hoste);
    ordens.push({ ...guarda, destino: zona, tipo: 'intercepcao' });
  }
  return ordens;
}

/**
 * As zonas de mar com expedição inimiga parada nelas **que encostam no meu chão**, por id.
 *
 * ⚠️ **Encostar na minha costa é a régua inteira, e ela é estreita de propósito.** Sem isso a
 * IA sairia caçando expedição alheia pelo Egeu inteiro — e uma frota atravessando de Rodes a
 * Corcira não é ameaça a ninguém no caminho. O que se defende aqui é a praia: quem está na
 * água ao lado da minha terra desembarca nela na virada seguinte, e depois dela a escolha do
 * lugar já foi dele.
 */
function aguasAmeacadas(campanha: Campanha, idPoder: string): readonly string[] {
  const minhas = new Set(campanha.provinciasDe(idPoder));
  const zonas = new Set<string>();
  for (const hoste of campanha.hostes()) {
    if (hoste.poder === idPoder) continue;
    if (!campanha.ehMar(hoste.posicao)) continue;
    // Sem guerra não há batalha na água — o choque pergunta pela guerra antes de emparelhar.
    // Mandar hoste contra quem está em paz seria pagar folha de campanha por nada.
    if (!campanha.emGuerra(idPoder, hoste.poder)) continue;
    if (campanha.forcaDaHoste(hoste.id) <= 0) continue;
    if (!campanha.vizinhasDe(hoste.posicao).some((v) => minhas.has(v))) continue;
    zonas.add(hoste.posicao);
  }
  return [...zonas].sort();
}

/**
 * A hoste que vale a pena mandar para esta água — a maior que alcança e que GANHA.
 *
 * Mesma régua do socorro, e pelas mesmas razões: a maior porque reforço em menor número morre
 * junto, e `venceria` porque comparar cabeças faz a guarnição sair para morrer fora do muro.
 *
 * ⚠️ **No mar não há milícia, não há muralha e não há praça a segurar.** É a batalha mais
 * limpa do jogo — só os dois exércitos —, e por isso a previsão aqui vale mais do que em
 * qualquer outro lugar: não há terreno para desmentir a conta.
 *
 * ⚠️ **O desempate vai para quem já está na água**, e não para quem chega: no mar ninguém
 * segura chão nenhum, então quem estava ali é o que mais se aproxima de um defensor.
 */
function hosteQueIntercepta(
  campanha: Campanha,
  idPoder: string,
  zona: string,
  ajustes: AjustesDaBatalha,
  jaMandada: ReadonlySet<string>,
): { hoste: string; homens: number } | null {
  const deles = campanha
    .hostesEm(zona)
    .filter((h) => h.poder !== idPoder && campanha.emGuerra(idPoder, h.poder));
  const jaLa = campanha.hostesEm(zona).filter((h) => h.poder === idPoder && !jaMandada.has(h.id));

  let melhor: { hoste: string; homens: number } | null = null;
  for (const hoste of campanha.hostes()) {
    if (hoste.poder !== idPoder || jaMandada.has(hoste.id)) continue;
    if (hoste.posicao === zona) continue;
    // ⚠️ Sai de casa ou da própria água — nunca de terra alheia. A regra dura deste arquivo
    // continua de pé: quem está sitiando uma cidade não larga o cerco para ir ao mar.
    if (campanha.donoDe(hoste.posicao) !== idPoder && !campanha.ehMar(hoste.posicao)) continue;
    if (!campanha.alcanceDaHoste(hoste.id).includes(zona)) continue;
    const homens = campanha.forcaDaHoste(hoste.id);
    if (homens <= 0) continue;
    if (!campanha.podeOrdenarMarcha(hoste.id, zona, homens, idPoder).pode) continue;
    if (!venceria([hoste, ...jaLa], deles, ajustes, 'b')) continue;
    if (melhor === null || homens > melhor.homens) melhor = { hoste: hoste.id, homens };
  }
  return melhor;
}

/**
 * A hoste que vale a pena mandar para este lugar — a maior que alcança e que GANHA.
 *
 * A maior e não a mais perto: socorro que chega em menor número é reforço que morre junto. E
 * `alcanceDaHoste` já responde por onde ela pode ir — a IA não recalcula geografia, pergunta.
 *
 * ⚠️ **Conta com quem já está lá dentro.** O socorro não briga sozinho: ele soma à guarnição
 * que resistiu. Ignorar isso faria a IA recusar reforço que decidiria a batalha.
 */
function hosteQueSocorre(
  campanha: Campanha,
  idPoder: string,
  destino: string,
  ajustes: AjustesDaBatalha,
  jaMandada: ReadonlySet<string>,
): { hoste: string; homens: number } | null {
  const deles = campanha.hostesEm(destino).filter((h) => h.poder !== idPoder);
  const dentro = campanha
    .hostesEm(destino)
    .filter((h) => h.poder === idPoder && !jaMandada.has(h.id));

  let melhor: { hoste: string; homens: number } | null = null;
  for (const hoste of campanha.hostes()) {
    if (hoste.poder !== idPoder || jaMandada.has(hoste.id)) continue;
    if (hoste.posicao === destino) continue;
    // ⚠️ Nada de pisar em terra alheia nesta etapa: a hoste só se move dentro do reino.
    if (campanha.donoDe(hoste.posicao) !== idPoder) continue;
    if (!campanha.alcanceDaHoste(hoste.id).includes(destino)) continue;
    const homens = campanha.forcaDaHoste(hoste.id);
    if (homens <= 0) continue;
    if (!campanha.podeOrdenarMarcha(hoste.id, destino, homens, idPoder).pode) continue;
    // O socorro chega e briga junto com quem está lá: a conta é dos dois contra o invasor. O
    // desempate vai para o defensor, que é quem segura o chão.
    if (!venceria([hoste, ...dentro], deles, ajustes, 'a')) continue;
    if (melhor === null || homens > melhor.homens) melhor = { hoste: hoste.id, homens };
  }
  return melhor;
}
