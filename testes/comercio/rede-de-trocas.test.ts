import { describe, expect, it } from 'vitest';

import type { Campanha } from '../../src/campanha/campanha';
import { ordenar } from '../apoio/hostes';
import { economia, novaCampanha } from '../apoio/mundo';

function nova(): Campanha {
  const c = novaCampanha();
  c.comecar('atenas');
  return c;
}

const bens = (c: Campanha, poder = 'atenas'): string[] =>
  c.bensEmCirculacao(poder).map((b) => b.id);

/**
 * Uma campanha com Porto de pé nas províncias pedidas.
 *
 * O Porto leva turnos e custa caro: erguer os dois e esperar a obra é o cenário, não folga
 * de teste. Recebe a fábrica porque cada teste monta um mapa diferente ANTES de construir.
 */
function comPortoEm(provincias: readonly string[], montar: () => Campanha): Campanha {
  const c = montar();
  c.darOuro(400_000);
  for (const id of provincias) c.construir(id, 'porto');
  for (let i = 0; i < 6; i++) c.passarTurno();
  return c;
}

/** Os bens que as terras deste poder DÃO, ligadas ou não. É o teto do que poderia circular. */
function bensDasTerras(c: Campanha, poder: string): string[] {
  const dados = c.provinciasDe(poder).flatMap((id) => {
    const ficha = economia.provincias[id];
    return ficha ? [ficha.produto, ficha.secundario.produto] : [];
  });
  return [...new Set(dados)].sort();
}

describe('a rede de trocas: acesso a um bem, não estoque dele', () => {
  it('a Ática inteira está ligada, então tudo que ela dá circula', () => {
    const c = nova();
    expect(bens(c)).toEqual(bensDasTerras(c, 'atenas'));
    expect(bens(c).length).toBeGreaterThan(0);
  });

  it('o bem DISTINTO paga uma vez, por mais terras que o deem', () => {
    const c = nova();
    // Atenas e Maratona dão as duas o mesmo bem — e ele entra na conta uma vez só.
    const repetido = c.bensEmCirculacao('atenas').find((b) => b.provincias.length > 1);
    expect(repetido).toBeDefined();

    const esperado = bensDasTerras(c, 'atenas').reduce(
      (soma, id) => soma + (economia.produtos[id]?.troca ?? 0),
      0,
    );
    expect(c.rendaDeTrocas('atenas')).toBe(esperado);
  });

  it('o produto SECUNDÁRIO finalmente faz alguma coisa', () => {
    // Ele existia nos dados desde sempre e não entrava em conta nenhuma, esperando a regra
    // de circulação. Aqui há bem que chega ao reino só por ser o segundo de uma terra.
    const c = nova();
    const principais = new Set(
      c.provinciasDe('atenas').flatMap((id) => {
        const ficha = economia.provincias[id];
        return ficha ? [ficha.produto] : [];
      }),
    );
    const soPeloSecundario = bens(c).filter((id) => !principais.has(id));
    expect(soPeloSecundario.length).toBeGreaterThan(0);
  });

  it('a renda do reino é a soma das terras MAIS a rede', () => {
    const c = nova();
    const daTerra = c
      .provinciasDe('atenas')
      .reduce((soma, id) => soma + (c.economiaDe(id)?.total ?? 0), 0);
    expect(c.rendaDe('atenas')).toBe(daTerra + c.rendaDeTrocas('atenas'));
  });
});

