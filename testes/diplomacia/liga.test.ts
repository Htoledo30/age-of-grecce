/**
 * A LIGA: mandar num reino sem tomá-lo.
 *
 * O terceiro estado possível para um vizinho, entre independente e conquistado. O que se guarda
 * aqui são as regras que a tornam uma decisão em vez de um botão de vitória — e uma delas
 * nasceu de uma pergunta de Henrique que derrubou o primeiro desenho: *"e se eu fosse Mégara
 * nessa situação?"*. Ver o topo de `src/campanha/diplomacia/liga.ts`.
 */

import { describe, expect, it } from 'vitest';

import { ajustes, novaCampanha } from '../apoio/mundo';

const LIGA = ajustes.diplomacia.liga;

/**
 * Uma campanha com Atenas liderando Elêusis.
 *
 * ⚠️ **O andaime SOBE A ESCADA, e não é preguiça de teste — é a única forma de chegar lá.**
 * A liga pede a opinião mais alta da mesa inteira, e só ouro não alcança: medido, presentear
 * Elêusis por oitenta turnos leva a opinião a 39, e a liga pede 40. O presente tem teto sobre
 * o ALVO, e o alvo entre esses dois é 7. Comércio (+10) e pacto (+15) levantam o alvo, e é aí
 * que o ouro alcança — que é exatamente o caminho que um jogador percorre.
 */
function comLiga(chefe = 'atenas', membro = 'eleusis') {
  const c = novaCampanha();
  c.comecar(chefe);
  c.darOuro(2_000_000, chefe);
  c.darOuro(2_000_000, membro);
  c.acordarComercio(membro, chefe);
  for (let i = 0; i < 80 && !c.podeFormarLiga(membro, chefe).pode; i++) {
    const pacto = c.prazosDePacto(chefe, membro).find((p) => p.pode);
    if (pacto && c.pactoAte(chefe, membro) === undefined) {
      c.firmarPacto(membro, pacto.turnos, chefe);
    }
    c.presentear(membro, 30_000, chefe);
    c.presentear(chefe, 30_000, membro);
    c.passarTurno();
  }
  expect(c.podeFormarLiga(membro, chefe).pode, 'o cenário precisa da liga possível').toBe(true);
  c.formarLiga(membro, chefe);
  return c;
}

describe('o membro continua sendo ele mesmo', () => {
  it('as províncias, o exército e o tesouro continuam dele', () => {
    const c = comLiga();
    // ⚠️ É a promessa central da liga, e a diferença inteira entre ela e a conquista.
    expect(c.provinciasDe('eleusis').length).toBeGreaterThan(0);
    for (const p of c.provinciasDe('eleusis')) expect(c.donoDe(p)).toBe('eleusis');
    expect(c.chefeDe('eleusis')).toBe('atenas');
    expect(c.membrosDe('atenas')).toEqual(['eleusis']);
  });

  it('o tributo sai do bolso dele e entra no do chefe, e a soma é zero', () => {
    const c = comLiga();
    const devido = c.tributoDaLigaDe('eleusis');
    expect(devido).toBeGreaterThan(0);
    // ⚠️ Entra na RENDA dos dois, como o tributo comum: um número que o jogador lê e que não
    // mente. O que sai de um entra no outro, e o mapa não ganha nem perde moeda nenhuma.
    const membroAntes = c.rendaDe('eleusis');
    const chefeAntes = c.rendaDe('atenas');
    c.romperLiga('eleusis', 'atenas');
    expect(c.rendaDe('eleusis') - membroAntes).toBe(devido);
    expect(c.rendaDe('atenas') - chefeAntes).toBe(-devido);
  });

  it('um membro não pode ter dois chefes, e quem serve não lidera', () => {
    const c = comLiga();
    expect(c.podeFormarLiga('eleusis', 'megara').pode).toBe(false);
    expect(c.podeFormarLiga('megara', 'eleusis').pode).toBe(false);
  });
});

describe('a liga é paz entre os dois e guerra com o resto', () => {
  it('chefe e membro não declaram guerra um ao outro', () => {
    const c = comLiga();
    const doChefe = c.podeDeclararGuerra('eleusis', 'atenas');
    expect(doChefe.pode).toBe(false);
    expect(doChefe.pode === false ? doChefe.motivo : '').toContain('MEMBRO');
    const doMembro = c.podeDeclararGuerra('atenas', 'eleusis');
    expect(doMembro.pode).toBe(false);
    expect(doMembro.pode === false ? doMembro.motivo : '').toContain('CHEFE');
  });

  it('a guerra do chefe vira a guerra do membro, no mesmo turno', () => {
    const c = comLiga();
    expect(c.emGuerra('eleusis', 'tebas')).toBe(false);
    c.declararGuerra('tebas');
    expect(c.emGuerra('eleusis', 'tebas')).toBe(true);
  });
});

