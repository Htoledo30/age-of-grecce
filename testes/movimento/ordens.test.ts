import { describe, expect, it } from 'vitest';

import { cancelar, ordemDe, ordenar, podeOrdenar, unicaEm } from '../apoio/hostes';
import { comHoste } from './apoio';

describe('a ordem é registrada, e nada se move', () => {
  it('ordenar não muda o mapa — é esse o ponto da resolução simultânea', () => {
    const c = comHoste(1000);
    ordenar(c, 'atenas', 'maratona', 1000);

    expect(c.forcaEm('atenas')).toBe(1000); // ainda aqui
    expect(c.forcaEm('maratona')).toBe(0);
    expect(ordemDe(c, 'atenas')).toEqual({
      origem: 'atenas',
      rota: ['maratona'],
      homens: 1000,
      postura: 'sitiar' as const,
      // `null` é o padrão: lutar até a linha ceder. Recuar é ordem que se dá.
      recuarAos: null,
    });
  });

  it('a ordem só acontece quando o turno vira', () => {
    const c = comHoste(1000);
    ordenar(c, 'atenas', 'maratona', 1000);
    c.passarTurno();

    expect(c.forcaEm('atenas')).toBe(0);
    expect(c.forcaEm('maratona')).toBe(1000);
    expect(unicaEm(c, 'maratona')?.poder).toBe('atenas');
    // E a terra natal não muda com a marcha: estes homens continuam devendo a Atenas.
    expect(porTerraOuVazio(unicaEm(c, 'maratona'))).toEqual({ atenas: 1000 });
  });

  it('nenhuma ordem sobrevive à virada', () => {
    const c = comHoste(1000);
    ordenar(c, 'atenas', 'maratona', 1000);
    c.passarTurno();
    expect(c.ordens()).toEqual([]);
    // Sem isto a ordem executaria de novo, e o sintoma seria tropa andando sozinha.
    c.passarTurno();
    expect(c.forcaEm('maratona')).toBe(1000);
  });

  it('cancelar desfaz sem custo, porque nada foi gasto', () => {
    const c = comHoste(1000);
    ordenar(c, 'atenas', 'maratona', 1000);
    const tesouro = c.tesouro;
    cancelar(c, 'atenas');
    expect(ordemDe(c, 'atenas')).toBeUndefined();
    expect(c.tesouro).toBe(tesouro);
    c.passarTurno();
    expect(c.forcaEm('atenas')).toBe(1000);
  });

  it('só se marcha parte da hoste, e o resto fica defendendo', () => {
    const c = comHoste(1000);
    ordenar(c, 'atenas', 'maratona', 400);
    c.passarTurno();
    expect(c.forcaEm('atenas')).toBe(600);
    expect(c.forcaEm('maratona')).toBe(400);
  });
});

describe('viagem automática entre várias províncias', () => {
  function caminhoAteCorinto() {
    const c = comHoste(1000);
    c.trocarDono('eleusis', 'atenas');
    c.trocarDono('megara', 'atenas');
    c.trocarDono('corinto', 'atenas');
    return c;
  }

  it('uma ordem distante anda sozinha, um trecho por virada, até chegar', () => {
    const c = caminhoAteCorinto();
    ordenar(c, 'atenas', 'corinto', 400);

    c.passarTurno();
    expect(c.forcaEm('atenas', 'atenas')).toBe(600);
    expect(c.forcaEm('eleusis', 'atenas')).toBe(400);
    expect(ordemDe(c, 'eleusis')).toMatchObject({
      origem: 'eleusis',
      rota: ['megara', 'corinto'],
      homens: 400,
    });

    c.passarTurno();
    expect(c.forcaEm('megara', 'atenas')).toBe(400);
    expect(ordemDe(c, 'megara')).toMatchObject({ rota: ['corinto'] });

    c.passarTurno();
    expect(c.forcaEm('corinto', 'atenas')).toBe(400);
    expect(ordemDe(c, 'corinto')).toBeUndefined();
  });

  it('o jogador pode cancelar a viagem durante uma parada', () => {
    const c = caminhoAteCorinto();
    ordenar(c, 'atenas', 'corinto', 400);
    c.passarTurno();

    cancelar(c, 'eleusis');
    c.passarTurno();
    expect(c.forcaEm('eleusis', 'atenas')).toBe(400);
    expect(c.forcaEm('megara', 'atenas')).toBe(0);
  });

  it('para antes de entrar num destino que deixou de ser permitido', () => {
    const c = caminhoAteCorinto();
    ordenar(c, 'atenas', 'corinto', 400);
    c.passarTurno();

    c.trocarDono('corinto', 'corinto');
    c.passarTurno();
    expect(c.forcaEm('eleusis', 'atenas')).toBe(400);
    expect(c.forcaEm('megara', 'atenas')).toBe(0);
    expect(ordemDe(c, 'eleusis')).toBeUndefined();
  });
});

