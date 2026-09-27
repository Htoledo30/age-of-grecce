/**
 * PAZ E GUERRA — quem pode marchar contra quem, e desde quando.
 *
 * A diplomacia mais curta que resolve o problema que a falta dela criava: **sem estado de
 * relação, os 139 poderes estavam em guerra com todo mundo desde o turno 1**, e a única
 * coisa que impedia o mapa de virar sopa eram freios inventados dentro da IA — um preço por
 * conquista, uma fatia máxima de exército na estrada. Freio inventado não aparece na tela:
 * o jogador via o vizinho não atacar e não tinha como saber por quê.
 *
 * ## As quatro regras, e cada uma existe por um motivo
 *
 * 1. **Todo mundo começa em PAZ.** Não é bondade: é que "marchar sobre o vizinho" tem de ser
 *    uma decisão com nome, e não o estado natural das coisas.
 * 2. **Só se marcha sobre quem se está em guerra.** É por aqui que a diplomacia entra no
 *    jogo — pela ordem de marcha, que é a mesma porta para o jogador e para a IA.
 * 3. **A guerra é um ESTADO, e não um golpe.** Declarada, ela fica: quem ataca não escolhe
 *    parar quando o troco chega. É isso que torna declarar caro sem custar moeda nenhuma.
 * 4. **A paz precisa dos DOIS.** Ninguém sai de uma guerra que está perdendo só porque quer.
 *
 * ⚠️ **Declarar e marchar no mesmo turno é permitido, e é de propósito.** As ordens são
 * simultâneas: um aviso prévio de uma virada daria ao defensor um turno inteiro de vantagem
 * sobre quem declarou, e o ataque de surpresa deixaria de existir no jogo. O que a declaração
 * garante é que ela vai estar escrita na crônica e na aba de Diplomacia — o jogador descobre
 * ao mesmo tempo que leva o golpe, como se descobre uma invasão.
 *
 * ⚠️ **A TRÉGUA existe para a paz significar alguma coisa.** Sem ela, fazer as pazes e
 * redeclarar na virada seguinte seria grátis, e a paz viraria uma pausa para respirar no meio
 * do mesmo assalto. Ver `ajustes.diplomacia.tregoaEmTurnos`.
 *
 * O estado guarda **só o que foge do normal**: os pares em guerra e as tréguas em curso. Paz
 * é a ausência de registro — a mesma escolha do nível de imposto, e pelo mesmo motivo: o
 * padrão não precisa ser escrito para valer.
 */

import type { NucleoDaCampanha, Permissao } from '../nucleo';
import { acessoAte, rasgarAcessosEntre } from './acesso-militar';
import type { Tributo } from '../estado-campanha';
import { vivo } from '../governo/poderes';
import { darOuro, gastar, tesouroDe } from '../governo/tesouro';
import { rendaBaseDe, rendaDe } from '../provincia/renda';
import { valorDoTributo } from './tributo';
import { alcancaComercio, temPorto } from '../comercio/alcance';
import { povoDoPoder } from '../sociedade/nacionalidade';
import {
  aceitaSerAnexado,
  apagarVinculo,
  chefeDe,
  entrarNaLiga,
  ligadosDe,
  podeEntrarNaLiga,
} from './liga';
import { trocarDono } from '../provincia/posse';
import { herdarTropasDoMembro, repatriarDepoisDaPaz } from '../guerra/repatriar';
import {
  aliadosDe,
  aliancaAte,
  apagarAlianca,
  assinarAlianca,
  convocadosPor,
  limparAliancasVencidas,
  podeAliar,
} from './alianca';
import { parDe } from './par';
import {
  alvoDaRelacao,
  aproximarRelacao,
  comChoque,
  comPresente,
  parcelasDaRelacao,
  pontosDoPresente,
} from './relacao';
import type { ParcelaDaRelacao, SituacaoDaRelacao } from './relacao';


/** Estes dois estão em guerra agora? */
export function emGuerra(nucleo: NucleoDaCampanha, a: string, b: string): boolean {
  if (a === b) return false;
  return nucleo.estado.guerras[parDe(a, b)] !== undefined;
}

/** Desde que turno estes dois se enfrentam. `undefined` quando estão em paz. */
export function guerraDesde(
  nucleo: NucleoDaCampanha,
  a: string,
  b: string,
): number | undefined {
  return nucleo.estado.guerras[parDe(a, b)];
}

/** Até que turno a trégua entre estes dois segura. `undefined` quando não há trégua. */
export function tregoaAte(
  nucleo: NucleoDaCampanha,
  a: string,
  b: string,
): number | undefined {
  const ate = nucleo.estado.tregoas[parDe(a, b)];
  return ate !== undefined && ate > nucleo.estado.turno ? ate : undefined;
}

/** Com quem este poder está em guerra, em ordem de id. */
export function guerrasDe(nucleo: NucleoDaCampanha, idPoder: string): readonly string[] {
  const inimigos: string[] = [];
  for (const par of Object.keys(nucleo.estado.guerras).sort()) {
    const [a, b] = par.split('|');
    if (a === undefined || b === undefined) continue;
    if (a === idPoder) inimigos.push(b);
    else if (b === idPoder) inimigos.push(a);
  }
  return inimigos.sort();
}

export function podeDeclararGuerra(
  nucleo: NucleoDaCampanha,
  de: string,
  contra: string,
): Permissao {
  if (de === contra) return { pode: false, motivo: 'não se declara guerra a si mesmo' };
  if (!vivo(nucleo, de) || !vivo(nucleo, contra)) {
    return { pode: false, motivo: 'este poder não está mais no jogo' };
  }
  if (emGuerra(nucleo, de, contra)) {
    return { pode: false, motivo: 'a guerra já está declarada' };
  }
  // ⚠️ A LIGA trava antes de tudo: chefe e membro não se atacam enquanto ela dura. Quem quiser
  // atacar tem de romper — e romper é o que já custa reputação com o mapa inteiro.
  if (chefeDe(nucleo, de) === contra) {
    return { pode: false, motivo: 'ele é o CHEFE da sua liga — saia dela antes' };
  }
  if (chefeDe(nucleo, contra) === de) {
    return { pode: false, motivo: 'ele é MEMBRO da sua liga — solte-o antes' };
  }
  // ⚠️ A ALIANÇA trava antes do pacto, e a mensagem é outra de propósito: quem está prestes a
  // atacar um aliado precisa ler a palavra aliado, não a palavra pacto.
  // A aliança não tem prazo: não há turnos a contar.
  if (aliancaAte(nucleo, de, contra) !== undefined) {
    return { pode: false, motivo: 'ele é seu ALIADO — rompa antes' };
  }
  // ⚠️ O pacto TRAVA a guerra, como a trégua. A diferença é que ele tem uma saída explícita —
  // `romperPacto` — e ela custa a reputação com o mapa inteiro.
  const pacto = pactoAte(nucleo, de, contra);
  if (pacto !== undefined) {
    const faltam = pacto - nucleo.estado.turno;
    return {
      pode: false,
      motivo: `há pacto de não-agressão por mais ${faltam} ${faltam === 1 ? 'turno' : 'turnos'} — rompa antes`,
    };
  }
  // ⚠️ O TRIBUTO trava a guerra de um lado só: o de quem RECEBE. É literalmente o que o ouro
  // comprou. Quem paga continua livre para declarar — quem paga é quem quer sair da situação,
  // e prendê-lo também transformaria o tributo numa jaula que se compra com o próprio dinheiro.
  const tributo = tributoEntre(nucleo, de, contra);
  if (tributo !== undefined && tributo.pagador === contra) {
    const faltam = tributo.ate - nucleo.estado.turno;
    return {
      pode: false,
      motivo: `ele paga tributo a você por mais ${faltam} ${faltam === 1 ? 'turno' : 'turnos'} — rompa antes`,
    };
  }
  const tregoa = tregoaAte(nucleo, de, contra);
  if (tregoa !== undefined) {
    const faltam = tregoa - nucleo.estado.turno;
    return {
      pode: false,
      motivo: `a trégua ainda segura por ${faltam} ${faltam === 1 ? 'turno' : 'turnos'}`,
    };
  }
  return { pode: true };
}

