/**
 * O MUNDO OLHA A TUA POSIÇÃO, e não só o que tu fez a cada um.
 *
 * Até aqui a conta da opinião só sabia responder por fatos BILATERAIS: a guerra entre os dois, a
 * fronteira entre os dois, a terra que um tomou do outro. ⚠️ **Um reino podia engolir meia
 * Grécia e nenhum terceiro sentia nada** — medido, o maior chegava a 10 províncias e sobravam 9
 * poderes de 18. As duas parcelas guardadas aqui são a metade que faltava, e as duas vieram da
 * pesquisa nos jogos do gênero: a *sombra do maior* (a expansão agressiva do EU4, o "poderoso
 * demais" do Total War) e o *amigo do meu inimigo* (Age of History 2 e Total War).
 *
 * E o arquivo guarda também uma correção que elas obrigaram: **a conta precisava ser simétrica**.
 */

import { describe, expect, it } from 'vitest';

import { parcelasDaRelacao } from '../../src/campanha/diplomacia/relacao';
import type { SituacaoDaRelacao } from '../../src/campanha/diplomacia/relacao';
import { poderesDaIa } from '../../src/ia/ia';
import { ajustes, correrIA, novaCampanha } from '../apoio/mundo';

const diplomacia = ajustes.diplomacia;
const LIMIAR = diplomacia.alvo.sombraLimiar;

const NEUTROS: SituacaoDaRelacao = {
  emGuerra: false,
  tregoa: 0,
  fronteira: 0,
  terrasTomadas: 0,
  temPacto: false,
  temAlianca: false,
  temAcordo: false,
  temTributo: false,
  reputacao: 0,
  mesmoPovo: false,
  inimigosComuns: 0,
  turnosDePaz: 0,
  diferencaDePorte: 0,
  amigosDoMeuInimigo: 0,
};

const alvo = (mudanca: Partial<SituacaoDaRelacao>): number =>
  parcelasDaRelacao({ ...NEUTROS, ...mudanca }, diplomacia).reduce((s, p) => s + p.pontos, 0);

const rotulos = (mudanca: Partial<SituacaoDaRelacao>): string[] =>
  parcelasDaRelacao({ ...NEUTROS, ...mudanca }, diplomacia).map((p) => p.rotulo);

describe('a sombra do maior', () => {
  it('diferença pequena não é sombra nenhuma', () => {
    // ⚠️ **O limiar é a diferença entre sombra e ruído, e ele nasceu de uma medição.** Sem ele a
    // parcela disparava entre dois reinos de três e uma província — que é o mapa inicial, não
    // uma ameaça — e a mesa inteira afundava: **as propostas ao jogador caíam de 54 para ZERO**
    // em 150 turnos, em toda dose testada.
    expect(rotulos({ diferencaDePorte: LIMIAR }).some((r) => r.startsWith('sombra'))).toBe(false);
    expect(alvo({ diferencaDePorte: LIMIAR })).toBe(alvo({}));
  });

  it('passado o limiar ela pesa, cresce e tem teto', () => {
    const um = alvo({ diferencaDePorte: LIMIAR + 1 });
    const dois = alvo({ diferencaDePorte: LIMIAR + 2 });
    expect(um).toBeLessThan(alvo({}));
    expect(dois).toBeLessThan(um);
    // Sem teto, um império de cinquenta províncias seria odiado por aritmética e nada mais.
    expect(alvo({ diferencaDePorte: 500 })).toBe(alvo({ diferencaDePorte: 200 }));
  });

  it('e no mapa de verdade ela chega a disparar', () => {
    // ⚠️ Guarda contra a parcela virar letra morta: se o limiar subir demais, ou se o mapa
    // nunca produzir um reino grande, ela deixa de existir em silêncio.
    const c = novaCampanha();
    c.comecar('atenas');
    correrIA(c, 80);
    const poderes = [...poderesDaIa(c), 'atenas'].sort();
    const comSombra = poderes.flatMap((a) =>
      poderes
        .filter((b) => b > a)
        .filter((b) =>
          c.parcelasDaRelacaoEntre(a, b).some((p) => p.rotulo.startsWith('sombra')),
        ),
    );
    expect(comSombra.length).toBeGreaterThan(0);
  });
});

describe('o amigo do meu inimigo', () => {
  it('abraçar quem me sangra custa, e tem teto', () => {
    const um = alvo({ amigosDoMeuInimigo: 1 });
    expect(um).toBeLessThan(alvo({}));
    expect(alvo({ amigosDoMeuInimigo: 2 })).toBeLessThan(um);
    expect(alvo({ amigosDoMeuInimigo: 99 })).toBe(alvo({ amigosDoMeuInimigo: 50 }));
  });

  it('é o espelho do inimigo em comum, e os dois convivem', () => {
    // Um terceiro ou luta contra o meu inimigo, ou o abraça — nunca as duas coisas. As duas
    // parcelas medem terceiros diferentes e por isso podem aparecer juntas.
    const os = rotulos({ inimigosComuns: 1, amigosDoMeuInimigo: 1 });
    expect(os.some((r) => r.startsWith('inimigo em comum'))).toBe(true);
    expect(os.some((r) => r.startsWith('abraça meu inimigo'))).toBe(true);
  });
});

describe('⚠️ a conta do alvo é SIMÉTRICA', () => {
  it('os dois sentidos dão exatamente o mesmo número, no mapa inteiro', () => {
    /**
     * **A regressão que este teste existe para impedir tem número.** A opinião é UM valor por
     * par, mas a conta olhava só um lado: `fronteira` contava as províncias DELE que encostam
     * nas minhas, e `terrasTomadas` só a terra que o primeiro da ordem alfabética tirou do
     * segundo. Como `andarRelacoes` sempre chama na ordem dos ids, quem decidia qual das duas
     * contas valia era **o alfabeto** — e, pior, **metade das conquistas do mapa não envenenava
     * relação nenhuma**. Medido numa partida de 60 turnos: 7 pares divergiam, com Argos e
     * Epidauro em "fronteira comum (1)" num sentido e "(3)" no outro.
     */
    const c = novaCampanha();
    c.comecar('atenas');
    correrIA(c, 60);
    const soma = (l: readonly { pontos: number }[]): number =>
      l.reduce((s, p) => s + p.pontos, 0);
    const poderes = [...poderesDaIa(c), 'atenas'].sort();
    const divergentes: string[] = [];
    for (const [i, a] of poderes.entries()) {
      for (const b of poderes.slice(i + 1)) {
        const ab = soma(c.parcelasDaRelacaoEntre(a, b));
        const ba = soma(c.parcelasDaRelacaoEntre(b, a));
        if (ab !== ba) divergentes.push(`${a}|${b}: ${ab} contra ${ba}`);
      }
    }
    expect(divergentes).toEqual([]);
  });
});
