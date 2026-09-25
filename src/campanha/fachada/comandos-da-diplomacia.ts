/**
 * A fachada, quarta camada: **os comandos da DIPLOMACIA.**
 *
 * Guerra, paz, pacto e presente. Ficam aqui e não em `campanha.ts` por uma regra da casa que
 * uma trava automática cobra: a fachada final é uma LISTA de comandos com teto de tamanho, e
 * regra nova nasce em módulo próprio. Cinco comandos com o porquê de cada um escrito ao lado
 * estouravam o teto — e a resposta certa a isso nunca é levantar o número.
 *
 * ⚠️ **Só estes comandos anotam notícia efêmera.** Declarar guerra e assinar a paz acontecem
 * ANTES de o turno virar — são o clique do jogador e a decisão da IA, não a resolução das
 * marchas —, então a crônica não teria como saber deles se eles não se anunciassem aqui.
 */

import { mudarTributoDaLiga } from '../diplomacia/liga';
import {
  acordarComercio,
  declararGuerra,
  desfazerAcordo,
  fazerPaz,
  fazerPazComTributo,
  anexarMembro,
  firmarAlianca,
  formarLiga,
  firmarPacto,
  firmarTributo,
  presentear,
  romperAlianca,
  romperLiga,
  romperPacto,
  romperTributo,
} from '../diplomacia/relacoes';
import {
  acessoAte,
  acessosDe,
  concederAcesso,
  podeConcederAcesso,
  revogarAcesso,
} from '../diplomacia/acesso-militar';
import {
  aceitarProposta,
  esvaziarMesa,
  proporAoJogador,
  propostasAoJogador,
  recusarProposta,
} from '../diplomacia/propostas';
import type { Proposta } from '../estado-campanha';
import type { Permissao } from '../nucleo';
import { ConsultasDeGuerra } from './consultas-de-guerra';

export abstract class ComandosDaDiplomacia extends ConsultasDeGuerra {
  /**
   * Declara guerra. **É a porta única da diplomacia**, e a IA passa por ela igual à tela.
   *
   * Declarar e marchar no mesmo turno é permitido de propósito: as ordens são simultâneas, e
   * um aviso prévio de uma virada daria ao defensor um turno inteiro de vantagem sobre quem
   * declarou — o ataque de surpresa deixaria de existir.
   */
  declararGuerra(contra: string, porPoder: string = this.nucleo.estado.jogador ?? ''): void {
    if (!declararGuerra(this.nucleo, porPoder, contra)) return;
    this.efemeros.diplomacia.push({ de: porPoder, com: contra, tipo: 'guerra' });
    this.aoMudar();
  }

  /**
   * Encerra a guerra e abre a trégua.
   *
   * ⚠️ **Quem chama já tem o SIM dos dois lados.** A fachada registra o acordo; quem decide se
   * a IA aceita é `src/ia/diplomacia/paz.ts`, e é a aplicação que junta as duas coisas.
   */
  fazerPaz(com: string, porPoder: string = this.nucleo.estado.jogador ?? ''): void {
    if (!fazerPaz(this.nucleo, porPoder, com)) return;
    this.efemeros.diplomacia.push({ de: porPoder, com, tipo: 'paz' });
    this.aoMudar();
  }

  /**
   * **Encerra a guerra PAGANDO por ela** — a paz que o inimigo recusaria de graça.
   *
   * ⚠️ É a porta principal do tributo. `querPaz` não tinha alavanca: quem estava perdendo com um
   * inimigo que ainda tinha alvo não podia oferecer nada, e a única saída era perder província
   * a província até não sobrar prêmio. Isso não é uma decisão, é uma espera.
   *
   * ⚠️ **Quem decide se a IA aceita é `querPazComTributo`**, como toda paz. E ela não cobra de
   * quem já queria sair: a aplicação, vendo isso, assina a paz simples e não toca no cofre.
   */
  fazerPazComTributo(
    com: string,
    turnos: number,
    porPoder: string = this.nucleo.estado.jogador ?? '',
  ): void {
    if (!fazerPazComTributo(this.nucleo, porPoder, com, turnos)) return;
    this.efemeros.diplomacia.push({ de: porPoder, com, tipo: 'paz' });
    this.aoMudar();
  }

  /**
   * Assina o pacto de não-agressão. A regra abre a porta; quem chama consulta a balança dele.
   */
  firmarPacto(
    com: string,
    turnos: number,
    porPoder: string = this.nucleo.estado.jogador ?? '',
    ouro = 0,
  ): void {
    if (firmarPacto(this.nucleo, porPoder, com, turnos, ouro)) this.aoMudar();
  }

