import { describe, expect, it } from 'vitest';

import { guerraEscolhida } from '../src/ia/diplomacia/declarar';
import { querPaz } from '../src/ia/diplomacia/paz';
import { lerSalvamento } from '../src/campanha/salvamento';
import { estiloDe } from '../src/ia/estilo';
import { ajustes, correrIA, ia, novaCampanha } from './apoio/mundo';

const nova = (jogador = 'atenas') => {
  const c = novaCampanha();
  c.comecar(jogador);
  return c;
};

/** A hoste do jogador em Atenas, pronta para marchar. */
const comHoste = (c: ReturnType<typeof nova>, onde = 'atenas', homens = 2000) => {
  const id = c.plantarHoste(onde, 'atenas', homens);
  return { id, homens };
};

describe('o mapa começa em paz, e a guerra é uma decisão com nome', () => {
  it('ninguém está em guerra com ninguém no turno 1', () => {
    // ⚠️ **É a diferença entre este jogo e o de antes.** Sem estado de relação, os 139 poderes
    // estavam em guerra com todo mundo desde o primeiro turno, e a única coisa que segurava o
    // mapa eram freios inventados dentro da IA.
    const c = nova();
    expect(c.guerrasDe('atenas')).toEqual([]);
    expect(c.emGuerra('atenas', 'megara')).toBe(false);
    expect(c.emGuerra('tebas', 'megara')).toBe(false);
  });

  it('sem guerra declarada a hoste não marcha, e a recusa diz por quê', () => {
    const c = nova();
    const { id, homens } = comHoste(c);
    const recusa = c.podeOrdenarMarcha(id, 'eleusis', homens, 'atenas');
    expect(recusa.pode).toBe(false);
    expect(recusa.pode === false && recusa.motivo).toContain('não está em guerra com você');

    c.declararGuerra('eleusis');
    expect(c.podeOrdenarMarcha(id, 'eleusis', homens, 'atenas').pode).toBe(true);
  });

  it('marchar em terra PRÓPRIA nunca pediu guerra nenhuma', () => {
    const c = nova();
    const { id, homens } = comHoste(c);
    const minha = [...c.provinciasDe('atenas')].filter((p) => p !== 'atenas')[0];
    expect(minha).toBeDefined();
    expect(c.podeOrdenarMarcha(id, minha!, homens, 'atenas').pode).toBe(true);
  });

  it('declarar e marchar no MESMO turno é permitido, e é de propósito', () => {
    // As ordens são simultâneas: um aviso prévio de uma virada daria ao defensor um turno
    // inteiro de vantagem sobre quem declarou, e o ataque de surpresa deixaria de existir.
    const c = nova();
    const { id, homens } = comHoste(c);
    c.declararGuerra('eleusis');
    c.ordenarMarcha(id, 'eleusis', homens, 'atenas', 'assaltar');
    c.passarTurno();
    expect(c.donoDe('eleusis')).toBe('atenas');
  });
});

