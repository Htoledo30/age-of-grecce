import { describe, expect, it } from 'vitest';

import { estiloDe } from '../../src/ia/estilo';
import { defesasEscolhidas } from '../../src/ia/guerra/defender';
import { levaEscolhida } from '../../src/ia/guerra/recrutar';
import { jogarIA, poderesDaIa } from '../../src/ia/ia';
import { ameacasDe, estaAmeacado, forcaTotalDe } from '../../src/ia/percepcao/ameaca';
import { ajustes, ia, novaCampanha } from '../apoio/mundo';

const nova = (jogador = 'atenas') => {
  const c = novaCampanha();
  c.comecar(jogador);
  return c;
};

/** Roda `turnos` viradas com a IA jogando. O jogador fica parado, como o controle. */
const correr = (c: ReturnType<typeof nova>, turnos: number) => {
  for (let i = 0; i < turnos; i++) {
    jogarIA(c, ia, ajustes);
    c.passarTurno();
  }
  return c;
};

describe('a IA levanta tropa — quanto ela aguenta, não quanto ela quer', () => {
  it('para de recrutar quando a folha estoura, e não quando o cofre esvazia', () => {
    // ⚠️ O jogo deixa levantar tropa enquanto houver ouro no cofre, e o cofre é o de HOJE —
    // a folha é todo turno. Sem este teto ela recrutaria até a deserção por falta de
    // pagamento, que é o erro clássico de quem olha só o caixa.
    const c = nova('atenas');
    const estilo = estiloDe(ia, 'tebas');
    const semFolha = levaEscolhida(c, 'tebas', { ...estilo, folhaMilitar: 0, folhaEmPaz: 0 }, ajustes);
    expect(semFolha).toBeNull();

    const comFolha = levaEscolhida(c, 'tebas', { ...estilo, folhaMilitar: 1, folhaEmPaz: 1 }, ajustes);
    expect(comFolha).not.toBeNull();
    expect(comFolha!.homens).toBeGreaterThan(0);
  });

  it('com a despensa no vermelho, ela não levanta ninguém', () => {
    // Cada boca a mais come de um saldo que já não fecha, e a fome mata civil, não só
    // soldado. É a trava mais dura que ela tem.
    const c = nova('atenas');
    const estilo = estiloDe(ia, 'tebas');
    // Tira comida do reino enchendo-o de gente em armas até o saldo virar.
    for (let i = 0; i < 40 && c.balancoAlimentarDe('tebas').saldo >= 0; i++) {
      const leva = levaEscolhida(c, 'tebas', { ...estilo, folhaMilitar: 99, folhaEmPaz: 99 }, ajustes);
      if (!leva) break;
      c.darOuro(50_000, 'tebas');
      c.recrutar(leva.provincia, leva.homens, leva.arma, 'tebas');
      c.passarTurno();
    }
    if (c.balancoAlimentarDe('tebas').saldo < 0) {
      expect(levaEscolhida(c, 'tebas', { ...estilo, folhaMilitar: 99, folhaEmPaz: 99 }, ajustes)).toBeNull();
    }
  });

  it('o estilo escolhe a arma, e os números saem dos ajustes', () => {
    // ⚠️ Nenhuma tabela de armas mora no código da IA. `melhor` pega quem mais vale em campo,
    // `barata` quem rende mais luta por moeda — as duas contas saem de `batalha.armas`, que é
    // o mesmo lugar de onde a batalha lê.
    const c = nova('atenas');
    c.darOuro(400_000, 'tebas');
    c.construir('tebas', 'armaria', 'tebas');
    for (let i = 0; i < 6; i++) correr(c, 1);
    expect(c.armasEm('tebas')).toContain('hoplita');

    const base = estiloDe(ia, 'tebas');
    const bom = levaEscolhida(c, 'tebas', { ...base, arma: 'melhor', folhaMilitar: 9, folhaEmPaz: 9 }, ajustes);
    const barato = levaEscolhida(c, 'tebas', { ...base, arma: 'barata', folhaMilitar: 9, folhaEmPaz: 9 }, ajustes);
    expect(bom?.arma).toBe('hoplita');
    expect(barato?.arma).toBe('leve');
  });
});

