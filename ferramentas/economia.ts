/**
 * O banco de provas da economia: **cedo, meio e fim de jogo, numa rodada só.**
 *
 * Existe porque a economia foi consertada às cegas uma vez. Mediu-se em Atenas, arrumou-se
 * para Atenas, e o conserto era armadilha em metade do mapa — Henrique cortou isso com uma
 * frase: *"tem que fazer no lugar mais pobre e no lugar mais rico, não só em Atenas"*. Este
 * arquivo é essa frase virada comando.
 *
 * `npm run economia`. Não escreve nada, não tem veredito automático: ele mostra os números e
 * quem lê decide. As perguntas que ele responde:
 *
 * 1. **Terra ou cabeças?** Quanto da renda vem do que a terra é, e não de quanta gente mora
 *    nela. Se cair muito abaixo de 70%, a economia voltou a ser um censo.
 * 2. **Cedo:** os 18 poderes jogáveis no turno 1 — líquido por turno e quantos turnos cada
 *    um espera para poder decidir alguma coisa. Poder em déficit é defeito; ritmo espalhado
 *    demais é o pequeno ficando sem jogo.
 * 3. **Meio:** um império esticado, para a corrupção de distância morder e as obras serem
 *    julgadas longe da capital.
 * 4. **Fim:** 300 turnos de paz no maior, no menor e no mais pobre por habitante.
 * 5. **O catálogo inteiro** do mais pobre ao mais rico: prédio que nunca se paga não é
 *    decisão, é armadilha — e não existe demolir.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Campanha } from '../src/campanha/campanha';
import { Ajustes, Construcoes, Economia, Exercitos, Provincias } from '../src/dados/esquema';
import { Atlas } from '../src/mundo/atlas';
function ler<T>(e: { parse: (v: unknown) => T }, c: string): T {
  return e.parse(JSON.parse(readFileSync(resolve(c), 'utf8')) as unknown);
}
const atlas = new Atlas(ler(Provincias, 'assets/mundo/provincias.json'));
const economia = ler(Economia, 'dados/economia.json');
const construcoes = ler(Construcoes, 'dados/construcoes.json');
const exercitos = ler(Exercitos, 'dados/exercitos.json');
const ajustes = ler(Ajustes, 'dados/ajustes.json').jogo;
const nova = (): Campanha => new Campanha(atlas, economia, construcoes, ajustes, exercitos);

// ── 1. TERRA vs CABEÇAS, provincia a provincia ─────────────────────────────────────────
const c0 = nova(); c0.comecar('atenas');
const provs = Object.keys(economia.provincias).map((id) => {
  const e = c0.economiaDe(id)!;
  const bruto = e.impostos + e.producao + e.comercio;
  return { id, pop: e.populacao, total: e.total, imp: e.impostos, pr: e.producao, com: e.comercio,
           corr: e.corrupcao, porMil: e.total / (e.populacao / 1000),
           terra: bruto > 0 ? (e.producao + e.comercio) / bruto : 0 };
});
let inv = 0, pares = 0;
for (const a of provs) for (const b of provs) { if (a.pop >= b.pop) continue; pares++; if (a.total > b.total) inv++; }
const pm = provs.map((p) => p.porMil);
const terraMedia = provs.reduce((s, p) => s + p.terra, 0) / provs.length;
const semCorrupcao = provs.filter((p) => p.corr === 0).map((p) => p.id);
console.log('=== 1. TERRA vs CABEÇAS (25 províncias) ===');
console.log(`renda por mil hab: ${Math.min(...pm).toFixed(1)} a ${Math.max(...pm).toFixed(1)} (${(Math.max(...pm)/Math.min(...pm)).toFixed(1)}x)`);
console.log(`renda vinda da TERRA: ${(terraMedia*100).toFixed(0)}%`);
console.log(`província menor rendendo mais que uma maior: ${((inv/pares)*100).toFixed(0)}% dos pares`);
console.log(`províncias com corrupção ZERO: ${semCorrupcao.length ? semCorrupcao.join(', ') : 'nenhuma'}`);
const ricas = [...provs].sort((a,b)=>b.porMil-a.porMil).slice(0,3).map(p=>`${p.id}(${p.pop}, ${p.total})`);
const pobres = [...provs].sort((a,b)=>a.porMil-b.porMil).slice(0,3).map(p=>`${p.id}(${p.pop}, ${p.total})`);
console.log(`mais ricas por habitante: ${ricas.join('  ')}`);
console.log(`mais pobres por habitante: ${pobres.join('  ')}`);

// ── 2. CEDO: os 18 poderes jogaveis no turno 1 ─────────────────────────────────────────
console.log('\n=== 2. CEDO: os 18 poderes jogáveis ===');
const base = nova(); base.comecar('atenas');
const jogaveis = base.poderesVivos().filter((id) => base.semEconomia(id) === 0);
const cedo = jogaveis.map((id) => {
  const c = nova(); c.comecar(id);
  const antes = c.tesouro; c.passarTurno();
  const liq = c.tesouro - antes;
  const casa = c.capitalDe(id) ?? c.provinciasDe(id)[0]!;
  const disp = c.construcoesDisponiveisEm(casa);
  const barata = Math.min(...Object.keys(disp).map((x) => c.custoDaObraEm(casa, x, 1)));
  return { nome: c.poder(id).nome, pop: c.provinciasDe(id).reduce((s,p)=>s+c.populacaoDe(p),0),
           liq, ritmo: liq > 0 ? Math.ceil(barata / liq) : Infinity };
});
cedo.sort((a,b)=>b.liq-a.liq);
for (const l of cedo) console.log(`  ${l.nome.padEnd(16)}${String(l.pop).padStart(7)}${String(l.liq).padStart(7)} /turno   constrói em ${l.ritmo} turnos`);
const ritmos = cedo.map(l=>l.ritmo).filter(Number.isFinite);
console.log(`  razão renda ${(cedo[0]!.liq/cedo[cedo.length-1]!.liq).toFixed(1)}x  |  ritmo ${Math.min(...ritmos)} a ${Math.max(...ritmos)} turnos (${(Math.max(...ritmos)/Math.min(...ritmos)).toFixed(1)}x)  |  em déficit: ${cedo.filter(l=>l.liq<0).length}`);

// ── 3. MEIO: imperio esticado, e o payback dos predios no pobre e no rico ──────────────
console.log('\n=== 3. MEIO: império esticado (Atenas toma 4 terras) ===');
const cm = nova(); cm.comecar('atenas');
for (const id of ['eleusis','megara','corinto','sicion']) cm.trocarDono(id, 'atenas');
cm.darOuro(50_000);
const antesM = cm.tesouro; cm.passarTurno();
console.log(`  renda do império: ${cm.tesouro - antesM} /turno com ${cm.provinciasDe('atenas').length} províncias`);
console.log('  predio     provincia    payback');
for (const prov of ['atenas','corinto','sicion','megara']) {
  for (const p of ['agora','estrada','mercado','porto','lagar','pedreira']) {
    const disp = cm.construcoesDisponiveisEm(prov);
    if (!disp[p]) continue;
    const r = cm.retornoDaConstrucaoEm(prov, p);
    const g = r?.ganhoPorTurno ?? 0;
    console.log(`  ${p.padEnd(11)}${prov.padEnd(12)}${(g>0?Math.ceil((r?.custo??0)/g)+' turnos':'nunca').padStart(12)}  (corrupção ${((cm.economiaDe(prov)?.corrupcao??0)*100).toFixed(0)}%)`);
  }
}

// ── 4. FIM: paz longa, com e sem construir ────────────────────────────────────────────
console.log('\n=== 4. FIM: 300 turnos de paz ===');
for (const poder of ['atenas','hermione','tebas']) {
  const c = nova(); c.comecar(poder);
  let fomes = 0;
  for (let t = 0; t < 300; t++) { c.passarTurno(); if (c.fome.provincias.length) fomes++; }
  const pop = c.provinciasDe(poder).reduce((s,p)=>s+c.populacaoDe(p),0);
  console.log(`  ${poder.padEnd(10)} tesouro ${String(c.tesouro).padStart(8)}  população ${String(pop).padStart(7)}  renda ${String(c.renda).padStart(5)}  anos de fome: ${fomes}`);
}

// ── 5. CATALOGO INTEIRO no mais pobre e no mais rico ──────────────────────────────────
console.log('\n=== 5. CATÁLOGO INTEIRO: do poder mais pobre ao mais rico ===');
for (const poder of ['hermione', 'plateia', 'caristo', 'tanagra', 'tebas', 'corinto', 'atenas']) {
  const c = nova(); c.comecar(poder);
  const casa = c.capitalDe(poder) ?? c.provinciasDe(poder)[0]!;
  const antes = c.tesouro; c.passarTurno();
  const liq = c.tesouro - antes;
  const disp = c.construcoesDisponiveisEm(casa);
  const linhas = Object.keys(disp).map((p) => {
    const r = c.retornoDaConstrucaoEm(casa, p);
    const g = r?.ganhoPorTurno ?? 0;
    return { p, custo: c.custoDaObraEm(casa, p, 1), pagar: g > 0 ? Math.ceil((r?.custo ?? 0) / g) : Infinity };
  }).sort((a, b) => a.pagar - b.pagar);
  const uteis = linhas.filter((l) => Number.isFinite(l.pagar));
  console.log(`\n  ${poder.toUpperCase()} — ${liq}/turno, ${Object.keys(disp).length} prédios no catálogo, ${uteis.length} se pagam`);
  for (const l of linhas) {
    console.log(`    ${l.p.padEnd(16)}custa ${String(l.custo).padStart(5)}   ${Number.isFinite(l.pagar) ? l.pagar + ' turnos' : 'nunca (paga em outra moeda)'}`);
  }
}