  /**
   * Rompe o pacto — e o mapa inteiro fica sabendo.
   *
   * ⚠️ Cara de propósito: a opinião do traído despenca e a sua REPUTAÇÃO cai, o que entra na
   * conta de todos os outros pares seus. Pacto que não custa nada é papel que não vale nada.
   */
  romperPacto(com: string, porPoder: string = this.nucleo.estado.jogador ?? ''): void {
    if (romperPacto(this.nucleo, porPoder, com)) this.aoMudar();
  }

  /**
   * Assina a ALIANÇA. **É o único acordo que te mete numa guerra que não é tua.**
   *
   * ⚠️ A entrada nas guerras dele é AUTOMÁTICA e não pergunta. A agência é esta assinatura, e
   * depois dela `romperAlianca` — ver `diplomacia/alianca.ts`.
   */
  firmarAlianca(
    com: string,
    turnos: number,
    porPoder: string = this.nucleo.estado.jogador ?? '',
    ouro = 0,
  ): void {
    if (firmarAlianca(this.nucleo, porPoder, com, turnos, ouro)) this.aoMudar();
  }

  /**
   * Rompe a aliança — **e custa mais caro que romper um pacto.**
   *
   * É a saída de uma guerra convocada que não te serve: rompa e fique fora dela. Abandonar quem
   * contava com você é pior que voltar atrás numa promessa de não atacar, e o preço diz isso.
   */
  romperAlianca(com: string, porPoder: string = this.nucleo.estado.jogador ?? ''): void {
    if (romperAlianca(this.nucleo, porPoder, com)) this.aoMudar();
  }

  /**
   * Põe um reino na SUA liga: ele continua sendo ele, e passa a te pagar e a lutar contigo.
   *
   * ⚠️ A liga ainda exige opinião mínima e razão para servir: o que se assina é obediência.
   * Ver `diplomacia/liga.ts` e `ia/diplomacia/ligas.ts`.
   */
  formarLiga(membro: string, porPoder: string = this.nucleo.estado.jogador ?? ''): void {
    if (formarLiga(this.nucleo, porPoder, membro)) this.aoMudar();
  }

  /**
   * Desfaz a liga entre você e ele.
   *
   * ⚠️ **Soltar um membro é de graça; fugir do próprio chefe custa reputação.** A promessa é
   * do membro, que trocou obediência por proteção: quem liberta devolveu, quem foge quebrou.
   */
  romperLiga(outro: string, porPoder: string = this.nucleo.estado.jogador ?? ''): void {
    if (romperLiga(this.nucleo, porPoder, outro)) this.aoMudar();
  }

  /** O chefe cobra mais ou menos deste membro. Mais ouro agora, mais vontade de sair depois. */
  mudarTributoDaLiga(membro: string, nivel: string): void {
    if (mudarTributoDaLiga(this.nucleo, membro, nivel)) this.aoMudar();
  }

  /**
   * O membro vira província sua — **e só se ele aceitar.**
   *
   * Nunca à força: recusado, o único caminho é romper a liga e invadir. Ninguém perde um reino
   * por diplomacia neste jogo. Ver o comentário no topo de `diplomacia/liga.ts`.
   */
  anexarMembro(membro: string, porPoder: string = this.nucleo.estado.jogador ?? ''): void {
    if (anexarMembro(this.nucleo, porPoder, membro)) this.aoMudar();
  }

  /**
   * Assina o acordo de comércio: **mais uma fonte de renda, e os dois lados ganham o mesmo.**
   *
   * ⚠️ Exige pouca opinião de propósito. Comércio vem ANTES da confiança militar, não depois —
   * e é ele que abre o caminho de quem quer jogar de economia sendo amigo de todo mundo.
   */
  acordarComercio(com: string, porPoder: string = this.nucleo.estado.jogador ?? ''): void {
    if (acordarComercio(this.nucleo, porPoder, com)) this.aoMudar();
  }

  /** Desfaz o acordo. Sem preço de reputação: comércio não é promessa de paz. */
  desfazerAcordo(com: string, porPoder: string = this.nucleo.estado.jogador ?? ''): void {
    if (desfazerAcordo(this.nucleo, porPoder, com)) this.aoMudar();
  }

  /**
   * Passa a PAGAR tributo a ele: ouro todo turno, e ele não te declara guerra enquanto durar.
   *
   * ⚠️ **É o pacto de quem não tem opinião para assinar um.** O pacto é de graça e exige
   * confiança; este não exige confiança nenhuma e custa o cofre. Por isso os dois nunca
   * competem — e `podeFirmarTributo` recusa quando já há pacto, para ninguém pagar pelo que
   * já tem.
   *
   * ⚠️ **O prazo é escolhido, e prazo longo custa menos por turno** — a lógica do aluguel. Quem
   * quer poder sair em dez turnos paga o preço da liberdade.
   *
   * ⚠️ **Quem decide se a IA aceita ser paga é `src/ia/diplomacia/tributos.ts`**, como na paz:
   * a fachada registra o acordo, e a aplicação junta as duas metades.
   */
  pagarTributoA(
    com: string,
    turnos: number,
    porPoder: string = this.nucleo.estado.jogador ?? '',
  ): void {
    if (firmarTributo(this.nucleo, porPoder, com, turnos)) this.aoMudar();
  }

