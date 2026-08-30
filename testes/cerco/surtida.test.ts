import { describe, expect, it } from 'vitest';

import type { Campanha } from '../../src/campanha/campanha';
import { ordenar, podeOrdenar, podeSurtir, surtir } from '../apoio/hostes';
// ⚠️ Comida farta: este arquivo guarda a SURTIDA, e não a despensa. Com a subsistência em 1
// a hoste plantada aqui definhava de 800 para 285 antes do teste chegar ao que ele mede.
import { novaCampanhaFarta as nova } from '../apoio/mundo';

/**
 * A SURTIDA — o sitiado sai para atacar quem o cerca.
 *
 * É a resposta ao "sitiar não é lutar". Sem ela o cerco seria inquebrável por armas: o
 * sitiante recusa o choque, e o defensor não teria como obrigá-lo — o exército de dentro
 * ficaria olhando o de fora até a cidade morrer de outra coisa.
 */
describe('A SURTIDA: o sitiado obriga o choque que o sitiante recusou', () => {
  /**
   * Atenas senta na frente de Elêusis, com uma guarnição eleusina de pé lá dentro.
   *
   * A guarnição é PLANTADA aqui: o mapa abre em paz, e um teste sobre surtida tem que pôr
   * de pé o defensor de que ele fala em vez de herdá-lo de um arquivo de dados.
   */
  function sitiada(homensDeAtenas: number, guarnicao = 500): Campanha {
    const c = nova();
    c.comecar('atenas');
    c.darOuro(200_000);
    c.plantarHoste('eleusis', 'eleusis', guarnicao);
    c.plantarHoste('atenas', 'atenas', homensDeAtenas);
    ordenar(c, 'atenas', 'eleusis', homensDeAtenas, 'atenas', 'sitiar');
    c.passarTurno();
    return c;
  }

  it('vencendo, a guarnição quebra o cerco: o sitiante morre e a cidade se solta', () => {
    const c = sitiada(300);
    expect(c.cercoEm('eleusis')).toMatchObject({ sitiante: 'atenas' });

    surtir(c, 'eleusis', 'eleusis');
    c.passarTurno();

    // A despensa da cidade ainda aguenta (grão III é resistência de cerco): ninguém passou
    // fome antes da surtida. Quantos sobram é balanço — era √(500² − 300²) e a lei quadrada
    // morreu — então o que o teste guarda é que a guarnição venceu e pagou por isso.
    expect(c.forcaEm('eleusis')).toBeGreaterThan(0);
    expect(c.forcaEm('eleusis')).toBeLessThan(500);
    expect(c.cercoEm('eleusis')).toBeUndefined();
    expect(c.hostesEm('eleusis').map((h) => h.poder)).toEqual(['eleusis']);
    expect(c.rodada.batalhas).toMatchObject([{ provincia: 'eleusis', vencedor: 'eleusis' }]);
  });

  it('perdendo, o cerco continua — e a cidade não cai no mesmo golpe', () => {
    const c = sitiada(3000);
    const povo = c.populacaoDe('eleusis');

    surtir(c, 'eleusis', 'eleusis');
    c.passarTurno();

    expect(c.forcaEm('eleusis')).toBe(0); // a hoste que saiu se desfez
    expect(c.cercoEm('eleusis')).toMatchObject({ sitiante: 'atenas', postura: 'sitiar' });
    // Perder a surtida não entrega a cidade: quem toma é o assalto, e ele é outra ordem.
    expect(c.donoDe('eleusis')).toBe('eleusis');
    // ⚠️ A MILÍCIA NÃO SAIU JUNTO. Ela é da cidade, e a surtida é a hoste — se ela tivesse
    // ido a campo, perder uma vez custaria a defesa da muralha e a população de uma vez só.
    // E a despensa ainda aguenta: a fome do cerco só entra quando os mantimentos vencem.
    expect(c.rodada.milicianosMortos).toEqual([]);
    // ⚠️ **A população SOBE, e é a regra nova.** A surtida quebrou, mas quem escapou da
    // perseguição está vivo e voltou para dentro dos muros. Quebrar custa o exército, não a
    // geração — antes, perder a surtida apagava aqueles homens do mundo, e a cidade pagava
    // duas vezes: na hora de levantar a hoste e de novo na hora de perdê-la.
    expect(c.populacaoDe('eleusis')).toBeGreaterThan(povo);
  });

  it('quem surte não marcha, e quem marcha não surte: é uma ordem por hoste por rodada', () => {
    const c = sitiada(300);
    surtir(c, 'eleusis', 'eleusis');
    expect(podeOrdenar(c, 'eleusis', 'megara', 100, 'eleusis')).toMatchObject({
      motivo: 'esta hoste já está cumprindo uma ordem',
    });

    const outra = sitiada(300);
    ordenar(outra, 'eleusis', 'megara', 100, 'eleusis');
    expect(podeSurtir(outra, 'eleusis', 'eleusis')).toMatchObject({
      motivo: 'esta hoste já tem ordem nesta rodada',
    });
  });

  it('a surtida é da RODADA: não sobrevive à virada', () => {
    const c = sitiada(300);
    const guarnicao = c.hostesEm('eleusis').find((h) => h.poder === 'eleusis');
    expect(guarnicao).toBeDefined();

    // O sitiante vai embora no mesmo turno em que a cidade decide sair: não há com quem
    // lutar, e a surtida se perde junto com as ordens.
    surtir(c, 'eleusis', 'eleusis');
    ordenar(c, 'eleusis', 'atenas', 300, 'atenas');
    c.passarTurno();

    expect(c.rodada.batalhas).toEqual([]);
    expect(c.surtidaDe(guarnicao?.id ?? '')).toBe(false);
  });

  it('só surte quem está sitiado, e só de dentro da própria cidade', () => {
    const c = sitiada(300);
    // O sitiante não surte: ele está em terra alheia, e o problema não é dele.
    const doSitiante = c.hostesEm('eleusis').find((h) => h.poder === 'atenas');
    expect(c.podeSurtir(doSitiante?.id ?? '', 'atenas')).toMatchObject({
      motivo: 'a surtida sai de dentro da própria cidade',
    });
    // Nem a guarnição alheia obedece a quem não a comanda: Atenas não manda a cidade
    // sitiada sair para lutar.
    const daCidade = c.hostesEm('eleusis').find((h) => h.poder === 'eleusis');
    expect(c.podeSurtir(daCidade?.id ?? '', 'atenas')).toMatchObject({
      motivo: 'esta hoste não é sua',
    });

    // Uma hoste de pé e nenhum sitiante: a recusa tem que ser "não está sitiada", e não
    // "não existe hoste" — são motivos diferentes e o jogador precisa saber qual.
    const semCerco = nova();
    semCerco.comecar('atenas');
    semCerco.plantarHoste('tanagra', 'tanagra', 500);
    expect(podeSurtir(semCerco, 'tanagra', 'tanagra')).toMatchObject({
      motivo: 'Tanagra não está sitiada',
    });
  });
});
