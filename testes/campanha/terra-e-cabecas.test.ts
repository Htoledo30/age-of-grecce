/**
 * A economia é sobre a TERRA, não sobre o número de cabeças.
 *
 * Henrique apontou o defeito assim: *"em age of history 2 e rome total war 1 tem local que
 * rende muito mais dinheiro e com menos população, e o mesmo ao contrário"*. Medido, o jogo
 * quase não fazia isso — e a causa era a largura dos números, não a fórmula:
 *
 * | dial | faixa que ele tinha |
 * |---|---|
 * | população | 3.000 a 35.000 = 11,7× |
 * | imposto gerado | 8 a 126 = 15,8× |
 * | produção | 30 a 100 = 3,3× |
 * | `valor` do produto | 15 a 28 = **1,87×** |
 *
 * O número que devia carregar a identidade da terra era o mais curto de todos, e população
 * era o único com faixa larga — então ela mandava em tudo, sem ninguém ter decidido isso.
 *
 * Estes testes guardam as RELAÇÕES do conserto, nunca os números dele: quais são os valores
 * de cada produto, quanto vale a escala de comércio e onde a corrupção satura são balanço e
 * vão mudar. O que não pode mudar sem alguém decidir é a forma da economia.
 */

import { describe, expect, it } from 'vitest';

import { ajustes, economia, novaCampanha as nova } from '../apoio/mundo';

