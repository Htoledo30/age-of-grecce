/**
 * Validações do nosso domínio — o que lint e compilador não conseguem ver.
 * Roda junto com `npm run verificar`.
 *
 * O alvo aqui é sempre o mesmo: pegar a incoerência ENTRE arquivos. Cada arquivo
 * sozinho já é validado pelo esquema Zod; o que escapa é a moldura do jogo divergindo
 * da moldura do mapa gerado, ou a arte faltando depois de um `gerar-mapa` interrompido.
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';

import { Ajustes, Construcoes, Economia, Mundo, Provincias } from '../src/dados/esquema';
import { rendaDaProvincia, retornoDaConstrucao } from '../src/campanha/economia';

const problemas: string[] = [];

function reclamar(mensagem: string): void {
  problemas.push(mensagem);
}

interface MapaGerado {
  dimensoes: { largura: number; altura: number };
  resolucaoTerreno: number;
  regiaoReferencia: string;
  limitesReferencia: { oeste: number; leste: number; sul: number; norte: number };
}

function lerMapaGerado(): MapaGerado | null {
  const caminho = resolve('assets/mundo/mapa.json');
  if (!existsSync(caminho)) {
    reclamar('assets/mundo/mapa.json não existe — rode `npm run gerar-mapa`');
    return null;
  }
  return JSON.parse(readFileSync(caminho, 'utf8')) as MapaGerado;
}

function checarMundo(mapa: MapaGerado | null): void {
  const bruto: unknown = JSON.parse(readFileSync(resolve('dados/mundo.json'), 'utf8'));

  const r = Mundo.safeParse(bruto);
  if (!r.success) {
    for (const i of r.error.issues) {
      reclamar(`mundo.json ${i.path.join('.') || '(raiz)'}: ${i.message}`);
    }
    return;
  }
  const mundo = r.data;

  if (mapa) {
    const d = mapa.dimensoes;
    if (mundo.dimensoes.largura !== d.largura || mundo.dimensoes.altura !== d.altura) {
      reclamar(
        `mundo.json diz ${mundo.dimensoes.largura}x${mundo.dimensoes.altura} mas o mapa ` +
          `gerado tem ${d.largura}x${d.altura} — o terreno sairia esticado`,
      );
    }
    const { oeste, leste, sul, norte } = mapa.limitesReferencia;
    console.log(
      `mundo: "${mundo.nome}" em ${d.largura}x${d.altura} unidades — ` +
        `janela ${oeste}°–${leste}°E, ${sul}°–${norte}°N`,
    );
  }
}

function checarAjustes(): void {
  const bruto: unknown = JSON.parse(readFileSync(resolve('dados/ajustes.json'), 'utf8'));
  const r = Ajustes.safeParse(bruto);
  if (!r.success) {
    for (const i of r.error.issues) {
      reclamar(`ajustes.json ${i.path.join('.') || '(raiz)'}: ${i.message}`);
    }
    return;
  }
  const a = r.data;
  if (a.detalhes.zoomInicio >= a.detalhes.zoomCheio) {
    reclamar('ajustes.json: detalhes.zoomInicio precisa ser menor que zoomCheio');
  }
  console.log(`ajustes: zoom até ${a.camera.zoomMaximo}x, roda de ${a.camera.passoDaRoda}`);
}

/** A arte do mapa é grande e demora a gerar: meio caminho gerado é falha silenciosa. */
function checarArte(mapa: MapaGerado | null): void {
  if (!mapa) return;
  const esperados = [
    'terreno.png',
    'navegacao.png',
    'biomas.png',
    'altitude.png',
    'altitude.f32',
    'detalhes.json',
    'hidrologia.json',
  ];
  for (const arquivo of esperados) {
    const caminho = resolve('assets/mundo', arquivo);
    if (!existsSync(caminho)) {
      reclamar(`assets/mundo/${arquivo} não existe — rode \`npm run gerar-mapa\``);
      continue;
    }
    if (statSync(caminho).size === 0) reclamar(`assets/mundo/${arquivo} está vazio`);
  }

  const terreno = resolve('assets/mundo/terreno.png');
  if (!existsSync(terreno)) return;
  const png = PNG.sync.read(readFileSync(terreno));
  const alturaEsperada = Math.round(
    (mapa.resolucaoTerreno * mapa.dimensoes.altura) / mapa.dimensoes.largura,
  );
  if (png.width !== mapa.resolucaoTerreno || png.height !== alturaEsperada) {
    reclamar(
      `terreno.png é ${png.width}x${png.height} mas mapa.json pede ` +
        `${mapa.resolucaoTerreno}x${alturaEsperada}`,
    );
  } else {
    console.log(`arte: terreno ${png.width}x${png.height}, ${mapa.regiaoReferencia}`);
  }
}

