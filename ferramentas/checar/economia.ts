/**
 * A economia só é confiável se ela apontar pra coisas que existem, e se o alvo de sensação
 * for verificável.
 *
 * Renda alvo, do documento de design: Atenas por volta de 700 por turno, com tesouro inicial
 * de 3.000. Com a tabela impressa, o desequilíbrio aparece aqui em vez de virar folclore.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Ajustes, Economia, Provincias } from '../../src/dados/esquema';
import { rendaDaProvincia } from '../../src/campanha/economia';
import { reclamar } from './problemas';

export function checarEconomia(): void {
  const bruto: unknown = JSON.parse(readFileSync(resolve('dados/economia.json'), 'utf8'));
  const r = Economia.safeParse(bruto);
  if (!r.success) {
    for (const i of r.error.issues) {
      reclamar(`economia.json ${i.path.join('.') || '(raiz)'}: ${i.message}`);
    }
    return;
  }
  const economia = r.data;

  const ajustes = Ajustes.safeParse(JSON.parse(readFileSync(resolve('dados/ajustes.json'), 'utf8')));
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
    // Corrupção zero DE PROPÓSITO: ela depende da capital da partida, e esta tabela é o
    // retrato autoral da terra — o que ela renderia com administração perfeita.
    const renda = rendaDaProvincia(ficha, economia.produtos, {}, ajustes.data.jogo.economia, {
      construcoes: {},
      escalaDeObra: 1,
      populacao: ficha.populacao,
      corrupcao: 0,
      fatorDeImposto: 1,
      revoltosa: false,
      sitiada: false,
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
