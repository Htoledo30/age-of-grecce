import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { Campanha } from '../src/campanha/campanha';
import { Ajustes, Construcoes, Economia, Exercitos, Provincias } from '../src/dados/esquema';
import { Atlas } from '../src/mundo/atlas';
import { calcularCrescimentoPopulacional } from '../src/populacao/crescimento';

function ler<T>(esquema: { parse: (v: unknown) => T }, caminho: string): T {
  return esquema.parse(JSON.parse(readFileSync(resolve(caminho), 'utf8')));
}

const provincias = ler(Provincias, 'assets/mundo/provincias.json');
const economia = ler(Economia, 'dados/economia.json');
const construcoes = ler(Construcoes, 'dados/construcoes.json');
const exercitos = ler(Exercitos, 'dados/exercitos.json');
const ajustes = ler(Ajustes, 'dados/ajustes.json').jogo;

function nova(): Campanha {
  return new Campanha(new Atlas(provincias), economia, construcoes, ajustes, exercitos);
}

describe('crescimento populacional', () => {
  it('o crescimento é a taxa aplicada sobre quem está vivo, sem mais nada', () => {
    // ⚠️ **Derivado, nunca cravado.** `taxaNatural` e as populações iniciais são balanço, e
    // mudam. Um teste que crava "70" quebra a cada ajuste sem que nada esteja errado — e
    // o único jeito de descobrir é rodar a suíte. Derivar da regra faz o teste guardar a
    // REGRA e ignorar o número.
    const c = nova();
    for (const id of ['atenas', 'maratona', 'sounion']) {
      const previsto = c.crescimentoDe(id);
      const esperado = Math.floor(c.populacaoDe(id) * ajustes.populacao.taxaNatural);
      expect(previsto).toMatchObject({
        atual: c.populacaoDe(id),
        crescimento: esperado,
        proxima: c.populacaoDe(id) + esperado,
      });
    }
    // E é um número de verdade, não zero por acidente.
    expect(c.crescimentoDe('atenas')?.crescimento).toBeGreaterThan(0);
  });

  it('cresce todas as províncias configuradas ao passar o turno', () => {
    const c = nova();
    c.comecar('atenas');
    const previsto = Object.fromEntries(
      ['atenas', 'maratona', 'sounion'].map((id) => [id, c.crescimentoDe(id)?.proxima]),
    );

    c.passarTurno();

    for (const id of ['atenas', 'maratona', 'sounion']) {
      expect(c.populacaoDe(id)).toBe(previsto[id]);
      expect(c.populacaoDe(id)).toBeGreaterThan(0);
    }
  });

  it('NÃO existe capacidade máxima: a taxa vale igual em qualquer tamanho', () => {
    // ⚠️ O teto de `população inicial × 2` saiu por decisão (`DECISOES.md` #24). Um número
    // amarrado ao dado autoral de 700 a.C. não é limite do mundo, é limite da planilha —
    // e ele congelava a província justamente quando ela ia bem.
    const calcular = (atual: number) =>
      calcularCrescimentoPopulacional(atual, [], construcoes.construcoes, ajustes.populacao);

    // A taxa vale igual em qualquer tamanho: dobrar a população dobra o crescimento, e
    // não existe ponto em que ele desacelere.
    const base = calcular(35_000).crescimento;
    expect(base).toBeGreaterThan(0);
    expect(calcular(70_000).crescimento).toBe(base * 2);
    expect(calcular(350_000).crescimento).toBe(base * 10);
  });

  it('zero não se repovoa sozinho, e é isso que dá sentido ao piso de população', () => {
    const calcular = (atual: number) =>
      calcularCrescimentoPopulacional(atual, [], construcoes.construcoes, ajustes.populacao);

    expect(calcular(0)).toMatchObject({ crescimento: 0, proxima: 0 });

    // ⚠️ `Math.floor` faz o crescimento arredondar pra ZERO abaixo de um certo tamanho, e
    // dali a província nunca mais volta. É o motivo aritmético do `populacaoMinima`.
    // O limiar depende da taxa, então é derivado: com 0,5% são 200 habitantes.
    const limiar = Math.ceil(1 / ajustes.populacao.taxaNatural);
    expect(calcular(limiar - 1).crescimento).toBe(0);
    expect(calcular(limiar).crescimento).toBe(1);
    // E o piso do recrutamento tem que ficar ACIMA dele, senão ele não protege de nada.
    expect(ajustes.combate.populacaoMinima).toBeGreaterThan(limiar);
  });

  it('o Celeiro aumenta em 50% o crescimento, mas só depois de concluído', () => {
    const c = nova();
    c.comecar('atenas');
    c.darOuro(500);

    // O Celeiro multiplica o crescimento pelo fator do catálogo — qual é o número, o
    // teste não precisa saber.
    const fator = fatorDoCeleiro();
    const antes = c.crescimentoDe('atenas')?.crescimento ?? 0;
    expect(antes).toBeGreaterThan(0);
    expect(c.impactoPopulacionalDaConstrucaoEm('atenas', 'celeiro')).toEqual({
      antes,
      depois: Math.floor(antes * fator),
    });
    c.construir('atenas', 'celeiro');

    for (let turno = 0; turno < 3; turno += 1) {
      const antes = c.populacaoDe('atenas');
      const previsto = c.crescimentoDe('atenas');
      expect(previsto?.fatorConstrucoes).toBe(1);
      c.passarTurno();
      expect(c.populacaoDe('atenas') - antes).toBe(previsto?.crescimento);
    }

    expect(c.construcoesEm('atenas')).toContain('celeiro');
    expect(c.crescimentoDe('atenas')?.fatorConstrucoes).toBe(1.5);
  });
});

/** O multiplicador que o Celeiro aplica ao crescimento, lido do catálogo. */
function fatorDoCeleiro(): number {
  const efeito = construcoes.construcoes['celeiro']?.efeito;
  return efeito?.tipo === 'populacao' ? efeito.fatorCrescimento : 1;
}
