/**
 * O cofre de cada poder.
 *
 * ⚠️ **Não existe "o tesouro"; existe o tesouro de alguém.** Todos os 148 poderes têm
 * caixa desde o primeiro turno — sem cofre próprio a IA recrutaria de graça, contrariando
 * a regra de que todos jogam com as mesmas condições.
 */

import type { NucleoDaCampanha } from '../nucleo';

/** O caixa de qualquer poder. Zero para quem nunca teve entrada. */
export function tesouroDe(nucleo: NucleoDaCampanha, idPoder: string): number {
  return nucleo.estado.tesouros[idPoder] ?? 0;
}

/** Tira moedas do cofre de um poder. Nunca deixa negativo. */
export function gastar(nucleo: NucleoDaCampanha, idPoder: string, valor: number): void {
  nucleo.estado.tesouros[idPoder] = Math.max(0, tesouroDe(nucleo, idPoder) - valor);
}

/**
 * Põe ouro no tesouro. **Existe pra DESENVOLVIMENTO**, como o `calibrarFronteira` da
 * camada de mapa: montar um cenário de teste sem jogar quinze turnos à mão.
 *
 * Não é regra do jogo e nenhuma mecânica chama isto. O gancho que a expõe vive atrás de
 * `import.meta.env.DEV` e não existe no jogo empacotado.
 */
export function darOuro(nucleo: NucleoDaCampanha, idPoder: string, valor: number): void {
  nucleo.estado.tesouros[idPoder] = tesouroDe(nucleo, idPoder) + valor;
}
