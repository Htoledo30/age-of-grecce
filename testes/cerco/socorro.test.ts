import { describe, expect, it } from 'vitest';

import type { Campanha } from '../../src/campanha/campanha';
import { ordenar } from '../apoio/hostes';
import { novaCampanha as nova } from '../apoio/mundo';

/**
 * O SOCORRO — quem chega de fora para desfazer um cerco.
 *
 * A outra metade da surtida: o defensor obriga o choque saindo de dentro OU chegando de
 * fora. Antes, o exército de socorro entrava na província sitiada e **acampava ao lado do
 * sitiante sem tocá-lo** — herdava o "não quero lutar" de quem estava sentado ali, e o
 * cerco não tinha como ser quebrado por armas.
 */
describe('o socorro que chega de fora já chega lutando', () => {
  /** Elêusis é de Atenas e Tanagra senta na frente dela. */
  function eleusisSitiadaPorTanagra(homensDeTanagra: number): Campanha {
    const c = nova();
    c.comecar('atenas');
    c.darOuro(200_000);
    c.trocarDono('eleusis', 'atenas');
    // ⚠️ Trocar o dono da terra NÃO troca o poder da hoste: a guarnição continua sendo
    // eleusina dentro de uma cidade ateniense. Dispensá-la deixa o teste falar só do
    // socorro que vem de fora.
    c.dispensar('eleusis', c.forcaEm('eleusis', 'eleusis'));
    c.plantarHoste('tanagra', 'tanagra', homensDeTanagra);
    ordenar(c, 'tanagra', 'eleusis', homensDeTanagra, 'tanagra', 'sitiar');
    c.passarTurno();
    return c;
  }

  it('a marcha para a cidade cercada engaja o sitiante, sem nada a declarar', () => {
    const c = eleusisSitiadaPorTanagra(300);
    expect(c.cercoEm('eleusis')).toMatchObject({ sitiante: 'tanagra' });

    c.plantarHoste('atenas', 'atenas', 800);
    ordenar(c, 'atenas', 'eleusis', 800, 'atenas');
    c.passarTurno();

    expect(c.rodada.batalhas).toMatchObject([{ provincia: 'eleusis', vencedor: 'atenas' }]);
    expect(c.cercoEm('eleusis')).toBeUndefined();
    expect(c.donoDe('eleusis')).toBe('atenas');
  });

  it('marchar para casa não rebaixa o assalto do inimigo a cerco', () => {
    // ⚠️ A postura é compartilhada por DESTINO, e a marcha do defensor para a própria
    // cidade escrevia "sitiar" na entrada dela: bastava mandar qualquer hoste para lá e o
    // assalto do sitiante virava cerco, sem nada ter sido lutado. Marcha para casa não
    // declara postura nenhuma.
    const c = eleusisSitiadaPorTanagra(3000);
    c.mudarPostura('eleusis', 'assaltar');
    c.plantarHoste('atenas', 'atenas', 100);
    ordenar(c, 'atenas', 'eleusis', 100, 'atenas');
    c.passarTurno();

    // Tanagra passou por cima do socorro e assaltou: a cidade é dela.
    expect(c.donoDe('eleusis')).toBe('tanagra');
  });
});