/** Registra a guerra. Devolve `false` quando ela não podia ser declarada. */
export function declararGuerra(
  nucleo: NucleoDaCampanha,
  de: string,
  contra: string,
  /**
   * Passa por cima da trégua. **Só o levante usa isto.**
   *
   * ⚠️ Quem pega em armas contra o ocupante não consultou tratado nenhum — e um levante mudo,
   * impedido de lutar por um papel assinado pelo governo que ele está derrubando, seria a
   * cidade em chamas e os dois exércitos acampados lado a lado.
   */
  apesarDaTregoa = false,
): boolean {
  if (apesarDaTregoa && de !== contra && !emGuerra(nucleo, de, contra)) {
    nucleo.estado.guerras[parDe(de, contra)] = nucleo.estado.turno;
    delete nucleo.estado.tregoas[parDe(de, contra)];
    desfazerAcordo(nucleo, de, contra);
    rasgarAcessosEntre(nucleo, de, contra);
    // Quem pega em armas contra o ocupante não consultou tratado nenhum — nem o que ele mesmo
    // estava pagando. E não há preço de reputação: não foi o governo quem quebrou a promessa.
    delete nucleo.estado.tributos[parDe(de, contra)];
    return true;
  }
  if (!podeDeclararGuerra(nucleo, de, contra).pode) return false;
  abrirGuerra(nucleo, de, contra);
  // ⚠️ **A ALIANÇA convoca, e é aqui que ela cobra o que promete.** Os aliados dos dois lados
  // entram no MESMO turno, sem perguntar: a agência foi assinar, e ela continua existindo em
  // `romperAlianca`. Ver `alianca.ts`.
  //
  // ⚠️ E as guerras convocadas NÃO convocam de novo. Aliado de aliado não é aliado; a chamada
  // sai daqui e morre aqui, senão uma escaramuça de fronteira viraria guerra mundial em três
  // turnos. É por isso que este laço chama `abrirGuerra` e não `declararGuerra`.
  for (const convocado of convocadosPor(nucleo, de, contra, jaPrometido(nucleo), (poder) => [
    ...aliadosDe(nucleo, poder),
    ...ligadosDe(nucleo, poder),
  ])) {
    if (emGuerra(nucleo, convocado.poder, convocado.inimigo)) continue;
    if (!vivo(nucleo, convocado.poder) || !vivo(nucleo, convocado.inimigo)) continue;
    abrirGuerra(nucleo, convocado.poder, convocado.inimigo);
  }
  return true;
}

/** Registra a guerra e rasga o que ela rasga. Sem convocar ninguém: ver `declararGuerra`. */
function abrirGuerra(nucleo: NucleoDaCampanha, de: string, contra: string): void {
  nucleo.estado.guerras[parDe(de, contra)] = nucleo.estado.turno;
  // ⚠️ A guerra rasga a passagem nos DOIS sentidos, e sem preço: quem declara guerra ao dono
  // da estrada não continua andando por ela com licença dele. Ver `acesso-militar.ts`.
  rasgarAcessosEntre(nucleo, de, contra);
  // ⚠️ A guerra desfaz o comércio na hora, e é isso que dá ao acordo um peso que não é só
  // dinheiro: quem declara vê a renda cair no mesmo turno em que ganha um inimigo.
  desfazerAcordo(nucleo, de, contra);
}

/**
 * Há papel assinado entre estes dois que a convocação não pode rasgar de graça?
 *
 * ⚠️ **É a regra 4 da aliança, e ela mora aqui porque quem sabe o que existe entre dois poderes
 * é este arquivo.** Pacto, trégua ou aliança com o inimigo seguram a chamada: a aliança não faz
 * você quebrar sem custo uma promessa que te custaria reputação quebrar sozinho. Quem quiser
 * entrar mesmo assim rompe o que atrapalha, e paga por isso.
 */
function jaPrometido(nucleo: NucleoDaCampanha): (a: string, b: string) => boolean {
  return (a, b) =>
    pactoAte(nucleo, a, b) !== undefined ||
    tregoaAte(nucleo, a, b) !== undefined ||
    aliancaAte(nucleo, a, b) !== undefined ||
    // Ninguém é arrastado contra o próprio chefe nem contra o próprio membro.
    chefeDe(nucleo, a) === b ||
    chefeDe(nucleo, b) === a;
}

export function podeFazerPaz(
  nucleo: NucleoDaCampanha,
  a: string,
  b: string,
): Permissao {
  if (!emGuerra(nucleo, a, b)) return { pode: false, motivo: 'vocês não estão em guerra' };
  return { pode: true };
}

/**
 * Encerra a guerra e abre a trégua.
 *
 * ⚠️ **Quem chama já tem o SIM dos dois lados.** Este módulo não sabe negociar — ele registra
 * o acordo. Quem decide se a IA aceita é `src/ia/diplomacia/paz.ts`, e é a aplicação que junta
 * as duas coisas. Misturar aqui faria a regra do jogo depender da cabeça de um dos jogadores.
 */
export function fazerPaz(nucleo: NucleoDaCampanha, a: string, b: string): boolean {
  if (!emGuerra(nucleo, a, b)) return false;
  const par = parDe(a, b);
  delete nucleo.estado.guerras[par];
  nucleo.estado.tregoas[par] = nucleo.estado.turno + nucleo.ajustes.diplomacia.tregoaEmTurnos;
  // ⚠️ **A paz LEVANTA os cercos entre os dois, e a falta disto foi vista jogando.** Medido:
  // Elêusis assinou a paz com Mégara no turno 3 e ASSALTOU Mégara no turno 5 — o exército
  // continuava sentado, o cerco continuava registrado, e a regra da cidade não perguntava se
  // ainda havia guerra. Além do absurdo, a praça sitiada fica fora da circulação e passa fome:
  // uma paz que não levanta o cerco é uma guerra que continua com outro nome.
  for (const [provincia, cerco] of Object.entries(nucleo.estado.cercos)) {
    const dono = nucleo.territorios.donoDe(provincia);
    const entreOsDois =
      (cerco.sitiante === a && dono === b) || (cerco.sitiante === b && dono === a);
    if (entreOsDois) delete nucleo.estado.cercos[provincia];
  }
  // E a tropa de cada um que pisava na terra do outro volta para casa: sem isto ela podia ficar
  // presa para sempre, cercada de terra em paz. Ver `guerra/repatriar.ts`.
  repatriarDepoisDaPaz(nucleo, a, b);
  return true;
}

/**
 * Encerra as guerras contra quem não existe mais.
 *
 * ⚠️ **Sem isto a diplomacia trava o mapa inteiro, e travou.** Medido: a IA declarava guerra ao
 * vizinho, tomava a única terra dele no turno seguinte — e continuava em guerra com um poder
 * que não tinha mais chão nem tropa. Como ela só abre uma guerra de cada vez, aquele registro
 * fantasma a impedia de declarar qualquer outra pelo resto da campanha. Em 100 turnos: 8
 * guerras declaradas, 294 poder-turnos de guerra sem inimigo por perto e 9 conquistas.
 *
 * Poder no EXÍLIO — sem chão mas com tropa em pé — continua sendo inimigo: ele ainda tem um
 * exército no mapa, e é a deserção por falta de folha que vai encerrar aquilo.
 */
