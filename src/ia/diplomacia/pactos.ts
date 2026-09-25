/**
 * QUANDO A IA ASSINA UM PACTO DE NÃO-AGRESSÃO — **e o que ela pesa antes de assinar.**
 *
 * Um pacto amarra as mãos dos dois. A pergunta de quem decide é honesta: *"o que eu ganho
 * amarrando as minhas, e o que eu perco?"* — e a resposta é uma BALANÇA (ver `balanca.ts`):
 *
 * - **a favor:** a confiança que ele tem em você; o medo, se você é maior em terra ou em
 *   armas; as mãos ocupadas, se ele já tem guerra em outro lugar; e o ouro que vier junto;
 * - **contra:** o temperamento dele (o guerreiro precisa de razão para não atacar); a COBIÇA,
 *   se ele tem terra sua que vale a marcha; e o prazo, que cobra por turno acima do mais curto.
 *
 * ⚠️ **Antes disto a pergunta era uma só — "a opinião passa da linha?" — dos dois lados, e ela
 * mentia duas vezes.** A regra dizia SIM por medo (Henrique: *"quantos países se odeiam e fazem
 * pactos"*) e a vontade dizia NÃO pela mesma opinião: Mégara com −50 recusava no clique um
 * pacto que a mesa mostrava possível. E o forte com apetite assinava por amizade: o pacto
 * assinado sem o forte querer foi medido em **46 províncias mudando de dono e 12 poderes
 * eliminados**, contra 22 e 6. A cobiça na balança é o que impede o fraco de amarrar o forte.
 *
 * ⚠️ **E ela NUNCA rompe um pacto**, nesta versão. Não é ingenuidade: é o que faz a assinatura
 * dela valer alguma coisa para o jogador. Uma IA que assina e trai é uma IA cuja assinatura
 * ninguém lê — e aí a mecânica inteira morre. No dia em que ela romper, tem de ser raro, caro e
 * por um motivo grande.
 *
 * O prazo é **o mais longo em que os dois saldos fecham**: quem chegou longe merece os oitenta
 * turnos; quem mal fecha leva vinte e recomeça a conversa depois.
 */

import type { Campanha } from '@/campanha/campanha';
import type { Ajustes, EstiloDeIa, Ia } from '@/dados/esquema';
import { estiloDe } from '../estilo';
import { forcaTotalDe } from '../percepcao/ameaca';
import { oportunidadesDe } from '../percepcao/oportunidade';
import {
  type Balanca,
  type ExtrasDaBalanca,
  type Lados,
  cobica,
  cobicadasPor,
  confianca,
  maosOcupadas,
  medo,
  ouro,
  pesar,
  prazo,
  prazoMaisCurto,
  temperamento,
} from './balanca';

type AjustesDoJogo = Ajustes['jogo'];

/**
 * A balança de `ele` diante de um pacto de `turnos` proposto por `voce`.
 *
 * É a MESMA função nas três bocas: a mesa pergunta antes do clique, a aplicação pergunta no
 * clique, e a IA pergunta quando dois computadores negociam. Não há segunda pergunta.
 */
export function balancaDoPacto(
  campanha: Campanha,
  lados: Lados,
  turnos: number,
  estilo: EstiloDeIa,
  ajustes: AjustesDoJogo,
  extras: ExtrasDaBalanca = {},
): Balanca {
  return pesar([
    confianca(campanha, lados, estilo),
    temperamento(estilo),
    medo(campanha, lados, estilo, ajustes),
    maosOcupadas(campanha, lados, estilo, ajustes),
    cobica(campanha, lados, estilo, ajustes, extras.cobicadas),
    prazo(turnos, prazoMaisCurto(ajustes.diplomacia.pacto.prazos), ajustes),
    ouro(campanha, lados, extras.ouro ?? 0, estilo, ajustes),
  ]);
}

