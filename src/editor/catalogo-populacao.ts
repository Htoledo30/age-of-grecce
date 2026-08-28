import type { Ajustes } from '@/dados/esquema';
import type { CampoNumerico } from './tipos';

type AjustesDoJogo = Ajustes['jogo'];

/** Crescimento e faixas absolutas: quanto a terra cresce e quando passa a pesar mais. */
export function camposDaPopulacao(ajustes: AjustesDoJogo): readonly CampoNumerico[] {
  const populacao = ajustes.populacao;
  const campos: CampoNumerico[] = [
    {
      id: 'populacao.taxaNatural',
      aba: 'populacao',
      grupo: 'Crescimento natural',
      nome: 'Crescimento anual',
      descricao: 'Aumento da população antes dos efeitos das construções e da alimentação.',
      unidade: '% por turno',
      minimo: 0.0001,
      maximo: 0.1,
      passo: 0.0005,
      casas: 2,
      fatorVisual: 100,
      aplica: 'Próximo turno',
      ler: () => populacao.taxaNatural,
      escrever: (valor) => {
        populacao.taxaNatural = valor;
      },
    },
  ];

  for (let indice = 0; indice < populacao.faixas.length - 1; indice++) {
    const faixa = populacao.faixas[indice];
    const proxima = populacao.faixas[indice + 1];
    if (!faixa || !proxima || faixa.ate === undefined) continue;
    campos.push({
      id: `populacao.faixas.${indice}.inicioDaProxima`,
      aba: 'populacao',
      grupo: 'Início das faixas',
      nome: `${proxima.nome} começa em`,
      descricao: `Ao chegar aqui, a província deixa de ser ${faixa.nome.toLocaleLowerCase('pt-BR')}.`,
      unidade: 'habitantes',
      minimo: 1_000,
      maximo: 1_000_000,
      passo: 1_000,
      casas: 0,
      aplica: 'Imediatamente',
      ler: () => (faixa.ate ?? 0) + 1,
      escrever: (valor) => {
        faixa.ate = Math.round(valor) - 1;
      },
    });
  }

  for (let indice = 0; indice < populacao.faixas.length; indice++) {
    const faixa = populacao.faixas[indice];
    if (!faixa) continue;
    campos.push({
      id: `populacao.faixas.${indice}.custo`,
      aba: 'populacao',
      grupo: 'Consumo das faixas',
      nome: faixa.nome,
      descricao: 'Pontos retirados do saldo alimentar por uma província deste tamanho.',
      unidade: 'pontos',
      minimo: 0,
      maximo: 20,
      passo: 1,
      casas: 0,
      aplica: 'Próximo turno',
      ler: () => faixa.custo,
      escrever: (valor) => {
        faixa.custo = Math.round(valor);
      },
    });
  }

  return campos;
}
