import type { Ajustes, Construcoes } from '@/dados/esquema';
import type { CampoNumerico, ItemDoEditor, SerieNumerica } from './tipos';

type AjustesDoJogo = Ajustes['jogo'];
type CatalogoDeConstrucoes = Construcoes['construcoes'];
type Construcao = CatalogoDeConstrucoes[string];
type TresNumeros = [number, number, number];

const NIVEIS = ['I', 'II', 'III'] as const;

interface OpcoesDaSerie {
  id: string;
  grupo: string;
  nome: string;
  descricao: string;
  unidade: string;
  valores: TresNumeros;
  minimo: number;
  maximo: number;
  passo: number;
  casas: number;
  fatorVisual?: number;
  inteiro?: boolean;
  aplica: string;
}

function serieDeNiveis(opcoes: OpcoesDaSerie): SerieNumerica {
  const campos = NIVEIS.map((nivel, indice) => ({
    id: `${opcoes.id}.${indice}`,
    aba: 'construcoes' as const,
    grupo: opcoes.grupo,
    nome: nivel,
    descricao: opcoes.descricao,
    unidade: opcoes.unidade,
    minimo: opcoes.minimo,
    maximo: opcoes.maximo,
    passo: opcoes.passo,
    casas: opcoes.casas,
    fatorVisual: opcoes.fatorVisual,
    aplica: opcoes.aplica,
    ler: () => opcoes.valores[indice] ?? 0,
    escrever: (valor: number) => {
      opcoes.valores[indice] = opcoes.inteiro ? Math.round(valor) : valor;
    },
  })) as [CampoNumerico, CampoNumerico, CampoNumerico];
  return {
    aba: 'construcoes',
    grupo: opcoes.grupo,
    nome: opcoes.nome,
    descricao: opcoes.descricao,
    aplica: opcoes.aplica,
    campos,
  };
}

function categoriaDe(id: string, construcao: Construcao): string {
  switch (construcao.efeito.tipo) {
    case 'alimento':
      return 'Alimentação';
    case 'felicidade':
      return 'Ordem pública';
    case 'arma':
    case 'qualidade':
    case 'milicia':
      return 'Militar e defesa';
    case 'troca':
      return 'Comércio e navegação';
    case 'corrupcao':
      return 'Administração';
    case 'renda':
      return id === 'porto' ? 'Comércio e navegação' : 'Produção';
    case 'futuro':
      return 'Outras construções';
  }
}

