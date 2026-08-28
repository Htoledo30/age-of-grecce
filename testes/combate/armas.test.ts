import { describe, expect, it } from 'vitest';

import { resolverBatalha } from '../../src/combate/batalha';
import { bocasDe, leves, porArma, valorEmCampo } from '../../src/combate/composicao';
import type { GrupoEmCampo } from '../../src/combate/composicao';
import type { Arma } from '../../src/combate/exercito';
import { ajustes, novaCampanha as nova } from '../apoio/mundo';

const regras = ajustes.combate.batalha;
const grupo = (arma: Arma, homens: number, qualidade = 1): GrupoEmCampo => ({
  arma,
  qualidade,
  homens,
});

/** Um duelo puro entre duas misturas. O defensor é `b`, e é ele quem leva o desempate. */
function duelo(a: readonly GrupoEmCampo[], b: readonly GrupoEmCampo[]) {
  return resolverBatalha(
    { ...valorEmCampo(a, b, regras), recuaAos: null },
    { ...valorEmCampo(b, a, regras), recuaAos: null },
    regras,
    'b',
  );
}

describe('o valor de uma mistura em campo', () => {
  it('o LEVE é a régua: um exército só de leves vale exatamente 1 em tudo', () => {
    // ⚠️ Isto não é balanço, é a âncora da escala inteira. Ataque e aguento de toda arma são
    // medidos em leves, e a milícia entra na batalha por esta mesma porta — se o leve
    // deixasse de valer 1, cada número do combate mudaria de significado em silêncio.
    expect(valorEmCampo([grupo('leve', 500)], [grupo('leve', 500)], regras)).toEqual(leves(500));
    expect(regras.armas.leve.ataque).toBe(1);
    expect(regras.armas.leve.aguento).toBe(1);
  });

  it('conta os homens todos e devolve médias POR HOMEM', () => {
    const misto = [grupo('leve', 300), grupo('hoplita', 700)];
    const v = valorEmCampo(misto, [grupo('leve', 1)], regras);
    expect(v.homens).toBe(1000);
    // Média ponderada, e não soma: quem entra na batalha é o total de homens vezes o valor de
    // cada um. Guardar o total já multiplicado esconderia a conta de quem lê a janela.
    expect(v.aguento).toBeCloseTo((300 * 1 + 700 * regras.armas.hoplita.aguento) / 1000, 10);
    expect(v.ataque).toBeCloseTo((300 * 1 + 700 * regras.armas.hoplita.ataque) / 1000, 10);
  });

  it('a QUALIDADE multiplica o ataque e não o aguento', () => {
    // ⚠️ Deliberado: se o treino também absorvesse, o Quartel viraria multiplicador
    // quadrático — o nível III renderia o quadrado do que a ficha promete. O número que o
    // jogador lê tem que ser o efeito que ele recebe.
    const comum = valorEmCampo([grupo('hoplita', 500)], [grupo('leve', 1)], regras);
    const treinada = valorEmCampo([grupo('hoplita', 500, 1.3)], [grupo('leve', 1)], regras);
    expect(treinada.ataque).toBeCloseTo(comum.ataque * 1.3, 10);
    expect(treinada.aguento).toBe(comum.aguento);
  });

  it('o exército vazio não vale nada, e não estoura', () => {
    expect(valorEmCampo([], [grupo('hoplita', 100)], regras)).toEqual(leves(0));
    expect(valorEmCampo([grupo('hoplita', 100)], [], regras).ataque).toBe(
      regras.armas.hoplita.ataque,
    );
  });

  it('porArma conta cabeças por arma, sem inventar as que não vieram', () => {
    expect(porArma([grupo('leve', 40), grupo('hoplita', 60), grupo('hoplita', 10)])).toEqual({
      leve: 40,
      hoplita: 70,
      arqueiro: 0,
      cavalaria: 0,
    });
  });
});

