/**
 * A região de teste — Atenas, Maratona, Sunião, Elêusis e Tanagra — está completa?
 *
 * Preparação da região de teste. Nada aqui testa uma fórmula: testa se as cinco províncias
 * têm o que os sistemas das etapas seguintes vão pedir, e se o que está escrito nelas
 * obedece às regras que as tornam jogáveis. É o teste que impede a região de ficar
 * meio-configurada em silêncio e o patch 0.0.3 descobrir isso três semanas depois.
 *
 * ⚠️ **Nenhum número de balanço é cravado.** População, felicidade e estoque são
 * exatamente as coisas que Henrique vai mexer à mão; o que o teste guarda é a RELAÇÃO
 * entre eles — cinco turnos de comida, frações que somam um, secundário mais fraco.
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

/** As cinco. A lista sai dos DADOS: acrescentar uma sexta não deve exigir mexer aqui. */
const REGIAO = Object.keys(economia.provincias).sort();

function nova(): Campanha {
  return new Campanha(new Atlas(provincias), economia, construcoes, ajustes, exercitos);
}

describe('a região de teste está completa', () => {
  it('as cinco províncias existem e nenhuma outra tem ficha', () => {
    expect(REGIAO).toEqual(['atenas', 'eleusis', 'maratona', 'sounion', 'tanagra']);
  });

  it('cada uma tem povo, humor, secundário, despensa e resposta sobre ancoradouro', () => {
    const c = nova();
    for (const id of REGIAO) {
      const perfil = c.perfilDe(id);
      expect(perfil, id).not.toBeNull();
      expect(perfil?.nacionalidades.length, id).toBeGreaterThan(0);
      expect(perfil?.felicidade.faixa, id).not.toBe('');
      expect(perfil?.secundario.nome, id).not.toBe('');
      expect(perfil?.estoque.length, id).toBeGreaterThan(0);
      expect(typeof perfil?.ancoradouro, id).toBe('boolean');
    }
  });

  it('nenhuma província de fora dela é simulada', () => {
    const c = nova();
    // Esparta é o caso: existe no mapa, tem dono, e continua sem ficha nenhuma.
    expect(c.perfilDe('esparta')).toBeNull();
    expect(c.economiaDe('esparta')).toBeNull();
  });
});

describe('o que está escrito obedece às regras que tornam a região jogável', () => {
  /**
   * `DECISOES.md` #11A: estoque inicial tem que dar uns cinco turnos de sobrevivência.
   *
   * ⚠️ **Derivado da população E da taxa de consumo.** Se Henrique dobrar a população de
   * Atenas, o fôlego dela cai pela metade e este teste avisa — que é exatamente o serviço
   * que ele tem que prestar. Cravar "4.000 de grão" não avisaria nada.
   */
  it('cada província começa com uns cinco turnos de comida', () => {
    const c = nova();
    for (const id of REGIAO) {
      const alimento = c.perfilDe(id)?.alimento;
      expect(alimento?.consumoPorTurno, id).toBeGreaterThan(0);
      expect(alimento?.turnos, id).toBeGreaterThanOrEqual(5);
      // E não é despensa infinita: cinco turnos é o alvo, não "encheu e esqueceu".
      expect(alimento?.turnos, id).toBeLessThanOrEqual(12);
    }
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
    // sua. Se toda a região fosse de povo único, o sistema do patch 0.0.8 não teria nem como
    // ser testado aqui — e a região de teste teria sido mal montada.
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
        [...(economia.provincias[id]?.construcoes ?? [])].sort(),
      );
    }
  });

  it('quem começa com Quartel já pode recrutar; quem não começa, não', () => {
    // É a razão de as construções iniciais existirem: Elêusis e Tanagra mantêm 500 homens
    // em armas desde 700 a.C., e tropa de pé sem lugar de treinar seria mentira.
    const c = nova();
    for (const id of REGIAO) {
      const temQuartel = (economia.provincias[id]?.construcoes ?? []).includes('quartel');
      expect(c.capacidadesEm(id).includes('recrutar'), id).toBe(temQuartel);
    }
    // E Atenas é o contraste: a capital do jogador começa SEM quartel de propósito, pra
    // que erguer um continue sendo a primeira decisão militar da campanha.
    expect(c.capacidadesEm('atenas')).not.toContain('recrutar');
  });

  it('a despensa encolhe quando a província encolhe', () => {
    // O fôlego alimentar vem da população de AGORA. Recrutar tira gente, logo o que está
    // guardado dura mais — se lesse o arquivo autoral, pôr homens em armas não mudaria
    // nada e a conta do patch 0.0.4 nasceria errada.
    const c = nova();
    c.comecar('atenas');
    c.construir('atenas', 'quartel');
    c.passarTurno();
    const antes = c.perfilDe('atenas')?.alimento.consumoPorTurno ?? 0;
    c.recrutar('atenas', 500);
    const depois = c.perfilDe('atenas')?.alimento.consumoPorTurno ?? 0;
    expect(depois).toBeLessThan(antes);
  });
});

describe('capitais e conexões da região', () => {
  it('cada poder da região tem capital, e é a província de mesmo nome', () => {
    const c = nova();
    for (const id of ['atenas', 'eleusis', 'tanagra']) {
      expect(c.capitalDe(id), id).toBe(id);
    }
  });

  it('as cinco estão ligadas por terra, sem ilha solta', () => {
    // Conexão terrestre é o que faz guerra e comércio interno existirem. Uma província da
    // região de teste sem fronteira com as outras seria inalcançável — e o bug só
    // apareceria quando alguém tentasse marchar.
    const atlas = new Atlas(provincias);
    const alcancadas = new Set(['atenas']);
    const fila = ['atenas'];
    while (fila.length > 0) {
      const atual = fila.shift()!;
      for (const vizinha of atlas.vizinhasDe(atual)) {
        if (!REGIAO.includes(vizinha) || alcancadas.has(vizinha)) continue;
        alcancadas.add(vizinha);
        fila.push(vizinha);
      }
    }
    expect([...alcancadas].sort()).toEqual(REGIAO);
  });
});
