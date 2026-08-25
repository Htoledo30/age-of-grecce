/**
 * O banco de provas das ARMAS: nenhuma delas pode ser a resposta certa sempre.
 *
 * `npm run armas`. Não escreve nada e não dá veredito automático: mostra os números e quem
 * lê decide — mesma regra do banco da economia.
 *
 * O critério é simples de dizer e difícil de acertar: **toda arma tem que ganhar alguma
 * coluna.** Se uma vence por homem, por moeda E por boca ao mesmo tempo, ela não é uma opção,
 * é a resposta — e as outras três viram enfeite caro. E o contrário também é defeito: arma
 * que não vence coluna nenhuma nunca vai ser levantada por ninguém.
 *
 * Três réguas, porque três coisas limitam um exército neste jogo:
 *
 * 1. **Por HOMEM** — quem ganha com o mesmo número de gente. É o limite de quem tem pouca
 *    população e ouro sobrando.
 * 2. **Por MOEDA** — quem ganha com o mesmo tesouro. É o limite normal do começo de jogo.
 * 3. **Por BOCA** — quem ganha com o mesmo peso na mesa do reino. É o limite do império
 *    grande, que tem ouro e gente mas não tem comida.
 *
 * E, no fim, o triângulo: cada arma contra cada arma, para ver se o counter aparece na conta
 * ou se ele é só um número bonito no `ajustes.json`.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolverBatalha } from '../src/combate/batalha';
import { valorEmCampo } from '../src/combate/composicao';
import { ARMAS } from '../src/combate/exercito';
import type { Arma } from '../src/combate/exercito';
import { Ajustes } from '../src/dados/esquema';

function ler<T>(e: { parse: (v: unknown) => T }, c: string): T {
  return e.parse(JSON.parse(readFileSync(resolve(c), 'utf8')) as unknown);
}
const combate = ler(Ajustes, 'dados/ajustes.json').jogo.combate;
const regras = combate.batalha;

/** Um duelo puro: só a arma, sem treino, sem muralha. */
function duelo(
  armaA: Arma,
  homensA: number,
  armaB: Arma,
  homensB: number,
): { vence: 'a' | 'b'; sobraA: number; sobraB: number; rounds: number } {
  const a = [{ arma: armaA, qualidade: 1, homens: homensA }];
  const b = [{ arma: armaB, qualidade: 1, homens: homensB }];
  const r = resolverBatalha(
    { ...valorEmCampo(a, b, regras), recuaAos: null },
    { ...valorEmCampo(b, a, regras), recuaAos: null },
    regras,
    // Desempate no B para não premiar a ordem em que os nomes entraram na tabela.
    'b',
  );
  return {
    vence: r.vencedor === 'a' ? 'a' : 'b',
    sobraA: r.sobreviventesA,
    sobraB: r.sobreviventesB,
    rounds: r.rounds.length,
  };
}

const n = (v: number): string => Math.round(v).toLocaleString('pt-BR');
const pad = (t: string, w: number): string => t.padEnd(w);

// ── 1. A TABELA DAS ARMAS ──────────────────────────────────────────────────────────────
console.log('\n════ AS QUATRO ARMAS ════');
console.log(pad('arma', 11) + 'ataque  aguento   custo   comida   bate');
for (const arma of ARMAS) {
  const d = regras.armas[arma];
  const bate = { leve: '—', hoplita: 'cavalaria', arqueiro: 'hoplita', cavalaria: 'arqueiro' }[arma];
  console.log(
    pad(arma, 11) +
      pad(d.ataque.toFixed(2), 8) +
      pad(d.aguento.toFixed(2), 9) +
      pad(d.custo.toFixed(2), 8) +
      pad(d.comida.toFixed(2), 9) +
      bate,
  );
}
console.log(
  `counter ×${regras.armas.counter} · perseguição por cavalaria ×${regras.armas.perseguicaoPorCavalaria}`,
);

