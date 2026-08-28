/**
 * ACESSO MILITAR e a MESA DE PROPOSTAS — os dois pedidos de Henrique, e eles se encaixam.
 *
 * *"para ela poder andar em território de reinos neutros precisamos criar algum sistema em
 * diplomacia de liberar acesso militar"* e *"não sinto a IA tentando se conectar comigo para
 * oferecer diplomacia (...) eu ter opção de aceitar ou recusar"*.
 *
 * ⚠️ **Nenhum número de balanço aqui.** O que se prende são as relações: a licença abre a
 * estrada e só a estrada; a guerra a rasga; e o que a IA assinaria com outro reino ela PEDE ao
 * jogador.
 */

import { describe, expect, it } from 'vitest';

import { estiloDe } from '../../src/ia/estilo';
import { aceitaAbrirAcesso, acessoPedido } from '../../src/ia/diplomacia/acesso';
import { ajustes, ia, novaCampanha } from '../apoio/mundo';

const PRAZOS = ajustes.diplomacia.acesso.prazos;
const CURTO = PRAZOS[0]!.turnos;

const nova = (): ReturnType<typeof novaCampanha> => {
  const c = novaCampanha();
  c.comecar('atenas');
  return c;
};

/**
 * Empurra a opinião do par até ele QUERER abrir a estrada.
 *
 * ⚠️ Mede a vontade (`aceitaAbrirAcesso`) e não a regra: desde que a estrada é de quem a abre,
 * `podeConcederAcesso` diz sim de cara — quem precisa de confiança é o outro lado.
 */
function fazerAmizade(c: ReturnType<typeof nova>, a: string, b: string): void {
  for (let i = 0; i < 40; i++) {
    if (aceitaAbrirAcesso(c, a, b, CURTO, PRAZOS)) return;
    c.darOuro(4000, a);
    c.presentear(b, 1500, a);
  }
}

describe('o acesso militar abre a estrada, e só a estrada', () => {
  it('sem licença a hoste não entra na terra do vizinho em paz; com licença, entra', () => {
    const c = nova();
    c.plantarHoste('atenas', 'atenas', 800);
    const hoste = c.hostes().find((h) => h.poder === 'atenas')!;
    expect(c.donoDe('eleusis')).toBe('eleusis');
    expect(c.emGuerra('atenas', 'eleusis')).toBe(false);
    expect(c.podeOrdenarMarcha(hoste.id, 'eleusis', 800, 'atenas').pode).toBe(false);

    fazerAmizade(c, 'eleusis', 'atenas');
    expect(c.concederAcesso('atenas', CURTO, 'eleusis')).toBeUndefined();
    expect(c.acessoAte('eleusis', 'atenas')).toBeDefined();
    expect(c.podeOrdenarMarcha(hoste.id, 'eleusis', 800, 'atenas').pode).toBe(true);
  });

  it('a licença faz a terra dele virar CAMINHO, e não só destino', () => {
    // Mégara fica do outro lado de Elêusis. Sem passagem, a rota morre em Elêusis; com ela,
    // Elêusis vira trecho e a hoste enxerga o que está adiante.
    const c = nova();
    c.plantarHoste('atenas', 'atenas', 800);
    const hoste = c.hostes().find((h) => h.poder === 'atenas')!;
    expect(c.rotasLongasDaHoste(hoste.id).get('megara')).toBeUndefined();

    fazerAmizade(c, 'eleusis', 'atenas');
    c.concederAcesso('atenas', CURTO, 'eleusis');
    const rota = c.rotasLongasDaHoste(hoste.id).get('megara');
    expect(rota).toBeDefined();
    expect(rota).toContain('eleusis');
  });

  it('ela é de UM LADO só: deixar passar não é poder passar', () => {
    const c = nova();
    fazerAmizade(c, 'eleusis', 'atenas');
    c.concederAcesso('atenas', CURTO, 'eleusis');
    expect(c.acessoAte('eleusis', 'atenas')).toBeDefined();
    expect(c.acessoAte('atenas', 'eleusis')).toBeUndefined();
    expect(c.acessosDe('atenas').recebidos).toContain('eleusis');
    expect(c.acessosDe('eleusis').concedidos).toContain('atenas');
  });

  it('a guerra rasga a licença nos dois sentidos', () => {
    const c = nova();
    fazerAmizade(c, 'eleusis', 'atenas');
    c.concederAcesso('atenas', CURTO, 'eleusis');
    c.concederAcesso('eleusis', CURTO, 'atenas');
    c.declararGuerra('eleusis', 'atenas');
    expect(c.acessoAte('eleusis', 'atenas')).toBeUndefined();
    expect(c.acessoAte('atenas', 'eleusis')).toBeUndefined();
  });

  it('não se dá passagem a quem se está em guerra', () => {
    const c = nova();
    c.declararGuerra('eleusis', 'atenas');
    expect(c.podeConcederAcesso('eleusis', 'atenas', CURTO).pode).toBe(false);
  });

  it('abrir a PRÓPRIA estrada não pede licença de ninguém', () => {
    // ⚠️ A regra deixa; quem exige confiança é o outro lado abrir a dele. Sem esta separação,
    // o jogo travava o jogador de tomar uma decisão que é dele — inclusive a decisão ruim.
    const c = nova();
    expect(c.relacaoEntre('atenas', 'eleusis')).toBeLessThan(PRAZOS[0]!.opiniaoMinima);
    expect(c.podeConcederAcesso('atenas', 'eleusis', CURTO).pode).toBe(true);
    expect(aceitaAbrirAcesso(c, 'eleusis', 'atenas', CURTO, PRAZOS)).toBe(false);
  });
});

