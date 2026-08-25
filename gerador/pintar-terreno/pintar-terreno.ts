/**
 * Pinta o terreno do mapa-múndi: junta cordilheiras, ruído e máscara numa imagem só.
 *
 * Nada disso roda em partida. É arte assada uma vez, aqui.
 */

import { amostrar, borrar, campo, campoCrista } from './campos';
import { campoCordilheiras } from './cordilheiras';
import { distanciaDaCosta, esculpirMar, limparIstmos, rasterizarTerra } from './mascara';
import { COR, INDICE } from './terreno';
import type { Anel, Terreno } from './terreno';

export function pintarTerreno(
  aneis: Anel[],
  resolucao: number,
  tamanhoMundo: number,
  recortes: readonly Anel[] = [],
): Terreno {
  const LADO_CAMPO = 2048;
  // A limpeza de istmos vem ANTES do recorte autoral: fechar canais estreitos poderia
  // refechar justamente o estreito que a gente abriu de propósito.
  const terra = esculpirMar(
    limparIstmos(rasterizarTerra(aneis, resolucao, tamanhoMundo), resolucao),
    recortes,
    resolucao,
    tamanhoMundo,
  );
  const distancia = distanciaDaCosta(terra, resolucao);

  const cristas = campoCrista(LADO_CAMPO, 7, 20_260_817);
  const estrutura = campoCordilheiras(768);
  const rugosidade = campo(LADO_CAMPO, 5, 26, 991);
  const umidade = campo(LADO_CAMPO, 4, 11, 5_501);
  const grao = campo(LADO_CAMPO, 3, 46, 77);
  /** Alta frequência: quebra a borda da mata pra não virar mancha recortada de mapa político. */
  const folhagem = campo(LADO_CAMPO, 4, 62, 4_242);

  // altitude só existe em terra, e cresce conforme a costa fica pra trás
  const altitude = new Float32Array(resolucao * resolucao);
  const PIXEIS_ATE_INTERIOR = resolucao * 0.055;
  for (let i = 0; i < altitude.length; i++) {
    if (!terra[i]) continue;
    const x = i % resolucao;
    const y = (i / resolucao) | 0;
    const u = x / resolucao;
    const v = y / resolucao;
    const interior = Math.min(1, distancia[i]! / PIXEIS_ATE_INTERIOR);
    const crista = amostrar(cristas, LADO_CAMPO, u, v);
    const aspereza = amostrar(rugosidade, LADO_CAMPO, u, v);
    const espinha = amostrar(estrutura, 768, u, v);
    // a serra só ganha corpo longe do mar; litoral é baixo por construção
    const serras = espinha * (0.42 + crista * 0.48);
    const colinas = Math.max(0, crista * 0.43 + aspereza * 0.25 - 0.3);
    altitude[i] = Math.max(0, Math.min(1, interior * (serras + colinas)));
  }

  // tira os degraus do campo de distancia antes do sombreamento morder a derivada
  const altitudeLisa = borrar(altitude, resolucao, 5);

  const pixels = new Uint8Array(resolucao * resolucao * 4);
  const biomas = new Uint8Array(resolucao * resolucao);

  const iMar = INDICE.get('mar-fundo')!;
  const iRaso = INDICE.get('mar-raso')!;
  const iPraia = INDICE.get('praia')!;
  const iPlanicie = INDICE.get('planicie')!;
  const iColina = INDICE.get('colina')!;
  const iMontanha = INDICE.get('montanha')!;
  const iEstepe = INDICE.get('estepe')!;
  const iFloresta = INDICE.get('floresta')!;
  const iPico = INDICE.get('pico')!;

  for (let y = 0; y < resolucao; y++) {
    for (let x = 0; x < resolucao; x++) {
      const i = y * resolucao + x;
      const d = distancia[i]!;
      const u = x / resolucao;
      const v = y / resolucao;

      let bioma: number;
      let r: number;
      let g: number;
      let b: number;

      if (!terra[i]) {
        // profundidade contínua: o mar escurece conforme se afasta da costa
        const fundura = Math.min(1, -d / (resolucao * 0.013));
        const raso = COR['mar-raso'];
        const fundo = COR['mar-fundo'];
        r = raso[0] + (fundo[0] - raso[0]) * fundura;
        g = raso[1] + (fundo[1] - raso[1]) * fundura;
        b = raso[2] + (fundo[2] - raso[2]) * fundura;
        bioma = fundura < 0.35 ? iRaso : iMar;
      } else {
        const h = altitude[i]!;
        const detalhe = amostrar(folhagem, LADO_CAMPO, u, v) - 0.5;
        const espinha = amostrar(estrutura, 768, u, v);
        const ruidoUmidade = amostrar(umidade, LADO_CAMPO, u, v);
        // Norte e oeste recebem mais chuva; o sul, o leste e o sotavento são mais secos.
        const molhado =
          ruidoUmidade * 0.58 +
          (1 - v) * 0.15 +
          (1 - u) * 0.07 +
          0.1 +
          detalhe * 0.06 -
          espinha * Math.max(0, u - 0.42) * 0.06;
        const praia = 1 - Math.min(1, d / (resolucao * 0.0026));

        if (h > 0.72) bioma = iPico;
        else if (h > 0.52) bioma = iMontanha;
        else if (h > 0.33) bioma = iColina;
        else if (molhado > 0.52) bioma = iFloresta;
        else if (molhado > 0.44) bioma = iPlanicie;
        else bioma = iEstepe;

        // cor de base: seco → úmido, sem degrau
        const seco = COR.estepe;
        const verde = COR.planicie;
        const gramado = Math.max(0, Math.min(1, (molhado - 0.4) / 0.14));
        r = seco[0] + (verde[0] - seco[0]) * gramado;
        g = seco[1] + (verde[1] - seco[1]) * gramado;
        b = seco[2] + (verde[2] - seco[2]) * gramado;

        // mata entra por cima, com transição macia — textura, não polígono
        const mata = Math.max(0, Math.min(1, (molhado - 0.5) / 0.13)) * (1 - praia);
        if (mata > 0) {
          const f = COR.floresta;
          const peso = mata * 0.82;
          r += (f[0] - r) * peso;
          g += (f[1] - g) * peso;
          b += (f[2] - b) * peso;
        }

        // rocha sobe conforme a altitude, também sem degrau
        const pedra = Math.max(0, Math.min(1, (h - 0.3) / 0.3));
        if (pedra > 0) {
          const m = h > 0.66 ? COR.pico : COR.montanha;
          r += (m[0] - r) * pedra;
          g += (m[1] - g) * pedra;
          b += (m[2] - b) * pedra;
        }

        // faixa de praia
        if (praia > 0) {
          const p = COR.praia;
          if (bioma !== iPico && bioma !== iMontanha) bioma = iPraia;
          r += (p[0] - r) * praia * 0.6;
          g += (p[1] - g) * praia * 0.6;
          b += (p[2] - b) * praia * 0.6;
        }
      }
      biomas[i] = bioma;

      // sombreamento de relevo: luz vindo do noroeste. É o que faz a serra existir.
      if (terra[i] && x > 0 && y > 0) {
        const dx = altitudeLisa[i]! - altitudeLisa[i - 1]!;
        const dy = altitudeLisa[i]! - altitudeLisa[i - resolucao]!;
        const luz = 1 + (dx + dy) * 26;
        const fator = Math.max(0.62, Math.min(1.34, luz));
        r *= fator;
        g *= fator;
        b *= fator;
      }

      // linha de tinta da costa
      const tinta = 1 - Math.min(1, Math.abs(d) / 2.2);
      if (tinta > 0) {
        r += (58 - r) * tinta;
        g += (50 - g) * tinta;
        b += (39 - b) * tinta;
      }

      // grão de papel por cima de tudo, unificando
      const papel = 0.97 + amostrar(grao, LADO_CAMPO, u, v) * 0.06;
      r *= papel;
      g *= papel;
      b *= papel;

      const p = i * 4;
      pixels[p] = Math.max(0, Math.min(255, r));
      pixels[p + 1] = Math.max(0, Math.min(255, g));
      pixels[p + 2] = Math.max(0, Math.min(255, b));
      pixels[p + 3] = 255;
    }
  }

  return { pixels, biomas, terra, altitude: altitudeLisa, resolucao };
}

