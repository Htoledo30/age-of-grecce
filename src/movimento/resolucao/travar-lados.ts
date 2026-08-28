/**
 * Um choque entre dois LADOS, cada um podendo ter várias forças no mesmo lugar.
 *
 * O perdedor some inteiro; o vencedor encolhe proporcionalmente em todas as suas forças.
 * Encolher proporcionalmente e não "a primeira da lista" é o que impede a ordem das chegadas
 * de virar uma regra escondida.
 */

import { resolverBatalha } from '@/combate/batalha';
import { porArma, valorEmCampo } from '@/combate/composicao';
import type { Ajustes } from '@/dados/esquema';
import { retirar, terrasDe } from '@/combate/exercito';
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
  const totalA = ladoA.reduce((s, f) => s + soma(f.contingentes), 0);
  const totalB = ladoB.reduce((s, f) => s + soma(f.contingentes), 0);
  // O recuo é do LADO, e vem da ordem que cada força trouxe: se qualquer uma delas mandou
  // recuar, o lado inteiro recua junto — um exército não sai pela metade.
  const recuoDe = (forcas: readonly Forca[]): number | null => {
    const pedidos = forcas.map((f) => f.recuarAos).filter((x): x is number => x !== null);
    return pedidos.length > 0 ? Math.min(...pedidos) : null;
  };
  // ⚠️ **As armas dos DOIS lados entram juntas**, e não uma de cada vez: o counter é
  // relativo, e o que um exército vale depende de quem está na frente dele. Trezentos
  // hoplitas valem uma coisa contra cavalaria e outra contra arqueiro, e é isso que faz
  // olhar o inimigo antes de marchar ser uma decisão.
  const armasA = ladoA.flatMap((f) => f.contingentes);
  const armasB = ladoB.flatMap((f) => f.contingentes);
  const valorA = valorEmCampo(armasA, armasB, ajustes);
  const valorB = valorEmCampo(armasB, armasA, ajustes);
  // ⚠️ **A composição é fotografada AGORA, antes de qualquer baixa.** `armasA` guarda as
  // referências dos contingentes, e `reduzirLado` mexe nos homens deles lá embaixo — chamar
  // `porArma` depois contava SOBREVIVENTES e chamava isso de ordem de batalha. Era o defeito
  // que Henrique achou jogando: a janela dizia que ele tinha 308 homens numa hoste de 3.000,
  // e 308 era o que ia sobrar no fim. Ele procurou esses homens no mapa, achou o marcador do
  // inimigo, e concluiu que os soldados dele tinham virado de Argos.
  const composicaoA = porArma(armasA);
  const composicaoB = porArma(armasB);
  const r = resolverBatalha(
    { ...valorA, recuaAos: recuoDe(ladoA) },
    { ...valorB, recuaAos: recuoDe(ladoB) },
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
  // Quem SAIU de campo — por ordem ou por ter sido barrado — continua sendo um exército e
  // marcha para a terra vizinha. Só quem QUEBROU se desfaz.
  if (r.desfecho === 'quebrou') dispersar(perdedores, dispersaram);
  else recolher(perdedores, provincia, refugio, dispersaram);
  reduzirLado(vencedores, sobreviventes);
  if (cancelarRota) for (const f of vencedores) f.rota = [];

  batalhas.push({
    provincia,
    vencedor: vencedores[0]?.poder ?? null,
    perdedores: [...new Set(perdedores.map((f) => f.poder))].sort(),
    sobreviventes,
    lados: [
      { poder: ladoA[0]?.poder ?? 'ninguem', homens: totalA, aguento: 1, composicao: composicaoA },
      { poder: ladoB[0]?.poder ?? 'ninguem', homens: totalB, aguento: 1, composicao: composicaoB },
    ],
    rounds: r.rounds,
    desfecho: r.desfecho,
    tipo,
  });
  return true;
}

/**
 * Encolhe um lado até `alvo` homens, proporcionalmente entre as forças E dentro de cada uma.
 *
 * ⚠️ **Duas proporções, e as duas importam.** Entre as forças, para a ordem das chegadas não
 * virar regra escondida; e DENTRO de cada força, entre os contingentes, para uma derrota não
 * comer a cavalaria inteira e deixar os leves intactos por acidente de índice. A segunda o
 * `retirar` já faz — por isso ele é reaproveitado força a força em vez de reimplementado.
 */
function reduzirLado(lado: readonly Forca[], alvo: number): void {
  const total = lado.reduce((s, f) => s + soma(f.contingentes), 0);
  if (total <= alvo || total === 0) return;

  const aPerder = total - alvo;
  const perdas = lado.map((f) => Math.floor((soma(f.contingentes) * aPerder) / total));
  // O resto do arredondamento vai nas maiores forças, uma baixa por vez, pra soma fechar
  // exata: sobra aqui viraria homem sumido ou homem inventado.
  let resto = aPerder - perdas.reduce((s, x) => s + x, 0);
  while (resto > 0) {
    let escolhida = -1;
    let maior = 0;
    for (const [i, f] of lado.entries()) {
      const sobra = soma(f.contingentes) - (perdas[i] ?? 0);
      if (sobra > maior) {
        maior = sobra;
        escolhida = i;
      }
    }
    if (escolhida < 0) break;
    perdas[escolhida] = (perdas[escolhida] ?? 0) + 1;
    resto -= 1;
  }

  for (const [i, f] of lado.entries()) {
    const caixa = { id: 'provisorio', poder: f.poder, posicao: f.posicao, contingentes: f.contingentes };
    retirar(caixa, perdas[i] ?? 0);
    f.contingentes = caixa.contingentes;
    if (soma(f.contingentes) === 0) f.viva = false;
  }
}

/** Manda para casa quem sobreviveu à quebra, e só então apaga a hoste. */
function dispersar(
  lado: readonly Forca[],
  dispersaram: (porOrigem: Readonly<Record<string, number>>) => void,
): void {
  for (const f of lado) {
    if (f.contingentes.length > 0) dispersaram(terrasDe(f.contingentes));
    f.viva = false;
    f.contingentes = [];
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
    if (destino === null || f.contingentes.length === 0) {
      if (f.contingentes.length > 0) dispersaram(terrasDe(f.contingentes));
      f.viva = false;
      f.contingentes = [];
      continue;
    }
    f.posicao = destino;
    f.rota = [];
  }
}