export function limparGuerrasMortas(nucleo: NucleoDaCampanha): void {
  for (const par of Object.keys(nucleo.estado.guerras)) {
    const [a, b] = par.split('|');
    if (a === undefined || b === undefined) continue;
    if (!vivo(nucleo, a) || !vivo(nucleo, b)) delete nucleo.estado.guerras[par];
  }
}

/** A opinião deste par agora. Zero — indiferença — para quem nunca se esbarrou. */
export function relacaoEntre(nucleo: NucleoDaCampanha, a: string, b: string): number {
  if (a === b) return 100;
  return nucleo.estado.relacoes[parDe(a, b)] ?? 0;
}

/**
 * A situação que decide o alvo da opinião — só fatos que o jogador vê no mapa.
 *
 * Fica aqui, e não em `relacao.ts`, pelo mesmo motivo que `SituacaoDaProvincia` é montada
 * fora do arquivo da felicidade: o cálculo é puro e testável sozinho; quem sabe ler o mundo é
 * a campanha. Privada porque ninguém de fora pergunta a situação — pergunta-se a OPINIÃO, ou
 * a conta dela.
 */
function situacaoDaRelacao(
  nucleo: NucleoDaCampanha,
  a: string,
  b: string,
): SituacaoDaRelacao {
  const minhas = nucleo.territorios.provinciasDe(a);
  const delas = nucleo.territorios.provinciasDe(b);
  const povoDeA = povoDoPoder(nucleo, a);
  return {
    emGuerra: emGuerra(nucleo, a, b),
    tregoa: tregoaAte(nucleo, a, b) === undefined ? 0 : 1,
    fronteira: fronteiraEntre(nucleo, minhas, delas),
    terrasTomadas: terrasTomadasEntre(nucleo, minhas, delas, a, b),
    diferencaDePorte: Math.abs(minhas.length - delas.length),
    amigosDoMeuInimigo: amigosDoMeuInimigo(nucleo, a, b),
    temPacto: pactoAte(nucleo, a, b) !== undefined,
    temAlianca: aliancaAte(nucleo, a, b) !== undefined,
    temAcordo: temAcordo(nucleo, a, b),
    temTributo: tributoEntre(nucleo, a, b) !== undefined,
    // A PIOR das duas: o que envenena a relação é haver um quebrador de promessas nela.
    reputacao: Math.min(reputacaoDe(nucleo, a), reputacaoDe(nucleo, b)),
    // ⚠️ `undefined` de um lado não casa com `undefined` do outro: poder sem ficha não tem
    // tribo, e dois desconhecidos não são "a mesma gente" por igualmente não se saber.
    mesmoPovo: povoDeA !== undefined && povoDeA === povoDoPoder(nucleo, b),
    inimigosComuns: inimigosComuns(nucleo, a, b),
    turnosDePaz: turnosDePaz(nucleo, a, b),
  };
}

/**
 * Quantas províncias encostam nas do outro — **e a conta é a MESMA nos dois sentidos.**
 *
 * ⚠️ **A versão anterior dependia da ordem alfabética, e isso era um defeito.** Ela contava só
 * as províncias DELE que encostam nas minhas, o que não é o mesmo número que o contrário:
 * medido numa partida de 60 turnos, Argos e Epidauro tinham *"fronteira comum (1)"* num sentido
 * e *"(3)"* no outro. Como a opinião é UM número por par e `andarRelacoes` sempre chama na
 * ordem dos ids, quem decidia qual das duas contas valia era o alfabeto.
 *
 * A maior das duas, que é a fronteira vista do lado mais exposto: é ela que dói.
 */
function fronteiraEntre(
  nucleo: NucleoDaCampanha,
  minhas: readonly string[],
  delas: readonly string[],
): number {
  const encostam = (destas: readonly string[], naquelas: readonly string[]): number => {
    const outras = new Set(naquelas);
    return destas.filter((id) => nucleo.atlas.provincia(id).vizinhas.some((v) => outras.has(v)))
      .length;
  };
  return Math.max(encostam(delas, minhas), encostam(minhas, delas));
}

/**
 * Terras que um tem e que eram do outro em 700 a.C. — **somando os DOIS sentidos.**
 *
 * ⚠️ **E este era o pior efeito da assimetria.** Contava só a terra que o primeiro da ordem
 * alfabética tirou do segundo, então **metade das conquistas do mapa não envenenava relação
 * nenhuma**: no par argos–corinto, uma província que Corinto tomasse de Argos era invisível.
 *
 * É a memória da conquista sem guardar memória: enquanto a bandeira estiver na mão do outro,
 * ele lembra. Devolver a terra apaga a mágoa sozinho — dos dois lados.
 */
function terrasTomadasEntre(
  nucleo: NucleoDaCampanha,
  minhas: readonly string[],
  delas: readonly string[],
  a: string,
  b: string,
): number {
  const tomadas = (quais: readonly string[], de: string): number =>
    quais.filter((id) => nucleo.atlas.donoInicial(id) === de).length;
  return tomadas(minhas, b) + tomadas(delas, a);
}

/**
 * Quantos reinos ABRAÇAM o inimigo de um deles — o "amigo do meu inimigo".
 *
 * ⚠️ **É o que transforma diplomacia em ESCOLHA.** Sem ela, ser amigo de todo mundo é grátis e
 * sempre certo: nada no jogo cobrava por assinar com quem está sangrando o teu vizinho. É a
 * parcela que o Age of History 2 e o Total War têm — *"tratados com os inimigos dela baixam a
 * opinião dela"* — e que faltava aqui.
 *
 * ⚠️ **Conta acordo MILITAR, e não comércio, de propósito.** Pacto, aliança, tributo e passagem
 * são compromissos; comércio é a porta de entrada que todo mundo tem com todo mundo, e a mesa
 * acabou de sair de 82% de indiferença justamente por causa dele. Cobrar por comerciar com um
 * inimigo trancaria de volta o degrau mais barato da escada.
 */
function amigosDoMeuInimigo(nucleo: NucleoDaCampanha, a: string, b: string): number {
  const abraca = (quem: string, inimigo: string): boolean =>
    pactoAte(nucleo, quem, inimigo) !== undefined ||
    aliancaAte(nucleo, quem, inimigo) !== undefined ||
    tributoEntre(nucleo, quem, inimigo) !== undefined ||
    // A passagem tem lado; qualquer um dos dois sentidos já é compromisso.
    acessoAte(nucleo, quem, inimigo) !== undefined ||
    acessoAte(nucleo, inimigo, quem) !== undefined;
  const contar = (meu: string, outro: string): number =>
    guerrasDe(nucleo, meu).filter((inimigo) => inimigo !== outro && abraca(outro, inimigo)).length;
  return contar(a, b) + contar(b, a);
}

/** Com quantos reinos os dois estão em guerra ao MESMO tempo. */
function inimigosComuns(nucleo: NucleoDaCampanha, a: string, b: string): number {
  const dele = new Set(guerrasDe(nucleo, b));
  // Um contra o outro não é inimigo em comum: é a guerra dos dois, e ela já tem parcela.
  return guerrasDe(nucleo, a).filter((id) => id !== b && dele.has(id)).length;
}

/**
 * Há quantos turnos estes dois não se enfrentam.
 *
 * ⚠️ **Sai da trégua, e por isso não precisa de estado novo.** O registro de trégua guarda o
 * turno em que ela vence e NÃO é apagado quando vence — `tregoaAte` só para de devolvê-lo. Ele
 * é, portanto, a data em que a última guerra entre os dois deixou de doer, e é dela que a paz
 * se conta. Quem nunca guerreou conta desde o começo da campanha, que é a resposta certa: não
 * ter história de sangue é a paz mais longa que dois reinos podem ter.
 */
