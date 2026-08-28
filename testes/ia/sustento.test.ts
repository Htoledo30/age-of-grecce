/**
 * A DESPENSA DA IA: ela planta para crescer, ou planta quando já bateu na parede?
 *
 * ⚠️ **A regressão que este arquivo existe para impedir tem nome e número.** A regra antiga
 * era `saldo <= limiarDeAperto` — a despensa só contava como apertada quando já estava no
 * chão —, e o resultado medido em 100 turnos com um ponto de comida para cada 500 soldados
 * era um ciclo de bombeiro: **21 das 28 obras de comida saíam com a parede já nas costas.**
 * Henrique perguntando: *"a IA entende que precisa ter mais comida para poder criar mais
 * exército? Ela se importa com isso?"*
 *
 * O que se guarda aqui são as duas propriedades que responderam "sim", e nenhum valor de
 * balanço: **o aperto chega antes do chão**, e **ele sente `soldadosPorPonto`**.
 */

import { describe, expect, it } from 'vitest';

import { estiloDe } from '../../src/ia/estilo';
import { poderesDaIa } from '../../src/ia/ia';
import { despensaApertada, despensaNoChao } from '../../src/ia/percepcao/sustento';
import { ajustes, ia, novaCampanha } from '../apoio/mundo';

const nova = () => {
  const c = novaCampanha();
  c.comecar('atenas');
  return c;
};

/** O mesmo mundo, mudando só quanto exército um ponto de comida sustenta. */
const com = (soldadosPorPonto: number) => ({
  ...ajustes,
  alimento: { ...ajustes.alimento, soldadosPorPonto },
});

describe('a despensa da IA', () => {
  it('os três preços da comida estão em ordem, em todo estilo', () => {
    // ⚠️ Guarda a ESTRUTURA, não os números. Gosto < gargalo < emergência: se um dia o preço
    // do planejamento encostar no da emergência, a IA volta a construir só fazenda — foi
    // exatamente isso, medido, que derrubou a riqueza do mapa em 33% e deixou 5 poderes vivos
    // de 18 em 150 turnos.
    for (const [nome, estilo] of Object.entries(ia.estilos)) {
      expect(estilo.valorDaObra.alimento, nome).toBeLessThan(estilo.alimentoNoGargalo);
      expect(estilo.alimentoNoGargalo, nome).toBeLessThan(estilo.alimentoApertado);
    }
  });

  it('quem está no chão está sempre apertado — o degrau nunca inverte', () => {
    // A emergência mora DENTRO do gargalo, por construção: o exército que a economia banca
    // nunca come menos que zero. Se esta ordem se inverter, a IA passaria a estar em
    // emergência sem estar apertada, e o preço de emergência nunca seria cobrado.
    const c = nova();
    for (const soldadosPorPonto of [3000, 500, 200]) {
      const a = com(soldadosPorPonto);
      for (const id of poderesDaIa(c)) {
        const estilo = estiloDe(ia, id);
        if (!despensaNoChao(c, id, estilo)) continue;
        expect(despensaApertada(c, id, estilo, a), `${id} @ ${soldadosPorPonto}`).toBe(true);
      }
    }
  });

  it('o aperto chega ANTES do chão: alguém planta com folga ainda no saldo', () => {
    // ⚠️ **É a propriedade que Henrique pediu.** Com a comida cara, tem de existir poder que
    // ainda não está passando aperto nenhum HOJE e mesmo assim já sabe que a comida é o que
    // vai travar o exército dele. Zero aqui quer dizer que a IA voltou a ser bombeiro.
    const c = nova();
    const a = com(500);
    const prevenidos = poderesDaIa(c).filter((id) => {
      const estilo = estiloDe(ia, id);
      return despensaApertada(c, id, estilo, a) && !despensaNoChao(c, id, estilo);
    });
    expect(prevenidos.length).toBeGreaterThan(0);
  });

  it('e ele SENTE quanto exército um ponto de comida compra', () => {
    // ⚠️ A regra velha não sentia, e era esse o defeito de fundo: Henrique baixou
    // `soldadosPorPonto` de 3.000 para 500 — um ponto de comida ficou seis vezes mais valioso
    // em soldado — e o gatilho continuou disparando no mesmo lugar, porque ele só olhava um
    // saldo em pontos. Agora a conta é em BOCAS e a régua anda junto com o dado.
    const c = nova();
    const apertados = (soldadosPorPonto: number): number => {
      const a = com(soldadosPorPonto);
      return poderesDaIa(c).filter((id) => despensaApertada(c, id, estiloDe(ia, id), a)).length;
    };
    expect(apertados(500)).toBeGreaterThan(apertados(3000));
  });
});
