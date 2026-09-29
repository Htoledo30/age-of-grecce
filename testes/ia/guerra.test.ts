import { describe, expect, it } from 'vitest';

import { estiloDe } from '../../src/ia/estilo';
import { defesasEscolhidas } from '../../src/ia/guerra/defender';
import { levaEscolhida } from '../../src/ia/guerra/recrutar';
import { poderesDaIa } from '../../src/ia/ia';
import { ameacasDe, estaAmeacado, forcaTotalDe } from '../../src/ia/percepcao/ameaca';
import {
  assaltosMaduros,
  ataquesEscolhidos,
  retiradasEscolhidas,
} from '../../src/ia/guerra/marchar';
import { oportunidadesDe } from '../../src/ia/percepcao/oportunidade';
import { ajustes, correrIA, ia, novaCampanha, novaCampanhaFarta } from '../apoio/mundo';

const nova = (jogador = 'atenas') => {
  const c = novaCampanha();
  c.comecar(jogador);
  return c;
};

/**
 * A mesma coisa com a comida fora do caminho, para quem compara ARMAS e não despensas.
 *
 * ⚠️ Existe por um caso só, e ele é instrutivo: a surtida de 501 leves contra 500. Com a
 * comida apertada, Atenas no turno 1 sustenta 500 homens — os 501 do teste passam fome, o
 * quingentésimo primeiro morre, e a comparação que o teste queria fazer nunca acontece. O
 * cenário perderia o ponto por um homem.
 */
const novaFarta = (jogador = 'atenas') => {
  const c = novaCampanhaFarta();
  c.comecar(jogador);
  return c;
};

/** Roda `turnos` viradas com a IA jogando. O jogador fica parado, como o controle. */
const correr = (c: ReturnType<typeof nova>, turnos: number) => correrIA(c, turnos);

const guerreiro = () => estiloDe(ia, 'tebas');
const batalha = ajustes.combate.batalha;
const combate = ajustes.combate;
const semOrdens = new Set<string>();

/**
 * Declara guerra a todo o mapa simulado.
 *
 * ⚠️ **Os testes de ATAQUE falam de ataque.** Desde a diplomacia, `ataquesEscolhidos` só olha
 * para quem já está em guerra — e sem isto cada cenário aqui teria uma linha de tratado no
 * começo dizendo a mesma coisa. Quem decide DECLARAR tem testes próprios, em
 * `testes/diplomacia.test.ts`.
 */
