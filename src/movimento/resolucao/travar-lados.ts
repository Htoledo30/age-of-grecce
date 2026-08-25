/**
 * Um choque entre dois LADOS, cada um podendo ter várias forças no mesmo lugar.
 *
 * O perdedor some inteiro; o vencedor encolhe proporcionalmente em todas as suas forças.
 * Encolher proporcionalmente e não "a primeira da lista" é o que impede a ordem das chegadas
 * de virar uma regra escondida.
 */

import { lado, resolverBatalha } from '@/combate/batalha';
import type { Ajustes } from '@/dados/esquema';
import { exercitoVazio, retirar, somarLeva } from '@/combate/exercito';
import { soma } from './forcas';
import type { Forca } from './forcas';
import type { RelatorioEmConstrucao } from './relatorio';

type AjustesDaBatalha = Ajustes['jogo']['combate']['batalha'];

export function travarLados(
  ladoA: readonly Forca[],
  ladoB: readonly Forca[],
  provincia: string | null,
  batalhas: RelatorioEmConstrucao['batalhas'],
  cancelarRota: boolean,
  ajustes: AjustesDaBatalha,
  dispersaram: (porOrigem: Readonly<Record<string, number>>) => void,
  /**
   * Quem leva a batalha se nada mais separar os dois.
   *
   * Quem chama passa o lado que SEGURA O CHÃO: o dono da província, e na estrada — onde não
   * há chão de ninguém — o poder que vier primeiro por id, que é arbitrário mas nunca varia.
   */
  desempate: 'a' | 'b',
  /** Para onde um lado recua saindo daqui, ou `null` se estiver na última terra dele. */
  refugio: (provincia: string, poder: string) => string | null,
): boolean {
  // Sem lugar é encontro na estrada; com lugar é choque de campo. O assalto é o único que não
  // passa por aqui: ele é contra a muralha, não contra um exército.
  const tipo = provincia === null ? ('estrada' as const) : ('campo' as const);
  const totalA = ladoA.reduce((s, f) => s + soma(f.origem), 0);
  const totalB = ladoB.reduce((s, f) => s + soma(f.origem), 0);
  // O recuo é do LADO, e vem da ordem que cada força trouxe: se qualquer uma delas mandou
  // recuar, o lado inteiro recua junto — um exército não sai pela metade.
  const recuoDe = (forcas: readonly Forca[]): number | null => {
    const pedidos = forcas.map((f) => f.recuarAos).filter((x): x is number => x !== null);
    return pedidos.length > 0 ? Math.min(...pedidos) : null;
  };
  const r = resolverBatalha(
    { ...lado(totalA), recuaAos: recuoDe(ladoA) },
    { ...lado(totalB), recuaAos: recuoDe(ladoB) },
    ajustes,
    desempate,
  );

  const venceuA = r.vencedor === 'a';
  const vencedores = venceuA ? ladoA : ladoB;
  const perdedores = venceuA ? ladoB : ladoA;

  // ⚠️ **Ninguém desaparece do mundo.** Quem quebrou perde a HOSTE, não os homens: os que
  // escaparam da perseguição dispersam e voltam para a terra natal. É a mesma regra que a
  // milícia derrotada já seguia — e é ela que faz o recuo ordenado valer alguma coisa mais
  // adiante, porque sair antes de quebrar preserva o exército, não só a gente.
  const sobreviventes = venceuA ? r.sobreviventesA : r.sobreviventesB;
  reduzirLado(perdedores, venceuA ? r.sobreviventesB : r.sobreviventesA);
  if (r.desfecho === 'recuou') recolher(perdedores, provincia, refugio, dispersaram);
  else dispersar(perdedores, dispersaram);
  reduzirLado(vencedores, sobreviventes);
  if (cancelarRota) for (const f of vencedores) f.rota = [];

  batalhas.push({
    provincia,
    vencedor: vencedores[0]?.poder ?? null,
    perdedores: [...new Set(perdedores.map((f) => f.poder))].sort(),
    sobreviventes,
    lados: [
      { poder: ladoA[0]?.poder ?? 'ninguem', homens: totalA, aguento: 1 },
      { poder: ladoB[0]?.poder ?? 'ninguem', homens: totalB, aguento: 1 },
    ],
    rounds: r.rounds,
    desfecho: r.desfecho,
    tipo,
  });
  return true;
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

/** Manda para casa quem sobreviveu à quebra, e só então apaga a hoste. */
function dispersar(
  lado: readonly Forca[],
  dispersaram: (porOrigem: Readonly<Record<string, number>>) => void,
): void {
  for (const f of lado) {
    if (Object.keys(f.origem).length > 0) dispersaram(f.origem);
    f.viva = false;
    f.origem = {};
  }
}

/**
 * Quem saiu de campo ordenado: marcha para a terra vizinha, ou se desfaz se não houver uma.
 *
 * ⚠️ **É a última província que decide**, e é o que separa recuar de quebrar de verdade. Com
 * duas terras ligadas, o exército sobrevive inteiro e volta a lutar. Na última, ele acaba —
 * mas os homens voltam à população em vez de morrer na perseguição, e é isso que ainda faz
 * sair a tempo valer a pena.
 */
function recolher(
  lado: readonly Forca[],
  provincia: string | null,
  refugio: (provincia: string, poder: string) => string | null,
  dispersaram: (porOrigem: Readonly<Record<string, number>>) => void,
): void {
  for (const f of lado) {
    // Na estrada não existe província de onde sair: quem recua de um encontro volta ao lugar
    // de onde partiu naquele passo.
    const destino = provincia === null ? f.partiuDe : refugio(provincia, f.poder);
    if (destino === null || Object.keys(f.origem).length === 0) {
      if (Object.keys(f.origem).length > 0) dispersaram(f.origem);
      f.viva = false;
      f.origem = {};
      continue;
    }
    f.posicao = destino;
    f.rota = [];
  }
}
