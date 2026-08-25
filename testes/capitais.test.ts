import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { Ajustes, Construcoes, Economia, Exercitos, Provincias } from '../src/dados/esquema';
import { Campanha } from '../src/campanha/campanha';
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

function nova(): Campanha {
  return new Campanha(new Atlas(provincias), economia, construcoes, ajustes, exercitos);
}

/**
 * A capital ainda NÃO faz nada no jogo — ver `src/campanha/capitais.ts`. Estes testes
 * guardam o estado e a regra de derivação para o fluxo futuro de perda e substituição.
 */

describe('todo poder com província tem capital', () => {
  it('a província homônima manda, e é o caso comum', () => {
    const c = nova();
    expect(c.capitalDe('atenas')).toBe('atenas');
    expect(c.capitalDe('eleusis')).toBe('eleusis');
    expect(c.capitalDe('esparta')).toBe('esparta');
  });

  it('sem homônima, a maior por área — e o desempate é por id', () => {
    const c = nova();
    // Acaia tem Dime (560), Égio (1.427) e Patras (734). A maior é Égio.
    expect(c.capitalDe('acaia')).toBe('egio');
  });

  it('todos os 139 recebem uma, e sempre uma província que é deles', () => {
    const c = nova();
    const atlas = new Atlas(provincias);
    for (const poder of atlas.poderes) {
      const capital = c.capitalDe(poder.id);
      expect(capital).toBeDefined();
      if (capital) expect(c.donoDe(capital)).toBe(poder.id);
    }
  });

  it('poder sem província nenhuma não recebe capital: não há o que apontar', () => {
    expect(nova().capitalDe('poder-que-nao-existe')).toBeUndefined();
  });

  it('a derivação é determinística: duas campanhas dão a mesma tabela', () => {
    const atlas = new Atlas(provincias);
    const uma = nova();
    const outra = nova();
    for (const poder of atlas.poderes) {
      expect(uma.capitalDe(poder.id)).toBe(outra.capitalDe(poder.id));
    }
  });
});

describe('a capital perdida é uma PERGUNTA, não uma reatribuição', () => {
  it('conquistar a capital alheia marca a perda, e nada acontece sozinho', () => {
    const c = nova();
    c.comecar('atenas');
    expect(c.capitalPerdida('eleusis')).toBe(false);

    c.trocarDono('eleusis', 'atenas');

    expect(c.capitalPerdida('eleusis')).toBe(true);
    // ⚠️ NÃO se reatribui no clique. A resposta é da VIRADA: o jogador escolhe, os
    // demais reassentam quando o turno passa.
    expect(c.capitalDe('eleusis')).toBe('eleusis');
  });

  it('quem ainda tem a sua não perdeu nada', () => {
    const c = nova();
    c.comecar('atenas');
    c.trocarDono('maratona', 'tanagra'); // perdeu uma província, não a capital
    expect(c.capitalPerdida('atenas')).toBe(false);
  });
});

describe('a capital caída trava a virada do jogador', () => {
  it('sem sede não se passa o turno; assentar outra destrava, de graça', () => {
    const c = nova();
    c.comecar('atenas');
    c.trocarDono('atenas', 'tanagra'); // a capital do jogador cai

    expect(c.capitalPerdida('atenas')).toBe(true);
    expect(() => c.passarTurno()).toThrow(/assente outra/);

    // A escolha forçada é GRÁTIS: perder a capital já foi o castigo.
    expect(c.custoDeMudancaDeCapital()).toBe(0);
    const antes = c.tesouro;
    c.mudarCapital('maratona');
    expect(c.tesouro).toBe(antes);
    expect(c.capitalDe('atenas')).toBe('maratona');
    expect(c.capitalPerdida('atenas')).toBe(false);
    expect(() => c.passarTurno()).not.toThrow();
  });

  it('retomar a própria capital também destrava, sem escolher nada', () => {
    const c = nova();
    c.comecar('atenas');
    c.trocarDono('atenas', 'tanagra');
    expect(() => c.passarTurno()).toThrow(/capital/);
    c.trocarDono('atenas', 'atenas'); // reconquista de desenvolvimento
    expect(c.capitalPerdida('atenas')).toBe(false);
    expect(() => c.passarTurno()).not.toThrow();
  });
});

describe('a mudança voluntária tem preço; a dos outros é derivada', () => {
  it('mudar por vontade própria cobra o custo do ajuste', () => {
    const c = nova();
    c.comecar('atenas');
    const custo = ajustes.capital.custoDeMudanca;
    expect(c.custoDeMudancaDeCapital()).toBe(custo);
    const antes = c.tesouro;
    c.mudarCapital('sounion');
    expect(c.tesouro).toBe(antes - custo);
    expect(c.capitalDe('atenas')).toBe('sounion');
  });

  it('recusa com motivo: alheia, a própria sede, sitiada e tesouro curto', () => {
    const c = nova();
    expect(c.podeMudarCapital('atenas')).toMatchObject({ pode: false });
    c.comecar('atenas');
    expect(c.podeMudarCapital('esparta')).toMatchObject({ motivo: /não é sua/ });
    expect(c.podeMudarCapital('atenas')).toMatchObject({ motivo: /já é a capital/ });

    const pobre = nova();
    pobre.comecar('atenas');
    // Zera o cofre em vez de gastar numa obra: o preço das obras acompanha a riqueza da
    // terra, e "quanto sobra depois de construir" virou balanço que muda sozinho.
    pobre.darOuro(-pobre.tesouro);
    expect(pobre.podeMudarCapital('sounion')).toMatchObject({ motivo: /faltam/ });
  });

  it('não se assenta a capital numa cidade sitiada', () => {
    const c = nova();
    c.comecar('atenas');
    c.plantarHoste('tanagra', 'tanagra', 400);
    ordenar(c, 'tanagra', 'maratona', 400, 'tanagra', 'sitiar');
    c.passarTurno();
    expect(c.cercoEm('maratona')).toBeDefined();
    expect(c.podeMudarCapital('maratona')).toMatchObject({ motivo: /sitiada/ });
  });

  it('quem não é o jogador reassenta na virada, pela regra derivada', () => {
    const c = nova();
    c.comecar('atenas');
    // Mégara tem mais de uma província; a homônima é a capital.
    expect(c.capitalDe('megara')).toBe('megara');
    c.trocarDono('megara', 'atenas');
    expect(c.capitalPerdida('megara')).toBe(true);

    c.passarTurno();

    const nova_ = c.capitalDe('megara');
    expect(nova_).toBeDefined();
    if (nova_) expect(c.donoDe(nova_)).toBe('megara');
    expect(c.capitalPerdida('megara')).toBe(false);
  });

  it('poder sem chão fica sem capital; a notícia da queda é efêmera', () => {
    const c = nova();
    c.comecar('atenas');
    c.darOuro(100_000);
    c.plantarHoste('atenas', 'atenas', 500);
    ordenar(c, 'atenas', 'eleusis', 500, 'atenas', 'assaltar');
    c.passarTurno();

    expect(c.donoDe('eleusis')).toBe('atenas');
    // A queda da capital de Elêusis é notícia desta virada...
    expect(c.quedasDeCapital).toContainEqual({ poder: 'eleusis', provincia: 'eleusis' });
    // ...e o poder, sem chão nenhum, fica sem capital em vez de apontar terra alheia.
    expect(c.capitalDe('eleusis')).toBeUndefined();

    c.passarTurno();
    expect(c.quedasDeCapital).toEqual([]);
  });
});
