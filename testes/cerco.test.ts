import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { Ajustes, Construcoes, Economia, Exercitos, Provincias } from '../src/dados/esquema';
import { Campanha } from '../src/campanha/campanha';
import { Atlas } from '../src/mundo/atlas';
import { defesaNoAssalto, milicianosPerdidos } from '../src/combate/cerco';
import { forcaDe } from '../src/combate/exercito';
import { ordenar, podeOrdenar, podeSurtir, surtir } from './apoio/hostes';

function ler<T>(esquema: { parse: (v: unknown) => T }, caminho: string): T {
  return esquema.parse(JSON.parse(readFileSync(resolve(caminho), 'utf8')));
}

const provincias = ler(Provincias, 'assets/mundo/provincias.json');
const economia = ler(Economia, 'dados/economia.json');
const construcoes = ler(Construcoes, 'dados/construcoes.json');
const exercitos = ler(Exercitos, 'dados/exercitos.json');
const ajustes = ler(Ajustes, 'dados/ajustes.json').jogo;
const cercoAjustes = ajustes.combate.cerco;

function nova(): Campanha {
  return new Campanha(new Atlas(provincias), economia, construcoes, ajustes, exercitos);
}

/** Atenas com ouro e uma hoste plantada, pronta para marchar sobre Elêusis. */
function contraEleusis(homens: number): Campanha {
  const c = nova();
  c.comecar('atenas');
  c.darOuro(200_000);
  c.plantarHoste('atenas', 'atenas', homens);
  // Elêusis abre com 500 homens de guarnição. Dispensá-los deixa o teste falar só do
  // cerco, sem o choque de campo na frente.
  c.dispensar('eleusis', 500);
  return c;
}

describe('a conta do assalto', () => {
  it('a muralha multiplica a milícia, e desfazer a conta devolve HOMENS', () => {
    const defesa = defesaNoAssalto(300, cercoAjustes);
    expect(defesa).toBe(300 * cercoAjustes.bonusDeMuralha);
    // Sem desfazer a multiplicação, um assalto rechaçado faria a população encolher pelo
    // dobro do que de fato caiu.
    expect(milicianosPerdidos(300, defesa, cercoAjustes)).toBe(0);
    expect(milicianosPerdidos(300, defesa / 2, cercoAjustes)).toBe(150);
    expect(milicianosPerdidos(300, 0, cercoAjustes)).toBe(300);
  });
});