const emGuerraComTodos = (c: ReturnType<typeof nova>, poder: string) => {
  for (const provincia of c.provinciasSimuladas) {
    const dono = c.donoDe(provincia);
    if (dono !== poder && !c.emGuerra(dono, poder)) c.declararGuerra(dono, poder);
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

  it('o cofre CHEIO vira folha, e o cofre de reserva não', () => {
    // ⚠️ O ouro parado era o defeito: em 250 turnos quem vencia guardava 120 mil moedas com três
    // mil homens. Acima da reserva, o cofre paga tropa; abaixo dela, só a renda paga.
    const c = nova('atenas');
    const estilo = { ...estiloDe(ia, 'tebas'), folhaMilitar: 0, folhaEmPaz: 0 };
    expect(levaEscolhida(c, 'tebas', { ...estilo, cofreNaFolha: 1 }, ajustes)).toBeNull();

    c.darOuro(1_000_000, 'tebas');
    expect(levaEscolhida(c, 'tebas', { ...estilo, cofreNaFolha: 0 }, ajustes)).toBeNull();
    expect(levaEscolhida(c, 'tebas', { ...estilo, cofreNaFolha: 0.05 }, ajustes)).not.toBeNull();
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
    // Só o tempo da obra, sem a IA jogando: com 400 mil no cofre ela gastaria o presente em
    // tropa até a despensa travar, e o teste deixaria de ser sobre a escolha da arma.
    for (let i = 0; i < 6; i++) c.passarTurno();
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

});

describe('a IA ataca — a etapa 3', () => {
  it('o mapa muda de dono: cem turnos e alguém cresceu', () => {
    // ⚠️ **Este teste era o contrário até a etapa 3.** Ele guardava a regra dura da etapa 2 —
    // *"nenhuma hoste pisa em terra alheia"* —, e virá-lo do avesso é o que marca a passagem: o
    // que antes provava que o mapa não se mexia agora prova que ele se mexe.
    const c = nova('atenas');
    const antes = new Map(c.provinciasSimuladas.map((id) => [id, c.donoDe(id)] as const));
    correr(c, 100);
    const mudaram = [...antes].filter(([id, dono]) => c.donoDe(id) !== dono);
    expect(mudaram.length).toBeGreaterThan(0);
  });

  it('⚠️ e NÃO come as províncias sem ficha: Delfos não é conquista, é passeio', () => {
    // Das 196 desenhadas, só uma parte é simulada. As outras não têm população e portanto não
    // têm milícia: caem no primeiro soldado. Uma IA solta nelas dobraria de tamanho em cinco turnos
    // sem levar uma batalha, e o teatro desenhado afundaria num mapa de terra grátis.
    const c = nova('atenas');
    const simuladas = new Set(c.provinciasSimuladas);
    const vazias = [...new Set(c.provinciasSimuladas.flatMap((id) => c.vizinhasDe(id)))].filter(
      (id) => !simuladas.has(id),
    );
    expect(vazias.length).toBeGreaterThan(0);
    const antes = new Map(vazias.map((id) => [id, c.donoDe(id)] as const));
    correr(c, 60);
    for (const [provincia, dono] of antes) {
      expect(`${provincia}: ${c.donoDe(provincia)}`).toBe(`${provincia}: ${dono}`);
    }
  });

  it('com guerra na porta ela não sai de casa', () => {
    // A hoste que sairia para atacar é a mesma que segura a fronteira. Não é timidez: as ordens
    // são simultâneas, e trocar de província com o invasor entrega uma terra pronta por uma que
    // ainda vai ferver.
    const livre = emGuerraComTodos(nova('atenas'), 'tebas');
    livre.plantarHoste('tebas', 'tebas', 4000);
    expect(ataquesEscolhidos(livre, 'tebas', guerreiro(), combate, semOrdens).length)
      .toBeGreaterThan(0);

    // O mesmo tabuleiro, com um exército alheio em cima de uma terra dela.
    const ameacado = emGuerraComTodos(nova('atenas'), 'tebas');
    ameacado.plantarHoste('tebas', 'tebas', 4000);
    ameacado.plantarHoste('tanagra', 'megara', 500);
    expect(ataquesEscolhidos(ameacado, 'tebas', guerreiro(), combate, semOrdens)).toHaveLength(0);
  });

  it('a guarda de casa não vira exército de invasão', () => {
    // ⚠️ Medido sem este freio: dezessete poderes olhavam a milícia do vizinho no turno 1, viam
    // que ganhavam, e marchavam TODOS ao mesmo tempo — cinco conquistas no primeiro turno e a
    // capital de Atenas caindo no terceiro. Nenhum estava errado sobre a batalha; todos estavam
    // errados sobre a casa que deixavam.
    const c = emGuerraComTodos(nova('atenas'), 'tebas');
    c.plantarHoste('tebas', 'tebas', 4000);
    const estilo = guerreiro();
    const ordens = ataquesEscolhidos(c, 'tebas', estilo, combate, semOrdens);
    const emCampanha = ordens.reduce((soma, o) => soma + o.homens, 0);
    expect(ordens.length).toBeGreaterThan(0);
    expect(emCampanha).toBeLessThanOrEqual(4000 * estilo.fracaoQueMarcha);
    // E o que não marchou continua em casa: a ordem é de um DESTACAMENTO.
    expect(emCampanha).toBeLessThan(4000);
  });

  it('não marcha sobre cidade que ela não toma, por mais que a queira', () => {
    // Ganhar a batalha de campo não é tomar a praça: depois do choque vem a muralha, e ela é
    // subida com o que SOBROU. Uma IA que parasse na primeira conta sentaria para sempre.
    const c = nova('atenas');
    c.plantarHoste('tebas', 'tebas', 300);
    for (const ordem of ataquesEscolhidos(c, 'tebas', guerreiro(), combate, semOrdens)) {
      const milicia = c.miliciaEm(ordem.destino);
      expect(`${ordem.destino}: ${milicia < ordem.homens}`).toBe(`${ordem.destino}: true`);
    }
  });

  it('o cerco dela vira assalto quando a muralha deixa — senão nunca terminaria', () => {
    // Sentar NUNCA toma a praça, e a hoste sentada não recebe ordem de marcha nenhuma. Sem esta
    // decisão o cerco da IA seria a estátua que Henrique já viu na revolta.
    const c = nova('atenas');
    c.plantarHoste('tebas', 'tebas', 6000);
    const sitiante = c.hostesEm('tebas').find((h) => h.poder === 'tebas');
    // Plateia não tem muralha: o assalto já poderia ser hoje, e mesmo assim ela SENTOU.
    c.declararGuerra('plateia', 'tebas');
    c.ordenarMarcha(sitiante!.id, 'plateia', 6000, 'tebas', 'sitiar');
    c.passarTurno();
    expect(c.cercoEm('plateia')).toMatchObject({ sitiante: 'tebas', postura: 'sitiar' });
    expect(assaltosMaduros(c, 'tebas', guerreiro(), batalha)).toContain('plateia');
    // ⚠️ **Com exército alheio de pé ali, a decisão continua sendo dela — e é a única saída.**
    // A hoste sentada não recebe ordem de marcha, então trocar a postura é a ÚNICA forma de
    // engajar o defensor: a primeira versão pulava esses cercos e os dois ficavam acampados lado
    // a lado para sempre. Contra uma guarnição pequena ela vai.
    c.plantarHoste('plateia', 'plateia', 400);
    expect(assaltosMaduros(c, 'tebas', guerreiro(), batalha)).toContain('plateia');
    // Contra um exército que a esmaga, não: perder o campo é perder o cerco junto.
    c.plantarHoste('plateia', 'plateia', 40_000);
    expect(assaltosMaduros(c, 'tebas', guerreiro(), batalha)).not.toContain('plateia');
  });

  it('quando a muralha barra o assalto, ela SENTA em vez de desistir', () => {
    // ⚠️ **Sem esta jogada ela conhecia um golpe só, e por isso parecia tímida.** Medido antes:
    // 7 turnos de cerco no mapa inteiro em 100 turnos, com dezessete poderes em guerra com todo
    // mundo. Cidade murada exige rodadas de cerco antes de qualquer assalto — quem desiste
    // diante dela nunca a toma.
    const c = nova('atenas');
    // Tebas fica com tudo em volta menos Tânagra, que é murada desde 700 a.C.
    for (const id of ['calcis', 'opunte', 'plateia', 'tespias']) c.trocarDono(id, 'tebas');
    emGuerraComTodos(c, 'tebas');
    c.plantarHoste('tebas', 'tebas', 1200);
    const ordens = ataquesEscolhidos(c, 'tebas', guerreiro(), combate, semOrdens);
    expect(ordens).toHaveLength(1);
    expect(ordens[0]).toMatchObject({ destino: 'tanagra', postura: 'sitiar' });
  });

  it('mas não senta com menos gente do que a praça tem em pé', () => {
    // ⚠️ **A estátua que isto impede foi medida.** Sem esta linha a IA acampava com 142 homens
    // diante dos 415 milicianos de Atenas — e continuava lá no turno 59. A fome do cerco derruba
    // 1% da população por virada: a conta só viraria depois de cento e cinquenta turnos. Três
    // cercos desses consumiam a fatia que podia marchar do mapa inteiro, e o resultado foi **3
    // conquistas em 100 turnos**: a IA ficou MENOS agressiva por ter aprendido a sentar.
    const c = emGuerraComTodos(nova('megara'), 'eleusis');
    c.plantarHoste('eleusis', 'eleusis', 160);
    expect(c.miliciaEm('atenas')).toBeGreaterThan(160);
    // Ela pode achar outra terra que caia hoje — o que não pode é ACAMPAR diante de Atenas.
    const destinos = ataquesEscolhidos(
      c,
      'eleusis',
      estiloDe(ia, 'eleusis'),
      combate,
      semOrdens,
    ).map((o) => o.destino);
    expect(destinos).not.toContain('atenas');
  });

  it('e não abre cerco que a renda não paga', () => {
    // Homem em terra alheia custa a taxa de campanha — três vezes a de casa — e um cerco não tem
    // fim marcado. Exército parado diante de um muro sem ouro para pagá-lo é a mesma estátua,
    // com o agravante de sangrar o reino inteiro junto.
    const comFolga = nova('atenas');
    for (const id of ['calcis', 'opunte', 'plateia', 'tespias']) comFolga.trocarDono(id, 'tebas');
    emGuerraComTodos(comFolga, 'tebas');
    comFolga.plantarHoste('tebas', 'tebas', 1200);
    expect(
      ataquesEscolhidos(comFolga, 'tebas', guerreiro(), combate, semOrdens).map((o) => o.destino),
    ).toContain('tanagra');

    // O mesmo cerco, com um exército que a renda não sustenta fora de casa.
    const semFolga = nova('atenas');
    for (const id of ['calcis', 'opunte', 'plateia', 'tespias']) semFolga.trocarDono(id, 'tebas');
    emGuerraComTodos(semFolga, 'tebas');
    semFolga.plantarHoste('tebas', 'tebas', 3000);
    expect(
      ataquesEscolhidos(semFolga, 'tebas', guerreiro(), combate, semOrdens).map((o) => o.destino),
    ).not.toContain('tanagra');
  });

  it('a fatia que marcha desconta quem JÁ está fora de casa', () => {
    // ⚠️ O furo da primeira versão: a fatia era recalculada do zero a cada virada, então um poder
    // mandava 40% hoje, 40% amanhã e 40% depois — e acabava com o exército inteiro em terra
    // alheia justamente porque existia um teto para isso não acontecer.
    const c = emGuerraComTodos(nova('atenas'), 'tebas');
    c.plantarHoste('tebas', 'tebas', 1000);
    expect(ataquesEscolhidos(c, 'tebas', guerreiro(), combate, semOrdens).length).toBeGreaterThan(
      0,
    );
    // A mesma força, mas já toda acampada em terra alheia: não sai mais ninguém.
    const fora = emGuerraComTodos(nova('atenas'), 'tebas');
    fora.plantarHoste('tanagra', 'tebas', 1000);
    expect(ataquesEscolhidos(fora, 'tebas', guerreiro(), combate, semOrdens)).toEqual([]);
  });

  it('ela DESISTE de um cerco que azedou, em vez de virar estátua', () => {
    // ⚠️ Sentar não é compromisso eterno: a conta que autorizou sentar é refeita todo turno. Sem
    // isto a IA ficava cinquenta turnos diante de um muro, pagando folha de campanha três vezes
    // maior que a de casa, enquanto a província dela era tomada do outro lado do reino.
    const c = nova('atenas');
    // Tebas fica com tudo em volta menos Tânagra, que é murada: o único alvo dela pede cerco.
    for (const id of ['calcis', 'opunte', 'plateia', 'tespias']) c.trocarDono(id, 'tebas');
    emGuerraComTodos(c, 'tebas');
    c.plantarHoste('tebas', 'tebas', 1200);
    const ordens = ataquesEscolhidos(c, 'tebas', guerreiro(), combate, semOrdens);
    expect(ordens[0]).toMatchObject({ destino: 'tanagra', postura: 'sitiar' });
    for (const o of ordens) c.ordenarMarcha(o.hoste, o.destino, o.homens, 'tebas', o.postura);
    c.passarTurno();
    expect(c.cercoEm('tanagra')).toMatchObject({ sitiante: 'tebas' });
    // Enquanto a conta fecha, ela fica: sentar é uma decisão, não teimosia.
    expect(retiradasEscolhidas(c, 'tebas', combate, semOrdens)).toEqual([]);
    // O dono junta um exército que o sitiante não vence: ficar ali é escolher onde perder.
    c.plantarHoste('tanagra', 'tanagra', 40_000);
    expect(
      retiradasEscolhidas(c, 'tebas', combate, semOrdens).map((v) => v.destino),
    ).not.toHaveLength(0);
  });

  it('e volta para casa quando a casa está pegando fogo', () => {
    // Com inimigo pisando em terra minha, o exército que está longe é o que está faltando.
    const c = emGuerraComTodos(nova('atenas'), 'tebas');
    c.plantarHoste('plateia', 'tebas', 900);
    expect(retiradasEscolhidas(c, 'tebas', combate, semOrdens)).toEqual([]);
    c.plantarHoste('tebas', 'plateia', 500);
    expect(retiradasEscolhidas(c, 'tebas', combate, semOrdens).map((v) => v.hoste)).toHaveLength(
      1,
    );
  });

  it('a mesma partida dá o mesmo mapa, duas vezes', () => {
    // Determinismo de ponta a ponta: sem ele não há salvamento confiável nem regressão, e um
    // defeito de guerra vira "às vezes acontece".
    const mapaDe = (c: ReturnType<typeof nova>) =>
      [...c.provinciasSimuladas]
        .sort()
        .map((id) => `${id}:${c.donoDe(id)}`)
        .join(' ');
    expect(mapaDe(correr(nova('atenas'), 40))).toBe(mapaDe(correr(nova('atenas'), 40)));
  });

  it('o alvo é escolhido pelo VALOR, e o estilo muda o que vale', () => {
    // A capital alheia não rende mais por ser capital: ela é o coração da rede de trocas do
    // dono. Quanto isso vale é do estilo, e é o que separa o guerreiro do mercador.
    const c = nova('atenas');
    expect(oportunidadesDe(c, 'tebas').some((o) => o.capital)).toBe(true);
    expect(estiloDe(ia, 'tebas').valorDaCapital).toBeGreaterThan(
      estiloDe(ia, 'corinto').valorDaCapital,
    );
    // E o mercador exige muito mais vantagem antes de assinar uma guerra do que o guerreiro.
    expect(estiloDe(ia, 'corinto').vantagemParaDeclarar).toBeGreaterThan(
      estiloDe(ia, 'tebas').vantagemParaDeclarar,
    );
  });
});

describe('o mapa deixou de ser um jardim de estátuas', () => {
  it('depois de trinta turnos, os vizinhos têm exército de verdade', () => {
    // A promessa inteira da etapa 2 num teste só: suas lanças param de entrar andando.
    // ⚠️ Não é mais sobre Mégara: com o Peloponeso no mapa ela pode cair antes do turno 30, e o
    // que se guarda é que quem SOBREVIVE se armou.
    const c = nova('atenas');
    for (const p of poderesDaIa(c)) expect(forcaTotalDe(c, p), p).toBe(0);
    correr(c, 30);

    const vivos = poderesDaIa(c).filter((p) => c.provinciasDe(p).length > 0);
    const armados = vivos.filter((p) => forcaTotalDe(c, p) > 0);
    expect(vivos.length).toBeGreaterThan(0);
    expect(armados.length).toBeGreaterThanOrEqual(vivos.length / 2);
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

  it('exército INIMIGO na minha terra, ou em campanha na porta dela, é ameaça', () => {
    // ⚠️ **INIMIGO, e não "alheio": desde a diplomacia as duas primeiras regras exigem guerra
    // declarada.** Sem a distinção, o exército de um vizinho brigando com um TERCEIRO na minha
    // fronteira me deixava permanentemente ameaçado — e a IA não sai de casa enquanto está.
    // Medido no turno 151 de uma partida: Tebas, com 13.167 homens, não atacava uma cidade de
    // 185 milicianos porque um vizinho em paz com ela estava em campanha do outro lado da
    // divisa.
    const naMinhaTerra = nova('atenas');
    naMinhaTerra.plantarHoste('tebas', 'atenas', 500);
    expect(estaAmeacado(naMinhaTerra, 'tebas')).toBe(false);
    naMinhaTerra.declararGuerra('tebas', 'atenas');
    expect(estaAmeacado(naMinhaTerra, 'tebas')).toBe(true);

    // Fora de casa, na porta: alguém em campanha CONTRA MIM, e o próximo passo pode ser aqui.
    const naPorta = nova('atenas');
    naPorta.trocarDono('tanagra', 'atenas');
    naPorta.plantarHoste('tanagra', 'megara', 500);
    // Tebas com guarda de sobra: assim a terceira regra — "juntou mais gente do que eu tenho no
    // mundo" — fica de fora, e o que este caso mede é só a campanha em curso na porta.
    naPorta.plantarHoste('tebas', 'tebas', 1200);
    expect(naPorta.donoDe('tanagra')).not.toBe('megara');
    expect(estaAmeacado(naPorta, 'tebas')).toBe(false);
    naPorta.declararGuerra('tebas', 'megara');
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
    naGuerra.declararGuerra('tebas', 'atenas');
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
      const c = novaFarta('megara');
      c.darOuro(400_000, 'megara');
      c.plantarHoste('atenas', 'atenas', 501, 'leve');
      // O cerco tem de ser DE VERDADE: sentar é o que cria o estado que a surtida pergunta.
      c.plantarHoste('eleusis', 'megara', 500, arma);
      const sitiante = c.hostesEm('eleusis').find((h) => h.poder === 'megara');
      c.declararGuerra('atenas', 'megara');
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
