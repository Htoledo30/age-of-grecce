import {
  normalizarValorDoCampo,
  valorVisualDoCampo,
  type ControleNumerico,
} from './campo-numerico';
import type { SerieNumerica } from './tipos';

export interface ControleEmNiveis {
  elemento: HTMLElement;
  controles: readonly ControleNumerico[];
}

/** Três valores comparáveis na mesma linha, sem repetir o texto da construção três vezes. */
export function criarControleEmNiveis(
  serie: SerieNumerica,
  aoEditar: () => void,
): ControleEmNiveis {
  const linha = document.createElement('article');
  linha.className = 'editor-balanceamento__campo editor-balanceamento__campo--niveis';

  const texto = document.createElement('div');
  texto.className = 'editor-balanceamento__campo-texto';
  const titulo = document.createElement('h4');
  titulo.textContent = serie.nome;
  const descricao = document.createElement('p');
  descricao.textContent = serie.descricao;
  const aplicacao = document.createElement('small');
  aplicacao.textContent = `Aplica: ${serie.aplica}`;
  texto.append(titulo, descricao, aplicacao);

  const niveis = document.createElement('div');
  niveis.className = 'editor-balanceamento__niveis';
  const controles = serie.campos.map((campo) => {
    const nivel = document.createElement('label');
    nivel.className = 'editor-balanceamento__nivel';
    nivel.dataset['alterado'] = 'nao';
    const rotulo = document.createElement('span');
    rotulo.textContent = `${campo.nome} · ${campo.unidade}`;
    const entrada = document.createElement('input');
    const fator = campo.fatorVisual ?? 1;
    entrada.className = 'editor-balanceamento__numero';
    entrada.type = 'number';
    entrada.min = String(campo.minimo * fator);
    entrada.max = String(campo.maximo * fator);
    entrada.step = String(campo.passo * fator);
    entrada.setAttribute('aria-label', `${serie.nome} · ${campo.nome}`);
    const definir = (valor: number): void => {
      entrada.value = valorVisualDoCampo(campo, valor);
    };
    entrada.addEventListener('input', aoEditar);
    entrada.addEventListener('change', () => {
      definir(normalizarValorDoCampo(campo, Number(entrada.value)));
      aoEditar();
    });
    definir(campo.ler());
    nivel.append(rotulo, entrada);
    niveis.appendChild(nivel);
    return {
      elemento: nivel,
      campo,
      valor: () => normalizarValorDoCampo(campo, Number(entrada.value)),
      definir,
      mudou: (mudou: boolean) => {
        nivel.dataset['alterado'] = mudou ? 'sim' : 'nao';
      },
    } satisfies ControleNumerico;
  });

  linha.append(texto, niveis);
  return { elemento: linha, controles };
}
