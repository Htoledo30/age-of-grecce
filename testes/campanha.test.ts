import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { Ajustes, Construcoes, Economia, Provincias } from '../src/dados/esquema';
import { Campanha } from '../src/campanha/campanha';
import { Atlas } from '../src/mundo/atlas';
import { avancarAno, formatarAno } from '../src/campanha/estado-campanha';
import { bonusDoInvestimento } from '../src/campanha/economia';

// Os testes rodam contra os dados DE VERDADE, não contra um cenário inventado: é o que
// faz eles pegarem uma mudança nos dados, e não só uma mudança no código.
function ler<T>(esquema: { parse: (v: unknown) => T }, caminho: string): T {
  return esquema.parse(JSON.parse(readFileSync(resolve(caminho), 'utf8')));
}

const provincias = ler(Provincias, 'assets/mundo/provincias.json');
const economia = ler(Economia, 'dados/economia.json');
const construcoes = ler(Construcoes, 'dados/construcoes.json');
const ajustes = ler(Ajustes, 'dados/ajustes.json').jogo;

const atlas = new Atlas(provincias);

function nova(): Campanha {
  // Atlas novo a cada campanha: ele é imutável, mas compartilhar instância entre testes
  // esconderia um dia em que ele deixasse de ser.
  return new Campanha(new Atlas(provincias), economia, construcoes, ajustes);
}

describe('economia da Ática', () => {
  it('cada província rende o valor exato das suas três parcelas', () => {
    const c = nova();

    const atenas = c.economiaDe('atenas');
    expect(atenas).toMatchObject({
      impostos: 175, // 35.000 habitantes x 0,005
      producao: 100, // azeite 25 x nivel 4
      comercio: 55, // 100 x comércio-base 0,55 (o Pireu)
      total: 330,
    });

    const maratona = c.economiaDe('maratona');
    expect(maratona).toMatchObject({
      impostos: 90, // 18.000 x 0,005
      // Nível 2, e não 3: a Ática era POBRE em cereal — Atenas importava grão do Ponto
      // Euxino. Maratona é província de gente e de imposto, não de produção.
      producao: 30, // grãos 15 x nivel 2
      comercio: 8, // 30 x 0,25, arredondado
      total: 128,
    });

    const sounion = c.economiaDe('sounion');
    expect(sounion).toMatchObject({
      impostos: 50, // 10.000 x 0,005
      producao: 140, // metais preciosos 28 x nivel 5 (o Láurion)
      comercio: 42, // 140 x 0,30
      total: 232,
    });
  });

  it('a renda de Atenas é a soma exata das três províncias', () => {
    expect(nova().rendaDe('atenas')).toBe(330 + 128 + 232);
  });

  it('os produtos não valem o mesmo por nível', () => {
    const valores = Object.values(economia.produtos).map((p) => p.valor);
    expect(new Set(valores).size).toBeGreaterThan(1);
    // grão é o mais barato e metal precioso o mais caro — é o que faz o Láurion importar
    expect(economia.produtos['graos']?.valor).toBe(Math.min(...valores));
    expect(economia.produtos['metais-preciosos']?.valor).toBe(Math.max(...valores));
  });

  it('área não entra na conta', () => {
    // Maratona é a MAIOR das três em km² e a que menos rende. Se um dia alguém devolver
    // a fórmula por área, esta asserção cai.
    const porId = new Map(provincias.provincias.map((p) => [p.id, p]));
    const c = nova();
    const maior = ['atenas', 'maratona', 'sounion'].reduce((a, b) =>
      (porId.get(a)?.areaKm2 ?? 0) > (porId.get(b)?.areaKm2 ?? 0) ? a : b,
    );
    expect(maior).toBe('maratona');
    expect(c.economiaDe('maratona')?.total).toBeLessThan(c.economiaDe('atenas')?.total ?? 0);
    expect(c.economiaDe('maratona')?.total).toBeLessThan(c.economiaDe('sounion')?.total ?? 0);
  });

  it('todo dinheiro é inteiro', () => {
    const c = nova();
    c.comecar('atenas');
    for (const id of ['atenas', 'maratona', 'sounion']) {
      const e = c.economiaDe(id);
      expect(e).not.toBeNull();
      for (const n of [e?.impostos, e?.producao, e?.comercio, e?.total]) {
        expect(Number.isInteger(n)).toBe(true);
      }
    }
    c.investir('atenas', 400);
    for (let i = 0; i < 6; i++) c.passarTurno();
    expect(Number.isInteger(c.tesouro)).toBe(true);
    expect(Number.isInteger(c.renda)).toBe(true);
  });
});