// ── 2. AS TRÊS RÉGUAS ──────────────────────────────────────────────────────────────────
/**
 * Todos contra todos na mesma régua, e conta-se quantas vitórias cada um leva.
 *
 * Quem soma 3 numa régua é invicto NELA — o que é saudável, desde que perca em outra.
 */
function torneio(rotulo: string, quantosDe: (arma: Arma) => number): void {
  console.log(`\n════ MESMA ${rotulo} ════`);
  const linhas = ARMAS.map((arma) => ({ arma, homens: quantosDe(arma) }));
  for (const l of linhas) console.log(`  ${pad(l.arma, 11)} ${n(l.homens)} homens`);

  const vitorias: Record<string, number> = {};
  for (const arma of ARMAS) vitorias[arma] = 0;
  console.log('');
  for (const x of linhas) {
    for (const y of linhas) {
      if (x.arma >= y.arma) continue;
      const r = duelo(x.arma, x.homens, y.arma, y.homens);
      const venceu = r.vence === 'a' ? x.arma : y.arma;
      vitorias[venceu] = (vitorias[venceu] ?? 0) + 1;
      console.log(
        `  ${pad(`${x.arma} × ${y.arma}`, 24)} → ${pad(venceu, 11)} ` +
          `sobram ${pad(n(r.sobraA), 7)} × ${pad(n(r.sobraB), 7)} em ${r.rounds} rounds`,
      );
    }
  }
  const placar = ARMAS.map((a) => `${a} ${vitorias[a]}`).join(' · ');
  console.log(`  placar: ${placar}`);
}

// A régua de referência: 1.000 leves. As outras entram com o que o mesmo recurso compra.
const BASE = 1000;
torneio('GENTE', () => BASE);
torneio('MOEDA', (arma) => Math.floor((BASE * regras.armas.leve.custo) / regras.armas[arma].custo));
torneio('BOCA', (arma) => Math.floor((BASE * regras.armas.leve.comida) / regras.armas[arma].comida));

// ── 3. O TRIÂNGULO APARECE NA CONTA? ───────────────────────────────────────────────────
/**
 * Mesma força dos dois lados, mas um deles tem a arma que conta a do outro.
 *
 * O que se procura aqui é o TAMANHO da vantagem. Se o counter mal muda o placar, ele é
 * enfeite; se ele decide sozinho, o número da tropa deixou de importar.
 */
console.log('\n════ O TRIÂNGULO (mesma gente, 1.000 × 1.000) ════');
for (const [caca, presa] of [
  ['hoplita', 'cavalaria'],
  ['cavalaria', 'arqueiro'],
  ['arqueiro', 'hoplita'],
] as const) {
  const r = duelo(caca, BASE, presa, BASE);
  const semCounter = duelo(caca, BASE, 'leve', BASE);
  console.log(
    `  ${pad(`${caca} × ${presa}`, 24)} → ${pad(r.vence === 'a' ? caca : presa, 11)} ` +
      `sobram ${pad(n(r.sobraA), 7)} × ${n(r.sobraB)}\n` +
      `  ${pad(`${caca} × leve (controle)`, 24)} → ${pad(semCounter.vence === 'a' ? caca : 'leve', 11)} ` +
      `sobram ${pad(n(semCounter.sobraA), 7)} × ${n(semCounter.sobraB)}`,
  );
}

// ── 4. A MISTURA VALE MAIS QUE O PURO? ─────────────────────────────────────────────────
/**
 * Exércitos inteiros uns contra os outros, com o MESMO orçamento.
 *
 * Duas vezes, porque a guerra tem duas fases: no começo o que falta é ouro, e no império
 * grande o que falta é comida. Uma composição que vence nas duas é dominante; uma que perde
 * nas duas nunca vai ser montada.
 */