/**
 * O recorte político só é confiável se três coisas fecharem: todo dono existe, todo
 * índice é único, e toda vizinha aponta pra província que existe. Índice repetido é o
 * pior deles — duas províncias dividindo cor e caindo juntas numa conquista só.
 */
function checarProvincias(mapa: MapaGerado | null): void {
  const caminho = resolve('assets/mundo/provincias.json');
  if (!existsSync(caminho)) {
    reclamar('assets/mundo/provincias.json não existe — rode `npm run gerar-provincias`');
    return;
  }
  const r = Provincias.safeParse(JSON.parse(readFileSync(caminho, 'utf8')));
  if (!r.success) {
    for (const i of r.error.issues) {
      reclamar(`provincias.json ${i.path.join('.') || '(raiz)'}: ${i.message}`);
    }
    return;
  }
  const dados = r.data;

  if (mapa && (dados.resolucao.largura !== mapa.resolucaoTerreno)) {
    reclamar(
      `provincias.png tem ${dados.resolucao.largura} px de largura mas o terreno tem ` +
        `${mapa.resolucaoTerreno} — as duas camadas não se sobrepõem`,
    );
  }

  const poderes = new Set(dados.poderes.map((p) => p.id));
  const ids = new Set(dados.provincias.map((p) => p.id));
  const indices = new Set<number>();
  let semArea = 0;

  for (const p of dados.provincias) {
    if (indices.has(p.indice)) reclamar(`provincias.json: índice ${p.indice} repetido em "${p.nome}"`);
    indices.add(p.indice);
    if (!poderes.has(p.dono)) reclamar(`provincias.json: "${p.nome}" tem dono inexistente "${p.dono}"`);
    for (const v of p.vizinhas) {
      if (!ids.has(v)) reclamar(`provincias.json: "${p.nome}" faz fronteira com "${v}", que não existe`);
    }
    if (p.areaKm2 === 0) semArea++;
  }
  if (ids.size !== dados.provincias.length) reclamar('provincias.json: id de província repetido');
  if (semArea > 0) reclamar(`provincias.json: ${semArea} província(s) sem um pixel sequer no mapa`);

  const donos = new Set(dados.provincias.map((p) => p.dono));
  const orfaos = [...poderes].filter((d) => !donos.has(d));
  if (orfaos.length > 0) {
    reclamar(`provincias.json: poder sem nenhuma província: ${orfaos.join(', ')}`);
  }

  const areas = dados.provincias.map((p) => p.areaKm2).sort((a, b) => a - b);
  console.log(
    `provincias: ${dados.provincias.length} em ${donos.size} poderes, época ${dados.epoca} — ` +
      `área mediana ${areas[areas.length >> 1]} km²`,
  );
}

/**
 * A economia só é confiável se ela apontar pra coisas que existem, e se o alvo de
 * sensação for verificável. Renda alvo, do documento de design: Atenas por volta de 700
 * por turno, com tesouro inicial de 3.000.
 */
function checarEconomia(): void {
  const bruto: unknown = JSON.parse(readFileSync(resolve('dados/economia.json'), 'utf8'));
  const r = Economia.safeParse(bruto);
  if (!r.success) {
    for (const i of r.error.issues) {
      reclamar(`economia.json ${i.path.join('.') || '(raiz)'}: ${i.message}`);
    }
    return;
  }
  const economia = r.data;

  const ajustes = Ajustes.safeParse(
    JSON.parse(readFileSync(resolve('dados/ajustes.json'), 'utf8')),
  );
  if (!ajustes.success) return; // checarAjustes já reclamou

  const provincias = Provincias.safeParse(
    JSON.parse(readFileSync(resolve('assets/mundo/provincias.json'), 'utf8')),
  );
  if (!provincias.success) return; // checarProvincias já reclamou
  const porId = new Map(provincias.data.provincias.map((p) => [p.id, p]));

  const porPoder = new Map<string, number>();
  for (const [id, ficha] of Object.entries(economia.provincias)) {
    const provincia = porId.get(id);
    if (!provincia) {
      reclamar(`economia.json descreve província inexistente: "${id}"`);
      continue;
    }
    if (!economia.produtos[ficha.produto]) {
      reclamar(`economia.json: "${id}" aponta pro produto inexistente "${ficha.produto}"`);
      continue;
    }
    const renda = rendaDaProvincia(ficha, economia.produtos, {}, ajustes.data.jogo.economia, {
      construcoes: [],
      populacao: ficha.populacao,
      investimento: undefined,
    });
    porPoder.set(provincia.dono, (porPoder.get(provincia.dono) ?? 0) + renda.total);
    console.log(
      `  ${provincia.nome.padEnd(12)} ${renda.produto.nome.padEnd(17)} ` +
        `nivel ${renda.nivel} · impostos ${String(renda.impostos).padStart(4)} ` +
        `· produção ${String(renda.producao).padStart(4)} · comércio ${String(renda.comercio).padStart(3)} ` +
        `= ${String(renda.total).padStart(4)}`,
    );
  }

  const configuradas = Object.keys(economia.provincias).length;
  const total = provincias.data.provincias.length;
  console.log(
    `economia: ${configuradas} de ${total} províncias configuradas ` +
      `(${total - configuradas} ainda sem economia, e sem arrecadar nada)`,
  );
  for (const [poder, renda] of porPoder) {
    console.log(`  ${poder}: ${renda} por turno, tesouro inicial ${ajustes.data.jogo.tesouroInicial}`);
  }
}