function serieDoEfeito(id: string, grupo: string, construcao: Construcao): SerieNumerica | null {
  const base = `construcoes.catalogo.${id}.efeito`;
  const efeito = construcao.efeito;
  switch (efeito.tipo) {
    case 'renda':
      return serieDeNiveis({
        id: `${base}.crescente`,
        grupo,
        nome: `${construcao.nome} · efeito`,
        descricao: `Multiplicador da renda de ${efeito.parcela} desta província.`,
        unidade: '× renda',
        valores: efeito.fatores,
        minimo: 0.1,
        maximo: 10,
        passo: 0.05,
        casas: 2,
        aplica: 'Próxima conta',
      });
    case 'troca':
      return serieDeNiveis({
        id: `${base}.crescente`,
        grupo,
        nome: `${construcao.nome} · efeito`,
        descricao: 'Multiplicador da rede do reino e do trânsito desta província.',
        unidade: '× troca',
        valores: efeito.fatores,
        minimo: 0.1,
        maximo: 10,
        passo: 0.05,
        casas: 2,
        aplica: 'Próxima conta',
      });
    case 'milicia':
      return serieDeNiveis({
        id: `${base}.crescente`,
        grupo,
        nome: `${construcao.nome} · efeito`,
        descricao: 'Multiplicador da milícia que defende automaticamente esta província.',
        unidade: '× milícia',
        valores: efeito.fatores,
        minimo: 0.1,
        maximo: 10,
        passo: 0.05,
        casas: 2,
        aplica: 'Próxima defesa',
      });
    case 'qualidade':
      return serieDeNiveis({
        id: `${base}.crescente`,
        grupo,
        nome: `${construcao.nome} · efeito`,
        descricao: 'Multiplicador de treino carimbado nas novas tropas recrutadas aqui.',
        unidade: '× treino',
        valores: efeito.fatores,
        minimo: 0.1,
        maximo: 3,
        passo: 0.05,
        casas: 2,
        aplica: 'Novas levas',
      });
    case 'corrupcao':
      return serieDeNiveis({
        id: `${base}.decrescente`,
        grupo,
        nome: `${construcao.nome} · efeito`,
        descricao: `Parcela da corrupção por ${efeito.alvo} que continua existindo. Menor é melhor.`,
        unidade: '% restante',
        valores: efeito.fatores,
        minimo: 0.01,
        maximo: 1,
        passo: 0.01,
        casas: 0,
        fatorVisual: 100,
        aplica: 'Próxima conta',
      });
    case 'alimento':
      return serieDeNiveis({
        id: `${base}.crescente`,
        grupo,
        nome: `${construcao.nome} · efeito`,
        descricao: 'Pontos acrescentados ao saldo alimentar do reino.',
        unidade: 'pontos',
        valores: efeito.pontos,
        minimo: 0,
        maximo: 20,
        passo: 1,
        casas: 0,
        inteiro: true,
        aplica: 'Próximo turno',
      });
    case 'felicidade':
      return serieDeNiveis({
        id: `${base}.crescente`,
        grupo,
        nome: `${construcao.nome} · efeito`,
        descricao: 'Pontos acrescentados ao alvo de felicidade desta província.',
        unidade: 'de humor',
        valores: efeito.pontos,
        minimo: 0,
        maximo: 100,
        passo: 1,
        casas: 0,
        inteiro: true,
        aplica: 'Próximo turno',
      });
    case 'arma':
    case 'futuro':
      return null;
  }
}

