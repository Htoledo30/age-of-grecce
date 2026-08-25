/**
 * Escolhe as fozes, sobe cada rio a montante e monta a hidrologia final do mapa.
 *
 * As fozes são escolhidas por vazão e espalhadas por uma distância mínima: sem isso, o
 * mesmo delta apareceria como três rios paralelos a poucos pixels um do outro.
 */

import type { Terreno } from '../pintar-terreno/terreno';
import { drenar, reduzirTerreno } from './drenagem';
import { DISTANCIA_MINIMA_FOZ, MAXIMO_RIOS, RESOLUCAO_DRENAGEM, VAZAO_MINIMA_FOZ } from './malha';
import type { Hidrologia, Ponto, Rio } from './malha';
import { distanciaQuadrada, simplificar, suavizar, tocaMoldura, tracarMontante } from './tracado';

export function gerarHidrologia(terreno: Terreno, tamanhoMundo: number): Hidrologia {
  const { terra, altitude } = reduzirTerreno(terreno);
  const { jusante, saidaMar, acumulacao } = drenar(terra, altitude);
  const lado = RESOLUCAO_DRENAGEM;

  const melhorMontante = new Int32Array(terra.length);
  melhorMontante.fill(-1);
  for (let i = 0; i < terra.length; i++) {
    const destino = jusante[i]!;
    if (destino < 0) continue;
    const atual = melhorMontante[destino]!;
    if (atual < 0 || acumulacao[i]! > acumulacao[atual]!) melhorMontante[destino] = i;
  }

  const candidatos: number[] = [];
  for (let i = 0; i < terra.length; i++) {
    const x = i % lado;
    const y = (i / lado) | 0;
    const longeDaMoldura = x >= 8 && y >= 8 && x < lado - 8 && y < lado - 8;
    if (longeDaMoldura && jusante[i] === -1 && acumulacao[i]! >= VAZAO_MINIMA_FOZ) {
      candidatos.push(i);
    }
  }
  candidatos.sort((a, b) => acumulacao[b]! - acumulacao[a]!);

  const escolhidos: number[] = [];
  for (const candidato of candidatos) {
    const trajeto = tracarMontante(candidato, melhorMontante, acumulacao);
    if (trajeto.length < 14 || tocaMoldura(trajeto, lado)) continue;
    if (
      escolhidos.every(
        (outro) => distanciaQuadrada(candidato, outro, lado) >= DISTANCIA_MINIMA_FOZ ** 2,
      )
    ) {
      escolhidos.push(candidato);
    }
    if (escolhidos.length >= MAXIMO_RIOS) break;
  }

  const escala = tamanhoMundo / lado;
  const rios: Rio[] = [];
  for (const foz of escolhidos) {
    const celulas = tracarMontante(foz, melhorMontante, acumulacao);
    celulas.reverse();
    const pontos = celulas.map<Ponto>((i) => [
      ((i % lado) + 0.5) * escala,
      (((i / lado) | 0) + 0.5) * escala,
    ]);

    // Termina no meio da aresta entre a última célula de terra e o mar.
    const mar = saidaMar[foz]!;
    if (mar >= 0) {
      const mx = ((mar % lado) + 0.5) * escala;
      const my = (((mar / lado) | 0) + 0.5) * escala;
      const ultimo = pontos.at(-1)!;
      pontos.push([(ultimo[0] + mx) / 2, (ultimo[1] + my) / 2]);
    }

    const vazao = acumulacao[foz]!;
    rios.push({
      pontos: suavizar(simplificar(pontos, escala * 0.85), 2),
      vazao: Math.round(vazao),
      largura: Math.min(3.2, 1.15 + Math.log2(vazao / VAZAO_MINIMA_FOZ + 1) * 0.58),
    });
  }

  return {
    versao: 1,
    resolucaoCalculo: RESOLUCAO_DRENAGEM,
    rios,
    // A geografia egeia pede rios curtos; não forçamos lagos onde o relevo não os sustenta.
    lagoas: [],
  };
}

