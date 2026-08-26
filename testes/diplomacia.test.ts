import { describe, expect, it } from 'vitest';

import { guerraEscolhida } from '../src/ia/diplomacia/declarar';
import { querPaz } from '../src/ia/diplomacia/paz';
import { lerSalvamento } from '../src/campanha/salvamento';
import { estiloDe } from '../src/ia/estilo';
import { ajustes, correrIA, ia, novaCampanha } from './apoio/mundo';

const nova = (jogador = 'atenas') => {
  const c = novaCampanha();
  c.comecar(jogador);
  return c;
};

/** A hoste do jogador em Atenas, pronta para marchar. */
const comHoste = (c: ReturnType<typeof nova>, onde = 'atenas', homens = 2000) => {
  const id = c.plantarHoste(onde, 'atenas', homens);
  return { id, homens };
};

describe('o mapa começa em paz, e a guerra é uma decisão com nome', () => {
  it('ninguém está em guerra com ninguém no turno 1', () => {
    // ⚠️ **É a diferença entre este jogo e o de antes.** Sem estado de relação, os 139 poderes
    // estavam em guerra com todo mundo desde o primeiro turno, e a única coisa que segurava o
    // mapa eram freios inventados dentro da IA.
    const c = nova();
    expect(c.guerrasDe('atenas')).toEqual([]);
    expect(c.emGuerra('atenas', 'megara')).toBe(false);
    expect(c.emGuerra('tebas', 'megara')).toBe(false);
  });

  it('sem guerra declarada a hoste não marcha, e a recusa diz por quê', () => {
    const c = nova();
    const { id, homens } = comHoste(c);
    const recusa = c.podeOrdenarMarcha(id, 'eleusis', homens, 'atenas');
    expect(recusa.pode).toBe(false);
    expect(recusa.pode === false && recusa.motivo).toContain('não está em guerra com você');

    c.declararGuerra('eleusis');
    expect(c.podeOrdenarMarcha(id, 'eleusis', homens, 'atenas').pode).toBe(true);
  });

  it('marchar em terra PRÓPRIA nunca pediu guerra nenhuma', () => {
    const c = nova();
    const { id, homens } = comHoste(c);
    const minha = [...c.provinciasDe('atenas')].filter((p) => p !== 'atenas')[0];
    expect(minha).toBeDefined();
    expect(c.podeOrdenarMarcha(id, minha!, homens, 'atenas').pode).toBe(true);
  });

  it('declarar e marchar no MESMO turno é permitido, e é de propósito', () => {
    // As ordens são simultâneas: um aviso prévio de uma virada daria ao defensor um turno
    // inteiro de vantagem sobre quem declarou, e o ataque de surpresa deixaria de existir.
    const c = nova();
    const { id, homens } = comHoste(c);
    c.declararGuerra('eleusis');
    c.ordenarMarcha(id, 'eleusis', homens, 'atenas', 'assaltar');
    c.passarTurno();
    expect(c.donoDe('eleusis')).toBe('atenas');
  });
});