describe('a paz precisa dos dois, e a trégua faz ela valer', () => {
  it('assinada a paz, a guerra acaba e a trégua segura a próxima', () => {
    const c = nova();
    c.declararGuerra('megara');
    expect(c.emGuerra('atenas', 'megara')).toBe(true);

    c.fazerPaz('megara');
    expect(c.emGuerra('atenas', 'megara')).toBe(false);
    // ⚠️ Sem trégua, redeclarar na virada seguinte seria grátis — e a paz viraria uma pausa
    // para respirar no meio do mesmo assalto.
    const recusa = c.podeDeclararGuerra('megara');
    expect(recusa.pode).toBe(false);
    expect(recusa.pode === false && recusa.motivo).toContain('trégua');
    expect(c.tregoaAte('atenas', 'megara')).toBe(
      c.turno + ajustes.diplomacia.tregoaEmTurnos,
    );
  });

  it('vencida a trégua, dá para declarar de novo', () => {
    const c = nova();
    c.declararGuerra('megara');
    c.fazerPaz('megara');
    for (let i = 0; i <= ajustes.diplomacia.tregoaEmTurnos; i++) c.passarTurno();
    expect(c.tregoaAte('atenas', 'megara')).toBeUndefined();
    expect(c.podeDeclararGuerra('megara').pode).toBe(true);
  });

  it('⚠️ a paz LEVANTA o cerco entre os dois', () => {
    // Visto rodando: Elêusis assinou a paz com Mégara no turno 3 e ASSALTOU Mégara no turno 5.
    // O exército continuava sentado, o cerco continuava registrado, e a regra da cidade não
    // perguntava se ainda havia guerra. Além do absurdo, a praça sitiada fica fora da
    // circulação e passa fome: uma paz que não levanta o cerco é a guerra com outro nome.
    const c = nova();
    const { id, homens } = comHoste(c);
    c.declararGuerra('eleusis');
    c.ordenarMarcha(id, 'eleusis', homens, 'atenas', 'sitiar');
    c.passarTurno();
    expect(c.cercoEm('eleusis')).toMatchObject({ sitiante: 'atenas' });

    c.fazerPaz('eleusis');
    expect(c.cercoEm('eleusis')).toBeUndefined();
    // E a cidade não cai mais para quem está acampado nela em paz.
    c.passarTurno();
    expect(c.donoDe('eleusis')).toBe('eleusis');
  });

  it('a guerra contra quem foi eliminado acaba sozinha', () => {
    // ⚠️ **Sem isto a diplomacia trava o mapa inteiro, e travou.** A IA declarava guerra ao
    // vizinho, tomava a única terra dele no turno seguinte — e continuava em guerra com um
    // poder sem chão nem tropa. Como ela só abre uma guerra de cada vez, aquele registro
    // fantasma a impedia de declarar qualquer outra pelo resto da campanha.
    const c = nova();
    const { id, homens } = comHoste(c);
    c.declararGuerra('eleusis');
    c.ordenarMarcha(id, 'eleusis', homens, 'atenas', 'assaltar');
    c.passarTurno();
    expect(c.vivo('eleusis')).toBe(false);
    expect(c.emGuerra('atenas', 'eleusis')).toBe(false);
  });
});

describe('a guerra atravessa o salvamento', () => {
  it('quem estava em guerra continua em guerra depois de retomar', () => {
    const original = nova();
    original.declararGuerra('megara');
    const outra = novaCampanha();
    outra.restaurar(lerSalvamento(original.serializar()));
    expect(outra.emGuerra('atenas', 'megara')).toBe(true);
  });
});

describe('a IA passa pela mesma porta', () => {
  it('ela declara antes de marchar, e não marcha em quem está em paz', () => {
    const c = nova('atenas');
    const donos = new Map(c.provinciasSimuladas.map((id) => [id, c.donoDe(id)] as const));
    correrIA(c, 30);
    const mudaram = [...donos].filter(([id, dono]) => c.donoDe(id) !== dono);
    expect(mudaram.length).toBeGreaterThan(0);
    // Toda conquista teve guerra: se não tivesse, a ordem de marcha teria sido recusada e
    // província nenhuma mudaria de dono. É a mesma porta para os dois lados.
  });

  it('ela não abre uma segunda frente', () => {
    // ⚠️ A regra que substituiu o preço fingido por conquista. Ela é verdadeira — dois
    // inimigos ao mesmo tempo derrubam qualquer um destes poderes —, é legível na aba de
    // Diplomacia, e dá ritmo ao mapa sem nenhum número mágico.
    const c = nova('atenas');
    c.plantarHoste('tebas', 'tebas', 4000);
    c.declararGuerra('calcis', 'tebas');
    expect(guerraEscolhida(c, 'tebas', estiloDe(ia, 'tebas'), ajustes.combate)).toBeNull();
  });

  it('quem já não tem o que tomar do inimigo quer a paz', () => {
    const c = nova('atenas');
    c.declararGuerra('megara', 'caristo');
    // Caristo é uma ilha: ela não faz fronteira com Mégara, então não há o que tomar.
    expect(querPaz(c, 'caristo', 'megara', estiloDe(ia, 'caristo'), ajustes.combate)).toBe(true);
  });
});

