import { describe, expect, it } from 'vitest';

import { obraEscolhida } from '../../src/ia/economia/construir';
import { decretosEscolhidos } from '../../src/ia/economia/imposto';
import { estiloDe } from '../../src/ia/estilo';
import { jogarIA, poderesDaIa } from '../../src/ia/ia';
import { ajustes, ia, novaCampanha } from '../apoio/mundo';

const nova = (jogador = 'atenas') => {
  const c = novaCampanha();
  c.comecar(jogador);
  return c;
};

describe('quem a IA dirige', () => {
  it('todo poder com economia, menos o jogador', () => {
    // ⚠️ Só os poderes com economia COMPLETA. Das 196 províncias desenhadas, 25 são
    // simuladas; os outros 121 poderes não arrecadam e não teriam com que decidir. Soltar a
    // IA neles faria um vizinho engolir meia Grécia vazia, e o mapa viraria sopa.
    const c = nova('atenas');
    const dirigidos = poderesDaIa(c);
    expect(dirigidos).not.toContain('atenas');
    expect(dirigidos).toContain('corinto');
    expect(dirigidos.length).toBeGreaterThan(10);
    for (const id of dirigidos) expect(c.semEconomia(id)).toBe(0);
  });

  it('a mesma ordem sempre: nada aqui pode depender de sorte', () => {
    // Sem isto não há salvamento confiável nem regressão — a mesma regra que a batalha
    // carrega escrita no cabeçalho dela.
    expect(poderesDaIa(nova())).toEqual([...poderesDaIa(nova())]);
    expect(poderesDaIa(nova())).toEqual([...poderesDaIa(nova())].sort());
  });
});

describe('a IA escolhe obra pela conta do próprio jogo', () => {
  it('nunca ergue o que a tooltip do jogador chamaria de prejuízo', () => {
    // ⚠️ A IA pergunta `retornoDaConstrucaoEm`, que é a MESMA função que escreve a tooltip.
    // Se ela cair numa armadilha, a armadilha é real e o jogador cairia junto — é o que faz
    // dela um detector de balanço que joga duzentos turnos por segundo.
    const c = nova('atenas');
    for (const poder of poderesDaIa(c)) {
      const escolha = obraEscolhida(c, poder, estiloDe(ia, poder));
      if (!escolha) continue;
      expect(`${poder}: ${escolha.construcao} vale ${escolha.valor}`).toContain('vale');
      expect(escolha.valor).toBeGreaterThan(0);
    }
  });

  it('guarda uma parte do cofre: obra não pode zerar o caixa da folha', () => {
    // O erro que todo jogador novo comete uma vez — e uma IA que o cometesse todo turno
    // desertaria a tropa dela por falta de pagamento.
    const c = nova('atenas');
    const estilo = estiloDe(ia, 'corinto');
    const escolha = obraEscolhida(c, 'corinto', estilo);
    if (escolha) {
      expect(escolha.custo).toBeLessThanOrEqual(
        c.tesouroDe('corinto') * (1 - estilo.guardaDoTesouro),
      );
    }
  });

  it('come primeiro: com a despensa apertada, a comida atropela a Ágora', () => {
    // ⚠️ A única regra DURA desta etapa. Reino com o saldo alimentar no chão para de crescer
    // e começa a perder gente — perde a corrida sem levar uma batalha.
    const c = nova('atenas');
    const estilo = estiloDe(ia, 'tebas');
    const apertado = { ...estilo, limiarDeAperto: 99 };
    const folgado = { ...estilo, limiarDeAperto: -99 };

    const comAperto = obraEscolhida(c, 'tebas', apertado);
    const semAperto = obraEscolhida(c, 'tebas', folgado);
    expect(comAperto).not.toBeNull();
    expect(c.efeitoDaObra(comAperto!.construcao)).toBe('alimento');
    expect(semAperto?.construcao).not.toBe(comAperto?.construcao);
  });

  it('escolhe por moeda gasta, e não pelo número grande', () => {
    // ⚠️ O primeiro `npm run partida` pegou isto: uma obra de +30 por turno que custa 3.000 é
    // pior que uma de +20 que custa 800 — a segunda se paga na metade do tempo e libera o
    // cofre para a próxima. Escolher pelo valor cru é torrar o caixa na obra mais cara.
    const c = nova('atenas');
    const estilo = estiloDe(ia, 'corinto');
    const escolha = obraEscolhida(c, 'corinto', estilo);
    expect(escolha).not.toBeNull();
    expect(escolha!.porMoeda).toBeCloseTo(escolha!.valor / escolha!.custo, 8);
  });
});

describe('a IA decreta imposto olhando o povo', () => {
  it('alivia onde o humor está baixo, mesmo preferindo cobrar alto', () => {
    // Província que entra na faixa revoltosa faz greve fiscal: o imposto alto passou a render
    // ZERO. Cobrar alto sem olhar o humor é cobrar alto até parar de arrecadar.
    const c = nova('atenas');
    const guerreiro = estiloDe(ia, 'tebas');
    expect(guerreiro.imposto).toBe('alto');

    const semMedo = decretosEscolhidos(c, 'tebas', { ...guerreiro, humorParaAliviar: -1 });
    const comMedo = decretosEscolhidos(c, 'tebas', { ...guerreiro, humorParaAliviar: 101 });
    expect(semMedo.every((d) => d.nivel === 'alto')).toBe(true);
    expect(comMedo.every((d) => d.nivel === 'baixo')).toBe(true);
  });

  it('só o que MUDA entra: repetir o decreto vigente não é decisão', () => {
    const c = nova('atenas');
    const estilo = estiloDe(ia, 'tebas');
    for (const decreto of decretosEscolhidos(c, 'tebas', estilo)) {
      c.definirImposto(decreto.provincia, decreto.nivel, 'tebas');
    }
    expect(decretosEscolhidos(c, 'tebas', estilo)).toEqual([]);
  });
});

describe('a IA joga pela mesma porta que a tela', () => {
  it('constrói de verdade, no cofre do PODER dela', () => {
    // ⚠️ A regra que sustenta tudo: ela chama a mesma fachada, com o poder dito em voz alta.
    // Sem isso ela jogaria um jogo parecido com este em vez deste — e cada defeito que ela
    // encontrasse seria um defeito do caminho dela, não do jogo.
    const c = nova('atenas');
    const antes = c.tesouroDe('corinto');
    const lances = jogarIA(c, ia, ajustes);

    const deCorinto = lances.find((l) => l.poder === 'corinto');
    expect(deCorinto).toBeDefined();
    if (deCorinto?.obra) {
      expect(c.obraEm(deCorinto.obra.provincia)?.construcao).toBe(deCorinto.obra.construcao);
      expect(c.tesouroDe('corinto')).toBeLessThan(antes);
    }
    // E o cofre do jogador não é tocado: a IA não joga por ele.
    expect(lances.some((l) => l.poder === 'atenas')).toBe(false);
  });

  it('vinte turnos depois, os vizinhos deixaram de ser estátuas', () => {
    // A promessa inteira da primeira etapa, num teste só.
    const c = nova('atenas');
    const antes = c.rendaDe('corinto');
    for (let i = 0; i < 20; i++) {
      jogarIA(c, ia, ajustes);
      c.passarTurno();
    }
    expect(c.rendaDe('corinto')).toBeGreaterThan(antes);
    // E ninguém quebrou o cofre no caminho.
    for (const poder of poderesDaIa(c)) expect(c.tesouroDe(poder)).toBeGreaterThanOrEqual(0);
  });
});