function turnosDePaz(nucleo: NucleoDaCampanha, a: string, b: string): number {
  if (emGuerra(nucleo, a, b)) return 0;
  const fimDaTregoa = nucleo.estado.tregoas[parDe(a, b)];
  if (fimDaTregoa === undefined) return nucleo.estado.turno;
  return Math.max(0, nucleo.estado.turno - fimDaTregoa);
}

/** Até que turno o pacto de não-agressão segura. `undefined` quando não há pacto. */
export function pactoAte(
  nucleo: NucleoDaCampanha,
  a: string,
  b: string,
): number | undefined {
  const ate = nucleo.estado.pactos[parDe(a, b)];
  return ate !== undefined && ate > nucleo.estado.turno ? ate : undefined;
}

/** Estes dois têm acordo de comércio em pé? Privada: de fora se pergunta `acordosDe`. */
function temAcordo(nucleo: NucleoDaCampanha, a: string, b: string): boolean {
  return nucleo.estado.acordos[parDe(a, b)] !== undefined;
}

/**
 * Este acordo de comércio pode ser assinado?
 *
 * ⚠️ **A exigência de opinião é BAIXA de propósito.** Comércio historicamente vem antes da
 * confiança militar, não depois: mercadores atravessam fronteiras que exércitos não atravessam.
 * Exigir pacto antes tornaria a cadeia longa demais — presente, pacto, comércio — para o jogador
 * sentir o resultado, e mataria o caminho pacífico que o acordo existe para abrir.
 */
export function podeAcordarComercio(
  nucleo: NucleoDaCampanha,
  a: string,
  b: string,
): Permissao {
  if (a === b) return { pode: false, motivo: 'não se comercia consigo mesmo' };
  if (!vivo(nucleo, a) || !vivo(nucleo, b)) {
    return { pode: false, motivo: 'este poder não está mais no jogo' };
  }
  if (emGuerra(nucleo, a, b)) return { pode: false, motivo: 'vocês estão em guerra' };
  if (temAcordo(nucleo, a, b)) return { pode: false, motivo: 'o acordo já está de pé' };
  // ⚠️ **A mercadoria precisa de um caminho.** Por terra quando os dois se tocam; por mar
  // quando os dois têm Porto — que é o que o catálogo já prometia no motivo da obra. Ver
  // `comercio/alcance.ts` para a medição que levou a isto.
  if (!alcancaComercio(nucleo, a, b)) {
    return {
      pode: false,
      motivo: temPorto(nucleo, a)
        ? 'longe demais: falta um Porto do lado dele'
        : 'longe demais: sem fronteira, o comércio exige Porto nos dois lados',
    };
  }
  const minima = nucleo.ajustes.acordoDeComercio.opiniaoMinima;
  if (relacaoEntre(nucleo, a, b) < minima) {
    return { pode: false, motivo: `ele ainda não confia o bastante: exige opinião ${minima}` };
  }
  return { pode: true };
}

/** Assina o acordo. Devolve `false` quando ele não podia ser assinado. */
export function acordarComercio(nucleo: NucleoDaCampanha, a: string, b: string): boolean {
  if (!podeAcordarComercio(nucleo, a, b).pode) return false;
  nucleo.estado.acordos[parDe(a, b)] = nucleo.estado.turno;
  return true;
}

/**
 * Desfaz o acordo. Sem prazo e sem preço de reputação: comércio não é promessa de paz.
 *
 * ⚠️ Chamado também pela declaração de guerra — e é isso que faz o comércio virar uma razão de
 * DINHEIRO para não atacar alguém. Quem declara vê a renda cair no mesmo turno.
 */
export function desfazerAcordo(nucleo: NucleoDaCampanha, a: string, b: string): boolean {
  if (!temAcordo(nucleo, a, b)) return false;
  delete nucleo.estado.acordos[parDe(a, b)];
  return true;
}

/** A reputação deste poder, de −100 a 0. Zero é quem nunca quebrou promessa. */
export function reputacaoDe(nucleo: NucleoDaCampanha, idPoder: string): number {
  return nucleo.estado.reputacao[idPoder] ?? 0;
}

/**
 * Os prazos de pacto da escada, do mais longo ao mais curto, com o que a REGRA diz de cada um.
 *
 * ⚠️ **Só regra: guerra, pacto em pé, prazo que existe.** Se ELE assina é outra pergunta, e
 * ela mora na balança (`ia/diplomacia/pactos.ts › balancaDoPacto`). Antes a opinião mínima
 * morava aqui, e a mesma confiança era cobrada duas vezes — pela regra e pela vontade —, com
 * as duas discordando: a regra dizia sim por medo e a vontade dizia não pela opinião.
 */
export function prazosDePacto(
  nucleo: NucleoDaCampanha,
  a: string,
  b: string,
): readonly { turnos: number; pode: boolean; motivo: string }[] {
  return [...nucleo.ajustes.diplomacia.pacto.prazos]
    .sort((x, y) => y.turnos - x.turnos)
    .map((prazo) => {
      const r = podeFirmarPacto(nucleo, a, b, prazo.turnos);
      return { turnos: prazo.turnos, pode: r.pode, motivo: r.pode ? '' : r.motivo };
    });
}

/**
 * Este pacto pode ser firmado? **Regra, e só regra.** A vontade dele é a balança.
 */
export function podeFirmarPacto(
  nucleo: NucleoDaCampanha,
  a: string,
  b: string,
  turnos: number,
  ouro = 0,
): Permissao {
  if (a === b) return { pode: false, motivo: 'não se firma pacto consigo mesmo' };
  if (!vivo(nucleo, a) || !vivo(nucleo, b)) {
    return { pode: false, motivo: 'este poder não está mais no jogo' };
  }
  if (emGuerra(nucleo, a, b)) return { pode: false, motivo: 'vocês estão em guerra' };
  if (pactoAte(nucleo, a, b) !== undefined) {
    return { pode: false, motivo: 'já existe um pacto em pé' };
  }
  const prazo = nucleo.ajustes.diplomacia.pacto.prazos.find((p) => p.turnos === turnos);
  if (!prazo) return { pode: false, motivo: 'este prazo não existe' };
  return podeOferecerOuro(nucleo, a, ouro);
}

/** Assina o pacto. Devolve `false` quando ele não podia ser assinado. */
export function firmarPacto(
  nucleo: NucleoDaCampanha,
  a: string,
  b: string,
  turnos: number,
  ouro = 0,
): boolean {
  if (!podeFirmarPacto(nucleo, a, b, turnos, ouro).pode) return false;
  transferirOferta(nucleo, a, b, ouro);
  nucleo.estado.pactos[parDe(a, b)] = nucleo.estado.turno + turnos;
  return true;
}

/**
 * Rompe o pacto — **e o mapa inteiro fica sabendo.**
 *
 * ⚠️ É a única saída de um pacto antes do prazo, e ela é cara de propósito: a opinião do traído
 * despenca e a REPUTAÇÃO de quem rompeu cai, o que entra na conta de todos os outros pares dele.
 * Sem esse preço, assinar não custaria nada, e um pacto que não custa nada é um papel que não
 * vale nada.
 */
export function romperPacto(nucleo: NucleoDaCampanha, quem: string, com: string): boolean {
  if (pactoAte(nucleo, quem, com) === undefined) return false;
  const pacto = nucleo.ajustes.diplomacia.pacto;
  delete nucleo.estado.pactos[parDe(quem, com)];
  abalarRelacao(nucleo, quem, com, pacto.choqueDeRuptura);
  nucleo.estado.reputacao[quem] = Math.max(
    -100,
    reputacaoDe(nucleo, quem) + pacto.reputacaoDaRuptura,
  );
  return true;
}