describe('a rede depende da GEOGRAFIA, não só da posse', () => {
  it('reino partido em dois não faz um mercado só', () => {
    const c = nova();
    const antes = c.rendaDeTrocas('atenas');

    // Cálcis é minha, mas fica atrás de Tanagra, que não é: o ferro dela não chega.
    c.trocarDono('calcis', 'atenas');
    expect(c.provinciasDe('atenas')).toContain('calcis');
    expect(bens(c)).not.toContain('ferro');
    expect(c.rendaDeTrocas('atenas')).toBe(antes);

    // Tomado o corredor, o reino vira contínuo e os dois bens novos entram juntos.
    c.trocarDono('tanagra', 'atenas');
    expect(bens(c)).toContain('ferro');
    expect(bens(c)).toContain('vinho');
    expect(c.rendaDeTrocas('atenas')).toBe(
      antes + (economia.produtos['ferro']?.troca ?? 0) + (economia.produtos['vinho']?.troca ?? 0),
    );
  });

  it('ilha sem Porto fica de fora, mesmo sendo minha', () => {
    // Salamina não faz fronteira terrestre com nada. Ela rende como província — o imposto
    // dela entra — mas o peixe não chega à rede enquanto não houver Porto nas duas pontas.
    const c = nova();
    const antes = c.rendaDeTrocas('atenas');
    c.trocarDono('salamina', 'atenas');

    expect(c.provinciasDe('atenas')).toContain('salamina');
    expect((c.economiaDe('salamina')?.total ?? 0) > 0).toBe(true);
    expect(bens(c)).not.toContain('peixe');
    expect(c.rendaDeTrocas('atenas')).toBe(antes);
  });

  it('com Porto nas DUAS pontas, a ilha entra na rede', () => {
    // ⚠️ O Porto passou a fazer o que sempre prometeu. Até aqui ele só multiplicava um
    // número; agora ele é a única coisa que tira Salamina de fora do jogo.
    const c = comPortoEm(['atenas', 'salamina'], () => {
      const campanha = nova();
      campanha.trocarDono('salamina', 'atenas');
      return campanha;
    });
    expect(bens(c)).toContain('peixe');
  });

  it('um cais sozinho não é rota: precisa de porto nos dois lados', () => {
    // Navio mercante atraca em algum lugar. Uma ponta só é um cais olhando para o
    // horizonte — e é isso que faz o Porto ser decisão emparelhada em vez de interruptor.
    const soAtenas = comPortoEm(['atenas'], () => {
      const campanha = nova();
      campanha.trocarDono('salamina', 'atenas');
      return campanha;
    });
    expect(bens(soAtenas)).not.toContain('peixe');

    const soIlha = comPortoEm(['salamina'], () => {
      const campanha = nova();
      campanha.trocarDono('salamina', 'atenas');
      return campanha;
    });
    expect(bens(soIlha)).not.toContain('peixe');
  });

  it('o mar costura um reino partido ao meio', () => {
    // Cálcis é minha e fica atrás de Tanagra, que não é: por terra, o ferro não chega. Mas
    // as duas pontas têm ancoradouro — e é aí que o segundo Porto vira pergunta de mapa.
    const c = comPortoEm(['atenas', 'calcis'], () => {
      const campanha = nova();
      campanha.trocarDono('calcis', 'atenas');
      return campanha;
    });
    expect(c.provinciasDe('atenas')).not.toContain('tanagra');
    expect(bens(c)).toContain('ferro');
  });

  it('mercadoria embarca; exército não', () => {
    // ⚠️ A fronteira que separa esta regra do sistema naval. Mercadoria aqui é abstrata —
    // sem inventário, sem caravana, sem navio no mapa —, então rota de mar abstrata cabe.
    // Hoste é peça concreta: movê-la por mar exige frota, e frota é outro sistema.
    const c = comPortoEm(['atenas', 'salamina'], () => {
      const campanha = nova();
      campanha.trocarDono('salamina', 'atenas');
      return campanha;
    });
    expect(bens(c)).toContain('peixe');

    c.plantarHoste('atenas', 'atenas', 500);
    const hoste = c.hostesEm('atenas')[0];
    expect(hoste).toBeDefined();
    expect(c.alcanceDaHoste(hoste!.id)).not.toContain('salamina');
  });

  it('cidade sitiada sai da rede como sai da mesa', () => {
    const c = nova();
    const antes = bens(c);
    // Elêusis marcha sobre Atenas e senta: a capital fica cercada.
    c.plantarHoste('eleusis', 'eleusis', 500);
    ordenar(c, 'eleusis', 'atenas', 500, 'eleusis', 'sitiar');
    c.passarTurno();
    expect(c.cercoEm('atenas')).toBeDefined();

    // O que só Atenas dava some da rede; o que Maratona também dá continua.
    const agora = bens(c);
    expect(agora.length).toBeLessThan(antes.length);
    expect(agora).toContain('graos');
    expect(c.rendaDeTrocas('atenas')).toBeLessThan(
      antes.reduce((soma, id) => soma + (economia.produtos[id]?.troca ?? 0), 0),
    );
  });
});

