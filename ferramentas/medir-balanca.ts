/**
 * O banco de provas da BALANÇA DE INTERESSE: **o que cada reino pesa diante de cada acordo.**
 *
 * `npm run medir-balanca [turnos]`. Roda a partida sem tela, como `npm run partida`, e em quatro
 * cortes do tempo pergunta a balança de pacto e aliança para TODO par ordenado de poderes com
 * ficha. Não escreve nada e não dá veredito: mostra os números e quem lê decide.
 *
 * O que ele responde:
 *
 * 1. **Quantos pares fecham cada acordo?** Por prazo e por temperamento de quem decide. É o
 *    número de comparação antes e depois de mexer num peso: se a balança do pacto curto passa
 *    de 40 pares para 4, a régua quebrou, e não o mapa.
 * 2. **Onde o saldo cai?** Histograma em faixas de vinte: uma balança que vive toda em −60 não
 *    é uma balança, é um não.
 * 3. **Qual parcela mais decide o não?** Se for sempre a mesma, ela está pesada demais.
 * 4. **Quantos vizinhos o cofre de Atenas fecha hoje?** A resposta certa é "nunca todos, e
 *    nunca os que cobiçam duas terras" — é a prova de que ouro não compra o mapa.
 *
 * ⚠️ Determinístico como a partida: dois pesos se comparam sem repetição.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Campanha } from '../src/campanha/campanha';
import { Ajustes, Construcoes, Economia, Exercitos, Ia, Provincias } from '../src/dados/esquema';
import { balancaDaAlianca } from '../src/ia/diplomacia/aliancas';
import { type Balanca, cobicadasPor, ouroQueFecha } from '../src/ia/diplomacia/balanca';
import { balancaDoPacto } from '../src/ia/diplomacia/pactos';
import { estiloDe, nomeDoEstiloDe } from '../src/ia/estilo';
import { jogarIA } from '../src/ia/ia';
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

const TURNOS = Number(process.argv[2] ?? 100);
const CORTES = [1, 25, 50, TURNOS].filter((t, i, lista) => t <= TURNOS && lista.indexOf(t) === i);
const pad = (t: string, w: number): string => t.padEnd(w);

const c = new Campanha(new Atlas(provincias), economia, construcoes, ajustes, exercitos);
c.comecar('atenas');

interface Corte {
  turno: number;
  /** Por acordo e prazo: quantos pares ordenados fecham, e quantos existem. */
  fecham: Map<string, { sim: number; total: number; porEstilo: Map<string, [number, number]> }>;
  faixas: Map<string, Map<number, number>>;
  culpadas: Map<string, Map<string, number>>;
  atenasFecha: { pares: number; comOuro: number; semSaida: number; cobicamDuas: number };
  /** O cofre de Atenas NESTE corte, e não no fim da partida. */
  cofre: number;
}

