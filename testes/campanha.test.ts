import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { Ajustes, Construcoes, Economia, Exercitos, Provincias } from '../src/dados/esquema';
import { Campanha } from '../src/campanha/campanha';
import { Atlas } from '../src/mundo/atlas';
import { avancarAno, formatarAno } from '../src/campanha/estado-campanha';
import { rendaDaProvincia } from '../src/campanha/economia';
import { lerSalvamento } from '../src/campanha/salvamento';

// Os testes rodam contra os dados DE VERDADE, não contra um cenário inventado: é o que
// faz eles pegarem uma mudança nos dados, e não só uma mudança no código.
function ler<T>(esquema: { parse: (v: unknown) => T }, caminho: string): T {
  return esquema.parse(JSON.parse(readFileSync(resolve(caminho), 'utf8')));
}

const provincias = ler(Provincias, 'assets/mundo/provincias.json');
const economia = ler(Economia, 'dados/economia.json');
const construcoes = ler(Construcoes, 'dados/construcoes.json');
const exercitos = ler(Exercitos, 'dados/exercitos.json');
const ajustes = ler(Ajustes, 'dados/ajustes.json').jogo;

const atlas = new Atlas(provincias);

function nova(): Campanha {
  // Atlas novo a cada campanha: ele é imutável, mas compartilhar instância entre testes
  // esconderia um dia em que ele deixasse de ser.
  return new Campanha(new Atlas(provincias), economia, construcoes, ajustes, exercitos);
}

describe('economia da Ática', () => {
  it('cada parcela sai da sua própria fórmula, e o total é a soma das três', () => {
    // ⚠️ **Derivado dos dados, nunca cravado.** População, nível e comércio-base são
    // balanço e mudam — um teste que crava "175" quebra a cada ajuste sem que nada esteja
    // errado. O que ele guarda é a FÓRMULA de cada parcela.
    const c = nova();

    for (const id of ['atenas', 'maratona', 'sounion']) {
      const ficha = economia.provincias[id];
      const produto = economia.produtos[ficha?.produto ?? ''];
      if (!ficha || !produto) throw new Error(`ficha ausente: ${id}`);

      const r = c.economiaDe(id);
      const producao = produto.valor * ficha.nivel;

      // O imposto é população × taxa × (1 − corrupção) — a fórmula do GDD. A fração de
      // corrupção vem da própria campanha: o teste guarda a fórmula, não o número dela.
      expect(r).toMatchObject({
        impostos: Math.round(
          ficha.populacao *
            ajustes.economia.impostoPorHabitante *
            (1 - c.corrupcaoEm(id).total),
        ),
        producao,
        comercio: Math.round(producao * ficha.comercioBase),
      });
      // O total é a soma das três, e cada parcela é arredondada sozinha — é isso que faz
      // a ficha bater exata com a barra de turno, sem sobra de centavo.
      expect(r?.total).toBe((r?.impostos ?? 0) + (r?.producao ?? 0) + (r?.comercio ?? 0));
    }
  });

  it('a renda de um poder é a soma das províncias dele', () => {
    const c = nova();
    const soma = c
      .provinciasDe('atenas')
      .reduce((total, id) => total + (c.economiaDe(id)?.total ?? 0), 0);
    expect(c.rendaDe('atenas')).toBe(soma);
    expect(soma).toBeGreaterThan(0);
  });

  it('os produtos não valem o mesmo por nível', () => {
    const valores = Object.values(economia.produtos).map((p) => p.valor);
    expect(new Set(valores).size).toBeGreaterThan(1);
    // grão é o mais barato e metal precioso o mais caro — é o que faz o Láurion importar
    expect(economia.produtos['graos']?.valor).toBe(Math.min(...valores));
    expect(economia.produtos['metais-preciosos']?.valor).toBe(Math.max(...valores));
  });

  it('área não entra na conta', () => {
    // Maratona é a MAIOR das três em km² e a que menos rende. Se um dia alguém devolver
    // a fórmula por área, esta asserção cai.
    const porId = new Map(provincias.provincias.map((p) => [p.id, p]));
    const c = nova();
    const maior = ['atenas', 'maratona', 'sounion'].reduce((a, b) =>
      (porId.get(a)?.areaKm2 ?? 0) > (porId.get(b)?.areaKm2 ?? 0) ? a : b,
    );
    expect(maior).toBe('maratona');
    expect(c.economiaDe('maratona')?.total).toBeLessThan(c.economiaDe('atenas')?.total ?? 0);
    expect(c.economiaDe('maratona')?.total).toBeLessThan(c.economiaDe('sounion')?.total ?? 0);
  });

  it('todo dinheiro é inteiro', () => {
    const c = nova();
    c.comecar('atenas');
    for (const id of ['atenas', 'maratona', 'sounion']) {
      const e = c.economiaDe(id);
      expect(e).not.toBeNull();
      for (const n of [e?.impostos, e?.producao, e?.comercio, e?.total]) {
        expect(Number.isInteger(n)).toBe(true);
      }
    }
    // O imposto alto tem fator quebrado (1,35): é onde um arredondamento esquecido viraria
    // centavo — e o teste está aqui pra isso.
    c.definirImposto('atenas', 'alto');
    for (let i = 0; i < 6; i++) c.passarTurno();
    expect(Number.isInteger(c.tesouro)).toBe(true);
    expect(Number.isInteger(c.renda)).toBe(true);
  });
});