/** Regras globais e o catálogo inteiro, sem editar requisitos ou identidades textuais. */
export function camposDasConstrucoes(
  ajustes: AjustesDoJogo,
  construcoes: CatalogoDeConstrucoes,
): readonly ItemDoEditor[] {
  const regras = ajustes.construcoes;
  const itens: ItemDoEditor[] = [
    {
      id: 'construcoes.slotsPorProvincia',
      aba: 'construcoes',
      grupo: 'Regras gerais',
      nome: 'Espaços por província',
      descricao: 'Quantidade de construções diferentes que cada província pode manter.',
      unidade: 'espaços',
      minimo: 1,
      maximo: 20,
      passo: 1,
      casas: 0,
      aplica: 'Imediatamente',
      ler: () => regras.slotsPorProvincia,
      escrever: (valor) => {
        regras.slotsPorProvincia = Math.round(valor);
      },
    },
    {
      id: 'construcoes.pesoDeReferencia',
      aba: 'construcoes',
      grupo: 'Regras gerais',
      nome: 'Peso econômico de referência',
      descricao: 'Província com este peso paga exatamente o custo escrito no catálogo.',
      unidade: 'de renda',
      minimo: 1,
      maximo: 2_000,
      passo: 10,
      casas: 0,
      aplica: 'Novas obras',
      ler: () => regras.pesoDeReferencia,
      escrever: (valor) => {
        regras.pesoDeReferencia = valor;
      },
    },
    {
      id: 'construcoes.escalaMinima',
      aba: 'construcoes',
      grupo: 'Regras gerais',
      nome: 'Menor escala de preço',
      descricao: 'Piso do multiplicador que impede uma terra pobre de construir quase de graça.',
      unidade: '× custo',
      minimo: 0.05,
      maximo: 10,
      passo: 0.05,
      casas: 2,
      aplica: 'Novas obras',
      ler: () => regras.escalaMinima,
      escrever: (valor) => {
        regras.escalaMinima = valor;
      },
    },
    {
      id: 'construcoes.escalaMaxima',
      aba: 'construcoes',
      grupo: 'Regras gerais',
      nome: 'Maior escala de preço',
      descricao: 'Teto do multiplicador que impede uma metrópole de nunca conseguir construir.',
      unidade: '× custo',
      minimo: 0.05,
      maximo: 20,
      passo: 0.05,
      casas: 2,
      aplica: 'Novas obras',
      ler: () => regras.escalaMaxima,
      escrever: (valor) => {
        regras.escalaMaxima = valor;
      },
    },
  ];

  for (const [id, construcao] of Object.entries(construcoes)) {
    const grupo = categoriaDe(id, construcao);
    const base = `construcoes.catalogo.${id}`;
    itens.push(
      serieDeNiveis({
        id: `${base}.custos.crescente`,
        grupo,
        nome: `${construcao.nome} · custo`,
        descricao:
          construcao.escalaPorProvincia === false
            ? 'Preço final fixo em qualquer província. Somente os níveis permitidos pela obra entram no jogo.'
            : 'Preço de catálogo antes da escala econômica da província.',
        unidade: 'moedas',
        valores: construcao.custos,
        minimo: 1,
        maximo: 100_000,
        passo: 100,
        casas: 0,
        aplica: 'Novas obras',
      }),
      serieDeNiveis({
        id: `${base}.turnos.crescente`,
        grupo,
        nome: `${construcao.nome} · duração`,
        descricao:
          construcao.nivelMaximo === 1
            ? 'Obra de nível único: somente a coluna I entra no jogo.'
            : 'Turnos necessários para concluir cada nível.',
        unidade: 'turnos',
        valores: construcao.turnos,
        minimo: 1,
        maximo: 50,
        passo: 1,
        casas: 0,
        inteiro: true,
        aplica: 'Novas obras',
      }),
      serieDeNiveis({
        id: `${base}.manutencao.crescente`,
        grupo,
        nome: `${construcao.nome} · manutenção`,
        descricao:
          construcao.escalaPorProvincia === false
            ? 'Folha final fixa em qualquer província. Somente os níveis permitidos pela obra entram no jogo.'
            : 'Ouro retirado por turno enquanto a construção estiver de pé.',
        unidade: 'moedas',
        valores: construcao.manutencao,
        minimo: 1,
        maximo: 10_000,
        passo: 1,
        casas: 0,
        inteiro: true,
        aplica: 'Próxima conta',
      }),
    );
    const efeito = serieDoEfeito(id, grupo, construcao);
    if (efeito) itens.push(efeito);
    if (construcao.rodadasParaAssaltar) {
      itens.push(
        serieDeNiveis({
          id: `${base}.rodadasParaAssaltar.crescente`,
          grupo,
          nome: `${construcao.nome} · preparação do assalto`,
          descricao: 'Rodadas completas de cerco exigidas antes de o inimigo poder assaltar.',
          unidade: 'rodadas',
          valores: construcao.rodadasParaAssaltar,
          minimo: 1,
          maximo: 20,
          passo: 1,
          casas: 0,
          inteiro: true,
          aplica: 'Próximo assalto',
        }),
      );
    }
    if (construcao.descontoDaFolhaEmCasa) {
      itens.push(
        serieDeNiveis({
          id: `${base}.descontoDaFolhaEmCasa.crescente`,
          grupo,
          nome: `${construcao.nome} · folha em casa`,
          descricao: 'Desconto da folha da tropa parada nesta província própria.',
          unidade: '% de desconto',
          valores: construcao.descontoDaFolhaEmCasa,
          minimo: 0,
          maximo: 0.9,
          passo: 0.01,
          casas: 0,
          fatorVisual: 100,
          aplica: 'Próxima conta',
        }),
      );
    }
    if (construcao.recuperacaoDaOrdem) {
      itens.push(
        serieDeNiveis({
          id: `${base}.recuperacaoDaOrdem.crescente`,
          grupo,
          nome: `${construcao.nome} · recuperação da ordem`,
          descricao: 'Pontos extras por turno quando o humor sobe em direção ao alvo.',
          unidade: 'de humor',
          valores: construcao.recuperacaoDaOrdem,
          minimo: 0,
          maximo: 20,
          passo: 1,
          casas: 0,
          inteiro: true,
          aplica: 'Próximo turno',
        }),
      );
    }
  }

  return itens;
}
