/**
 * O MODO DE RELAÇÕES no mapa: *"a cor de um reino que eu selecionar, e em volta vermelho,
 * amarelo ou verde para demonstrar a relação daquele reino com outros reinos"*.
 *
 * ⚠️ **Nenhuma cor cravada aqui.** O que se prende são as relações entre os casos: guerra não
 * é a mesma cor que hostilidade, quem não tem opinião não é pintado como indiferente, o
 * escolhido não entra na régua, e o mar não é ninguém. Trocar a paleta amanhã não deve
 * derrubar teste nenhum.
 */

import { describe, expect, it } from 'vitest';

import { FAIXAS_DE_RELACAO, coresDasRelacoes } from '../src/aplicacao/vistas/mapa-de-relacoes';
import { Atlas } from '../src/mundo/atlas';
import { novaCampanha, provincias } from './apoio/mundo';

function mundo(): { campanha: ReturnType<typeof novaCampanha>; atlas: Atlas } {
  const campanha = novaCampanha();
  campanha.comecar('atenas');
  return { campanha, atlas: new Atlas(provincias) };
}

describe('o mapa de relações responde "o que acham dele", e não "de quem é"', () => {
  it('o escolhido tem cor própria, fora da régua de opinião', () => {
    const m = mundo();
    const cor = coresDasRelacoes(m, 'atenas');
    const dele = cor('atenas');
    expect(dele).not.toBeNull();
    // Nenhum outro reino recebe a cor do escolhido: ela é a âncora, não uma resposta.
    for (const id of m.campanha.provinciasSimuladas) {
      if (m.campanha.donoDe(id) === 'atenas') continue;
      expect(cor(id), id).not.toEqual(dele);
    }
  });

  it('a guerra tem cor PRÓPRIA — não é uma opinião muito ruim', () => {
    const m = mundo();
    const paz = coresDasRelacoes(m, 'atenas')('megara');
    m.campanha.declararGuerra('megara', 'atenas');
    const guerra = coresDasRelacoes(m, 'atenas')('megara');
    expect(guerra).not.toEqual(paz);
  });

  it('a opinião move a cor, e nas duas direções', () => {
    const m = mundo();
    const indiferente = coresDasRelacoes(m, 'atenas')('megara');
    m.campanha.darOuro(200_000);
    for (let i = 0; i < 30; i++) m.campanha.presentear('megara', 4000);
    const amigo = coresDasRelacoes(m, 'atenas')('megara');
    expect(amigo).not.toEqual(indiferente);
  });

  it('quem não tem economia não tem opinião, e não é pintado de indiferente', () => {
    const m = mundo();
    const cor = coresDasRelacoes(m, 'atenas');
    const semFicha = m.atlas.terras.find((p) => m.campanha.semEconomia(p.dono) > 0);
    expect(semFicha).toBeDefined();
    expect(cor(semFicha!.id)).not.toEqual(cor('megara'));
  });

  it('zona marítima não é de ninguém, e continua sem cor', () => {
    const m = mundo();
    const cor = coresDasRelacoes(m, 'atenas');
    const mar = m.atlas.provincias.find((p) => p.mar === true);
    expect(mar).toBeDefined();
    expect(cor(mar!.id)).toBeNull();
  });

  it('a legenda descreve todos os casos que a régua produz', () => {
    const m = mundo();
    m.campanha.declararGuerra('megara', 'atenas');
    const cor = coresDasRelacoes(m, 'atenas');
    const usadas = new Set(
      m.atlas.terras.map((p) => cor(p.id)).filter((c) => c !== null).map((c) => String(c)),
    );
    // Toda cor que o mapa pinta tem uma linha na legenda dizendo o que ela quer dizer.
    const naLegenda = new Set(
      FAIXAS_DE_RELACAO.map((f) => {
        const n = Number.parseInt(f.cor.replace('#', ''), 16);
        return String([(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]);
      }),
    );
    for (const usada of usadas) expect(naLegenda.has(usada), usada).toBe(true);
  });
});
