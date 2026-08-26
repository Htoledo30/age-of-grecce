/**
 * A IA — a porta única. **"Jogue o turno de quem não é o jogador."**
 *
 * Chamada uma vez por virada, ANTES de `passarTurno`, porque as ordens deste jogo são
 * simultâneas: se a IA decidisse depois, ela estaria vendo as cartas do jogador.
 *
 * ⚠️ **Ela fica FORA de `passarTurno`, e é decisão de arquitetura.** A IA é um jogador, não
 * uma regra da campanha — e a diferença aparece no dia em que 372 testes que viram turnos
 * passariam a ter dezessete poderes agindo dentro deles. Um teste sobre fome deixaria de ser
 * sobre fome. Aqui, quem quer IA pede IA.
 *
 * ## O que ela pode fazer, e o que ela não pode
 *
 * ⚠️ **Ela chama a MESMA fachada `Campanha` que a tela chama**, com o poder dito em voz alta
 * (`porPoder`). Não existe caminho de serviço: se ela precisar de uma pergunta que a fachada
 * não responde, a pergunta entra na fachada. É o que garante que ela jogue este jogo em vez
 * de um parecido com este — e é o que faz cada defeito que ela encontra ser um defeito de
 * verdade.
 *
 * ⚠️ **Nada de sorte.** Ordem por id do começo ao fim: a mesma partida, com as mesmas
 * decisões do jogador, dá o mesmo mapa. Sem isso não há salvamento confiável nem regressão —
 * a mesma regra que a batalha carrega escrita no cabeçalho dela.
 *
 * ⚠️ **Ela decide do zero a cada turno.** Não guarda plano de uma virada para a outra, e por
 * isso não mexe no salvamento. Quando alguma decisão precisar de memória — *"estou
 * comprometido a tomar Mégara"* —, a memória entra no estado e vai para o disco junto.
 *
 * ## Onde ela está
 *
 * Etapas 1 e 2: **ela cuida da casa e se defende.** Constrói, decreta imposto, levanta tropa,
 * socorre terra ameaçada e faz surtida. Etapa 3: **ela ataca** — marcha sobre a terra alheia
 * que vale mais e que ela acredita TOMAR, não só vencer. Ver `guerra/marchar.ts`.
 *
 * A ordem foi essa de propósito, e não por gosto de faseamento: enquanto ela só reagia, um erro
 * aparecia numa província e não numa guerra em cascata pelo mapa inteiro. Cada defeito da etapa
 * 2 foi encontrado num tabuleiro parado — e nenhum deles teria sido legível com dezessete
 * poderes marchando ao mesmo tempo.
 *
 * A ordem das decisões dentro do turno também é escrita: **imposto, obra, leva, guerra, defesa,
 * ataque — e a paz por último, num passo à parte.** O imposto muda a renda de hoje e a obra precisa saber com quanto conta; a leva
 * precisa saber o que sobrou do cofre depois da obra; a defesa move o que já existe; e o ataque
 * vem por último porque **é uma ordem por hoste por rodada** — quem já foi socorrer não marcha
 * sobre o vizinho, e a casa decide primeiro.
 */

import type { Campanha } from '@/campanha/campanha';
import type { Ajustes, Ia } from '@/dados/esquema';
import { guerraEscolhida } from './diplomacia/declarar';
import { pactoEscolhido, presenteEscolhido } from './diplomacia/pactos';
import { querPaz } from './diplomacia/paz';
import { obraEscolhida } from './economia/construir';
import { decretosEscolhidos } from './economia/imposto';
import { estiloDe } from './estilo';
import { defesasEscolhidas } from './guerra/defender';
import {
  assaltosMaduros,
  ataquesEscolhidos,
  concentracoesEscolhidas,
  retiradasEscolhidas,
} from './guerra/marchar';
import { levaEscolhida } from './guerra/recrutar';

/** O que a IA fez num turno. Serve à ferramenta de partida e aos testes, não ao jogo. */
export interface LanceDaIa {
  poder: string;
  obra: { provincia: string; construcao: string } | null;
  decretos: readonly { provincia: string; nivel: string }[];
  leva: { provincia: string; arma: string; homens: number } | null;
  /** Contra quem ela declarou guerra nesta virada, se declarou. */
  guerra: string | null;
  /** Com quem ela assinou pacto de não-agressão nesta virada, e por quantos turnos. */
  pacto: { com: string; turnos: number } | null;
  /** O presente que ela mandou nesta virada, se mandou. */
  presente: { para: string; ouro: number } | null;
  defesas: readonly { destino: string; homens: number; tipo: string }[];
  ataques: readonly { destino: string; homens: number; postura: string; valor: number }[];
  /** Com quem ela assinou a paz nesta virada. */
  pazes: readonly string[];
  /** Cercos dela que viraram assalto nesta virada. */
  assaltos: readonly string[];
}

