/**
 * A chave de um par de poderes, sempre a mesma nos dois sentidos.
 *
 * Ordenada por id porque a relação não tem lado: Atenas–Mégara e Mégara–Atenas são a mesma
 * guerra, o mesmo pacto e a mesma opinião, e duas chaves para uma coisa só seriam duas verdades
 * sobre ela.
 *
 * ⚠️ **Mora sozinha porque tem mais de um dono agora.** Ela nasceu privada dentro de
 * `relacoes.ts` — guerra, trégua, pacto, comércio e tributo são todos daquele arquivo. Quando a
 * ALIANÇA ganhou módulo próprio, copiar três linhas seria pior: passariam a existir duas
 * definições do que é um par, e no dia em que a chave mudasse uma delas ficaria para trás. A
 * chave continua tendo um dono só; ele é que deixou de ser um arquivo de regras.
 *
 * ⚠️ **O acesso militar NÃO usa esta chave**, e é o único: ele é `concedente>beneficiário`,
 * porque deixar alguém passar não é poder passar. Ver `acesso-militar.ts`.
 */
export function parDe(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** Os dois ids de uma chave de par, ou `undefined` se ela não for uma. */
export function ladosDoPar(par: string): readonly [string, string] | undefined {
  const [a, b] = par.split('|');
  return a === undefined || b === undefined ? undefined : [a, b];
}
