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
import { vivo } from '../governo/poderes';
import { darOuro, gastar, tesouroDe } from '../governo/tesouro';
import { rendaDe } from '../provincia/renda';
import {
  alvoDaRelacao,
  aproximarRelacao,
  comChoque,
  comPresente,
  parcelasDaRelacao,
  pontosDoPresente,
} from './relacao';
import type { ParcelaDaRelacao, SituacaoDaRelacao } from './relacao';

/**
 * A chave de um par de poderes, sempre a mesma nos dois sentidos.
 *
 * Ordenada por id porque a relação não tem lado: Atenas–Mégara e Mégara–Atenas são a mesma
 * guerra, e duas chaves para uma coisa só seriam duas verdades sobre ela.
 *
 * Fica privada de propósito: quem pergunta pela relação usa `emGuerra`, e a forma da chave é
 * assunto deste arquivo — no dia em que ela mudar, nada fora daqui precisa saber.
 */
function parDe(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

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
    return true;
  }
  if (!podeDeclararGuerra(nucleo, de, contra).pode) return false;
  nucleo.estado.guerras[parDe(de, contra)] = nucleo.estado.turno;
  // ⚠️ A guerra desfaz o comércio na hora, e é isso que dá ao acordo um peso que não é só
  // dinheiro: quem declara vê a renda cair no mesmo turno em que ganha um inimigo.
  desfazerAcordo(nucleo, de, contra);
  return true;
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
  const delas = new Set(nucleo.territorios.provinciasDe(b));
  let fronteira = 0;
  for (const id of [...delas].sort()) {
    if (nucleo.atlas.provincia(id).vizinhas.some((v) => minhas.includes(v))) fronteira += 1;
  }
  // A memória da conquista sem guardar memória: enquanto a bandeira dele estiver na minha
  // mão, ele lembra. Devolver a terra apaga a mágoa sozinho.
  const terrasTomadas = minhas.filter((id) => nucleo.atlas.donoInicial(id) === b).length;
  return {
    emGuerra: emGuerra(nucleo, a, b),
    tregoa: tregoaAte(nucleo, a, b) === undefined ? 0 : 1,
    fronteira,
    terrasTomadas,
    temPacto: pactoAte(nucleo, a, b) !== undefined,
    temAcordo: temAcordo(nucleo, a, b),
    // A PIOR das duas: o que envenena a relação é haver um quebrador de promessas nela.
    reputacao: Math.min(reputacaoDe(nucleo, a), reputacaoDe(nucleo, b)),
  };
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

/** Os prazos de pacto que ESTE par consegue assinar hoje, do mais longo ao mais curto. */
export function prazosDePacto(
  nucleo: NucleoDaCampanha,
  a: string,
  b: string,
): readonly { turnos: number; opiniaoMinima: number; pode: boolean }[] {
  const opiniao = relacaoEntre(nucleo, a, b);
  const livre = podeFirmarPacto(nucleo, a, b, 0).pode || pactoAte(nucleo, a, b) === undefined;
  return [...nucleo.ajustes.diplomacia.pacto.prazos]
    .sort((x, y) => y.turnos - x.turnos)
    .map((prazo) => ({
      ...prazo,
      pode: livre && !emGuerra(nucleo, a, b) && opiniao >= prazo.opiniaoMinima,
    }));
}

/**
 * Este pacto pode ser firmado?
 *
 * ⚠️ **A opinião É a aceitação, e não há uma segunda pergunta.** Perguntar depois "e você
 * aceita?" contaria a mesma confiança duas vezes: o número já diz o quanto ele confia em você.
 * Quanto mais longo o prazo, mais opinião ele pede — e é por isso que o presente vira a entrada
 * do pacto: o ouro compra o momento, e o momento compra o prazo.
 */
export function podeFirmarPacto(
  nucleo: NucleoDaCampanha,
  a: string,
  b: string,
  turnos: number,
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
  const opiniao = relacaoEntre(nucleo, a, b);
  if (opiniao < prazo.opiniaoMinima) {
    return {
      pode: false,
      motivo: `ele não confia tanto assim: ${prazo.turnos} turnos exigem opinião ${prazo.opiniaoMinima}`,
    };
  }
  return { pode: true };
}

/** Assina o pacto. Devolve `false` quando ele não podia ser assinado. */
export function firmarPacto(
  nucleo: NucleoDaCampanha,
  a: string,
  b: string,
  turnos: number,
): boolean {
  if (!podeFirmarPacto(nucleo, a, b, turnos).pode) return false;
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

/**
 * A reputação volta devagar para zero, e os pactos vencidos somem.
 *
 * Rancor por promessa quebrada não é eterno: quem traiu uma vez e passou cinquenta turnos sem
 * repetir volta a ser alguém com quem se assina.
 */
export function andarReputacao(nucleo: NucleoDaCampanha): void {
  const passo = nucleo.ajustes.diplomacia.pacto.reputacaoPorTurno;
  for (const [poder, valor] of Object.entries(nucleo.estado.reputacao)) {
    const novo = Math.min(0, valor + passo);
    if (novo === 0) delete nucleo.estado.reputacao[poder];
    else nucleo.estado.reputacao[poder] = novo;
  }
  for (const [par, ate] of Object.entries(nucleo.estado.pactos)) {
    if (ate <= nucleo.estado.turno) delete nucleo.estado.pactos[par];
  }
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
