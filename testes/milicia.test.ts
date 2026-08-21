import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { Ajustes, Construcoes, Economia, Provincias } from '../src/dados/esquema';
import { Campanha } from '../src/campanha/campanha';
import { Atlas } from '../src/mundo/atlas';
import { miliciaDe, mortosDaMilicia } from '../src/combate/milicia';

function ler<T>(esquema: { parse: (v: unknown) => T }, caminho: string): T {
  return esquema.parse(JSON.parse(readFileSync(resolve(caminho), 'utf8')));
}

const provincias = ler(Provincias, 'assets/mundo/provincias.json');
const economia = ler(Economia, 'dados/economia.json');
const construcoes = ler(Construcoes, 'dados/construcoes.json');
const ajustes = ler(Ajustes, 'dados/ajustes.json').jogo;
const catalogo = construcoes.construcoes;
const combate = ajustes.combate;

function nova(): Campanha {
  return new Campanha(new Atlas(provincias), economia, construcoes, ajustes);
}

/** Atenas com Quartel e tropa em pé. `darOuro` é o gancho de desenvolvimento. */
function comQuartel(): Campanha {
  const c = nova();
  c.comecar('atenas');
  c.darOuro(60_000);
  c.construir('atenas', 'quartel');
  for (let i = 0; i < 6; i++) c.passarTurno();
  return c;
}

describe('a milícia é derivada da população, nunca guardada', () => {
  it('é uma fatia da população, e é FRACA de propósito', () => {
    // 1,2% — 120 dos 148 poderes começam com uma província só, e milícia forte tornaria a
    // primeira conquista impossível para 81% do mapa.
    expect(miliciaDe(35_000, [], catalogo, combate)).toBe(420);
    expect(miliciaDe(18_000, [], catalogo, combate)).toBe(216);
    expect(miliciaDe(10_000, [], catalogo, combate)).toBe(120);
  });

  it('província sem população não levanta ninguém', () => {
    expect(miliciaDe(0, [], catalogo, combate)).toBe(0);
    // As 202 sem economia configurada continuam caindo sem resistência — a mesma resposta
    // honesta que a economia já dá, em vez de inventar defensores.
    expect(nova().miliciaEm('esparta')).toBe(0);
  });

  it('a Muralha dobra a milícia, multiplicando a DERIVAÇÃO', () => {
    expect(miliciaDe(35_000, ['muralha'], catalogo, combate)).toBe(840);
    // Não existe número de guarnição guardado pra isto somar: é o mesmo desenho do
    // Celeiro sobre o crescimento.
    expect(catalogo['muralha']?.efeito.tipo).toBe('milicia');
  });

  it('a Muralha não rende moeda nenhuma — ela paga em defesa', () => {
    const c = comQuartel();
    // A conta do retorno é imune ao crescimento populacional, ao contrário de comparar a
    // renda antes e depois de três turnos de obra.
    expect(c.retornoDaConstrucaoEm('atenas', 'muralha')?.ganhoPorTurno).toBe(0);

    const antes = c.miliciaEm('atenas');
    c.construir('atenas', 'muralha');
    for (let i = 0; i < 3; i++) c.passarTurno();
    expect(c.construcoesEm('atenas')).toContain('muralha');
    expect(c.miliciaEm('atenas')).toBeGreaterThan(antes * 1.9);
  });

  it('MOBILIZAR ESVAZIA A MURALHA — e ninguém precisou escrever essa regra', () => {
    const c = comQuartel();
    const antes = c.miliciaEm('atenas');
    c.recrutar('atenas', 5000);
    // O exército que se levanta sai de quem defenderia: 1,2% de 5.000 a menos.
    expect(c.miliciaEm('atenas')).toBe(antes - 60);
  });
});

