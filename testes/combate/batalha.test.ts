/**
 * A BATALHA: choque, quebra e perseguição.
 *
 * O que estes testes guardam é a FORMA da guerra, nunca os números dela — quantas rodadas
 * dura o choque, quanto se perde por rodada e onde a linha cede são balanço e vão mudar. As
 * relações não podem mudar sem alguém decidir:
 *
 * - o perdedor **sobrevive**, e é a fuga que o mata, não o choque;
 * - o atacante **também quebra**, e é isso que dá chance ao defensor menor;
 * - `aguento` (a muralha) muda o resultado, e muda **visível**, round a round;
 * - a lista de rounds existe sempre e termina exatamente onde o resultado diz.
 *
 * ⚠️ Substituiu `√(maior² − menor²)`, que aniquilava quem perdia. O choque, levado até o
 * fim, ainda É a lei quadrada — a diferença é que ele **para na quebra**, e é a parada que
 * salva o perdedor e preserva o vencedor.
 */

import { describe, expect, it } from 'vitest';

import { lado, resolverBatalha } from '../../src/combate/batalha';
import { ajustes } from '../apoio/mundo';

const regras = ajustes.combate.batalha;
/**
 * `b` é sempre o DEFENSOR — é ele quem leva o desempate.
 *
 * Não existe empate: num jogo de conquista quem ataca precisa vencer, e barrar o invasor já
 * é a vitória de quem segura o chão.
 */
const batalha = (a: number, b: number, aguentoB = 1) =>
  resolverBatalha(lado(a), { ...lado(b), aguento: aguentoB }, regras, 'b');