describe('a relação: o humor entre reinos', () => {
  it('começa em indiferença e caminha para o alvo, sem saltar', () => {
    // ⚠️ A mesma mecânica do humor do povo, de propósito: um VALOR que anda em direção a um
    // ALVO feito de parcelas com nome. O jogador já aprendeu essa máquina uma vez.
    const c = nova();
    expect(c.relacaoEntre('atenas', 'eleusis')).toBe(0);
    const alvo = c
      .parcelasDaRelacaoEntre('atenas', 'eleusis')
      .reduce((soma, p) => soma + p.pontos, 0);
    // Vizinhos se atritam: fronteira comum puxa o alvo para baixo de zero.
    expect(alvo).toBeLessThan(0);

    c.passarTurno();
    const depois = c.relacaoEntre('atenas', 'eleusis');
    expect(depois).toBeLessThan(0);
    // Um passo, e não um salto: ninguém passa a odiar você da noite para o dia.
    expect(depois).toBeGreaterThan(alvo);
  });

  it('a guerra afunda a opinião, e a conta diz por quê', () => {
    const c = nova();
    c.declararGuerra('eleusis');
    const rotulos = c.parcelasDaRelacaoEntre('atenas', 'eleusis').map((p) => p.rotulo);
    expect(rotulos).toContain('em guerra');
    for (let i = 0; i < 30; i++) c.passarTurno();
    expect(c.relacaoEntre('atenas', 'eleusis')).toBeLessThan(-40);
  });

  it('⚠️ a terra dele na sua mão é a memória da conquista — e devolver apaga', () => {
    // Sem guardar memória nenhuma: enquanto a bandeira dele estiver com você, ele lembra.
    const c = nova();
    const conta = () =>
      c.parcelasDaRelacaoEntre('atenas', 'megara').map((p) => p.rotulo).join(' | ');
    expect(conta()).not.toContain('terra dele');
    c.trocarDono('megara', 'atenas');
    expect(conta()).toContain('terra dele');
    c.trocarDono('megara', 'megara');
    expect(conta()).not.toContain('terra dele');
  });

  it('a IA não declara guerra a quem ela gosta', () => {
    // ⚠️ É o que impede a relação de ser enfeite: um número que não muda decisão nenhuma o
    // jogador aprende a ignorar. É também o que fará presente e acordo comprarem segurança.
    const c = nova('atenas');
    c.plantarHoste('tebas', 'tebas', 4000);
    const estilo = estiloDe(ia, 'tebas');
    const alvo = guerraEscolhida(c, 'tebas', estilo, ajustes.combate);
    expect(alvo).not.toBeNull();
    // O mesmo tabuleiro, com Tebas gostando muito de todo mundo: ela não ataca ninguém.
    const amigo = { ...estilo, relacaoParaDeclarar: -100 };
    expect(guerraEscolhida(c, 'tebas', amigo, ajustes.combate)).toBeNull();
  });

  it('a opinião atravessa o salvamento', () => {
    const original = nova();
    original.declararGuerra('megara');
    for (let i = 0; i < 5; i++) original.passarTurno();
    const outra = novaCampanha();
    outra.restaurar(lerSalvamento(original.serializar()));
    expect(outra.relacaoEntre('atenas', 'megara')).toBe(
      original.relacaoEntre('atenas', 'megara'),
    );
    expect(original.relacaoEntre('atenas', 'megara')).toBeLessThan(0);
  });
});

