/**
 * A ÁGUA DO ARQUIPÉLAGO: um punhado de ilhotas vira **um território**.
 *
 * Henrique, olhando o mapa: *"as ilhas dançam em cima de várias áreas do mar (...) atualmente
 * elas parecem mais fragmentos do que reinos"*. Medido, ele estava certo e o número é feio:
 * as Cíclades Ocidentais são 7 cacos que preenchem **3,3%** da caixa em que vivem; as Centrais
 * são 10 cacos em 13,2%. Para efeito de comparação, Atenas preenche 40,8% da dela. Um reino
 * assim não se lê, não se clica e não se defende — ele é confete.
 *
 * A saída não é mentir sobre a costa. É dizer o que já era verdade: **o mar entre as ilhas de
 * um arquipélago é do arquipélago.** A província passa a reivindicar um anel de água em volta
 * das ilhas dela, os anéis se encontram, e o grupo inteiro vira uma mancha só, com borda
 * própria. O terreno continua desenhando água ali — o que muda é de quem ela é. É o mesmo que
 * a fronteira de uma cidade faz no Civilization com as casas de oceano em volta.
 *
 * ## As duas medidas, e por que elas são duas
 *
 * **O raio** (`aguaDoArquipelago`, em km) diz até onde a província alcança. Medido no recorte
 * real: com 15 km os cinco arquipélagos do mapa viram UM caco cada; com 8 km as Cíclades do
 * Norte ainda ficam em quatro pedaços.
 *
 * ⚠️ **A folga é a peça que impede isto de virar uma mudança de REGRA.** Sem ela, a
 * reivindicação de um arquipélago encosta na do vizinho — e duas províncias que se encostam
 * são vizinhas por terra: um exército andaria da Eubeia até Andros sem Porto e sem embarcar,
 * porque o mapa passaria a dizer que dá. Com a folga, **sempre sobra um canal de mar aberto**
 * entre dois territórios: nenhuma vizinhança nova nasce, o Porto continua sendo a única porta
 * do mar, e esta etapa fica sendo só o que ela promete ser — desenho.
 *
 * ## O formato
 *
 * Dilatar e depois erodir (um FECHAMENTO) em vez de só dilatar: a dilatação pura devolve uma
 * união de discos, com cara de bolha; o fechamento fecha os vãos entre as ilhas e devolve o
 * contorno para perto delas. O resultado abraça o grupo em vez de o embalar.
 */

import type { Grade } from './grade';
import { KM_POR_UNIDADE } from './grade';
import type { SementePlantada } from './sementes';

/**
 * O canal de mar que SEMPRE sobra entre dois territórios, em km.
 *
 * ⚠️ Não é folga de desenho: é o que garante que esta etapa não crie vizinhança nova. Ver o
 * cabeçalho. Baixar isto a zero transforma um passo de pintura numa mudança de regra de
 * movimento, silenciosamente.
 */
const KM_DO_CANAL = 4;

/** Quanto o fechamento aperta de volta, em fração do raio. Puro gosto de contorno. */
const APERTO = 0.6;

/** Pesos do chanfro 5-7: aproximam a distância euclidiana com dois passes de varredura. */
const RETO = 5;
const DIAGONAL = 7;
const LONGE = 0x3fffffff;

