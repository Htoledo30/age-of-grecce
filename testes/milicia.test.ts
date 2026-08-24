import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { Ajustes, Construcoes, Economia, Exercitos, Provincias } from '../src/dados/esquema';
import { Campanha } from '../src/campanha/campanha';
import { Atlas } from '../src/mundo/atlas';
import { miliciaDe, mortosDaMilicia } from '../src/combate/milicia';
import { ordenar } from './apoio/hostes';

function ler<T>(esquema: { parse: (v: unknown) => T }, caminho: string): T {
  return esquema.parse(JSON.parse(readFileSync(resolve(caminho), 'utf8')));
}

const provincias = ler(Provincias, 'assets/mundo/provincias.json');
const economia = ler(Economia, 'dados/economia.json');
const construcoes = ler(Construcoes, 'dados/construcoes.json');
const exercitos = ler(Exercitos, 'dados/exercitos.json');
const ajustes = ler(Ajustes, 'dados/ajustes.json').jogo;
const catalogo = construcoes.construcoes;
const combate = ajustes.combate;

function nova(): Campanha {
  return new Campanha(new Atlas(provincias), economia, construcoes, ajustes, exercitos);
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
    expect(miliciaDe(35_000, {}, catalogo, combate)).toBe(420);
    expect(miliciaDe(18_000, {}, catalogo, combate)).toBe(216);
    expect(miliciaDe(10_000, {}, catalogo, combate)).toBe(120);
  });

  it('província sem população não levanta ninguém', () => {
    expect(miliciaDe(0, {}, catalogo, combate)).toBe(0);
    // As 202 sem economia configurada continuam caindo sem resistência — a mesma resposta
    // honesta que a economia já dá, em vez de inventar defensores.
    expect(nova().miliciaEm('esparta')).toBe(0);
  });

  it('a Muralha dobra a milícia, multiplicando a DERIVAÇÃO', () => {
    expect(miliciaDe(35_000, { muralha: 1 }, catalogo, combate)).toBe(840);
    // Não existe número de guarnição guardado pra isto somar: é o mesmo desenho do
    // Celeiro sobre o crescimento.
    expect(catalogo['muralha']?.efeito.tipo).toBe('milicia');
  });

  it('a Muralha não rende moeda nenhuma — ela paga em defesa', () => {
    const c = comQuartel();
    // A conta do retorno é imune ao crescimento populacional, ao contrário de comparar a
    // renda antes e depois de três turnos de obra. Não rende NADA: o ganho é exatamente a
    // manutenção negativa, sem renda escondida.
    expect(c.retornoDaConstrucaoEm('atenas', 'muralha')?.ganhoPorTurno).toBe(
      -construcoes.construcoes['muralha']!.manutencao[0],
    );

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

describe('a milícia segura a CIDADE, e não sai a campo', () => {
  it('quem chega sem dizer nada SENTA: a província não troca de dono no mesmo turno', () => {
    const c = comQuartel();
    // ⚠️ A mudança de fundo do cerco. Antes, sobrar de pé numa província alheia era ser
    // dono dela. Agora é ficar com o CAMPO — a cidade continua sendo um problema.
    const milicia = c.miliciaEm('atenas');
    expect(milicia).toBe(Math.floor(c.populacaoDe('atenas') * combate.milicia.fracao));
    // Gente o bastante pra vencer a milícia num assalto, e pouca demais pra abrir a
    // cidade num turno só de cerco: é a faixa em que a escolha de postura decide.
    c.plantarHoste('tanagra', 'tanagra', 800);
    ordenar(c, 'tanagra', 'atenas', 800, 'tanagra');

    c.passarTurno();

    expect(c.donoDe('atenas')).toBe('atenas');
    // O INVASOR, não o dono: `forcaEm` sem poder pergunta pelo dono da terra. Ele está
    // lá, inteiro, sentado.
    expect(c.forcaEm('atenas', 'tanagra')).toBe(800);
    expect(c.cercoEm('atenas')).toMatchObject({ sitiante: 'tanagra', postura: 'sitiar' });
    // Sitiar não é batalha: ninguém morreu.
    expect(c.rodada.batalhas).toEqual([]);
  });

  it('província SEM gente continua caindo ao primeiro pisão', () => {
    const c = comQuartel();
    // Sem população não há quem feche portão nenhum. É fronteira desprotegida, e é o que
    // as 180 sem economia configurada continuam sendo. Delfos é a vizinha vazia da
    // região: Queroneia (de Orcomeno) faz fronteira com ela.
    c.plantarHoste('queroneia', 'orcomeno', 300);
    ordenar(c, 'queroneia', 'delfos', 300, 'orcomeno');
    c.passarTurno();
    expect(c.donoDe('delfos')).toBe('orcomeno');
    expect(c.cercoEm('delfos')).toBeUndefined();
  });

  it('assalto menor que a muralha é rechaçado, e o exército se desfaz nela', () => {
    const c = comQuartel();
    const milicia = c.miliciaEm('atenas');
    const invasor = Math.floor(milicia * 1.5); // maior que a milícia, menor que a muralha
    expect(invasor).toBeLessThan(milicia * combate.cerco.bonusDeMuralha);
    c.plantarHoste('tanagra', 'tanagra', invasor);
    ordenar(c, 'tanagra', 'atenas', invasor, 'tanagra', 'assaltar');

    c.passarTurno();

    expect(c.donoDe('atenas')).toBe('atenas');
    expect(c.forcaEm('atenas')).toBe(0); // o assalto se desfez diante da muralha
    expect(c.rodada.batalhas[0]).toMatchObject({ provincia: 'atenas', vencedor: 'atenas' });
  });

  it('assalto maior que a muralha entra, mas paga caro', () => {
    const c = comQuartel();
    const milicia = c.miliciaEm('atenas');
    const invasor = milicia * 3;
    expect(invasor).toBeGreaterThan(milicia * combate.cerco.bonusDeMuralha);
    c.plantarHoste('tanagra', 'tanagra', invasor);
    ordenar(c, 'tanagra', 'atenas', invasor, 'tanagra', 'assaltar');

    c.passarTurno();

    expect(c.rodada.batalhas[0]).toMatchObject({ vencedor: 'tanagra' });
    expect(c.donoDe('atenas')).toBe('tanagra');
    // Lei quadrada: não sai inteiro do outro lado, e não é aniquilado.
    expect(c.forcaEm('atenas')).toBeLessThan(invasor);
    expect(c.forcaEm('atenas')).toBeGreaterThan(invasor / 2);
  });

  it('o exército defende o CAMPO e a milícia a CIDADE: são dois choques em sequência', () => {
    const c = comQuartel();
    c.recrutar('atenas', 600);
    c.passarTurno(); // ⚠️ a leva leva uma rodada pra virar hoste: ver formacao-de-leva.ts
    expect(c.forcaEm('atenas')).toBe(600);
    const milicia = c.miliciaEm('atenas');
    // O invasor é maior que o exército de campo e — depois de pagar por essa vitória —
    // menor que a muralha. Ganha o campo e perde a cidade, que é a faixa nova que o cerco
    // criou e que antes não existia.
    const invasor = 700;
    c.plantarHoste('tanagra', 'tanagra', invasor);
    ordenar(c, 'tanagra', 'atenas', invasor, 'tanagra', 'assaltar');

    c.passarTurno();

    const sobrouDoCampo = Math.round(Math.sqrt(invasor * invasor - 600 * 600));
    expect(sobrouDoCampo).toBeGreaterThan(0);
    expect(sobrouDoCampo).toBeLessThan(milicia * combate.cerco.bonusDeMuralha);
    expect(c.donoDe('atenas')).toBe('atenas');
    // Duas batalhas na mesma província e no mesmo turno: o campo e a muralha.
    expect(c.rodada.batalhas).toHaveLength(2);
    expect(c.rodada.batalhas[0]).toMatchObject({ vencedor: 'tanagra' });
    expect(c.rodada.batalhas[1]).toMatchObject({ vencedor: 'atenas' });
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
    ordenar(c, 'tanagra', 'atenas', milicia * 3, 'tanagra', 'assaltar');

    c.passarTurno();

    // A milícia inteira se perdeu na derrota, mas só metade MORREU. O resto são os mesmos
    // lavradores, e eles voltaram pra terra.
    const perdidos = c.rodada.milicianosMortos[0]?.mortos ?? 0;
    expect(perdidos).toBe(milicia);
    expect(mortosDaMilicia(perdidos, combate)).toBe(Math.floor(milicia / 2));
  });

  it('perder em casa custa imposto E custa leva futura', () => {
    // Contra um controle que só passou o turno, e não contra o número de antes: a
    // população cresce na virada, e o crescimento sozinho esconderia a perda.
    const controle = comQuartel();
    controle.passarTurno();

    const c = comQuartel();
    c.plantarHoste('tanagra', 'tanagra', 20_000);
    ordenar(c, 'tanagra', 'atenas', 20_000, 'tanagra', 'assaltar');
    c.passarTurno();

    // Menos gente na província: menos imposto pra quem ficar com ela, e menos milícia da
    // próxima vez. O manancial humano é um só.
    expect(c.populacaoDe('atenas')).toBeLessThan(controle.populacaoDe('atenas'));
    expect(c.miliciaEm('atenas')).toBeLessThan(controle.miliciaEm('atenas'));
  });
});
