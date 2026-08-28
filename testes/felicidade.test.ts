import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { Ajustes, Construcoes, Economia, Exercitos, Provincias } from '../src/dados/esquema';
import { Campanha } from '../src/campanha/campanha';
import {
  alvoDeFelicidade,
  aproximarFelicidade,
  parcelasDoAlvo,
  revoltosa,
} from '../src/campanha/felicidade';
import { lerSalvamento } from '../src/campanha/salvamento';
import { Atlas } from '../src/mundo/atlas';
import { ordenar } from './apoio/hostes';

function ler<T>(esquema: { parse: (v: unknown) => T }, caminho: string): T {
  return esquema.parse(JSON.parse(readFileSync(resolve(caminho), 'utf8')));
}

const provincias = ler(Provincias, 'assets/mundo/provincias.json');
const economia = ler(Economia, 'dados/economia.json');
const construcoes = ler(Construcoes, 'dados/construcoes.json');
const exercitos = ler(Exercitos, 'dados/exercitos.json');
const ajustes = ler(Ajustes, 'dados/ajustes.json').jogo;
const felicidade = ajustes.felicidade;

function nova(jogador = 'atenas'): Campanha {
  const c = new Campanha(new Atlas(provincias), economia, construcoes, ajustes, exercitos);
  c.comecar(jogador);
  return c;
}

/**
 * Uma província tomada e MAL GOVERNADA: sob bandeira alheia e com imposto alto, o alvo dela
 * fica na faixa insatisfeita e lá continua.
 *
 * ⚠️ Existe porque o pavio deixou de correr para quem está MELHORANDO: uma cidade que caiu
 * ontem e caminha para "Neutra" não pega em armas, por mais fundo que o choque da queda a
 * tenha jogado. Quem ferve é quem vai ficar fervendo, e é isso que este cenário monta.
 */
function condenada(): Campanha {
  const c = nova();
  c.trocarDono('eleusis', 'atenas');
  c.definirImposto('eleusis', 'alto');
  return comHumor(c, 'eleusis', 5);
}

/** Turnos na faixa em que a condenada vive até o levante. */
const prazoDaCondenada = felicidade.faixas[1]?.levanteEm ?? 0;

/**
 * Turnos na faixa mais infeliz até o levante — o pavio agora é da FAIXA, e não um número
 * solto: a revoltosa ferve rápido, a insatisfeita ferve devagar, e as de cima não fervem.
 */
const prazoDaRevoltosa = felicidade.faixas[0]?.levanteEm ?? 0;

/** Reescreve o humor de uma província pelo caminho oficial: salvar, editar, restaurar. */
function comHumor(campanha: Campanha, idProvincia: string, humor: number): Campanha {
  const salvo = lerSalvamento(campanha.serializar());
  salvo.felicidade[idProvincia] = humor;
  campanha.restaurar(salvo);
  return campanha;
}