describe('a economia é sobre a terra, não sobre cabeças', () => {
  it('a corrupção come as TRÊS parcelas, não só o imposto', () => {
    const c = nova();
    c.comecar('atenas');
    const e = c.economiaDe('atenas')!;
    const ficha = economia.provincias['atenas']!;
    const eco = ajustes.economia;
    const perda = 1 - c.corrupcaoEm('atenas').total;
    expect(perda).toBeLessThan(1); // se Atenas não tiver corrupção, o teste não testa nada

    // Cada parcela chega ao tesouro já mordida. Enquanto a corrupção só pegava o imposto,
    // ela deixou de ser freio de coisa nenhuma no dia em que o imposto virou um quinto da
    // renda — e junto com ela a Ágora e a Estrada, que existem para aliviá-la.
    expect(e.impostos).toBe(Math.round(ficha.populacao * eco.impostoPorHabitante * perda));
    expect(e.producao).toBeLessThan(
      economia.produtos[ficha.produto]!.valor * ficha.nivel +
        economia.produtos[ficha.secundario.produto]!.valor *
          ficha.secundario.nivel *
          eco.pesoDoSecundario,
    );
    expect(e.comercio).toBeLessThan(ficha.comercioBase * eco.escalaDeComercio);
  });

  it('não existe província sem corrupção: o degrau de limiar sumiu', () => {
    const c = nova();
    c.comecar('atenas');
    // Havia um limiar de 10.000 habitantes, e abaixo dele a corrupção era exatamente zero:
    // sete províncias caíam do lado de fora e a Ágora virava armadilha em metade do mapa.
    // Uma vila pequena administra mal também — só perde menos, porque tem menos a perder.
    for (const id of Object.keys(economia.provincias)) {
      expect(c.corrupcaoEm(id).total).toBeGreaterThan(0);
    }
    // E ela ainda cresce com o tamanho: é freio, não pedágio de entrada.
    const grande = c.corrupcaoEm('atenas').porTamanho;
    const pequena = c.corrupcaoEm('hermione').porTamanho;
    expect(grande).toBeGreaterThan(pequena);
  });

  it('o SEGUNDO produto da terra rende — metade da autoria estava desligada', () => {
    const c = nova();
    c.comecar('atenas');
    for (const id of ['atenas', 'hermione', 'caristo']) {
      const ficha = economia.provincias[id]!;
      const so_principal = economia.produtos[ficha.produto]!.valor * ficha.nivel;
      const bruto =
        c.economiaDe(id)!.producao / (1 - c.corrupcaoEm(id).total);
      // Se o secundário não entrasse, o bruto seria o principal e nada mais.
      expect(bruto).toBeGreaterThan(so_principal);
    }
  });

  it('o comércio é POSIÇÃO, não uma fatia da lavoura', () => {
    const c = nova();
    c.comecar('atenas');
    // Duas terras com o mesmo `comercioBase` rendem o mesmo comércio, por mais diferente
    // que seja o que elas plantam. Era `produção × comercioBase`, e por isso Corinto — a
    // potência comercial grega, com o maior `comercioBase` do mapa — tirava um quinto da
    // renda do comércio: um entreposto cujo comércio é um quinto da renda não é entreposto.
    const porBase = new Map<number, string[]>();
    for (const [id, ficha] of Object.entries(economia.provincias)) {
      porBase.set(ficha.comercioBase, [...(porBase.get(ficha.comercioBase) ?? []), id]);
    }
    const gemeas = [...porBase.values()].find((ids) => ids.length > 1);
    expect(gemeas).toBeDefined();
    const [a, b] = gemeas!;
    // Mesma base, mesmo bruto de comércio — o que muda é só a corrupção de cada uma.
    // Margem de 2: cada parcela é arredondada sozinha antes de chegar ao tesouro, e
    // desfazer a corrupção para trás traz o resto do arredondamento junto.
    const brutoA = c.economiaDe(a!)!.comercio / (1 - c.corrupcaoEm(a!).total);
    const brutoB = c.economiaDe(b!)!.comercio / (1 - c.corrupcaoEm(b!).total);
    expect(Math.abs(brutoA - brutoB)).toBeLessThan(2);
  });

  it('uma terra pequena PODE render mais que uma grande — era isto que faltava', () => {
    const c = nova();
    c.comecar('atenas');
    const linhas = Object.keys(economia.provincias).map((id) => ({
      id,
      pop: c.populacaoDe(id),
      total: c.economiaDe(id)!.total,
    }));
    // O caso concreto: Sunião tem metais preciosos e menos da metade da gente de Tebas.
    const suniao = linhas.find((l) => l.id === 'sounion')!;
    const tebas = linhas.find((l) => l.id === 'tebas')!;
    expect(suniao.pop).toBeLessThan(tebas.pop);
    expect(suniao.total).toBeGreaterThan(tebas.total);

    // E não é um acidente isolado: a inversão acontece numa fatia relevante dos pares.
    let inversoes = 0;
    let pares = 0;
    for (const a of linhas) {
      for (const b of linhas) {
        if (a.pop >= b.pop) continue;
        pares++;
        if (a.total > b.total) inversoes++;
      }
    }
    expect(inversoes / pares).toBeGreaterThan(0.15);
  });

  it('o preço da obra acompanha a riqueza da terra, e o ritmo de decisão se aproxima', () => {
    const c = nova();
    c.comecar('atenas');
    // Preço fixo contra renda variável deixava a terra pequena sem decisão nenhuma: Atenas
    // juntava a obra mais barata em 3 turnos e Téspias em 17.
    expect(c.custoDaObraEm('atenas', 'agora', 1)).toBeGreaterThan(
      c.custoDaObraEm('hermione', 'agora', 1),
    );
    // A folha acompanha o preço: obra grande com folha pequena faria a cidade grande
    // construir caro e manter barato.
    expect(c.manutencaoDaObraEm('atenas', 'agora', 1)).toBeGreaterThanOrEqual(
      c.manutencaoDaObraEm('hermione', 'agora', 1),
    );

    // O ritmo: quantos turnos cada poder junta para a obra mais barata da própria capital.
    const ritmos = c
      .poderesVivos()
      .filter((id) => c.semEconomia(id) === 0)
      .map((id) => {
        const campanha = nova();
        campanha.comecar(id);
        const casa = campanha.capitalDe(id) ?? campanha.provinciasDe(id)[0]!;
        const antes = campanha.tesouro;
        campanha.passarTurno();
        const liquido = campanha.tesouro - antes;
        const barata = Math.min(
          ...Object.keys(campanha.construcoesDisponiveisEm(casa)).map((obra) =>
            campanha.custoDaObraEm(casa, obra, 1),
          ),
        );
        return liquido > 0 ? barata / liquido : Number.POSITIVE_INFINITY;
      });
    expect(ritmos.every(Number.isFinite)).toBe(true);
    // Nenhum poder jogável fica esperando o dobro do dobro do mais rápido para decidir.
    expect(Math.max(...ritmos) / Math.min(...ritmos)).toBeLessThan(3);
  });

  it('todo poder jogável tem pelo menos duas obras que se pagam na própria capital', () => {
    const base = nova();
    base.comecar('atenas');
    for (const id of base.poderesVivos().filter((p) => base.semEconomia(p) === 0)) {
      const c = nova();
      c.comecar(id);
      const casa = c.capitalDe(id) ?? c.provinciasDe(id)[0]!;
      const pagam = Object.keys(c.construcoesDisponiveisEm(casa)).filter((obra) => {
        const r = c.retornoDaConstrucaoEm(casa, obra);
        return (r?.ganhoPorTurno ?? 0) > 0;
      });
      // O catálogo do poder mais pobre já teve UMA obra que se pagava, e em 500 turnos.
      // Prédio que nunca se paga não é decisão, é armadilha — e não existe demolir.
      expect(pagam.length, `${id} só tem ${pagam.length} obra(s) que se pagam`).toBeGreaterThanOrEqual(2);
    }
  });
});