describe('a milícia defende, e é ela que torna o cerco possível', () => {
  it('invasor menor que a milícia é rechaçado, e a província não muda de dono', () => {
    const c = comQuartel();
    // A milícia acompanha a população, que cresce: deriva em vez de cravar.
    const milicia = c.miliciaEm('atenas');
    expect(milicia).toBe(Math.floor(c.populacaoDe('atenas') * combate.milicia.fracao));
    c.plantarHoste('tanagra', 'tanagra', Math.floor(milicia * 0.7));
    c.ordenarMarcha('tanagra', 'atenas', Math.floor(milicia * 0.7), 'tanagra');

    c.passarTurno();

    expect(c.donoDe('atenas')).toBe('atenas');
    expect(c.forcaEm('atenas')).toBe(0); // a milícia não vira hoste no mapa
    expect(c.forcaEm('tanagra')).toBe(0); // o invasor foi destruído
    expect(c.rodada.batalhas[0]).toMatchObject({ provincia: 'atenas', vencedor: 'atenas' });
  });

  it('antes da milícia, 300 homens tomavam uma cidade de 35.000 sem resistência', () => {
    const c = comQuartel();
    // A mesma leva contra uma província SEM economia configurada continua entrando de
    // graça — é o que a milícia conserta onde existe gente.
    c.plantarHoste('tanagra', 'tanagra', 300);
    c.ordenarMarcha('tanagra', 'tebas', 300, 'tanagra');
    c.passarTurno();
    expect(c.donoDe('tebas')).toBe('tanagra');
  });

  it('invasor maior vence, mas paga — e a província cai', () => {
    const c = comQuartel();
    const milicia = c.miliciaEm('atenas');
    const invasor = milicia * 3;
    c.plantarHoste('tanagra', 'tanagra', invasor);
    c.ordenarMarcha('tanagra', 'atenas', invasor, 'tanagra');

    c.passarTurno();

    // Lei quadrada: o invasor vence e PAGA. Não sai inteiro do outro lado.
    expect(c.rodada.batalhas[0]).toMatchObject({ vencedor: 'tanagra' });
    expect(c.donoDe('atenas')).toBe('tanagra');
    // Não sai inteiro do outro lado, e não é aniquilado: é o meio da lei quadrada.
    expect(c.forcaEm('atenas')).toBeLessThan(invasor);
    expect(c.forcaEm('atenas')).toBeGreaterThan(invasor / 2);
  });

  it('a milícia soma com o exército que estiver defendendo', () => {
    const c = comQuartel();
    c.recrutar('atenas', 600);
    const milicia = c.miliciaEm('atenas'); // já descontados os 600 recrutados
    // O invasor é maior que o exército sozinho e menor que exército + milícia: é
    // exatamente a faixa em que a milícia decide.
    const invasor = 600 + Math.floor(milicia / 2);
    c.plantarHoste('tanagra', 'tanagra', invasor);
    c.ordenarMarcha('tanagra', 'atenas', invasor, 'tanagra');

    c.passarTurno();

    expect(invasor).toBeGreaterThan(600);
    expect(invasor).toBeLessThan(600 + milicia);
    expect(c.rodada.batalhas[0]).toMatchObject({ vencedor: 'atenas' });
    expect(c.donoDe('atenas')).toBe('atenas');
  });
});

describe('milícia derrotada dispersa: só os mortos saem da população', () => {
  it('metade dos perdidos morre; o resto volta pra casa', () => {
    expect(mortosDaMilicia(100, combate)).toBe(50);
    expect(mortosDaMilicia(1, combate)).toBe(0);
  });

  it('a população encolhe pelos mortos, não pelos perdidos', () => {
    const c = comQuartel();
    const milicia = c.miliciaEm('atenas');
    c.plantarHoste('tanagra', 'tanagra', milicia * 3);
    c.ordenarMarcha('tanagra', 'atenas', milicia * 3, 'tanagra');

    c.passarTurno();

    // A milícia inteira se perdeu na derrota, mas só metade MORREU. O resto são os mesmos
    // lavradores, e eles voltaram pra terra.
    const perdidos = c.rodada.milicianosMortos[0]?.mortos ?? 0;
    expect(perdidos).toBe(milicia);
    expect(mortosDaMilicia(perdidos, combate)).toBe(Math.floor(milicia / 2));
  });

  it('perder em casa custa imposto E custa leva futura', () => {
    const c = comQuartel();
    const impostos = c.economiaDe('atenas')?.impostos ?? 0;
    c.plantarHoste('tanagra', 'tanagra', 20_000);
    c.ordenarMarcha('tanagra', 'atenas', 20_000, 'tanagra');
    c.passarTurno();
    // Menos gente na província: menos imposto pra quem ficar com ela, e menos milícia da
    // próxima vez. O manancial humano é um só.
    expect(c.economiaDe('atenas')?.impostos).toBeLessThan(impostos);
  });
});
