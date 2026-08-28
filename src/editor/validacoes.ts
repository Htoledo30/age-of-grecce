import type { ValoresDoEditor } from './tipos';

/** Relações entre controles que limites individuais não conseguem proteger. */
export function erroNosValores(valores: ValoresDoEditor): string | null {
  const quebra = valores['combate.batalha.limiarDeQuebra'];
  const recuo = valores['combate.batalha.limiarDeRecuo'];
  if (quebra !== undefined && recuo !== undefined && recuo >= quebra) {
    return 'O recuo precisa acontecer antes do limiar de quebra.';
  }

  const inicios = Object.entries(valores)
    .flatMap(([id, valor]) => {
      const resultado = /^populacao\.faixas\.(\d+)\.inicioDaProxima$/.exec(id);
      return resultado?.[1] === undefined ? [] : [{ indice: Number(resultado[1]), valor }];
    })
    .sort((a, b) => a.indice - b.indice);
  for (let indice = 1; indice < inicios.length; indice++) {
    if ((inicios[indice]?.valor ?? 0) <= (inicios[indice - 1]?.valor ?? 0)) {
      return 'Cada faixa populacional precisa começar depois da faixa anterior.';
    }
  }

  return null;
}
