import { describe, expect, it } from 'vitest';

import { ajustes, atlas, construcoes, novaCampanha as nova } from '../apoio/mundo';

describe('o saldo completo da província: renda menos a tropa nascida nela', () => {
  it('a leva em formação ainda não pesa; a hoste ativa pesa na terra NATAL', () => {
    const c = nova();
    c.comecar('atenas');
    c.darOuro(20_000);
    expect(c.custoDaTropaDe('atenas')).toBe(0);

    c.recrutar('atenas', 1000);
    // Em formação não há soldo: a folha só começa quando a leva vira hoste.
    expect(c.custoDaTropaDe('atenas')).toBe(0);
    c.passarTurno();

    const custo = Math.round(1000 * ajustes.combate.manutencaoPorHomem);
    expect(c.custoDaTropaDe('atenas')).toBe(custo);
    const renda = c.economiaDe('atenas')?.total ?? 0;
    expect(c.saldoDaProvincia('atenas')).toBe(renda - custo);
    // Onde não há economia, não há veredito — a honestidade de sempre.
    expect(c.saldoDaProvincia('esparta')).toBeNull();
  });

  it('a tropa segue a ORIGEM, não a posição: marchar não muda a conta de casa', () => {
    const c = nova();
    c.comecar('atenas');
    const id = c.plantarHoste('atenas', 'atenas', 800);
    const emCasa = c.custoDaTropaDe('atenas');
    expect(emCasa).toBeGreaterThan(0);

    c.ordenarMarcha(id, 'sounion', 800);
    c.passarTurno();

    expect(c.forcaEm('sounion', 'atenas')).toBe(800);
    expect(c.custoDaTropaDe('atenas')).toBe(emCasa);
    expect(c.custoDaTropaDe('sounion')).toBe(0);
  });
});

