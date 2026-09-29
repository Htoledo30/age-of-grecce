/**
 * A região configurada — a Ática e a coroa da Grécia central — está completa?
 *
 * Nada aqui testa uma fórmula: testa se as províncias configuradas têm o que os sistemas
 * vão pedir, e se o que está escrito nelas obedece às regras que as tornam jogáveis. É o
 * teste que impede a região de ficar meio-configurada em silêncio.
 *
 * ⚠️ **Nenhum valor econômico em moeda é cravado.** O teste guarda relações de conteúdo:
 * frações que somam um, secundário mais fraco e a conta alimentar inicial legível.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { Ajustes, Construcoes, Economia, Exercitos, Provincias } from '../src/dados/esquema';
import { Campanha } from '../src/campanha/campanha';
import { Atlas } from '../src/mundo/atlas';
import { faixaDeFelicidade } from '../src/campanha/perfil-da-provincia';

function ler<T>(esquema: { parse: (v: unknown) => T }, caminho: string): T {
  return esquema.parse(JSON.parse(readFileSync(resolve(caminho), 'utf8')));
}

const provincias = ler(Provincias, 'assets/mundo/provincias.json');
const economia = ler(Economia, 'dados/economia.json');
const construcoes = ler(Construcoes, 'dados/construcoes.json');
const exercitos = ler(Exercitos, 'dados/exercitos.json');
const ajustes = ler(Ajustes, 'dados/ajustes.json').jogo;

/** A região inteira. A lista sai dos DADOS: acrescentar uma nova não exige mexer aqui. */
const REGIAO = Object.keys(economia.provincias).sort();

function nova(): Campanha {
  return new Campanha(new Atlas(provincias), economia, construcoes, ajustes, exercitos);
}

describe('a região configurada está completa', () => {
  it('a Ática continua no coração dela', () => {
    for (const id of ['atenas', 'eleusis', 'maratona', 'sounion', 'tanagra']) {
      expect(REGIAO).toContain(id);
    }
  });

  it('todo poder tocado pela região está COMPLETO: nenhum reino meio-configurado', () => {
    // Meio-configurado é o pior estado: o poder arrecada de umas terras e ignora outras,
    // e o número na tela vira mentira. Se uma província de um poder ganhou ficha, todas
    // as dele ganham juntas.
    const c = nova();
    const poderes = new Set(REGIAO.map((id) => c.donoDe(id)));
    for (const poder of poderes) {
      expect(c.semEconomia(poder), poder).toBe(0);
    }
  });

  it('nenhum poder da região abre em fome nem sem renda', () => {
    const c = nova();
    const poderes = new Set(REGIAO.map((id) => c.donoDe(id)));
    for (const poder of poderes) {
      expect(c.balancoAlimentarDe(poder).saldo, poder).toBeGreaterThanOrEqual(0);
      expect(c.rendaDe(poder), poder).toBeGreaterThan(0);
    }
  });

  it('outra cidade além de Atenas começa campanha e vira o turno', () => {
    const c = nova();
    c.comecar('corinto');
    expect(c.jogador?.id).toBe('corinto');
    expect(c.tesouro).toBeGreaterThan(0);
    c.passarTurno();
    expect(c.turno).toBe(2);
  });

  it('cinquenta turnos de paz não produzem fome espontânea em ninguém', () => {
    // A régua da abertura: crescer até o saldo zero TRAVA, nunca atravessa pro negativo.
    // Se algum poder novo entrar em fome sozinho, o dado dele foi mal escrito.
    const c = nova();
    c.comecar('atenas');
    for (let t = 0; t < 50; t++) {
      c.passarTurno();
      expect(c.fome.provincias, `turno ${c.turno}`).toEqual([]);
    }
  });

  it('cada uma tem povo, humor, secundário e resposta sobre ancoradouro', () => {
    const c = nova();
    for (const id of REGIAO) {
      const perfil = c.perfilDe(id);
      expect(perfil, id).not.toBeNull();
      expect(perfil?.nacionalidades.length, id).toBeGreaterThan(0);
      expect(perfil?.felicidade.faixa, id).not.toBe('');
      expect(perfil?.secundario.nome, id).not.toBe('');
      expect(typeof perfil?.ancoradouro, id).toBe('boolean');
    }
  });

  it('nenhuma província de fora dela é simulada', () => {
    const c = nova();
    // Delfos é o caso: existe no mapa, tem dono, e continua sem ficha nenhuma.
    expect(c.perfilDe('delfos')).toBeNull();
    expect(c.economiaDe('delfos')).toBeNull();
  });
});

