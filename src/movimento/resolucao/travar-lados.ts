/**
 * Um choque entre dois LADOS, cada um podendo ter várias forças no mesmo lugar.
 *
 * O perdedor some inteiro; o vencedor encolhe proporcionalmente em todas as suas forças.
 * Encolher proporcionalmente e não "a primeira da lista" é o que impede a ordem das chegadas
 * de virar uma regra escondida.
 */

import { resolverChoque } from '@/combate/batalha';
import { exercitoVazio, retirar, somarLeva } from '@/combate/exercito';
import { soma } from './forcas';
import type { Forca } from './forcas';
import type { RelatorioEmConstrucao } from './relatorio';

export function travarLados(
  ladoA: readonly Forca[],
  ladoB: readonly Forca[],
  provincia: string | null,
  batalhas: RelatorioEmConstrucao['batalhas'],
  cancelarRota: boolean,
): void {
  // Sem lugar é encontro na estrada; com lugar é choque de campo. O assalto é o único que não
  // passa por aqui: ele é contra a muralha, não contra um exército.
  const tipo = provincia === null ? ('estrada' as const) : ('campo' as const);
  const totalA = ladoA.reduce((s, f) => s + soma(f.origem), 0);
  const totalB = ladoB.reduce((s, f) => s + soma(f.origem), 0);
  const r = resolverChoque(totalA, totalB);

  const vencedores = r.vencedor === 'a' ? ladoA : r.vencedor === 'b' ? ladoB : [];
  const perdedores =
    r.vencedor === 'a' ? ladoB : r.vencedor === 'b' ? ladoA : [...ladoA, ...ladoB];

  for (const f of perdedores) {
    f.viva = false;
    f.origem = {};
  }
  reduzirLado(vencedores, r.sobreviventes);
  if (cancelarRota) for (const f of vencedores) f.rota = [];

  batalhas.push({
    provincia,
    vencedor: vencedores[0]?.poder ?? null,
    perdedores: [...new Set(perdedores.map((f) => f.poder))].sort(),
    sobreviventes: r.sobreviventes,
    tipo,
  });
}

/** Encolhe um lado até `alvo` homens, proporcionalmente entre as forças e as terras natais. */
function reduzirLado(lado: readonly Forca[], alvo: number): void {
  const total = lado.reduce((s, f) => s + soma(f.origem), 0);
  if (total <= alvo || total === 0) return;

  // Reaproveita `retirar`, que já reparte proporcionalmente e fecha exato no arredondamento.
  const caixa = exercitoVazio('provisorio', 'provisorio', 'provisorio');
  for (const f of lado) {
    for (const [terra, homens] of Object.entries(f.origem)) somarLeva(caixa, terra, homens);
  }
  retirar(caixa, total - alvo);

  // Redistribui o que sobrou de volta, na proporção do que cada força tinha.
  const sobrou = { ...caixa.origem };
  for (const f of lado) {
    const meu = soma(f.origem);
    const nova: Record<string, number> = {};
    for (const [terra, homens] of Object.entries(sobrou)) {
      const parte = Math.floor((homens * meu) / total);
      if (parte > 0) nova[terra] = parte;
    }
    f.origem = nova;
    if (soma(nova) === 0) f.viva = false;
  }

  // O resto do arredondamento vai pra maior força viva, pra soma fechar exata.
  const falta = alvo - lado.reduce((s, f) => s + soma(f.origem), 0);
  const maior = [...lado].filter((f) => f.viva).sort((x, y) => soma(y.origem) - soma(x.origem))[0];
  if (falta > 0 && maior) {
    const terra = Object.keys(sobrou).sort()[0];
    if (terra !== undefined) maior.origem[terra] = (maior.origem[terra] ?? 0) + falta;
  }
}