describe('a ordem recusada diz o motivo', () => {
  it('sem hoste na origem', () => {
    expect(comHoste(1000).podeOrdenarMarcha('sounion', 'maratona', 100)).toMatchObject({
      motivo: 'não há hoste aqui para marchar',
    });
  });

  it('a hoste já está no destino', () => {
    expect(podeOrdenar(comHoste(1000), 'atenas', 'atenas', 100)).toMatchObject({
      motivo: 'a hoste já está aqui',
    });
  });

  it('marchar contra terra alheia é LEGAL — é o ponto da guerra', () => {
    expect(podeOrdenar(comHoste(1000), 'atenas', 'tanagra', 100)).toMatchObject({
      pode: true,
      rota: ['tanagra'],
    });
  });

  it('terra alheia não serve de CAMINHO: a rota acaba nela', () => {
    const c = comHoste(1000);
    // Tebas fica depois de Tanagra, que é alheia. Dois pontos não bastam, porque a hoste
    // não atravessa o reino do vizinho — pararia em Tanagra.
    expect(podeOrdenar(c, 'atenas', 'tebas', 100)).toMatchObject({
      motivo: 'não há caminho livre até Tebas',
    });
    // Elêusis é alheia e vizinha: alcançável. Mégara fica atrás dela: não.
    expect(podeOrdenar(c, 'atenas', 'eleusis', 100)).toMatchObject({ pode: true });
    expect(podeOrdenar(c, 'atenas', 'megara', 100)).toMatchObject({
      motivo: 'não há caminho livre até Mégara',
    });
  });

  it('aceita um destino distante e guarda a rota inteira', () => {
    const c = comHoste(1000);
    c.trocarDono('eleusis', 'atenas');
    c.trocarDono('megara', 'atenas');
    c.trocarDono('corinto', 'atenas');
    // A hoste anda um trecho por rodada, mas a ordem já aponta para o destino final.
    expect(podeOrdenar(c, 'atenas', 'corinto', 100)).toMatchObject({
      pode: true,
      rota: ['eleusis', 'megara', 'corinto'],
    });
    expect(podeOrdenar(c, 'atenas', 'megara', 100)).toMatchObject({
      pode: true,
      rota: ['eleusis', 'megara'],
    });
  });

  it('mais homens do que existem na origem', () => {
    expect(podeOrdenar(comHoste(1000), 'atenas', 'maratona', 1001)).toMatchObject({
      motivo: 'há apenas 1.000 homens aqui',
    });
  });

  /**
   * ⚠️ **Este teste guardava o DEFEITO, escrito como se fosse a regra.**
   *
   * Ele se chamava *"uma ordem por hoste de cada vez"* e mandava 500 para Maratona esperando
   * que os outros 500 fossem RECUSADOS em Sunião — que é, palavra por palavra, o que Henrique
   * relatou jogando: *"quando movo 50% desse exército, os outros 50% não consigo fazer nada com
   * eles. se eu quisesse atacar dois locais na mesma rodada eu poderia, dividindo a tropa"*.
   *
   * A regra verdadeira nunca foi "uma ordem por hoste": era "uma ordem por hoste POR ID", e o
   * que faltava era o id novo. Mandar parte da hoste agora a parte na hora — o destacamento
   * leva a ordem, o resto fica livre — e é isso que este teste passa a guardar.
   */
  it('mandar parte da hoste a PARTE, e o resto pode marchar para outro lugar', () => {
    const c = comHoste(1000);
    ordenar(c, 'atenas', 'maratona', 500);

    // Os 500 saíram da conta de quem ficou: é o pedido literal de Henrique.
    expect(forcaDaQueFicou(c)).toBe(500);
    // E o mapa continua parado: partir não é mover.
    expect(c.forcaEm('atenas')).toBe(1000);

    // O resto marcha para OUTRO lugar na mesma rodada.
    expect(podeOrdenar(c, 'atenas', 'sounion', 300)).toMatchObject({ pode: true });
    ordenar(c, 'atenas', 'sounion', 300);
    expect(forcaDaQueFicou(c)).toBe(200);
    expect(c.ordens()).toHaveLength(2);

    // Na virada, as três colunas estão onde foram mandadas.
    c.passarTurno();
    expect(c.forcaEm('maratona')).toBe(500);
    expect(c.forcaEm('sounion')).toBe(300);
    expect(c.forcaEm('atenas')).toBe(200);
  });

  /**
   * ⚠️ **O defeito que o destacamento quase reintroduziu, achado por revisão adversária.**
   *
   * A primeira versão de `reunir` devolvia os homens à irmã MAIS VELHA do mesmo poder no mesmo
   * lugar, sem perguntar se ela ia a algum lugar. O estrago, reproduzido: manda-se 100 a
   * Maratona (nasce a peça do destacamento) e depois os 900 restantes INTEIROS para outro lado
   * — essa segunda ordem fica no id original, porque hoste inteira não se divide. Cancelar essa
   * ordem entregava os 900 à peça que já estava marchando para Maratona e APAGAVA a hoste que o
   * jogador tinha selecionada. Ele ficava outra vez sem nada para comandar: a queixa exata que
   * o destacamento nasceu para resolver.
   */
  it('cancelar NÃO entrega os homens a uma peça que já está marchando', () => {
    const c = comHoste(1000);
    ordenar(c, 'atenas', 'maratona', 100);
    const doDestacamento = c.ordens()[0]?.idHoste;
    expect(doDestacamento).toBeDefined();

    // Os 900 que ficaram marcham INTEIROS: não há divisão, a ordem cai no id original.
    ordenar(c, 'atenas', 'sounion', 900);
    expect(c.ordens()).toHaveLength(2);
    const daQueFicou = c.ordens().find((o) => o.idHoste !== doDestacamento)?.idHoste;
    expect(daQueFicou).toBeDefined();

    c.cancelarOrdem(daQueFicou!);

    // A peça que ficou continua existindo, com os 900, e sem ordem.
    expect(c.hostesEm('atenas')).toHaveLength(2);
    expect(c.forcaDaHoste(daQueFicou!)).toBe(900);
    expect(c.ordens().map((o) => o.idHoste)).toEqual([doDestacamento]);
    // E a marcha dos 100 segue de pé, com os 100 dela.
    expect(c.forcaDaHoste(doDestacamento!)).toBe(100);
  });

  it('cancelar REÚNE o destacamento de volta, em vez de deixar duas peças', () => {
    const c = comHoste(1000);
    ordenar(c, 'atenas', 'maratona', 400);
    expect(c.hostesEm('atenas')).toHaveLength(2);

    // Cancelar pela hoste que LEVA a ordem: é ela que tem o que desfazer.
    const comOrdem = c.ordens()[0];
    expect(comOrdem).toBeDefined();
    c.cancelarOrdem(comOrdem!.idHoste);

    expect(c.hostesEm('atenas')).toHaveLength(1);
    expect(c.forcaEm('atenas')).toBe(1000);
    expect(c.ordens()).toEqual([]);
  });
});

/** Quantos homens sobraram na hoste que NÃO recebeu ordem — a que o jogador ainda comanda. */
function forcaDaQueFicou(c: {
  hostesEm: (p: string) => readonly { id: string; contingentes: readonly { homens: number }[] }[];
  ordens: () => readonly { idHoste: string }[];
}): number {
  const comOrdem = new Set(c.ordens().map((o) => o.idHoste));
  return c
    .hostesEm('atenas')
    .filter((h) => !comOrdem.has(h.id))
    .reduce((t, h) => t + h.contingentes.reduce((s, x) => s + x.homens, 0), 0);
}

/** `porTerra` tolerando hoste ausente: o teste falha na asserção, não num `undefined`. */
function porTerraOuVazio(e: { contingentes: readonly { terra: string; homens: number }[] } | undefined) {
  const conta: Record<string, number> = {};
  for (const c of e?.contingentes ?? []) conta[c.terra] = (conta[c.terra] ?? 0) + c.homens;
  return conta;
}