  /** Passa a RECEBER tributo dele. A mesma assinatura, lida do outro lado da mesa. */
  exigirTributoDe(
    de: string,
    turnos: number,
    porPoder: string = this.nucleo.estado.jogador ?? '',
  ): void {
    if (firmarTributo(this.nucleo, de, porPoder, turnos)) this.aoMudar();
  }

  /**
   * Rompe o tributo antes do prazo — e custa, venha de que lado vier.
   *
   * ⚠️ Quem recebia vendeu um ano que não entregou; quem pagava deu o calote. Um preço só para
   * as duas saídas, e a diferença que importa já está no mapa: quem parou de pagar vai ser
   * invadido no turno seguinte.
   */
  romperTributo(com: string, porPoder: string = this.nucleo.estado.jogador ?? ''): void {
    if (romperTributo(this.nucleo, porPoder, com)) this.aoMudar();
  }

  /**
   * Manda ouro de presente. Devolve quantos pontos de opinião o gesto valeu.
   *
   * ⚠️ **Presente compra TEMPO, não amizade.** Ele empurra o número agora e o número volta a
   * caminhar para o alvo — então ouro entregue a quem você está roubando afunda de novo. Quem
   * quer a opinião lá em cima muda os FATOS: assina pacto, abre comércio, devolve a terra.
   */
  presentear(para: string, ouro: number, porPoder: string = this.nucleo.estado.jogador ?? ''): number {
    const pontos = presentear(this.nucleo, porPoder, para, ouro);
    if (pontos !== 0) this.aoMudar();
    return pontos;
  }

  // ── Acesso militar ──────────────────────────────────────────────────────────────────
  /** Este poder pode abrir a estrada dele para aquele, por este prazo? */
  podeConcederAcesso(a: string, para: string, turnos: number): Permissao {
    return podeConcederAcesso(this.nucleo, a, para, turnos);
  }

  /** Abre a estrada. O concedente é quem dá a passagem pela terra DELE. */
  concederAcesso(
    para: string,
    turnos: number,
    porPoder: string = this.nucleo.estado.jogador ?? '',
  ): void {
    if (concederAcesso(this.nucleo, porPoder, para, turnos)) this.aoMudar();
  }

  /** Fecha a estrada antes do prazo. Custa opinião — ver `acesso-militar.ts`. */
  revogarAcesso(para: string, porPoder: string = this.nucleo.estado.jogador ?? ''): void {
    if (revogarAcesso(this.nucleo, porPoder, para)) this.aoMudar();
  }

  /** Até que turno esta passagem vale. `undefined` quando ela não existe. */
  acessoAte(concedente: string, beneficiario: string): number | undefined {
    return acessoAte(this.nucleo, concedente, beneficiario);
  }

  /** A quem este poder abriu a estrada, e quem a abriu para ele. */
  acessosDe(idPoder: string): { concedidos: readonly string[]; recebidos: readonly string[] } {
    return acessosDe(this.nucleo, idPoder);
  }

  // ── A mesa de propostas ─────────────────────────────────────────────────────────────
  /** O que os outros reinos estão pedindo ao jogador nesta virada. */
  propostas(): readonly Proposta[] {
    return propostasAoJogador(this.nucleo);
  }

  /** A IA esvazia a mesa antes de voltar a pedir. Só ela chama; ver `propostas.ts`. */
  esvaziarMesa(): void {
    if (esvaziarMesa(this.nucleo)) this.aoMudar();
  }

  /** A IA põe um pedido na mesa do jogador. Devolve `false` quando ele não caberia. */
  proporAoJogador(proposta: Proposta): boolean {
    const pos = proporAoJogador(this.nucleo, proposta);
    if (pos) this.aoMudar();
    return pos;
  }

  /** O jogador aceita. A recusa vem com motivo quando o mundo mudou desde o pedido. */
  aceitarProposta(de: string, tipo: Proposta['tipo']): Permissao {
    const r = aceitarProposta(this.nucleo, de, tipo);
    this.aoMudar();
    return r;
  }

  /** O jogador recusa. Não custa nada — ver `propostas.ts`. */
  recusarProposta(de: string, tipo: Proposta['tipo']): void {
    if (recusarProposta(this.nucleo, de, tipo)) this.aoMudar();
  }
}