function medir(turno: number): Corte {
  const corte: Corte = {
    turno,
    fecham: new Map(),
    faixas: new Map(),
    culpadas: new Map(),
    atenasFecha: { pares: 0, comOuro: 0, semSaida: 0, cobicamDuas: 0 },
    cofre: c.tesouroDe('atenas'),
  };
  const poderes = [...c.poderesComFicha()].sort();
  const anota = (acordo: string, estilo: string, b: Balanca): void => {
    const f = corte.fecham.get(acordo) ?? {
      sim: 0,
      total: 0,
      porEstilo: new Map<string, [number, number]>(),
    };
    f.total += 1;
    if (b.saldo >= 0) f.sim += 1;
    const [s, t] = f.porEstilo.get(estilo) ?? [0, 0];
    f.porEstilo.set(estilo, [s + (b.saldo >= 0 ? 1 : 0), t + 1]);
    corte.fecham.set(acordo, f);
    const faixa = Math.max(-100, Math.min(100, Math.floor(b.saldo / 20) * 20));
    const h = corte.faixas.get(acordo) ?? new Map<number, number>();
    h.set(faixa, (h.get(faixa) ?? 0) + 1);
    corte.faixas.set(acordo, h);
    if (b.saldo < 0) {
      const pior = [...b.parcelas].sort((x, y) => x.pontos - y.pontos)[0];
      if (pior) {
        const cul = corte.culpadas.get(acordo) ?? new Map<string, number>();
        const chave = pior.rotulo.replace(/ \d+ turnos$/, ' N turnos').replace(/^cobiça .*/, 'cobiça');
        cul.set(chave, (cul.get(chave) ?? 0) + 1);
        corte.culpadas.set(acordo, cul);
      }
    }
  };
  for (const ele of poderes) {
    const estilo = estiloDe(ia, ele);
    const nome = nomeDoEstiloDe(ia, ele);
    for (const voce of poderes) {
      if (voce === ele) continue;
      if (c.emGuerra(ele, voce)) continue;
      const lados = { ele, voce };
      const cobicadas = cobicadasPor(c, lados, estilo, ajustes);
      for (const p of ajustes.diplomacia.pacto.prazos) {
        anota(`pacto ${p.turnos}`, nome, balancaDoPacto(c, lados, p.turnos, estilo, ajustes, { cobicadas }));
      }
      for (const p of ajustes.diplomacia.alianca.prazos) {
        anota(`aliança ${p.turnos}`, nome, balancaDaAlianca(c, lados, p.turnos, estilo, ajustes, { cobicadas }));
      }
      if (voce === 'atenas') {
        const curto = Math.min(...ajustes.diplomacia.pacto.prazos.map((p) => p.turnos));
        const b = balancaDoPacto(c, lados, curto, estilo, ajustes, { cobicadas });
        corte.atenasFecha.pares += 1;
        if (cobicadas.length >= 2) corte.atenasFecha.cobicamDuas += 1;
        if (b.saldo >= 0) continue;
        const ouro = ouroQueFecha(c, lados, b.saldo, estilo, ajustes, c.tesouroDe('atenas'));
        if (ouro !== null) corte.atenasFecha.comOuro += 1;
        else if (ouroQueFecha(c, lados, b.saldo, estilo, ajustes, Number.MAX_SAFE_INTEGER) === null) {
          corte.atenasFecha.semSaida += 1;
        }
      }
    }
  }
  return corte;
}

const comFicha = c.poderesComFicha().length;
const cortes: Corte[] = [];
for (let turno = 1; turno <= TURNOS; turno++) {
  if (CORTES.includes(turno)) cortes.push(medir(turno));
  if (turno === TURNOS) break;
  jogarIA(c, ia, ajustes);
  c.passarTurno();
}

console.log(`\nA BALANÇA DE INTERESSE — ${comFicha} poderes com ficha, cortes nos turnos ${CORTES.join(', ')}\n`);
for (const corte of cortes) {
  console.log(`── turno ${corte.turno} ──`);
  for (const [acordo, f] of [...corte.fecham.entries()].sort()) {
    const porEstilo = [...f.porEstilo.entries()]
      .sort()
      .map(([e, [s, t]]) => `${e} ${s}/${t}`)
      .join(' · ');
    console.log(`  ${pad(acordo, 12)} fecham ${String(f.sim).padStart(3)} de ${f.total} pares  (${porEstilo})`);
    const faixas = corte.faixas.get(acordo) ?? new Map<number, number>();
    const linha = [...faixas.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([faixa, n]) => `${faixa >= 0 ? '+' : ''}${faixa}:${n}`)
      .join(' ');
    console.log(`  ${pad('', 12)} saldo por faixa  ${linha}`);
    const culpadas = corte.culpadas.get(acordo);
    if (culpadas) {
      const top = [...culpadas.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
      console.log(`  ${pad('', 12)} o que mais decide o não  ${top.map(([r, n]) => `${r} ${n}`).join(' · ')}`);
    }
  }
  const a = corte.atenasFecha;
  console.log(
    `  o cofre de Atenas (${corte.cofre.toLocaleString('pt-BR')}) fecha o pacto curto com ${a.comOuro} de ${a.pares} vizinhos que recusam;` +
      ` ${a.semSaida} sem saída · ${a.cobicamDuas} cobiçam duas terras ou mais\n`,
  );
}