describe('o alvo e o passo do humor', () => {
  // Uma província em paz, de dono legítimo, sem tropa e do TAMANHO da menor faixa: é o
  // único estado em que o alvo é a base pura, e é dele que os testes partem.
  const parada = {
    passaFome: false,
    sitiada: false,
    dominioEstrangeiro: false,
    construcoes: {},
    humorDoImposto: 0,
    guarnicao: 0,
    reinoEmGuerra: false,
    isoladaDaCapital: false,
    tamanho: 1,
  };

  it('o alvo soma a situação sobre a base, e o Templo entra pelos pontos dele', () => {
    const catalogo = construcoes.construcoes;
    expect(alvoDeFelicidade(parada, catalogo, felicidade)).toBe(felicidade.alvoBase);
    expect(
      alvoDeFelicidade({ ...parada, passaFome: true, sitiada: true }, catalogo, felicidade),
    ).toBe(felicidade.alvoBase + felicidade.alvo.fome + felicidade.alvo.sitiada);
    const templo = catalogo['templo'];
    if (templo?.efeito.tipo !== 'felicidade') throw new Error('Templo deveria dar felicidade');
    expect(
      alvoDeFelicidade({ ...parada, construcoes: { templo: 2 } }, catalogo, felicidade),
    ).toBe(felicidade.alvoBase + templo.efeito.pontos[1]);
  });

  it('o alvo nunca sai de 0 a 100, por pior ou melhor que a situação esteja', () => {
    const catalogo = construcoes.construcoes;
    const inferno = alvoDeFelicidade(
      {
        passaFome: true,
        sitiada: true,
        dominioEstrangeiro: true,
        construcoes: {},
        guarnicao: 0,
        humorDoImposto: -8,
        reinoEmGuerra: true,
        isoladaDaCapital: true,
        tamanho: 5,
      },
      catalogo,
      felicidade,
    );
    expect(inferno).toBeGreaterThanOrEqual(0);
    expect(inferno).toBeLessThanOrEqual(100);
  });

  it('o humor anda no máximo um passo por turno e nunca passa do alvo', () => {
    expect(aproximarFelicidade(50, 60, 4)).toBe(54);
    expect(aproximarFelicidade(58, 60, 4)).toBe(60);
    expect(aproximarFelicidade(60, 50, 4)).toBe(56);
    expect(aproximarFelicidade(51, 50, 4)).toBe(50);
    expect(aproximarFelicidade(50, 50, 4)).toBe(50);
  });

  it('o alvo é a soma de parcelas NOMEADAS — a conta que a ficha mostra', () => {
    const catalogo = construcoes.construcoes;
    const situacao = {
      passaFome: true,
      sitiada: true,
      dominioEstrangeiro: true,
      construcoes: { templo: 1 },
      humorDoImposto: -8,
      guarnicao: 0.01,
      reinoEmGuerra: true,
      isoladaDaCapital: true,
      tamanho: 3,
    };
    const parcelas = parcelasDoAlvo(situacao, catalogo, felicidade);
    const soma = parcelas.reduce((total, p) => total + p.pontos, 0);
    expect(alvoDeFelicidade(situacao, catalogo, felicidade)).toBe(
      Math.max(0, Math.min(100, soma)),
    );
    const rotulos = parcelas.map((p) => p.rotulo);
    for (const rotulo of [
      'base',
      'fome',
      'cidade sitiada',
      'domínio estrangeiro',
      'nível de imposto',
      'Templo',
    ]) {
      expect(rotulos).toContain(rotulo);
    }
    // Situação parada não lista ruído: só a base.
    expect(parcelasDoAlvo(parada, catalogo, felicidade)).toEqual([
      { rotulo: 'base', pontos: felicidade.alvoBase },
    ]);
  });

  it('a faixa revoltosa é a primeira das faixas com nome', () => {
    const limiar = felicidade.faixas[0]?.ate ?? 0;
    expect(revoltosa(limiar, felicidade)).toBe(true);
    expect(revoltosa(limiar + 1, felicidade)).toBe(false);
  });
});

