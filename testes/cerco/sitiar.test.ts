import { describe, expect, it } from 'vitest';

import type { Campanha } from '../../src/campanha/campanha';
import { forcaDe } from '../../src/combate/exercito';
import { ordenar } from '../apoio/hostes';
import { novaCampanha as nova } from '../apoio/mundo';
import { contraEleusis } from './apoio';

describe('SITIAR NÃO É LUTAR: o sitiante acampa ao lado da guarnição', () => {
  /**
   * Atenas marcha sobre Elêusis **com os 500 homens da guarnição de pé**.
   *
   * Este é o caso que faltava. A estrutura passou a permitir duas hostes no mesmo lugar
   * quando a hoste ganhou identidade própria, mas a resolução continuava brigando até
   * sobrar um poder só — então escolher sitiar queria dizer "lute com o exército deles e
   * DEPOIS sente", que é o assalto com um passo a mais.
   */
  function comGuarnicaoDePe(homens: number, guarnicao = 500): Campanha {
    const c = nova();
    c.comecar('atenas');
    c.darOuro(200_000);
    // O mapa abre em paz: a guarnição de que este teste fala é plantada por ele.
    c.plantarHoste('eleusis', 'eleusis', guarnicao);
    c.plantarHoste('atenas', 'atenas', homens);
    return c;
  }

  /** As forças de cada poder presentes numa província, para ver os dois lados de uma vez. */
  function acampados(c: Campanha, provincia: string): Record<string, number> {
    const conta: Record<string, number> = {};
    for (const h of c.hostes()) {
      if (h.posicao !== provincia) continue;
      conta[h.poder] = (conta[h.poder] ?? 0) + forcaDe(h);
    }
    return conta;
  }

  it('sitiando, ninguém morre: os dois exércitos ficam de pé na mesma província', () => {
    const c = comGuarnicaoDePe(3000);
    const guarnicao = c.forcaEm('eleusis');
    expect(guarnicao).toBeGreaterThan(0); // se Elêusis perder a guarnição, o teste não testa nada

    ordenar(c, 'atenas', 'eleusis', 3000, 'atenas', 'sitiar');
    c.passarTurno();

    expect(acampados(c, 'eleusis')).toEqual({ atenas: 3000, eleusis: guarnicao });
    expect(c.cercoEm('eleusis')).toMatchObject({ sitiante: 'atenas', postura: 'sitiar' });
    expect(c.donoDe('eleusis')).toBe('eleusis');
  });

  it('o cerco não é levantado pela presença do defensor — só pela saída do sitiante', () => {
    // ⚠️ Era o buraco que a regra nova abria: "terra própria, logo o cerco acabou" valia
    // porque os dois nunca podiam estar juntos. Sem esta guarda, o defensor quebraria o
    // cerco de graça, bastando ter uma hoste em casa.
    const c = comGuarnicaoDePe(3000);
    ordenar(c, 'atenas', 'eleusis', 3000, 'atenas', 'sitiar');
    c.passarTurno();
    for (let i = 0; i < 5; i++) c.passarTurno();

    expect(c.cercoEm('eleusis')).toMatchObject({ sitiante: 'atenas' });
    expect(acampados(c, 'eleusis')['eleusis']).toBeGreaterThan(0);
  });

  it('assaltando, o choque acontece: o exército do defensor entra na frente da muralha', () => {
    // O contraste que dá sentido à postura. Mesma marcha, mesma guarnição, outra ordem.
    const c = comGuarnicaoDePe(3000);
    ordenar(c, 'atenas', 'eleusis', 3000, 'atenas', 'assaltar');
    c.passarTurno();

    const relatorio = c.rodada;
    expect(relatorio.batalhas.some((b) => b.provincia === 'eleusis')).toBe(true);
    // O defensor de campo foi desfeito no choque; quem sobrou é ateniense.
    expect(acampados(c, 'eleusis')['eleusis']).toBeUndefined();
    expect(acampados(c, 'eleusis')['atenas']).toBeGreaterThan(0);
  });

  it('quem defende a própria terra luta sempre — não existe postura de deixar passar', () => {
    // A guarnição de Elêusis não escolhe. Se ela escolhesse, atacar seria opcional para os
    // dois lados e o mapa nunca mudaria de cor. A escolha do sitiado é a surtida, e é
    // outra etapa.
    const c = comGuarnicaoDePe(3000);
    ordenar(c, 'atenas', 'eleusis', 3000, 'atenas', 'assaltar');
    c.passarTurno();
    expect(c.rodada.batalhas.some((b) => b.perdedores.includes('eleusis'))).toBe(true);
  });

  it('a cidade despovoada não cai enquanto o exército do dono estiver nela', () => {
    // Sem gente não há milícia, e província vazia cai ao primeiro ingresso. Mas exército
    // do dono acampado ali É quem fecha o portão: sentar não pode tomar por cima dele.
    const c = comGuarnicaoDePe(3000);
    c.plantarHoste('eleusis', 'eleusis', 200); // e volta como hoste, sem mexer na milícia
    ordenar(c, 'atenas', 'eleusis', 3000, 'atenas', 'sitiar');
    c.passarTurno();

    expect(c.donoDe('eleusis')).toBe('eleusis');
    expect(c.cercoEm('eleusis')).toMatchObject({ sitiante: 'atenas' });
  });
});

