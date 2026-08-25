/**
 * A lista de problemas que a checagem juntou.
 *
 * Estado de módulo de propósito: `checar.ts` é um script de uma passada só, e passar um
 * coletor por parâmetro a cada função seria cerimônia sem ganho. Quem reclama não decide
 * nada — quem decide se o processo falha é o roteiro, no fim.
 */

const encontrados: string[] = [];

export function reclamar(mensagem: string): void {
  encontrados.push(mensagem);
}

export function problemas(): readonly string[] {
  return encontrados;
}
