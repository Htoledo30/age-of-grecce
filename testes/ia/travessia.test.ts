/**
 * A TRAVESSIA da IA: ela embarca, e só embarca por onde o jogo deixa.
 *
 * ⚠️ **Nenhum número de balanço mora aqui.** O que estes testes prendem são as RELAÇÕES: sem
 * Porto não há mar; a rota longa existe onde a rota de uma rodada não chega; a expedição some
 * quando a guerra acaba. Se `valorDoMar` dobrar amanhã, nada aqui deve piscar.
 */

import { describe, expect, it } from 'vitest';

import { estiloDe } from '../../src/ia/estilo';
import { travessiasEscolhidas } from '../../src/ia/guerra/marchar';
import { oportunidadesDe, oportunidadesNoLitoral } from '../../src/ia/percepcao/oportunidade';
import { ajustes, ia, novaCampanha } from '../apoio/mundo';

const combate = ajustes.combate;
const semOrdens = new Set<string>();

/**
 * Mégara, com Porto de pé, exército em pé e guerra declarada a Cálcis.
 *
 * Cálcis porque ela é da Eubeia: nenhuma terra dela encosta em nenhuma terra de Mégara, e a
 * única maneira de um megarense chegar lá é embarcando. E porque ela tem economia — a IA não
 * marcha sobre poder sem ficha, e Egina, que seria a ilha mais óbvia, é um deles.
 */
function megaraComPorto(): ReturnType<typeof novaCampanha> {
  const c = novaCampanha();
  c.comecar('atenas');
  c.darOuro(90_000, 'megara');
  // Mégara tem ancoradouro real: o Porto cabe lá, e são três viradas até ele ficar de pé.
  c.construir('megara', 'porto', 'megara');
  for (let i = 0; i < 4; i++) c.passarTurno();
  c.plantarHoste('megara', 'megara', 3000);
  if (!c.emGuerra('megara', 'calcis')) c.declararGuerra('calcis', 'megara');
  return c;
}

describe('a IA atravessa o mar — e a porta continua sendo o Porto', () => {
  it('sem Porto ela não zarpa; com Porto ela embarca no primeiro trecho', () => {
    const semPorto = novaCampanha();
    semPorto.comecar('atenas');
    semPorto.plantarHoste('megara', 'megara', 3000);
    if (!semPorto.emGuerra('megara', 'calcis')) semPorto.declararGuerra('calcis', 'megara');
    const estilo = estiloDe(ia, 'megara');
    expect(travessiasEscolhidas(semPorto, 'megara', estilo, combate, semOrdens)).toEqual([]);

    const c = megaraComPorto();
    const ordens = travessiasEscolhidas(c, 'megara', estilo, combate, semOrdens);
    expect(ordens.length).toBeGreaterThan(0);
    // O destino de HOJE é água: a ilha fica a mais de um salto, e a hoste anda um por rodada.
    expect(c.ehMar(ordens[0]!.destino)).toBe(true);
  });

  it('a rota longa chega onde a rota da rodada não chega', () => {
    const c = megaraComPorto();
    const hoste = c.hostes().find((h) => h.poder === 'megara');
    expect(hoste).toBeDefined();
    // A ilha não está no alcance de uma rodada...
    expect(c.alcanceDaHoste(hoste!.id)).not.toContain('calcis');
    // ...e está na rota longa, atravessando água.
    const rota = c.rotasLongasDaHoste(hoste!.id).get('calcis');
    expect(rota).toBeDefined();
    expect(rota!.length).toBeGreaterThan(1);
    expect(rota!.some((id) => c.ehMar(id))).toBe(true);
    expect(rota!.at(-1)).toBe('calcis');
  });

  it('a paz encerra a expedição: sem guerra, não há travessia', () => {
    const c = megaraComPorto();
    const estilo = estiloDe(ia, 'megara');
    expect(travessiasEscolhidas(c, 'megara', estilo, combate, semOrdens).length).toBeGreaterThan(0);
    c.fazerPaz('calcis', 'megara');
    expect(travessiasEscolhidas(c, 'megara', estilo, combate, semOrdens)).toEqual([]);
  });

  it('a percepção do litoral vê a ilha que a vizinhança não vê', () => {
    const c = megaraComPorto();
    const vizinhas = oportunidadesDe(c, 'megara').map((o) => o.provincia);
    const litoral = oportunidadesNoLitoral(c, 'megara').map((o) => o.provincia);
    expect(vizinhas).not.toContain('calcis');
    expect(litoral).toContain('calcis');
    // E o litoral não inventa água: zona marítima não é terra a tomar.
    expect(litoral.some((id) => c.ehMar(id))).toBe(false);
  });
});