describe('o que está escrito obedece às regras que tornam a região jogável', () => {
  it('Atenas abre EXATAMENTE no fio, e a conta fecha com números inteiros', () => {
    const c = nova();
    c.comecar('atenas');
    // ⚠️ **No fio quer dizer ZERO, e isto é decisão de Henrique de 31/08/2026.** Com
    // `subsistenciaPorReino` em 1, as 63.000 pessoas de Atenas comem exatamente o que a terra
    // dá: o reino abre "no limite", sem folga e sem fome. A consequência que ele aceitou de
    // olhos abertos é que Atenas **não cresce um habitante** enquanto não erguer comida — a
    // Fazenda deixa de ser conforto e vira a primeira obra da partida.
    //
    // Sem exército, o saldo final é o civil — nada come além do povo.
    expect(c.alimentacao.saldo).toBe(0);
    expect(c.alimentacao.saldoCivil).toBe(c.alimentacao.saldo);
    expect(c.alimentacao.categoria).toBe('no-limite');
    expect(c.alimentacao.saldo).toBe(
      c.alimentacao.subsistencia +
        c.alimentacao.producao -
        c.alimentacao.populacao -
        c.alimentacao.exercito,
    );
  });

  it('o secundário sempre rende menos que o principal', () => {
    // O esquema já recusa o contrário na carga; o teste existe pra que a regra esteja
    // escrita onde se lê, e não só onde se valida.
    for (const id of REGIAO) {
      const ficha = economia.provincias[id];
      if (!ficha) throw new Error(id);
      const principal = economia.produtos[ficha.produto];
      const segundo = economia.produtos[ficha.secundario.produto];
      expect(segundo!.valor * ficha.secundario.nivel, id).toBeLessThan(
        principal!.valor * ficha.nivel,
      );
    }
  });

  it('as nacionalidades somam a população inteira e usam povos do catálogo', () => {
    const c = nova();
    for (const id of REGIAO) {
      const fatias = c.perfilDe(id)?.nacionalidades ?? [];
      const soma = fatias.reduce((total, f) => total + f.fracao, 0);
      expect(soma, id).toBeCloseTo(1, 5);
      for (const f of fatias) expect(economia.nacionalidades[f.id], `${id}/${f.id}`).toBeDefined();
    }
  });

  it('existe pelo menos uma província de povo misturado, senão a tensão nunca aparece', () => {
    // A nacionalidade só significa alguma coisa quando alguém governa gente que não é
    // sua. Se toda a região fosse de povo único, o futuro sistema de tensão não teria nem
    // como ser testado aqui — e a região de teste teria sido mal montada.
    const c = nova();
    const misturadas = REGIAO.filter((id) => (c.perfilDe(id)?.nacionalidades.length ?? 0) > 1);
    expect(misturadas.length).toBeGreaterThan(0);
  });

  it('a felicidade inicial cai numa faixa com nome', () => {
    const c = nova();
    const nomes = ajustes.felicidade.faixas.map((f) => f.nome);
    for (const id of REGIAO) {
      expect(nomes, id).toContain(c.perfilDe(id)?.felicidade.faixa);
    }
  });
});