describe('províncias sem economia configurada', () => {
  it('a Grécia central inteira tem ficha, e nada além dela', () => {
    // A coroa em volta da Ática: Megáris, Coríntia, Beócia, Eubeia, Opunte, Siciônia e
    // Argólida. O resto do mapa continua sem ficha, e continua dizendo isso com todas as
    // letras em vez de inventar número.
    expect(Object.keys(economia.provincias).sort()).toEqual([
      'argos',
      'atenas',
      'calcis',
      'caristo',
      'cinuria',
      'corinto',
      'eleusis',
      'epidauro',
      'eretria',
      'hermione',
      'histiea',
      'maratona',
      'megara',
      'micenas',
      'opunte',
      'orcomeno',
      'plateia',
      'queroneia',
      'salamina',
      'sicion',
      'sounion',
      'tanagra',
      'tebas',
      'tespias',
      'trezena',
    ]);
  });

  it('conquistar os dois vizinhos PAGA — é o laço central do jogo fechando', () => {
    const c = nova();
    c.comecar('atenas');
    const antes = c.renda;
    for (const id of ['eleusis', 'tanagra']) c.trocarDono(id, 'atenas');
    // Sem isto, tomar terra não muda nada e o jogo não tem para onde ir.
    expect(c.renda).toBeGreaterThan(antes * 1.25);
  });

  it('não recebem economia inventada nem arrecadam', () => {
    const c = nova();
    expect(c.economiaDe('esparta')).toBeNull();
    expect(c.economiaDe('delfos')).toBeNull();
    expect(c.rendaDe('esparta')).toBe(0);
    expect(c.rendaDe('delfos')).toBe(0);
  });

  it('a campanha sabe dizer quantas ainda faltam configurar', () => {
    const c = nova();
    expect(c.semEconomia('atenas')).toBe(0);
    expect(c.semEconomia('esparta')).toBe(c.provinciasDe('esparta').length);
  });
});

describe('o decreto de imposto: receita trocada por pressão social', () => {
  it('toda terra abre no normal, e o fator do nível entra na fórmula do imposto', () => {
    const c = nova();
    c.comecar('atenas');
    expect(c.nivelDeImpostoEm('atenas')).toBe('normal');

    const normal = c.economiaDe('atenas')?.impostos ?? 0;
    c.definirImposto('atenas', 'alto');
    const alto = c.economiaDe('atenas')?.impostos ?? 0;
    c.definirImposto('atenas', 'baixo');
    const baixo = c.economiaDe('atenas')?.impostos ?? 0;

    expect(baixo).toBeLessThan(normal);
    expect(alto).toBeGreaterThan(normal);
    // A fórmula inteira, com o fator do ajuste — o teste guarda a regra, não o número.
    expect(alto).toBe(
      Math.round(
        c.populacaoDe('atenas') *
          ajustes.economia.impostoPorHabitante *
          (1 - c.corrupcaoEm('atenas').total) *
          ajustes.economia.imposto.niveis.alto.fator,
      ),
    );
    // Só a parcela do imposto muda: produção e comércio não são do coletor.
    expect(c.economiaDe('atenas')?.producao).toBe(nova().economiaDe('atenas')?.producao);
  });

  it('o efeito é IMEDIATO na renda e gradual no humor: o alvo muda no clique', () => {
    const c = nova();
    c.comecar('atenas');
    const alvoNormal = c.alvoDeFelicidadeEm('atenas');
    c.definirImposto('atenas', 'alto');
    expect(c.alvoDeFelicidadeEm('atenas')).toBe(
      alvoNormal -
        ajustes.economia.imposto.niveis.normal.humor +
        ajustes.economia.imposto.niveis.alto.humor,
    );
    c.definirImposto('atenas', 'baixo');
    expect(c.alvoDeFelicidadeEm('atenas')).toBeGreaterThan(alvoNormal);
  });

  it('imposto e construção se compõem: a Ágora multiplica o que o decreto rende', () => {
    const c = nova();
    c.comecar('atenas');
    c.construir('atenas', 'agora');
    const agora = construcoes.construcoes['agora']!;
    for (let i = 0; i < agora.turnos[0]; i++) c.passarTurno();
    c.definirImposto('atenas', 'alto');

    if (agora.efeito.tipo !== 'renda') throw new Error('Ágora deveria render moeda');
    expect(c.economiaDe('atenas')?.impostos).toBe(
      Math.round(
        c.populacaoDe('atenas') *
          ajustes.economia.impostoPorHabitante *
          (1 - c.corrupcaoEm('atenas').total) *
          ajustes.economia.imposto.niveis.alto.fator *
          agora.efeito.fatores[0],
      ),
    );
  });

  it('a conquista zera o decreto: a administração nova começa no normal', () => {
    const c = nova();
    c.comecar('atenas');
    c.definirImposto('maratona', 'alto');
    c.trocarDono('maratona', 'megara');
    expect(c.nivelDeImpostoEm('maratona')).toBe('normal');
  });

  it('recusa com motivo em vez de sumir', () => {
    const c = nova();
    expect(c.podeDefinirImposto('atenas')).toMatchObject({ pode: false });
    c.comecar('atenas');
    expect(c.podeDefinirImposto('esparta')).toMatchObject({ motivo: /não tem economia/ });
    expect(c.podeDefinirImposto('eleusis')).toMatchObject({ motivo: /não é sua/ });
    expect(() => c.definirImposto('eleusis', 'alto')).toThrow(/não é sua/);
  });

  it('o decreto viaja no salvamento, e o normal não ocupa registro', () => {
    const c = nova();
    c.comecar('atenas');
    c.definirImposto('atenas', 'alto');
    c.definirImposto('maratona', 'baixo');
    c.definirImposto('maratona', 'normal'); // voltar ao normal LIMPA a entrada

    const salvo = lerSalvamento(c.serializar());
    expect(salvo.nivelDeImposto).toEqual({ atenas: 'alto' });

    const retomada = nova();
    retomada.restaurar(salvo);
    expect(retomada.nivelDeImpostoEm('atenas')).toBe('alto');
    expect(retomada.nivelDeImpostoEm('maratona')).toBe('normal');
  });
});

