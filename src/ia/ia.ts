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
import { acessoPedido } from './diplomacia/acesso';
import { comercioEscolhido, pactoEscolhido, presenteEscolhido } from './diplomacia/pactos';
import { tributoEscolhido } from './diplomacia/tributos';
import { querPaz, querPazComTributo } from './diplomacia/paz';
import { obraEscolhida } from './economia/construir';
import { decretosEscolhidos } from './economia/imposto';
import { estiloDe } from './estilo';
import { defesasEscolhidas } from './guerra/defender';
import {
  assaltosMaduros,
  ataquesEscolhidos,
  concentracoesEscolhidas,
  retiradasEscolhidas,
  travessiasEscolhidas,
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
  /** Com quem ela abriu comércio nesta virada, se abriu. */
  comercio: string | null;
  /**
   * De quem ela conseguiu passagem nesta virada, e por quantos turnos.
   *
   * ⚠️ Zero acessos numa partida inteira quer dizer mecânica morta: a geografia voltaria a
   * obrigar guerras que ninguém queria, que é o que Henrique pediu para consertar.
   */
  acesso: { com: string; turnos: number } | null;
  /** O que ela PEDIU ao jogador nesta virada, e ele ainda não respondeu. */
  propostas: readonly string[];
  /**
   * A quem ela passou a pagar tributo nesta virada, e por quantos turnos.
   *
   * ⚠️ Zero tributos numa partida inteira quer dizer mecânica morta: o jogador veria dois
   * botões que só ele aperta. É por isso que a ferramenta de partida conta este campo.
   */
  tributo: { com: string; turnos: number } | null;
  /**
   * A guerra que ela encerrou nesta virada PAGANDO por isso, e por quantos turnos.
   *
   * Preenchido depois de todo mundo jogar, junto com `pazes`, porque a paz precisa dos dois.
   */
  pazComprada: { com: string; turnos: number; ouro: number } | null;
  defesas: readonly { destino: string; homens: number; tipo: string }[];
  ataques: readonly { destino: string; homens: number; postura: string; valor: number }[];
  /**
   * As marchas de travessia desta virada — as que usam o mar.
   *
   * ⚠️ Zero travessias numa partida inteira quer dizer mecânica morta: as ilhas voltariam a ser
   * seguras por serem invisíveis, e só o jogador navegaria. É por isso que a ferramenta de
   * partida conta este campo.
   */
  travessias: readonly { destino: string; homens: number }[];
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

    const obra = obraEscolhida(campanha, idPoder, estilo, ajustes);
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
    // ⚠️ **A TRAVESSIA antes da retirada, e a ordem é a regra inteira.** Uma hoste no meio do
    // mar está fora do próprio reino, e para a retirada isso basta para mandá-la voltar: sem
    // esta linha vindo primeiro, todo exército que zarpasse daria meia-volta na virada
    // seguinte e nenhuma travessia terminaria. Quem está a caminho não volta — e quando o
    // alvo deixa de existir, a expedição não se renova e a retirada o traz de volta da água.
    const travessias = travessiasEscolhidas(campanha, idPoder, estilo, ajustes.combate, new Set());
    for (const ordem of travessias) {
      campanha.ordenarMarcha(ordem.hoste, ordem.destino, ordem.homens, idPoder, ordem.postura);
    }

    const emViagem = new Set(travessias.map((t) => t.hoste));
    const retiradas = retiradasEscolhidas(campanha, idPoder, ajustes.combate, emViagem);
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

    // ⚠️ **Com o JOGADOR, a assinatura vira PEDIDO.** A decisão é a mesma; o que muda é que
    // ele responde. Henrique: *"não sinto a IA tentando se conectar comigo (...) e eu ter opção
    // de aceitar ou recusar"*. Antes disto, pacto e comércio com o jogador eram fato consumado
    // — ele descobria na aba de Diplomacia que tinha assinado alguma coisa.
    const pacto = pactoEscolhido(campanha, idPoder, estilo, dados);
    if (pacto !== null) {
      if (pacto.com === campanha.jogador?.id) {
        campanha.proporAoJogador({ de: idPoder, tipo: 'pacto', turnos: pacto.turnos });
      } else {
        campanha.firmarPacto(pacto.com, pacto.turnos, idPoder);
      }
    }

    // ⚠️ O TRIBUTO depois do pacto, e a ordem é a regra inteira: o pacto é de graça e o tributo
    // custa o cofre todo turno. Tentar o caro antes do grátis faria o reino pagar por aquilo
    // que uma assinatura lhe daria sem moeda nenhuma — e `podeFirmarTributo` já recusa quem
    // acabou de assinar um pacto, então esta linha só vê quem o pacto deixou para trás.
    const tributo = tributoEscolhido(campanha, idPoder, dados, ajustes.diplomacia.tributo);
    if (tributo !== null) campanha.pagarTributoA(tributo.com, tributo.turnos, idPoder);

    // O comércio por último entre os acordos: ele é a decisão mais fácil — lucro dos dois lados
    // — e não tira nada da mesa, então nunca compete com pacto nem com guerra.
    const comercio = comercioEscolhido(campanha, idPoder, estilo);
    if (comercio !== null) {
      if (comercio === campanha.jogador?.id) {
        campanha.proporAoJogador({ de: idPoder, tipo: 'comercio' });
      } else {
        campanha.acordarComercio(comercio, idPoder);
      }
    }

    // ⚠️ **A PASSAGEM vem depois do comércio e antes da guerra**, e a ordem é a regra: ela só
    // existe por causa de uma guerra em curso, e pedi-la a quem se vai atacar no mesmo turno
    // seria assinar para romper. Ver `diplomacia/acesso.ts`.
    const acesso = acessoPedido(campanha, idPoder, estilo, ajustes.diplomacia.acesso.prazos);
    if (acesso !== null) {
      if (acesso.com === campanha.jogador?.id) {
        campanha.proporAoJogador({ de: idPoder, tipo: 'acesso', turnos: acesso.turnos });
      } else {
        campanha.concederAcesso(idPoder, acesso.turnos, acesso.com);
      }
    }

    const guerra = guerraEscolhida(campanha, idPoder, estilo, ajustes.combate);
    if (guerra !== null) campanha.declararGuerra(guerra, idPoder);

    // E a defesa por último, porque ela move o que JÁ existe: a leva de hoje só marcha
    // depois de virar hoste, no turno que vem.
    const jaMandadas = new Set([...emViagem, ...retiradas.map((r) => r.hoste)]);
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
      comercio,
      acesso,
      propostas: campanha
        .propostas()
        .filter((pr) => pr.de === idPoder)
        .map((pr) => pr.tipo),
      tributo,
      defesas: defesas.map((d) => ({ destino: d.destino, homens: d.homens, tipo: d.tipo })),
      ataques: ataques.map((a) => ({
        destino: a.destino,
        homens: a.homens,
        postura: a.postura,
        valor: a.valor,
      })),
      travessias: travessias.map((t) => ({ destino: t.destino, homens: t.homens })),
      assaltos,
      pazes: [],
      pazComprada: null,
    });
  }
  // ⚠️ **A paz é resolvida DEPOIS de todo mundo jogar, e num passo só.** Ela precisa dos dois
  // lados, e perguntar dentro do laço faria a resposta depender de quem foi primeiro na ordem
  // alfabética — Argos teria uma chance de sair que Tebas não teria. Aqui os dois são
  // consultados no mesmo mundo.
  for (const par of pazesFechadas(campanha, dados, ajustes)) {
    if (par.comprada === null) campanha.fazerPaz(par.b, par.a);
    else {
      const outro = par.comprada.pagador === par.a ? par.b : par.a;
      campanha.fazerPazComTributo(outro, par.comprada.turnos, par.comprada.pagador);
    }
    for (const lance of lances) {
      if (lance.poder !== par.a && lance.poder !== par.b) continue;
      const outro = lance.poder === par.a ? par.b : par.a;
      lance.pazes = [...lance.pazes, outro].sort();
      if (par.comprada !== null && par.comprada.pagador === lance.poder) {
        lance.pazComprada = { com: outro, turnos: par.comprada.turnos, ouro: par.comprada.ouro };
      }
    }
  }
  return lances;
}