describe('SITIAR NÃO É LUTAR: o sitiante acampa ao lado da guarnição', () => {
  /**
   * Atenas marcha sobre Elêusis **com os 500 homens da guarnição de pé**.
   *
   * Este é o caso que faltava. A estrutura passou a permitir duas hostes no mesmo lugar
   * quando a hoste ganhou identidade própria, mas a resolução continuava brigando até
   * sobrar um poder só — então escolher sitiar queria dizer "lute com o exército deles e
   * DEPOIS sente", que é o assalto com um passo a mais.
   */
  function comGuarnicaoDePe(homens: number): Campanha {
    const c = nova();
    c.comecar('atenas');
    c.darOuro(200_000);
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
    c.dispensar('eleusis', c.forcaEm('eleusis')); // a guarnição vira população de novo
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
    // situação de 120 dos 148 poderes. Sitiado e sem dinheiro é derrota anunciada, não
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

/**
 * A SURTIDA — o sitiado sai para atacar quem o cerca.
 *
 * É a resposta ao "sitiar não é lutar". Sem ela o cerco seria inquebrável por armas: o
 * sitiante recusa o choque, e o defensor não teria como obrigá-lo — o exército de dentro
 * ficaria olhando o de fora até a cidade morrer de outra coisa.
 */
describe('A SURTIDA: o sitiado obriga o choque que o sitiante recusou', () => {
  /** Atenas senta na frente de Elêusis, com a guarnição eleusina de pé lá dentro. */
  function sitiada(homensDeAtenas: number): Campanha {
    const c = nova();
    c.comecar('atenas');
    c.darOuro(200_000);
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

    // A despensa da cidade ainda aguenta (grão III é resistência de cerco): ninguém
    // passou fome antes da surtida, e √(500² − 300²) = 400. O cerco cai pela vitória.
    expect(c.forcaEm('eleusis')).toBe(400);
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
    expect(c.populacaoDe('eleusis')).toBe(povo);
    expect(c.rodada.milicianosMortos).toEqual([]);
  });

  it('quem surte não marcha, e quem marcha não surte: é uma ordem por hoste por rodada', () => {
    const c = sitiada(300);
    surtir(c, 'eleusis', 'eleusis');
    expect(podeOrdenar(c, 'eleusis', 'megara', 100, 'eleusis')).toMatchObject({
      motivo: 'esta hoste já tem ordem nesta rodada',
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

    const semCerco = nova();
    semCerco.comecar('atenas');
    expect(podeSurtir(semCerco, 'tanagra', 'tanagra')).toMatchObject({
      motivo: 'Tanagra não está sitiada',
    });
  });
});

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

/**
 * A MURALHA — o que separa uma província fortificada de uma que não é.
 *
 * Duas funções, e as duas importam no mesmo dia: ela **dobra a milícia** e **proíbe o
 * assalto imediato**. Sem a segunda, erguer Muralha era só um número maior de defensores,
 * e a decisão de sitiar continuava valendo o mesmo contra qualquer cidade.
 *
 * A região de teste tem uma de cada: **Tanagra murada, Elêusis aberta.** É o par que deixa
 * a diferença ser vista de um lado para o outro sem inventar cenário nenhum.
 */
describe('A MURALHA: cidade aberta cai hoje, cidade murada faz esperar', () => {
  const rodadasExigidas = cercoAjustes.rodadasParaAssaltarMuralha;

  /** Atenas com ouro e uma hoste plantada, e a guarnição do alvo dispensada. */
  function contra(alvo: string, homens: number): Campanha {
    const c = nova();
    c.comecar('atenas');
    c.darOuro(200_000);
    c.plantarHoste('atenas', 'atenas', homens);
    // Sem a guarnição do alvo, o teste fala só da muralha — sem o choque de campo na frente.
    c.dispensar(alvo, c.forcaEm(alvo));
    return c;
  }

  it('a Muralha continua dobrando a milícia — a primeira função não mudou', () => {
    const c = nova();
    c.comecar('atenas');
    const fator = construcoes.construcoes['muralha']?.efeito;
    expect(fator?.tipo).toBe('milicia');
    expect(c.miliciaEm('tanagra')).toBe(
      Math.floor(
        c.populacaoDe('tanagra') *
          ajustes.combate.milicia.fracao *
          (fator?.tipo === 'milicia' ? fator.fatores[0] : 1),
      ),
    );
  });

  it('Elêusis é aberta: o assalto sai na chegada, sem sentar antes', () => {
    const c = contra('eleusis', 2000);
    ordenar(c, 'atenas', 'eleusis', 2000, 'atenas', 'assaltar');
    c.passarTurno();
    expect(c.donoDe('eleusis')).toBe('atenas');
  });

  it('Tanagra é murada: o mesmo assalto vira cerco, e a cidade fica', () => {
    const c = contra('tanagra', 2000);
    ordenar(c, 'atenas', 'tanagra', 2000, 'atenas', 'assaltar');
    c.passarTurno();

    // ⚠️ A ordem não é recusada nem some: ela vira a única coisa que dava para fazer
    // naquele dia — sentar. Escada e aríete não se improvisam na chegada.
    expect(c.donoDe('tanagra')).toBe('tanagra');
    expect(c.cercoEm('tanagra')).toMatchObject({ sitiante: 'atenas', postura: 'sitiar', rodadas: 0 });
    expect(c.assaltoEm('tanagra')).toEqual({ pode: false, faltam: rodadasExigidas });
  });

  it(`depois de ${rodadasExigidas} rodadas sentado, o assalto sai`, () => {
    const c = contra('tanagra', 2000);
    ordenar(c, 'atenas', 'tanagra', 2000, 'atenas', 'sitiar');
    c.passarTurno();

    // A rodada da chegada conta zero: o relógio anda com as viradas em que o exército
    // continuou ali.
    for (let i = 0; i < rodadasExigidas; i++) {
      expect(c.assaltoEm('tanagra').pode).toBe(false);
      c.passarTurno();
    }

    expect(c.cercoEm('tanagra')?.rodadas).toBe(rodadasExigidas);
    expect(c.assaltoEm('tanagra')).toEqual({ pode: true, faltam: 0 });
    c.mudarPostura('tanagra', 'assaltar');
    c.passarTurno();
    expect(c.donoDe('tanagra')).toBe('atenas');
  });

  it('antes da hora, mandar assaltar não pega: a postura continua sitiar', () => {
    const c = contra('tanagra', 2000);
    ordenar(c, 'atenas', 'tanagra', 2000, 'atenas', 'sitiar');
    c.passarTurno();

    c.mudarPostura('tanagra', 'assaltar');
    expect(c.cercoEm('tanagra')?.postura).toBe('sitiar');
    c.passarTurno();
    expect(c.donoDe('tanagra')).toBe('tanagra');
  });

  it('o relógio zera quando o sitiante sai: quem volta recomeça o trabalho', () => {
    const c = contra('tanagra', 2000);
    ordenar(c, 'atenas', 'tanagra', 2000, 'atenas', 'sitiar');
    c.passarTurno();
    for (let i = 0; i < rodadasExigidas; i++) c.passarTurno();
    expect(c.assaltoEm('tanagra').pode).toBe(true);

    ordenar(c, 'tanagra', 'atenas', 2000, 'atenas');
    c.passarTurno();
    expect(c.cercoEm('tanagra')).toBeUndefined();

    ordenar(c, 'atenas', 'tanagra', 2000, 'atenas', 'sitiar');
    c.passarTurno();
    // Herdar o tempo de quem já esteve ali entregaria a praça a quem chegou depois do
    // trabalho feito.
    expect(c.assaltoEm('tanagra')).toEqual({ pode: false, faltam: rodadasExigidas });
  });

  it('o relógio NÃO é progresso: sentado para sempre, a cidade não cai sozinha', () => {
    const c = contra('tanagra', 2000);
    ordenar(c, 'atenas', 'tanagra', 2000, 'atenas', 'sitiar');
    for (let i = 0; i < 15; i++) c.passarTurno();

    expect(c.donoDe('tanagra')).toBe('tanagra');
    expect(c.cercoEm('tanagra')?.rodadas).toBeGreaterThan(rodadasExigidas);
    expect(c.rodada.batalhas).toEqual([]);
  });
});
