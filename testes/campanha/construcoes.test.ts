import { describe, expect, it } from 'vitest';

import { Campanha } from '../../src/campanha/campanha';
import { rendaDaProvincia } from '../../src/campanha/economia';
import { Atlas } from '../../src/mundo/atlas';
import {
  ajustes,
  construcoes,
  economia,
  exercitos,
  novaCampanha as nova,
  provincias,
} from '../apoio/mundo';

describe('construções', () => {
  it('a melhor construção muda de província — é isso que faz existir decisão', () => {
    const c = nova();
    c.comecar('atenas');
    // ⚠️ Sem o Mercado: ele paga na REDE do reino, que é nacional, e por isso rende o
    // mesmo em qualquer terra. Ele é a decisão "erguer um", não "erguer AQUI" — e é a
    // segunda que este teste mede. Se um dia o lugar do Mercado passar a importar, esta
    // exclusão é o que tem que cair.
    const melhor = (id: string): string =>
      Object.keys(c.construcoesDisponiveisEm(id))
        .filter((idc) => c.construcoesDisponiveisEm(id)[idc]?.efeito.tipo !== 'troca')
        .map((idc) => ({ idc, g: c.retornoDaConstrucaoEm(id, idc)?.ganhoPorTurno ?? 0 }))
        .reduce((a, b) => (b.g > a.g ? b : a)).idc;

    // Atenas vive de azeite e tem 35.000 habitantes: entre as obras locais, quem manda é
    // a prensa da produção dela.
    expect(melhor('atenas')).toBe('agora');
    // Maratona produz pouco e tem 18.000 habitantes: quem manda é aliviar a corrupção,
    // que come o imposto de quem tem gente demais.
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

    // O ganho prometido tem que ser o ganho ENTREGUE. Em vez de repetir a fórmula aqui —
    // que só provaria que eu sei copiar a fórmula — o teste ergue a obra numa campanha
    // gêmea e confere que a renda subiu exatamente o que a ficha prometeu. Assim ele
    // sobrevive a mudar corrupção, escala de preço ou o número de parcelas.
    const prometido = c.retornoDaConstrucaoEm('atenas', 'lagar')?.ganhoPorTurno ?? 0;
    expect(prometido).toBeGreaterThan(0);
    const antesDaObra = c.rendaDe('atenas');
    const controle = nova();
    controle.comecar('atenas');
    controle.darOuro(50_000);
    c.darOuro(50_000);
    c.construir('atenas', 'lagar');
    for (let i = 0; i < construcoes.construcoes['lagar']!.turnos[0]; i++) {
      c.passarTurno();
      controle.passarTurno();
    }
    // O controle isola o crescimento populacional, que mexeria na renda sem obra nenhuma.
    //
    // Margem de 2: a cotação é feita com a população de HOJE e a obra entrega dois turnos
    // depois, com a população que houver então — e a corrupção, que come as três parcelas,
    // cresce junto com ela. A promessa é honesta, não é exata, e é assim que tem que ser.
    expect(c.rendaDe('atenas') - controle.rendaDe('atenas')).toBeGreaterThanOrEqual(prometido - 2);
    expect(c.rendaDe('atenas') - controle.rendaDe('atenas')).toBeLessThanOrEqual(prometido + 2);
    expect(antesDaObra).toBeGreaterThan(0);

    // A Mina em Sunião mexe na produção — e o comércio sobe junto, porque sai dela.
    //
    // ⚠️ Num catálogo em que a Mina não tira humor: a promessa é honesta e já desconta o humor
    // que ela custa (ver `felicidade.test.ts`), e o que se isola aqui é só a produção.
    const semDesgosto = {
      ...construcoes,
      construcoes: {
        ...construcoes.construcoes,
        mina: { ...construcoes.construcoes['mina']!, humor: undefined },
      },
    };
    const m = new Campanha(new Atlas(provincias), economia, semDesgosto, ajustes, exercitos);
    m.comecar('atenas');
    // As mesmas viradas da campanha de cima: o humor chega perto do alvo, que é onde a
    // promessa faz a conta.
    for (let i = 0; i < construcoes.construcoes['lagar']!.turnos[0]; i++) m.passarTurno();
    const antes = m.economiaDe('sounion');
    const ganho = m.retornoDaConstrucaoEm('sounion', 'mina')?.ganhoPorTurno ?? 0;
    const mina = construcoes.construcoes['mina'];
    if (mina?.efeito.tipo !== 'renda') throw new Error('Mina deveria render moeda');
    const producaoNova = Math.round((antes?.producao ?? 0) * mina.efeito.fatores[0]);
    // ⚠️ **O comércio NÃO sobe junto.** Ele já foi uma fatia da produção, e por isso a Mina
    // levantava as duas parcelas de uma vez; hoje comércio é POSIÇÃO — `transitoBase` vezes
    // uma escala própria — e a Mina mexe só no que a terra dá. Devolvendo a folha ao ganho,
    // sobra exatamente o delta da produção, com um de folga para o arredondamento de cada
    // parcela.
    const folhaDaMina = m.manutencaoDaObraEm('sounion', 'mina', 1);
    const delta = producaoNova - (antes?.producao ?? 0);
    expect(ganho + folhaDaMina).toBeGreaterThanOrEqual(delta - 1);
    expect(ganho + folhaDaMina).toBeLessThanOrEqual(delta + 1);
    expect(m.economiaDe('sounion')?.transito).toBe(antes?.transito);
  });

  it('toda construção erguida cobra manutenção: a renda é líquida', () => {
    const c = nova();
    c.comecar('atenas');
    c.darOuro(20_000); // o preço da obra acompanha a riqueza da terra, e a de Atenas é grande
    c.construir('atenas', 'lagar');
    const agora = construcoes.construcoes['lagar']!;
    for (let i = 0; i < agora.turnos[0]; i++) c.passarTurno();

    const e = c.economiaDe('atenas');
    const folha = c.manutencaoDaObraEm('atenas', 'lagar', 1);
    expect(e?.manutencao).toBe(folha);
    // O total é a soma das três parcelas MENOS a folha — é o que a barra soma no tesouro.
    expect(e?.total).toBe(
      (e?.impostos ?? 0) + (e?.producao ?? 0) + (e?.transito ?? 0) - folha,
    );
    // Obra em andamento ainda não cobra: paga-se pelo que está de pé.
    const semNada = nova();
    semNada.comecar('atenas');
    semNada.darOuro(20_000);
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
        escalaDeObra: 1,
        populacao: 1000,
        corrupcao: 0,
        fatorDeImposto: 1,
        revoltosa: false,
    fatorDoHumor: 1,
        sitiada: true,
        ligada: true,
      },
    );
    expect(sitiada.producao).toBe(0);
    expect(sitiada.transito).toBe(0);
    expect(sitiada.manutencao).toBe(muralha.manutencao[2]);
    expect(sitiada.total).toBe(sitiada.impostos - muralha.manutencao[2]);
    expect(sitiada.total).toBeLessThan(0);
  });

  it('paga à vista e entrega depois: a obra leva turnos', () => {
    const c = nova();
    c.comecar('atenas');
    const antes = c.tesouro;
    const rendaAntes = c.rendaDe('atenas');

    const custo = c.custoDaObraEm('atenas', 'lagar', 1);
    const prazo = construcoes.construcoes['lagar']!.turnos[0];
    c.construir('atenas', 'lagar');
    // o dinheiro sai na hora...
    expect(c.tesouro).toBe(antes - custo);
    // ...e o benefício NÃO chega junto
    expect(c.rendaDe('atenas')).toBe(rendaAntes);
    expect(c.construcoesEm('atenas')).toEqual([]);
    expect(c.obraEm('atenas')).toMatchObject({
      construcao: 'lagar',
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
    expect(c.construcoesEm('atenas')).toEqual(['lagar']);
    // O ganho é medido contra um CONTROLE que passou os mesmos turnos sem construir:
    // comparar com a renda de três turnos atrás mediria também a demografia.
    const semObra = nova();
    semObra.comecar('atenas');
    for (let i = 0; i < prazo; i++) semObra.passarTurno();
    expect(c.rendaDe('atenas')).toBeGreaterThan(semObra.rendaDe('atenas'));
    // Já construída, a conta passa a mostrar o ganho do próximo nível.
    expect(c.retornoDaConstrucaoEm('atenas', 'lagar')?.ganhoPorTurno).toBeGreaterThan(0);
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
    c.construir('atenas', 'lagar');
    expect(c.podeConstruir('atenas', 'mercado')).toMatchObject({ motivo: /em obra aqui/ });
  });

  it('a terra libera apenas as explorações dos seus dois produtos', () => {
    const c = nova();
    c.comecar('atenas');
    expect(Object.keys(c.construcoesDisponiveisEm('atenas'))).toEqual(
      expect.arrayContaining([
        'agora',
        'mercado',
        'muralha',
        'templo',
        'porto',
        'estrada',
        'fazenda',
        'lagar',
      ]),
    );
    expect(c.construcoesDisponiveisEm('atenas')).not.toHaveProperty('mina');
    // ⚠️ **O Quartel VOLTOU**, e é a regra que o trouxe: prédio só fica escondido enquanto
    // o efeito dele é `futuro`. Ele agora treina a tropa levantada na província, e por isso
    // está à venda de novo.
    expect(c.construcoesDisponiveisEm('atenas')).toHaveProperty('quartel');
    // A Armaria também: hoplita é escolha de slot, não permissão do mapa.
    expect(c.construcoesDisponiveisEm('atenas')).toHaveProperty('armaria');
    // Já as duas regionais só aparecem onde a terra dá o bem.
    expect(c.construcoesDisponiveisEm('atenas')).not.toHaveProperty('treinamento-de-cavaleiros');
    expect(c.construcoesDisponiveisEm('argos')).toHaveProperty('treinamento-de-cavaleiros');
    expect(c.construcoesDisponiveisEm('atenas')).not.toHaveProperty('acampamento-de-arqueiro');
    expect(c.construcoesDisponiveisEm('plateia')).toHaveProperty('acampamento-de-arqueiro');
    expect(c.construcoesDisponiveisEm('maratona')).not.toHaveProperty('porto');
    expect(c.construcoesDisponiveisEm('sounion')).toHaveProperty('mina');
    expect(c.construcoesDisponiveisEm('sounion')).toHaveProperty('pedreira');
    expect(c.construcoesDisponiveisEm('sounion')).not.toHaveProperty('fazenda');
  });

  it('quatro prédios ocupam os quatro slots, mas upgrades continuam permitidos', () => {
    const c = nova();
    c.comecar('atenas');
    c.darOuro(100_000);
    for (const id of ['agora', 'mercado', 'templo', 'fazenda']) {
      c.construir('atenas', id);
      const prazo = construcoes.construcoes[id]!.turnos[0];
      for (let i = 0; i < prazo; i++) c.passarTurno();
    }
    expect(c.construcoesEm('atenas')).toHaveLength(4);
    expect(c.podeConstruir('atenas', 'muralha')).toMatchObject({ motivo: /4 slots/ });
    // Subir uma das quatro que JÁ estão de pé continua permitido: upgrade não pede slot
    // novo, e é isso que faz especialização ser um caminho em vez de um beco.
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
    c.construir('atenas', 'lagar');
    expect(c.tesouro).toBe(ajustes.tesouroInicial - c.custoDaObraEm('atenas', 'lagar', 1));
    for (let i = 0; i < construcoes.construcoes['lagar']!.turnos[0] + 10; i++) c.passarTurno();

    expect(c.construcoesEm('atenas')).toEqual(['lagar']);
    expect(c.retornoDaConstrucaoEm('atenas', 'lagar')?.ganhoPorTurno).toBeGreaterThan(0);
  });

  it('a mesma construção sobe até III e então recusa com motivo', () => {
    const c = nova();
    expect(c.podeConstruir('atenas', 'lagar')).toMatchObject({ motivo: /ainda não começou/ });
    c.comecar('atenas');
    c.construir('atenas', 'lagar');
    for (let i = 0; i < construcoes.construcoes['lagar']!.turnos[0]; i++) c.passarTurno();
    expect(c.nivelDaConstrucaoEm('atenas', 'lagar')).toBe(1);
    c.darOuro(20_000);
    expect(c.podeConstruir('atenas', 'lagar')).toMatchObject({ pode: true });
    // O upgrade paga APENAS o nível novo, não a soma dos níveis até ele.
    const antesDoII = c.tesouro;
    c.construir('atenas', 'lagar');
    expect(c.tesouro).toBe(antesDoII - c.custoDaObraEm('atenas', 'lagar', 2));
    for (let i = 0; i < construcoes.construcoes['lagar']!.turnos[1]; i++) c.passarTurno();
    const antesDoIII = c.tesouro;
    c.construir('atenas', 'lagar');
    expect(c.tesouro).toBe(antesDoIII - c.custoDaObraEm('atenas', 'lagar', 3));
    for (let i = 0; i < construcoes.construcoes['lagar']!.turnos[2]; i++) c.passarTurno();
    expect(c.nivelDaConstrucaoEm('atenas', 'lagar')).toBe(3);
    expect(c.podeConstruir('atenas', 'lagar')).toMatchObject({ motivo: /nível máximo/ });
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
      for (const n of [e?.impostos, e?.producao, e?.transito, e?.total]) {
        expect(Number.isInteger(n)).toBe(true);
      }
    }
    expect(Number.isInteger(c.tesouro)).toBe(true);
  });
});