/** Os prazos de aliança da escada, do mais longo ao mais curto, com o que a REGRA diz. */
export function prazosDeAlianca(
  nucleo: NucleoDaCampanha,
  a: string,
  b: string,
): readonly { turnos: number; pode: boolean; motivo: string }[] {
  return [...nucleo.ajustes.diplomacia.alianca.prazos]
    .sort((x, y) => y.turnos - x.turnos)
    .map((prazo) => {
      const r = podeFirmarAlianca(nucleo, a, b, prazo.turnos);
      return { turnos: prazo.turnos, pode: r.pode, motivo: r.pode ? '' : r.motivo };
    });
}

/** Esta aliança pode ser assinada? Regra, e só regra — ver `alianca.ts`. */
export function podeFirmarAlianca(
  nucleo: NucleoDaCampanha,
  a: string,
  b: string,
  turnos: number,
  ouro = 0,
): Permissao {
  const regra = podeAliar(
    nucleo,
    a,
    b,
    turnos,
    (x, y) => emGuerra(nucleo, x, y),
    (id) => vivo(nucleo, id),
  );
  return regra.pode ? podeOferecerOuro(nucleo, a, ouro) : regra;
}

/** Assina a aliança. Devolve `false` quando ela não podia ser assinada. */
export function firmarAlianca(
  nucleo: NucleoDaCampanha,
  a: string,
  b: string,
  turnos: number,
  ouro = 0,
): boolean {
  if (!podeFirmarAlianca(nucleo, a, b, turnos, ouro).pode) return false;
  transferirOferta(nucleo, a, b, ouro);
  assinarAlianca(nucleo, a, b, turnos);
  return true;
}

/** Ouro que acompanha uma assinatura: precisa existir e troca de cofre sem comprar opinião. */
function podeOferecerOuro(
  nucleo: NucleoDaCampanha,
  de: string,
  ouro: number,
): Permissao {
  if (!Number.isInteger(ouro) || ouro < 0) {
    return { pode: false, motivo: 'a oferta precisa ser um número inteiro de moedas' };
  }
  if (tesouroDe(nucleo, de) < ouro) return { pode: false, motivo: 'seu tesouro não tem isso' };
  return { pode: true };
}

function transferirOferta(
  nucleo: NucleoDaCampanha,
  de: string,
  para: string,
  ouro: number,
): void {
  if (ouro === 0) return;
  gastar(nucleo, de, ouro);
  darOuro(nucleo, para, ouro);
}

/**
 * Rompe a aliança — **e custa mais caro que romper um pacto.**
 *
 * ⚠️ É a saída, e é ela que responde "e se a guerra do meu aliado não me servir?". Serve: rompa
 * e fique fora dela. Mas abandonar quem contava com você é pior que voltar atrás numa promessa
 * de não atacar, e o preço diz isso — o choque na opinião do abandonado e a REPUTAÇÃO com o
 * mapa inteiro caem mais que no pacto.
 */
export function romperAlianca(nucleo: NucleoDaCampanha, quem: string, com: string): boolean {
  if (aliancaAte(nucleo, quem, com) === undefined) return false;
  const alianca = nucleo.ajustes.diplomacia.alianca;
  apagarAlianca(nucleo, quem, com);
  abalarRelacao(nucleo, quem, com, alianca.choqueDeRuptura);
  nucleo.estado.reputacao[quem] = Math.max(
    -100,
    reputacaoDe(nucleo, quem) + alianca.reputacaoDaRuptura,
  );
  return true;
}

/** Esta liga pode ser formada? A regra mora em `liga.ts`. */
export function podeFormarLiga(
  nucleo: NucleoDaCampanha,
  chefe: string,
  membro: string,
): Permissao {
  return podeEntrarNaLiga(
    nucleo,
    chefe,
    membro,
    emGuerra(nucleo, chefe, membro),
    vivo(nucleo, chefe) && vivo(nucleo, membro),
    relacaoEntre(nucleo, chefe, membro),
  );
}

/** Forma a liga. Devolve `false` quando ela não podia ser formada. */
export function formarLiga(nucleo: NucleoDaCampanha, chefe: string, membro: string): boolean {
  if (!podeFormarLiga(nucleo, chefe, membro).pode) return false;
  entrarNaLiga(nucleo, chefe, membro);
  return true;
}

/**
 * Desfaz a liga — **e o preço depende de QUEM desfaz.**
 *
 * ⚠️ **O chefe soltar é de graça; o membro fugir custa.** Não é favorecimento: a promessa da
 * liga é do membro, que trocou obediência por proteção. Quem liberta não quebrou nada —
 * devolveu. Quem foge no meio quebrou, e paga a mesma reputação que pagaria rompendo um pacto.
 */
export function romperLiga(nucleo: NucleoDaCampanha, quem: string, outro: string): boolean {
  const membro = chefeDe(nucleo, quem) === outro ? quem : chefeDe(nucleo, outro) === quem ? outro : undefined;
  if (membro === undefined) return false;
  const fugiu = membro === quem;
  apagarVinculo(nucleo, membro);
  if (fugiu) {
    const liga = nucleo.ajustes.diplomacia.liga;
    nucleo.estado.reputacao[quem] = Math.max(
      -100,
      reputacaoDe(nucleo, quem) + liga.reputacaoDaRuptura,
    );
  }
  return true;
}

/**
 * O membro vira província do chefe — **e só com o SIM dele.**
 *
 * ⚠️ **Usa `trocarDono` e não `conquistar`**, e a diferença é o choque de humor da queda: uma
 * cidade que ACEITOU passar não é uma cidade tomada. O preço permanente continua existindo e é
 * outro — a nacionalidade, que não se apaga: Mégara é dória, e sob Atenas ela custa o humor de
 * povo estrangeiro para sempre.
 */
export function anexarMembro(nucleo: NucleoDaCampanha, chefe: string, membro: string): boolean {
  if (chefeDe(nucleo, membro) !== chefe) return false;
  if (!aceitaSerAnexado(nucleo, membro)) return false;
  for (const provincia of [...nucleo.territorios.provinciasDe(membro)].sort()) {
    trocarDono(nucleo, provincia, chefe);
  }
  herdarTropasDoMembro(nucleo, membro, chefe);
  apagarVinculo(nucleo, membro);
  return true;
}

/**
 * A reputação volta devagar para zero, os pactos vencidos somem e a aliança que azedou se
 * desfaz. Devolve os pares de aliados que deixaram de ser, para a crônica contar.
 *
 * Rancor por promessa quebrada não é eterno: quem traiu uma vez e passou cinquenta turnos sem
 * repetir volta a ser alguém com quem se assina.
 */
export function andarReputacao(
  nucleo: NucleoDaCampanha,
): readonly (readonly [string, string])[] {
  const passo = nucleo.ajustes.diplomacia.pacto.reputacaoPorTurno;
  for (const [poder, valor] of Object.entries(nucleo.estado.reputacao)) {
    const novo = Math.min(0, valor + passo);
    if (novo === 0) delete nucleo.estado.reputacao[poder];
    else nucleo.estado.reputacao[poder] = novo;
  }
  for (const [par, ate] of Object.entries(nucleo.estado.pactos)) {
    if (ate <= nucleo.estado.turno) delete nucleo.estado.pactos[par];
  }
  return limparAliancasVencidas(nucleo, (a, b) => relacaoEntre(nucleo, a, b));
}

/** A conta do alvo, parcela a parcela — é o que a tela mostra linha a linha. */
export function parcelasDaRelacaoEntre(
  nucleo: NucleoDaCampanha,
  a: string,
  b: string,
): readonly ParcelaDaRelacao[] {
  return parcelasDaRelacao(situacaoDaRelacao(nucleo, a, b), nucleo.ajustes.diplomacia);
}