/**
 * Joga o turno de todos os poderes que não são o jogador.
 *
 * ⚠️ **Só os poderes com economia completa.** Das 196 províncias desenhadas, 25 são
 * simuladas; os outros 121 poderes não têm ficha, não arrecadam e não teriam com que decidir.
 * Soltar a IA neles faria um vizinho engolir meia Grécia vazia de graça, e o mapa viraria
 * sopa antes de o jogo começar.
 */
export function jogarIA(
  campanha: Campanha,
  dados: Ia,
  ajustes: Ajustes['jogo'],
): readonly LanceDaIa[] {
  const lances: (LanceDaIa & { pazes: readonly string[] })[] = [];
  for (const idPoder of poderesDaIa(campanha)) {
    const estilo = estiloDe(dados, idPoder);

    // O imposto primeiro: ele muda a renda deste mesmo turno, e a obra precisa saber com
    // quanto conta. Ao contrário, a IA decretaria em cima de uma decisão que ela já tomou.
    const decretos = decretosEscolhidos(campanha, idPoder, estilo);
    for (const decreto of decretos) {
      campanha.definirImposto(decreto.provincia, decreto.nivel, idPoder);
    }

    const obra = obraEscolhida(campanha, idPoder, estilo);
    if (obra) campanha.construir(obra.provincia, obra.construcao, idPoder);

    // A leva depois da obra: o cofre já está do tamanho que ficou, e recrutar em cima de um
    // dinheiro que ela acabou de gastar seria a IA contando a mesma moeda duas vezes.
    const leva = levaEscolhida(campanha, idPoder, estilo, ajustes);
    if (leva) campanha.recrutar(leva.provincia, leva.homens, leva.arma, idPoder);

    // ⚠️ **Antes de tudo o que é militar: DESISTIR do que não dá mais.** Voltam para casa as
    // hostes em terra que deixou de ser inimiga, as que seguram um cerco que azedou, e todas as
    // que estiverem longe enquanto a casa pega fogo. Sem esta decisão a IA vira estátua — e
    // vinha virando: exército parado diante de um muro por cinquenta turnos, pagando folha de
    // campanha, enquanto a província dele era tomada do outro lado do reino.
    const retiradas = retiradasEscolhidas(campanha, idPoder, ajustes.combate, new Set());
    for (const ordem of retiradas) {
      campanha.ordenarMarcha(ordem.hoste, ordem.destino, ordem.homens, idPoder, 'sitiar');
    }

    // ⚠️ **A guerra é declarada ANTES da defesa e do ataque, e no mesmo turno em que se
    // marcha.** As ordens são simultâneas: um aviso prévio de uma virada daria ao defensor um
    // turno inteiro de vantagem sobre quem declarou, e o ataque de surpresa deixaria de
    // existir. O que a declaração garante é aparecer na crônica e na aba de Diplomacia.
    // ⚠️ O pacto ANTES da guerra, e a ordem tem motivo: ele só é assinado com quem ela não
    // atacaria de qualquer jeito, então nunca tira um alvo da mesa — mas assinar depois de
    // declarar seria a mesma virada oferecendo paz e guerra ao mesmo vizinho.
    // ⚠️ O presente vem ANTES do pacto, e na MESMA virada: ele existe para desbloquear a
    // assinatura, e mandar ouro num turno para assinar no outro daria ao vizinho uma virada
    // inteira para mudar de ideia. É o laço inteiro num lugar só — ouro compra o momento, o
    // momento compra o prazo.
    const presente = presenteEscolhido(campanha, idPoder, estilo, dados);
    if (presente !== null) campanha.presentear(presente.para, presente.ouro, idPoder);

    const pacto = pactoEscolhido(campanha, idPoder, estilo, dados);
    if (pacto !== null) campanha.firmarPacto(pacto.com, pacto.turnos, idPoder);

    const guerra = guerraEscolhida(campanha, idPoder, estilo, ajustes.combate);
    if (guerra !== null) campanha.declararGuerra(guerra, idPoder);

    // E a defesa por último, porque ela move o que JÁ existe: a leva de hoje só marcha
    // depois de virar hoste, no turno que vem.
    const jaMandadas = new Set(retiradas.map((r) => r.hoste));
    const defesas = defesasEscolhidas(campanha, idPoder, ajustes.combate.batalha).filter(
      (o) => !jaMandadas.has(o.hoste),
    );
    for (const ordem of defesas) {
      if (ordem.tipo === 'surtida') campanha.surtir(ordem.hoste, idPoder);
      else campanha.ordenarMarcha(ordem.hoste, ordem.destino, ordem.homens, idPoder, 'sitiar');
    }

    // E o ataque depois da defesa, pelo mesmo motivo que a defesa veio depois da leva: uma
    // ordem por hoste por rodada. Quem já foi socorrer não marcha sobre o vizinho, e a casa
    // decide primeiro — não porque atacar valha menos, mas porque a hoste é a mesma.
    const ataques = ataquesEscolhidos(
      campanha,
      idPoder,
      estilo,
      ajustes.combate,
      new Set([...jaMandadas, ...defesas.map((d) => d.hoste)]),
    );
    for (const ordem of ataques) {
      campanha.ordenarMarcha(ordem.hoste, ordem.destino, ordem.homens, idPoder, ordem.postura);
    }

    // E o que sobrou vai JUNTAR O EXÉRCITO. Depois do ataque de propósito: quem já marchou
    // sobre o inimigo hoje tem trabalho feito; quem ficou é que precisa se ajuntar para o
    // ataque de amanhã. Sem esta decisão a IA fica com seis mil homens espalhados em oito
    // hostes e nenhuma delas toma uma cidade de duzentos milicianos.
    const ocupadas = new Set([
      ...jaMandadas,
      ...defesas.map((d) => d.hoste),
      ...ataques.map((a) => a.hoste),
    ]);
    const concentracoes = concentracoesEscolhidas(campanha, idPoder, estilo, ocupadas);
    for (const ordem of concentracoes) {
      campanha.ordenarMarcha(ordem.hoste, ordem.destino, ordem.homens, idPoder, 'sitiar');
    }

    // ⚠️ Os cercos que já podem virar assalto, por último: a hoste sentada não recebe ordem de
    // marcha, e sem esta linha o cerco da IA nunca terminaria — sitiar não toma a praça.
    const assaltos = assaltosMaduros(campanha, idPoder, estilo, ajustes.combate.batalha);
    for (const provincia of assaltos) campanha.mudarPostura(provincia, 'assaltar', idPoder);

    lances.push({
      poder: idPoder,
      obra: obra ? { provincia: obra.provincia, construcao: obra.construcao } : null,
      decretos,
      leva: leva ? { provincia: leva.provincia, arma: leva.arma, homens: leva.homens } : null,
      guerra,
      pacto,
      presente,
      defesas: defesas.map((d) => ({ destino: d.destino, homens: d.homens, tipo: d.tipo })),
      ataques: ataques.map((a) => ({
        destino: a.destino,
        homens: a.homens,
        postura: a.postura,
        valor: a.valor,
      })),
      assaltos,
      pazes: [],
    });
  }
  // ⚠️ **A paz é resolvida DEPOIS de todo mundo jogar, e num passo só.** Ela precisa dos dois
  // lados, e perguntar dentro do laço faria a resposta depender de quem foi primeiro na ordem
  // alfabética — Argos teria uma chance de sair que Tebas não teria. Aqui os dois são
  // consultados no mesmo mundo.
  for (const par of pazesFechadas(campanha, dados, ajustes.combate)) {
    campanha.fazerPaz(par.b, par.a);
    for (const lance of lances) {
      if (lance.poder === par.a || lance.poder === par.b) {
        lance.pazes = [...lance.pazes, lance.poder === par.a ? par.b : par.a].sort();
      }
    }
  }
  return lances;
}