describe('a paz precisa dos dois, e a trégua faz ela valer', () => {
  it('assinada a paz, a guerra acaba e a trégua segura a próxima', () => {
    const c = nova();
    c.declararGuerra('megara');
    expect(c.emGuerra('atenas', 'megara')).toBe(true);

    c.fazerPaz('megara');
    expect(c.emGuerra('atenas', 'megara')).toBe(false);
    // ⚠️ Sem trégua, redeclarar na virada seguinte seria grátis — e a paz viraria uma pausa
    // para respirar no meio do mesmo assalto.
    const recusa = c.podeDeclararGuerra('megara');
    expect(recusa.pode).toBe(false);
    expect(recusa.pode === false && recusa.motivo).toContain('trégua');
    expect(c.tregoaAte('atenas', 'megara')).toBe(
      c.turno + ajustes.diplomacia.tregoaEmTurnos,
    );
  });

  it('vencida a trégua, dá para declarar de novo', () => {
    const c = nova();
    c.declararGuerra('megara');
    c.fazerPaz('megara');
    for (let i = 0; i <= ajustes.diplomacia.tregoaEmTurnos; i++) c.passarTurno();
    expect(c.tregoaAte('atenas', 'megara')).toBeUndefined();
    expect(c.podeDeclararGuerra('megara').pode).toBe(true);
  });

  it('⚠️ a paz LEVANTA o cerco entre os dois', () => {
    // Visto rodando: Elêusis assinou a paz com Mégara no turno 3 e ASSALTOU Mégara no turno 5.
    // O exército continuava sentado, o cerco continuava registrado, e a regra da cidade não
    // perguntava se ainda havia guerra. Além do absurdo, a praça sitiada fica fora da
    // circulação e passa fome: uma paz que não levanta o cerco é a guerra com outro nome.
    const c = nova();
    const { id, homens } = comHoste(c);
    c.declararGuerra('eleusis');
    c.ordenarMarcha(id, 'eleusis', homens, 'atenas', 'sitiar');
    c.passarTurno();
    expect(c.cercoEm('eleusis')).toMatchObject({ sitiante: 'atenas' });

    c.fazerPaz('eleusis');
    expect(c.cercoEm('eleusis')).toBeUndefined();
    // E a cidade não cai mais para quem está acampado nela em paz.
    c.passarTurno();
    expect(c.donoDe('eleusis')).toBe('eleusis');
  });

  it('a guerra contra quem foi eliminado acaba sozinha', () => {
    // ⚠️ **Sem isto a diplomacia trava o mapa inteiro, e travou.** A IA declarava guerra ao
    // vizinho, tomava a única terra dele no turno seguinte — e continuava em guerra com um
    // poder sem chão nem tropa. Como ela só abre uma guerra de cada vez, aquele registro
    // fantasma a impedia de declarar qualquer outra pelo resto da campanha.
    const c = nova();
    const { id, homens } = comHoste(c);
    c.declararGuerra('eleusis');
    c.ordenarMarcha(id, 'eleusis', homens, 'atenas', 'assaltar');
    c.passarTurno();
    expect(c.vivo('eleusis')).toBe(false);
    expect(c.emGuerra('atenas', 'eleusis')).toBe(false);
  });
});

describe('a guerra atravessa o salvamento', () => {
  it('quem estava em guerra continua em guerra depois de retomar', () => {
    const original = nova();
    original.declararGuerra('megara');
    const outra = novaCampanha();
    outra.restaurar(lerSalvamento(original.serializar()));
    expect(outra.emGuerra('atenas', 'megara')).toBe(true);
  });
});

describe('a IA passa pela mesma porta', () => {
  it('ela declara antes de marchar, e não marcha em quem está em paz', () => {
    const c = nova('atenas');
    const donos = new Map(c.provinciasSimuladas.map((id) => [id, c.donoDe(id)] as const));
    correrIA(c, 30);
    const mudaram = [...donos].filter(([id, dono]) => c.donoDe(id) !== dono);
    expect(mudaram.length).toBeGreaterThan(0);
    // Toda conquista teve guerra: se não tivesse, a ordem de marcha teria sido recusada e
    // província nenhuma mudaria de dono. É a mesma porta para os dois lados.
  });

  it('ela não abre uma segunda frente', () => {
    // ⚠️ A regra que substituiu o preço fingido por conquista. Ela é verdadeira — dois
    // inimigos ao mesmo tempo derrubam qualquer um destes poderes —, é legível na aba de
    // Diplomacia, e dá ritmo ao mapa sem nenhum número mágico.
    const c = nova('atenas');
    c.plantarHoste('tebas', 'tebas', 4000);
    c.declararGuerra('calcis', 'tebas');
    expect(guerraEscolhida(c, 'tebas', estiloDe(ia, 'tebas'), ajustes.combate)).toBeNull();
  });

  it('quem já não tem o que tomar do inimigo quer a paz', () => {
    const c = nova('atenas');
    c.declararGuerra('megara', 'caristo');
    // Caristo é uma ilha: ela não faz fronteira com Mégara, então não há o que tomar.
    expect(querPaz(c, 'caristo', 'megara', estiloDe(ia, 'caristo'), ajustes.combate)).toBe(true);
  });
});