describe('o triângulo', () => {
  const TRIANGULO = [
    ['hoplita', 'cavalaria'],
    ['cavalaria', 'arqueiro'],
    ['arqueiro', 'hoplita'],
  ] as const;

  it('quem tem a arma certa vence com o MESMO número de homens', () => {
    // A promessa inteira do sistema num teste só: nenhuma arma é a melhor: existe a certa
    // contra o que está na frente. Vale como relação — se o balanço mudar os números, o
    // triângulo continua tendo que fechar.
    for (const [caca, presa] of TRIANGULO) {
      const r = duelo([grupo(caca, 1000)], [grupo(presa, 1000)]);
      expect(`${caca} vence ${presa}: ${r.vencedor}`).toBe(`${caca} vence ${presa}: a`);
    }
  });

  it('o counter é BÔNUS de quem tem a arma, nunca penalidade de quem sofre', () => {
    // Contar as duas pontas dobraria o efeito e transformaria a vantagem suave em dominância.
    const contraLeve = valorEmCampo([grupo('hoplita', 100)], [grupo('leve', 100)], regras);
    const contraPresa = valorEmCampo([grupo('hoplita', 100)], [grupo('cavalaria', 100)], regras);
    const contraCacador = valorEmCampo([grupo('hoplita', 100)], [grupo('arqueiro', 100)], regras);
    expect(contraPresa.ataque).toBeCloseTo(contraLeve.ataque * regras.armas.counter, 10);
    // Diante de quem o conta, o hoplita não perde nada: quem ganha é o arqueiro, no ataque
    // DELE.
    expect(contraCacador.ataque).toBe(contraLeve.ataque);
    expect(contraCacador.aguento).toBe(contraLeve.aguento);
  });

  it('vale só contra a FATIA do inimigo que aquela arma bate', () => {
    // Um cavaleiro solto do outro lado não pode dar ao hoplita a vantagem inteira.
    const metade = valorEmCampo(
      [grupo('hoplita', 100)],
      [grupo('cavalaria', 500), grupo('leve', 500)],
      regras,
    );
    const base = valorEmCampo([grupo('hoplita', 100)], [grupo('leve', 100)], regras);
    expect(metade.ataque).toBeCloseTo(base.ataque * (1 + (regras.armas.counter - 1) * 0.5), 10);
  });
});

describe('a cavalaria: o que ela compra é o DEPOIS', () => {
  const vencedorCom = (fracaoACavalo: number) => {
    const cavalos = Math.round(1000 * fracaoACavalo);
    return [grupo('hoplita', 1000 - cavalos), grupo('cavalaria', cavalos)].filter(
      (g) => g.homens > 0,
    );
  };
  const vencido = [grupo('hoplita', 600)];

  it('quanto mais cavalo, menos gente o derrotado leva para casa', () => {
    const semCavalo = duelo(vencedorCom(0), vencido);
    const comEsquadrao = duelo(vencedorCom(0.1), vencido);
    const soCavalo = duelo(vencedorCom(1), vencido);
    expect(semCavalo.vencedor).toBe('a');
    expect(comEsquadrao.vencedor).toBe('a');
    expect(comEsquadrao.sobreviventesB).toBeLessThan(semCavalo.sobreviventesB);
    expect(soCavalo.sobreviventesB).toBeLessThanOrEqual(comEsquadrao.sobreviventesB);
  });

  it('SATURA: um esquadrão pequeno já compra a maior parte da caçada', () => {
    // ⚠️ É isto que salva a cavalaria de ser armadilha. A força cresce com o quadrado das
    // cabeças, então trocar metade do exército por tropa cara é sempre um mau negócio no
    // choque — se o bônus fosse proporcional, esquadrão nenhum se pagaria.
    const sem = duelo(vencedorCom(0), vencido).sobreviventesB;
    const pouco = duelo(vencedorCom(0.1), vencido).sobreviventesB;
    const muito = duelo(vencedorCom(0.5), vencido).sobreviventesB;
    expect(sem - pouco).toBeGreaterThan(muito - pouco);
  });

  it('só a cavalaria do VENCEDOR conta: ter cavalo não protege quem perdeu', () => {
    const infantaria = duelo([grupo('hoplita', 1000)], [grupo('hoplita', 600)]);
    const comCavalo = duelo([grupo('hoplita', 1000)], [grupo('cavalaria', 600)]);
    expect(comCavalo.vencedor).toBe('a');
    // Não se compara o número de sobreviventes — as armas são outras. O que se guarda é que a
    // caçada do vencedor não muda por causa do que o perdedor montou.
    const perseguicaoDoVencedor = (r: typeof infantaria): number => {
      const antes = r.rounds.at(-2)?.b ?? 0;
      return antes > 0 ? 1 - r.sobreviventesB / antes : 0;
    };
    // ⚠️ Uma casa, e não duas: quem quebra a 70% deixa 30% em pé, e a caçada acontece sobre
    // umas seis dezenas de homens. Nessa base, um único homem arredondado vale quase dois
    // pontos percentuais — exigir 0,5% de precisão era medir o `Math.floor`, não a regra.
    expect(perseguicaoDoVencedor(comCavalo)).toBeCloseTo(perseguicaoDoVencedor(infantaria), 1);
  });

  it('recuar diante de cavalo custa mais que recuar diante de infantaria', () => {
    // Sem isto, uma ordem de recuo tornaria o inimigo imune ao cavalo, e a arma que existe
    // para impedir a fuga não impediria nada.
    const fugindoDe = (arma: Arma) => {
      const perseguidor = [grupo(arma, 1200)];
      const fugitivo = [grupo('hoplita', 900)];
      return resolverBatalha(
        { ...valorEmCampo(fugitivo, perseguidor, regras), recuaAos: regras.limiarDeRecuo },
        { ...valorEmCampo(perseguidor, fugitivo, regras), recuaAos: null },
        regras,
        'b',
      );
    };
    const dePe = fugindoDe('hoplita');
    const aCavalo = fugindoDe('cavalaria');
    expect(dePe.desfecho).toBe('recuou');
    expect(aCavalo.desfecho).toBe('recuou');
    expect(aCavalo.sobreviventesA).toBeLessThan(dePe.sobreviventesA);
  });
});

