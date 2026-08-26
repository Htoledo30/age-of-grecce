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
 * 5. **A DEFESA funciona?** ⚠️ Duzentos turnos de paz validam construção e recrutamento e não
 *    dizem uma palavra sobre defender — foi a lacuna que uma auditoria apontou com razão. Com
 *    `npm run partida <turnos> invadir`, o jogador ataca de verdade: Atenas planta um exército
 *    e marcha sobre o vizinho, e o relatório conta quem socorreu, quem surtiu e quem caiu.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Campanha } from '../src/campanha/campanha';
import { Ajustes, Construcoes, Economia, Exercitos, Ia, Provincias } from '../src/dados/esquema';
import { jogarIA, poderesDaIa } from '../src/ia/ia';
import { estaAmeacado, forcaTotalDe } from '../src/ia/percepcao/ameaca';
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
/** `invadir` põe o jogador para atacar de verdade, em vez de servir de controle parado. */
const INVADIR = process.argv[3] === 'invadir';
/** A partir de que turno a invasão sai: dá tempo de os vizinhos se estabelecerem. */
const TURNO_DA_INVASAO = 20;
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
let tropaComFome = 0;
let quebrados = 0;

let socorros = 0;
let surtidas = 0;
let tomadas = 0;
let ameacados = 0;

/**
 * O jogador invadindo de verdade: junta o exército e marcha na vizinha mais fraca.
 *
 * ⚠️ **Ele AVANÇA, e não bate numa cidade só.** Um alvo fixo prova pouco: quem tem uma
 * província não tem de onde socorrer, e a primeira versão disto media zero socorros e zero
 * surtidas com toda a razão. Rolando pelo mapa, ele acaba encostando em quem tem duas terras
 * e um exército — e aí a defesa da IA tem o que fazer.
 *
 * Postura `sitiar` de propósito: é ela que põe o cerco de pé, e é o cerco que dá à IA as duas
 * respostas que faltavam ser testadas — socorro de fora e surtida de dentro.
 */
function invadir(): void {
  // ⚠️ Um empurrãozinho, e não um deus: com oito mil por turno o invasor vira um rolo
  // compressor que nenhuma defesa alcança, e o banco deixa de medir defesa para medir
  // subsídio. Dois mil mantém a pressão constante e a luta disputada.
  c.darOuro(2_000, 'atenas');
  // A MAIOR hoste dele, onde quer que esteja — e planta uma só se ele não tiver nenhuma. A
  // primeira versão plantava uma por turno na capital e o jogador acabava com sessenta mil
  // homens parados, o que não é pressão: é ruído.
  const minhas = c.hostes().filter((h) => h.poder === 'atenas');
  const hoste =
    minhas.sort((a, b) => c.forcaDaHoste(b.id) - c.forcaDaHoste(a.id))[0] ??
    c.hoste(c.plantarHoste('atenas', 'atenas', 2500));
  if (!hoste) return;
  const homens = c.forcaDaHoste(hoste.id);
  if (homens <= 0) return;

  const meu = new Set(c.provinciasDe('atenas'));
  // O alvo é a terra alheia mais fraca ao alcance: é o que um jogador faz, e é o que obriga a
  // IA a defender onde ela é mais frágil.
  const alcance = [...c.alcanceDaHoste(hoste.id)].filter((id) => !meu.has(id)).sort();
  let alvo: string | null = null;
  let menor = Number.POSITIVE_INFINITY;
  for (const id of alcance) {
    if (!c.podeOrdenarMarcha(hoste.id, id, homens, 'atenas').pode) continue;
    const defesa = c.forcaEm(id, c.donoDe(id)) + c.miliciaEm(id);
    if (defesa < menor) {
      menor = defesa;
      alvo = id;
    }
  }
  // ⚠️ `assaltar` e não `sitiar`: cerco sozinho nunca toma a praça, e o jogador ficava
  // sentado para sempre. Contra muralha a própria regra converte em cerco, que é o que um
  // jogador humano também recebe.
  if (alvo !== null) c.ordenarMarcha(hoste.id, alvo, homens, 'atenas', 'assaltar');
  // E o cerco já em pé passa a assalto assim que a muralha permitir.
  for (const { provincia, cerco } of c.cercos()) {
    if (cerco.sitiante === 'atenas' && c.assaltoEm(provincia).faltam === 0) {
      c.mudarPostura(provincia, 'assaltar');
    }
  }
}

for (let turno = 0; turno < TURNOS; turno++) {
  if (INVADIR && turno >= TURNO_DA_INVASAO) invadir();

  for (const lance of jogarIA(c, ia, ajustes)) {
    socorros += lance.defesas.filter((d) => d.tipo === 'socorro').length;
    surtidas += lance.defesas.filter((d) => d.tipo === 'surtida').length;
    if (!lance.obra) continue;
    const doPoder = obras.get(lance.poder) ?? new Map<string, number>();
    doPoder.set(lance.obra.construcao, (doPoder.get(lance.obra.construcao) ?? 0) + 1);
    obras.set(lance.poder, doPoder);
  }
  ameacados += poderesDaIa(c).filter((id) => estaAmeacado(c, id)).length;
  const antesDaRodada = c.provinciasDe('atenas').length;
  c.passarTurno();
  tomadas += Math.max(0, c.provinciasDe('atenas').length - antesDaRodada);
  if (c.fome.provincias.length > 0) turnosComFome += 1;
  if (c.fome.tropas.length > 0) tropaComFome += 1;
  for (const id of poderes) if (c.tesouroDe(id) < 0) quebrados += 1;
}

console.log(`\n════ ${TURNOS} TURNOS, TODO MUNDO NA IA (menos Atenas, que fica parada) ════\n`);
console.log(
  pad('poder', 17) +
    pad('estilo', 12) +
    pad('renda', 14) +
    pad('tesouro', 10) +
    pad('exército', 10) +
    'o que ergueu',
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
      pad(n(forcaTotalDe(c, id)), 10) +
      (erguidas || '—'),
  );
}

const rendas = poderes
  .filter((id) => c.provinciasDe(id).length > 0)
  .map((id) => c.rendaDe(id))
  .sort((a, b) => b - a);
const maior = rendas[0] ?? 0;
const menor = rendas.at(-1) ?? 1;
const emArmas = poderes.reduce((soma, id) => soma + forcaTotalDe(c, id), 0);
console.log(`\n  turnos com fome em algum lugar: ${turnosComFome}`);
console.log(`  poder-turnos com o cofre negativo: ${quebrados}`);
console.log(`  turnos com a TROPA passando fome: ${tropaComFome}`);
console.log(`  homens em armas no mapa: ${n(emArmas)}`);
if (INVADIR) {
  const vivos = poderes.filter((id) => id !== 'atenas' && c.provinciasDe(id).length > 0);
  console.log(`
  ── A INVASÃO (Atenas avança a partir do turno ${TURNO_DA_INVASAO}) ──`);
  console.log(`  províncias que Atenas tomou: ${tomadas}`);
  console.log(`  poder-turnos em que a IA se viu ameaçada: ${ameacados}`);
  console.log(`  socorros que a IA mandou: ${socorros}`);
  console.log(`  surtidas que a IA declarou: ${surtidas}`);
  console.log(`  poderes que perderam tudo: ${poderes.length - 1 - vivos.length}`);
}
console.log(`  distância entre o maior e o menor: ${(maior / Math.max(1, menor)).toFixed(1)}×`);
console.log(`  no turno 1 ela era: ${(732 / 118).toFixed(1)}×\n`);
