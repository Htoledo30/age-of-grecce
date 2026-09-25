import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { Ajustes, Construcoes, Economia, Exercitos, Provincias } from '../src/dados/esquema';
import { Campanha } from '../src/campanha/campanha';
import { TIPOS_DE_PROPOSTA } from '../src/campanha/estado-campanha';
import { lerSalvamento } from '../src/campanha/salvamento';
import { Atlas } from '../src/mundo/atlas';
import { ordenar } from './apoio/hostes';

function ler<T>(esquema: { parse: (v: unknown) => T }, caminho: string): T {
  return esquema.parse(JSON.parse(readFileSync(resolve(caminho), 'utf8')));
}

const provincias = ler(Provincias, 'assets/mundo/provincias.json');
const economia = ler(Economia, 'dados/economia.json');
const construcoes = ler(Construcoes, 'dados/construcoes.json');
const exercitos = ler(Exercitos, 'dados/exercitos.json');
const ajustes = ler(Ajustes, 'dados/ajustes.json').jogo;

/** Uma campanha ainda no menu: é o que o boot tem na mão quando o salvamento chega. */
function crua(): Campanha {
  return new Campanha(new Atlas(provincias), economia, construcoes, ajustes, exercitos);
}

/** Uma campanha com de tudo um pouco: obra, incentivo, hostes, cerco e fome à vista. */
function vivida(): Campanha {
  const c = crua();
  c.comecar('atenas');
  c.darOuro(100_000);
  c.construir('atenas', 'agora');
  c.definirImposto('atenas', 'alto');
  c.recrutar('atenas', 1000);
  c.plantarHoste('sounion', 'atenas', 800);
  c.passarTurno(); // a leva vira hoste; a obra anda
  c.plantarHoste('tanagra', 'tanagra', 400);
  ordenar(c, 'tanagra', 'atenas', 400, 'tanagra', 'sitiar');
  c.passarTurno(); // Tanagra senta diante de Atenas
  return c;
}

