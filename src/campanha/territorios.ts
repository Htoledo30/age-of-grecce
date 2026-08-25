/**
 * Quem manda em cada província, e o índice reverso disso.
 *
 * A tabela completa de donos continua morando no estado da campanha — é ela que vai pro
 * disco. Este módulo mantém só o **índice derivado** (quais províncias são de cada poder),
 * que existe pra que "quais são as províncias de Atenas?" não custe uma varredura das 196
 * a cada redesenho.
 *
 * **Toda troca passa por aqui**, e é isso que impede as duas visões de discordarem: quem
 * mexesse direto em `estado.dono` deixaria o índice velho, e o mapa passaria a mostrar um
 * reino que não existe mais.
 *
 * ⚠️ **Não sabe nada de guerra, exército ou anexação.** É a primitiva consistente de
 * propriedade, e só. Quem decide *se pode* trocar é quem chama — misturar as duas coisas
 * faria deste arquivo o lugar onde toda regra do jogo acabaria morando.
 */

import type { Atlas } from '@/mundo/atlas';

export class Territorios {
  private readonly provinciasPorPoder = new Map<string, string[]>();

  /** Recebe o registro VIVO do estado, não uma cópia: quem grava continua sendo um só. */
  constructor(
    private readonly atlas: Atlas,
    private readonly donos: Record<string, string>,
  ) {
    this.reindexar();
  }

  /**
   * Remonta o índice inteiro a partir da tabela de donos.
   *
   * Idempotente de propósito, e é o que faz retomar um salvamento produzir exatamente o
   * mesmo índice que jogar até ali produziria. Custa 196 iterações.
   */
  reindexar(): void {
    this.provinciasPorPoder.clear();
    for (const poder of this.atlas.poderes) this.provinciasPorPoder.set(poder.id, []);

    for (const provincia of this.atlas.provincias) {
      const dono = this.donos[provincia.id];
      if (dono === undefined) throw new Error(`província sem dono na tabela: ${provincia.id}`);
      const lista = this.provinciasPorPoder.get(dono);
      if (!lista) throw new Error(`província "${provincia.nome}" tem dono inexistente: ${dono}`);
      lista.push(provincia.id);
    }
  }

  donoDe(idProvincia: string): string {
    const dono = this.donos[idProvincia];
    if (dono === undefined) throw new Error(`província inexistente: ${idProvincia}`);
    return dono;
  }

  provinciasDe(idPoder: string): readonly string[] {
    const lista = this.provinciasPorPoder.get(idPoder);
    if (!lista) throw new Error(`poder inexistente: ${idPoder}`);
    return lista;
  }

  /**
   * Este poder ainda tem chão?
   *
   * **Não é o mesmo que "está vivo".** Um poder que perdeu tudo mas ainda tem hoste em pé
   * continua no jogo, no exílio — quem junta as duas perguntas é a campanha, que enxerga
   * território e tropa ao mesmo tempo.
   */
  temTerritorio(idPoder: string): boolean {
    return this.provinciasDe(idPoder).length > 0;
  }

  /** Troca a posse. Devolve `false` quando não havia nada a mudar. */
  trocarDono(idProvincia: string, idPoder: string): boolean {
    const anterior = this.donoDe(idProvincia);
    if (!this.atlas.existePoder(idPoder)) throw new Error(`poder inexistente: ${idPoder}`);
    if (anterior === idPoder) return false;

    const listaAnterior = this.provinciasPorPoder.get(anterior);
    if (listaAnterior) {
      const posicao = listaAnterior.indexOf(idProvincia);
      if (posicao >= 0) listaAnterior.splice(posicao, 1);
    }

    const listaNova = this.provinciasPorPoder.get(idPoder);
    if (!listaNova) throw new Error(`poder inexistente: ${idPoder}`);
    listaNova.push(idProvincia);
    this.donos[idProvincia] = idPoder;
    return true;
  }
}
