import { describe, expect, it } from 'vitest';

import { ajustes, novaCampanhaFarta } from '../apoio/mundo';
import { ordenar } from '../apoio/hostes';

/**
 * A DEMOLIÇÃO: os quatro slots deixam de ser um beco sem saída.
 *
 * ⚠️ **Nasceu de uma medição, e não de uma vontade.** No turno 60, em 23 das 25 províncias que
 * ofertavam a Armaria, os quatro slots já estavam cheios — a IA os enche cedo com o que rende
 * ouro, que é a decisão certa no começo, e depois não há mais onde pôr nada. Nenhum reino do
 * mapa erguia uma obra de arma em 150 turnos, e o exército de toda a Grécia era lança leve
 * para sempre. Henrique escolheu a saída: deixar derrubar.
 */
describe('derrubar uma construção', () => {
  const slots = ajustes.construcoes.slotsPorProvincia;

  /** Enche os quatro slots de Atenas, do jeito mais curto que o jogo permite. */
  function comOsSlotsCheios(): ReturnType<typeof novaCampanhaFarta> {
    const c = novaCampanhaFarta();
    c.comecar('atenas');
    c.darOuro(900_000);
    for (const obra of ['agora', 'mercado', 'templo', 'muralha']) {
      c.construir('atenas', obra);
      for (let i = 0; i < 5; i++) c.passarTurno();
    }
    return c;
  }

  it('o slot volta a ficar livre, e a obra some por inteiro', () => {
    const c = comOsSlotsCheios();
    expect(c.construcoesEm('atenas').length).toBe(slots);
    expect(c.podeConstruir('atenas', 'fazenda').pode).toBe(false);

    c.demolir('atenas', 'muralha');

    expect(c.nivelDaConstrucaoEm('atenas', 'muralha')).toBe(0);
    expect(c.construcoesEm('atenas').length).toBe(slots - 1);
    expect(c.podeConstruir('atenas', 'fazenda').pode).toBe(true);
  });

  it('⚠️ NÃO devolve moeda nenhuma: erguer e derrubar não pode virar torneira', () => {
    // Com reembolso, o jogador ergueria a obra do turno, colheria o efeito e desfaria a
    // compra. O que se perde ao derrubar é tudo o que se pagou — e é esse peso que mantém
    // "qual dos quatro?" sendo uma decisão de verdade.
    const c = comOsSlotsCheios();
    const antes = c.tesouro;
    c.demolir('atenas', 'templo');
    expect(c.tesouro).toBe(antes);
  });

  it('a obra EM ANDAMENTO da mesma construção cai junto', () => {
    // Subir o nível de um prédio que não existe mais entregaria um andar sem casa embaixo.
    const c = comOsSlotsCheios();
    c.construir('atenas', 'agora');
    expect(c.obraEm('atenas')).toBeDefined();
    c.demolir('atenas', 'agora');
    expect(c.obraEm('atenas')).toBeUndefined();
    expect(c.nivelDaConstrucaoEm('atenas', 'agora')).toBe(0);
  });

  it('cidade sitiada não derruba nada', () => {
    const c = comOsSlotsCheios();
    c.plantarHoste('tanagra', 'tanagra', 500);
    ordenar(c, 'tanagra', 'atenas', 500, 'tanagra', 'sitiar');
    c.passarTurno();
    expect(c.cercoEm('atenas')).toBeDefined();
    const r = c.podeDemolir('atenas', 'muralha');
    expect(r.pode).toBe(false);
    expect(r.pode === false && r.motivo).toContain('sitiada');
  });

  it('terra alheia não se derruba, e o que não existe também não', () => {
    const c = comOsSlotsCheios();
    expect(c.podeDemolir('megara', 'agora').pode).toBe(false);
    expect(c.podeDemolir('atenas', 'fazenda').pode).toBe(false);
  });
});
