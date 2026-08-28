/**
 * O ACESSO MILITAR: passar pela terra de quem não é inimigo.
 *
 * Pedido de Henrique, e ele chegou pela porta do mar: *"para ela poder andar em território de
 * reinos neutros precisamos criar algum sistema em diplomacia de liberar acesso militar"*. O
 * problema é real e é do mapa — a Grécia é um istmo cheio de vizinhos, e sem isto a única
 * maneira de atravessar a terra de alguém é declarar guerra a ele.
 *
 * ## É o único acordo do jogo que tem LADO e não tem par
 *
 * ⚠️ **Guerra, trégua, pacto e comércio valem igual para os dois; o acesso, não.** Mégara
 * deixar Atenas passar não deixa Mégara passar por Atenas. Por isso a chave aqui é
 * `concedente>beneficiário` e não o `parDe` do resto do arquivo — e por isso os dois sentidos
 * podem existir ao mesmo tempo, cada um com o seu prazo.
 *
 * ## O que ele dá, e o que ele NÃO dá
 *
 * Dá **passagem**: a hoste entra, atravessa e sai, como se a terra fosse dela para efeito de
 * caminho. Não dá conquista, não dá cerco, não dá saque — nada disso existe sem guerra, e o
 * acesso não é guerra. Duas hostes de poderes em paz dividem a província sem se tocar, que é
 * a mesma regra que já vale no mar.
 *
 * ⚠️ **A guerra rasga o acesso, nos dois sentidos.** Não é preço nem punição: é o que a coisa
 * é. Quem declara guerra ao dono da estrada não continua andando por ela com licença dele — e
 * deixar o registro de pé faria um exército "com passe" atravessar o inimigo sem ser
 * interceptado, que é teleporte com carimbo.
 */

import type { NucleoDaCampanha, Permissao } from '../nucleo';
import { emGuerra } from './relacoes';

/** A chave DIRECIONAL: quem abre a estrada, e para quem. */
function chaveDeAcesso(concedente: string, beneficiario: string): string {
  return `${concedente}>${beneficiario}`;
}

/** Até que turno esta licença vale. `undefined` quando ela não existe. */
export function acessoAte(
  nucleo: NucleoDaCampanha,
  concedente: string,
  beneficiario: string,
): number | undefined {
  return nucleo.estado.acessos[chaveDeAcesso(concedente, beneficiario)];
}

/**
 * Este poder pode pisar na terra daquele sem declarar guerra?
 *
 * A pergunta que o movimento faz, e ela junta as duas licenças que existem: a terra é minha,
 * ou o dono dela me deixa passar.
 */
export function temAcessoA(
  nucleo: NucleoDaCampanha,
  quemAnda: string,
  donoDaTerra: string,
): boolean {
  if (quemAnda === donoDaTerra) return true;
  if (donoDaTerra === '') return false;
  return acessoAte(nucleo, donoDaTerra, quemAnda) !== undefined;
}

/** A quem este poder abriu a estrada, e a quem ela foi aberta. Para a tela e para a IA. */
export function acessosDe(
  nucleo: NucleoDaCampanha,
  idPoder: string,
): { concedidos: readonly string[]; recebidos: readonly string[] } {
  const concedidos: string[] = [];
  const recebidos: string[] = [];
  for (const chave of Object.keys(nucleo.estado.acessos).sort()) {
    const [de, para] = chave.split('>');
    if (de === idPoder && para !== undefined) concedidos.push(para);
    if (para === idPoder && de !== undefined) recebidos.push(de);
  }
  return { concedidos, recebidos };
}

