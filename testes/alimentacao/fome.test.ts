import { describe, expect, it } from 'vitest';

import { lerSalvamento } from '../../src/campanha/salvamento';
import { custoMilitar, mortosPelaFome } from '../../src/producao/alimentacao';
import { ajustes } from '../apoio/mundo';
import { nova } from './apoio';

describe('a fome: o povo come primeiro, e ela é local', () => {
  it('déficit causado SÓ pelo exército não mata civil nenhum: o povo come primeiro', () => {
    const campanha = nova();
    campanha.darOuro(200_000);
    campanha.plantarHoste('atenas', 'atenas', 4001);
    // Civil fecha (+3); o exército de 5 pontos derruba só o saldo final.
    expect(campanha.alimentacao.saldoCivil).toBeGreaterThanOrEqual(0);
    expect(campanha.alimentacao.saldo).toBeLessThan(0);
    expect(campanha.alimentacao.categoria).toBe('exercito-sem-mantimentos');
    expect(campanha.crescimentoDe('atenas')?.crescimento).toBe(0);
    const povoAntes = campanha.populacaoDe('atenas');
    const tropaAntes = campanha.forcaEm('atenas');

    campanha.passarTurno();

    // Nenhum civil morre; a tropa perde os 5% dela.
    expect(campanha.populacaoDe('atenas')).toBe(povoAntes);
    expect(campanha.fome.provincias).toEqual([]);
    expect(campanha.forcaEm('atenas')).toBe(tropaAntes - Math.floor(tropaAntes * 0.05));
    expect(campanha.fome.tropas).toContainEqual({ poder: 'atenas', homens: 200 });
  });

  it('civil negativo é Fome: morrem as DEPENDENTES, nunca as sustentadoras', () => {
    // O caminho oficial de forjar o cenário: salvar, engordar Atenas, restaurar. Com
    // 90.000 habitantes o nível dela vai a VII e o saldo civil do reino afunda.
    const campanha = nova();
    const salvo = lerSalvamento(campanha.serializar());
    salvo.populacao['atenas'] = 90_000;
    campanha.restaurar(salvo);

    const balanco = campanha.alimentacao;
    expect(balanco.saldoCivil).toBeLessThan(0);
    expect(balanco.categoria).toBe('fome');
    // Atenas (come mais do que planta) depende; Maratona sustenta; Sunião depende.
    expect(campanha.estadoAlimentarLocalEm('atenas')).toBe('dependente');
    expect(campanha.estadoAlimentarLocalEm('maratona')).toBe('sustentadora');
    expect(campanha.estadoAlimentarLocalEm('sounion')).toBe('dependente');

    const atenas = campanha.populacaoDe('atenas');
    const maratona = campanha.populacaoDe('maratona');
    const sounion = campanha.populacaoDe('sounion');
    campanha.passarTurno();

    expect(campanha.populacaoDe('atenas')).toBe(
      atenas - mortosPelaFome(atenas, ajustes.alimento.mortePorFome),
    );
    expect(campanha.populacaoDe('sounion')).toBe(
      sounion - mortosPelaFome(sounion, ajustes.alimento.mortePorFome),
    );
    // Quem planta pra dois não morre porque o vizinho não planta pra um.
    expect(campanha.populacaoDe('maratona')).toBe(maratona);
  });

  it('a leva em formação já come, e a fome a alcança antes de ela virar hoste', () => {
    // ⚠️ É a brecha que a regra fecha: se a leva só contasse ao virar hoste, recrutar na
    // véspera da fome sairia de graça por um turno inteiro.
    const campanha = nova();
    campanha.darOuro(20_000);
    campanha.recrutar('atenas', 4001);

    // Ainda não é hoste — mas já pesa no balanço.
    expect(campanha.forcaEm('atenas')).toBe(0);
    expect(campanha.alimentacao.exercito).toBe(
      custoMilitar(4001, ajustes.alimento.soldadosPorPonto),
    );
    expect(campanha.alimentacao.saldo).toBeLessThan(0);

    campanha.passarTurno();

    const perdidos = mortosPelaFome(4001, ajustes.alimento.mortePorFomeNaTropa);
    expect(perdidos).toBeGreaterThan(0);
    expect(campanha.fome.tropas).toContainEqual({ poder: 'atenas', homens: perdidos });
    // A leva concluiu já desfalcada: a fome cobrou dela, não da população.
    expect(campanha.forcaEm('atenas')).toBe(4001 - perdidos);
  });

  it('a fome reparte as baixas proporcionalmente entre as hostes do poder', () => {
    const campanha = nova();
    campanha.darOuro(200_000);
    campanha.plantarHoste('atenas', 'atenas', 3000);
    campanha.plantarHoste('maratona', 'atenas', 1000);
    expect(campanha.alimentacao.saldo).toBeLessThan(0);

    campanha.passarTurno();

    const total = mortosPelaFome(4000, ajustes.alimento.mortePorFomeNaTropa);
    expect(campanha.fome.tropas).toContainEqual({ poder: 'atenas', homens: total });
    // Cada hoste perde a sua fatia proporcional (a menos do resto do arredondamento):
    // a grande não blinda a pequena nem o contrário, e a soma fecha exata.
    const perdaGrande = 3000 - campanha.forcaEm('atenas');
    const perdaPequena = 1000 - campanha.forcaEm('maratona', 'atenas');
    expect(perdaGrande + perdaPequena).toBe(total);
    expect(perdaGrande).toBeGreaterThanOrEqual(Math.floor((3000 * total) / 4000));
    expect(perdaGrande).toBeLessThanOrEqual(Math.floor((3000 * total) / 4000) + 1);
    expect(perdaPequena).toBeGreaterThanOrEqual(Math.floor((1000 * total) / 4000));
    expect(perdaPequena).toBeLessThanOrEqual(Math.floor((1000 * total) / 4000) + 1);
  });

});