describe('a comida: cavalo come por vários homens', () => {
  it('bocas não é o mesmo que homens, e o leve é a régua também aqui', () => {
    expect(bocasDe([grupo('leve', 100), grupo('hoplita', 100)], regras)).toBe(200);
    expect(bocasDe([grupo('cavalaria', 100)], regras)).toBeGreaterThan(100);
  });

  it('a mesa do reino sente a cavalaria mais que a infantaria', () => {
    const comArma = (arma: Arma): number => {
      const c = nova();
      c.comecar('atenas');
      // Três mil homens porque o custo alimentar é por PONTO, e um ponto cobre milhares: com
      // uma hoste pequena a diferença ficaria dentro do arredondamento e o teste não mediria
      // nada.
      c.plantarHoste('atenas', 'atenas', 3000, arma);
      return c.balancoAlimentarDe('atenas').exercito;
    };
    // ⚠️ Mesmo número de HOMENS, custo alimentar diferente. É assim que a cavalaria cobra o
    // preço dela: sobre a terra, e não sobre o tesouro — a folha de pagamento continua sendo
    // por cabeça, porque cavalo se sustenta em pasto, não em moeda.
    expect(comArma('cavalaria')).toBeGreaterThan(comArma('hoplita'));
    expect(comArma('hoplita')).toBe(comArma('leve'));
  });
});

describe('a milícia é o último escudo, e não um exército de graça', () => {
  it('nem Armaria nem Quartel mudam o que a cidade põe na muralha', () => {
    // ⚠️ Decisão de projeto, e é ela que mantém a milícia sendo o que é: o lavrador com a
    // lança que tinha em casa. Se as obras militares a melhorassem, defender sairia de graça
    // e recrutar deixaria de ser decisão — e tomar uma cidade com Quartel entregaria ao
    // vencedor uma guarnição melhor do que a que ele levou até lá.
    const semAjuda = (erguer: boolean): void => {
      const c = nova();
      c.comecar('eleusis');
      c.darOuro(400_000);
      if (erguer) {
        c.construir('eleusis', 'armaria');
        for (let i = 0; i < 6; i++) c.passarTurno();
        c.construir('eleusis', 'quartel');
        for (let i = 0; i < 6; i++) c.passarTurno();
        expect(c.armasEm('eleusis')).toContain('hoplita');
        expect(c.treinoEm('eleusis')).toBeGreaterThan(1);
      }
      // A fórmula inteira, sem fator nenhum no meio: população vezes a fatia que pega em
      // armas. Com Armaria e Quartel de pé, continua sendo exatamente a mesma conta.
      expect(c.miliciaEm('eleusis')).toBe(
        Math.floor(c.populacaoDe('eleusis') * ajustes.combate.milicia.fracao),
      );
    };
    semAjuda(false);
    semAjuda(true);
  });

  it('a MURALHA continua valendo: ela é obra de defesa, não de exército', () => {
    // O contraste que dá sentido ao teste acima: existe obra que fortalece a milícia, e é a
    // que fala de muro. O que não existe é obra de exército que a melhore de carona.
    const c = nova();
    c.comecar('atenas');
    c.darOuro(400_000);
    const antes = c.miliciaEm('atenas') / c.populacaoDe('atenas');
    c.construir('atenas', 'muralha');
    for (let i = 0; i < 8; i++) c.passarTurno();
    expect(c.miliciaEm('atenas') / c.populacaoDe('atenas')).toBeGreaterThan(antes);
  });
});