export function reivindicarAguaDosArquipelagos(
  grade: Grade,
  dono: Uint16Array,
  sementes: readonly SementePlantada[],
): void {
  const comAgua = sementes.filter((s) => (s.semente.aguaDoArquipelago ?? 0) > 0);
  if (comAgua.length === 0) return;

  const { largura: L, altura: A, celulas } = grade;
  const kmPorPixel = grade.unidadesPorPixel * KM_POR_UNIDADE;
  const canal = Math.round((KM_DO_CANAL / kmPorPixel) * RETO);

  // A terra inteira, uma vez só: cada arquipélago só precisa tirar as ilhas DELE desta conta.
  const ehTerra = new Uint8Array(celulas);
  for (let i = 0; i < celulas; i++) ehTerra[i] = grade.custo[i]! > 0 ? 1 : 0;

  let total = 0;
  for (const { semente, indice } of comAgua) {
    const raioKm = semente.aguaDoArquipelago!;
    const raio = Math.round((raioKm / kmPorPixel) * RETO);
    const aperto = Math.round(raio * APERTO);

    const minhas = new Uint8Array(celulas);
    let ilhas = 0;
    for (let i = 0; i < celulas; i++) {
      if (dono[i] === indice) {
        minhas[i] = 1;
        ilhas++;
      }
    }
    if (ilhas === 0) throw new Error(`${semente.nome} não tem uma ilha sequer no mapa`);

    // 1. até onde eu alcanço, 2. onde o fechamento aperta de volta, 3. de quem é a terra
    //    mais próxima que NÃO é minha — as três distâncias que decidem cada pixel.
    const daMinhaIlha = chanfro(L, A, minhas);
    const dilatado = new Uint8Array(celulas);
    for (let i = 0; i < celulas; i++) dilatado[i] = daMinhaIlha[i]! <= raio ? 0 : 1;
    const deForaDoDilatado = chanfro(L, A, dilatado);

    const outraTerra = new Uint8Array(celulas);
    for (let i = 0; i < celulas; i++) outraTerra[i] = ehTerra[i] === 1 && minhas[i] === 0 ? 1 : 0;
    const daOutraTerra = chanfro(L, A, outraTerra);

    let tomados = 0;
    for (let i = 0; i < celulas; i++) {
      if (dono[i] !== 0 || ehTerra[i] === 1) continue;
      if (daMinhaIlha[i]! > raio) continue;
      // fechamento: o pixel sobrevive se estiver a mais de `aperto` da borda do dilatado
      if (deForaDoDilatado[i]! <= aperto) continue;
      // e o canal: tem de ser MEU com folga, senão fica água de ninguém
      if (daMinhaIlha[i]! + canal > daOutraTerra[i]!) continue;
      dono[i] = indice;
      tomados++;
    }
    total += tomados;
    console.log(
      `  ${semente.nome}: ${ilhas} px de ilha + ${tomados} px de água ` +
        `(raio ${raioKm} km, canal ${KM_DO_CANAL} km)`,
    );
  }
  console.log(
    `água do arquipélago: ${total} pixels ` +
      `(${(total * grade.km2PorPixel).toFixed(0)} km²) em ${comAgua.length} províncias`,
  );
}

/**
 * Distância até o pixel marcado mais próximo, pelo chanfro 5-7.
 *
 * Dois passes de varredura sobre a imagem inteira, e nada de fila: é O(pixels) com constante
 * pequena, e o erro contra a euclidiana verdadeira fica abaixo de 2% — bem menos do que o
 * tamanho de um pixel importa aqui. Uma dilatação por rodadas custaria `raio` passadas.
 *
 * ⚠️ **A distância NÃO desvia da terra.** Ela é geométrica, em linha reta: um arquipélago
 * poderia, em tese, reivindicar água do outro lado de uma ilha alheia. Quem impede é o canal
 * — ao lado da ilha alheia a distância até ela é zero, e a condição do canal falha ali e em
 * volta. Duas regras simples que se cobrem valem mais que uma distância geodésica.
 */
function chanfro(L: number, A: number, semente: Uint8Array): Int32Array {
  const d = new Int32Array(L * A);
  for (let i = 0; i < d.length; i++) d[i] = semente[i] === 1 ? 0 : LONGE;

  for (let y = 0; y < A; y++) {
    for (let x = 0; x < L; x++) {
      const i = y * L + x;
      let v = d[i]!;
      if (v === 0) continue;
      if (y > 0) {
        if (x > 0) v = Math.min(v, d[i - L - 1]! + DIAGONAL);
        v = Math.min(v, d[i - L]! + RETO);
        if (x + 1 < L) v = Math.min(v, d[i - L + 1]! + DIAGONAL);
      }
      if (x > 0) v = Math.min(v, d[i - 1]! + RETO);
      d[i] = v;
    }
  }
  for (let y = A - 1; y >= 0; y--) {
    for (let x = L - 1; x >= 0; x--) {
      const i = y * L + x;
      let v = d[i]!;
      if (v === 0) continue;
      if (y + 1 < A) {
        if (x + 1 < L) v = Math.min(v, d[i + L + 1]! + DIAGONAL);
        v = Math.min(v, d[i + L]! + RETO);
        if (x > 0) v = Math.min(v, d[i + L - 1]! + DIAGONAL);
      }
      if (x + 1 < L) v = Math.min(v, d[i + 1]! + RETO);
      d[i] = v;
    }
  }
  return d;
}
