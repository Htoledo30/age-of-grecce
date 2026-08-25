import { describe, expect, it } from 'vitest';

import { unicaEm } from '../apoio/hostes';
import { comQuartel } from './apoio';

describe('dispensar devolve cada um à sua terra', () => {
  it('aceita dispensar um único homem, sem lote mínimo', () => {
    const c = comQuartel();
    c.recrutar('atenas', 1000);
    c.passarTurno();
    const populacao = c.populacaoDe('atenas');
    c.dispensar('atenas', 1);
    expect(c.forcaEm('atenas')).toBe(999);
    expect(c.populacaoDe('atenas')).toBe(populacao + 1);
  });

  it('a população volta exatamente de onde saiu', () => {
    const c = comQuartel();
    c.recrutar('atenas', 2000);
    c.passarTurno();
    const populacao = c.populacaoDe('atenas');

    c.dispensar('atenas', 800);

    expect(c.forcaEm('atenas')).toBe(1200);
    expect(c.populacaoDe('atenas')).toBe(populacao + 800);
  });

  it('dispensar tudo apaga o exército em vez de deixar um vazio', () => {
    const c = comQuartel();
    c.recrutar('atenas', 1000);
    c.passarTurno();
    const populacao = c.populacaoDe('atenas');
    c.dispensar('atenas', 1000);
    expect(unicaEm(c, 'atenas')).toBeUndefined();
    expect(c.populacaoDe('atenas')).toBe(populacao + 1000);
    expect(c.manutencao).toBe(0);
  });

  it('a população nunca é uma catraca de sentido único', () => {
    // ⚠️ **Medido contra um CONTROLE:** a demografia se
    // mexe sozinha entre um turno e outro — e mobilizar pode trocar a categoria alimentar.
    // Comparar "depois" com "antes" mediria demografia, não a catraca. O que este
    // teste guarda é que recrutar e dispensar **não tiram nada do mundo**: três ciclos de
    // leva e dispensa têm que terminar exatamente onde três turnos parados terminariam.
    const parado = comQuartel();
    for (let i = 0; i < 3; i++) parado.passarTurno();

    const c = comQuartel();
    for (let i = 0; i < 3; i++) {
      c.recrutar('atenas', 1000);
      c.passarTurno();
      c.dispensar('atenas', 1000);
    }
    // ⚠️ Mobilizar CUSTA, e o preço é crescimento: com a mesa apertada, os mil homens em
    // armas seguram o saldo em zero e Atenas não cresce naqueles turnos. A que ficou parada
    // cresce. O que este teste guarda é que a diferença é DEMOGRAFIA — ninguém foi engolido
    // pela dispensa —, e por isso a conta se fecha pelo lado de quem voltou.
    expect(c.populacaoDe('atenas')).toBeLessThan(parado.populacaoDe('atenas'));
    // Os mil homens do último ciclo estão de volta na terra: a hoste ficou vazia.
    expect(c.forcaEm('atenas')).toBe(0);
    // E o mundo não perdeu gente: o que falta em Atenas é o que ela deixou de crescer,
    // nunca mais do que o próprio crescimento de três turnos parados.
    const cresceuParado = parado.populacaoDe('atenas') - comQuartel().populacaoDe('atenas');
    expect(parado.populacaoDe('atenas') - c.populacaoDe('atenas')).toBeLessThanOrEqual(
      Math.max(cresceuParado, 0),
    );
  });
});

describe('dispensar homem de terra perdida', () => {
  it('ele volta pra terra dele mesmo que ela seja do inimigo agora', () => {
    const c = comQuartel();
    c.recrutar('atenas', 1000);
    c.passarTurno();
    const populacao = c.populacaoDe('atenas');

    // ⚠️ Medido sobre a soma das TERRAS: `rendaDe` traz também a rede de trocas, que é
    // nacional e muda por outro motivo quando um reino ganha uma província nova.
    const daTerra = (poder: string): number =>
      c.provinciasDe(poder).reduce((soma, id) => soma + (c.economiaDe(id)?.total ?? 0), 0);
    const rendaPropriaDeMegara = daTerra('megara');
    c.trocarDono('atenas', 'megara');
    // Uma regra só, sem exceção: gente pertence ao chão, não a quem manda no chão.
    c.dispensar('atenas', 1000);

    expect(c.populacaoDe('atenas')).toBe(populacao + 1000);
    expect(c.donoDe('atenas')).toBe('megara');
    // E a consequência dura, de propósito: os habitantes rendem pro conquistador —
    // somados ao que Mégara já arrecadava das terras dela.
    expect(daTerra('megara')).toBe(rendaPropriaDeMegara + (c.economiaDe('atenas')?.total ?? 0));
    expect(daTerra('atenas')).toBe(
      (c.economiaDe('maratona')?.total ?? 0) + (c.economiaDe('sounion')?.total ?? 0),
    );
  });

  it('a mesma regra vale pra deserção por falta de pagamento', () => {
    // O exilado sem soldo: a hoste ativa fica sem pagamento e deserta INTEIRA na virada —
    // e a folha é cobrada ANTES da fome, então ninguém morre no caminho e a conta mede só
    // a deserção. Cada desertor volta à terra natal, que agora é de Mégara.
    const c = comQuartel();
    c.recrutar('atenas', 1000);
    c.passarTurno(); // a leva vira hoste
    for (const id of [...c.provinciasDe('atenas')]) c.trocarDono(id, 'megara');
    c.darOuro(-c.tesouro); // exilado e de cofre vazio

    const antes = c.populacaoDe('atenas');
    c.passarTurno();

    // Os 1.000 voltaram pra casa ANTES do crescimento do turno: a população nova é pelo
    // menos a antiga mais a tropa inteira.
    expect(c.populacaoDe('atenas')).toBeGreaterThanOrEqual(antes + 1000);
    // Sem chão e agora sem tropa, o exílio terminou em eliminação.
    expect(c.hostes().filter((h) => h.poder === 'atenas')).toEqual([]);
    expect(c.vivo('atenas')).toBe(false);
    // E quem engorda com os desertores é exatamente quem tomou a terra deles.
    expect(c.rendaDe('megara')).toBeGreaterThan(0);
  });

  it('nenhum homem some do mundo no caminho', () => {
    const c = comQuartel();
    c.recrutar('atenas', 3000);
    c.passarTurno();
    const total = c.populacaoDe('atenas') + c.homensEmArmasDe('atenas');
    c.trocarDono('atenas', 'megara');
    c.dispensar('atenas', 1200);
    expect(c.populacaoDe('atenas') + c.homensEmArmasDe('atenas')).toBe(total);
    c.dispensar('atenas', 1800);
    expect(c.populacaoDe('atenas') + c.homensEmArmasDe('atenas')).toBe(total);
  });
});
