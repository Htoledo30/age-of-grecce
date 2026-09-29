/**
 * A TRAVESSIA da IA: ela embarca, e só embarca por onde o jogo deixa.
 *
 * ⚠️ **Nenhum número de balanço mora aqui.** O que estes testes prendem são as RELAÇÕES: sem
 * Porto não há mar; a rota longa existe onde a rota de uma rodada não chega; a expedição some
 * quando a guerra acaba. Se `valorDoMar` dobrar amanhã, nada aqui deve piscar.
 */

import { describe, expect, it } from 'vitest';

import { estiloDe } from '../../src/ia/estilo';
import { retiradasEscolhidas, travessiasEscolhidas } from '../../src/ia/guerra/marchar';
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
    // ⚠️ A ordem é a VIAGEM inteira (desde 29/09 a marcha longa da IA persiste): o destino é a
    // terra do outro lado, e o primeiro trecho — o de hoje — é água.
    const ordem = ordens[0]!;
    const rota = c.rotasLongasDaHoste(ordem.hoste).get(ordem.destino);
    expect(rota).toBeDefined();
    expect(c.ehMar(rota![0]!)).toBe(true);
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

/**
 * O DESEMBARQUE — o último trecho da travessia, e o que faltava para ela terminar.
 *
 * ⚠️ **Medido antes do conserto: 12 embarques e ZERO desembarques em terra alheia em 150
 * turnos.** Todas as doze expedições voltaram para casa. A travessia soltava a hoste quando a
 * rota que faltava passava a ser de um trecho só — o pulo da água para a praia —, e a retirada
 * a pegava no mesmo instante, porque água não é terra inimiga e *"a terra deixou de ser
 * inimiga"* é sempre verdade no mar. Uma expedição de 4.000 homens encostada em Cálcis deu
 * meia-volta e contornou a Eubeia por sete turnos.
 */
describe('a travessia termina: quem chega à água da ilha desembarca nela', () => {
  it('a hoste encostada no alvo recebe o desembarque, e a retirada não a reivindica', () => {
    const c = megaraComPorto();
    const estilo = estiloDe(ia, 'megara');
    // A água que encosta na ilha, tirada do mapa e não de um id escrito à mão.
    const zona = c.vizinhasDe('calcis').find((v) => c.ehMar(v));
    expect(zona).toBeDefined();
    const naAgua = c.plantarHoste(zona!, 'megara', 4000);

    const ordens = travessiasEscolhidas(c, 'megara', estilo, combate, semOrdens);
    const dela = ordens.find((o) => o.hoste === naAgua);
    expect(dela?.destino).toBe('calcis');

    // E a retirada respeita quem a travessia levou: é `ia.ts` quem passa a lista adiante.
    const emViagem = new Set(ordens.map((o) => o.hoste));
    const voltas = retiradasEscolhidas(c, 'megara', combate, emViagem);
    expect(voltas.some((v) => v.hoste === naAgua)).toBe(false);
  });

  it('a viagem inteira é uma ordem só, e a postura é a do desembarque', () => {
    const c = megaraComPorto();
    const estilo = estiloDe(ia, 'megara');
    // Quem parte de Mégara já leva o destino em terra: a postura só vale ao chegar, e a
    // resolução não a aplica no meio do mar (ver `posturasPorDestino`).
    const emCasa = travessiasEscolhidas(c, 'megara', estilo, combate, semOrdens);
    expect(emCasa.length).toBeGreaterThan(0);
    expect(emCasa.every((o) => !c.ehMar(o.destino))).toBe(true);

    // Quem já está na água da ilha decide de verdade — e contra uma praça aberta ela vai.
    const zona = c.vizinhasDe('calcis').find((v) => c.ehMar(v));
    c.plantarHoste(zona!, 'megara', 6000);
    const desembarque = travessiasEscolhidas(c, 'megara', estilo, combate, semOrdens).find(
      (o) => o.destino === 'calcis',
    );
    expect(desembarque?.postura).toBe('assaltar');
  });
});