describe('a mesa de propostas: o que ela assinaria com outro, ela PEDE ao jogador', () => {
  it('aceitar assina o acordo; a mesa fica vazia depois', () => {
    const c = nova();
    fazerAmizade(c, 'atenas', 'eleusis');
    expect(c.proporAoJogador({ de: 'eleusis', tipo: 'acesso', turnos: CURTO })).toBe(true);
    expect(c.propostas().map((p) => p.de)).toEqual(['eleusis']);

    expect(c.aceitarProposta('eleusis', 'acesso').pode).toBe(true);
    expect(c.acessoAte('atenas', 'eleusis')).toBeDefined();
    expect(c.propostas()).toEqual([]);
  });

  it('recusar não assina nada e não custa opinião', () => {
    const c = nova();
    fazerAmizade(c, 'atenas', 'eleusis');
    const antes = c.relacaoEntre('atenas', 'eleusis');
    c.proporAoJogador({ de: 'eleusis', tipo: 'acesso', turnos: CURTO });
    c.recusarProposta('eleusis', 'acesso');
    expect(c.propostas()).toEqual([]);
    expect(c.acessoAte('atenas', 'eleusis')).toBeUndefined();
    expect(c.relacaoEntre('atenas', 'eleusis')).toBe(antes);
  });

  it('o mesmo reino não empilha o mesmo pedido, e a virada limpa a mesa', () => {
    const c = nova();
    fazerAmizade(c, 'atenas', 'eleusis');
    expect(c.proporAoJogador({ de: 'eleusis', tipo: 'acesso', turnos: CURTO })).toBe(true);
    expect(c.proporAoJogador({ de: 'eleusis', tipo: 'acesso', turnos: CURTO })).toBe(false);
    c.passarTurno();
    expect(c.propostas()).toEqual([]);
  });

  it('pedido impossível nem chega à mesa', () => {
    const c = nova();
    c.declararGuerra('eleusis', 'atenas');
    expect(c.proporAoJogador({ de: 'eleusis', tipo: 'acesso', turnos: CURTO })).toBe(false);
  });
});

describe('a IA pede passagem por causa da guerra, e a quem está no caminho', () => {
  it('sem guerra ela não pede nada', () => {
    const c = nova();
    const estilo = estiloDe(ia, 'megara');
    expect(acessoPedido(c, 'megara', estilo, PRAZOS)).toBeNull();
  });

  it('com guerra, pede a quem encosta no inimigo — e não a quem ela atacaria', () => {
    const c = nova();
    // Mégara em guerra com Corinto; Elêusis fica entre Mégara e a Ática, e encosta em Mégara.
    c.declararGuerra('corinto', 'megara');
    const estilo = estiloDe(ia, 'megara');
    // Sem confiança nenhuma, ninguém abre a estrada.
    expect(acessoPedido(c, 'megara', estilo, PRAZOS)).toBeNull();

    fazerAmizade(c, 'sicion', 'megara');
    const pedido = acessoPedido(c, 'megara', estilo, PRAZOS);
    expect(pedido).not.toBeNull();
    expect(pedido!.com).toBe('sicion');
    // O prazo é o mais longo que a confiança alcança.
    expect(PRAZOS.map((p) => p.turnos)).toContain(pedido!.turnos);
  });
});
