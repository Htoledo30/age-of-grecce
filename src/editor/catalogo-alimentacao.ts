import type { Ajustes } from '@/dados/esquema';
import type { CampoNumerico } from './tipos';

type AjustesDoJogo = Ajustes['jogo'];

/** Capacidade alimentar do reino e o que acontece quando ela não fecha. */
export function camposDaAlimentacao(ajustes: AjustesDoJogo): readonly CampoNumerico[] {
  const alimento = ajustes.alimento;
  return [
    {
      id: 'alimento.subsistenciaPorReino',
      aba: 'alimentacao',
      grupo: 'Balanço do reino',
      nome: 'Subsistência base',
      descricao: 'Comida recebida uma vez por reino, independentemente do número de províncias.',
      unidade: 'pontos',
      minimo: 0,
      maximo: 10,
      passo: 1,
      casas: 0,
      aplica: 'Próximo turno',
      ler: () => alimento.subsistenciaPorReino,
      escrever: (valor) => {
        alimento.subsistenciaPorReino = Math.round(valor);
      },
    },
    {
      id: 'alimento.soldadosPorPonto',
      aba: 'alimentacao',
      grupo: 'Balanço do reino',
      nome: 'Soldados por ponto de consumo',
      descricao: 'Cada grupo deste tamanho, ou fração, retira um ponto do saldo alimentar.',
      unidade: 'soldados',
      minimo: 100,
      maximo: 20_000,
      passo: 100,
      casas: 0,
      aplica: 'Próximo turno',
      ler: () => alimento.soldadosPorPonto,
      escrever: (valor) => {
        alimento.soldadosPorPonto = Math.round(valor);
      },
    },
    {
      id: 'alimento.mortePorFome',
      aba: 'alimentacao',
      grupo: 'Consequências da fome',
      nome: 'Mortalidade civil',
      descricao: 'População perdida por turno nas províncias que estiverem passando fome.',
      unidade: '% por turno',
      minimo: 0,
      maximo: 0.25,
      passo: 0.005,
      casas: 1,
      fatorVisual: 100,
      aplica: 'Próximo turno',
      ler: () => alimento.mortePorFome,
      escrever: (valor) => {
        alimento.mortePorFome = valor;
      },
    },
    {
      id: 'alimento.mortePorFomeNaTropa',
      aba: 'alimentacao',
      grupo: 'Consequências da fome',
      nome: 'Mortalidade militar',
      descricao: 'Homens mobilizados perdidos por turno quando o exército fica sem mantimentos.',
      unidade: '% por turno',
      minimo: 0,
      maximo: 1,
      passo: 0.01,
      casas: 0,
      fatorVisual: 100,
      aplica: 'Próximo turno',
      ler: () => alimento.mortePorFomeNaTropa,
      escrever: (valor) => {
        alimento.mortePorFomeNaTropa = valor;
      },
    },
    {
      id: 'alimento.cerco.mantimentos',
      aba: 'alimentacao',
      grupo: 'Cidade sitiada',
      nome: 'Mantimentos iniciais',
      descricao: 'Turnos que toda cidade resiste antes de somar a comida produzida na própria terra.',
      unidade: 'turnos',
      minimo: 0,
      maximo: 20,
      passo: 1,
      casas: 0,
      aplica: 'Próximo cerco',
      ler: () => alimento.cerco.mantimentos,
      escrever: (valor) => {
        alimento.cerco.mantimentos = Math.round(valor);
      },
    },
  ];
}