function campanha(rotulo: string, orcamento: (arma: Arma) => number): void {
  console.log(`\n════ EXÉRCITOS COM O MESMO ${rotulo} ════`);
  const compra = (arma: Arma, fatia: number): GrupoDeProva => ({
    arma,
    qualidade: 1,
    homens: Math.floor(orcamento(arma) * fatia),
  });
  const misturas: readonly { nome: string; grupos: GrupoDeProva[] }[] = [
    { nome: 'só leves', grupos: [compra('leve', 1)] },
    { nome: 'só hoplitas', grupos: [compra('hoplita', 1)] },
    { nome: 'só arqueiros', grupos: [compra('arqueiro', 1)] },
    { nome: 'hoplita+arqueiro', grupos: [compra('hoplita', 0.5), compra('arqueiro', 0.5)] },
    { nome: 'hoplita+cavalo', grupos: [compra('hoplita', 0.9), compra('cavalaria', 0.1)] },
    { nome: 'leve+arqueiro', grupos: [compra('leve', 0.5), compra('arqueiro', 0.5)] },
  ].map((m) => ({ ...m, grupos: m.grupos.filter((g) => g.homens > 0) }));

  const largura = Math.max(...misturas.map((m) => m.nome.length)) + 9;
  console.log(pad('', largura) + misturas.map((m) => pad(m.nome.slice(0, 9), 11)).join(''));
  for (const x of misturas) {
    const celulas = misturas.map((y) => {
      if (x === y) return pad('—', 11);
      const r = resolverBatalha(
        { ...valorEmCampo(x.grupos, y.grupos, regras), recuaAos: null },
        { ...valorEmCampo(y.grupos, x.grupos, regras), recuaAos: null },
        regras,
        'b',
      );
      const sobra = r.vencedor === 'a' ? r.sobreviventesA : r.sobreviventesB;
      return pad(r.vencedor === 'a' ? `+${n(sobra)}` : `-${n(sobra)}`, 11);
    });
    const total = x.grupos.reduce((s, g) => s + g.homens, 0);
    console.log(pad(`${x.nome} (${n(total)})`, largura) + celulas.join(''));
  }
  console.log('  (+ é vitória da linha; o número são os sobreviventes de quem venceu)');
}

type GrupoDeProva = { arma: Arma; qualidade: number; homens: number };
campanha('OURO', (arma) => (BASE * regras.armas.leve.custo) / regras.armas[arma].custo);
campanha('COMIDA', (arma) => (BASE * regras.armas.leve.comida) / regras.armas[arma].comida);

// ── 5. A COLUNA DA CAVALARIA: o que sobra do derrotado ─────────────────────────────────
/**
 * O papel do cavalo não está em QUEM vence — está em quanto do vencido volta para casa.
 *
 * Quem quebra e escapa dispersa: os homens voltam à população da terra natal e podem ser
 * levantados de novo. Aniquilar é a única forma de tirar um exército do mapa de vez, e é a
 * única coisa que só a cavalaria faz. Nenhuma das réguas acima mede isso — por isso esta.
 */
console.log('\n════ O QUE SOBRA DO DERROTADO (1.000 × 700, mesma arma de linha) ════');
for (const fatia of [0, 0.05, 0.1, 0.2, 0.3, 0.5]) {
  const cavalos = Math.round(1000 * fatia);
  const vencedor = [
    { arma: 'hoplita' as const, qualidade: 1, homens: 1000 - cavalos },
    { arma: 'cavalaria' as const, qualidade: 1, homens: cavalos },
  ].filter((g) => g.homens > 0);
  const vencido = [{ arma: 'hoplita' as const, qualidade: 1, homens: 700 }];
  const r = resolverBatalha(
    { ...valorEmCampo(vencedor, vencido, regras), recuaAos: null },
    { ...valorEmCampo(vencido, vencedor, regras), recuaAos: null },
    regras,
    'b',
  );
  const sobra = r.sobreviventesB;
  console.log(
    `  ${pad(`${Math.round(fatia * 100)}% de cavalaria`, 20)} → ` +
      `vence ${pad(r.vencedor === 'a' ? 'sim' : 'NÃO', 5)} ` +
      `o derrotado leva ${pad(n(sobra), 6)} para casa (${((sobra / 700) * 100).toFixed(0)}%)`,
  );
}
console.log('');