describe('o trânsito precisa de rota até a capital', () => {
  it('terra cortada perde o trânsito, e só ele', () => {
    // ⚠️ Imposto e produção continuam: o lavrador colhe e o coletor cobra mesmo com o reino
    // partido. O que não acontece é o pedágio chegar ao tesouro — trânsito é a parcela que
    // existe porque há uma ROTA.
    const c = nova();
    c.trocarDono('calcis', 'atenas');
    const cortada = c.economiaDe('calcis');
    expect(cortada?.cortada).toBe(true);
    expect(cortada?.transito).toBe(0);
    expect(cortada?.impostos ?? 0).toBeGreaterThan(0);
    expect(cortada?.producao ?? 0).toBeGreaterThan(0);

    // Tomado o corredor, a rota existe e o trânsito volta na mesma hora.
    c.trocarDono('tanagra', 'atenas');
    expect(c.economiaDe('calcis')?.cortada).toBe(false);
    expect(c.economiaDe('calcis')?.transito ?? 0).toBeGreaterThan(0);
  });

  it('o Porto costura a rota, e o trânsito volta com ela', () => {
    const c = comPortoEm(['atenas', 'calcis'], () => {
      const campanha = nova();
      campanha.trocarDono('calcis', 'atenas');
      return campanha;
    });
    expect(c.economiaDe('calcis')?.cortada).toBe(false);
    expect(c.economiaDe('calcis')?.transito ?? 0).toBeGreaterThan(0);
  });

  it('sitiada e cortada não se confundem na ficha', () => {
    // Duas causas diferentes para o mesmo zero. Um zero sem explicação lê-se como defeito
    // do jogo, e a tela precisa saber qual das duas dizer.
    const c = nova();
    c.plantarHoste('eleusis', 'eleusis', 500);
    ordenar(c, 'eleusis', 'atenas', 500, 'eleusis', 'sitiar');
    c.passarTurno();

    const sitiada = c.economiaDe('atenas');
    expect(sitiada?.transito).toBe(0);
    expect(sitiada?.cortada).toBe(false);
  });
});

describe('sem sede não há mercado', () => {
  it('sem capital não há mercado: a rede inteira para', () => {
    const c = nova();
    expect(c.rendaDeTrocas('atenas')).toBeGreaterThan(0);
    // Perder a capital sem escolher outra é ficar sem sede — e sem sede não há rede.
    for (const id of [...c.provinciasDe('atenas')]) c.trocarDono(id, 'megara');
    expect(c.rendaDeTrocas('atenas')).toBe(0);
    expect(bens(c)).toEqual([]);
  });
});

describe('a conquista deixa de ser sempre a mesma soma', () => {
  it('tomar um bem NOVO vale mais que tomar o mesmo bem de novo', () => {
    // Elêusis dá grão e azeite — os dois já circulam na Ática. Tanagra dá gado (que já
    // circula) e vinho, que não. As duas são vizinhas de Atenas e valem o mesmo em posse;
    // o que as separa é a variedade, e é isso que a rede põe em cima do mapa.
    const comEleusis = nova();
    const antes = comEleusis.rendaDeTrocas('atenas');
    comEleusis.trocarDono('eleusis', 'atenas');
    expect(comEleusis.rendaDeTrocas('atenas')).toBe(antes);

    const comTanagra = nova();
    comTanagra.trocarDono('tanagra', 'atenas');
    expect(comTanagra.rendaDeTrocas('atenas')).toBeGreaterThan(antes);
  });

  it('a lista do que FALTA é o mapa do que ainda há para conquistar', () => {
    const c = nova();
    const faltando = c.bensAusentes('atenas').map((b) => b.id);
    expect(faltando).not.toContain('graos');
    expect(faltando).toContain('vinho');
    // Nenhum bem aparece nas duas listas ao mesmo tempo, e juntas elas dão o catálogo.
    expect([...bens(c), ...faltando].sort()).toEqual(Object.keys(economia.produtos).sort());
  });
});

