/**
 * O banco de provas da IA: **uma partida inteira, sem ninguém olhando.**
 *
 * `npm run partida`. Roda o mundo com TODOS os poderes na IA e conta o que aconteceu. Não
 * escreve nada, não dá veredito: mostra os números e quem lê decide — mesma regra do
 * `npm run economia` e do `npm run armas`.
 *
 * ⚠️ **Existe antes da IA para eu não trabalhar cego.** As duas ferramentas anteriores já
 * pagaram por si: `economia` mostrou que a Ágora era armadilha em metade do mapa, `armas`
 * mostrou que a cavalaria era armadilha em todas as réguas. Uma IA sem banco de provas é uma
 * IA que parece boa porque ninguém contou os turnos dela.
 *
 * O que ele responde, na etapa da economia:
 *
 * 1. **Alguém quebra?** Poder que zera o cofre e fica lá é IA que não sabe guardar.
 * 2. **Alguém passa fome?** Comer primeiro é a única regra dura que ela tem; se falhar,
 *    falhou onde mais dói.
 * 3. **O que cada estilo constrói?** Se guerreiro e mercador erguem a mesma coisa, o estilo
 *    é enfeite e o arquivo de dados está mentindo.
 * 4. **O mapa fica desigual demais?** O rico ficando mais rico é esperado; o rico ficando
 *    dez vezes mais rico em cem turnos é o jogo acabando no turno cem.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Campanha } from '../src/campanha/campanha';
import { Ajustes, Construcoes, Economia, Exercitos, Ia, Provincias } from '../src/dados/esquema';
import { jogarIA, poderesDaIa } from '../src/ia/ia';
import { nomeDoEstiloDe } from '../src/ia/estilo';
import { Atlas } from '../src/mundo/atlas';

function ler<T>(e: { parse: (v: unknown) => T }, c: string): T {
  return e.parse(JSON.parse(readFileSync(resolve(c), 'utf8')) as unknown);
}
const provincias = ler(Provincias, 'assets/mundo/provincias.json');
const economia = ler(Economia, 'dados/economia.json');
const construcoes = ler(Construcoes, 'dados/construcoes.json');
const exercitos = ler(Exercitos, 'dados/exercitos.json');
const ajustes = ler(Ajustes, 'dados/ajustes.json').jogo;
const ia = ler(Ia, 'dados/ia.json');

const TURNOS = Number(process.argv[2] ?? 200);
const n = (v: number): string => Math.round(v).toLocaleString('pt-BR');
const pad = (t: string, w: number): string => t.padEnd(w);

// ⚠️ O jogador é `atenas` e fica PARADO: ele é o grupo de controle. Se o mundo inteiro joga e
// ele não faz nada, o quanto ele fica para trás mede o que a IA está valendo.
const c = new Campanha(new Atlas(provincias), economia, construcoes, ajustes, exercitos);
c.comecar('atenas');

const poderes = [...poderesDaIa(c), 'atenas'].sort();
const inicial = new Map(poderes.map((id) => [id, c.rendaDe(id)]));
const obras = new Map<string, Map<string, number>>();
let turnosComFome = 0;
let quebrados = 0;

for (let turno = 0; turno < TURNOS; turno++) {
  for (const lance of jogarIA(c, ia)) {
    if (!lance.obra) continue;
    const doPoder = obras.get(lance.poder) ?? new Map<string, number>();
    doPoder.set(lance.obra.construcao, (doPoder.get(lance.obra.construcao) ?? 0) + 1);
    obras.set(lance.poder, doPoder);
  }
  c.passarTurno();
  if (c.fome.provincias.length > 0) turnosComFome += 1;
  for (const id of poderes) if (c.tesouroDe(id) < 0) quebrados += 1;
}

console.log(`\n════ ${TURNOS} TURNOS, TODO MUNDO NA IA (menos Atenas, que fica parada) ════\n`);
console.log(
  pad('poder', 17) + pad('estilo', 12) + pad('renda', 14) + pad('tesouro', 10) + 'o que ergueu',
);
for (const id of [...poderes].sort((a, b) => c.rendaDe(b) - c.rendaDe(a))) {
  const antes = inicial.get(id) ?? 0;
  const agora = c.rendaDe(id);
  const erguidas = [...(obras.get(id) ?? new Map<string, number>())]
    .sort((x, y) => y[1] - x[1])
    .map(([obra, quantas]) => (quantas > 1 ? `${obra}×${quantas}` : obra))
    .join(' ');
  console.log(
    pad(id, 17) +
      pad(id === 'atenas' ? '— parado —' : nomeDoEstiloDe(ia, id), 12) +
      pad(`${n(antes)} → ${n(agora)}`, 14) +
      pad(n(c.tesouroDe(id)), 10) +
      (erguidas || '—'),
  );
}

const rendas = poderes.map((id) => c.rendaDe(id)).sort((a, b) => b - a);
const maior = rendas[0] ?? 0;
const menor = rendas.at(-1) ?? 1;
console.log(`\n  turnos com fome em algum lugar: ${turnosComFome}`);
console.log(`  poder-turnos com o cofre negativo: ${quebrados}`);
console.log(`  distância entre o maior e o menor: ${(maior / Math.max(1, menor)).toFixed(1)}×`);
console.log(`  no turno 1 ela era: ${(732 / 118).toFixed(1)}×\n`);
