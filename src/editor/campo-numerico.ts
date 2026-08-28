import type { CampoNumerico } from './tipos';

export interface ControleNumerico {
  elemento: HTMLElement;
  campo: CampoNumerico;
  valor(): number;
  definir(valor: number): void;
  mudou(mudou: boolean): void;
}

export function criarControleNumerico(
  campo: CampoNumerico,
  inicial: number,
  aoEditar: () => void,
): ControleNumerico {
  const fator = campo.fatorVisual ?? 1;
  const linha = document.createElement('article');
  linha.className = 'editor-balanceamento__campo';
  linha.dataset['campo'] = campo.id;

  const texto = document.createElement('div');
  texto.className = 'editor-balanceamento__campo-texto';
  const titulo = document.createElement('h4');
  titulo.textContent = campo.nome;
  const descricao = document.createElement('p');
  descricao.textContent = campo.descricao;
  const aplicacao = document.createElement('small');
  aplicacao.textContent = `Aplica: ${campo.aplica}`;
  texto.append(titulo, descricao, aplicacao);

  const menos = botao('−', 'Diminuir');
  const mais = botao('+', 'Aumentar');
  const entrada = document.createElement('input');
  entrada.className = 'editor-balanceamento__numero';
  entrada.type = 'number';
  entrada.min = String(campo.minimo * fator);
  entrada.max = String(campo.maximo * fator);
  entrada.step = String(campo.passo * fator);
  entrada.setAttribute('aria-label', campo.nome);
  const unidade = document.createElement('span');
  unidade.className = 'editor-balanceamento__unidade';
  unidade.textContent = campo.unidade;

  const controle = document.createElement('div');
  controle.className = 'editor-balanceamento__controle';
  controle.append(menos, entrada, mais, unidade);
  linha.append(texto, controle);

  const casas = 10 ** campo.casas;
  const limitar = (valorVisual: number): number => {
    const limitado = Math.min(campo.maximo * fator, Math.max(campo.minimo * fator, valorVisual));
    return Math.round(limitado * casas) / casas / fator;
  };
  const definir = (valor: number): void => {
    entrada.value = (valor * fator).toFixed(campo.casas);
  };
  const deslocar = (direcao: number): void => {
    definir(limitar((Number(entrada.value) || 0) + direcao * campo.passo * fator));
    aoEditar();
  };
  menos.addEventListener('click', () => deslocar(-1));
  mais.addEventListener('click', () => deslocar(1));
  entrada.addEventListener('input', aoEditar);
  entrada.addEventListener('change', () => {
    definir(limitar(Number(entrada.value)));
    aoEditar();
  });
  definir(inicial);

  return {
    elemento: linha,
    campo,
    valor: () => limitar(Number(entrada.value)),
    definir,
    mudou: (mudou) => {
      linha.dataset['alterado'] = mudou ? 'sim' : 'nao';
    },
  };
}

function botao(texto: string, rotulo: string): HTMLButtonElement {
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'editor-balanceamento__passo';
  botao.textContent = texto;
  botao.setAttribute('aria-label', rotulo);
  return botao;
}
