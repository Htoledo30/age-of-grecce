import type { Ajustes } from '@/dados/esquema';
import type { CampoNumerico } from './tipos';

type AjustesDoJogo = Ajustes['jogo'];

/** Renda provincial e os dois freios administrativos que incidem sobre ela. */
export function camposDaEconomia(ajustes: AjustesDoJogo): readonly CampoNumerico[] {
  const economia = ajustes.economia;
  const corrupcao = ajustes.corrupcao;
  const campos: CampoNumerico[] = [
    {
      id: 'economia.impostoPorHabitante',
      aba: 'economia',
      grupo: 'Fontes de renda',
      nome: 'Imposto por 1.000 habitantes',
      descricao: 'Base arrecadada da população antes do decreto e da corrupção.',
      unidade: 'moedas',
      minimo: 0.0001,
      maximo: 0.05,
      passo: 0.0001,
      casas: 1,
      fatorVisual: 1_000,
      aplica: 'Próxima conta',
      ler: () => economia.impostoPorHabitante,
      escrever: (valor) => {
        economia.impostoPorHabitante = valor;
      },
    },
    {
      id: 'economia.pesoDoSecundario',
      aba: 'economia',
      grupo: 'Fontes de renda',
      nome: 'Peso do produto secundário',
      descricao: 'Parcela do valor normal que o segundo produto da província consegue render.',
      unidade: '% do principal',
      minimo: 0,
      maximo: 1,
      passo: 0.05,
      casas: 0,
      fatorVisual: 100,
      aplica: 'Próxima conta',
      ler: () => economia.pesoDoSecundario,
      escrever: (valor) => {
        economia.pesoDoSecundario = valor;
      },
    },
    {
      id: 'economia.escalaDeTransito',
      aba: 'economia',
      grupo: 'Fontes de renda',
      nome: 'Valor máximo do trânsito',
      descricao: 'Moedas rendidas por uma província com trânsito base cheio e rota até a capital.',
      unidade: 'moedas',
      minimo: 1,
      maximo: 2_000,
      passo: 10,
      casas: 0,
      aplica: 'Próxima conta',
      ler: () => economia.escalaDeTransito,
      escrever: (valor) => {
        economia.escalaDeTransito = valor;
      },
    },
  ];

  const niveis = [
    ['baixo', 'Baixo'],
    ['normal', 'Normal'],
    ['alto', 'Alto'],
    ['confisco', 'Confisco'],
  ] as const;
  for (const [id, nome] of niveis) {
    const nivel = economia.imposto.niveis[id];
    campos.push(
      {
        id: `economia.imposto.niveis.${id}.fator`,
        aba: 'economia',
        grupo: 'Arrecadação dos impostos',
        nome,
        descricao: 'Multiplicador aplicado apenas sobre a parcela de imposto da renda.',
        unidade: '× imposto',
        minimo: 0.1,
        maximo: 10,
        passo: 0.05,
        casas: 2,
        aplica: 'Próxima conta',
        ler: () => nivel.fator,
        escrever: (valor) => {
          nivel.fator = valor;
        },
      },
      {
        id: `economia.imposto.niveis.${id}.humor`,
        aba: 'economia',
        grupo: 'Humor dos impostos',
        nome,
        descricao: 'Pontos somados ao alvo de felicidade enquanto este imposto estiver ativo.',
        unidade: 'de humor',
        minimo: -100,
        maximo: 100,
        passo: 1,
        casas: 0,
        aplica: 'Próximo turno',
        ler: () => nivel.humor,
        escrever: (valor) => {
          nivel.humor = Math.round(valor);
        },
      },
    );
  }

  campos.push(
    {
      id: 'corrupcao.tamanho.limiar',
      aba: 'economia',
      grupo: 'Corrupção por população',
      nome: 'População sem corrupção',
      descricao: 'Habitantes administrados antes de o tamanho da província começar a pesar.',
      unidade: 'habitantes',
      minimo: 0,
      maximo: 200_000,
      passo: 1_000,
      casas: 0,
      aplica: 'Próxima conta',
      ler: () => corrupcao.tamanho.limiar,
      escrever: (valor) => {
        corrupcao.tamanho.limiar = Math.round(valor);
      },
    },
    {
      id: 'corrupcao.tamanho.teto',
      aba: 'economia',
      grupo: 'Corrupção por população',
      nome: 'Perda máxima pelo tamanho',
      descricao: 'Maior parcela do imposto que a população pode consumir em corrupção.',
      unidade: '% do imposto',
      minimo: 0,
      maximo: 1,
      passo: 0.01,
      casas: 0,
      fatorVisual: 100,
      aplica: 'Próxima conta',
      ler: () => corrupcao.tamanho.teto,
      escrever: (valor) => {
        corrupcao.tamanho.teto = valor;
      },
    },
    {
      id: 'corrupcao.tamanho.meiaPopulacao',
      aba: 'economia',
      grupo: 'Corrupção por população',
      nome: 'População para metade da perda',
      descricao: 'Excesso de habitantes necessário para alcançar metade da perda máxima.',
      unidade: 'habitantes',
      minimo: 1_000,
      maximo: 1_000_000,
      passo: 1_000,
      casas: 0,
      aplica: 'Próxima conta',
      ler: () => corrupcao.tamanho.meiaPopulacao,
      escrever: (valor) => {
        corrupcao.tamanho.meiaPopulacao = Math.round(valor);
      },
    },
    {
      id: 'corrupcao.distancia.teto',
      aba: 'economia',
      grupo: 'Corrupção por distância',
      nome: 'Perda máxima pela distância',
      descricao: 'Maior parcela do imposto perdida longe da capital.',
      unidade: '% do imposto',
      minimo: 0,
      maximo: 1,
      passo: 0.01,
      casas: 0,
      fatorVisual: 100,
      aplica: 'Próxima conta',
      ler: () => corrupcao.distancia.teto,
      escrever: (valor) => {
        corrupcao.distancia.teto = valor;
      },
    },
    {
      id: 'corrupcao.distancia.meioCaminho',
      aba: 'economia',
      grupo: 'Corrupção por distância',
      nome: 'Distância para metade da perda',
      descricao: 'Saltos até a capital necessários para alcançar metade da perda máxima.',
      unidade: 'saltos',
      minimo: 1,
      maximo: 100,
      passo: 1,
      casas: 0,
      aplica: 'Próxima conta',
      ler: () => corrupcao.distancia.meioCaminho,
      escrever: (valor) => {
        corrupcao.distancia.meioCaminho = Math.round(valor);
      },
    },
    {
      id: 'corrupcao.distancia.semCaminho',
      aba: 'economia',
      grupo: 'Corrupção por distância',
      nome: 'Distância sem caminho',
      descricao: 'Saltos atribuídos a uma província que não consegue alcançar a capital.',
      unidade: 'saltos',
      minimo: 1,
      maximo: 200,
      passo: 1,
      casas: 0,
      aplica: 'Próxima conta',
      ler: () => corrupcao.distancia.semCaminho,
      escrever: (valor) => {
        corrupcao.distancia.semCaminho = Math.round(valor);
      },
    },
  );

  return campos;
}
