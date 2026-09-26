/**
 * A BALANÇA DE INTERESSE: o que um reino pesa antes de assinar — e o que guarda cada relação.
 *
 * Henrique: *"quero igual os jogos de estratégia fazem, só que melhor: posso influenciar
 * dependendo do que ofertar, e se me odeiam muito seja impossível conseguir alguma coisa"*.
 *
 * ⚠️ **Nenhum número de balanço aqui.** Os pesos vivem em `dados/ajustes.json` e os gostos em
 * `dados/ia.json`; o que se prende são RELAÇÕES: quem cobiça recusa mesmo gostando, quem teme
 * assina mesmo não gostando, mais prazo pesa mais, ouro fecha saldo pequeno e não fecha ódio, a
 * mesa responde o mesmo que a IA, e ninguém propõe o que não lhe serve.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { Jogo } from '../../src/aplicacao/contexto';
import {
  prazosDePactoComResposta,
  respostaAAlianca,
  respostaAoPacto,
} from '../../src/aplicacao/vistas/vontade-do-vizinho';
import { lerSalvamento } from '../../src/campanha/salvamento';
import { Ajustes, type EstiloDeIa } from '../../src/dados/esquema';
import { aliancaEscolhida, balancaDaAlianca } from '../../src/ia/diplomacia/aliancas';
import { aceita, medo, ouro, ouroQueFecha } from '../../src/ia/diplomacia/balanca';
import {
  aceitaComercio,
  balancaDoPacto,
  comercioEscolhido,
  pactoEscolhido,
} from '../../src/ia/diplomacia/pactos';
import { estiloDe } from '../../src/ia/estilo';
import { poderesDaIa } from '../../src/ia/ia';
import { ajustes, ia, novaCampanhaFarta } from '../apoio/mundo';

const CURTO = Math.min(...ajustes.diplomacia.pacto.prazos.map((p) => p.turnos));
const LONGO = Math.max(...ajustes.diplomacia.pacto.prazos.map((p) => p.turnos));
const ALIANCA_CURTA = Math.min(...ajustes.diplomacia.alianca.prazos.map((p) => p.turnos));
const ALIANCA_LONGA = Math.max(...ajustes.diplomacia.alianca.prazos.map((p) => p.turnos));

const nova = () => {
  const c = novaCampanhaFarta();
  c.comecar('atenas');
  return c;
};
type C = ReturnType<typeof nova>;

/** Reescreve a opinião de um par pelo caminho oficial: salvar, editar, restaurar. */
function comOpiniao(c: C, a: string, b: string, valor: number): C {
  const salvo = lerSalvamento(c.serializar());
  salvo.relacoes[[a, b].sort().join('|')] = valor;
  c.restaurar(salvo);
  return c;
}

/** Deixa Atenas visivelmente maior, sem tomar terra de NINGUÉM que importe ao teste. */
function gigante(c: C): C {
  for (const id of ['tanagra', 'plateia', 'tespias', 'orcomeno']) c.trocarDono(id, 'atenas');
  return c;
}

const pacto = (c: C, ele: string, voce: string, turnos = CURTO) =>
  balancaDoPacto(c, { ele, voce }, turnos, estiloDe(ia, ele), ajustes);
const alianca = (c: C, ele: string, voce: string, turnos = ALIANCA_CURTA) =>
  balancaDaAlianca(c, { ele, voce }, turnos, estiloDe(ia, ele), ajustes);
const rotulos = (b: { parcelas: readonly { rotulo: string }[] }) => b.parcelas.map((p) => p.rotulo);

/**
 * A menor opinião em que ELE aceita, varrendo a régua inteira. `null` quando nenhuma.
 *
 * ⚠️ É a forma de testar a balança sem cravar número: a pergunta é "onde fica o sim", e as
 * asserções comparam dois "ondes" entre si, ou com a linha do temperamento dele.
 */
function limiarDeSim(
  c: C,
  ele: string,
  voce: string,
  pesa: (c: C, ele: string, voce: string) => { saldo: number },
): number | null {
  for (let opiniao = -100; opiniao <= 100; opiniao += 1) {
    comOpiniao(c, ele, voce, opiniao);
    if (pesa(c, ele, voce).saldo >= 0) return opiniao;
  }
  return null;
}

