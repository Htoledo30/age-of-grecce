/**
 * A NACIONALIDADE no humor: quão estranho é o rei ao povo desta terra.
 *
 * A última da lista de Henrique, adiada por ele lá atrás. O que ela substituiu era binário e
 * cego — *"o dono de hoje é o mesmo de 700 a.C.?"* —, e dava o mesmo peso para Atenas mandando
 * em Elêusis, jônia e vizinha, e para Atenas mandando na Beócia.
 *
 * ⚠️ **Nenhum número de balanço aqui.** O que se prende é a ORDEM dos três degraus — o meu
 * povo é de graça, outra cidade da minha tribo incomoda, outra tribo custa — e o fato de a
 * conta ser proporcional à fatia do povo. Se os pontos dobrarem no JSON, nada aqui pisca.
 */

import { describe, expect, it } from 'vitest';

import { novaCampanha } from './apoio/mundo';

const nova = (): ReturnType<typeof novaCampanha> => {
  const c = novaCampanha();
  c.comecar('atenas');
  return c;
};

describe('o povo da terra decide o quanto o rei é estranho ali', () => {
  it('mandar no próprio povo não custa nada', () => {
    const c = nova();
    // Maratona é 100% ateniense e Atenas é ateniense: nenhuma estranheza.
    expect(c.donoDe('maratona')).toBe('atenas');
    expect(c.estranhezaEm('maratona')).toEqual({ mesmoPovo: 0, outroPovo: 0 });
    expect(c.povoEstranhoManda('maratona')).toBe(false);
  });

  it('outra cidade da MESMA tribo incomoda; outra tribo custa mais', () => {
    const c = nova();
    // Elêusis é 85% eleusina — jônia como Atenas. Mégara é 100% megarense, dória.
    c.trocarDono('eleusis', 'atenas');
    c.trocarDono('megara', 'atenas');
    const perto = c.estranhezaEm('eleusis');
    const longe = c.estranhezaEm('megara');
    expect(perto).toEqual({ mesmoPovo: 0.85, outroPovo: 0 });
    expect(longe).toEqual({ mesmoPovo: 0, outroPovo: 1 });

    // ⚠️ É a ORDEM que importa, e não os pontos: a cidade jônia tem de doer MENOS que a dória.
    const pesoPerto = c.alvoDeFelicidadeEm('eleusis');
    const pesoLonge = c.alvoDeFelicidadeEm('megara');
    expect(pesoLonge).toBeLessThan(pesoPerto);
  });

  it('a conta é PROPORCIONAL: a mesma terra cobra preços diferentes de donos diferentes', () => {
    // Salamina é 80% megarense e 20% ateniense. Mégara paga pelo quinto ateniense; Atenas
    // paga pelos quatro quintos megarenses.
    const c = nova();
    expect(c.donoDe('salamina')).toBe('megara');
    const comMegara = c.estranhezaEm('salamina');
    c.trocarDono('salamina', 'atenas');
    const comAtenas = c.estranhezaEm('salamina');
    expect(comMegara.mesmoPovo + comMegara.outroPovo).toBeCloseTo(0.2, 6);
    expect(comAtenas.mesmoPovo + comAtenas.outroPovo).toBeCloseTo(0.8, 6);
    expect(c.alvoDeFelicidadeEm('salamina')).toBeLessThan(60);
  });

  it('quem levanta é a terra cuja MAIORIA não reconhece o dono', () => {
    const c = nova();
    // Um quinto ateniense não põe Salamina em armas contra Mégara.
    expect(c.povoEstranhoManda('salamina')).toBe(false);
    c.trocarDono('salamina', 'atenas');
    expect(c.povoEstranhoManda('salamina')).toBe(true);
  });

  it('sem ficha não há povo, e sem povo não há resposta inventada', () => {
    const c = nova();
    const semFicha = c.terras().find((id) => c.semEconomia(c.donoDe(id)) > 0);
    expect(semFicha).toBeDefined();
    expect(c.estranhezaEm(semFicha!)).toEqual({ mesmoPovo: 0, outroPovo: 0 });
  });

  it('a ficha mostra a conta com a FATIA no rótulo, e separa as duas', () => {
    const c = nova();
    c.trocarDono('salamina', 'atenas');
    const rotulos = c.parcelasDeFelicidadeEm('salamina').map((p) => p.rotulo);
    expect(rotulos.some((r) => r.startsWith('de outro povo ('))).toBe(true);
  });
});