/**
 * Anda a opinião de todos os pares que importam, um passo por turno.
 *
 * ⚠️ **Só entre os poderes COM FICHA.** São 18 deles: 153 pares, e cada um vira decisão de
 * alguém. Com os 139 do mapa seriam 9.591 pares em que nada acontece — e opinião que não vira
 * decisão nenhuma é tabela crescendo no salvamento à toa.
 *
 * Pares que chegam ao alvo e ficam em zero saem do registro: indiferença é a ausência dele.
 */
export function andarRelacoes(nucleo: NucleoDaCampanha, comFicha: readonly string[]): void {
  const passo = nucleo.ajustes.diplomacia.passoPorTurno;
  const ordenados = [...comFicha].sort();
  for (const [i, a] of ordenados.entries()) {
    for (const b of ordenados.slice(i + 1)) {
      const par = parDe(a, b);
      const atual = nucleo.estado.relacoes[par] ?? 0;
      const alvo = alvoDaRelacao(situacaoDaRelacao(nucleo, a, b), nucleo.ajustes.diplomacia);
      const novo = aproximarRelacao(atual, alvo, passo);
      if (novo === 0) delete nucleo.estado.relacoes[par];
      else nucleo.estado.relacoes[par] = novo;
    }
  }
}

/**
 * Este presente pode ser dado?
 *
 * ⚠️ **Presente é um GESTO, e gesto não se faz para quem já está trocando tiros com você.** Em
 * guerra, ouro entregue ao inimigo é ouro financiando o exército que vem te bater — e a mesa
 * onde se conversa é a da PAZ. Quem quer sair da guerra pede paz, não manda um cesto.
 */
export function podePresentear(
  nucleo: NucleoDaCampanha,
  de: string,
  para: string,
  ouro: number,
): Permissao {
  if (de === para) return { pode: false, motivo: 'não se presenteia a si mesmo' };
  if (!vivo(nucleo, de) || !vivo(nucleo, para)) {
    return { pode: false, motivo: 'este poder não está mais no jogo' };
  }
  if (emGuerra(nucleo, de, para)) {
    return { pode: false, motivo: 'vocês estão em guerra — peça paz antes' };
  }
  if (!Number.isInteger(ouro) || ouro <= 0) {
    return { pode: false, motivo: 'o presente precisa ser um número inteiro de moedas' };
  }
  if (tesouroDe(nucleo, de) < ouro) {
    return { pode: false, motivo: 'seu tesouro não tem isso' };
  }
  return { pode: true };
}

/** Quanto ESTE presente valeria para ELE, em pontos de opinião. A tela mostra antes. */
export function valorDoPresente(
  nucleo: NucleoDaCampanha,
  para: string,
  ouro: number,
): number {
  return pontosDoPresente(ouro, rendaDe(nucleo, para), nucleo.ajustes.diplomacia);
}

/**
 * O ouro muda de cofre e a opinião sobe — **até o teto acima do alvo, e nem um ponto além.**
 *
 * Devolve os pontos que o gesto valeu, para a tela poder dizer o que aconteceu.
 */
export function presentear(
  nucleo: NucleoDaCampanha,
  de: string,
  para: string,
  ouro: number,
): number {
  if (!podePresentear(nucleo, de, para, ouro).pode) return 0;
  gastar(nucleo, de, ouro);
  darOuro(nucleo, para, ouro);

  const pontos = valorDoPresente(nucleo, para, ouro);
  const par = parDe(de, para);
  const alvo = alvoDaRelacao(situacaoDaRelacao(nucleo, de, para), nucleo.ajustes.diplomacia);
  const antes = nucleo.estado.relacoes[par] ?? 0;
  const novo = comPresente(antes, alvo, pontos, nucleo.ajustes.diplomacia);
  if (novo === 0) delete nucleo.estado.relacoes[par];
  else nucleo.estado.relacoes[par] = novo;
  return novo - antes;
}

/** O choque de um ato sobre a opinião de um par. Ver `comChoque`. */
export function abalarRelacao(
  nucleo: NucleoDaCampanha,
  a: string,
  b: string,
  pontos: number,
): void {
  if (a === b) return;
  const par = parDe(a, b);
  const novo = comChoque(nucleo.estado.relacoes[par] ?? 0, pontos);
  if (novo === 0) delete nucleo.estado.relacoes[par];
  else nucleo.estado.relacoes[par] = novo;
}

/**
 * Apaga as tréguas que já venceram.
 *
 * Chamado uma vez por virada. Sem isto o registro cresceria para sempre com pares que não
 * significam mais nada — e o salvamento carregaria a lista inteira de tréguas de uma campanha
 * de quinhentos turnos.
 */
export function limparTregoas(nucleo: NucleoDaCampanha): void {
  for (const [par, ate] of Object.entries(nucleo.estado.tregoas)) {
    if (ate <= nucleo.estado.turno) delete nucleo.estado.tregoas[par];
  }
}

/**
 * O tributo em pé entre estes dois, ou `undefined` quando não há nenhum.
 *
 * Vencido conta como inexistente, do mesmo jeito que o pacto: a tabela ainda guarda a linha até
 * a próxima virada limpar, mas ela já não segura mais nada.
 */
export function tributoEntre(
  nucleo: NucleoDaCampanha,
  a: string,
  b: string,
): Tributo | undefined {
  const tributo = nucleo.estado.tributos[parDe(a, b)];
  return tributo !== undefined && tributo.ate > nucleo.estado.turno ? tributo : undefined;
}

/** Os dois nomes de uma chave de par, na ordem em que ela os guarda. */
function ladosDo(par: string): readonly [string, string] {
  const corte = par.indexOf('|');
  return [par.slice(0, corte), par.slice(corte + 1)];
}

/**
 * Os tributos em pé deste poder, com quem está do outro lado de cada um, em ordem de id.
 *
 * Serve à tela e à IA: é por aqui que se pergunta "eu já pago alguém?" — e a resposta importa,
 * porque um poder que compra o sossego de dois vizinhos ao mesmo tempo entrega quase um terço
 * da renda pela mesma coisa.
 */
export function tributosDe(
  nucleo: NucleoDaCampanha,
  idPoder: string,
): readonly { com: string; tributo: Tributo }[] {
  const lista: { com: string; tributo: Tributo }[] = [];
  for (const par of Object.keys(nucleo.estado.tributos).sort()) {
    const tributo = nucleo.estado.tributos[par];
    if (tributo === undefined || tributo.ate <= nucleo.estado.turno) continue;
    const [a, b] = ladosDo(par);
    if (a === idPoder) lista.push({ com: b, tributo });
    else if (b === idPoder) lista.push({ com: a, tributo });
  }
  return lista;
}

/**
 * O que os tributos deste poder somam ou tiram do cofre dele por turno.
 *
 * ⚠️ **Entra na RENDA, e é por isso que o número que o jogador lê não mente.** Uma sangria de
 * 63 moedas por turno escondida fora da renda faria o balanço prometer um exército que o cofre
 * não paga — e a IA, que decide obra e recrutamento pela renda, gastaria dinheiro que já tem
 * dono. Positivo em quem recebe, negativo em quem paga, e a soma do mapa é sempre zero.
 */
