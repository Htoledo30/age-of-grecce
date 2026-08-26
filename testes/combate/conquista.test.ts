import { describe, expect, it } from 'vitest';

import { unicaEm } from '../apoio/hostes';
import { ajustes, novaCampanha as nova } from '../apoio/mundo';
import { comQuartel } from './apoio';

describe('conquista e tropa', () => {
  it('perder a província não some com o exército que está nela', () => {
    const c = comQuartel();
    c.recrutar('atenas', 1000);
    c.passarTurno();
    c.trocarDono('atenas', 'megara');
    // o exército continua sendo de Atenas: quem manda no chão não manda na tropa
    expect(unicaEm(c, 'atenas')?.poder).toBe('atenas');
    // Perguntando por Atenas de propósito: sem o poder, `forcaEm` responderia por Mégara,
    // que é a nova dona da terra e não tem homem nenhum ali.
    expect(c.forcaEm('atenas', 'atenas')).toBe(1000);
  });
});

describe('perder o chão não é o mesmo que morrer', () => {
  it('um poder sem território mas com hoste continua vivo, no exílio', () => {
    const c = comQuartel();
    c.recrutar('atenas', 1000);
    expect(c.poderesVivos()).toHaveLength(139);

    // Atenas perde as três províncias, mas a hoste continua de pé.
    for (const id of [...c.provinciasDe('atenas')]) c.trocarDono(id, 'megara');

    expect(c.provinciasDe('atenas')).toHaveLength(0);
    expect(c.vivo('atenas')).toBe(true);
    expect(c.noExilio('atenas')).toBe(true);
    expect(c.poderesVivos()).toContain('atenas');
  });

  it('o exilado tem que ASSALTAR a própria capital de volta, e o relógio corre', () => {
    const c = comQuartel();
    c.recrutar('atenas', 1000);
    c.passarTurno(); // a leva leva uma rodada pra virar hoste
    for (const id of [...c.provinciasDe('atenas')]) c.trocarDono(id, 'megara');
    // ⚠️ `trocarDono` é o gancho de desenvolvimento: ele move a bandeira sem guerra nenhuma.
    // Numa partida, quem perdeu a terra a perdeu LUTANDO e já está em guerra — e desde a
    // diplomacia é a guerra que autoriza o exército a sitiar a própria capital tomada.
    c.declararGuerra('megara', 'atenas');
    expect(c.renda).toBe(0); // sem província, sem arrecadação
    expect(c.noExilio('atenas')).toBe(true);

    // ⚠️ O CERCO endureceu o exílio, e a regra nova é mais dura e mais interessante: a
    // hoste está pisando na própria terra, mas a cidade tem gente dentro e não abre o
    // portão porque a bandeira mudou. Sentar na porta não devolve nada — e sem renda a
    // deserção já está comendo o exército.
    c.passarTurno();
    expect(c.noExilio('atenas')).toBe(true);
    expect(c.cercoEm('atenas')).toMatchObject({ sitiante: 'atenas', postura: 'sitiar' });

    c.mudarPostura('atenas', 'assaltar', 'atenas');
    c.passarTurno();

    expect(c.donoDe('atenas')).toBe('atenas');
    expect(c.noExilio('atenas')).toBe(false);
    expect(c.vivo('atenas')).toBe(true);
  });

  it('sem chão e sem tropa é eliminação, como antes', () => {
    // Esparta não tem guarnição inicial: perder o chão a elimina de vez, sem exílio.
    const c = nova();
    for (const id of [...c.provinciasDe('esparta')]) c.trocarDono(id, 'atenas');
    expect(c.vivo('esparta')).toBe(false);
    expect(c.noExilio('esparta')).toBe(false);
  });
});

describe('tomar à força quebra a cidade', () => {
  /** Atenas com ouro e uma hoste grande o bastante para levar a praça no primeiro assalto. */
  const contra = (alvo: string, homens: number) => {
    const c = nova();
    c.comecar('atenas');
    c.darOuro(400_000);
    c.plantarHoste('atenas', 'atenas', homens);
    const minha = c.hostesEm('atenas').find((h) => h.poder === 'atenas');
    if (!minha) throw new Error('a hoste não subiu');
    c.declararGuerra(c.donoDe(alvo), 'atenas');
    c.ordenarMarcha(minha.id, alvo, homens, 'atenas', 'assaltar');
    return c;
  };

  it('morre gente que não pegou em armas, e a conta sai dos ajustes', () => {
    // ⚠️ Civis, e não milicianos: aqueles já morreram na batalha. Regra de Henrique — *"não é
    // só soldado e milícia que morre em invasão"*.
    const c = contra('eleusis', 3000);
    const antes = c.populacaoDe('eleusis');
    c.passarTurno();
    expect(c.donoDe('eleusis')).toBe('atenas');

    const saque = c.rodada.saques.find((s) => s.provincia === 'eleusis');
    expect(saque).toBeDefined();
    expect(saque!.mortos).toBeGreaterThan(0);
    // A fração é a dos ajustes, aplicada à população que estava lá — a milícia morta na
    // batalha já saiu antes, e é por isso que a conta não fecha com `antes` cravado.
    expect(saque!.mortos).toBeLessThanOrEqual(Math.ceil(antes * ajustes.conquista.mortosNoSaque));
  });

  it('a MURALHA é o que cai, porque foi ela que se quebrou para entrar', () => {
    // É o que dá dois preços a "sitiar ou assaltar?": sentar demora e entrega a cidade
    // inteira; assaltar entrega hoje uma praça aberta, que o vencedor precisa reerguer.
    const c = contra('tanagra', 6000);
    expect(c.nivelDaConstrucaoEm('tanagra', 'muralha')).toBeGreaterThan(0);
    const antes = c.nivelDaConstrucaoEm('tanagra', 'muralha');

    // Tanagra é murada: o assalto pedido na marcha vira cerco, e só depois das rodadas
    // exigidas a escada sobe. É a própria muralha marcando a hora do estrago dela.
    c.passarTurno();
    expect(c.cercoEm('tanagra')).toBeDefined();
    for (let i = 0; i < ajustes.combate.cerco.rodadasParaAssaltarMuralha; i++) c.passarTurno();
    c.mudarPostura('tanagra', 'assaltar');
    c.passarTurno();
    expect(c.donoDe('tanagra')).toBe('atenas');

    expect(c.nivelDaConstrucaoEm('tanagra', 'muralha')).toBe(antes - ajustes.conquista.niveisPerdidos);
  });

  it('cidade que cai SEM luta não perde nada', () => {
    // ⚠️ A metade que dá sentido à outra: não houve batalha, não há o que destruir. Sem esta
    // regra, "conquistar" viraria sinônimo de "destruir" e o mapa vazio ficaria em ruínas.
    const c = nova();
    c.comecar('atenas');
    c.darOuro(400_000);
    // Elêusis sem ninguém: a milícia zera quando a população vai ao piso.
    c.matarPopulacao('eleusis', c.populacaoDe('eleusis'));
    expect(c.miliciaEm('eleusis')).toBe(0);

    c.plantarHoste('atenas', 'atenas', 500);
    const minha = c.hostesEm('atenas').find((h) => h.poder === 'atenas');
    c.declararGuerra('eleusis', 'atenas');
    c.ordenarMarcha(minha!.id, 'eleusis', 500, 'atenas', 'assaltar');
    c.passarTurno();

    expect(c.donoDe('eleusis')).toBe('atenas');
    expect(c.rodada.saques).toEqual([]);
  });
});