describe('o humor dentro da campanha', () => {
  it('anda um passo por turno em direção ao alvo da situação', () => {
    const c = nova();
    const antes = c.perfilDe('atenas')?.felicidade.valor ?? 0;
    const alvo = c.alvoDeFelicidadeEm('atenas');
    c.passarTurno();
    expect(c.perfilDe('atenas')?.felicidade.valor).toBe(
      aproximarFelicidade(antes, alvo, felicidade.passoPorTurno),
    );
  });

  it('a conquista dá o choque na hora, e o humor segue dali gradualmente', () => {
    const c = nova();
    c.darOuro(100_000);
    const antes = c.perfilDe('eleusis')?.felicidade.valor ?? 0;
    c.plantarHoste('atenas', 'atenas', 500);
    ordenar(c, 'atenas', 'eleusis', 500, 'atenas', 'assaltar');
    c.passarTurno();

    expect(c.donoDe('eleusis')).toBe('atenas');
    // O choque veio na conquista; o passo do turno veio depois, rumo ao alvo novo (que
    // já inclui o domínio estrangeiro).
    const choque = Math.max(0, antes - felicidade.choqueDaConquista);
    expect(c.perfilDe('eleusis')?.felicidade.valor).toBe(
      aproximarFelicidade(choque, c.alvoDeFelicidadeEm('eleusis'), felicidade.passoPorTurno),
    );
    expect(c.dominioEstrangeiroEm('eleusis')).toBe(true);
  });

  it('província revoltosa entra em greve fiscal: imposto zero, o resto continua', () => {
    const c = comHumor(nova(), 'atenas', 5);
    expect(c.emRevoltaEm('atenas')).toBe(true);
    const e = c.economiaDe('atenas');
    expect(e?.impostos).toBe(0);
    expect(e?.revoltosa).toBe(true);
    expect(e?.producao).toBeGreaterThan(0);
    expect(e?.transito).toBeGreaterThan(0);
  });

  it('sob bandeira alheia, a revolta arma um levante depois do pavio queimar', () => {
    const c = condenada();

    // O pavio: um turno descontente por vez, até o limite da faixa.
    let populacaoAntes = c.populacaoDe('eleusis');
    for (let i = 0; i < prazoDaCondenada; i++) {
      expect(c.hostesEm('eleusis').some((h) => h.poder === 'eleusis')).toBe(false);
      // Medida na véspera, e não no começo do pavio: entre a primeira fagulha e o levante a
      // província vive vários turnos, e o crescimento natural esconderia os rebeldes que
      // saíram da população.
      populacaoAntes = c.populacaoDe('eleusis');
      c.passarTurno();
    }

    const rebeldes = c.hostesEm('eleusis').find((h) => h.poder === 'eleusis');
    expect(rebeldes).toBeDefined();
    // Os rebeldes SAÍRAM da população: o manancial humano é um só.
    expect(c.populacaoDe('eleusis')).toBeLessThan(populacaoAntes);
    // O poder antigo voltou ao jogo pela arma do povo.
    expect(c.vivo('eleusis')).toBe(true);
    expect(c.revoltas).toContainEqual({
      provincia: 'eleusis',
      poder: 'eleusis',
      homens: c.forcaDaHoste(rebeldes?.id ?? ''),
    });
  });

  it('o levante SENTA na cidade: ele não é uma estátua', () => {
    // ⚠️ Henrique achou jogando: *"a província se revoltou e criou um exército no local, só
    // que o exército está na minha província e não tomou a província"*. Uma hoste solta em
    // terra alheia, sem ordem e sem cerco, não luta e não toma nada — `quemLuta` responde que
    // ela não quer briga. Ela ficava lá, para sempre.
    //
    // Sitiando, o resto do jogo já sabe o que fazer: a cidade para de produzir e de mandar o
    // trânsito ao tesouro, o dono pode esmagá-los com surtida ou socorro, e eles assaltam
    // quando a muralha permitir. A revolta virou a pergunta que devia ser: esmaga ou perde.
    const c = condenada();
    for (let i = 0; i < prazoDaCondenada; i++) c.passarTurno();

    const cerco = c.cercoEm('eleusis');
    expect(cerco).toBeDefined();
    expect(cerco?.sitiante).toBe('eleusis');
    // E a cidade sentiu na hora: sitiada não produz nem manda trânsito.
    expect(c.economiaDe('eleusis')?.producao).toBe(0);
    expect(c.economiaDe('eleusis')?.transito).toBe(0);
    // A província continua sendo do jogador — o levante ainda precisa tomá-la.
    expect(c.donoDe('eleusis')).toBe('atenas');
  });

  it('província revoltosa de dono legítimo faz greve, mas não arma levante', () => {
    const c = comHumor(nova(), 'atenas', 5);
    for (let i = 0; i < prazoDaRevoltosa + 2; i++) c.passarTurno();
    // Não há bandeira antiga contra a atual: ninguém pega em armas.
    expect(c.hostesEm('atenas').length).toBe(0);
  });
});

