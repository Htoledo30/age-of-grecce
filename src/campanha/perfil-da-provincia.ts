/** Identidade social e natural de uma província; contabilidade fica no Governo. */

import type { Economia } from '@/dados/esquema';

export interface FaixaDeFelicidade {
  ate: number;
  nome: string;
}

export function faixaDeFelicidade(valor: number, faixas: readonly FaixaDeFelicidade[]): string {
  for (const faixa of faixas) {
    if (valor <= faixa.ate) return faixa.nome;
  }
  return faixas[faixas.length - 1]?.nome ?? '';
}

interface FatiaDoPovo {
  id: string;
  nome: string;
  fracao: number;
}

export interface PerfilDaProvincia {
  felicidade: { valor: number; faixa: string };
  nacionalidades: readonly FatiaDoPovo[];
  secundario: { id: string; nome: string; nivel: number };
  ancoradouro: boolean;
}

export function perfilDaProvincia(
  idProvincia: string,
  economia: Economia,
  agora: {
    felicidade: number;
    nacionalidades: Readonly<Record<string, number>>;
  },
  faixas: readonly FaixaDeFelicidade[],
): PerfilDaProvincia | null {
  const ficha = economia.provincias[idProvincia];
  if (!ficha) return null;

  const nacionalidades = Object.entries(agora.nacionalidades)
    .map(([id, fracao]) => ({ id, nome: economia.nacionalidades[id]?.nome ?? id, fracao }))
    .sort((a, b) => b.fracao - a.fracao || a.id.localeCompare(b.id));

  return {
    felicidade: { valor: agora.felicidade, faixa: faixaDeFelicidade(agora.felicidade, faixas) },
    nacionalidades,
    secundario: {
      id: ficha.secundario.produto,
      nome: economia.produtos[ficha.secundario.produto]?.nome ?? ficha.secundario.produto,
      nivel: ficha.secundario.nivel,
    },
    ancoradouro: ficha.ancoradouro,
  };
}