describe('o presente: ouro compra TEMPO, não amizade', () => {
  it('vale pelo bolso de quem recebe, e não por uma tabela fixa', () => {
    // ⚠️ 500 moedas para quem arrecada 120 são quatro turnos de renda — uma fortuna. As mesmas
    // 500 para quem arrecada 2.000 são troco, e troco é quase ofensa.
    const c = nova();
    const pobre = [...c.poderesComFicha()]
      .filter((id) => id !== 'atenas')
      .sort((a, b) => c.rendaDe(a) - c.rendaDe(b))[0]!;
    const rico = [...c.poderesComFicha()]
      .filter((id) => id !== 'atenas')
      .sort((a, b) => c.rendaDe(b) - c.rendaDe(a))[0]!;
    expect(c.rendaDe(rico)).toBeGreaterThan(c.rendaDe(pobre));
    expect(c.valorDoPresente(pobre, 500)).toBeGreaterThan(c.valorDoPresente(rico, 500));
  });

  it('satura: dobrar o presente não dobra a amizade', () => {
    const c = nova();
    const um = c.valorDoPresente('megara', 500);
    const dobro = c.valorDoPresente('megara', 1000);
    expect(dobro).toBeGreaterThan(um);
    expect(dobro).toBeLessThan(um * 2);
  });

  it('o ouro muda de cofre e a opinião sobe', () => {
    const c = nova();
    c.darOuro(5_000, 'atenas');
    const meu = c.tesouroDe('atenas');
    const dele = c.tesouroDe('megara');
    const antes = c.relacaoEntre('atenas', 'megara');

    const pontos = c.presentear('megara', 1_000);
    expect(pontos).toBeGreaterThan(0);
    expect(c.tesouroDe('atenas')).toBe(meu - 1_000);
    expect(c.tesouroDe('megara')).toBe(dele + 1_000);
    expect(c.relacaoEntre('atenas', 'megara')).toBe(antes + pontos);
  });

  it('⚠️ mas o número volta a cair: presente não muda os FATOS', () => {
    // O freio que impede a diplomacia de virar loja. O ouro cobre a distância até um ponto e
    // para; quem quer a opinião lá em cima assina pacto, abre comércio, devolve a terra.
    const c = nova();
    c.darOuro(200_000, 'atenas');
    for (let i = 0; i < 8; i++) c.presentear('megara', 5_000);
    const comprado = c.relacaoEntre('atenas', 'megara');
    expect(comprado).toBeLessThan(100);
    for (let i = 0; i < 40; i++) c.passarTurno();
    expect(c.relacaoEntre('atenas', 'megara')).toBeLessThan(comprado);
  });

  it('não se presenteia quem está trocando tiros com você', () => {
    const c = nova();
    c.darOuro(5_000, 'atenas');
    c.declararGuerra('megara');
    const recusa = c.podePresentear('megara', 500);
    expect(recusa.pode).toBe(false);
    expect(recusa.pode === false && recusa.motivo).toContain('em guerra');
  });

  it('e não se dá o que não se tem', () => {
    const c = nova();
    expect(c.podePresentear('megara', 999_999).pode).toBe(false);
  });
});