const linhaDe = (id: string): number => estiloDe(ia, id).relacaoParaDeclarar;

describe('quem teme assina, quem cobiça recusa', () => {
  it('o vizinho que te teme assina o pacto curto abaixo da linha em que te atacaria', () => {
    // Mégara joga como guerreira: sem razão nenhuma, só assina bem acima da linha dela.
    const normal = nova();
    const semMedo = limiarDeSim(normal, 'megara', 'atenas', (c, e, v) => pacto(c, e, v));
    expect(semMedo).not.toBeNull();
    // Na linha o saldo é zero, e zero é sim: indiferença não é recusa.
    expect(semMedo!).toBeGreaterThanOrEqual(linhaDe('megara'));

    // Atenas gigante: o medo pesa a favor, e o sim desce para baixo da linha.
    const grande = gigante(nova());
    expect(rotulos(pacto(grande, 'megara', 'atenas'))).toContain('teme você');
    const comMedo = limiarDeSim(grande, 'megara', 'atenas', (c, e, v) => pacto(c, e, v));
    expect(comMedo).not.toBeNull();
    expect(comMedo!).toBeLessThan(semMedo!);
    expect(comMedo!).toBeLessThan(linhaDe('megara'));
  });

  it('quem já tem uma guerra nas costas assina mais fácil, para não ter duas', () => {
    const c = comOpiniao(nova(), 'megara', 'atenas', 0);
    const antes = pacto(c, 'megara', 'atenas');
    expect(rotulos(antes)).not.toContain('já tem uma guerra');

    c.declararGuerra('corinto', 'megara');
    // Ela te olha exatamente igual. O que mudou é que ela não pode bancar duas frentes.
    const depois = pacto(c, 'megara', 'atenas');
    expect(rotulos(depois)).toContain('já tem uma guerra');
    expect(depois.saldo).toBeGreaterThan(antes.saldo);
  });

  it('quem cobiça a sua terra recusa mesmo gostando de você — até você guarnecê-la', () => {
    // Tebas guerreira, com exército, ao lado de Plateia sem guarnição: Plateia vale a marcha.
    // A opinião é amistosa (+20): sem a cobiça ela assinaria; com ela, não.
    const c = comOpiniao(nova(), 'tebas', 'plateia', 20);
    c.plantarHoste('tebas', 'tebas', 4000);
    const cobicando = pacto(c, 'tebas', 'plateia');
    expect(rotulos(cobicando).some((r) => r.startsWith('cobiça'))).toBe(true);
    expect(cobicando.saldo).toBeLessThan(0);

    // Guarnecida, a terra deixa de valer a marcha — e a cobiça some da balança.
    c.plantarHoste('plateia', 'plateia', 6000);
    const guarnecida = pacto(c, 'tebas', 'plateia');
    expect(rotulos(guarnecida).some((r) => r.startsWith('cobiça'))).toBe(false);
    expect(guarnecida.saldo).toBeGreaterThan(cobicando.saldo);
    expect(aceita(guarnecida)).toBe(true);
  });

  it('o forte não ata as próprias mãos de graça: o fraco não consegue amarrá-lo', () => {
    // A proteção contra as 46 conquistas: a IA que cobiça nunca é escolhida como parceira.
    const c = comOpiniao(nova(), 'tebas', 'plateia', 30);
    c.plantarHoste('tebas', 'tebas', 4000);
    expect(pacto(c, 'tebas', 'plateia').saldo).toBeLessThan(0);
    const escolha = pactoEscolhido(c, 'plateia', estiloDe(ia, 'plateia'), ia, ajustes);
    expect(escolha?.com).not.toBe('tebas');
  });
});