describe('vitória e derrota mínimas', () => {
  it('sem campanha não há resultado; em campanha normal, também não', () => {
    const c = nova();
    expect(c.resultado()).toBeNull();
  });

  it('dominar toda a Grécia central configurada é a vitória', () => {
    const c = nova();
    for (const id of Object.keys(economia.provincias)) c.trocarDono(id, 'atenas');
    expect(c.resultado()).toBe('vitoria');
  });

  it('a vitória agora EXIGE Salamina: com o mar, ela deixou de ser inalcançável', () => {
    // ⚠️ Este teste dizia o contrário até as zonas marítimas existirem — Salamina ficava
    // fora da régua porque nenhum exército do mapa podia pisar nela. Hoje ela encosta no
    // Estreito de Salamina, e quem tiver Porto na Ática chega lá: ilha intocável ao lado da
    // capital era um buraco, não uma regra.
    const c = nova();
    for (const id of Object.keys(economia.provincias)) {
      if (id !== 'salamina') c.trocarDono(id, 'atenas');
    }
    expect(c.donoDe('salamina')).toBe('megara');
    expect(c.resultado()).toBeNull();
    c.trocarDono('salamina', 'atenas');
    expect(c.resultado()).toBe('vitoria');
  });

  it('deixar de existir é a derrota', () => {
    const c = nova();
    for (const id of [...c.provinciasDe('atenas')]) c.trocarDono(id, 'megara');
    // Sem chão e sem tropa nenhuma: Atenas não está mais no jogo.
    expect(c.vivo('atenas')).toBe(false);
    expect(c.resultado()).toBe('derrota');
  });

  it('o exilado ainda não perdeu: hoste em pé é jogo em andamento', () => {
    const c = nova();
    c.plantarHoste('sounion', 'atenas', 500);
    for (const id of [...c.provinciasDe('atenas')]) c.trocarDono(id, 'megara');
    expect(c.noExilio('atenas')).toBe(true);
    expect(c.resultado()).toBeNull();
  });
});

describe('as revoltas viajam no salvamento', () => {
  it('o pavio aceso vai e volta; salvamento antigo sem o campo ainda carrega', () => {
    const c = condenada();
    c.passarTurno(); // pavio 1

    const salvo = lerSalvamento(c.serializar());
    expect(salvo.revoltas['eleusis']).toBe(1);

    // Um salvamento de antes do sistema de revoltas: o campo simplesmente não existe.
    const antigo = JSON.parse(c.serializar()) as { estado: Record<string, unknown> };
    delete antigo.estado['revoltas'];
    const relido = lerSalvamento(JSON.stringify(antigo));
    expect(relido.revoltas).toEqual({});
  });
});

describe('a guarnição é ordem pública', () => {
  const parada = {
    passaFome: false,
    sitiada: false,
    dominioEstrangeiro: false,
    construcoes: {},
    humorDoImposto: 0,
    guarnicao: 0,
    reinoEmGuerra: false,
    isoladaDaCapital: false,
    tamanho: 1,
  };

  it('tropa do dono parada na terra acalma o povo, proporcional ao tamanho da cidade', () => {
    // ⚠️ É a ÚNICA coisa que o jogador pode fazer contra o descontentamento no mesmo turno.
    // Templo leva turnos, imposto baixo custa renda, e o domínio estrangeiro não sai enquanto
    // a terra não assimilar — antes disto, conquistar uma província e vê-la ferver era
    // esperar e torcer. Pedido de Henrique jogando.
    const catalogo = construcoes.construcoes;
    const semTropa = alvoDeFelicidade(parada, catalogo, felicidade);
    const comPouca = alvoDeFelicidade(
      { ...parada, guarnicao: felicidade.alvo.guarnicaoPlena / 2 },
      catalogo,
      felicidade,
    );
    const comCheia = alvoDeFelicidade(
      { ...parada, guarnicao: felicidade.alvo.guarnicaoPlena },
      catalogo,
      felicidade,
    );
    expect(comPouca).toBeGreaterThan(semTropa);
    expect(comCheia).toBeGreaterThan(comPouca);
    // E tem teto: a partir da guarnição cheia, mais lança na rua não acalma mais ninguém.
    expect(alvoDeFelicidade({ ...parada, guarnicao: 1 }, catalogo, felicidade)).toBe(comCheia);
  });

  it('a ficha explica a parcela, como explica todas as outras', () => {
    const parcelas = parcelasDoAlvo(
      { ...parada, guarnicao: felicidade.alvo.guarnicaoPlena },
      construcoes.construcoes,
      felicidade,
    );
    expect(parcelas.map((p) => p.rotulo)).toContain('guarnição');
  });
});
