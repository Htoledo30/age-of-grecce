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

  const idsDosImpostos = ['baixo', 'normal', 'alto', 'confisco'] as const;
  const fatores = idsDosImpostos.map(
    (id) => valores[`economia.imposto.niveis.${id}.fator`],
  );
  for (let indice = 1; indice < fatores.length; indice++) {
    const anterior = fatores[indice - 1];
    const atual = fatores[indice];
    if (anterior !== undefined && atual !== undefined && atual < anterior) {
      return 'A arrecadação dos impostos precisa subir de Baixo até Confisco.';
    }
  }

  const humores = idsDosImpostos.map(
    (id) => valores[`economia.imposto.niveis.${id}.humor`],
  );
  for (let indice = 1; indice < humores.length; indice++) {
    const anterior = humores[indice - 1];
    const atual = humores[indice];
    if (anterior !== undefined && atual !== undefined && atual > anterior) {
      return 'O efeito no humor precisa piorar de Baixo até Confisco.';
    }
  }

  const meioCaminho = valores['corrupcao.distancia.meioCaminho'];
  const semCaminho = valores['corrupcao.distancia.semCaminho'];
  if (meioCaminho !== undefined && semCaminho !== undefined && semCaminho < meioCaminho) {
    return 'Uma província sem caminho não pode parecer mais próxima que a meia distância.';
  }

  return null;
}
