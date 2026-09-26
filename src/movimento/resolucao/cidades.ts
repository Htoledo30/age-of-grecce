/**
 * AS CIDADES — o que acontece com quem ficou de pé em terra alheia.
 *
 * Substituiu a conquista instantânea, e a diferença é o jogo inteiro: antes, sobrar de pé numa
 * província alheia era ser dono dela. Agora sobrar de pé é ficar com o CAMPO, e a cidade
 * continua sendo um problema por resolver.
 *
 * ⚠️ **Província alheia realmente vazia continua caindo sem batalha.** Sem gente não há quem
 * feche portão nenhum — é fronteira desprotegida, e é o que dá peso a decidir se a guarnição
 * marcha ou fica.
 */

import { rodadasAteOAssalto } from '@/combate/cerco';
import type { Cerco, Postura } from '@/combate/cerco';
import { assaltar } from './assalto';
import type { EstadoDaResolucao, MundoDaResolucao, RelatorioEmConstrucao } from './relatorio';

export function resolverCidades(
  estado: EstadoDaResolucao,
  mundo: MundoDaResolucao,
  posturas: Map<string, Postura>,
  relatorio: RelatorioEmConstrucao,
): void {
  // Quem está em cada província depois da marcha. O cerco depende disto: ele acaba quando o
  // SITIANTE sai, não quando o dono aparece — e agora os dois podem estar ali ao mesmo tempo,
  // porque sitiar deixou de obrigar o choque.
  const presentes = new Map<string, string[]>();
  for (const idHoste of Object.keys(estado.hostes).sort()) {
    const hoste = estado.hostes[idHoste];
    if (!hoste) continue;
    const lista = presentes.get(hoste.posicao) ?? [];
    lista.push(hoste.poder);
    presentes.set(hoste.posicao, lista);
  }
  const estaAli = (provincia: string, poder: string | undefined): boolean =>
    poder !== undefined && (presentes.get(provincia) ?? []).includes(poder);

  // ⚠️ **Os cercos de ANTES desta varredura**, guardados à parte porque o laço reescreve
  // `estado.cercos` enquanto anda. Sem a foto, a contagem de rodadas leria o que ela mesma
  // acabou de escrever — e dois exércitos sentados na mesma cidade fariam o relógio andar duas
  // vezes numa rodada só.
  const antes = { ...estado.cercos };

  // ⚠️ **E a foto dos DONOS, pelo mesmo motivo.** O laço troca o dono da província enquanto
  // anda, e sem a foto o ex-dono vira estrangeiro no meio da varredura: a cidade caía e era
  // retomada na mesma rodada, com a crônica escrevendo as duas conquistas. Uma província muda
  // de mão UMA vez por rodada — quem quiser de volta marcha na próxima.
  const donoNoInicio = new Map<string, string>();
  for (const idHoste of Object.keys(estado.hostes)) {
    const hoste = estado.hostes[idHoste];
    if (hoste) donoNoInicio.set(hoste.posicao, mundo.donoDe(hoste.posicao));
  }
  const donoDe = (provincia: string): string =>
    donoNoInicio.get(provincia) ?? mundo.donoDe(provincia);

  // ⚠️ **Um caminho só para apagar cerco**, e ele conta a notícia junto. O cerco morre em três
  // lugares diferentes — o sitiante saiu, o assalto foi rechaçado, a cidade caiu — e com três
  // `delete` soltos a crônica ia esquecer de um deles em silêncio.
  const levantar = (provincia: string): void => {
    const cerco = estado.cercos[provincia];
    if (!cerco) return;
    delete estado.cercos[provincia];
    relatorio.cercosLevantados.push({ provincia, sitiante: cerco.sitiante });
  };

  /**
   * A praça muda de mão. `aForca` diz se houve assalto — e é só ele que saqueia.
   *
   * ⚠️ Cidade que cai sem ninguém em pé não perde nada: não houve luta, não há o que
   * destruir. É essa diferença que dá dois preços a "sitiar ou assaltar?".
   */
  const tomadas = new Set<string>();
  const tomar = (provincia: string, poder: string, aForca = false): void => {
    tomadas.add(provincia);
    const de = mundo.donoDe(provincia);
    mundo.trocarDono(provincia, poder);
    relatorio.conquistas.push({ provincia, de, para: poder });
    // Depois da troca de dono, e de propósito: os mortos e o entulho ficam onde estão, e quem
    // herda a cidade herda o estrago.
    if (aForca) relatorio.saques.push(mundo.saquear(provincia));
    delete estado.cercos[provincia];
  };

  // Por hoste e nao por provincia: a chave mudou, e o lugar agora vive dentro dela.
  for (const idHoste of Object.keys(estado.hostes).sort()) {
    const hoste = estado.hostes[idHoste];
    if (!hoste) continue;
    const provincia = hoste.posicao;

    // Terra própria: o cerco acaba se o sitiante não estiver mais aqui — ele marchou embora,
    // morreu, ou foi expulso. Levantar o cerco é consequência, não regra separada.
    //
    // ⚠️ **Chegar não basta para levantá-lo.** Antes, a presença do dono apagava o cerco na
    // hora, porque era impossível os dois estarem no mesmo lugar: o choque sempre resolvia isso
    // antes. Agora o sitiante pode continuar acampado com o exército do dono do lado, e apagar
    // o cerco aqui teria dado ao defensor uma forma de quebrá-lo sem lutar — bastava mandar
    // qualquer hoste voltar para casa.
    if (hoste.poder === donoDe(provincia)) {
      if (!estaAli(provincia, estado.cercos[provincia]?.sitiante)) levantar(provincia);
      continue;
    }

    // ⚠️ **Exército parado em terra de quem não é inimigo não faz nada.** Acontece quando a paz
    // é assinada com a tropa ainda acampada lá: sem esta linha ela continuaria sitiando, e uma
    // cidade sem milícia CAIRIA para um poder em paz com o dono dela. A paz já levanta o cerco
    // — isto é a segunda tranca, do lado da regra, porque é a regra que muda o mapa.
    if (!mundo.emGuerra(hoste.poder, donoDe(provincia))) continue;

    // ⚠️ **A cidade que já caiu nesta rodada não cai de novo.** Com a foto dos donos, dois
    // aliados em guerra com o mesmo dono entravam juntos numa praça sem milícia, e o segundo a
    // tomava do primeiro na mesma rodada — sem estar em guerra com ele.
    if (tomadas.has(provincia)) continue;

    const milicianos = mundo.miliciaDe(provincia);
    // Cidade sem quem feche o portão cai ao primeiro ingresso — mas exército do dono acampado
    // ali É quem fecha o portão, mesmo com a milícia zerada. Sem esta condição, sentar numa
    // província despovoada tomava a cidade por cima do exército que a defendia.
    if (milicianos <= 0 && !estaAli(provincia, donoDe(provincia))) {
      tomar(provincia, hoste.poder);
      continue;
    }

    // A ordem desta rodada manda; sem ordem, o cerco em curso continua como estava; sem nem uma
    // coisa nem outra, senta-se. Sitiar é o padrão de propósito: quem chegou sem dizer nada não
    // joga o exército contra a muralha por conta própria.
    const cerco = antes[provincia];
    const meu = cerco !== undefined && cerco.sitiante === hoste.poder;
    const pedida = posturas.get(provincia) ?? (meu ? cerco.postura : 'sitiar');

    // ⚠️ **A MURALHA BARRA O ASSALTO DE HOJE, e o que sobra é sentar.** Cidade aberta cai no
    // primeiro assalto; contra a fortificada é preciso ter passado algumas rodadas na frente
    // dela. A regra vive aqui e não só na interface porque a postura também chega pela ordem de
    // marcha — e uma ordem que a tela não deixaria dar continuaria podendo vir da IA, de um
    // salvamento antigo ou do gancho de inspeção.
    const faltam = rodadasAteOAssalto(
      mundo.rodadasParaAssaltar(provincia),
      meu ? cerco.rodadas : 0,
    );
    // ⚠️ **O assalto só sai se o CAMPO já foi ganho.** Quem quis assaltar já brigou no passo
    // anterior, contra a guarnição e contra qualquer outro invasor; chegar aqui com um deles
    // ainda de pé quer dizer que aquele choque não decidiu nada. Não se sobe a muralha com
    // exército inimigo intacto nas costas — senta-se, e tenta-se de novo na rodada seguinte.
    //
    // A regra faltava porque era impossível chegar a esta situação: o choque sempre aniquilava
    // um dos lados. Com choque e perseguição, um EMPATE deixa os dois de pé — e sem estas duas
    // linhas o invasor tomava a cidade por cima do exército que acabara de segurá-lo, e dois
    // invasores empatados assaltavam a mesma praça na mesma rodada, um tomando e o outro
    // retomando.
    const naProvincia = presentes.get(provincia) ?? [];
    const invasores = new Set(naProvincia.filter((p) => p !== donoDe(provincia)));
    const defensorDePe = naProvincia.includes(donoDe(provincia));
    const campoIndeciso = invasores.size > 1 || defensorDePe;
    const postura: Postura =
      pedida === 'assaltar' && (faltam > 0 || campoIndeciso) ? 'sitiar' : pedida;

    if (postura === 'assaltar') {
      assaltar(estado, provincia, hoste, milicianos, mundo, relatorio, tomar, levantar);
      continue;
    }

    // ⚠️ **Sitiar NUNCA toma a cidade.** O exército acampa na divisa e fica. Enquanto estiver
    // ali a província não produz nem comercia — e é só isso que o cerco faz. Quem toma é o
    // assalto, e é essa separação que dá sentido a ter duas posturas: antes o cerco acumulava
    // progresso e abria os portões sozinho, o que fazia dele um assalto lento em vez de outra
    // coisa.
    // O relógio anda com o cerco: mais uma rodada para quem já estava sentado aqui, e zero para
    // quem acabou de chegar ou tomou o lugar de outro sitiante. Herdar o tempo do exército
    // anterior daria a praça de graça a quem chegasse depois do trabalho feito.
    const atual: Cerco = {
      sitiante: hoste.poder,
      postura: 'sitiar',
      rodadas: meu ? cerco.rodadas + 1 : 0,
    };
    estado.cercos[provincia] = atual;
    relatorio.cercos.push({ provincia, sitiante: hoste.poder, postura: 'sitiar', novo: !meu });
  }

  // Cerco sem sitiante em cima não existe: quem marchou embora ou morreu soltou a cidade.
  for (const provincia of Object.keys(estado.cercos)) {
    const sitiante = estado.cercos[provincia]?.sitiante;
    const emCima = Object.values(estado.hostes).some(
      (h) => h.posicao === provincia && h.poder === sitiante,
    );
    if (!emCima) levantar(provincia);
  }
}