describe('o prazo e o ouro', () => {
  it('a mesma proposta com mais prazo pesa mais', () => {
    const c = comOpiniao(nova(), 'megara', 'atenas', 20);
    const curto = pacto(c, 'megara', 'atenas', CURTO).saldo;
    const longo = pacto(c, 'megara', 'atenas', LONGO).saldo;
    expect(longo).toBeLessThan(curto);
    // E o sim do prazo longo fica mais alto na régua que o do curto.
    const simCurto = limiarDeSim(c, 'megara', 'atenas', (x, e, v) => pacto(x, e, v, CURTO));
    const simLongo = limiarDeSim(c, 'megara', 'atenas', (x, e, v) => pacto(x, e, v, LONGO));
    expect(simLongo).not.toBeNull();
    expect(simLongo!).toBeGreaterThan(simCurto!);
  });

  it('ouro cobre um saldo pequeno e não cobre ódio', () => {
    const c = nova();
    const estilo = estiloDe(ia, 'megara');
    const lados = { ele: 'megara', voce: 'atenas' };
    const pouco = ouroQueFecha(c, lados, -10, estilo, ajustes, 1_000_000);
    expect(pouco).not.toBeNull();
    expect(-10 + ouro(c, lados, pouco!, estilo, ajustes).pontos).toBeGreaterThanOrEqual(0);
    // Quem te odeia não se compra: o ouro rende no máximo o teto, e o teto não alcança.
    expect(ouroQueFecha(c, lados, -100, estilo, ajustes, 1_000_000)).toBeNull();
    // E o cofre curto é "não há preço que você tenha", não "não há preço".
    expect(ouroQueFecha(c, lados, -10, estilo, ajustes, 0)).toBeNull();
  });

  it('o ouro cotado viaja na proposta, fecha a mesma balança e troca de cofre na assinatura', () => {
    const c = comOpiniao(nova(), 'megara', 'atenas', linhaDe('megara') - 1);
    const jogo = { campanha: c, ia, ajustes: Ajustes.parse(JSON.parse(readFileSync(resolve('dados/ajustes.json'), 'utf8'))) } as unknown as Jogo;
    const cotada = prazosDePactoComResposta(jogo, 'megara', 'atenas').find(
      (p) => p.ouro > 0 && p.pode,
    );
    expect(cotada).toBeDefined();
    expect(cotada!.resposta.aceita).toBe(true);
    expect(
      respostaAoPacto(jogo, 'megara', 'atenas', cotada!.turnos, undefined, cotada!.ouro).aceita,
    ).toBe(true);

    const meuAntes = c.tesouroDe('atenas');
    const deleAntes = c.tesouroDe('megara');
    const opiniaoAntes = c.relacaoEntre('atenas', 'megara');
    c.firmarPacto('megara', cotada!.turnos, 'atenas', cotada!.ouro);
    expect(c.tesouroDe('atenas')).toBe(meuAntes - cotada!.ouro);
    expect(c.tesouroDe('megara')).toBe(deleAntes + cotada!.ouro);
    expect(c.relacaoEntre('atenas', 'megara')).toBe(opiniaoAntes);
    expect(c.pactoAte('atenas', 'megara')).toBeDefined();
  });

  it('o pacto nunca pede uma guerra que não entra na balança dele', () => {
    const c = comOpiniao(nova(), 'megara', 'atenas', -100);
    c.declararGuerra('corinto', 'megara');
    const jogo = { campanha: c, ia, ajustes: Ajustes.parse(JSON.parse(readFileSync(resolve('dados/ajustes.json'), 'utf8'))) } as unknown as Jogo;
    expect(respostaAoPacto(jogo, 'megara', 'atenas').pedido).not.toContain('na guerra contra');
    expect(respostaAAlianca(jogo, 'megara', 'atenas').pedido).toContain('na guerra contra');
  });

  it('o guerreiro pesa a força, o mercador pesa o ouro', () => {
    const c = gigante(nova());
    const lados = { ele: 'megara', voce: 'atenas' };
    const base = estiloDe(ia, 'megara');
    const pesaForca: EstiloDeIa = { ...base, gostos: { ...base.gostos, forca: base.gostos.forca * 2 } };
    const pesaOuro: EstiloDeIa = { ...base, gostos: { ...base.gostos, renda: base.gostos.renda * 2 } };
    expect(medo(c, lados, pesaForca, ajustes).pontos).toBeGreaterThan(medo(c, lados, base, ajustes).pontos);
    const quantia = Math.round(c.rendaDe('megara') / 2);
    expect(ouro(c, lados, quantia, pesaOuro, ajustes).pontos).toBeGreaterThan(
      ouro(c, lados, quantia, base, ajustes).pontos,
    );
  });
});

