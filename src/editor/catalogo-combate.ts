import type { Ajustes } from '@/dados/esquema';
import type { CampoNumerico } from './tipos';

type AjustesDoJogo = Ajustes['jogo'];

/** Choque, retirada, armas e cerco — o que acontece depois que o exército entra em luta. */
export function camposDoCombate(ajustes: AjustesDoJogo): readonly CampoNumerico[] {
  const combate = ajustes.combate;
  const batalha = combate.batalha;
  const campos: CampoNumerico[] = [
    {
      id: 'combate.batalha.rodadasDeChoque',
      aba: 'combate',
      grupo: 'Ritmo da batalha',
      nome: 'Máximo de rodadas de choque',
      descricao: 'A batalha termina empatada se nenhuma linha ceder até este limite.',
      unidade: 'rodadas',
      minimo: 1,
      maximo: 30,
      passo: 1,
      casas: 0,
      aplica: 'Próxima batalha',
      ler: () => batalha.rodadasDeChoque,
      escrever: (valor) => {
        batalha.rodadasDeChoque = Math.round(valor);
      },
    },
    {
      id: 'combate.batalha.letalidadeDoChoque',
      aba: 'combate',
      grupo: 'Ritmo da batalha',
      nome: 'Letalidade do choque',
      descricao: 'Fatia da própria força que cada lado transforma em dano por rodada.',
      unidade: '%',
      minimo: 0.01,
      maximo: 1,
      passo: 0.01,
      casas: 0,
      fatorVisual: 100,
      aplica: 'Próxima batalha',
      ler: () => batalha.letalidadeDoChoque,
      escrever: (valor) => {
        batalha.letalidadeDoChoque = valor;
      },
    },
    {
      id: 'combate.batalha.limiarDeQuebra',
      aba: 'combate',
      grupo: 'Ritmo da batalha',
      nome: 'Limiar de quebra',
      descricao: 'A linha cede depois de perder esta parcela da força com que começou.',
      unidade: '%',
      minimo: 0.05,
      maximo: 1,
      passo: 0.01,
      casas: 0,
      fatorVisual: 100,
      aplica: 'Próxima batalha',
      ler: () => batalha.limiarDeQuebra,
      escrever: (valor) => {
        batalha.limiarDeQuebra = valor;
      },
    },
    {
      id: 'combate.batalha.limiarDeRecuo',
      aba: 'combate',
      grupo: 'Recuo e perseguição',
      nome: 'Limiar do recuo ordenado',
      descricao: 'A ordem “Poupar o exército” retira a tropa ao atingir esta perda.',
      unidade: '%',
      minimo: 0.01,
      maximo: 0.99,
      passo: 0.01,
      casas: 0,
      fatorVisual: 100,
      aplica: 'Próxima batalha',
      ler: () => batalha.limiarDeRecuo,
      escrever: (valor) => {
        batalha.limiarDeRecuo = valor;
      },
    },
    {
      id: 'combate.batalha.fracaoDoRecuo',
      aba: 'combate',
      grupo: 'Recuo e perseguição',
      nome: 'Perdas ao recuar',
      descricao: 'Parcela perdida por quem abandona o campo antes de a linha quebrar.',
      unidade: '%',
      minimo: 0.01,
      maximo: 1,
      passo: 0.01,
      casas: 0,
      fatorVisual: 100,
      aplica: 'Próxima batalha',
      ler: () => batalha.fracaoDoRecuo,
      escrever: (valor) => {
        batalha.fracaoDoRecuo = valor;
      },
    },
    {
      id: 'combate.batalha.letalidadeDaPerseguicao',
      aba: 'combate',
      grupo: 'Recuo e perseguição',
      nome: 'Letalidade da perseguição',
      descricao: 'Parcela dos sobreviventes quebrados que morre durante a fuga.',
      unidade: '%',
      minimo: 0.01,
      maximo: 1,
      passo: 0.01,
      casas: 0,
      fatorVisual: 100,
      aplica: 'Próxima batalha',
      ler: () => batalha.letalidadeDaPerseguicao,
      escrever: (valor) => {
        batalha.letalidadeDaPerseguicao = valor;
      },
    },
    {
      id: 'combate.batalha.armas.perseguicaoPorCavalaria',
      aba: 'combate',
      grupo: 'Recuo e perseguição',
      nome: 'Bônus máximo da cavalaria',
      descricao: 'Multiplicador máximo da perseguição quando o vencedor possui cavalaria.',
      unidade: '× perseguição',
      minimo: 1,
      maximo: 5,
      passo: 0.05,
      casas: 2,
      aplica: 'Próxima batalha',
      ler: () => batalha.armas.perseguicaoPorCavalaria,
      escrever: (valor) => {
        batalha.armas.perseguicaoPorCavalaria = valor;
      },
    },
    {
      id: 'combate.batalha.armas.meiaCavalaria',
      aba: 'combate',
      grupo: 'Recuo e perseguição',
      nome: 'Cavalaria para metade do bônus',
      descricao: 'Fatia de cavaleiros que já entrega metade da vantagem de perseguição.',
      unidade: '% da hoste',
      minimo: 0.01,
      maximo: 1,
      passo: 0.01,
      casas: 0,
      fatorVisual: 100,
      aplica: 'Próxima batalha',
      ler: () => batalha.armas.meiaCavalaria,
      escrever: (valor) => {
        batalha.armas.meiaCavalaria = valor;
      },
    },
    {
      id: 'combate.batalha.armas.counter',
      aba: 'combate',
      grupo: 'Vantagem entre armas',
      nome: 'Força do counter',
      descricao: 'Quanto a arma correta multiplica o próprio dano contra seu alvo favorável.',
      unidade: '× dano',
      minimo: 1,
      maximo: 4,
      passo: 0.05,
      casas: 2,
      aplica: 'Próxima batalha',
      ler: () => batalha.armas.counter,
      escrever: (valor) => {
        batalha.armas.counter = valor;
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
    const arma = batalha.armas[id];
    campos.push(
      {
        id: `combate.batalha.armas.${id}.ataque`,
        aba: 'combate',
        grupo: 'Ataque das armas',
        nome,
        descricao: 'Força ofensiva de cada homem desta arma durante o choque.',
        unidade: '× ataque',
        minimo: 0.1,
        maximo: 10,
        passo: 0.05,
        casas: 2,
        aplica: 'Próxima batalha',
        ler: () => arma.ataque,
        escrever: (valor) => {
          arma.ataque = valor;
        },
      },
      {
        id: `combate.batalha.armas.${id}.aguento`,
        aba: 'combate',
        grupo: 'Aguento das armas',
        nome,
        descricao: 'Resistência de cada homem desta arma ao dano recebido.',
        unidade: '× aguento',
        minimo: 0.1,
        maximo: 10,
        passo: 0.05,
        casas: 2,
        aplica: 'Próxima batalha',
        ler: () => arma.aguento,
        escrever: (valor) => {
          arma.aguento = valor;
        },
      },
    );
  }
  return campos;
}
