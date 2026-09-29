/** Efeitos estruturados para a lista e o detalhe, sem interpretar frases na interface. */
import type { Construcoes } from '@/dados/esquema';
import type { ApresentacaoDaConstrucao, EfeitoDaConstrucao } from '@/ui/construcoes';
import { milhar } from '@/nucleo/numeros';

type ConstrucaoDoCatalogo = Construcoes['construcoes'][string];

export function apresentacaoDaConstrucao(
  construcao: ConstrucaoDoCatalogo,
  nivel: number,
  ganhoPorTurno: number,
): ApresentacaoDaConstrucao {
  const apresentacao = apresentacaoDoEfeito(construcao, nivel, ganhoPorTurno);
  const extras: EfeitoDaConstrucao[] = [];
  const prosperidade = construcao.prosperidade?.[nivel - 1] ?? 0;
  if (prosperidade > 0) {
    extras.push({
      valor: `+${(prosperidade * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`,
      rotulo: 'crescimento populacional',
      icone: 'territorio',
      tom: 'ganho',
    });
  }
  const humor = construcao.humor?.[nivel - 1] ?? 0;
  if (humor < 0) {
    extras.push({ valor: `−${-humor}`, rotulo: 'humor', icone: 'templo', tom: 'perda' });
  }
  return { ...apresentacao, efeitos: [...apresentacao.efeitos, ...extras] };
}

function apresentacaoDoEfeito(
  construcao: ConstrucaoDoCatalogo,
  nivel: number,
  ganhoPorTurno: number,
): ApresentacaoDaConstrucao {
  const efeito = construcao.efeito;
  const indice = nivel - 1;
  const renda: EfeitoDaConstrucao = {
    valor: moedaComSinal(ganhoPorTurno),
    rotulo: 'moedas por turno',
    icone: 'moeda',
    tom: ganhoPorTurno > 0 ? 'ouro' : ganhoPorTurno < 0 ? 'perda' : 'neutro',
  };

  switch (efeito.tipo) {
    case 'renda': {
      const rotas = efeito.parcela === 'transito' && construcao.ligaPorMar === true;
      return {
        categoria: rotas ? 'rotas' : 'terra',
        categoriaNome: rotas ? 'Rotas' : 'Terra',
        efeitos: [
          renda,
          {
            valor: rotas ? '' : porcentagem((efeito.fatores[indice] ?? 1) - 1),
            rotulo: rotas ? 'embarque e comércio marítimo' : `${nomeDaParcela(efeito.parcela)} local`,
            icone: rotas ? 'territorio' : 'mercado',
            tom: 'ganho',
          },
        ],
      };
    }
    case 'alimento':
      return {
        categoria: 'terra',
        categoriaNome: 'Terra',
        efeitos: [{
          valor: `+${efeito.pontos[indice] ?? 0}`,
          rotulo: 'comida', icone: 'celeiro', tom: 'ganho',
        }],
      };
    case 'milicia': {
      const cerco = construcao.rodadasParaAssaltar?.[indice];
      const efeitos: [EfeitoDaConstrucao, ...EfeitoDaConstrucao[]] = [{
        valor: porcentagem((efeito.fatores[indice] ?? 1) - 1),
        rotulo: 'milícia', icone: 'hoplon', tom: 'ganho',
      }];
      if (cerco) {
        efeitos.push({
          valor: `${cerco} ${cerco === 1 ? 'turno' : 'turnos'}`,
          rotulo: 'antes do assalto', icone: 'muralha', tom: 'neutro',
        });
      }
      return { categoria: 'guerra', categoriaNome: 'Guerra', efeitos };
    }
    case 'felicidade': {
      const recuperacao = construcao.recuperacaoDaOrdem?.[indice] ?? 0;
      const efeitos: [EfeitoDaConstrucao, ...EfeitoDaConstrucao[]] = [{
        valor: `+${efeito.pontos[indice] ?? 0}`,
        rotulo: 'humor', icone: 'templo', tom: 'ganho',
      }];
      if (recuperacao > 0) {
        efeitos.push({
          valor: `+${recuperacao}`,
          rotulo: 'recuperação por turno', icone: 'turno', tom: 'ganho',
        });
      }
      return { categoria: 'cidade', categoriaNome: 'Cidade', efeitos };
    }
    case 'corrupcao':
      return {
        categoria: efeito.alvo === 'distancia' ? 'rotas' : 'cidade',
        categoriaNome: efeito.alvo === 'distancia' ? 'Rotas' : 'Cidade',
        efeitos: [
          renda,
          {
            valor: `−${Math.round((1 - (efeito.fatores[indice] ?? 1)) * 100)}%`,
            rotulo: `corrupção por ${efeito.alvo === 'distancia' ? 'distância' : 'tamanho'}`,
            icone: 'balanca', tom: 'ganho',
          },
        ],
      };
    case 'troca':
      return {
        categoria: 'cidade',
        categoriaNome: 'Cidade',
        efeitos: [
          renda,
          {
            valor: porcentagem((efeito.fatores[indice] ?? 1) - 1),
            rotulo: 'rede do reino e trânsito local', icone: 'mercado', tom: 'ganho',
          },
        ],
      };
    case 'arma':
      return {
        categoria: 'guerra',
        categoriaNome: 'Guerra',
        efeitos: [{
          valor: efeito.arma.charAt(0).toLocaleUpperCase('pt-BR') + efeito.arma.slice(1),
          rotulo: 'recrutamento liberado', icone: 'capacete', tom: 'neutro',
        }],
      };
    case 'qualidade':
      return {
        categoria: 'guerra',
        categoriaNome: 'Guerra',
        efeitos: [{
          valor: porcentagem((efeito.fatores[indice] ?? 1) - 1),
          rotulo: 'treino das tropas', icone: 'lancas', tom: 'ganho',
        }],
      };
    case 'futuro':
      return {
        categoria: 'cidade',
        categoriaNome: 'Cidade',
        efeitos: [{ valor: '—', rotulo: 'sem efeito atual', icone: 'martelo', tom: 'neutro' }],
      };
  }
}

function moedaComSinal(valor: number): string {
  if (valor === 0) return '0';
  const absoluto = milhar(Math.abs(Math.round(valor)));
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
