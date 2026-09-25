/**
 * A camada visual do catálogo: transforma regras de construção em quatro famílias e em um
 * efeito curto. A janela recebe significado pronto e não precisa interpretar ids nem frases.
 */

import type { Construcoes } from '@/dados/esquema';
import type { ApresentacaoDaConstrucao } from '@/ui/construcoes';

type ConstrucaoDoCatalogo = Construcoes['construcoes'][string];

export function apresentacaoDaConstrucao(
  construcao: ConstrucaoDoCatalogo,
  nivel: number,
  ganhoPorTurno: number,
): ApresentacaoDaConstrucao {
  const apresentacao = apresentacaoDoEfeito(construcao, nivel, ganhoPorTurno);
  const prosperidade = construcao.prosperidade?.[nivel - 1] ?? 0;
  if (prosperidade <= 0) return apresentacao;
  const crescimento = `+${(prosperidade * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}% crescimento`;
  return {
    ...apresentacao,
    apoio: apresentacao.apoio ? `${apresentacao.apoio} · ${crescimento}` : crescimento,
  };
}

function apresentacaoDoEfeito(
  construcao: ConstrucaoDoCatalogo,
  nivel: number,
  ganhoPorTurno: number,
): ApresentacaoDaConstrucao {
  const efeito = construcao.efeito;
  const indice = nivel - 1;
  const renda = (): Pick<
    ApresentacaoDaConstrucao,
    'destaque' | 'destaqueRotulo' | 'destaqueTom'
  > => ({
    destaque: moedaComSinal(ganhoPorTurno),
    destaqueRotulo: 'moedas / turno',
    destaqueTom: ganhoPorTurno > 0 ? 'ganho' : ganhoPorTurno < 0 ? 'perda' : 'neutro',
  });

  switch (efeito.tipo) {
    case 'renda': {
      const rotas = efeito.parcela === 'transito' && construcao.ligaPorMar === true;
      return {
        categoria: rotas ? 'rotas' : 'terra',
        categoriaNome: rotas ? 'Rotas' : 'Terra',
        ...renda(),
        apoio: rotas ? 'embarque + comércio pelo mar' : `${nomeDaParcela(efeito.parcela)} local`,
      };
    }
    case 'alimento': {
      const pontos = efeito.pontos[indice] ?? 0;
      return {
        categoria: 'terra',
        categoriaNome: 'Terra',
        destaque: `+${pontos}`,
        destaqueRotulo: 'alimento do reino',
        destaqueTom: 'categoria',
        apoio: '',
      };
    }
    case 'milicia': {
      const fator = efeito.fatores[indice] ?? 1;
      const cerco = construcao.rodadasParaAssaltar?.[indice];
      return {
        categoria: 'guerra',
        categoriaNome: 'Guerra',
        destaque: porcentagem(fator - 1),
        destaqueRotulo: 'milícia local',
        destaqueTom: 'categoria',
        apoio: cerco ? `${cerco} ${cerco === 1 ? 'turno' : 'turnos'} antes do assalto` : '',
      };
    }
    case 'felicidade': {
      const pontos = efeito.pontos[indice] ?? 0;
      const recuperacao = construcao.recuperacaoDaOrdem?.[indice] ?? 0;
      return {
        categoria: 'cidade',
        categoriaNome: 'Cidade',
        destaque: `+${pontos}`,
        destaqueRotulo: 'felicidade-alvo',
        destaqueTom: 'categoria',
        apoio: recuperacao > 0 ? `+${recuperacao} recuperação / turno` : '',
      };
    }
    case 'corrupcao': {
      const fator = efeito.fatores[indice] ?? 1;
      return {
        categoria: efeito.alvo === 'distancia' ? 'rotas' : 'cidade',
        categoriaNome: efeito.alvo === 'distancia' ? 'Rotas' : 'Cidade',
        ...renda(),
        apoio: `−${Math.round((1 - fator) * 100)}% corrupção por ${efeito.alvo === 'distancia' ? 'distância' : 'tamanho'}`,
      };
    }
    case 'troca':
      return {
        categoria: 'cidade',
        categoriaNome: 'Cidade',
        ...renda(),
        apoio: 'rede do reino + trânsito local',
      };
    case 'arma':
      return {
        categoria: 'guerra',
        categoriaNome: 'Guerra',
        destaque: efeito.arma.toLocaleUpperCase('pt-BR'),
        destaqueRotulo: 'arma disponível aqui',
        destaqueTom: 'categoria',
        apoio: '',
      };
    case 'qualidade': {
      const fator = efeito.fatores[indice] ?? 1;
      return {
        categoria: 'guerra',
        categoriaNome: 'Guerra',
        destaque: porcentagem(fator - 1),
        destaqueRotulo: 'treino das novas tropas',
        destaqueTom: 'categoria',
        apoio: '',
      };
    }
    case 'futuro':
      return {
        categoria: 'cidade',
        categoriaNome: 'Cidade',
        destaque: '—',
        destaqueRotulo: 'sem efeito atual',
        destaqueTom: 'neutro',
        apoio: '',
      };
  }
}

function moedaComSinal(valor: number): string {
  if (valor === 0) return '0';
  const absoluto = Math.abs(Math.round(valor)).toLocaleString('pt-BR');
  return valor > 0 ? `+${absoluto}` : `−${absoluto}`;
}

function porcentagem(fracao: number): string {
  return `${fracao >= 0 ? '+' : '−'}${Math.abs(Math.round(fracao * 100))}%`;
}

function nomeDaParcela(parcela: 'impostos' | 'producao' | 'transito'): string {
  if (parcela === 'producao') return 'produção';
  if (parcela === 'transito') return 'trânsito';
  return parcela;
}
