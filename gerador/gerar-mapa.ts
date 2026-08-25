/**
 * Gera o mapa FIXO do jogo a partir da costa real da Grécia antiga.
 *
 * O resultado é salvo em `assets/mundo` e carregado pelo jogo como qualquer arte. **Nada é
 * gerado durante uma partida** — ruído serve somente como textura visual.
 *
 * Este arquivo é o ROTEIRO. Cada etapa vive num módulo ao lado: a moldura e a projeção, a
 * geometria dos anéis, a costa, os SVG e a escrita das imagens.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { gerarHidrologia } from './hidrologia/gerar-hidrologia';
import { pintarHidrologia } from './hidrologia/pintar-hidrologia';
import { espalharDetalhes } from './pintar-terreno/detalhes';
import { pintarTerreno } from './pintar-terreno/pintar-terreno';
import { BIOMAS } from './pintar-terreno/terreno';
import { carregarCosta, carregarRecortes, extrairAneis, inventario } from './gerar-mapa/costa';
import {
  ALTURA_MAPA,
  LIMITES,
  MARGEM,
  PASTA_SAIDA,
  RESOLUCAO_ALTURA,
  RESOLUCAO_TERRENO,
  TAMANHO,
  conferirProporcao,
} from './gerar-mapa/moldura';
import { caminho } from './gerar-mapa/geometria';
import {
  bloquearHidrologia,
  escreverPng,
  longeDosRios,
  recortarRgba,
} from './gerar-mapa/saida';
import { svgMapa, svgNavegacao } from './gerar-mapa/svg';

async function main(): Promise<void> {
  conferirProporcao();
  const dados = await carregarCosta();
  const aneis = extrairAneis(dados);
  const costa = aneis.map(caminho).join(' ');
  mkdirSync(PASTA_SAIDA, { recursive: true });
  writeFileSync(resolve(PASTA_SAIDA, 'mapa.svg'), svgMapa(costa));
  writeFileSync(resolve(PASTA_SAIDA, 'navegacao.svg'), svgNavegacao(costa));
  writeFileSync(
    resolve(PASTA_SAIDA, 'mapa.json'),
    JSON.stringify(
      {
        versao: 1,
        fixo: true,
        dimensoes: { largura: TAMANHO, altura: ALTURA_MAPA },
        resolucaoTerreno: RESOLUCAO_TERRENO,
        regiaoReferencia: 'Mundo grego: de Corcira a Sardes, da Macedonia a Creta',
        limitesReferencia: LIMITES,
        fonteCosta: 'Natural Earth 1:10m (dominio publico)',
        arquivosDeDados: {
          navegacao: 'navegacao.png',
          biomas: 'biomas.png',
          altitudeVisual: 'altitude.png',
          altitudeLinear: 'altitude.f32',
          hidrologia: 'hidrologia.json',
        },
      },
      null,
      2,
    ) + '\n',
  );
  console.log(`mapa fixo gerado: ${aneis.length} contornos em ${PASTA_SAIDA}`);

  console.log('pintando o terreno...');
  const terreno = pintarTerreno(aneis, RESOLUCAO_TERRENO, TAMANHO, carregarRecortes());
  const hidrologia = gerarHidrologia(terreno, TAMANHO);
  // Se um curso depender da parte recortada, ele some inteiro em vez de morrer na borda.
  hidrologia.rios = hidrologia.rios.filter((rio) =>
    rio.pontos.every(([, y]) => y < ALTURA_MAPA - MARGEM),
  );
  hidrologia.lagoas = hidrologia.lagoas.filter((lagoa) =>
    lagoa.contorno.every(([, y]) => y < ALTURA_MAPA - MARGEM),
  );
  pintarHidrologia(terreno, hidrologia, TAMANHO);
  writeFileSync(
    resolve(PASTA_SAIDA, 'hidrologia.json'),
    JSON.stringify({
      ...hidrologia,
      rios: hidrologia.rios.map((rio) => ({
        ...rio,
        pontos: rio.pontos.map(([x, y]) => [Math.round(x), Math.round(y)]),
      })),
    }) + '\n',
  );
  escreverPng(
    resolve(PASTA_SAIDA, 'terreno.png'),
    recortarRgba(terreno.pixels),
    RESOLUCAO_TERRENO,
    RESOLUCAO_ALTURA,
  );
  console.log(
    `hidrologia calculada: ${hidrologia.rios.length} rios, ${hidrologia.lagoas.length} lagoas`,
  );

  // A parede invisivel nasce da mesma rasterizacao que pintou a costa. Assim nao existe
  // uma segunda linha, ligeiramente deslocada, disputando onde terra e mar comecam.
  const dadosNavegacao = new Uint8Array(terreno.terra.length * 4);
  for (let i = 0; i < terreno.terra.length; i++) {
    const valor = terreno.terra[i] ? 255 : 0;
    dadosNavegacao[i * 4] = valor;
    dadosNavegacao[i * 4 + 1] = valor;
    dadosNavegacao[i * 4 + 2] = valor;
    dadosNavegacao[i * 4 + 3] = 255;
  }
  // Rio é parede: quem quiser atravessar dá a volta ou usa uma travessia. As travessias
  // NÃO são abertas aqui — ficam em dados/travessias.json e o jogo as aplica em tempo de
  // execução, pra mover uma ponte não exigir regerar o mapa inteiro.
  bloquearHidrologia(dadosNavegacao, hidrologia, RESOLUCAO_TERRENO, TAMANHO);

  escreverPng(
    resolve(PASTA_SAIDA, 'navegacao.png'),
    recortarRgba(dadosNavegacao),
    RESOLUCAO_TERRENO,
    RESOLUCAO_ALTURA,
  );

  // mapa de dados: o índice do bioma vai no canal vermelho, pra o jogo ler depois
  const dadosBioma = new Uint8Array(terreno.biomas.length * 4);
  for (let i = 0; i < terreno.biomas.length; i++) {
    dadosBioma[i * 4] = terreno.biomas[i]!;
    dadosBioma[i * 4 + 3] = 255;
  }
  escreverPng(
    resolve(PASTA_SAIDA, 'biomas.png'),
    recortarRgba(dadosBioma),
    RESOLUCAO_TERRENO,
    RESOLUCAO_ALTURA,
  );

  // Fonte de verdade para hidrologia futura. O PNG e util para inspecao humana; o F32
  // conserva a precisao necessaria para calcular encostas, bacias e cursos de rios.
  const altitudeVisual = new Uint8Array(terreno.altitude.length * 4);
  for (let i = 0; i < terreno.altitude.length; i++) {
    const valor = Math.round(Math.max(0, Math.min(1, terreno.altitude[i]!)) * 255);
    altitudeVisual[i * 4] = valor;
    altitudeVisual[i * 4 + 1] = valor;
    altitudeVisual[i * 4 + 2] = valor;
    altitudeVisual[i * 4 + 3] = 255;
  }
  escreverPng(
    resolve(PASTA_SAIDA, 'altitude.png'),
    recortarRgba(altitudeVisual),
    RESOLUCAO_TERRENO,
    RESOLUCAO_ALTURA,
  );
  writeFileSync(
    resolve(PASTA_SAIDA, 'altitude.f32'),
    Buffer.from(
      terreno.altitude.buffer,
      terreno.altitude.byteOffset,
      RESOLUCAO_TERRENO * RESOLUCAO_ALTURA * Float32Array.BYTES_PER_ELEMENT,
    ),
  );
  console.log(`terreno pintado em ${RESOLUCAO_TERRENO}px — biomas: ${BIOMAS.join(', ')}`);

  const detalhes = espalharDetalhes(terreno, TAMANHO);
  detalhes.arvores = detalhes.arvores.filter(
    ([x, y]) => y < ALTURA_MAPA && longeDosRios(x, y, hidrologia),
  );
  writeFileSync(
    resolve(PASTA_SAIDA, 'detalhes.json'),
    JSON.stringify({ versao: 1, ...detalhes }) + '\n',
  );
  console.log(
    `detalhes espalhados: ${detalhes.arvores.length} arvores, ${detalhes.rochas.length} rochas`,
  );

  inventario(aneis, 25);
}

await main();