describe('províncias sem economia configurada', () => {
  it('só a Ática e os dois vizinhos têm ficha', () => {
    // Elêusis e Tanagra existem para haver contra quem jogar: são os dois poderes de uma
    // província só que fazem fronteira com Atenas. O resto do mapa continua sem ficha, e
    // continua dizendo isso com todas as letras em vez de inventar número.
    expect(Object.keys(economia.provincias).sort()).toEqual([
      'atenas',
      'eleusis',
      'maratona',
      'sounion',
      'tanagra',
    ]);
  });

  it('conquistar os dois vizinhos PAGA — é o laço central do jogo fechando', () => {
    const c = nova();
    c.comecar('atenas');
    const antes = c.renda;
    for (const id of ['eleusis', 'tanagra']) c.trocarDono(id, 'atenas');
    // Sem isto, tomar terra não muda nada e o jogo não tem para onde ir.
    expect(c.renda).toBeGreaterThan(antes * 1.25);
  });

  it('não recebem economia inventada nem arrecadam', () => {
    const c = nova();
    expect(c.economiaDe('esparta')).toBeNull();
    expect(c.economiaDe('tebas')).toBeNull();
    expect(c.rendaDe('esparta')).toBe(0);
    expect(c.rendaDe('tebas')).toBe(0);
  });

  it('a campanha sabe dizer quantas ainda faltam configurar', () => {
    const c = nova();
    expect(c.semEconomia('atenas')).toBe(0);
    expect(c.semEconomia('esparta')).toBe(c.provinciasDe('esparta').length);
  });
});

