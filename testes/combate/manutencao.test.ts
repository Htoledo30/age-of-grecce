import { describe, expect, it } from 'vitest';

import type { Campanha } from '../../src/campanha/campanha';

import { ajustes } from '../apoio/mundo';
import { ordenar } from '../apoio/hostes';
import { comQuartel } from './apoio';

const combate = ajustes.combate;

describe('manter tropa é o ralo de dinheiro', () => {
  it('a manutenção sai do tesouro todo turno, depois da arrecadação', () => {
    const c = comQuartel();
    c.recrutar('atenas', 1000);
    // Em formação, a leva ainda não é hoste e não cobra folha militar.
    expect(c.manutencao).toBe(0);
    c.passarTurno();

    const tesouro = c.tesouro;
    const renda = c.renda;
    const manutencao = c.manutencao;

    // A leva ficou em Atenas, que é de Atenas: taxa de casa.
    expect(manutencao).toBe(Math.round(1000 * combate.manutencaoPorHomem.emCasa));
    expect(c.saldoPorTurno).toBe(renda - manutencao);

    c.passarTurno();
    expect(c.tesouro).toBe(tesouro + renda - manutencao);
  });

  it('sem tropa não há manutenção', () => {
    const c = comQuartel();
    expect(c.manutencao).toBe(0);
    expect(c.saldoPorTurno).toBe(c.renda);
  });

  it('em casa a tropa cabe na renda; é cruzar a fronteira que quebra o reino', () => {
    const c = comQuartel();
    c.recrutar('atenas', 3000);
    c.passarTurno();

    // Parada em casa, a mesma tropa é falange de cidadão-lavrador: paga a taxa de casa e
    // o reino continua no azul. Em paz a pergunta é qual construção, não quanto aguento.
    const emCasa = c.forcaEm('atenas');
    expect(c.manutencao).toBe(Math.round(emCasa * combate.manutencaoPorHomem.emCasa));
    expect(c.saldoPorTurno).toBeGreaterThan(0);

    // Os MESMOS homens em terra alheia custam a taxa de campanha, e o saldo vira no
    // turno em que eles pisam lá. É sair de casa que custa.
    ordenar(c, 'atenas', 'eleusis', emCasa, 'atenas', 'sitiar');
    c.passarTurno();

    const fora = c.forcaEm('eleusis', 'atenas');
    expect(fora).toBeGreaterThan(0); // se ninguém chegou, o teste não testa nada
    expect(c.manutencao).toBe(Math.round(fora * combate.manutencaoPorHomem.emCampanha));
    expect(c.saldoPorTurno).toBeLessThan(0);
  });

  it('tomar a província faz a campanha virar guarnição, e o custo cai no mesmo turno', () => {
    const c = comQuartel();
    c.recrutar('atenas', 3000);
    c.passarTurno();
    ordenar(c, 'atenas', 'eleusis', c.forcaEm('atenas'), 'atenas', 'sitiar');
    c.passarTurno();

    const sitiando = c.manutencao;
    c.trocarDono('eleusis', 'atenas'); // a terra passou a ser de quem está em cima dela
    expect(c.manutencao).toBeLessThan(sitiando);

    // A razão entre as duas folhas é a razão entre as duas taxas: nada além do chão mudou.
    const taxas = combate.manutencaoPorHomem;
    expect(c.manutencao).toBe(Math.round((sitiando * taxas.emCasa) / taxas.emCampanha));
  });

  it('o aperto drena o tesouro e a tropa deserta aos poucos, sem colapso', () => {
    const c = comQuartel();
    c.recrutar('atenas', 3500);
    c.passarTurno();
    const forcaInicial = c.forcaEm('atenas');

    // O tesouro escorre até não cobrir a folha, e aí começa a desertar. Não existe
    // instante de colapso, existe uma corda esticando.
    for (let i = 0; i < 300; i++) c.passarTurno();

    expect(c.forcaEm('atenas')).toBeLessThan(forcaInicial); // desertou
    expect(c.forcaEm('atenas')).toBeGreaterThan(0); // proporcional, nunca aniquilação
    expect(c.tesouro).toBeGreaterThanOrEqual(0); // tesouro nunca fica negativo
    // A corda para de esticar onde a renda volta a sustentar a folha: o exército
    // encolhe até caber no que o reino paga, e ali estabiliza.
    expect(c.manutencao).toBeLessThanOrEqual(c.renda);
  });

  it('quem deserta volta pra casa em vez de sumir do mundo', () => {
    /**
     * Leva pequena de propósito: o reino continua alimentando todo mundo, e o único aperto
     * em cima da tropa é o do soldo. Assim a soma mede só a deserção.
     *
     * E ela marcha para FORA: em casa 2.500 homens cabem folgados na renda de Atenas, e
     * sem aperto não há deserção para medir. Quem não paga a campanha é quem vê a tropa
     * ir embora — a pergunta "aguento mais um turno disto?" é a da guerra, não a da paz.
     */
    function emCampanha(): Campanha {
      const c = comQuartel();
      c.recrutar('atenas', 2500);
      c.passarTurno();
      ordenar(c, 'atenas', 'eleusis', c.forcaEm('atenas'), 'atenas', 'sitiar');
      c.passarTurno();
      return c;
    }

    const c = emCampanha();
    c.darOuro(-c.tesouro);

    // O controle é a mesma campanha com o cofre cheio: mesma tropa, mesma comida, mesma
    // demografia — só que sem deserção. A diferença entre as duas é o que este teste mede.
    const pago = emCampanha();
    pago.darOuro(50_000);

    const forca = c.forcaEm('eleusis', 'atenas');
    c.passarTurno();
    pago.passarTurno();

    expect(c.fome.provincias).toEqual([]); // ninguém passou fome nesta janela
    expect(c.forcaEm('eleusis', 'atenas')).toBeLessThan(forca); // desertou
    expect(pago.forcaEm('eleusis', 'atenas')).toBe(forca); // e o controle não
    // O que saiu do exército reapareceu na província: o mundo continua com a mesma gente.
    // A margem de um punhado é arredondamento — o exército menor come um pouco menos, e o
    // crescimento do turno cai noutro inteiro.
    expect(c.populacaoDe('atenas') + c.homensEmArmasDe('atenas')).toBeGreaterThanOrEqual(
      pago.populacaoDe('atenas') + pago.homensEmArmasDe('atenas') - 5,
    );
  });

  it('a conta fecha em inteiros mesmo depois de desertar', () => {
    const c = comQuartel();
    c.recrutar('atenas', 3500);
    for (let i = 0; i < 300; i++) c.passarTurno();
    expect(Number.isInteger(c.tesouro)).toBe(true);
    expect(Number.isInteger(c.forcaEm('atenas'))).toBe(true);
    expect(Number.isInteger(c.populacaoDe('atenas'))).toBe(true);
  });
});