/**
 * As guerras entre computadores que terminam nesta virada — de graça ou COMPRADAS.
 *
 * ⚠️ **A segunda metade é a que faltava, e a falta dela mentia na medição.** Sem ela, a paz
 * entre computadores só existia quando os DOIS já queriam sair — e quem está ganhando nunca
 * quer. Duas IAs em guerra iam até alguém ser eliminado, e o tributo, que existe justamente
 * para dar uma saída a quem perde, ficava sendo um botão que só o jogador apertava.
 *
 * A regra é a mesma da mesa do jogador, e é curta: **quem quer sair e não é atendido põe ouro
 * na mesa.** Se o outro achar que o pagamento vale mais do que o que ele ainda ia tomar, a
 * guerra acaba ali — com uma dívida de quarenta turnos no lugar de uma província perdida.
 *
 * Guerra com o jogador não entra: a paz dele é uma proposta que ele faz ou recebe, e quem
 * junta as duas respostas nesse caso é a aplicação. A IA não assina no lugar dele.
 */
function pazesFechadas(
  campanha: Campanha,
  dados: Ia,
  ajustes: Ajustes['jogo'],
): readonly {
  a: string;
  b: string;
  comprada: { pagador: string; turnos: number; ouro: number } | null;
}[] {
  const daIa = new Set(poderesDaIa(campanha));
  const fechadas: {
    a: string;
    b: string;
    comprada: { pagador: string; turnos: number; ouro: number } | null;
  }[] = [];
  const vistos = new Set<string>();
  for (const a of [...daIa].sort()) {
    for (const b of campanha.guerrasDe(a)) {
      if (!daIa.has(b)) continue;
      const par = a < b ? `${a}|${b}` : `${b}|${a}`;
      if (vistos.has(par)) continue;
      vistos.add(par);
      const querA = querPaz(campanha, a, b, estiloDe(dados, a), ajustes.combate);
      const querB = querPaz(campanha, b, a, estiloDe(dados, b), ajustes.combate);
      if (querA && querB) {
        fechadas.push({ a, b, comprada: null });
        continue;
      }
      // ⚠️ Só quem quer sair paga, e paga a quem NÃO quer. Os dois querendo já saiu de graça
      // ali em cima; nenhum dos dois querendo é uma guerra que os dois ainda acham que ganham,
      // e ninguém compra uma saída que não está procurando.
      if (querA === querB) continue;
      const pagador = querA ? a : b;
      const comprada = pazQueElaCompra(campanha, pagador, querA ? b : a, dados, ajustes);
      if (comprada !== null) fechadas.push({ a, b, comprada });
    }
  }
  return fechadas;
}