describe('o pacto de não-agressão: o prazo se compra com CONFIANÇA', () => {
  it('quanto mais longo o pacto, mais opinião ele exige', () => {
    const c = nova();
    const prazos = c.prazosDePacto('megara');
    expect(prazos.length).toBeGreaterThan(1);
    // Do mais longo ao mais curto, e o mais longo é o que pede mais.
    expect(prazos[0]!.turnos).toBeGreaterThan(prazos[prazos.length - 1]!.turnos);
    expect(prazos[0]!.opiniaoMinima).toBeGreaterThan(prazos[prazos.length - 1]!.opiniaoMinima);
  });

  it('⚠️ o presente é a ENTRADA do pacto: ouro compra o momento, o momento compra o prazo', () => {
    const c = nova();
    const prazos = c.prazosDePacto('megara');
    const medio = prazos[Math.floor(prazos.length / 2)]!;
    expect(c.podeFirmarPacto('megara', medio.turnos).pode).toBe(false);

    c.darOuro(300_000, 'atenas');
    for (let i = 0; i < 6; i++) c.presentear('megara', 20_000);
    expect(c.relacaoEntre('atenas', 'megara')).toBeGreaterThanOrEqual(medio.opiniaoMinima);
    expect(c.podeFirmarPacto('megara', medio.turnos).pode).toBe(true);
  });

  it('⚠️ mas o prazo mais longo NÃO se compra: ouro não vira aliança', () => {
    // O teto do presente é o freio: ele levanta a opinião só até certa altura acima do que os
    // FATOS justificam. Para ir além é preciso mudar os fatos — e é isso que impede o reino
    // rico de comprar o mapa inteiro sem levantar um soldado.
    const c = nova();
    c.darOuro(900_000, 'atenas');
    for (let i = 0; i < 20; i++) c.presentear('megara', 40_000);
    const longo = c.prazosDePacto('megara')[0]!;
    expect(c.relacaoEntre('atenas', 'megara')).toBeLessThan(longo.opiniaoMinima);
    expect(c.podeFirmarPacto('megara', longo.turnos).pode).toBe(false);
  });

  it('enquanto ele segura, ninguém declara guerra — e a opinião sobe sozinha', () => {
    const c = nova();
    const curto = c.prazosDePacto('megara').filter((p) => p.pode).at(-1);
    expect(curto).toBeDefined();
    c.firmarPacto('megara', curto!.turnos);

    const recusa = c.podeDeclararGuerra('megara');
    expect(recusa.pode).toBe(false);
    expect(recusa.pode === false && recusa.motivo).toContain('pacto');
    // E ele é um FATO: entra na conta do alvo, então a opinião melhora enquanto dura.
    expect(c.parcelasDaRelacaoEntre('atenas', 'megara').map((p) => p.rotulo)).toContain(
      'pacto de não-agressão',
    );
  });

  it('romper custa a opinião dele E a sua reputação com o mapa inteiro', () => {
    // ⚠️ É a única saída antes do prazo, e é cara de propósito: pacto que não custa nada é
    // papel que não vale nada.
    const c = nova();
    const curto = c.prazosDePacto('megara').filter((p) => p.pode).at(-1)!;
    c.firmarPacto('megara', curto.turnos);
    const antes = c.relacaoEntre('atenas', 'megara');
    expect(c.reputacaoDe('atenas')).toBe(0);

    c.romperPacto('megara');
    expect(c.pactoAte('atenas', 'megara')).toBeUndefined();
    expect(c.relacaoEntre('atenas', 'megara')).toBeLessThan(antes);
    expect(c.reputacaoDe('atenas')).toBeLessThan(0);
    // E o mapa inteiro vê: a promessa quebrada entra na conta de OUTRO vizinho.
    expect(c.parcelasDaRelacaoEntre('atenas', 'eleusis').map((p) => p.rotulo)).toContain(
      'promessa quebrada',
    );
    expect(c.podeDeclararGuerra('megara').pode).toBe(true);
  });

  it('e o rancor não é eterno: a reputação volta devagar para zero', () => {
    const c = nova();
    const curto = c.prazosDePacto('megara').filter((p) => p.pode).at(-1)!;
    c.firmarPacto('megara', curto.turnos);
    c.romperPacto('megara');
    const caida = c.reputacaoDe('atenas');
    for (let i = 0; i < 10; i++) c.passarTurno();
    expect(c.reputacaoDe('atenas')).toBeGreaterThan(caida);
  });

  it('a IA assina pactos e paga por eles', () => {
    // ⚠️ Sem o presente, pacto entre computadores era mecânica morta: medido, zero pactos em
    // 100 turnos. O ouro é o que faz o laço fechar.
    const c = nova('atenas');
    correrIA(c, 40);
    const pactos = c
      .poderesComFicha()
      .flatMap((a) => c.poderesComFicha().map((b) => (a < b ? c.pactoAte(a, b) : undefined)))
      .filter((ate) => ate !== undefined);
    expect(pactos.length).toBeGreaterThan(0);
  });
});