/**
 * As guerras entre computadores que terminam nesta virada — as que os DOIS lados querem
 * encerrar.
 *
 * Guerra com o jogador não entra: a paz dele é uma proposta que ele faz ou recebe, e quem
 * junta as duas respostas nesse caso é a aplicação. A IA não assina no lugar dele.
 */
function pazesFechadas(
  campanha: Campanha,
  dados: Ia,
  ajustes: Ajustes['jogo']['combate'],
): readonly { a: string; b: string }[] {
  const daIa = new Set(poderesDaIa(campanha));
  const fechadas: { a: string; b: string }[] = [];
  const vistos = new Set<string>();
  for (const a of [...daIa].sort()) {
    for (const b of campanha.guerrasDe(a)) {
      if (!daIa.has(b)) continue;
      const par = a < b ? `${a}|${b}` : `${b}|${a}`;
      if (vistos.has(par)) continue;
      vistos.add(par);
      if (!querPaz(campanha, a, b, estiloDe(dados, a), ajustes)) continue;
      if (!querPaz(campanha, b, a, estiloDe(dados, b), ajustes)) continue;
      fechadas.push({ a, b });
    }
  }
  return fechadas;
}

/** Quem a IA dirige: vivo, com economia completa, e que não seja o jogador. */
export function poderesDaIa(campanha: Campanha): readonly string[] {
  const jogador = campanha.jogador?.id;
  return campanha
    .poderesVivos()
    .filter((id) => id !== jogador && campanha.semEconomia(id) === 0)
    .sort();
}
