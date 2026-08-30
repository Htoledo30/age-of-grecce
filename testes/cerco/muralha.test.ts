import { describe, expect, it } from 'vitest';

import type { Campanha } from '../../src/campanha/campanha';
import { ordenar } from '../apoio/hostes';
import { ajustes, construcoes, novaCampanhaFarta as nova } from '../apoio/mundo';

/**
 * A MURALHA — o que separa uma província fortificada de uma que não é.
 *
 * Duas funções, e as duas importam no mesmo dia: ela **melhora a milícia** e **proíbe o
 * assalto imediato**. Sem a segunda, erguer Muralha era só um número maior de defensores,
 * e a decisão de sitiar continuava valendo o mesmo contra qualquer cidade.
 *
 * A região de teste tem uma de cada: **Tanagra murada, Elêusis aberta.** É o par que deixa
 * a diferença ser vista de um lado para o outro sem inventar cenário nenhum.
 */
describe('A MURALHA: cidade aberta cai hoje, cidade murada faz esperar', () => {
  const muralha = construcoes.construcoes['muralha'];
  const rodadasExigidas = muralha?.rodadasParaAssaltar?.[0] ?? 0;

  /** Atenas com ouro e uma hoste plantada. O alvo não tem tropa: o mapa abre em paz. */
  function contra(_alvo: string, homens: number): Campanha {
    const c = nova();
    c.comecar('atenas');
    c.darOuro(200_000);
    c.plantarHoste('atenas', 'atenas', homens);
    return c;
  }

  it('a Muralha melhora a milícia — sem transformar defesa em multiplicador absurdo', () => {
    const c = nova();
    c.comecar('atenas');
    const fator = construcoes.construcoes['muralha']?.efeito;
    expect(fator?.tipo).toBe('milicia');
    expect(c.miliciaEm('tanagra')).toBe(
      Math.floor(
        c.populacaoDe('tanagra') *
          ajustes.combate.milicia.fracao *
          (fator?.tipo === 'milicia' ? fator.fatores[0] : 1),
      ),
    );
  });

  it('cada nível compra mais tempo: 2/3/4 segundo o catálogo', () => {
    const c = nova();
    c.comecar('tanagra');
    c.darOuro(200_000, 'tanagra');

    for (let nivel = 1; nivel <= 3; nivel++) {
      expect(c.nivelDaConstrucaoEm('tanagra', 'muralha')).toBe(nivel);
      expect(c.assaltoEm('tanagra').faltam).toBe(muralha?.rodadasParaAssaltar?.[nivel - 1]);
      if (nivel === 3) break;
      c.construir('tanagra', 'muralha', 'tanagra');
      const prazo = muralha?.turnos[nivel] ?? 0;
      for (let turno = 0; turno < prazo; turno++) c.passarTurno();
    }
  });

  it('Elêusis é aberta: o assalto sai na chegada, sem sentar antes', () => {
    const c = contra('eleusis', 2000);
    ordenar(c, 'atenas', 'eleusis', 2000, 'atenas', 'assaltar');
    c.passarTurno();
    expect(c.donoDe('eleusis')).toBe('atenas');
  });

  it('Tanagra é murada: o mesmo assalto vira cerco, e a cidade fica', () => {
    const c = contra('tanagra', 2000);
    ordenar(c, 'atenas', 'tanagra', 2000, 'atenas', 'assaltar');
    c.passarTurno();

    // ⚠️ A ordem não é recusada nem some: ela vira a única coisa que dava para fazer
    // naquele dia — sentar. Escada e aríete não se improvisam na chegada.
    expect(c.donoDe('tanagra')).toBe('tanagra');
    expect(c.cercoEm('tanagra')).toMatchObject({ sitiante: 'atenas', postura: 'sitiar', rodadas: 0 });
    expect(c.assaltoEm('tanagra')).toEqual({ pode: false, faltam: rodadasExigidas });
  });

  it(`depois de ${rodadasExigidas} rodadas sentado, o assalto sai`, () => {
    const c = contra('tanagra', 2000);
    ordenar(c, 'atenas', 'tanagra', 2000, 'atenas', 'sitiar');
    c.passarTurno();

    // A rodada da chegada conta zero: o relógio anda com as viradas em que o exército
    // continuou ali.
    for (let i = 0; i < rodadasExigidas; i++) {
      expect(c.assaltoEm('tanagra').pode).toBe(false);
      c.passarTurno();
    }

    expect(c.cercoEm('tanagra')?.rodadas).toBe(rodadasExigidas);
    expect(c.assaltoEm('tanagra')).toEqual({ pode: true, faltam: 0 });
    c.mudarPostura('tanagra', 'assaltar');
    c.passarTurno();
    expect(c.donoDe('tanagra')).toBe('atenas');
  });

  it('antes da hora, mandar assaltar não pega: a postura continua sitiar', () => {
    const c = contra('tanagra', 2000);
    ordenar(c, 'atenas', 'tanagra', 2000, 'atenas', 'sitiar');
    c.passarTurno();

    c.mudarPostura('tanagra', 'assaltar');
    expect(c.cercoEm('tanagra')?.postura).toBe('sitiar');
    c.passarTurno();
    expect(c.donoDe('tanagra')).toBe('tanagra');
  });

  it('o relógio zera quando o sitiante sai: quem volta recomeça o trabalho', () => {
    const c = contra('tanagra', 2000);
    ordenar(c, 'atenas', 'tanagra', 2000, 'atenas', 'sitiar');
    c.passarTurno();
    for (let i = 0; i < rodadasExigidas; i++) c.passarTurno();
    expect(c.assaltoEm('tanagra').pode).toBe(true);

    ordenar(c, 'tanagra', 'atenas', 2000, 'atenas');
    c.passarTurno();
    expect(c.cercoEm('tanagra')).toBeUndefined();

    ordenar(c, 'atenas', 'tanagra', 2000, 'atenas', 'sitiar');
    c.passarTurno();
    // Herdar o tempo de quem já esteve ali entregaria a praça a quem chegou depois do
    // trabalho feito.
    expect(c.assaltoEm('tanagra')).toEqual({ pode: false, faltam: rodadasExigidas });
  });

  it('o relógio NÃO é progresso: sentado para sempre, a cidade não cai sozinha', () => {
    const c = contra('tanagra', 2000);
    ordenar(c, 'atenas', 'tanagra', 2000, 'atenas', 'sitiar');
    for (let i = 0; i < 15; i++) c.passarTurno();

    expect(c.donoDe('tanagra')).toBe('tanagra');
    expect(c.cercoEm('tanagra')?.rodadas).toBeGreaterThan(rodadasExigidas);
    expect(c.rodada.batalhas).toEqual([]);
  });
});