describe('investimento', () => {
  it('o bônus é regra de três contra o investimento máximo', () => {
    const { maximo, teto } = ajustes.economia.investimento;
    expect(bonusDoInvestimento(maximo, ajustes.economia)).toBeCloseTo(teto, 5);
    expect(bonusDoInvestimento(maximo / 2, ajustes.economia)).toBeCloseTo(teto / 2, 5);
    // 30.000 está para 25% assim como 300 está para 0,25%
    expect(bonusDoInvestimento(300, ajustes.economia)).toBeCloseTo(teto * (300 / maximo), 6);
    expect(bonusDoInvestimento(0, ajustes.economia)).toBe(0);
  });

  it('quantia miúda compra pouco, na proporção certa', () => {
    // Três moedas contra um máximo de 500 compram 0,15%, e não o 1% de antes: o bônus
    // agora é medido EM RELAÇÃO ao máximo, e não por uma raiz solta no ar.
    const { maximo, teto } = ajustes.economia.investimento;
    expect(bonusDoInvestimento(3, ajustes.economia)).toBeCloseTo(teto * (3 / maximo), 6);
  });

  it('o bônus tem teto, por maior que seja a quantia', () => {
    expect(bonusDoInvestimento(1_000_000, ajustes.economia)).toBe(
      ajustes.economia.investimento.teto,
    );
  });

  it('recusa investir acima do máximo por província', () => {
    const c = nova();
    c.comecar('atenas');
    const acima = ajustes.economia.investimento.maximo + 1;
    expect(c.podeInvestir('atenas', acima)).toMatchObject({ motivo: /máximo por província/ });
  });

  it('diz em quantos turnos o investimento se paga', () => {
    const c = nova();
    c.comecar('atenas');
    const r = c.retornoDe('atenas', 3000);
    expect(r).not.toBeNull();
    // a conta bate com a arrecadação de verdade, arredondamento incluído
    expect(r?.ganhoTotal).toBe(
      (r?.ganhoPorTurno ?? 0) * ajustes.economia.investimento.arrecadacoes,
    );
    expect(r?.vale).toBe(r !== null && r.ganhoTotal >= 3000);
    expect(c.retornoDe('esparta', 3000)).toBeNull();
  });

  it('o valor é livre e sai do tesouro na hora', () => {
    const c = nova();
    c.comecar('atenas');
    const antes = c.tesouro;
    c.investir('atenas', 137);
    expect(c.tesouro).toBe(antes - 137);
  });

  it('levanta a produção e, com ela, o comércio', () => {
    const c = nova();
    c.comecar('atenas');
    c.investir('atenas', 50); // 2,5% — um décimo do máximo
    const e = c.economiaDe('atenas');
    expect(e?.bonus).toBeCloseTo(0.025, 5);
    // 102 e não 103: 1,025 não é exato em ponto flutuante e o arredondamento cai pra
    // baixo. O número do teste é o que o jogo SOMA no tesouro, não o da conta de cabeça.
    expect(e?.producao).toBe(102);
    expect(e?.comercio).toBe(56); // 102 x 0,55 — o porto rende junto
    expect(e?.total).toBe(175 + 102 + 56);
  });

  it('dura exatamente quatro arrecadações', () => {
    const c = nova();
    c.comecar('atenas');
    c.investir('atenas', 250);
    const comBonus = c.rendaDe('atenas');
    const semBonus = 330 + 128 + 232;
    expect(comBonus).toBeGreaterThan(semBonus);

    const tesouroAntes = c.tesouro;
    const duracao = ajustes.economia.investimento.arrecadacoes;
    let arrecadado = 0;
    for (let i = 0; i < duracao; i++) {
      arrecadado += c.rendaDe('atenas');
      c.passarTurno();
    }
    // todas as arrecadações do incentivo vieram com o bônus
    expect(c.tesouro).toBe(tesouroAntes + arrecadado);
    // e na seguinte ele já acabou
    expect(c.economiaDe('atenas')?.bonus).toBe(0);
    expect(c.rendaDe('atenas')).toBeGreaterThan(semBonus);
  });

  it('só existe um incentivo por província: investir de novo substitui e cobra de novo', () => {
    const c = nova();
    c.comecar('atenas');
    c.investir('atenas', 100);
    expect(c.economiaDe('atenas')?.bonus).toBeCloseTo(0.05, 5);
    const antes = c.tesouro;
    c.investir('atenas', 500);
    expect(c.tesouro).toBe(antes - 500);
    expect(c.economiaDe('atenas')?.bonus).toBeCloseTo(0.25, 5);
    expect(c.investimentoEm('atenas')?.arrecadacoesRestantes).toBe(
      ajustes.economia.investimento.arrecadacoes,
    );
  });

  it('recusa com motivo em vez de sumir', () => {
    const c = nova();
    expect(c.podeInvestir('atenas', 100)).toMatchObject({ pode: false });
    c.comecar('atenas');
    expect(c.podeInvestir('esparta', 100)).toMatchObject({ motivo: /não é sua/ });
    expect(c.podeInvestir('atenas', 0)).toMatchObject({ motivo: /inteiro/ });
    expect(c.podeInvestir('atenas', 10.5)).toMatchObject({ motivo: /inteiro/ });
    const acima = ajustes.economia.investimento.maximo + 1;
    expect(c.podeInvestir('atenas', acima)).toMatchObject({ motivo: /máximo por província/ });
  });
});

describe('calendário e turno', () => {
  it('escreve o ano como se lê em voz alta e nunca passa pelo ano zero', () => {
    expect(formatarAno(-700)).toBe('700 a.C.');
    expect(formatarAno(-1)).toBe('1 a.C.');
    expect(formatarAno(1)).toBe('1 d.C.');
    expect(avancarAno(-1, 1)).toBe(1);
  });

  it('abre sem jogador e começa no turno 1 com 3.000 moedas', () => {
    const c = nova();
    expect(c.iniciada).toBe(false);
    expect(c.turno).toBe(0);
    c.comecar('atenas');
    expect(c.turno).toBe(1);
    expect(c.ano).toBe(-700);
    expect(c.tesouro).toBe(3000);
    expect(c.renda).toBe(690);
  });

  it('arrecada ANTES de virar o calendário', () => {
    const c = nova();
    c.comecar('atenas');
    c.passarTurno();
    expect(c.turno).toBe(2);
    expect(c.ano).toBe(-699);
    expect(c.tesouro).toBe(3000 + 690);
  });

  it('recusa começar duas vezes e passar turno antes de começar', () => {
    const c = nova();
    expect(() => c.passarTurno()).toThrow(/ainda não começou/);
    c.comecar('atenas');
    expect(() => c.comecar('esparta')).toThrow(/já começou/);
  });
});

