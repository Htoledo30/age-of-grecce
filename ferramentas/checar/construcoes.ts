/**
 * A tabela de balanço das construções, e a da milícia.
 *
 * O alvo é a obra se pagando em algumas dezenas de turnos, não em centenas. **Cada família
 * paga numa moeda diferente**, e é por isso que cada uma se lista sozinha: enfileirar todas
 * numa tabela de "turnos até se pagar" imprimiria "nunca" para as que não rendem moeda —
 * verdade aritmética e mentira sobre o que elas são.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Ajustes, Construcoes, Economia } from '../../src/dados/esquema';
import { retornoDaConstrucao } from '../../src/campanha/economia';
import { miliciaDe } from '../../src/combate/milicia';
import { reclamar } from './problemas';

type Catalogo = Construcoes['construcoes'];
type Efeito = Catalogo[string]['efeito'];

export function checarConstrucoes(): void {
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
  const ajustes = Ajustes.safeParse(JSON.parse(readFileSync(resolve('dados/ajustes.json'), 'utf8')));
  if (!economia.success || !ajustes.success) return; // já reclamado

  imprimirRetorno(catalogo, economia.data, ajustes.data);

  // `renda` fica de fora das famílias porque só ela não tem promessa escrita: o que ela
  // promete é a tabela de cima. A união discriminada é quem obriga esta distinção a existir.
  familia(catalogo, 'construções que fortalecem a alimentação:', 'alimento');
  familia(catalogo, 'construções que acalmam o povo:', 'felicidade');
  familia(catalogo, 'construções com efeito futuro:', 'futuro');
  familia(catalogo, 'construções que fortalecem a defesa local:', 'milicia');

  imprimirMilicia(catalogo, economia.data, ajustes.data);
}

/** Só as que rendem moeda entram nesta tabela: ganho por turno e turnos até se pagar. */
function imprimirRetorno(catalogo: Catalogo, economia: Economia, ajustes: Ajustes): void {
  const deRenda = Object.entries(catalogo).filter(([, c]) => c.efeito.tipo === 'renda');
  console.log('construções que rendem moeda — ganho por turno e turnos até se pagar:');
  const cabecalho = deRenda.map(([, c]) => `${c.nome} I (${c.custos[0]})`.padStart(20)).join('');
  console.log(`  ${''.padEnd(12)}${cabecalho}`);

  for (const [id, ficha] of Object.entries(economia.provincias)) {
    const celulas = deRenda.map(([idConstrucao, construcao]) => {
      const requisito = construcao.requisito;
      const produtos = new Set([ficha.produto, ficha.secundario.produto]);
      const disponivel =
        (!requisito?.ancoradouro || ficha.ancoradouro) &&
        (!requisito?.produtos || requisito.produtos.some((produto) => produtos.has(produto)));
      if (!disponivel) return '—'.padStart(20);
      const c = retornoDaConstrucao(
        ficha,
        economia.produtos,
        catalogo,
        ajustes.jogo.economia,
        {
          construcoes: {},
          escalaDeObra: 1,
          populacao: ficha.populacao,
          corrupcao: 0,
          fatorDeImposto: 1,
          revoltosa: false,
    fatorDoHumor: 1,
          sitiada: false,
          ligada: true,
        },
        idConstrucao,
      );
      const turnos = Number.isFinite(c.turnosParaPagar) ? `${Math.ceil(c.turnosParaPagar)}t` : 'nunca';
      // Desde a manutenção, o ganho é líquido e pode ser negativo: a tabela mostra a
      // armadilha em vez de escondê-la atrás de um "+-".
      const ganho = c.ganhoPorTurno >= 0 ? `+${c.ganhoPorTurno}` : `−${-c.ganhoPorTurno}`;
      return `${ganho}/turno em ${turnos}`.padStart(20);
    });
    console.log(`  ${id.padEnd(12)}${celulas.join('')}`);
  }
}

function familia(catalogo: Catalogo, titulo: string, tipo: Exclude<Efeito['tipo'], 'renda'>): void {
  const desta = Object.values(catalogo).filter((c) => c.efeito.tipo === tipo);
  if (desta.length === 0) return;
  console.log(titulo);
  for (const c of desta) {
    if (c.efeito.tipo === 'renda') continue;
    console.log(
      `  ${c.nome.padEnd(18)}${String(c.custos[0]).padStart(8)} · ${c.turnos[0]}t · ${c.promessa}`,
    );
  }
}

/**
 * A milícia é fraca de propósito, e "1,2%" não diz nada; o número de defensores diz. É aqui
 * que uma Muralha barata demais aparece como cidade intomável.
 */
function imprimirMilicia(catalogo: Catalogo, economia: Economia, ajustes: Ajustes): void {
  const combate = ajustes.jogo.combate;
  console.log('milícia por província configurada — sem obra e com Muralha:');
  for (const [id, ficha] of Object.entries(economia.provincias)) {
    const nua = miliciaDe(ficha.populacao, {}, catalogo, combate);
    const murada = miliciaDe(ficha.populacao, { muralha: 1 }, catalogo, combate);
    console.log(
      `  ${id.padEnd(12)}${String(ficha.populacao).padStart(8)} hab · ${String(nua).padStart(5)} · ${String(murada).padStart(5)} com Muralha`,
    );
  }
}