describe('a IA defende, e só defende', () => {
  it('vê o inimigo em cima da terra dela, e a mais apertada vem primeiro', () => {
    const c = nova('atenas');
    c.plantarHoste('tebas', 'atenas', 900);
    const ameacas = ameacasDe(c, 'tebas');
    expect(ameacas).toHaveLength(1);
    expect(ameacas[0]).toMatchObject({ provincia: 'tebas', inimigos: 900, meus: 0 });
  });

  it('manda socorro para a terra ameaçada', () => {
    // O jogador aqui é Mégara para a Ática inteira ficar na mão da IA: ela tem três terras
    // ligadas, que é o que um socorro precisa para existir.
    const c = nova('megara');
    const minhas = [...c.provinciasDe('atenas')].sort();
    expect(minhas.length).toBeGreaterThan(1);
    const [alvo, base] = minhas;
    c.plantarHoste(alvo!, 'megara', 500);
    c.plantarHoste(base!, 'atenas', 800);

    const ordens = defesasEscolhidas(c, 'atenas', ajustes.combate.batalha);
    expect(ordens).toHaveLength(1);
    expect(ordens[0]).toMatchObject({ destino: alvo, tipo: 'socorro', homens: 800 });
  });

  it('⚠️ NENHUMA hoste pisa em terra alheia: atacar é a etapa 3', () => {
    // A regra dura desta etapa, e a que impede a etapa 2 de virar a etapa 3 por acidente —
    // que é o tipo de coisa que ninguém depura depois, porque o mapa inteiro se mexe de uma
    // vez. Cem turnos de IA e o dono de cada terra continua sendo quem era.
    const c = nova('atenas');
    const donosAntes = new Map(
      c.provinciasSimuladas.map((id) => [id, c.donoDe(id)] as const),
    );
    correr(c, 100);
    for (const [provincia, dono] of donosAntes) {
      expect(`${provincia}: ${c.donoDe(provincia)}`).toBe(`${provincia}: ${dono}`);
    }
  });
});

describe('o mapa deixou de ser um jardim de estátuas', () => {
  it('depois de trinta turnos, o vizinho tem exército de verdade', () => {
    // A promessa inteira da etapa 2 num teste só: suas lanças param de entrar andando.
    const c = nova('atenas');
    expect(forcaTotalDe(c, 'megara')).toBe(0);
    correr(c, 30);

    const defensores = forcaTotalDe(c, 'megara') + c.miliciaEm('megara');
    expect(forcaTotalDe(c, 'megara')).toBeGreaterThan(0);
    // E o que defende Mégara passou a ser mais que a milícia sozinha.
    expect(defensores).toBeGreaterThan(c.miliciaEm('megara'));
  });

  it('ninguém quebra o cofre nem passa fome em cem turnos', () => {
    const c = correr(nova('atenas'), 100);
    for (const poder of poderesDaIa(c)) {
      expect(`${poder}: ${c.tesouroDe(poder) >= 0}`).toBe(`${poder}: true`);
    }
  });
});

describe('em paz é guarda; em guerra é exército', () => {
  it('guarnição do vizinho PARADA EM CASA não é ameaça', () => {
    // ⚠️ A primeira versão disto errava aqui, e o efeito era enorme: com dezessete poderes
    // mantendo guarda nas próprias fronteiras, todo mundo era vizinho do exército de alguém —
    // e o mapa inteiro vivia em pé de guerra permanente, gastando folha de guerra numa paz
    // completa. Um soldado em casa é como uma muralha: existe, e não quer dizer nada.
    const c = nova('atenas');
    // Guarda, e não exército: menor do que a defesa que o vizinho consegue pôr em pé.
    c.plantarHoste('tebas', 'tebas', 100);
    expect(estaAmeacado(c, 'tanagra')).toBe(false);
    expect(estaAmeacado(c, 'tebas')).toBe(false);
  });

  it('exército alheio na minha terra, ou em campanha na porta dela, é ameaça', () => {
    const naMinhaTerra = nova('atenas');
    naMinhaTerra.plantarHoste('tebas', 'atenas', 500);
    expect(estaAmeacado(naMinhaTerra, 'tebas')).toBe(true);

    // Fora de casa, na porta: alguém em campanha, e o próximo passo pode ser aqui.
    const naPorta = nova('atenas');
    naPorta.trocarDono('tanagra', 'atenas');
    naPorta.plantarHoste('tanagra', 'megara', 500);
    expect(naPorta.donoDe('tanagra')).not.toBe('megara');
    expect(estaAmeacado(naPorta, 'tebas')).toBe(true);
  });

  it('a IA levanta MAIS quando alguém aparece do que quando o mapa está em paz', () => {
    // A promessa que Henrique cobrou: *"quando entrar em guerra se espera que a IA crie
    // exércitos para atacar e se defender"*. Em paz ela mantém guarda; sob ameaça ela arma.
    const emPaz = nova('atenas');
    const estilo = estiloDe(ia, 'tebas');
    const guarda = levaEscolhida(emPaz, 'tebas', estilo, ajustes);

    const naGuerra = nova('atenas');
    naGuerra.plantarHoste('tebas', 'atenas', 500);
    const exercito = levaEscolhida(naGuerra, 'tebas', estilo, ajustes);

    expect(guarda).not.toBeNull();
    expect(exercito).not.toBeNull();
    expect(exercito!.homens).toBeGreaterThan(guarda!.homens);
    // E a diferença é a razão entre as duas folhas do estilo, não um número solto.
    expect(estilo.folhaMilitar).toBeGreaterThan(estilo.folhaEmPaz);
  });

  it('o mapa em paz NÃO vira um quartel no primeiro turno', () => {
    // ⚠️ Henrique viu jogando: *"todas as províncias geram soldados, todas no round 1 já vão
    // direto para soldados"*. Medido antes do conserto: 8.524 homens em armas no turno 1 de
    // um mundo onde ninguém tinha marchado — e vários poderes ficando mais pobres na hora,
    // porque recrutar tira gente da lavoura e do imposto.
    const c = correr(nova('atenas'), 1);
    const total = poderesDaIa(c).reduce((soma, id) => soma + forcaTotalDe(c, id), 0);
    const povo = c.provinciasSimuladas.reduce((soma, id) => soma + c.populacaoDe(id), 0);
    // Guarda, e não exército: menos de 2% do povo do mapa em armas no primeiro turno.
    expect(total / povo).toBeLessThan(0.02);
  });
});

