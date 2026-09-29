/**
 * A IA escolhendo com quem se ALIAR — **e o que ela pesa, porque aliança é um pacto caro.**
 *
 * ⚠️ **Aliança não é um pacto melhor, é um pacto que obriga.** Ela te põe nas guerras do outro
 * sem perguntar, e por isso uma IA que assinasse aliança sempre que a opinião permitisse
 * estaria comprando guerras alheias de graça. O pacto continua sendo a resposta certa para
 * quase todo mundo: ele custa nada e já garante a fronteira.
 *
 * A BALANÇA (ver `balanca.ts`) começa com um custo fixo — a guerra emprestada — e só fecha
 * quando alguma razão o cobre:
 *
 * - **o inimigo em comum** — os dois já sangram contra o mesmo reino. É a aliança de
 *   conveniência, e a razão mais honesta que este jogo sabe produzir: nasce da guerra de um
 *   terceiro e morre com ela;
 * - **a proteção** — ele está ameaçado e você é mais forte. É a aliança do fraco, e é o que dá
 *   a um reino pequeno uma resposta que não seja pagar tributo ou morrer;
 * - **a confiança**, que sozinha só chega lá quando é muito alta.
 *
 * E o que pesa contra: as SUAS guerras, que ele herdaria; a sua fraqueza, se você não segura a
 * própria terra; a cobiça, se ele tem terra sua que vale a marcha; o temperamento; e o prazo.
 *
 * ⚠️ **Antes havia um PORTÃO de razão (`temRazaoParaAliar`) que a IA exigia de si mesma e
 * pulava quando a proposta vinha do jogador** — ele só precisava de opinião. A balança é uma
 * só nas duas direções: a razão virou parcela, e o portão virou a `iniciativa` de quem propõe.
 */

import type { Campanha } from '@/campanha/campanha';
import type { Ajustes, EstiloDeIa, Ia } from '@/dados/esquema';
import { estiloDe } from '../estilo';
import { forcaTotalDe } from '../percepcao/ameaca';
import { oportunidadesAlcancaveis } from '../percepcao/oportunidade';
import {
  type Balanca,
  type ExtrasDaBalanca,
  type Lados,
  cobica,
  cobicadasPor,
  confianca,
  fraquezaSua,
  inimigoEmComum,
  ouro,
  patrocinio,
  pesar,
  prazo,
  prazoMaisCurto,
  protecao,
  suasGuerras,
  temperamento,
} from './balanca';

type AjustesDoJogo = Ajustes['jogo'];

/**
 * A balança de `ele` diante de uma aliança de `turnos` proposta por `voce`.
 *
 * A MESMA função na mesa, no clique e entre computadores. Não há segunda pergunta.
 */
export function balancaDaAlianca(
  campanha: Campanha,
  lados: Lados,
  turnos: number,
  estilo: EstiloDeIa,
  ajustes: AjustesDoJogo,
  extras: ExtrasDaBalanca = {},
): Balanca {
  const d = ajustes.diplomacia.balanca.alianca;
  return pesar([
    confianca(campanha, lados, estilo),
    temperamento(estilo),
    { rotulo: 'guerra emprestada', pontos: -d.custoDeAliar },
    inimigoEmComum(campanha, lados, ajustes),
    protecao(campanha, lados, estilo, ajustes),
    patrocinio(campanha, lados, estilo, ajustes),
    suasGuerras(campanha, lados, estilo, ajustes),
    fraquezaSua(campanha, lados, estilo, ajustes),
    cobica(campanha, lados, estilo, ajustes, extras.cobicadas),
    prazo(turnos, prazoMaisCurto(ajustes.diplomacia.alianca.prazos), ajustes),
    ouro(campanha, lados, extras.ouro ?? 0, estilo, ajustes),
  ]);
}