describe('o Mercado é uma praça, e uma praça tem dois lados', () => {
  const comMercadoEm = (id: string, poder = 'atenas'): Campanha => {
    const c = novaCampanha();
    c.comecar(poder);
    c.darOuro(400_000);
    c.construir(id, 'mercado');
    for (let i = 0; i < 4; i++) c.passarTurno();
    return c;
  };

  it('levanta o trânsito DAQUI e a rede do REINO ao mesmo tempo', () => {
    // ⚠️ As duas pernas existem porque cada uma sozinha já foi armadilha: só local, o
    // Mercado não pagava na terra pobre de trânsito; só nacional, não pagava na
    // encruzilhada rica de uma província só. Juntas, elas se corrigem.
    const antes = novaCampanha();
    antes.comecar('atenas');
    const transitoAntes = antes.economiaDe('atenas')?.transito ?? 0;
    const redeAntes = antes.rendaDeTrocas('atenas');

    const c = comMercadoEm('atenas');
    expect(c.economiaDe('atenas')?.transito ?? 0).toBeGreaterThan(transitoAntes);
    expect(c.rendaDeTrocas('atenas')).toBeGreaterThan(redeAntes);
  });

  it('a rede vale UMA vez: o segundo Mercado não a multiplica de novo', () => {
    // Dois Mercados não fazem o mesmo bem circular duas vezes. O que o segundo acrescenta é
    // a praça DELE — e é isso que impede "um Mercado em cada província" de ser a jogada
    // óbvia sem torná-lo inútil fora da primeira.
    const c = comMercadoEm('atenas');
    const rede = c.rendaDeTrocas('atenas');
    const transitoDeMaratona = c.economiaDe('maratona')?.transito ?? 0;

    c.construir('maratona', 'mercado');
    for (let i = 0; i < 4; i++) c.passarTurno();

    expect(c.rendaDeTrocas('atenas')).toBe(rede);
    expect(c.economiaDe('maratona')?.transito ?? 0).toBeGreaterThan(transitoDeMaratona);
  });

  it('a ficha soma as duas pernas: meia conta apareceria como prejuízo', () => {
    // O mesmo defeito que a Ágora teve antes de a corrupção entrar na conta: a manutenção
    // entrava e o benefício não, e a obra parecia armadilha na tela sem ser uma.
    const c = novaCampanha();
    c.comecar('atenas');
    const retorno = c.retornoDaConstrucaoEm('atenas', 'mercado');
    expect(retorno?.ganhoPorTurno ?? 0).toBeGreaterThan(0);
    expect(Number.isFinite(retorno?.turnosParaPagar ?? Infinity)).toBe(true);
  });

  it('se paga no poder mais pobre E no mais rico', () => {
    // ⚠️ Regra de Henrique: medir no pobre e no rico, nunca só em Atenas. Prédio que nunca
    // se paga não é decisão, é armadilha — e não existe demolir. Guarda a RELAÇÃO: os
    // números de balanço podem mudar, "se paga nos dois extremos" não.
    for (const poder of ['hermione', 'plateia', 'atenas']) {
      const c = novaCampanha();
      c.comecar(poder);
      const casa = c.capitalDe(poder);
      expect(casa).toBeDefined();
      const retorno = c.retornoDaConstrucaoEm(casa!, 'mercado');
      expect(`${poder}: ${retorno?.ganhoPorTurno ?? 0}`).not.toBe(`${poder}: 0`);
      expect(retorno?.ganhoPorTurno ?? 0).toBeGreaterThan(0);
    }
  });
});
