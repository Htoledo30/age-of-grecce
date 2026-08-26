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

import {
  declararGuerra,
  fazerPaz,
  firmarPacto,
  presentear,
  romperPacto,
} from '../diplomacia/relacoes';
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
   * Assina o pacto de não-agressão. **A opinião dele É a aceitação** — ver `podeFirmarPacto`.
   */
  firmarPacto(com: string, turnos: number, porPoder: string = this.nucleo.estado.jogador ?? ''): void {
    if (firmarPacto(this.nucleo, porPoder, com, turnos)) this.aoMudar();
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
}
