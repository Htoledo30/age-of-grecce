import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { Ajustes, Construcoes, Economia, Exercitos, Provincias } from '../src/dados/esquema';
import { Campanha } from '../src/campanha/campanha';
import { Atlas } from '../src/mundo/atlas';
import { avancoDoCerco, defesaNoAssalto, milicianosPerdidos } from '../src/combate/cerco';

function ler<T>(esquema: { parse: (v: unknown) => T }, caminho: string): T {
  return esquema.parse(JSON.parse(readFileSync(resolve(caminho), 'utf8')));
}

const provincias = ler(Provincias, 'assets/mundo/provincias.json');
const economia = ler(Economia, 'dados/economia.json');
const construcoes = ler(Construcoes, 'dados/construcoes.json');
const exercitos = ler(Exercitos, 'dados/exercitos.json');
const ajustes = ler(Ajustes, 'dados/ajustes.json').jogo;
const cercoAjustes = ajustes.combate.cerco;

function nova(): Campanha {
  return new Campanha(new Atlas(provincias), economia, construcoes, ajustes, exercitos);
}

/** Atenas com ouro e uma hoste plantada, pronta para marchar sobre Elêusis. */
function contraEleusis(homens: number): Campanha {
  const c = nova();
  c.comecar('atenas');
  c.darOuro(200_000);
  c.plantarHoste('atenas', 'atenas', homens);
  // Elêusis abre com 500 homens de guarnição. Dispensá-los deixa o teste falar só do
  // cerco, sem o choque de campo na frente.
  c.dispensar('eleusis', 500);
  return c;
}

describe('as contas do cerco', () => {
  it('mais gente cercando aperta mais depressa', () => {
    const devagar = avancoDoCerco(100, 200, cercoAjustes);
    const depressa = avancoDoCerco(400, 200, cercoAjustes);
    expect(depressa).toBeCloseTo(devagar * 4, 10);
  });

  it('cidade sem defensor abre no mesmo turno, e ninguém aperta sozinho', () => {
    expect(avancoDoCerco(100, 0, cercoAjustes)).toBe(1);
    expect(avancoDoCerco(0, 200, cercoAjustes)).toBe(0);
  });

  it('a muralha multiplica a milícia, e desfazer a conta devolve HOMENS', () => {
    const defesa = defesaNoAssalto(300, cercoAjustes);
    expect(defesa).toBe(300 * cercoAjustes.bonusDeMuralha);
    // Sem desfazer a multiplicação, um assalto rechaçado faria a população encolher pelo
    // dobro do que de fato caiu.
    expect(milicianosPerdidos(300, defesa, cercoAjustes)).toBe(0);
    expect(milicianosPerdidos(300, defesa / 2, cercoAjustes)).toBe(150);
    expect(milicianosPerdidos(300, 0, cercoAjustes)).toBe(300);
  });
});