/**
 * O PRESENTE: **suborno defensivo, e é o que dá ao mercador uma arma que não é exército.**
 *
 * ⚠️ A primeira versão disto mandava ouro para destravar um pacto, e nunca disparava: medido,
 * **zero presentes em 100 turnos**. O motivo era estreito demais — para o pacto faltar E os dois
 * lados quererem assinar, era preciso uma combinação de estilos que quase não acontece.
 *
 * O uso de verdade é o clássico: **um vizinho mais forte, cuja opinião já está na faixa em que
 * ELE declara guerra.** Ouro entregue ali compra pontos, e pontos compram o turno em que a
 * invasão não sai. É o que um poder rico e desarmado faz desde que existe poder rico e
 * desarmado — e é o que faltava para o estilo `mercador` ter uma jogada que não seja levantar
 * lanças que ele não sabe usar.
 *
 * Três travas, e cada uma evita um jeito de a IA torrar o tesouro:
 *
 * 1. **Só quem é mais forte que eu**, senão é medo de sombra.
 * 2. **Só quem já está na faixa de me atacar** — quem não está não precisa ser comprado.
 * 3. **Só o que cabe na reserva do tesouro**, a mesma que segura a mão dela na obra: quem zera
 *    o cofre num presente não paga a folha no turno seguinte.
 *
 * ⚠️ E existe um limite honesto que vem do próprio presente: ele levanta a opinião só até certa
 * altura acima do que os FATOS justificam. **Não se compra um senhor da guerra que quer a sua
 * terra** — para subir mais é preciso mudar os fatos: assinar pacto, abrir comércio, devolver
 * o que foi tomado.
 */
export function presenteEscolhido(
  campanha: Campanha,
  idPoder: string,
  estilo: EstiloDeIa,
  dados: Ia,
): { para: string; ouro: number } | null {
  const disponivel = campanha.tesouroDe(idPoder) * (1 - estilo.guardaDoTesouro);
  if (disponivel <= 0) return null;

  const meu = forcaTotalDe(campanha, idPoder);
  const vizinhos = [...new Set(oportunidadesDe(campanha, idPoder).map((o) => o.dono))].sort();

  let escolhido: { para: string; ouro: number } | null = null;
  let maisForte = meu;
  for (const vizinho of vizinhos) {
    if (campanha.emGuerra(idPoder, vizinho)) continue;
    if (campanha.pactoAte(idPoder, vizinho) !== undefined) continue;
    const dele = forcaTotalDe(campanha, vizinho);
    if (dele <= maisForte) continue;
    // Ele já está na faixa em que declara guerra? Quem não está não precisa ser comprado.
    const limiar = estiloDe(dados, vizinho).relacaoParaDeclarar;
    const falta = limiar - campanha.relacaoEntre(idPoder, vizinho) + 1;
    if (falta <= 0) continue;
    const ouro = quantoCusta(campanha, vizinho, falta, disponivel);
    if (ouro === null) continue;
    maisForte = dele;
    escolhido = { para: vizinho, ouro };
  }
  return escolhido;
}

/**
 * O menor presente que cobre esses pontos, ou `null` se nem a reserva cobre.
 *
 * Procura de baixo para cima, em degraus de meio turno de renda dele: o objetivo é COMPRAR o
 * turno de sossego, não impressionar ninguém — e cada moeda a mais é uma moeda que não vira
 * muro. Devolve `null` também quando o teto do presente não alcança: aí não é caro, é
 * impossível, e o ouro seria jogado fora.
 */
function quantoCusta(
  campanha: Campanha,
  para: string,
  pontos: number,
  disponivel: number,
): number | null {
  const passo = Math.max(50, Math.round(campanha.rendaDe(para) / 2));
  for (let ouro = passo; ouro <= disponivel; ouro += passo) {
    if (campanha.valorDoPresente(para, ouro) >= pontos) return ouro;
  }
  return null;
}

/**
 * COM QUEM ELA ABRE COMÉRCIO — e é a decisão mais fácil que ela tem.
 *
 * ⚠️ **Todo acordo é lucro dos dois lados**, então não há o que ponderar: ela assina com quem
 * puder, do mais rendoso para o menos. A única pergunta real é *"eu pretendo atacá-lo?"* —
 * abrir comércio com quem se vai invadir é montar uma renda para perdê-la no turno seguinte,
 * já que a guerra desfaz o acordo na hora.
 *
 * É por aqui que o estilo `mercador` finalmente joga o jogo dele: sem exército para levantar,
 * o que ele tem é renda, e renda se multiplica assinando.
 */
