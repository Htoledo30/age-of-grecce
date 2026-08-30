/**
 * A rodada de movimento e guerra: a campanha entrega ao resolvedor o que só ela sabe.
 *
 * `movimento/resolucao/` não conhece economia, humor nem construção — ele pergunta. Este
 * arquivo é a lista completa dessas perguntas, e por isso é aqui que se vê o que a guerra
 * depende do resto do jogo.
 */

import { resolverRodada } from '@/movimento/resolucao/resolver-rodada';
import type { RelatorioDaRodada } from '@/movimento/resolucao/relatorio';
import { mortosDaMilicia } from '@/combate/milicia';
import type { NucleoDaCampanha } from '../nucleo';
import { donoDe, populacaoDe } from '../provincia/consultas';
import { conquistar } from '../provincia/posse';
import { rodadasParaAssaltarEm } from '../guerra/cercos';
import { abalarRelacao, emGuerra } from '../diplomacia/relacoes';
import { temAcessoA } from '../diplomacia/acesso-militar';
import { miliciaEm } from '../guerra/defesa-local';
import { saquearProvincia } from '../guerra/saque';
import { rotasLongasDaHoste } from '../guerra/marchas';

/**
 * Reconfere viagens antes de cada trecho. Uma conquista, uma paz ou a perda de um Porto pode
 * invalidar o caminho que era verdadeiro quando a ordem foi dada; nesse caso a hoste para.
 */
function atualizarViagens(nucleo: NucleoDaCampanha): void {
  for (const [idHoste, ordem] of Object.entries(nucleo.estado.ordens)) {
    if (!ordem.continuar) continue;
    const hoste = nucleo.mobilizacao.hoste(idHoste);
    const destinoFinal = ordem.rota.at(-1);
    if (!hoste || !destinoFinal) {
      delete nucleo.estado.ordens[idHoste];
      continue;
    }
    const donoDoDestino = donoDe(nucleo, destinoFinal);
    // ⚠️ **As chaves são as MESMAS de `podeOrdenarMarcha`, e a licença é uma delas.**
    // Sem ela as duas portas discordavam: a ordem para uma terra que abriu a estrada era aceita
    // no clique e apagada em silêncio na virada seguinte — e como só a viagem do JOGADOR chega
    // aqui (a IA refaz tudo todo turno), quem via o exército parar sem explicação era ele.
    const podeEntrar =
      nucleo.atlas.ehMar(destinoFinal) ||
      donoDoDestino === hoste.poder ||
      emGuerra(nucleo, hoste.poder, donoDoDestino) ||
      temAcessoA(nucleo, hoste.poder, donoDoDestino);
    const rotaAtual = podeEntrar
      ? rotasLongasDaHoste(nucleo, idHoste).get(destinoFinal)
      : undefined;
    if (!rotaAtual) {
      delete nucleo.estado.ordens[idHoste];
      continue;
    }
    nucleo.estado.ordens[idHoste] = {
      ...ordem,
      origem: hoste.posicao,
      rota: rotaAtual,
      homens: Math.min(ordem.homens, nucleo.mobilizacao.forcaDaHoste(idHoste)),
    };
  }
}

export function resolverMarchas(nucleo: NucleoDaCampanha): RelatorioDaRodada {
  atualizarViagens(nucleo);
  const ajustes = nucleo.ajustes.diplomacia.choque;
  return resolverRodada(nucleo.estado, nucleo.ajustes.combate, {
    batalha: nucleo.ajustes.combate.batalha,
    donoDe: (id) => donoDe(nucleo, id),
    emGuerra: (a, b) => emGuerra(nucleo, a, b),
    miliciaDe: (id) => miliciaEm(nucleo, id),
    ehMar: (id) => nucleo.atlas.ehMar(id),
    rodadasParaAssaltar: (id) => rodadasParaAssaltarEm(nucleo, id),
    // ⚠️ Quebrar custa o EXÉRCITO, não a geração: quem escapou da perseguição volta para a
    // terra natal e torna a pagar tributo e a poder ser recrutado. Sem isto, perder uma
    // batalha apagava aqueles homens do mundo — e a província que levantou a leva pagava
    // duas vezes, na hora de recrutar e de novo na hora de perder.
    // ⚠️ **É a última província que decide o recuo.** Com duas ou mais terras ligadas o
    // exército sai inteiro e continua sendo um exército; na última não há para onde ir, e ele
    // se desfaz — os homens voltam à população em vez de morrer na perseguição. Vizinha por
    // GEOGRAFIA e posse, a mesma pergunta que a rede de trocas e a corrupção já fazem.
    refugio: (provincia, poder) =>
      nucleo.atlas
        .provincia(provincia)
        .vizinhas.filter((vizinha) => donoDe(nucleo, vizinha) === poder)
        .sort()[0] ?? null,
    dispersaram: (porOrigem) => {
      for (const [terra, quantos] of Object.entries(porOrigem)) {
        nucleo.estado.populacao[terra] = populacaoDe(nucleo, terra) + quantos;
      }
    },
    miliciaPerdida: (id, perdidos) => {
      // ⚠️ Só os MORTOS saem da população; o resto dispersa e volta pra casa. Aniquilar a
      // milícia inteira arruinaria a província pro resto da campanha — são os mesmos
      // lavradores que pagam tributo e que forneceriam recruta.
      const mortos = mortosDaMilicia(perdidos, nucleo.ajustes.combate);
      nucleo.estado.populacao[id] = Math.max(0, populacaoDe(nucleo, id) - mortos);
    },
    // A conquista passa pela MESMA primitiva de sempre: índice reverso e tabela de donos
    // consertados juntos, sem um segundo caminho que possa discordar.
    trocarDono: (id, poder) => conquistar(nucleo, id, poder),
    // ⚠️ Só o ASSALTO chega aqui. Entrar numa cidade vazia não mata civil nem derruba obra:
    // não houve luta. Ver `guerra/saque.ts` para o que se perde e por quê.
    saquear: (id) => {
      // ⚠️ **Tomar a cidade à força abala a opinião de quem a perdeu**, e é o mesmo choque que
      // a conquista já dá no humor do povo. Some devagar se você não repetir — quem caminha
      // para o alvo esquece, e o alvo já conta a terra que ficou na sua mão.
      abalarRelacao(nucleo, donoDe(nucleo, id), nucleo.atlas.donoInicial(id), ajustes.conquista);
      return saquearProvincia(nucleo, id);
    },
  });
}