describe('SITIAR NUNCA TOMA A CIDADE — quem toma é o assalto', () => {
  it('o exército acampa e fica, turno após turno, sem nada acontecer', () => {
    const c = contraEleusis(3000);
    ordenar(c, 'atenas', 'eleusis', 3000, 'atenas');

    // 3.000 homens contra 141 milicianos: passariam por cima num assalto. Sitiando, não
    // tomam nunca — e é essa separação que dá sentido a haver duas posturas.
    for (let i = 0; i < 15; i++) c.passarTurno();

    expect(c.donoDe('eleusis')).toBe('eleusis');
    expect(c.cercoEm('eleusis')).toMatchObject({ sitiante: 'atenas', postura: 'sitiar' });
    // O sitiante, e não o dono da terra: `forcaEm` sem poder pergunta pelo dono, que aqui
    // é Elêusis. Ninguém morreu — cerco não é batalha.
    expect(c.forcaEm('eleusis', 'atenas')).toBe(3000);
    expect(c.rodada.batalhas).toEqual([]);
  });

  it('o sitiante que vai embora solta a cidade', () => {
    const c = contraEleusis(300);
    ordenar(c, 'atenas', 'eleusis', 300, 'atenas');
    c.passarTurno();
    expect(c.cercoEm('eleusis')).toBeDefined();

    ordenar(c, 'eleusis', 'atenas', 300, 'atenas');
    c.passarTurno();

    // Levantar o cerco é consequência de sair, não regra separada.
    expect(c.cercoEm('eleusis')).toBeUndefined();
    expect(c.donoDe('eleusis')).toBe('eleusis');
  });

  it('sentar hoje e ir pra cima amanhã: é o assalto que abre os portões', () => {
    const c = contraEleusis(400);
    ordenar(c, 'atenas', 'eleusis', 400, 'atenas');
    c.passarTurno();
    expect(c.cercoEm('eleusis')?.postura).toBe('sitiar');
    expect(c.donoDe('eleusis')).toBe('eleusis');

    c.mudarPostura('eleusis', 'assaltar');
    c.passarTurno();

    expect(c.donoDe('eleusis')).toBe('atenas');
    expect(c.rodada.batalhas[0]).toMatchObject({ provincia: 'eleusis', vencedor: 'atenas' });
  });

  it('província alheia VAZIA continua caindo ao primeiro pisão, mesmo sitiando', () => {
    const c = nova();
    c.comecar('atenas');
    c.darOuro(200_000);
    // Delfos não tem economia configurada, logo não tem população nem milícia. Chegar a
    // ela exige uma base vizinha: Queroneia, na porta noroeste da região.
    c.trocarDono('queroneia', 'atenas');
    c.plantarHoste('queroneia', 'atenas', 300);
    ordenar(c, 'queroneia', 'delfos', 300, 'atenas');
    c.passarTurno();
    // Sem gente não há quem feche portão nenhum, e não há cerco a fazer.
    expect(c.donoDe('delfos')).toBe('atenas');
    expect(c.cercoEm('delfos')).toBeUndefined();
  });
});

describe('a cidade sitiada perde o campo e a estrada, nunca o imposto', () => {
  it('produção e comércio zeram; o imposto continua inteiro', () => {
    const c = contraEleusis(300);
    const antes = c.economiaDe('eleusis');
    ordenar(c, 'atenas', 'eleusis', 300, 'atenas');
    c.passarTurno();

    expect(c.cercoEm('eleusis')).toBeDefined();
    const durante = c.economiaDe('eleusis');
    expect(durante?.producao).toBe(0);
    expect(durante?.comercio).toBe(0);
    // O imposto FICA. Cortá-lo deixaria sem saída quem tem uma província só — que é a
    // situação de 111 dos 139 poderes. Sitiado e sem dinheiro é derrota anunciada, não
    // decisão.
    expect(durante?.impostos).toBeGreaterThan(0);
    expect(durante?.total).toBeLessThan(antes?.total ?? 0);
  });

  it('quem está sitiado ainda pode levantar tropa para revidar', () => {
    const c = contraEleusis(300);
    ordenar(c, 'atenas', 'eleusis', 300, 'atenas');
    c.passarTurno();
    expect(c.cercoEm('eleusis')).toBeDefined();
    // Não existe regra barrando recrutamento em cidade sitiada, e isso é deliberado.
    expect(c.disponivelParaLevaEm('eleusis')).toBeGreaterThan(0);
  });

  it('levantado o cerco, a economia volta inteira', () => {
    const c = contraEleusis(300);
    const antes = c.economiaDe('eleusis')?.total ?? 0;
    ordenar(c, 'atenas', 'eleusis', 300, 'atenas');
    c.passarTurno();
    ordenar(c, 'eleusis', 'atenas', 300, 'atenas');
    c.passarTurno();
    expect(c.economiaDe('eleusis')?.total).toBeGreaterThanOrEqual(antes);
  });
});