export function comercioEscolhido(
  campanha: Campanha,
  idPoder: string,
  estilo: EstiloDeIa,
  dados: Ia,
): string | null {
  let escolhido: string | null = null;
  let melhor = 0;
  // Vizinhos primeiro, mas comércio não exige fronteira: qualquer poder com ficha serve.
  for (const outro of campanha.poderesComFicha()) {
    if (outro === idPoder) continue;
    if (!campanha.podeAcordarComercio(outro, idPoder).pode) continue;
    // Abrir comércio com quem ela pretende atacar é montar renda para perdê-la amanhã.
    if (!aceitaComercio(campanha, idPoder, outro, estilo)) continue;
    // Comércio precisa do sim dos DOIS. Sem esta pergunta, a mesma IA que recusava o jogador
    // assinava com outro computador na mesma opinião, porque só a vontade do proponente entrava.
    if (!aceitaComercio(campanha, outro, idPoder, estiloDe(dados, outro))) continue;
    const renda = campanha.rendaDeUmAcordoCom(outro, idPoder);
    if (renda > melhor) {
      melhor = renda;
      escolhido = outro;
    }
  }
  return escolhido;
}

/** Este poder abriria comércio com aquele? A mesma pergunta na mesa, no clique e entre IAs. */
export function aceitaComercio(
  campanha: Campanha,
  idPoder: string,
  com: string,
  estilo: EstiloDeIa,
): boolean {
  return campanha.relacaoEntre(idPoder, com) > estilo.relacaoParaDeclarar;
}

/**
 * Com quem e por quanto tempo este poder assinaria um pacto agora. `null` se com ninguém.
 *
 * ⚠️ **Quem propõe precisa de mais do que "não me importo".** A balança PRÓPRIA tem de passar
 * de `iniciativa`: ninguém abre a boca por um acordo indiferente. E a do outro tem de fechar —
 * pedir a quem diria não seria pedir para ouvir não. Entre dois candidatos, o de maior saldo
 * próprio: a força do vizinho já está lá dentro, no medo.
 *
 * Com o jogador a assinatura vira PEDIDO na mesa, e a segunda balança é a que ele TERIA se
 * jogasse como o estilo que `dados/ia.json` lhe dá: a IA não sabe o que ele quer, e é assim
 * que ela evita encher a mesa com o que ele nunca aceitaria.
 */
export function pactoEscolhido(
  campanha: Campanha,
  idPoder: string,
  estilo: EstiloDeIa,
  dados: Ia,
  ajustes: AjustesDoJogo,
): { com: string; turnos: number } | null {
  const iniciativa = ajustes.diplomacia.balanca.iniciativa;
  // Os vizinhos, pela mesma percepção que a guerra usa: pacto só faz sentido com quem encosta.
  const vizinhos = [...new Set(oportunidadesDe(campanha, idPoder).map((o) => o.dono))].sort();
  const prazos = [...ajustes.diplomacia.pacto.prazos].sort((x, y) => y.turnos - x.turnos);

  let escolhido: { com: string; turnos: number; saldo: number } | null = null;
  for (const vizinho of vizinhos) {
    if (campanha.pactoAte(idPoder, vizinho) !== undefined) continue;
    if (campanha.emGuerra(idPoder, vizinho)) continue;
    const estiloDele = estiloDe(dados, vizinho);
    const meusLados: Lados = { ele: idPoder, voce: vizinho };
    const ladosDele: Lados = { ele: vizinho, voce: idPoder };
    // A cobiça lê uma previsão de batalha por província: uma vez por par, não por prazo.
    const minhas = { cobicadas: cobicadasPor(campanha, meusLados, estilo, ajustes) };
    const delas = { cobicadas: cobicadasPor(campanha, ladosDele, estiloDele, ajustes) };
    // Do prazo mais longo ao mais curto: o primeiro em que os dois saldos fecham.
    for (const p of prazos) {
      if (!campanha.podeFirmarPacto(vizinho, p.turnos, idPoder).pode) continue;
      const minha = balancaDoPacto(campanha, meusLados, p.turnos, estilo, ajustes, minhas);
      if (minha.saldo < iniciativa) continue;
      const dele = balancaDoPacto(campanha, ladosDele, p.turnos, estiloDele, ajustes, delas);
      if (dele.saldo < 0) continue;
      if (escolhido === null || minha.saldo > escolhido.saldo) {
        escolhido = { com: vizinho, turnos: p.turnos, saldo: minha.saldo };
      }
      break;
    }
  }
  return escolhido === null ? null : { com: escolhido.com, turnos: escolhido.turnos };
}