describe('o que segura o membro é o tributo, e é o mesmo botão do imposto', () => {
  it('cobrar pesado empurra o desejo para cima; cobrar leve o traz para baixo', () => {
    const c = comLiga();
    const alvoCom = (nivel: string): number => {
      c.mudarTributoDaLiga('eleusis', nivel);
      return c.alvoDoDesejoDe('eleusis');
    };
    const niveis = Object.entries(LIGA.niveisDeTributo).sort((a, b) => a[1].desejo - b[1].desejo);
    const maisLeve = niveis[0]![0];
    const maisPesado = niveis.at(-1)![0];
    expect(alvoCom(maisPesado)).toBeGreaterThan(alvoCom(maisLeve));
  });

  it('⚠️ apertar demais e ir à guerra faz o membro se revoltar — e a revolta é uma GUERRA', () => {
    // A IA nunca chega aqui porque ela alivia o tributo sozinha quando o desejo sobe. Quem
    // chega é o jogador ganancioso, e é para ele que esta regra existe.
    const c = comLiga();
    const maisPesado = Object.entries(LIGA.niveisDeTributo).sort(
      (a, b) => b[1].desejo - a[1].desejo,
    )[0]![0];
    c.mudarTributoDaLiga('eleusis', maisPesado);
    c.declararGuerra('tebas'); // a guerra do chefe é a parte que o membro não escolheu

    for (let i = 0; i < 60 && c.chefeDe('eleusis') !== undefined; i++) c.passarTurno();

    expect(c.chefeDe('eleusis'), 'ele tinha de ter saído').toBeUndefined();
    // ⚠️ Sair é uma coisa; pegar em armas é outra, e a revolta é as duas. Sem a guerra, o
    // membro apertado simplesmente sumiria da liga e nada aconteceria.
    expect(c.emGuerra('atenas', 'eleusis')).toBe(true);
  });
});

describe('anexar só acontece com o SIM do membro', () => {
  it('não se anexa quem entrou ontem, por mais contente que ele esteja', () => {
    // ⚠️ **Sem o prazo a liga virava um cano.** Medido em 150 turnos: as 6 ligas formadas
    // terminaram em 4 anexações e nenhum membro de pé — entrar e ser engolido virou um passo só.
    const c = comLiga();
    expect(LIGA.turnosParaAnexar).toBeGreaterThan(0);
    expect(c.aceitaSerAnexado('eleusis')).toBe(false);
    c.anexarMembro('eleusis');
    expect(c.chefeDe('eleusis'), 'ele continua membro, e continua dele').toBe('atenas');
    expect(c.provinciasDe('eleusis').length).toBeGreaterThan(0);
  });

  it('com tempo e tributo leve ele aceita, e a terra passa SEM o choque da conquista', () => {
    const c = comLiga();
    const maisLeve = Object.entries(LIGA.niveisDeTributo).sort(
      (a, b) => a[1].desejo - b[1].desejo,
    )[0]![0];
    c.mudarTributoDaLiga('eleusis', maisLeve);
    for (let i = 0; i < LIGA.turnosParaAnexar + 40 && !c.aceitaSerAnexado('eleusis'); i++) {
      c.passarTurno();
    }
    expect(c.aceitaSerAnexado('eleusis'), 'tratado bem e por décadas, ele aceitaria').toBe(true);

    const terras = [...c.provinciasDe('eleusis')];
    const humorAntes = terras.map((p) => c.felicidadeEm(p));
    c.anexarMembro('eleusis');

    for (const p of terras) expect(c.donoDe(p)).toBe('atenas');
    expect(c.chefeDe('eleusis')).toBeUndefined();
    // ⚠️ **Aceitou não é tomada.** O choque de humor mora no caminho da CONQUISTA; quem passa
    // de mão por acordo não apanha por isso. O preço permanente é outro e continua existindo:
    // a nacionalidade, que não se apaga.
    terras.forEach((p, i) => expect(c.felicidadeEm(p)).toBe(humorAntes[i]));
  });

  it('o exército do membro anexado passa a ser do chefe, e não fica abandonado', () => {
    const c = comLiga();
    const maisLeve = Object.entries(LIGA.niveisDeTributo).sort(
      (a, b) => a[1].desejo - b[1].desejo,
    )[0]![0];
    c.mudarTributoDaLiga('eleusis', maisLeve);
    for (let i = 0; i < LIGA.turnosParaAnexar + 40 && !c.aceitaSerAnexado('eleusis'); i++) {
      c.passarTurno();
    }
    const guarda = c.plantarHoste('eleusis', 'eleusis', 400);
    c.anexarMembro('eleusis');
    expect(c.hoste(guarda)?.poder).toBe('atenas');
  });
});
