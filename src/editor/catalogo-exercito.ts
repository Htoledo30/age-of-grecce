import type { Ajustes } from '@/dados/esquema';
import type { CampoNumerico } from './tipos';

type AjustesDoJogo = Ajustes['jogo'];

/**
 * Os primeiros controles do editor. As closures mantêm a tipagem real do dado: a tela nunca
 * recebe um caminho textual capaz de escrever no lugar errado do objeto.
 */
export function camposDoExercito(ajustes: AjustesDoJogo): readonly CampoNumerico[] {
  const combate = ajustes.combate;
  const campos: CampoNumerico[] = [
    {
      id: 'combate.custoPorHomem',
      aba: 'exercito',
      grupo: 'Recrutamento',
      nome: 'Custo base por homem',
      descricao: 'Preço pago para levantar um soldado leve. Cada arma multiplica esta base.',
      unidade: 'moedas',
      minimo: 0.1,
      maximo: 20,
      passo: 0.1,
      casas: 1,
      aplica: 'Novas levas',
      ler: () => combate.custoPorHomem,
      escrever: (valor) => {
        combate.custoPorHomem = valor;
      },
    },
    {
      id: 'combate.manutencaoPorHomem.emCasa',
      aba: 'exercito',
      grupo: 'Folha militar',
      nome: 'Manutenção em casa',
      descricao: 'Custo por homem e por turno enquanto a hoste está em território próprio.',
      unidade: 'moedas',
      minimo: 0.001,
      maximo: 2,
      passo: 0.01,
      casas: 3,
      aplica: 'Próxima conta',
      ler: () => combate.manutencaoPorHomem.emCasa,
      escrever: (valor) => {
        combate.manutencaoPorHomem.emCasa = valor;
      },
    },
    {
      id: 'combate.manutencaoPorHomem.emCampanha',
      aba: 'exercito',
      grupo: 'Folha militar',
      nome: 'Manutenção em campanha',
      descricao: 'Custo por homem e por turno em território alheio.',
      unidade: 'moedas',
      minimo: 0.001,
      maximo: 3,
      passo: 0.01,
      casas: 3,
      aplica: 'Próxima conta',
      ler: () => combate.manutencaoPorHomem.emCampanha,
      escrever: (valor) => {
        combate.manutencaoPorHomem.emCampanha = valor;
      },
    },
    {
      id: 'combate.populacaoMinima',
      aba: 'exercito',
      grupo: 'Recrutamento',
      nome: 'População protegida',
      descricao: 'Habitantes que o recrutamento nunca pode retirar de uma província.',
      unidade: 'habitantes',
      minimo: 0,
      maximo: 20_000,
      passo: 100,
      casas: 0,
      aplica: 'Novas levas',
      ler: () => combate.populacaoMinima,
      escrever: (valor) => {
        combate.populacaoMinima = Math.round(valor);
      },
    },
    {
      id: 'combate.milicia.fracao',
      aba: 'exercito',
      grupo: 'Milícia provincial',
      nome: 'População mobilizada',
      descricao: 'Fatia da população que defende automaticamente a própria província.',
      unidade: '%',
      minimo: 0.001,
      maximo: 0.1,
      passo: 0.001,
      casas: 1,
      fatorVisual: 100,
      aplica: 'Imediatamente',
      ler: () => combate.milicia.fracao,
      escrever: (valor) => {
        combate.milicia.fracao = valor;
      },
    },
    {
      id: 'combate.milicia.fracaoMorta',
      aba: 'exercito',
      grupo: 'Milícia provincial',
      nome: 'Milicianos mortos na derrota',
      descricao: 'O restante da milícia derrotada dispersa e volta para a população.',
      unidade: '%',
      minimo: 0.01,
      maximo: 1,
      passo: 0.01,
      casas: 0,
      fatorVisual: 100,
      aplica: 'Próxima batalha',
      ler: () => combate.milicia.fracaoMorta,
      escrever: (valor) => {
        combate.milicia.fracaoMorta = valor;
      },
    },
  ];

  const armas = [
    ['leve', 'Leves'],
    ['hoplita', 'Hoplitas'],
    ['arqueiro', 'Arqueiros'],
    ['cavalaria', 'Cavalaria'],
  ] as const;
  for (const [id, nome] of armas) {
    const arma = combate.batalha.armas[id];
    campos.push(
      {
        id: `combate.batalha.armas.${id}.custo`,
        aba: 'exercito',
        grupo: 'Custo das armas',
        nome,
        descricao: 'Multiplicador sobre o custo base de recrutamento.',
        unidade: '× custo',
        minimo: 0.1,
        maximo: 10,
        passo: 0.05,
        casas: 2,
        aplica: 'Novas levas',
        ler: () => arma.custo,
        escrever: (valor) => {
          arma.custo = valor;
        },
      },
      {
        id: `combate.batalha.armas.${id}.comida`,
        aba: 'exercito',
        grupo: 'Alimento das armas',
        nome,
        descricao: 'Peso de cada soldado desta arma no consumo militar.',
        unidade: '× comida',
        minimo: 0.1,
        maximo: 10,
        passo: 0.05,
        casas: 2,
        aplica: 'Próximo turno',
        ler: () => arma.comida,
        escrever: (valor) => {
          arma.comida = valor;
        },
      },
    );
  }
  return campos;
}
