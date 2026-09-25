/**
 * O GRÃO COMPRADO — o ouro virando comida.
 *
 * ⚠️ **Nenhum número de balanço mora aqui.** Preço e capacidade vêm dos dados; o que se prende
 * são as relações: sem Porto nem Mercado não entra grão, cada ponto custa mais que o anterior,
 * o que chega soma na conta civil e sai da renda, cais bloqueado não recebe, e quem não pode
 * pagar deixa de receber.
 */

import { describe, expect, it } from 'vitest';

import { Campanha } from '../../src/campanha/campanha';
import { lerSalvamento } from '../../src/campanha/salvamento';
import { Atlas } from '../../src/mundo/atlas';
import {
  ajustes,
  construcoes,
  economia,
  exercitos,
  novaCampanha,
  provincias,
} from '../apoio/mundo';

const preco = ajustes.alimento.importacao.precoPorPonto;
const doPorto = construcoes.construcoes['porto']?.importaGrao?.[0] ?? 0;

/** Mégara com um Porto pronto, jogando como jogadora. */
function megaraComPorto(c: Campanha = novaCampanha()): Campanha {
  c.comecar('megara');
  c.darOuro(100_000, 'megara');
  c.construir('megara', 'porto');
  for (let i = 0; i < 6; i++) c.passarTurno();
  expect(c.temPortoEm('megara')).toBe(true);
  return c;
}

describe('o grão comprado', () => {
  it('o ponto n custa n vezes o preço, então três pontos custam seis', () => {
    const c = novaCampanha();
    expect(c.custoDaImportacao(0)).toBe(0);
    expect(c.custoDaImportacao(1)).toBe(preco);
    expect(c.custoDaImportacao(3)).toBe(6 * preco);
  });

  it('sem Porto nem Mercado não há de quem comprar', () => {
    const c = novaCampanha();
    c.comecar('megara');
    expect(c.capacidadeDeImportacaoDe('megara')).toBe(0);
    expect(c.podeDefinirImportacao(1).pode).toBe(false);
    expect(() => c.definirImportacao(1)).toThrow();
  });

  it('o Porto abre a porta, e o que chega entra na conta civil e sai da renda', () => {
    const c = megaraComPorto();
    expect(doPorto).toBeGreaterThan(0);
    expect(c.capacidadeDeImportacaoDe('megara')).toBeGreaterThanOrEqual(doPorto);

    const antes = c.balancoAlimentarDe('megara');
    const rendaAntes = c.rendaDe('megara');
    c.definirImportacao(1);

    const depois = c.balancoAlimentarDe('megara');
    expect(depois.importacao).toBe(1);
    expect(depois.saldoCivil).toBe(antes.saldoCivil + 1);
    expect(depois.saldo).toBe(antes.saldo + 1);
    expect(c.rendaDe('megara')).toBeCloseTo(rendaAntes - preco, 6);
  });

  it('não se encomenda além do que as obras deixam entrar', () => {
    const c = megaraComPorto();
    const cabe = c.capacidadeDeImportacaoDe('megara');
    expect(c.podeDefinirImportacao(cabe).pode).toBe(true);
    expect(c.podeDefinirImportacao(cabe + 1).pode).toBe(false);
  });

  it('cais bloqueado não recebe, e a encomenda volta a valer quando a frota sai', () => {
    const c = megaraComPorto();
    c.definirImportacao(1);
    const zona = c.vizinhasDe('megara').find((v) => c.ehMar(v))!;
    c.plantarHoste(zona, 'atenas', 800);
    c.declararGuerra('atenas');
    expect(c.bloqueadaEm('megara')).toBe(true);

    // A porta do mar fechou: sem Mercado, nada chega e nada se paga.
    expect(c.importacaoDe('megara')).toBe(0);
    expect(c.balancoAlimentarDe('megara').importacao).toBe(0);
    // Mas a ordem continua de pé.
    expect(c.encomendaDeGraoDe('megara')).toBe(1);
  });

  it('quem não pode pagar deixa de receber antes de a conta fechar', () => {
    const caro = {
      ...ajustes,
      alimento: { ...ajustes.alimento, importacao: { precoPorPonto: 10_000_000 } },
    };
    const c = megaraComPorto(
      new Campanha(new Atlas(provincias), economia, construcoes, caro, exercitos),
    );
    c.definirImportacao(1);
    expect(c.encomendaDeGraoDe('megara')).toBe(1);

    c.passarTurno();
    expect(c.encomendaDeGraoDe('megara')).toBe(0);
    expect(c.tesouroDe('megara')).toBeGreaterThanOrEqual(0);
  });

  it('a encomenda atravessa o salvamento', () => {
    const c = megaraComPorto();
    c.definirImportacao(1);
    const retomada = novaCampanha();
    retomada.restaurar(lerSalvamento(c.serializar()));
    expect(retomada.encomendaDeGraoDe('megara')).toBe(1);
    expect(retomada.importacaoDe('megara')).toBe(1);
  });
});
