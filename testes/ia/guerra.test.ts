import { describe, expect, it } from 'vitest';

import { estiloDe } from '../../src/ia/estilo';
import { defesasEscolhidas } from '../../src/ia/guerra/defender';
import { levaEscolhida } from '../../src/ia/guerra/recrutar';
import { jogarIA, poderesDaIa } from '../../src/ia/ia';
import { ameacasDe, forcaTotalDe } from '../../src/ia/percepcao/ameaca';
import { ajustes, ia, novaCampanha } from '../apoio/mundo';

const nova = (jogador = 'atenas') => {
  const c = novaCampanha();
  c.comecar(jogador);
  return c;
};

/** Roda `turnos` viradas com a IA jogando. O jogador fica parado, como o controle. */
const correr = (c: ReturnType<typeof nova>, turnos: number) => {
  for (let i = 0; i < turnos; i++) {
    jogarIA(c, ia, ajustes.combate);
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
    const semFolha = levaEscolhida(c, 'tebas', { ...estilo, folhaMilitar: 0 }, ajustes.combate);
    expect(semFolha).toBeNull();

    const comFolha = levaEscolhida(c, 'tebas', { ...estilo, folhaMilitar: 1 }, ajustes.combate);
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
      const leva = levaEscolhida(c, 'tebas', { ...estilo, folhaMilitar: 99 }, ajustes.combate);
      if (!leva) break;
      c.darOuro(50_000, 'tebas');
      c.recrutar(leva.provincia, leva.homens, leva.arma, 'tebas');
      c.passarTurno();
    }
    if (c.balancoAlimentarDe('tebas').saldo < 0) {
      expect(levaEscolhida(c, 'tebas', { ...estilo, folhaMilitar: 99 }, ajustes.combate)).toBeNull();
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
    const bom = levaEscolhida(c, 'tebas', { ...base, arma: 'melhor', folhaMilitar: 9 }, ajustes.combate);
    const barato = levaEscolhida(c, 'tebas', { ...base, arma: 'barata', folhaMilitar: 9 }, ajustes.combate);
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

    const ordens = defesasEscolhidas(c, 'atenas');
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