describe('o cerco leva turnos, e é essa demora que cria a guerra', () => {
  it('acumula até abrir os portões, sem batalha nenhuma', () => {
    const c = contraEleusis(400);
    c.ordenarMarcha('atenas', 'eleusis', 400, 'atenas');

    const passos: number[] = [];
    let turnos = 0;
    while (c.donoDe('eleusis') === 'eleusis' && turnos < 12) {
      c.passarTurno();
      turnos++;
      const cerco = c.cercoEm('eleusis');
      if (cerco) passos.push(cerco.progresso);
    }

    expect(turnos).toBeGreaterThan(1); // a cidade não abriu no primeiro turno
    // Monotônico: cada turno aperta mais que o anterior, e o progresso não reinicia.
    for (let i = 1; i < passos.length; i++) {
      expect(passos[i]).toBeGreaterThan(passos[i - 1] ?? 0);
    }
    expect(c.donoDe('eleusis')).toBe('atenas');
    expect(c.cercoEm('eleusis')).toBeUndefined();
    // A cidade abriu os portões: não houve assalto, e o sitiante saiu inteiro.
    expect(c.forcaEm('eleusis')).toBe(400);
  });

  it('exército maior toma mais depressa: é por isso que se traz o exército todo', () => {
    const turnosPara = (homens: number): number => {
      const c = contraEleusis(homens);
      c.ordenarMarcha('atenas', 'eleusis', homens, 'atenas');
      let turnos = 0;
      while (c.donoDe('eleusis') === 'eleusis' && turnos < 40) {
        c.passarTurno();
        turnos++;
      }
      return turnos;
    };
    expect(turnosPara(600)).toBeLessThan(turnosPara(200));
  });

  it('o sitiante que vai embora solta a cidade, e o progresso não fica guardado', () => {
    const c = contraEleusis(300);
    c.ordenarMarcha('atenas', 'eleusis', 300, 'atenas');
    c.passarTurno();
    expect(c.cercoEm('eleusis')?.progresso).toBeGreaterThan(0);

    c.ordenarMarcha('eleusis', 'atenas', 300, 'atenas');
    c.passarTurno();

    // Levantar o cerco é consequência de sair, não regra separada.
    expect(c.cercoEm('eleusis')).toBeUndefined();
    expect(c.donoDe('eleusis')).toBe('eleusis');
  });

  it('a postura troca no meio do cerco: sentar hoje e ir pra cima amanhã', () => {
    // 400 homens passam por cima da muralha num assalto e NÃO abrem a cidade num turno de
    // cerco: é a faixa em que trocar de postura muda o resultado.
    const c = contraEleusis(400);
    c.ordenarMarcha('atenas', 'eleusis', 400, 'atenas');
    c.passarTurno();
    expect(c.cercoEm('eleusis')?.postura).toBe('sitiar');

    c.mudarPostura('eleusis', 'assaltar');
    c.passarTurno();

    expect(c.donoDe('eleusis')).toBe('atenas');
    expect(c.rodada.batalhas[0]).toMatchObject({ provincia: 'eleusis', vencedor: 'atenas' });
  });
});

describe('a cidade sitiada perde o campo e a estrada, nunca o imposto', () => {
  it('produção e comércio zeram; o imposto continua inteiro', () => {
    const c = contraEleusis(300);
    const antes = c.economiaDe('eleusis');
    c.ordenarMarcha('atenas', 'eleusis', 300, 'atenas');
    c.passarTurno();

    expect(c.cercoEm('eleusis')).toBeDefined();
    const durante = c.economiaDe('eleusis');
    expect(durante?.producao).toBe(0);
    expect(durante?.comercio).toBe(0);
    // O imposto FICA. Cortá-lo deixaria sem saída quem tem uma província só — que é a
    // situação de 120 dos 148 poderes. Sitiado e sem dinheiro é derrota anunciada, não
    // decisão.
    expect(durante?.impostos).toBeGreaterThan(0);
    expect(durante?.total).toBeLessThan(antes?.total ?? 0);
  });

  it('quem está sitiado ainda pode levantar tropa para revidar', () => {
    const c = contraEleusis(300);
    c.ordenarMarcha('atenas', 'eleusis', 300, 'atenas');
    c.passarTurno();
    expect(c.cercoEm('eleusis')).toBeDefined();
    // Não existe regra barrando recrutamento em cidade sitiada, e isso é deliberado.
    expect(c.disponivelParaLevaEm('eleusis')).toBeGreaterThan(0);
  });

  it('levantado o cerco, a economia volta inteira', () => {
    const c = contraEleusis(300);
    const antes = c.economiaDe('eleusis')?.total ?? 0;
    c.ordenarMarcha('atenas', 'eleusis', 300, 'atenas');
    c.passarTurno();
    c.ordenarMarcha('eleusis', 'atenas', 300, 'atenas');
    c.passarTurno();
    expect(c.economiaDe('eleusis')?.total).toBeGreaterThanOrEqual(antes);
  });
});