describe('a batalha: choque, quebra e perseguição', () => {
  it('quem perde SOBREVIVE — e é a fuga que o mata, não o choque', () => {
    const r = batalha(1000, 500);
    expect(r.vencedor).toBe('a');
    expect(r.sobreviventesB).toBeGreaterThan(0);

    // A perseguição é o round que mata: antes dela o perdedor tinha mais gente em pé.
    const perseguicao = r.rounds.filter((x) => x.fase === 'perseguicao');
    expect(perseguicao).toHaveLength(1);
    const antesDaFuga = r.rounds[r.rounds.length - 2]!;
    expect(perseguicao[0]!.b).toBeLessThan(antesDaFuga.b);
    // E o vencedor não perde ninguém caçando: a fuga é o preço de ter quebrado.
    expect(perseguicao[0]!.a).toBe(antesDaFuga.a);
  });

  it('o choque mata pouco e a fuga mata muito — é a diferença que dá forma à guerra', () => {
    const r = batalha(1000, 500);
    const fimDoChoque = r.rounds.filter((x) => x.fase === 'choque').at(-1)!;
    const perdidoNoChoque = 500 - fimDoChoque.b;
    const perdidoNaFuga = fimDoChoque.b - r.sobreviventesB;
    // Sem esta relação, recuar antes de quebrar não seria decisão nenhuma — seria só
    // perder mais devagar.
    expect(perdidoNaFuga / fimDoChoque.b).toBeGreaterThan(
      perdidoNoChoque / 500 / regras.rodadasDeChoque,
    );
  });

  it('o vencedor de uma batalha apertada sai caro, e de uma folgada sai barato', () => {
    const apertada = batalha(1000, 900);
    const folgada = batalha(1000, 200);
    expect(apertada.sobreviventesA).toBeLessThan(folgada.sobreviventesA);
    // A sensação que a lei quadrada acertava e que não se perde na troca.
    expect(folgada.sobreviventesA / 1000).toBeGreaterThan(0.8);
  });

  it('a MURALHA muda o resultado, e o defensor menor passa a ter chance', () => {
    const aberta = batalha(1000, 400);
    const murada = batalha(1000, 400, 3);
    // Aguentando o triplo, o defensor sangra menos e o atacante sangra mais tempo.
    expect(murada.sobreviventesB).toBeGreaterThan(aberta.sobreviventesB);
    expect(murada.sobreviventesA).toBeLessThan(aberta.sobreviventesA);
  });

  it('o ATACANTE também quebra: a muralha VIRA a luta que ele ganharia', () => {
    // 1.000 contra 900 em campo aberto é do atacante. Atrás da muralha, ele sangra primeiro,
    // a linha DELE cede, e a cidade fica. É isto que Henrique pediu no item 3 — "um defensor
    // menor tem que ter alguma chance" — e não um counter de tipo de tropa.
    expect(batalha(1000, 900).vencedor).toBe('a');
    expect(batalha(1000, 900, 2).vencedor).toBe('b');

    // Atrás de muro alto, 500 barram 1.000 — barrar É vencer, num jogo em que quem ataca
    // precisa tomar a praça.
    const barrado = batalha(1000, 500, 6);
    expect(barrado.vencedor).toBe('b');
    // ⚠️ **E ele é BARRADO, não desfeito.** Ninguém cedeu: o atacante sangrou metade do
    // exército no dia e sai de campo pagando a mesma fatia de quem recua por ordem. Ser
    // caçado como fugitivo sem nunca ter fugido era o defeito — 1.000 hoplitas contra 1.000
    // paravam em 429 × 429, com 57% de baixas cada e ninguém abaixo do limiar, e mesmo assim
    // um deles caía para 171.
    expect(barrado.desfecho).toBe('barrado');
    expect(barrado.rounds.at(-1)?.fase).toBe('recuo');
    expect(barrado.sobreviventesA).toBeGreaterThan(1000 * 0.25);
    // Mas ele pagou caro pelo dia: mais da metade ficou no campo.
    expect(barrado.sobreviventesA).toBeLessThan(500);
  });

  it('BARRADO não é empate: alguém perde o chão, e não é quem o tinha', () => {
    // Regra de Henrique, e ela vale nas três saídas: *"não pode haver empate, ou eu perco ou
    // o inimigo perde"*. O que muda no barrado é só o PREÇO de perder — quem aguentou o dia
    // inteiro não é tratado como quem debandou.
    const parelha = resolverBatalha(lado(1000), lado(1000), { ...regras, letalidadeDoChoque: 0.05 }, 'b');
    expect(parelha.desfecho).toBe('barrado');
    expect(parelha.vencedor).toBe('b');
    expect(parelha.sobreviventesA).toBeGreaterThan(0);
    expect(parelha.sobreviventesB).toBeGreaterThan(parelha.sobreviventesA);
  });

  it('NÃO EXISTE EMPATE: forças iguais, e quem segura o chão leva', () => {
    // Num jogo de conquista, quem ataca precisa VENCER — parar o inimigo já é a vitória de
    // quem defende. Antes isto era um empate com os dois de pé na província, e o jogo não
    // saía do lugar: os dois brigavam de novo na rodada seguinte, para sempre.
    const r = batalha(500, 500);
    expect(r.vencedor).toBe('b'); // `batalha()` passa o defensor como desempate
    expect(r.sobreviventesB).toBeGreaterThan(0);
    // E o atacante paga por ter tentado: quem perde é perseguido.
    expect(r.sobreviventesA).toBeLessThan(r.sobreviventesB);
    expect(r.rounds.at(-1)!.fase).toBe('perseguicao');
  });

  it('a lista de rounds existe sempre e termina onde o resultado diz', () => {
    for (const [a, b] of [
      [1000, 500],
      [300, 900],
      [700, 0],
      [1, 1],
    ]) {
      const r = batalha(a!, b!);
      expect(r.rounds.length).toBeGreaterThan(0);
      const ultimo = r.rounds[r.rounds.length - 1]!;
      // A janela reproduz esta lista. Se ela terminasse noutro lugar, a tela mostraria uma
      // batalha e o mapa mostraria outra.
      expect(ultimo.a).toBe(r.sobreviventesA);
      expect(ultimo.b).toBe(r.sobreviventesB);
    }
  });

  it('lado vazio: quem tem gente ocupa o lugar sem perder ninguém', () => {
    expect(batalha(700, 0)).toMatchObject({
      vencedor: 'a',
      sobreviventesA: 700,
      sobreviventesB: 0,
    });
    // Dois lados vazios não é batalha, mas mesmo aqui alguém tem que ficar com o chão:
    // não existe empate, e quem segura leva.
    expect(batalha(0, 0)).toMatchObject({ vencedor: 'b', sobreviventesA: 0 });
  });

  it('é determinística: a mesma batalha dá o mesmo resultado, sempre', () => {
    // Sem isto não há salvamento confiável nem teste de regressão. Quando entrar sorte, ela
    // sai de semente guardada no estado — nunca de `Math.random()`.
    expect(batalha(834, 617, 2)).toEqual(batalha(834, 617, 2));
  });

  it('RECUAR na hora custa uma fração; QUEBRAR custa o exército', () => {
    // A escada inteira, num caso só. É a diferença entre os degraus que faz "aguento mais uma
    // rodada ou saio agora?" ser a pergunta central da batalha — se sair custasse quase o
    // mesmo que quebrar, ninguém sairia, e a batalha voltaria a não ter decisão dentro dela.
    const ateQuebrar = resolverBatalha(
      lado(900),
      lado(1000),
      regras,
      'b',
    );
    const saindoCedo = resolverBatalha(
      { ...lado(900), recuaAos: 0.25 },
      lado(1000),
      regras,
      'b',
    );

    expect(ateQuebrar.desfecho).toBe('quebrou');
    expect(saindoCedo.desfecho).toBe('recuou');
    // Os dois PERDEM o chão — recuar não é vencer. O que muda é com o que se sai de lá.
    expect(ateQuebrar.vencedor).toBe('b');
    expect(saindoCedo.vencedor).toBe('b');
    expect(saindoCedo.sobreviventesA).toBeGreaterThan(ateQuebrar.sobreviventesA * 3);

    // Quem sai a tempo não é perseguido: o último round é a saída, não a caçada.
    expect(saindoCedo.rounds.at(-1)!.fase).toBe('recuo');
    expect(ateQuebrar.rounds.at(-1)!.fase).toBe('perseguicao');
    // E o vencedor paga menos por uma batalha que o outro abandonou cedo.
    expect(saindoCedo.sobreviventesB).toBeGreaterThan(ateQuebrar.sobreviventesB);
  });

  it('recuar tarde demais não existe: quem já cedeu não sai mais ordenado', () => {
    // O limiar de quebra é 0,6; pedir para sair aos 0,9 é pedir tarde. A linha quebra antes,
    // o inimigo está em cima, e sair deixou de ser uma opção — o recuo é decisão de HORA.
    const tarde = resolverBatalha(
      { ...lado(900), recuaAos: 0.9 },
      lado(1000),
      regras,
      'b',
    );
    expect(regras.limiarDeQuebra).toBeLessThan(0.9);
    expect(tarde.desfecho).toBe('quebrou');
  });
});