describe('os buracos que a auditoria apontou', () => {
  it('cidade SITIADA recebe socorro de fora — antes recebia zero ordens', () => {
    // ⚠️ O buraco: toda ameaça sitiada pulava direto para a próxima, então uma capital cercada
    // com exército na província vizinha não recebia ordem nenhuma. Cidade sitiada é justamente
    // a que mais precisa de gente de fora — quem está dentro não sai sem perder o muro.
    const c = nova('megara');
    const minhas = [...c.provinciasDe('atenas')].sort();
    const [sitiada, base] = minhas;
    // Um sitiante fraco: o socorro só sai se a conta fechar, e aqui ela fecha.
    c.plantarHoste(sitiada!, 'megara', 200);
    c.plantarHoste(base!, 'atenas', 1500);
    c.mudarPostura(sitiada!, 'sitiar');

    const ordens = defesasEscolhidas(c, 'atenas', ajustes.combate.batalha);
    const socorro = ordens.find((o) => o.tipo === 'socorro' && o.destino === sitiada);
    expect(socorro).toBeDefined();
    expect(socorro?.homens).toBe(1500);
  });

  it('a surtida olha COMPOSIÇÃO, e não cabeças', () => {
    // ⚠️ Comparando homens, 501 leves contra 500 arqueiros parecia vantagem — e o arqueiro
    // vale 1,33 em campo contra 1,00 do leve. A guarnição saía para morrer fora do muro.
    // Agora a previsão roda a MESMA função que decide a batalha.
    const comArma = (arma: 'leve' | 'arqueiro') => {
      const c = nova('megara');
      c.darOuro(400_000, 'megara');
      c.plantarHoste('atenas', 'atenas', 501, 'leve');
      // O cerco tem de ser DE VERDADE: sentar é o que cria o estado que a surtida pergunta.
      c.plantarHoste('eleusis', 'megara', 500, arma);
      const sitiante = c.hostesEm('eleusis').find((h) => h.poder === 'megara');
      c.ordenarMarcha(sitiante!.id, 'atenas', 500, 'megara', 'sitiar');
      c.passarTurno();
      expect(c.cercoEm('atenas')).toBeDefined();
      return defesasEscolhidas(c, 'atenas', ajustes.combate.batalha).filter(
        (o) => o.tipo === 'surtida',
      );
    };
    // Contra 500 leves, 501 leves ganham: ela sai.
    expect(comArma('leve')).toHaveLength(1);
    // Contra 500 ARQUEIROS, os mesmos 501 leves perdem: ela fica dentro do muro.
    expect(comArma('arqueiro')).toHaveLength(0);
  });

  it('a comida limita o TAMANHO da leva, e não só a decisão de levantar uma', () => {
    // ⚠️ Medido antes: com saldo ZERO ela levantava vinte mil homens e o turno fechava em −6.
    // Parar só quando o saldo já virou é chegar tarde — cada boca entra na conta do mesmo
    // turno.
    const c = nova('atenas');
    c.darOuro(900_000, 'tebas');
    const estilo = { ...estiloDe(ia, 'tebas'), folhaMilitar: 99, folhaEmPaz: 99 };

    for (let i = 0; i < 30; i++) {
      const leva = levaEscolhida(c, 'tebas', estilo, ajustes);
      if (!leva) break;
      c.recrutar(leva.provincia, leva.homens, leva.arma, 'tebas');
      c.passarTurno();
      c.darOuro(900_000, 'tebas');
      // ⚠️ A invariante inteira num assert: ela nunca leva o próprio reino ao vermelho.
      expect(`turno ${i}: saldo ${c.balancoAlimentarDe('tebas').saldo}`).toBe(
        `turno ${i}: saldo ${Math.max(0, c.balancoAlimentarDe('tebas').saldo)}`,
      );
    }
  });

  it('exército alheio se JUNTANDO na fronteira já é ameaça', () => {
    // ⚠️ As ordens são simultâneas: quando o invasor pisa na minha terra a batalha é hoje, e a
    // leva que eu levantar só vira hoste amanhã. O único aviso que existe é o exército
    // crescendo do outro lado — o mesmo que o jogador lê no mapa. Sem isto, o banco de provas
    // media zero socorros em oitenta turnos de invasão.
    const c = nova('megara');
    // Guarda pequena do vizinho: menor que a milícia de Elêusis, não assusta ninguém.
    c.plantarHoste('atenas', 'atenas', 100);
    expect(estaAmeacado(c, 'eleusis')).toBe(false);
    // Exército maior que tudo o que Elêusis tem: agora assusta.
    c.plantarHoste('atenas', 'atenas', 5000);
    expect(estaAmeacado(c, 'eleusis')).toBe(true);
  });
});
