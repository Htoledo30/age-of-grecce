/**
 * As frases e os formatos do painel de província: tooltips, romanos, moeda e sinal.
 *
 * Ficam separados da montagem porque são DECISÕES DE TEXTO, não de layout — e é aqui que
 * mora o cuidado de não escrever "+0 por turno" onde o certo é "estável".
 */

import type { CrescimentoPopulacional } from '@/populacao/crescimento';
import type { ConteudoDeTooltip } from '../tooltip';
import type { VistaDaProvincia } from './vista';
import { milhar } from '@/nucleo/numeros';

/**
 * O crescimento como frase, e não como sinal grudado num número.
 *
 * ⚠️ **Zero é ESTÁVEL, não "+0".** A alimentação criou uma faixa em que o povo nem cresce
 * nem mingua — é onde o reino descansa — e escrever "+0 por turno" ali parecia defeito.
 * Negativo também não pode virar "+-24": míngua é outra notícia, e o painel diz isso.
 */
export function tooltipDaPopulacao(
  populacao: CrescimentoPopulacional & { limitadoPelaAlimentacao: boolean },
): ConteudoDeTooltip {
  if (populacao.limitadoPelaAlimentacao) {
    return {
      titulo: 'População mantida',
      corpo: 'A alimentação cobre a população atual, sem permitir crescimento.',
    };
  }
  if (populacao.crescimento < 0) {
    return {
      titulo: 'População caindo',
      corpo: `−${moeda(-populacao.crescimento)} no próximo turno.`,
      tom: 'perigo',
    };
  }
  if (populacao.crescimento > 0) {
    return {
      titulo: 'População subindo',
      corpo: `+${moeda(populacao.crescimento)} no próximo turno.`,
    };
  }
  return {
    titulo: 'Sem crescimento líquido',
    corpo: 'Nascimentos e mortes se equilibram neste turno.',
  };
}

export function tooltipDoHumor(
  atual: number,
  humor: NonNullable<VistaDaProvincia['humor']>,
): ConteudoDeTooltip {
  const alvo = humor.alvo;
  const movimento = atual < alvo ? 'subindo' : atual > alvo ? 'caindo' : 'mantido';
  return {
    titulo: `Humor ${movimento}: ${atual} → ${alvo}`,
    corpo:
      humor.parcelas
        .map((p) => `${p.rotulo} ${p.pontos >= 0 ? `+${p.pontos}` : `−${-p.pontos}`}`)
        .join(' · ') + ` = ${alvo}`,
    tom: atual > alvo ? 'perigo' : 'informacao',
  };
}

export function tooltipDoCerco(cerco: {
  mantimentosRestantes: number;
  fomeAtiva: boolean;
}): ConteudoDeTooltip {
  if (cerco.fomeAtiva) {
    return {
      titulo: 'Mantimentos esgotados',
      corpo: '−1% de população e −5% da guarnição por turno.',
      tom: 'perigo',
    };
  }
  return {
    titulo: `Mantimentos: ${cerco.mantimentosRestantes} ${
      cerco.mantimentosRestantes === 1 ? 'turno' : 'turnos'
    }`,
    corpo: 'Sem crescimento enquanto o cerco durar.',
  };
}

/** Grau de 1 a 5 em algarismo romano. A tabela é o mapa inteiro: não existe nível 6. */
export function romano(nivel: number): string {
  return ['I', 'II', 'III', 'IV', 'V'][nivel - 1] ?? String(nivel);
}

export function moeda(valor: number): string {
  return milhar(valor);
}

export function comSinal(valor: number): string {
  return valor >= 0 ? `+${moeda(valor)}` : `−${moeda(-valor)}`;
}

/** Em que pé está a despensa da cidade cercada, como o jogador precisa ler. */
export function faseDoCerco(cerco: { mantimentosRestantes: number; fomeAtiva: boolean }): string {
  if (cerco.fomeAtiva) return 'a cidade passa fome';
  return `mantimentos para ${cerco.mantimentosRestantes} ${
    cerco.mantimentosRestantes === 1 ? 'turno' : 'turnos'
  }`;
}