describe('as faixas de felicidade cobrem 0 a 100 sem buraco', () => {
  it('todo valor possível recebe um nome', () => {
    const faixas = ajustes.felicidade.faixas;
    for (let v = 0; v <= 100; v++) {
      expect(faixaDeFelicidade(v, faixas), String(v)).not.toBe('');
    }
  });

  it('o limite de cada faixa pertence a ela, e o próximo já é a seguinte', () => {
    const faixas = ajustes.felicidade.faixas;
    for (let i = 0; i < faixas.length - 1; i++) {
      const limite = faixas[i]!.ate;
      expect(faixaDeFelicidade(limite, faixas)).toBe(faixas[i]!.nome);
      expect(faixaDeFelicidade(limite + 1, faixas)).toBe(faixas[i + 1]!.nome);
    }
    expect(faixaDeFelicidade(100, faixas)).toBe(faixas[faixas.length - 1]!.nome);
  });
});

describe('o que está nos dados chega ao estado da partida', () => {
  it('as construções iniciais já estão de pé no turno 1', () => {
    const c = nova();
    for (const id of REGIAO) {
      expect([...c.construcoesEm(id)].sort(), id).toEqual(
        Object.keys(economia.provincias[id]?.construcoes ?? {}).sort(),
      );
    }
  });

  it('toda província habitada permite recrutamento básico', () => {
    const c = nova();
    c.comecar('atenas');
    expect(c.podeRecrutarEm('atenas')).toBe(true);
    expect(c.podeRecrutarEm('maratona')).toBe(true);
  });

  it('a faixa é ABSOLUTA: Atenas pesa mais que Salamina, e pode recuar de faixa', () => {
    const c = nova();
    c.comecar('atenas');
    // ⚠️ O contrário da regra antiga, que media cada terra contra ela mesma e fazia as duas
    // custarem o mesmo ponto. Aqui o tamanho é que manda.
    expect(c.nivelPopulacionalEm('atenas')).toBeGreaterThan(
      c.nivelPopulacionalEm('salamina'),
    );
    const antes = c.nivelPopulacionalEm('atenas');
    c.matarPopulacao('atenas', 25_000);
    expect(c.nivelPopulacionalEm('atenas')).toBeLessThan(antes);
  });
});

describe('capitais e conexões da região', () => {
  it('cada poder da região tem capital, e é a província de mesmo nome', () => {
    const c = nova();
    for (const id of ['atenas', 'eleusis', 'tanagra', 'megara', 'corinto', 'tebas', 'argos']) {
      expect(c.capitalDe(id), id).toBe(id);
    }
  });

  it('a região é contígua por terra — só ilha DECLARADA fica de fora', () => {
    // Conexão terrestre é o que faz guerra e comércio interno existirem. Uma província
    // sem fronteira com as outras seria inalcançável por marcha simples, e o bug só
    // apareceria quando alguém tentasse marchar.
    //
    // ⚠️ **Ilha é quem não tem vizinha de CHÃO**, e não quem não tem vizinha nenhuma: desde
    // que as zonas marítimas existem, Salamina encosta no Estreito de Salamina como toda
    // ilha encosta em água. Ela continua fora da contiguidade terrestre — chega-se lá
    // embarcando num Porto —, e é isso que o teste separa.
    const atlas = new Atlas(provincias);
    const ilhas = REGIAO.filter((id) => atlas.semVizinhaPorTerra(id));
    const alcancadas = new Set(['atenas']);
    const fila = ['atenas'];
    while (fila.length > 0) {
      const atual = fila.shift()!;
      for (const vizinha of atlas.vizinhasDe(atual)) {
        if (atlas.ehMar(vizinha)) continue;
        if (!REGIAO.includes(vizinha) || alcancadas.has(vizinha)) continue;
        alcancadas.add(vizinha);
        fila.push(vizinha);
      }
    }
    expect([...alcancadas, ...ilhas].sort()).toEqual(REGIAO);
  });
});