/**
 * Imprime a tabela de balanço das construções.
 *
 * O alvo é obra se pagando em algumas dezenas de turnos, não em centenas: retorno de 150
 * a 200 turnos é justamente o defeito do Age of History II que
 * `documentacao/design/referencias-economicas.md` registra. Com a tabela impressa, o
 * desequilíbrio aparece aqui em vez de virar folclore.
 */
function checarConstrucoes(): void {
  const caminho = resolve('dados/construcoes.json');
  if (!existsSync(caminho)) {
    reclamar('dados/construcoes.json não existe');
    return;
  }
  const r = Construcoes.safeParse(JSON.parse(readFileSync(caminho, 'utf8')));
  if (!r.success) {
    for (const i of r.error.issues) {
      reclamar(`construcoes.json ${i.path.join('.') || '(raiz)'}: ${i.message}`);
    }
    return;
  }
  const catalogo = r.data.construcoes;

  const economia = Economia.safeParse(
    JSON.parse(readFileSync(resolve('dados/economia.json'), 'utf8')),
  );
  const ajustes = Ajustes.safeParse(
    JSON.parse(readFileSync(resolve('dados/ajustes.json'), 'utf8')),
  );
  if (!economia.success || !ajustes.success) return; // já reclamado

  // Só as que rendem moeda entram na tabela de retorno. O Quartel não tem "paga-se em N
  // turnos" — ele paga em capacidade, e enfiá-lo aqui imprimiria "nunca", que é verdade
  // aritmética e mentira sobre o que ele é. Ele sai listado à parte.
  const deRenda = Object.entries(catalogo).filter(([, c]) => c.efeito.tipo === 'renda');
  const deCapacidade = Object.entries(catalogo).filter(([, c]) => c.efeito.tipo === 'capacidade');

  console.log('construções que rendem moeda — ganho por turno e turnos até se pagar:');
  const cabecalho = deRenda.map(([, c]) => `${c.nome} (${c.custo})`.padStart(20)).join('');
  console.log(`  ${''.padEnd(12)}${cabecalho}`);

  for (const [id, ficha] of Object.entries(economia.data.provincias)) {
    const celulas = deRenda.map(([idConstrucao]) => {
      const c = retornoDaConstrucao(
        ficha,
        economia.data.produtos,
        catalogo,
        ajustes.data.jogo.economia,
        { construcoes: [], populacao: ficha.populacao },
        idConstrucao,
      );
      const turnos = Number.isFinite(c.turnosParaPagar)
        ? `${Math.ceil(c.turnosParaPagar)}t`
        : 'nunca';
      return `+${c.ganhoPorTurno}/turno em ${turnos}`.padStart(20);
    });
    console.log(`  ${id.padEnd(12)}${celulas.join('')}`);
  }

  if (deCapacidade.length > 0) {
    console.log('construções que pagam em capacidade:');
    for (const [, c] of deCapacidade) {
      const promessa = c.efeito.tipo === 'capacidade' ? c.efeito.promessa : '';
      console.log(`  ${c.nome.padEnd(12)}${String(c.custo).padStart(8)} · ${c.turnos}t · ${promessa}`);
    }
  }
}

const mapa = lerMapaGerado();
checarMundo(mapa);
checarAjustes();
checarArte(mapa);
checarProvincias(mapa);
checarEconomia();
checarConstrucoes();

if (problemas.length > 0) {
  console.error(`\n${problemas.length} problema(s) nos dados:`);
  for (const p of problemas) console.error(`  - ${p}`);
  process.exit(1);
}
console.log('dados: tudo certo');
