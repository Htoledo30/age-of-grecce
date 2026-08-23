/**
 * Quem mora numa província, como ela está de humor e o que ela tem guardado.
 *
 * É o retrato preparado para a região de teste: cinco províncias completas —
 * nacionalidade, felicidade, recurso secundário, estoque, ancoradouro — **antes** dos
 * sistemas que vão consumir tudo isso. Alimentação é o patch 0.0.4; felicidade, o 0.0.7.
 *
 * Fica fora de `economia.ts` de propósito. Aquele arquivo calcula moeda por turno e vai
 * ser substituído pela economia física no patch 0.0.3; isto aqui é identidade da população, e
 * atravessa a troca inteira sem mudar.
 */

import type { Economia } from '@/dados/esquema';

/** Uma faixa nomeada de felicidade, como vem de `ajustes.json`. */
export interface FaixaDeFelicidade {
  ate: number;
  nome: string;
}

/**
 * O humor da província como palavra.
 *
 * ⚠️ **O jogador nunca vê o número cru** (`DECISOES.md` #68). Mostrar "felicidade: 62"
 * convida a otimizar um placar; mostrar "Satisfeita" mantém a pergunta certa na cabeça
 * dele, que é o que a província vai fazer se piorar.
 */
export function faixaDeFelicidade(valor: number, faixas: readonly FaixaDeFelicidade[]): string {
  for (const faixa of faixas) {
    if (valor <= faixa.ate) return faixa.nome;
  }
  // Acima da última faixa só acontece se os dados quebrarem a regra de fechar em 100 —
  // que o esquema recusa. Cair na mais feliz é melhor que devolver vazio pra tela.
  return faixas[faixas.length - 1]?.nome ?? '';
}

/** Um povo e a fatia dele na população. */
interface FatiaDoPovo {
  id: string;
  nome: string;
  fracao: number;
}

/** Um produto guardado na província. */
interface ItemGuardado {
  id: string;
  nome: string;
  alimento: boolean;
  quantidade: number;
}

export interface PerfilDaProvincia {
  felicidade: { valor: number; faixa: string };
  /** Da maior fatia para a menor; empate desempata por id, pra ordem ser determinística. */
  nacionalidades: readonly FatiaDoPovo[];
  secundario: { id: string; nome: string; nivel: number };
  /** Alimentos primeiro, e dentro de cada grupo do mais guardado para o menos. */
  estoque: readonly ItemGuardado[];
  /**
   * O fôlego alimentar da província: quanto ela tem, quanto ela come, quantos turnos dá.
   *
   * ⚠️ **Ninguém come ainda.** `consumoPorTurno` é a régua que dimensiona o estoque
   * inicial (`DECISOES.md` #11A pede cerca de cinco turnos); o patch 0.0.4 é que faz o
   * consumo acontecer de verdade. O número está na tela desde já porque é ele que diz se
   * a região de teste está bem montada — e porque Atenas ser a mais rica e a de menor
   * fôlego é a coisa mais interessante que estes dados dizem.
   */
  alimento: { guardado: number; consumoPorTurno: number; turnos: number };
  ancoradouro: boolean;
}

/**
 * Monta o retrato a partir dos dados autorais e do estado de agora.
 *
 * População vem do ESTADO, não do arquivo: recrutar encolhe a província, e o fôlego
 * alimentar dela tem que encolher junto — senão pôr gente em armas viraria uma forma de
 * ganhar comida.
 */
export function perfilDaProvincia(
  idProvincia: string,
  economia: Economia,
  agora: {
    populacao: number;
    felicidade: number;
    nacionalidades: Readonly<Record<string, number>>;
    estoque: Readonly<Record<string, number>>;
  },
  faixas: readonly FaixaDeFelicidade[],
  consumoPorHabitante: number,
): PerfilDaProvincia | null {
  const ficha = economia.provincias[idProvincia];
  if (!ficha) return null;

  const nacionalidades = Object.entries(agora.nacionalidades)
    .map(([id, fracao]) => ({ id, nome: economia.nacionalidades[id]?.nome ?? id, fracao }))
    .sort((a, b) => b.fracao - a.fracao || a.id.localeCompare(b.id));

  const estoque = Object.entries(agora.estoque)
    .map(([id, quantidade]) => ({
      id,
      nome: economia.produtos[id]?.nome ?? id,
      alimento: economia.produtos[id]?.alimento ?? false,
      quantidade,
    }))
    .sort(
      (a, b) =>
        Number(b.alimento) - Number(a.alimento) ||
        b.quantidade - a.quantidade ||
        a.id.localeCompare(b.id),
    );

  const guardado = estoque.reduce((total, i) => total + (i.alimento ? i.quantidade : 0), 0);
  const consumoPorTurno = Math.round(agora.populacao * consumoPorHabitante);

  return {
    felicidade: { valor: agora.felicidade, faixa: faixaDeFelicidade(agora.felicidade, faixas) },
    nacionalidades,
    secundario: {
      id: ficha.secundario.produto,
      nome: economia.produtos[ficha.secundario.produto]?.nome ?? ficha.secundario.produto,
      nivel: ficha.secundario.nivel,
    },
    estoque,
    alimento: {
      guardado,
      consumoPorTurno,
      turnos: consumoPorTurno > 0 ? Math.floor(guardado / consumoPorTurno) : 0,
    },
    ancoradouro: ficha.ancoradouro,
  };
}