export function saldoDeTributosDe(nucleo: NucleoDaCampanha, idPoder: string): number {
  // ⚠️ `for...in` e não `Object.entries`, e não é preciosismo: esta função roda dentro de
  // `rendaDe`, que é a conta mais chamada do jogo — cada província, de cada poder, a cada
  // decisão da IA. `entries` alocaria um array novo em todas elas, e a tabela está VAZIA na
  // esmagadora maioria das partidas. O laço nu não aloca nada quando não há tributo nenhum.
  const tributos = nucleo.estado.tributos;
  let saldo = 0;
  for (const par in tributos) {
    const tributo = tributos[par];
    if (tributo === undefined || tributo.ate <= nucleo.estado.turno) continue;
    const [a, b] = ladosDo(par);
    if (a !== idPoder && b !== idPoder) continue;
    saldo += tributo.pagador === idPoder ? -tributo.ouro : tributo.ouro;
  }
  return saldo;
}

/**
 * O que um tributo pago por ELE custaria por turno. A tela mostra antes de qualquer assinatura.
 *
 * ⚠️ Medido na renda BASE, sem acordos e sem os tributos que ele já move: senão a conta se
 * morderia, e um poder que recebe tributo de três vizinhos passaria a dever mais por isso.
 */
export function valorDeUmTributoDe(
  nucleo: NucleoDaCampanha,
  pagador: string,
  turnos: number,
): number {
  const prazo = nucleo.ajustes.diplomacia.tributo.prazos.find((p) => p.turnos === turnos);
  if (prazo === undefined) return 0;
  return valorDoTributo(rendaBaseDe(nucleo, pagador), prazo.fracaoDaRenda);
}

/**
 * Os prazos de tributo que ESTE par consegue assinar hoje, do mais curto ao mais longo, já cotados.
 *
 * ⚠️ **Do mais curto ao mais longo é a ordem em que o preço CAI**, e é assim que a tela conta a
 * história sozinha: o jogador lê 80, 60, 48 de cima para baixo e entende o desconto sem que
 * ninguém explique que existe um. A mesma escada dos prazos de pacto, com a moeda no lugar da
 * confiança.
 *
 * ⚠️ **Os que não saem vêm com `pode: false` em vez de sumirem da lista**, como no pacto: um
 * botão que desaparece manda o jogador procurar o que ele não achou, e o preço de um prazo que
 * hoje está trancado é justamente o que faz ele querer destrancá-lo.
 */
export function prazosDeTributo(
  nucleo: NucleoDaCampanha,
  pagador: string,
  recebedor: string,
): readonly { turnos: number; ouro: number; pode: boolean; motivo: string }[] {
  return [...nucleo.ajustes.diplomacia.tributo.prazos]
    .sort((x, y) => x.turnos - y.turnos)
    .map((prazo) => {
      // ⚠️ **O MOTIVO vem junto, e antes ele era jogado fora aqui.** A permissão sabe dizer
      // *"há pacto em pé: você já tem esse sossego de graça"* e *"você já paga tributo a
      // alguém"*, e a tela mostrava, nos seis botões, a mesma frase genérica — "as regras não
      // deixam agora". Cinco motivos que a regra já tinha morriam nesta linha.
      const permissao = podeFirmarTributo(nucleo, pagador, recebedor, prazo.turnos);
      return {
        turnos: prazo.turnos,
        ouro: valorDoTributo(rendaBaseDe(nucleo, pagador), prazo.fracaoDaRenda),
        pode: permissao.pode,
        motivo: permissao.pode ? '' : permissao.motivo,
      };
    });
}

/**
 * Este tributo pode ser assinado?
 *
 * ⚠️ **As regras daqui são NEUTRAS, e a vontade do outro não está entre elas** — a mesma
 * divisão que a paz já usa. Quem decide se a IA aceita ser paga é `src/ia/diplomacia/tributos.ts`,
 * e é a aplicação que junta as duas coisas. Misturar as duas aqui esconderia a decisão dela
 * dentro de uma permissão e tornaria impossível perguntar "e se eu oferecesse mais?".
 *
 * ⚠️ **O pacto em pé BARRA o tributo, e essa é a trava que impede o ouro de ser queimado à
 * toa.** Quem já tem a fronteira garantida de graça não tem o que comprar; deixar assinar seria
 * deixar o jogador pagar por uma coisa que ele já possui.
 */
export function podeFirmarTributo(
  nucleo: NucleoDaCampanha,
  pagador: string,
  recebedor: string,
  turnos: number,
): Permissao {
  if (pagador === recebedor) return { pode: false, motivo: 'não se paga tributo a si mesmo' };
  if (!vivo(nucleo, pagador) || !vivo(nucleo, recebedor)) {
    return { pode: false, motivo: 'este poder não está mais no jogo' };
  }
  if (emGuerra(nucleo, pagador, recebedor)) {
    return { pode: false, motivo: 'vocês estão em guerra — o que se pede agora é paz' };
  }
  if (tributoEntre(nucleo, pagador, recebedor) !== undefined) {
    return { pode: false, motivo: 'já existe um tributo em pé' };
  }
  if (pactoAte(nucleo, pagador, recebedor) !== undefined) {
    return { pode: false, motivo: 'há pacto em pé: você já tem esse sossego de graça' };
  }
  // ⚠️ **UM tributo de cada lado, e esta trava é a mais importante do arquivo.** Sem ela a
  // medição repetiu, número por número, a falha que o pacto já tinha tido: o fraco amarra o
  // forte, o forte vai comer quem não amarrou, e a violência apenas MUDA DE ENDEREÇO. Foram
  // 41 províncias mudando de dono e 11 poderes eliminados, contra 12 e 6 sem tributo nenhum —
  // o mapa não ficou mais seguro, ficou mais desigual.
  //
  // Vender o ano é abrir mão de marchar naquela direção. Quem vende para todo mundo não tem
  // guerra nenhuma sobrando e mantém um exército que não serve para nada; quem paga a dois
  // vizinhos entrega um terço da renda pela mesma coisa e não paga a folha. Um de cada lado.
  if (tributosDe(nucleo, pagador).some((t) => t.tributo.pagador === pagador)) {
    return { pode: false, motivo: 'você já paga tributo a alguém' };
  }
  if (tributosDe(nucleo, recebedor).some((t) => t.tributo.pagador !== recebedor)) {
    return { pode: false, motivo: 'ele já vende o ano a outro' };
  }
  const prazo = nucleo.ajustes.diplomacia.tributo.prazos.find((p) => p.turnos === turnos);
  if (prazo === undefined) return { pode: false, motivo: 'este prazo não existe' };
  const ouro = valorDeUmTributoDe(nucleo, pagador, turnos);
  if (ouro <= 0) return { pode: false, motivo: 'sem renda não há tributo a oferecer' };
  if (tesouroDe(nucleo, pagador) < ouro) {
    return { pode: false, motivo: `seu tesouro não cobre a primeira parcela de ${ouro}` };
  }
  return { pode: true };
}

/**
 * Assina o tributo, congelando o valor de hoje. Devolve `false` quando ele não podia ser assinado.
 */
export function firmarTributo(
  nucleo: NucleoDaCampanha,
  pagador: string,
  recebedor: string,
  turnos: number,
): boolean {
  if (!podeFirmarTributo(nucleo, pagador, recebedor, turnos).pode) return false;
  nucleo.estado.tributos[parDe(pagador, recebedor)] = {
    pagador,
    ate: nucleo.estado.turno + turnos,
    ouro: valorDeUmTributoDe(nucleo, pagador, turnos),
  };
  return true;
}

/**
 * Rompe o tributo antes do prazo — **e custa a quem rompe, dos dois lados da mesa.**
 *
 * ⚠️ Vale para os dois, e de propósito. **Quem recebia e rompeu vendeu um ano que não entregou**,
 * o que é a promessa mais suja que existe neste jogo. E **quem pagava e rompeu deu o calote**:
 * combinou uma quantia e parou de honrá-la. Um preço só para as duas saídas mantém a regra em
 * uma linha, e a diferença que importa já está no mapa — quem parou de pagar vai ser invadido.
 */