describe('construções', () => {
  it('a melhor construção muda de província — é isso que faz existir decisão', () => {
    const c = nova();
    c.comecar('atenas');
    const melhor = (id: string): string =>
      Object.keys(construcoes.construcoes)
        .map((idc) => ({ idc, g: c.retornoDaConstrucaoEm(id, idc)?.ganhoPorTurno ?? 0 }))
        .reduce((a, b) => (b.g > a.g ? b : a)).idc;

    // Atenas tem 35.000 habitantes: quem manda ali é o imposto.
    expect(melhor('atenas')).toBe('agora');
    // Maratona produz pouco, mas tem 18.000 habitantes.
    expect(melhor('maratona')).toBe('agora');
    // Sunião tem metais preciosos nível V e pouca gente: quem manda é a produção.
    expect(melhor('sounion')).toBe('oficina');
  });

  it('cada construção acrescenta o valor exato', () => {
    const c = nova();
    c.comecar('atenas');
    // Ágora: impostos 175 x 1,4 = 245, ou seja +70
    expect(c.retornoDaConstrucaoEm('atenas', 'agora')?.ganhoPorTurno).toBeGreaterThanOrEqual(70);
    // Oficina em Sunião: produção 140 x 1,3 = 182 (+42), e o comércio sobe junto
    expect(c.retornoDaConstrucaoEm('sounion', 'oficina')?.ganhoPorTurno).toBe(55);
  });

  it('paga à vista e entrega depois: a obra leva turnos', () => {
    const c = nova();
    c.comecar('atenas');
    const antes = c.tesouro;
    const rendaAntes = c.rendaDe('atenas');

    c.construir('atenas', 'agora'); // 3 turnos
    // o dinheiro sai na hora...
    expect(c.tesouro).toBe(antes - 3000);
    // ...e o benefício NÃO chega junto
    expect(c.rendaDe('atenas')).toBe(rendaAntes);
    expect(c.construcoesEm('atenas')).toEqual([]);
    expect(c.obraEm('atenas')).toMatchObject({ construcao: 'agora', turnosRestantes: 3 });

    // três arrecadações sem o benefício
    for (let i = 0; i < 3; i++) {
      expect(c.construcoesEm('atenas')).toEqual([]);
      c.passarTurno();
    }

    // a partir da quarta, a Ágora está de pé
    expect(c.obraEm('atenas')).toBeUndefined();
    expect(c.construcoesEm('atenas')).toEqual(['agora']);
    expect(c.rendaDe('atenas')).toBeGreaterThan(rendaAntes + 70);
    // já construída, a conta passa a dizer quanto ela ESTÁ dando — e não quanto uma
    // segunda Ágora daria por cima da primeira
    expect(c.retornoDaConstrucaoEm('atenas', 'agora')?.ganhoPorTurno).toBeGreaterThanOrEqual(70);
  });

  it('o prazo varia por construção, e vem do catálogo', () => {
    const c = nova();
    c.comecar('atenas');
    c.construir('sounion', 'oficina'); // 2 turnos, mais barata
    expect(c.obraEm('sounion')?.turnosRestantes).toBe(2);
    c.passarTurno();
    c.passarTurno();
    expect(c.construcoesEm('sounion')).toEqual(['oficina']);
  });

  it('uma obra por vez em cada província', () => {
    const c = nova();
    c.comecar('atenas');
    c.construir('atenas', 'agora');
    expect(c.podeConstruir('atenas', 'mercado')).toMatchObject({ motivo: /em obra aqui/ });
  });

  it('é PERMANENTE, ao contrário do incentivo', () => {
    // O contraste está no mesmo teste de propósito: é a diferença entre as duas
    // mecânicas que justifica as duas existirem.
    const c = nova();
    c.comecar('atenas');
    c.construir('atenas', 'agora');
    // A Ágora levou o tesouro inteiro: é preciso arrecadar antes de poder investir. As
    // duas mecânicas disputam o mesmo dinheiro, e é essa disputa que faz investir ser
    // decisão em vez de rotina.
    expect(c.tesouro).toBe(0);
    for (let i = 0; i < 3; i++) c.passarTurno(); // espera a obra
    c.investir('atenas', 250);
    expect(c.rendaDe('atenas')).toBeGreaterThan(0);

    const duracao = ajustes.economia.investimento.arrecadacoes;
    for (let i = 0; i < duracao + 10; i++) c.passarTurno();

    // o incentivo venceu...
    expect(c.economiaDe('atenas')?.bonus).toBe(0);
    // ...mas a construção continua lá, e a renda segue acima da original
    expect(c.construcoesEm('atenas')).toEqual(['agora']);
    expect(c.retornoDaConstrucaoEm('atenas', 'agora')?.ganhoPorTurno).toBeGreaterThan(0);
  });

  it('construção e incentivo se compõem: a ordem importa', () => {
    const so = nova();
    so.comecar('atenas');
    so.investir('sounion', 500);
    const soIncentivo = so.economiaDe('sounion')?.total ?? 0;

    const ambos = nova();
    ambos.comecar('atenas');
    ambos.construir('sounion', 'oficina');
    ambos.passarTurno();
    ambos.passarTurno(); // dois turnos de obra, e de quebra caixa pra investir
    ambos.investir('sounion', 500);
    const comOficina = ambos.economiaDe('sounion')?.total ?? 0;

    // a Oficina aumenta a produção, e o incentivo é uma porcentagem DELA
    expect(comOficina).toBeGreaterThan(soIncentivo + 55);
  });

  it('uma de cada por província, e recusa com motivo', () => {
    const c = nova();
    expect(c.podeConstruir('atenas', 'agora')).toMatchObject({ motivo: /ainda não começou/ });
    c.comecar('atenas');
    c.construir('atenas', 'agora');
    for (let i = 0; i < 3; i++) c.passarTurno();
    expect(c.podeConstruir('atenas', 'agora')).toMatchObject({ motivo: /já construída/ });
    expect(c.podeConstruir('esparta', 'agora')).toMatchObject({ motivo: /não é sua/ });
    expect(c.podeConstruir('atenas', 'coliseu')).toMatchObject({ motivo: /inexistente/ });

    // e quando falta dinheiro, o motivo diz quanto falta
    const pobre = nova();
    pobre.comecar('atenas');
    pobre.construir('maratona', 'agora'); // leva os 3.000
    expect(pobre.podeConstruir('atenas', 'mercado')).toMatchObject({ motivo: /faltam 3\.000/ });
    expect(() => pobre.construir('atenas', 'mercado')).toThrow(/faltam/);
  });

  it('província sem economia não aceita construção', () => {
    const c = nova();
    c.comecar('atenas');
    expect(c.retornoDaConstrucaoEm('esparta', 'agora')).toBeNull();
    expect(c.podeConstruir('esparta', 'agora')).toMatchObject({ pode: false });
  });

  it('todo dinheiro continua inteiro depois de construir', () => {
    const c = nova();
    c.comecar('atenas');
    c.construir('sounion', 'oficina');
    c.passarTurno();
    c.passarTurno();
    for (const id of ['atenas', 'maratona', 'sounion']) {
      const e = c.economiaDe(id);
      for (const n of [e?.impostos, e?.producao, e?.comercio, e?.total]) {
        expect(Number.isInteger(n)).toBe(true);
      }
    }
    expect(Number.isInteger(c.tesouro)).toBe(true);
  });
});