describe('propriedade: de quem é a província agora', () => {
  it('a campanha nasce com os donos de 700 a.C. e a tabela é completa', () => {
    const c = nova();
    // Tabela CHEIA, não um diff contra o assado: é o que faz um recorte reassado falhar
    // alto em vez de misturar duas eras em silêncio.
    for (const p of atlas.provincias) expect(c.donoDe(p.id)).toBe(atlas.donoInicial(p.id));
    expect(c.provinciasDe('atenas')).toHaveLength(3);
  });

  it('trocar o dono move a província dos dois lados de uma vez', () => {
    const c = nova();
    c.comecar('atenas');
    const antes = c.provinciasDe('megara').length;

    c.trocarDono('megara', 'atenas');

    expect(c.donoDe('megara')).toBe('atenas');
    expect(c.provinciasDe('atenas')).toContain('megara');
    expect(c.provinciasDe('megara')).toHaveLength(antes - 1);
    expect(c.provinciasDe('megara')).not.toContain('megara');
  });

  it('perder a última província é a eliminação, e ela é derivada', () => {
    // Esparta: sem guarnição inicial, a eliminação é limpa. Mégara deixou de servir de
    // exemplo aqui porque agora tem tropa em pé — perder o chão a deixaria no EXÍLIO.
    const c = nova();
    expect(c.vivo('esparta')).toBe(true);
    expect(c.poderesVivos()).toHaveLength(148);

    for (const id of [...c.provinciasDe('esparta')]) c.trocarDono(id, 'atenas');

    expect(c.vivo('esparta')).toBe(false);
    expect(c.poderesVivos()).toHaveLength(147);
    expect(c.poderesVivos()).not.toContain('esparta');
  });

  it('conquistar muda quem pode agir ali, e quanto o dono arrecada', () => {
    const c = nova();
    c.comecar('atenas');
    expect(c.podeAgirEm('maratona')).toMatchObject({ pode: true });
    const sobAtenas = c.economiaDe('maratona')?.total ?? 0;

    c.trocarDono('maratona', 'megara');

    expect(c.podeAgirEm('maratona')).toMatchObject({ motivo: 'esta província não é sua' });
    // Atenas perde exatamente o que Maratona rendia PRA ELA; Mégara ganha o que Maratona
    // rende SOB Mégara — os dois números diferem porque a distância da capital mudou de
    // dono junto com a terra. É a corrupção fazendo a geografia importar.
    const sobMegara = c.economiaDe('maratona')?.total ?? 0;
    expect(sobAtenas).toBeGreaterThan(0);
    expect(sobMegara).toBeGreaterThan(0);
    // ⚠️ Medido sobre a soma das TERRAS, não sobre `rendaDe`: a renda do reino traz também
    // a rede de trocas, que é nacional e muda por outro motivo — perder Maratona pode ser
    // perder o único gado ao alcance. Quem guarda essa parte é `testes/comercio/`.
    const daTerra = (campanha: ReturnType<typeof nova>, poder: string): number =>
      campanha
        .provinciasDe(poder)
        .reduce((soma, id) => soma + (campanha.economiaDe(id)?.total ?? 0), 0);
    expect(daTerra(c, 'atenas')).toBe(daTerra(nova(), 'atenas') - sobAtenas);
    // Mégara agora tem renda própria: o ganho dela é exatamente a Maratona SOB Mégara.
    expect(daTerra(c, 'megara')).toBe(daTerra(nova(), 'megara') + sobMegara);
  });

  it('o decreto de imposto e a obra morrem com a posse; a construção fica', () => {
    const c = nova();
    c.comecar('atenas');
    c.definirImposto('maratona', 'alto');
    c.construir('sounion', 'mina');
    // Passa turnos até a Mina ficar pronta E dar pra erguer a Ágora — quantos são
    // exatamente é balanço, e cravar o número quebraria a cada ajuste de renda.
    for (
      let i = 0;
      i < 20 && (!c.podeConstruir('atenas', 'agora').pode || c.obraEm('sounion') !== undefined);
      i++
    ) {
      c.passarTurno();
    }
    expect(c.construcoesEm('sounion')).toContain('mina');
    expect(c.nivelDeImpostoEm('maratona')).toBe('alto');
    c.construir('atenas', 'agora'); // obra em andamento em Atenas
    expect(c.obraEm('atenas')).toBeDefined();

    c.trocarDono('maratona', 'megara');
    c.trocarDono('atenas', 'megara');
    c.trocarDono('sounion', 'megara');

    // O decreto era de quem mandava, e quem manda mudou: volta ao normal...
    expect(c.nivelDeImpostoEm('maratona')).toBe('normal');
    // ...e a obra não é entregue pronta ao inimigo.
    expect(c.obraEm('atenas')).toBeUndefined();
    // Mas a construção é da PROVÍNCIA, não de quem mandava nela: é isso que faz tomar
    // uma cidade rica valer mais que tomar uma pobre.
    expect(c.construcoesEm('sounion')).toContain('mina');
    // A produção fica multiplicada pelo fator da Mina — nível e fator são balanço.
    const semObra = nova().economiaDe('sounion')?.producao ?? 0;
    const mina = construcoes.construcoes['mina'];
    if (mina?.efeito.tipo !== 'renda') throw new Error('Mina deveria render moeda');
    expect(c.economiaDe('sounion')?.producao).toBe(Math.round(semObra * mina.efeito.fatores[0]));
  });

  it('trocar pro mesmo dono não faz nada, e poder inexistente estoura', () => {
    const c = nova();
    const antes = c.provinciasDe('atenas').length;
    c.trocarDono('atenas', 'atenas');
    expect(c.provinciasDe('atenas')).toHaveLength(antes);
    expect(() => c.trocarDono('atenas', 'roma')).toThrow(/poder inexistente: roma/);
    expect(() => c.donoDe('cartago')).toThrow(/província inexistente: cartago/);
  });

  it('a soma das províncias de todos os poderes é sempre 205', () => {
    const c = nova();
    const total = (): number => atlas.poderes.reduce((s, p) => s + c.provinciasDe(p.id).length, 0);
    expect(total()).toBe(205);
    c.trocarDono('megara', 'atenas');
    c.trocarDono('esparta', 'atenas');
    // Nenhuma província some nem aparece em dois donos ao mesmo tempo.
    expect(total()).toBe(205);
  });
});