/**
 * A aliança que este poder assinaria AGORA, ou `null`.
 *
 * ⚠️ **Varre os poderes com ficha e não só os vizinhos** — ao contrário do pacto, que é sobre
 * a fronteira. Uma aliança pelo inimigo em comum faz todo sentido através do mar, e é
 * justamente ela que dá um uso à opinião que a tribo e o inimigo comum produzem à distância.
 *
 * Quem propõe precisa da própria balança acima de `iniciativa` e da do outro fechando; entre
 * dois candidatos, o de maior saldo próprio — e, empatados, o mais forte, porque aliança é
 * exército emprestado e o do forte vale mais.
 */
export function aliancaEscolhida(
  campanha: Campanha,
  idPoder: string,
  estilo: EstiloDeIa,
  dados: Ia,
  ajustes: AjustesDoJogo,
): { com: string; turnos: number } | null {
  const iniciativa = ajustes.diplomacia.balanca.iniciativa;
  const prazos = [...ajustes.diplomacia.alianca.prazos].sort((x, y) => y.turnos - x.turnos);

  let escolhido: { com: string; turnos: number; saldo: number; forca: number } | null = null;
  // Em ordem de id: a mesma partida assina as mesmas alianças em qualquer máquina.
  for (const outro of [...campanha.poderesComFicha()].sort()) {
    if (outro === idPoder) continue;
    if (campanha.emGuerra(idPoder, outro)) continue;
    if (campanha.aliancaAte(idPoder, outro) !== undefined) continue;
    const estiloDele = estiloDe(dados, outro);
    const meusLados: Lados = { ele: idPoder, voce: outro };
    const ladosDele: Lados = { ele: outro, voce: idPoder };
    const minhas = { cobicadas: cobicadasPor(campanha, meusLados, estilo, ajustes) };
    const delas = { cobicadas: cobicadasPor(campanha, ladosDele, estiloDele, ajustes) };
    for (const p of prazos) {
      if (!campanha.podeFirmarAlianca(outro, p.turnos, idPoder).pode) continue;
      const minha = balancaDaAlianca(campanha, meusLados, p.turnos, estilo, ajustes, minhas);
      if (minha.saldo < iniciativa) continue;
      const dele = balancaDaAlianca(campanha, ladosDele, p.turnos, estiloDele, ajustes, delas);
      if (dele.saldo < 0) continue;
      const forca = forcaTotalDe(campanha, outro);
      if (
        escolhido === null ||
        minha.saldo > escolhido.saldo ||
        (minha.saldo === escolhido.saldo && forca > escolhido.forca)
      ) {
        escolhido = { com: outro, turnos: p.turnos, saldo: minha.saldo, forca };
      }
      break;
    }
  }
  return escolhido === null ? null : { com: escolhido.com, turnos: escolhido.turnos };
}

/** Rompe por conflito de interesses, nunca por vencimento ou sorteio. */
export function aliancaParaRomper(
  campanha: Campanha,
  poder: string,
  estilo: EstiloDeIa,
  ajustes: AjustesDoJogo,
): string | null {
  if (campanha.guerrasDe(poder).length > 0) return null;
  const alvos = oportunidadesAlcancaveis(campanha, poder);
  for (const aliado of campanha.aliadosDe(poder)) {
    if (campanha.chefeDe(poder) === aliado || campanha.chefeDe(aliado) === poder) continue;
    if (campanha.relacaoEntre(poder, aliado) > estilo.relacaoParaDeclarar) continue;
    if (!alvos.some((a) => a.dono === aliado && a.renda + a.bemNovo > 0)) continue;
    if (forcaTotalDe(campanha, poder) <= forcaTotalDe(campanha, aliado) * estilo.vantagemParaDeclarar) continue;
    const lados = { ele: poder, voce: aliado };
    const balanca = balancaDaAlianca(campanha, lados,
      prazoMaisCurto(ajustes.diplomacia.alianca.prazos), estilo, ajustes,
      { cobicadas: cobicadasPor(campanha, lados, estilo, ajustes) });
    if (balanca.saldo < -ajustes.diplomacia.balanca.iniciativa) return aliado;
  }
  return null;
}