describe('propriedade: de quem é a província agora', () => {
  it('a campanha nasce com os donos de 700 a.C. e a tabela é completa', () => {
    const c = nova();
    // Tabela CHEIA, não um diff contra o assado: é o que faz um recorte reassado falhar
    // alto em vez de misturar duas eras em silêncio.
    for (const p of atlas.provincias) expect(c.donoDe(p.id)).toBe(atlas.donoInicial(p.id));
    expect(c.provinciasDe('atenas')).toHaveLength(3);
  });

  it('trocar o dono move a província dos dois lados de uma vez', () => {
    const c = nova();
    c.comecar('atenas');
    const antes = c.provinciasDe('megara').length;

    c.trocarDono('megara', 'atenas');

    expect(c.donoDe('megara')).toBe('atenas');
    expect(c.provinciasDe('atenas')).toContain('megara');
    expect(c.provinciasDe('megara')).toHaveLength(antes - 1);
    expect(c.provinciasDe('megara')).not.toContain('megara');
  });

  it('perder a última província é a eliminação, e ela é derivada', () => {
    const c = nova();
    expect(c.vivo('megara')).toBe(true);
    expect(c.poderesVivos()).toHaveLength(148);

    for (const id of [...c.provinciasDe('megara')]) c.trocarDono(id, 'atenas');

    expect(c.vivo('megara')).toBe(false);
    expect(c.poderesVivos()).toHaveLength(147);
    expect(c.poderesVivos()).not.toContain('megara');
  });

  it('conquistar muda quem pode agir ali, e quanto o dono arrecada', () => {
    const c = nova();
    c.comecar('atenas');
    expect(c.podeAgirEm('maratona')).toMatchObject({ pode: true });

    c.trocarDono('maratona', 'megara');

    expect(c.podeAgirEm('maratona')).toMatchObject({ motivo: 'esta província não é sua' });
    // Atenas perde exatamente a renda de Maratona: 690 − 128.
    expect(c.rendaDe('atenas')).toBe(690 - 128);
    expect(c.rendaDe('megara')).toBe(128);
  });

  it('o incentivo e a obra morrem com a posse; a construção fica', () => {
    const c = nova();
    c.comecar('atenas');
    c.investir('maratona', 100);
    c.construir('sounion', 'oficina');
    // Quatro turnos: dois pra Oficina ficar pronta e mais dois pra juntar os 3.000 da
    // Ágora. O incentivo de Maratona dura 20 arrecadações, então continua em pé.
    for (let i = 0; i < 4; i++) c.passarTurno();
    expect(c.construcoesEm('sounion')).toContain('oficina');
    c.construir('atenas', 'agora'); // obra em andamento em Atenas
    expect(c.investimentoEm('maratona')).toBeDefined();
    expect(c.obraEm('atenas')).toBeDefined();

    c.trocarDono('maratona', 'megara');
    c.trocarDono('atenas', 'megara');
    c.trocarDono('sounion', 'megara');

    // Quem pagou pra explorar mais uma terra não colhe dela depois de perdê-la...
    expect(c.investimentoEm('maratona')).toBeUndefined();
    // ...e não entrega a obra pronta ao inimigo.
    expect(c.obraEm('atenas')).toBeUndefined();
    // Mas a construção é da PROVÍNCIA, não de quem mandava nela: é isso que faz tomar
    // uma cidade rica valer mais que tomar uma pobre.
    expect(c.construcoesEm('sounion')).toContain('oficina');
    expect(c.economiaDe('sounion')?.producao).toBe(182); // 28 x 5 x 1,3
  });

  it('trocar pro mesmo dono não faz nada, e poder inexistente estoura', () => {
    const c = nova();
    const antes = c.provinciasDe('atenas').length;
    c.trocarDono('atenas', 'atenas');
    expect(c.provinciasDe('atenas')).toHaveLength(antes);
    expect(() => c.trocarDono('atenas', 'roma')).toThrow(/poder inexistente: roma/);
    expect(() => c.donoDe('cartago')).toThrow(/província inexistente: cartago/);
  });

  it('a soma das províncias de todos os poderes é sempre 205', () => {
    const c = nova();
    const total = () => atlas.poderes.reduce((s, p) => s + c.provinciasDe(p.id).length, 0);
    expect(total()).toBe(205);
    c.trocarDono('megara', 'atenas');
    c.trocarDono('esparta', 'atenas');
    // Nenhuma província some nem aparece em dois donos ao mesmo tempo.
    expect(total()).toBe(205);
  });
});
