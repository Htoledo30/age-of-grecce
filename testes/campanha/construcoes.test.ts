import { describe, expect, it } from 'vitest';

import { rendaDaProvincia } from '../../src/campanha/economia';
import { ajustes, construcoes, economia, novaCampanha as nova } from '../apoio/mundo';

describe('construções', () => {
  it('a melhor construção muda de província — é isso que faz existir decisão', () => {
    const c = nova();
    c.comecar('atenas');
    const melhor = (id: string): string =>
      Object.keys(c.construcoesDisponiveisEm(id))
        .map((idc) => ({ idc, g: c.retornoDaConstrucaoEm(id, idc)?.ganhoPorTurno ?? 0 }))
        .reduce((a, b) => (b.g > a.g ? b : a)).idc;

    // Atenas tem 35.000 habitantes: quem manda ali é o imposto.
    expect(melhor('atenas')).toBe('agora');
    // Maratona produz pouco, mas tem 18.000 habitantes.
    expect(melhor('maratona')).toBe('agora');
    // Sunião tem minério e pouca gente: quem manda é a PRODUÇÃO — qual das duas
    // explorações vence é balanço (custo e manutenção de Mina e Pedreira mudam).
    expect(['mina', 'pedreira']).toContain(melhor('sounion'));
  });

  it('cada construção acrescenta exatamente o que o fator dela promete', () => {
    // Derivado do catálogo: os fatores são balanço e mudam. O que o teste guarda é que o
    // ganho é a PARCELA multiplicada pelo fator, e não um número decorado.
    const c = nova();
    c.comecar('atenas');

    const agora = construcoes.construcoes['agora'];
    const impostos = c.economiaDe('atenas')?.impostos ?? 0;
    if (agora?.efeito.tipo !== 'renda') throw new Error('Ágora deveria render moeda');
    // O ganho é LÍQUIDO desde a manutenção: fator sobre a parcela, menos a folha nova.
    expect(c.retornoDaConstrucaoEm('atenas', 'agora')?.ganhoPorTurno).toBe(
      Math.round(impostos * agora.efeito.fatores[0]) - impostos - agora.manutencao[0],
    );

    // A Mina em Sunião mexe na produção — e o comércio sobe junto, porque sai dela.
    const antes = c.economiaDe('sounion');
    const ganho = c.retornoDaConstrucaoEm('sounion', 'mina')?.ganhoPorTurno ?? 0;
    const mina = construcoes.construcoes['mina'];
    if (mina?.efeito.tipo !== 'renda') throw new Error('Mina deveria render moeda');
    const producaoNova = Math.round((antes?.producao ?? 0) * mina.efeito.fatores[0]);
    // Devolvendo a manutenção ao ganho, sobra mais que o delta da produção: o comércio.
    expect(ganho + mina.manutencao[0]).toBeGreaterThan(producaoNova - (antes?.producao ?? 0));
  });

  it('toda construção erguida cobra manutenção: a renda é líquida', () => {
    const c = nova();
    c.comecar('atenas');
    c.construir('atenas', 'agora');
    const agora = construcoes.construcoes['agora']!;
    for (let i = 0; i < agora.turnos[0]; i++) c.passarTurno();

    const e = c.economiaDe('atenas');
    expect(e?.manutencao).toBe(agora.manutencao[0]);
    // O total é a soma das três parcelas MENOS a folha — é o que a barra soma no tesouro.
    expect(e?.total).toBe(
      (e?.impostos ?? 0) + (e?.producao ?? 0) + (e?.comercio ?? 0) - agora.manutencao[0],
    );
    // Obra em andamento ainda não cobra: paga-se pelo que está de pé.
    const semNada = nova();
    semNada.comecar('atenas');
    semNada.construir('atenas', 'agora');
    expect(semNada.economiaDe('atenas')?.manutencao).toBe(0);
  });

  it('sob cerco a manutenção continua sendo cobrada, e a província pode ficar no vermelho', () => {
    // Direto na função pura: o cerco zera produção e comércio, mas a folha das
    // construções não tira férias — sitiada com Muralha só de pé pode render negativo.
    const ficha = economia.provincias['eleusis'];
    if (!ficha) throw new Error('ficha ausente: eleusis');
    const muralha = construcoes.construcoes['muralha']!;
    const sitiada = rendaDaProvincia(
      ficha,
      economia.produtos,
      construcoes.construcoes,
      ajustes.economia,
      {
        construcoes: { muralha: 3 },
        populacao: 1000,
        corrupcao: 0,
        fatorDeImposto: 1,
        revoltosa: false,
        sitiada: true,
      },
    );
    expect(sitiada.producao).toBe(0);
    expect(sitiada.comercio).toBe(0);
    expect(sitiada.manutencao).toBe(muralha.manutencao[2]);
    expect(sitiada.total).toBe(sitiada.impostos - muralha.manutencao[2]);
    expect(sitiada.total).toBeLessThan(0);
  });

  it('paga à vista e entrega depois: a obra leva turnos', () => {
    const c = nova();
    c.comecar('atenas');
    const antes = c.tesouro;
    const rendaAntes = c.rendaDe('atenas');

    const custo = construcoes.construcoes['agora']!.custos[0];
    const prazo = construcoes.construcoes['agora']!.turnos[0];
    c.construir('atenas', 'agora');
    // o dinheiro sai na hora...
    expect(c.tesouro).toBe(antes - custo);
    // ...e o benefício NÃO chega junto
    expect(c.rendaDe('atenas')).toBe(rendaAntes);
    expect(c.construcoesEm('atenas')).toEqual([]);
    expect(c.obraEm('atenas')).toMatchObject({
      construcao: 'agora',
      nivelAlvo: 1,
      turnosRestantes: prazo,
    });

    // três arrecadações sem o benefício
    for (let i = 0; i < prazo; i++) {
      expect(c.construcoesEm('atenas')).toEqual([]);
      c.passarTurno();
    }

    // a partir da quarta, a Ágora está de pé
    expect(c.obraEm('atenas')).toBeUndefined();
    expect(c.construcoesEm('atenas')).toEqual(['agora']);
    // O ganho é medido contra um CONTROLE que passou os mesmos turnos sem construir:
    // comparar com a renda de três turnos atrás mediria também a demografia.
    const semObra = nova();
    semObra.comecar('atenas');
    for (let i = 0; i < prazo; i++) semObra.passarTurno();
    expect(c.rendaDe('atenas')).toBeGreaterThan(semObra.rendaDe('atenas'));
    // Já construída, a conta passa a mostrar o ganho do próximo nível.
    expect(c.retornoDaConstrucaoEm('atenas', 'agora')?.ganhoPorTurno).toBeGreaterThan(0);
  });

  it('o prazo varia por construção, e vem do catálogo', () => {
    const c = nova();
    c.comecar('atenas');
    c.construir('sounion', 'mina');
    const prazo = construcoes.construcoes['mina']!.turnos[0];
    expect(c.obraEm('sounion')?.turnosRestantes).toBe(prazo);
    for (let i = 0; i < prazo; i++) c.passarTurno();
    expect(c.construcoesEm('sounion')).toEqual(['mina']);
  });

  it('uma obra por vez em cada província', () => {
    const c = nova();
    c.comecar('atenas');
    c.construir('atenas', 'agora');
    expect(c.podeConstruir('atenas', 'mercado')).toMatchObject({ motivo: /em obra aqui/ });
  });

  it('a terra libera apenas as explorações dos seus dois produtos', () => {
    const c = nova();
    c.comecar('atenas');
    expect(Object.keys(c.construcoesDisponiveisEm('atenas'))).toEqual(
      expect.arrayContaining([
        'agora',
        'mercado',
        'quartel',
        'muralha',
        'templo',
        'porto',
        'estrada',
        'fazenda',
        'lagar',
      ]),
    );
    expect(c.construcoesDisponiveisEm('atenas')).not.toHaveProperty('mina');
    expect(c.construcoesDisponiveisEm('maratona')).not.toHaveProperty('porto');
    expect(c.construcoesDisponiveisEm('sounion')).toHaveProperty('mina');
    expect(c.construcoesDisponiveisEm('sounion')).toHaveProperty('pedreira');
    expect(c.construcoesDisponiveisEm('sounion')).not.toHaveProperty('fazenda');
  });

  it('quatro prédios ocupam os quatro slots, mas upgrades continuam permitidos', () => {
    const c = nova();
    c.comecar('atenas');
    c.darOuro(100_000);
    for (const id of ['agora', 'mercado', 'quartel', 'fazenda']) {
      c.construir('atenas', id);
      const prazo = construcoes.construcoes[id]!.turnos[0];
      for (let i = 0; i < prazo; i++) c.passarTurno();
    }
    expect(c.construcoesEm('atenas')).toHaveLength(4);
    expect(c.podeConstruir('atenas', 'templo')).toMatchObject({ motivo: /4 slots/ });
    expect(c.podeConstruir('atenas', 'agora')).toMatchObject({ pode: true });
  });

  it('Fazenda I, II e III somam +1, +2 e +3 à comida, sem estoque', () => {
    const c = nova();
    c.comecar('atenas');
    c.darOuro(100_000);
    const natural = c.contribuicaoAlimentarEm('atenas');
    for (let nivel = 1; nivel <= 3; nivel++) {
      c.construir('atenas', 'fazenda');
      const prazo = construcoes.construcoes['fazenda']!.turnos[nivel - 1] ?? 0;
      for (let i = 0; i < prazo; i++) c.passarTurno();
      expect(c.nivelDaConstrucaoEm('atenas', 'fazenda')).toBe(nivel);
      expect(c.contribuicaoAlimentarEm('atenas')).toBe(natural + nivel);
    }
  });

  it('é PERMANENTE e sobrevive a dez anos: não expira nunca', () => {
    const c = nova();
    c.comecar('atenas');
    c.construir('atenas', 'agora');
    expect(c.tesouro).toBe(ajustes.tesouroInicial - construcoes.construcoes['agora']!.custos[0]);
    for (let i = 0; i < construcoes.construcoes['agora']!.turnos[0] + 10; i++) c.passarTurno();

    expect(c.construcoesEm('atenas')).toEqual(['agora']);
    expect(c.retornoDaConstrucaoEm('atenas', 'agora')?.ganhoPorTurno).toBeGreaterThan(0);
  });

  it('a mesma construção sobe até III e então recusa com motivo', () => {
    const c = nova();
    expect(c.podeConstruir('atenas', 'agora')).toMatchObject({ motivo: /ainda não começou/ });
    c.comecar('atenas');
    c.construir('atenas', 'agora');
    for (let i = 0; i < construcoes.construcoes['agora']!.turnos[0]; i++) c.passarTurno();
    expect(c.nivelDaConstrucaoEm('atenas', 'agora')).toBe(1);
    c.darOuro(20_000);
    expect(c.podeConstruir('atenas', 'agora')).toMatchObject({ pode: true });
    // O upgrade paga APENAS o nível novo, não a soma dos níveis até ele.
    const antesDoII = c.tesouro;
    c.construir('atenas', 'agora');
    expect(c.tesouro).toBe(antesDoII - construcoes.construcoes['agora']!.custos[1]);
    for (let i = 0; i < construcoes.construcoes['agora']!.turnos[1]; i++) c.passarTurno();
    const antesDoIII = c.tesouro;
    c.construir('atenas', 'agora');
    expect(c.tesouro).toBe(antesDoIII - construcoes.construcoes['agora']!.custos[2]);
    for (let i = 0; i < construcoes.construcoes['agora']!.turnos[2]; i++) c.passarTurno();
    expect(c.nivelDaConstrucaoEm('atenas', 'agora')).toBe(3);
    expect(c.podeConstruir('atenas', 'agora')).toMatchObject({ motivo: /nível máximo/ });
    expect(c.podeConstruir('esparta', 'agora')).toMatchObject({ motivo: /não é sua/ });
    expect(c.podeConstruir('atenas', 'coliseu')).toMatchObject({ motivo: /inexistente/ });

    // e quando falta dinheiro, o motivo diz quanto falta
    const pobre = nova();
    pobre.comecar('atenas');
    pobre.construir('maratona', 'agora');
    expect(pobre.podeConstruir('atenas', 'mercado')).toMatchObject({ motivo: /faltam 1\.000/ });
    expect(() => pobre.construir('atenas', 'mercado')).toThrow(/faltam/);
  });

  it('província sem economia não aceita construção', () => {
    const c = nova();
    c.comecar('atenas');
    expect(c.retornoDaConstrucaoEm('esparta', 'agora')).toBeNull();
    expect(c.podeConstruir('esparta', 'agora')).toMatchObject({ pode: false });
  });

  it('todo dinheiro continua inteiro depois de construir', () => {
    const c = nova();
    c.comecar('atenas');
    c.construir('sounion', 'mina');
    for (let i = 0; i < construcoes.construcoes['mina']!.turnos[0]; i++) c.passarTurno();
    for (const id of ['atenas', 'maratona', 'sounion']) {
      const e = c.economiaDe(id);
      for (const n of [e?.impostos, e?.producao, e?.comercio, e?.total]) {
        expect(Number.isInteger(n)).toBe(true);
      }
    }
    expect(Number.isInteger(c.tesouro)).toBe(true);
  });
});