describe('calendário e turno', () => {
  it('escreve o ano como se lê em voz alta e nunca passa pelo ano zero', () => {
    expect(formatarAno(-700)).toBe('700 a.C.');
    expect(formatarAno(-1)).toBe('1 a.C.');
    expect(formatarAno(1)).toBe('1 d.C.');
    expect(avancarAno(-1, 1)).toBe(1);
  });

  it('abre sem jogador e começa no turno 1 com 3.000 moedas', () => {
    const c = nova();
    expect(c.iniciada).toBe(false);
    expect(c.turno).toBe(0);
    c.comecar('atenas');
    expect(c.turno).toBe(1);
    expect(c.ano).toBe(-700);
    expect(c.tesouro).toBe(ajustes.tesouroInicial);
    expect(c.renda).toBe(c.rendaDe('atenas'));
    expect(c.renda).toBeGreaterThan(0);
  });

  it('arrecada ANTES de virar o calendário', () => {
    const c = nova();
    c.comecar('atenas');
    const antes = c.tesouro;
    const renda = c.renda;
    c.passarTurno();
    expect(c.turno).toBe(2);
    expect(c.ano).toBe(-699);
    // Atenas não tem tropa no turno 1, então a renda entra inteira.
    expect(c.tesouro).toBe(antes + renda);
  });

  it('recusa começar duas vezes e passar turno antes de começar', () => {
    const c = nova();
    expect(() => c.passarTurno()).toThrow(/ainda não começou/);
    c.comecar('atenas');
    expect(() => c.comecar('esparta')).toThrow(/já começou/);
  });
});

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
    expect(e?.total).toBe((e?.impostos ?? 0) + (e?.producao ?? 0) + (e?.comercio ?? 0) - agora.manutencao[0]);
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
      expect.arrayContaining(['agora', 'mercado', 'quartel', 'muralha', 'templo', 'porto', 'estrada', 'fazenda', 'lagar']),
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
    expect(c.rendaDe('atenas')).toBe(nova().rendaDe('atenas') - sobAtenas);
    // Mégara agora tem renda própria: o ganho dela é exatamente a Maratona SOB Mégara.
    expect(c.rendaDe('megara')).toBe(nova().rendaDe('megara') + sobMegara);
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
    const total = () => atlas.poderes.reduce((s, p) => s + c.provinciasDe(p.id).length, 0);
    expect(total()).toBe(205);
    c.trocarDono('megara', 'atenas');
    c.trocarDono('esparta', 'atenas');
    // Nenhuma província some nem aparece em dois donos ao mesmo tempo.
    expect(total()).toBe(205);
  });
});