/**
 * Este poder pode abrir a estrada para aquele? **Só as REGRAS, nunca a vontade.**
 *
 * ⚠️ **A estrada é de quem a abre, e ninguém precisa de licença para dar a própria.** A
 * opinião mínima morava aqui e estava no lugar errado: ela travava o jogador de tomar uma
 * decisão que é dele — inclusive a decisão ruim, que é metade do jogo. Quem pergunta *"ele
 * ABRIRIA para mim?"* é a IA, e a pergunta dela é `aceitaAbrirAcesso`, em `ia/diplomacia`.
 *
 * É a mesma separação que a mesa de diplomacia já desenha em cada botão: cinza por regra e
 * cinza por vontade são dois problemas com duas soluções, e confundi-los faz o jogador tentar
 * consertar o errado.
 */
export function podeConcederAcesso(
  nucleo: NucleoDaCampanha,
  concedente: string,
  beneficiario: string,
  turnos: number,
): Permissao {
  if (concedente === beneficiario) {
    return { pode: false, motivo: 'não se dá passagem a si mesmo' };
  }
  if (!nucleo.atlas.existePoder(concedente) || !nucleo.atlas.existePoder(beneficiario)) {
    return { pode: false, motivo: 'este poder não existe' };
  }
  if (emGuerra(nucleo, concedente, beneficiario)) {
    return { pode: false, motivo: 'vocês estão em guerra' };
  }
  if (acessoAte(nucleo, concedente, beneficiario) !== undefined) {
    return { pode: false, motivo: 'a passagem já está aberta' };
  }
  const prazo = nucleo.ajustes.diplomacia.acesso.prazos.find((p) => p.turnos === turnos);
  if (!prazo) return { pode: false, motivo: 'este prazo não existe' };
  return { pode: true };
}

/** Abre a estrada. Devolve `false` quando ela não podia ser aberta. */
export function concederAcesso(
  nucleo: NucleoDaCampanha,
  concedente: string,
  beneficiario: string,
  turnos: number,
): boolean {
  if (!podeConcederAcesso(nucleo, concedente, beneficiario, turnos).pode) return false;
  nucleo.estado.acessos[chaveDeAcesso(concedente, beneficiario)] = nucleo.estado.turno + turnos;
  return true;
}

/**
 * Fecha a estrada antes do prazo — e custa, como romper um pacto custa.
 *
 * ⚠️ **Com exército dele já dentro da tua terra**, revogar não o expulsa: ele fica onde está e
 * deixa de poder avançar. Empurrar peça no mapa por decreto seria a diplomacia movendo tropa,
 * e quem move tropa é a marcha.
 */
export function revogarAcesso(
  nucleo: NucleoDaCampanha,
  concedente: string,
  beneficiario: string,
): boolean {
  if (acessoAte(nucleo, concedente, beneficiario) === undefined) return false;
  delete nucleo.estado.acessos[chaveDeAcesso(concedente, beneficiario)];
  abalarPelaRevogacao(nucleo, concedente, beneficiario);
  return true;
}

/** A guerra rasga as duas licenças do par, sem preço nenhum: ver o cabeçalho. */
export function rasgarAcessosEntre(nucleo: NucleoDaCampanha, a: string, b: string): void {
  delete nucleo.estado.acessos[chaveDeAcesso(a, b)];
  delete nucleo.estado.acessos[chaveDeAcesso(b, a)];
}

/** Licenças vencidas somem na virada, como os pactos. */
export function limparAcessosVencidos(nucleo: NucleoDaCampanha): void {
  for (const [chave, ate] of Object.entries(nucleo.estado.acessos)) {
    if (ate <= nucleo.estado.turno) delete nucleo.estado.acessos[chave];
  }
}

function abalarPelaRevogacao(nucleo: NucleoDaCampanha, quem: string, com: string): void {
  const choque = nucleo.ajustes.diplomacia.acesso.choqueDeRevogacao;
  const chave = quem < com ? `${quem}|${com}` : `${com}|${quem}`;
  const atual = nucleo.estado.relacoes[chave] ?? 0;
  nucleo.estado.relacoes[chave] = Math.max(-100, Math.min(100, atual + choque));
}
