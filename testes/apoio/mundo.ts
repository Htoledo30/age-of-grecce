/**
 * Os dados DE VERDADE, carregados uma vez para todos os testes.
 *
 * ⚠️ **Contra os arquivos do jogo, nunca contra um cenário inventado.** É o que faz a suíte
 * pegar uma mudança nos DADOS — uma província nova, um produto renomeado, um ajuste de
 * balanço que quebrou uma relação — e não só uma mudança no código.
 *
 * `novaCampanha()` devolve um Atlas novo a cada chamada: ele é imutável, mas compartilhar a
 * instância entre testes esconderia o dia em que ele deixasse de ser.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { Ajustes, Construcoes, Economia, Exercitos, Ia, Provincias } from '../../src/dados/esquema';
import { Campanha } from '../../src/campanha/campanha';
import { Atlas } from '../../src/mundo/atlas';

function ler<T>(esquema: { parse: (v: unknown) => T }, caminho: string): T {
  return esquema.parse(JSON.parse(readFileSync(resolve(caminho), 'utf8')));
}

export const provincias = ler(Provincias, 'assets/mundo/provincias.json');
export const economia = ler(Economia, 'dados/economia.json');
export const construcoes = ler(Construcoes, 'dados/construcoes.json');
export const exercitos = ler(Exercitos, 'dados/exercitos.json');
export const ajustes = ler(Ajustes, 'dados/ajustes.json').jogo;
/** QUEM é cada IA: os estilos e quem joga com qual. */
export const ia = ler(Ia, 'dados/ia.json');

/** O atlas compartilhado, para quem só lê geografia. Campanha nenhuma o altera. */
export const atlas = new Atlas(provincias);

export function novaCampanha(): Campanha {
  return new Campanha(new Atlas(provincias), economia, construcoes, ajustes, exercitos);
}
