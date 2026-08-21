import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { Ajustes, Construcoes, Economia, Exercitos, Provincias } from '../src/dados/esquema';
import { Campanha } from '../src/campanha/campanha';
import { Atlas } from '../src/mundo/atlas';
import { defesaNoAssalto, milicianosPerdidos } from '../src/combate/cerco';

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

describe('a conta do assalto', () => {
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

describe('SITIAR NUNCA TOMA A CIDADE — quem toma é o assalto', () => {
  it('o exército acampa e fica, turno após turno, sem nada acontecer', () => {
    const c = contraEleusis(3000);
    c.ordenarMarcha('atenas', 'eleusis', 3000, 'atenas');

    // 3.000 homens contra 141 milicianos: passariam por cima num assalto. Sitiando, não
    // tomam nunca — e é essa separação que dá sentido a haver duas posturas.
    for (let i = 0; i < 15; i++) c.passarTurno();

    expect(c.donoDe('eleusis')).toBe('eleusis');
    expect(c.cercoEm('eleusis')).toMatchObject({ sitiante: 'atenas', postura: 'sitiar' });
    expect(c.forcaEm('eleusis')).toBe(3000); // ninguém morreu: cerco não é batalha
    expect(c.rodada.batalhas).toEqual([]);
  });

  it('o sitiante que vai embora solta a cidade', () => {
    const c = contraEleusis(300);
    c.ordenarMarcha('atenas', 'eleusis', 300, 'atenas');
    c.passarTurno();
    expect(c.cercoEm('eleusis')).toBeDefined();

    c.ordenarMarcha('eleusis', 'atenas', 300, 'atenas');
    c.passarTurno();

    // Levantar o cerco é consequência de sair, não regra separada.
    expect(c.cercoEm('eleusis')).toBeUndefined();
    expect(c.donoDe('eleusis')).toBe('eleusis');
  });

  it('sentar hoje e ir pra cima amanhã: é o assalto que abre os portões', () => {
    const c = contraEleusis(400);
    c.ordenarMarcha('atenas', 'eleusis', 400, 'atenas');
    c.passarTurno();
    expect(c.cercoEm('eleusis')?.postura).toBe('sitiar');
    expect(c.donoDe('eleusis')).toBe('eleusis');

    c.mudarPostura('eleusis', 'assaltar');
    c.passarTurno();

    expect(c.donoDe('eleusis')).toBe('atenas');
    expect(c.rodada.batalhas[0]).toMatchObject({ provincia: 'eleusis', vencedor: 'atenas' });
  });

  it('província alheia VAZIA continua caindo ao primeiro pisão, mesmo sitiando', () => {
    const c = nova();
    c.comecar('atenas');
    c.darOuro(200_000);
    // Tebas não tem economia configurada, logo não tem população nem milícia. Chegar a
    // ela exige uma base vizinha: a Ática só faz fronteira com Elêusis e Tanagra.
    c.trocarDono('tanagra', 'atenas');
    c.plantarHoste('tanagra', 'atenas', 300);
    c.ordenarMarcha('tanagra', 'tebas', 300, 'atenas');
    c.passarTurno();
    // Sem gente não há quem feche portão nenhum, e não há cerco a fazer.
    expect(c.donoDe('tebas')).toBe('atenas');
    expect(c.cercoEm('tebas')).toBeUndefined();
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