export function romperTributo(nucleo: NucleoDaCampanha, quem: string, com: string): boolean {
  if (tributoEntre(nucleo, quem, com) === undefined) return false;
  const ajustes = nucleo.ajustes.diplomacia.tributo;
  delete nucleo.estado.tributos[parDe(quem, com)];
  abalarRelacao(nucleo, quem, com, ajustes.choqueDeRuptura);
  nucleo.estado.reputacao[quem] = Math.max(
    -100,
    reputacaoDe(nucleo, quem) + ajustes.reputacaoDaRuptura,
  );
  return true;
}

/**
 * **A PAZ COMPRADA: o tributo como preço de uma paz que o inimigo recusaria de graça.**
 *
 * ⚠️ **É a porta principal do tributo, e ela existe porque `querPaz` não tinha alavanca nenhuma.**
 * A IA aceita paz por quatro motivos — a guerra é longa, você é mais forte, ela não te odeia, ou
 * não sobrou o que tomar. **Se ela está ganhando e ainda tem alvo, ela recusa, e o jogador que
 * está perdendo não tem absolutamente nada a oferecer.** Perder província a província até não
 * sobrar alvo era a única saída, e isso não é uma decisão: é uma espera.
 *
 * O tributo é o que se põe na mesa ali. Historicamente é o gesto mais comum que existe — Atenas
 * pagando à Pérsia, Roma pagando a Átila — e no jogo ele fecha o ciclo que a diplomacia abriu:
 * **a guerra passa a ter uma saída que não é a derrota.**
 *
 * ⚠️ **A paz sai PRIMEIRO e o tributo depois, e a ordem não é detalhe.** `podeFirmarTributo`
 * recusa quem está em guerra; assinar a paz antes faz a segunda metade passar pela porta da
 * frente, sem exceção nenhuma escrita para este caso. É por isso que tudo é conferido aqui
 * antes de qualquer coisa se mexer — sem essa conferência, um tributo que falhasse depois de a
 * paz já ter saído entregaria a paz de graça.
 */
export function podeFazerPazComTributo(
  nucleo: NucleoDaCampanha,
  quemPaga: string,
  com: string,
  turnos: number,
): Permissao {
  const paz = podeFazerPaz(nucleo, quemPaga, com);
  if (!paz.pode) return paz;
  if (nucleo.ajustes.diplomacia.tributo.prazos.every((p) => p.turnos !== turnos)) {
    return { pode: false, motivo: 'este prazo não existe' };
  }
  if (tributoEntre(nucleo, quemPaga, com) !== undefined) {
    return { pode: false, motivo: 'já existe um tributo em pé' };
  }
  // ⚠️ **As MESMAS travas que `podeFirmarTributo` cobra, e conferi-las aqui não é repetição.**
  // `fazerPazComTributo` assina a paz primeiro e o tributo depois; se o tributo caísse numa
  // trava que só a segunda metade conhece, a paz já teria saído — **de graça e em silêncio**,
  // que é o pior desfecho possível para uma função que existe para cobrar por ela.
  if (tributosDe(nucleo, quemPaga).some((t) => t.tributo.pagador === quemPaga)) {
    return { pode: false, motivo: 'você já paga tributo a alguém' };
  }
  if (tributosDe(nucleo, com).some((t) => t.tributo.pagador !== com)) {
    return { pode: false, motivo: 'ele já vende o ano a outro' };
  }
  const ouro = valorDeUmTributoDe(nucleo, quemPaga, turnos);
  if (ouro <= 0) return { pode: false, motivo: 'sem renda não há tributo a oferecer' };
  if (tesouroDe(nucleo, quemPaga) < ouro) {
    return { pode: false, motivo: `seu tesouro não cobre a primeira parcela de ${ouro}` };
  }
  return { pode: true };
}

/**
 * Os prazos de paz-com-tributo que ESTE par consegue assinar hoje, do mais curto ao mais longo.
 *
 * Existe separada de `prazosDeTributo` por um motivo simples: aquela recusa quem está em guerra,
 * e esta só serve a quem está. São as duas portas do tributo, e cada uma cota a sua.
 */
export function prazosDePazComTributo(
  nucleo: NucleoDaCampanha,
  quemPaga: string,
  com: string,
): readonly { turnos: number; ouro: number; pode: boolean; motivo: string }[] {
  return [...nucleo.ajustes.diplomacia.tributo.prazos]
    .sort((x, y) => x.turnos - y.turnos)
    .map((prazo) => {
      // O motivo vem junto, pela mesma razão de `prazosDeTributo`: a regra sabe dizer por quê.
      const permissao = podeFazerPazComTributo(nucleo, quemPaga, com, prazo.turnos);
      return {
        turnos: prazo.turnos,
        ouro: valorDoTributo(rendaBaseDe(nucleo, quemPaga), prazo.fracaoDaRenda),
        pode: permissao.pode,
        motivo: permissao.pode ? '' : permissao.motivo,
      };
    });
}

/** Assina a paz e o tributo no mesmo ato. Devolve `false` quando o par não podia. */
export function fazerPazComTributo(
  nucleo: NucleoDaCampanha,
  quemPaga: string,
  com: string,
  turnos: number,
): boolean {
  if (!podeFazerPazComTributo(nucleo, quemPaga, com, turnos).pode) return false;
  return fazerPaz(nucleo, quemPaga, com) && firmarTributo(nucleo, quemPaga, com, turnos);
}

/**
 * A virada dos tributos: **os vencidos somem, e os impagáveis quebram na cara de quem prometeu.**
 *
 * ⚠️ **Roda ANTES da arrecadação, e a ordem é o desenho todo.** A renda já carrega o tributo
 * dentro dela, nos dois sentidos — então a única coisa que precisa acontecer antes de o ouro se
 * mexer é decidir quais tributos ainda existem neste turno. Depois disso `arrecadar` faz o
 * pagamento sozinho, sem uma segunda transferência que poderia discordar da primeira.
 *
 * ⚠️ **O calote é medido contra o cofre MAIS a renda de tudo o mais**, e não contra o cofre
 * seco. Quem arrecada 400 e paga 63 nunca quebra, por mais vazio que o tesouro esteja no dia —
 * quebrar ali seria punir o reino que vive no limite em vez do reino que encolheu. O que quebra
 * é o poder que **perdeu a terra que sustentava a promessa**, e essa é exatamente a história que
 * o tributo existe para contar.
 */
export function acertarTributos(nucleo: NucleoDaCampanha): void {
  const ajustes = nucleo.ajustes.diplomacia.tributo;
  for (const par of Object.keys(nucleo.estado.tributos).sort()) {
    const tributo = nucleo.estado.tributos[par];
    if (tributo === undefined) continue;
    const [a, b] = ladosDo(par);
    // Vencido sem culpa de ninguém, ou com um dos dois fora do jogo: a linha só sai da tabela.
    if (tributo.ate <= nucleo.estado.turno || !vivo(nucleo, a) || !vivo(nucleo, b)) {
      delete nucleo.estado.tributos[par];
      continue;
    }
    const pagador = tributo.pagador;
    const outro = pagador === a ? b : a;
    const alcance = tesouroDe(nucleo, pagador) + rendaBaseDe(nucleo, pagador);
    if (alcance >= tributo.ouro) continue;
    // O calote: a terra que sustentava a promessa já não está lá.
    delete nucleo.estado.tributos[par];
    abalarRelacao(nucleo, pagador, outro, ajustes.choqueDoCalote);
    nucleo.estado.reputacao[pagador] = Math.max(
      -100,
      reputacaoDe(nucleo, pagador) + ajustes.reputacaoDoCalote,
    );
  }
}