/**
 * O prazo com que este poder compra a saída da guerra, ou `null` se nenhum é aceito.
 *
 * ⚠️ **O mais LONGO que ele aceitar**, que é a parcela mais barata — a mesma escolha de quem
 * oferece tributo em tempo de paz, e pelo mesmo motivo: quem está perdendo uma guerra tem um
 * cofre que não aguenta a parcela cara, e trocar liberdade futura por sobreviver agora é a
 * troca que qualquer um faz com uma lança apontada.
 */
function pazQueElaCompra(
  campanha: Campanha,
  pagador: string,
  inimigo: string,
  dados: Ia,
  ajustes: Ajustes['jogo'],
): { pagador: string; turnos: number; ouro: number } | null {
  const estilo = estiloDe(dados, inimigo);
  // `prazosDePazComTributo` vem do mais curto ao mais longo: de trás para frente é do barato.
  for (const prazo of [...campanha.prazosDePazComTributo(inimigo, pagador)].reverse()) {
    if (!prazo.pode) continue;
    const aceita = querPazComTributo(
      campanha,
      inimigo,
      pagador,
      prazo.ouro,
      prazo.turnos,
      estilo,
      ajustes.combate,
      ajustes.diplomacia.tributo,
    );
    if (aceita) return { pagador, turnos: prazo.turnos, ouro: prazo.ouro };
  }
  return null;
}

/** Quem a IA dirige: vivo, com economia completa, e que não seja o jogador. */
export function poderesDaIa(campanha: Campanha): readonly string[] {
  const jogador = campanha.jogador?.id;
  return campanha
    .poderesVivos()
    .filter((id) => id !== jogador && campanha.semEconomia(id) === 0)
    .sort();
}