describe('o comércio precisa do sim dos dois lados', () => {
  it('um mercador não abre o mercado de um guerreiro que pretende enfrentá-lo', () => {
    const c = nova();
    for (const outro of c.poderesComFicha()) {
      if (outro !== 'atenas' && outro !== 'megara') comOpiniao(c, 'atenas', outro, -100);
    }
    comOpiniao(c, 'atenas', 'megara', 10);
    expect(aceitaComercio(c, 'atenas', 'megara', estiloDe(ia, 'atenas'))).toBe(true);
    expect(aceitaComercio(c, 'megara', 'atenas', estiloDe(ia, 'megara'))).toBe(false);
    expect(comercioEscolhido(c, 'atenas', estiloDe(ia, 'atenas'), ia)).toBeNull();
  });
});

describe('a aliança: a razão soma, a amizade só chega alto', () => {
  it('com inimigo em comum ele se alia abaixo da linha; sem razão, só bem acima dela', () => {
    const sem = nova();
    const simSem = limiarDeSim(sem, 'megara', 'atenas', (c, e, v) => alianca(c, e, v));
    expect(simSem).not.toBeNull();
    expect(simSem!).toBeGreaterThan(linhaDe('megara'));

    const com = nova();
    com.declararGuerra('corinto', 'atenas');
    com.declararGuerra('corinto', 'megara');
    expect(rotulos(alianca(com, 'megara', 'atenas'))).toContain('inimigo em comum');
    const simCom = limiarDeSim(com, 'megara', 'atenas', (c, e, v) => alianca(c, e, v));
    expect(simCom).not.toBeNull();
    expect(simCom!).toBeLessThan(simSem!);
    expect(simCom!).toBeLessThan(linhaDe('megara'));
  });

  it('a aliança longa pede mais que a curta, mesmo com razão', () => {
    const c = nova();
    c.declararGuerra('corinto', 'atenas');
    c.declararGuerra('corinto', 'megara');
    const curta = limiarDeSim(c, 'megara', 'atenas', (x, e, v) => alianca(x, e, v, ALIANCA_CURTA));
    const longa = limiarDeSim(c, 'megara', 'atenas', (x, e, v) => alianca(x, e, v, ALIANCA_LONGA));
    expect(longa!).toBeGreaterThan(curta!);
  });

  it('ninguém propõe o que não lhe serve: quem propõe tem saldo próprio acima da iniciativa', () => {
    const c = nova();
    for (const id of poderesDaIa(c)) {
      const estilo = estiloDe(ia, id);
      const escolha = aliancaEscolhida(c, id, estilo, ia, ajustes);
      if (escolha === null) continue;
      const minha = balancaDaAlianca(c, { ele: id, voce: escolha.com }, escolha.turnos, estilo, ajustes);
      expect(minha.saldo).toBeGreaterThanOrEqual(ajustes.diplomacia.balanca.iniciativa);
      const dele = balancaDaAlianca(
        c,
        { ele: escolha.com, voce: id },
        escolha.turnos,
        estiloDe(ia, escolha.com),
        ajustes,
      );
      expect(dele.saldo).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('a mesa responde o mesmo que a IA', () => {
  const completos = Ajustes.parse(JSON.parse(readFileSync(resolve('dados/ajustes.json'), 'utf8')));

  it('a resposta pré-clique é a balança, e a recusa vem com o pedido', () => {
    const c = comOpiniao(gigante(nova()), 'megara', 'atenas', -40);
    const jogo = { campanha: c, ia, ajustes: completos } as unknown as Jogo;
    for (const turnos of [CURTO, LONGO]) {
      const resposta = respostaAoPacto(jogo, 'megara', 'atenas', turnos);
      expect(resposta.aceita).toBe(aceita(pacto(c, 'megara', 'atenas', turnos)));
      expect(resposta.balanca.saldo).toBe(pacto(c, 'megara', 'atenas', turnos).saldo);
      if (!resposta.aceita) expect(resposta.pedido).not.toBe('');
      else expect(resposta.pedido).toBe('');
    }
    const aliada = respostaAAlianca(jogo, 'megara', 'atenas', ALIANCA_CURTA);
    expect(aliada.aceita).toBe(aceita(alianca(c, 'megara', 'atenas')));
  });
});