describe('o salvamento vai e volta inteiro', () => {
  it('uma campanha restaurada é indistinguível da original', () => {
    const original = vivida();
    // Uma ordem PENDENTE também viaja: salvar no meio da rodada não a perde.
    const hoste = original.hostesEm('sounion').find((h) => h.poder === 'atenas');
    if (!hoste) throw new Error('a hoste de Sunião sumiu do cenário');
    const destino = [...original.rotasDaHoste(hoste.id).keys()][0];
    if (!destino) throw new Error('Sunião sem rota nenhuma');
    original.declararGuerra(original.donoDe(destino));
    original.ordenarMarcha(hoste.id, destino, 300);

    const texto = original.serializar();
    const retomada = crua();
    retomada.restaurar(lerSalvamento(texto));

    expect(retomada.iniciada).toBe(true);
    expect(retomada.jogador?.id).toBe('atenas');
    expect(retomada.turno).toBe(original.turno);
    expect(retomada.ano).toBe(original.ano);
    expect(retomada.tesouroDe('atenas')).toBe(original.tesouroDe('atenas'));
    expect(retomada.rendaDe('atenas')).toBe(original.rendaDe('atenas'));
    for (const id of ['atenas', 'maratona', 'sounion', 'eleusis', 'tanagra']) {
      expect(retomada.populacaoDe(id)).toBe(original.populacaoDe(id));
    }
    expect(retomada.hostes()).toEqual(original.hostes());
    expect(retomada.cercoEm('atenas')).toEqual(original.cercoEm('atenas'));
    expect(retomada.obraEm('atenas')).toEqual(original.obraEm('atenas'));
    expect(retomada.nivelDeImpostoEm('atenas')).toBe(original.nivelDeImpostoEm('atenas'));
    expect(retomada.ordemDaHoste(hoste.id)).toEqual(original.ordemDaHoste(hoste.id));
    expect(retomada.alimentacao).toEqual(original.alimentacao);

    // E o futuro das duas é o MESMO: virar o turno nas duas produz o mesmo mundo.
    original.passarTurno();
    retomada.passarTurno();
    expect(JSON.parse(retomada.serializar())).toEqual(JSON.parse(original.serializar()));
  });

  /**
   * ⚠️ **A passagem e a mesa não voltavam do disco.** `restaurarEstado` copiava campo a campo
   * e pulava os dois: carregar a partida apagava toda estrada aberta, e o pedido que a IA fez
   * no fim da virada — o que o jogador ia responder — sumia junto.
   */
  it('a estrada aberta e o pedido na mesa voltam do disco', () => {
    const original = vivida();
    original.concederAcesso('eleusis', 20);
    expect(original.acessoAte('atenas', 'eleusis')).toBeDefined();
    expect(original.proporAoJogador({ de: 'eleusis', tipo: 'comercio' })).toBe(true);

    const retomada = crua();
    retomada.restaurar(lerSalvamento(original.serializar()));

    expect(retomada.acessoAte('atenas', 'eleusis')).toBe(original.acessoAte('atenas', 'eleusis'));
    expect(retomada.propostas()).toEqual(original.propostas());
  });

  /**
   * ⚠️ **O esquema de leitura conhecia só três dos seis tipos de pedido.** A IA punha aliança,
   * liga e anexação na mesa; o autosave grava sem validar; a leitura recusava o arquivo inteiro
   * e a campanha sumia no boot seguinte. A lista agora é uma só, a do estado.
   */
  it('o salvamento aceita todos os tipos de pedido que a mesa conhece', () => {
    const original = vivida();
    for (const tipo of TIPOS_DE_PROPOSTA) {
      const bruto = JSON.parse(original.serializar()) as {
        estado: { propostas: { de: string; tipo: string; turnos?: number }[] };
      };
      bruto.estado.propostas = [{ de: 'megara', tipo, turnos: 20 }];
      const retomada = crua();
      retomada.restaurar(lerSalvamento(JSON.stringify(bruto)));
      expect(retomada.propostas().map((p) => p.tipo)).toEqual([tipo]);
    }
  });

  it('os efêmeros não viajam: a notícia da rodada morre com a sessão', () => {
    const original = vivida();
    expect(original.rodada.cercos.length).toBeGreaterThan(0);

    const retomada = crua();
    retomada.restaurar(lerSalvamento(original.serializar()));

    expect(retomada.rodada).toEqual({
      marchas: [],
      batalhas: [],
      conquistas: [],
      saques: [],
      milicianosMortos: [],
      cercos: [],
      cercosLevantados: [],
    });
    expect(retomada.fome).toEqual({ provincias: [], tropas: [] });
    // O cerco em si é ESTADO e continua lá — só a notícia dele é que não volta.
    expect(retomada.cercoEm('atenas')).toBeDefined();
  });

  it('recusa texto quebrado e versão desconhecida', () => {
    expect(() => lerSalvamento('isto não é um salvamento')).toThrow();
    const salvo = JSON.parse(vivida().serializar()) as { versao: number };
    salvo.versao = 2;
    expect(() => lerSalvamento(JSON.stringify(salvo))).toThrow();
  });

  it('falha ALTO em salvamento que não bate com o mundo', () => {
    const texto = vivida().serializar();

    const semDono = lerSalvamento(texto);
    delete semDono.dono['atenas'];
    expect(() => crua().restaurar(semDono)).toThrow(/sem dono/);

    const construcaoFantasma = lerSalvamento(texto);
    construcaoFantasma.construcoes['atenas'] = { coliseu: 1 };
    expect(() => crua().restaurar(construcaoFantasma)).toThrow(/fora do catálogo/);

    const contadorAtrasado = lerSalvamento(texto);
    contadorAtrasado.hostes['h999'] = {
      id: 'h999',
      poder: 'atenas',
      posicao: 'atenas',
      contingentes: [{ terra: 'atenas', arma: 'leve' as const, qualidade: 1, homens: 10 }],
    };
    expect(() => crua().restaurar(contadorAtrasado)).toThrow(/frente do contador/);

    const jogadorFalso = lerSalvamento(texto);
    jogadorFalso.jogador = 'roma';
    expect(() => crua().restaurar(jogadorFalso)).toThrow(/jogador inexistente/);
  });
});
