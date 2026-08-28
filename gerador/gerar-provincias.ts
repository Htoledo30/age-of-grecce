/**
 * Recorta o mundo em províncias.
 *
 * Ferramenta de autoria: roda na mão, nada disso acontece durante uma partida.
 *
 * O método, em uma frase: **cada província cresce da sua semente até esbarrar na vizinha, e
 * subir serra custa caro.** A semente é um lugar real — Atenas, Tebas, Sardes — em longitude
 * e latitude de verdade, escrita em `dados/provincias.json`. O resultado não é uma grade nem
 * um sorteio: é território, e a fronteira cai onde o terreno dificulta a passagem, que é onde
 * ela caía de verdade.
 *
 * Este arquivo é o ROTEIRO; cada etapa vive num módulo em `gerar-provincias/`.
 *
 * uso:  npx tsx --max-old-space-size=8192 gerador/gerar-provincias.ts
 * saída: assets/mundo/provincias.png   índice da província em cada pixel
 *        assets/mundo/provincias.json  nome, dono, centro, área e vizinhas
 */

import { reivindicarAguaDosArquipelagos } from './gerar-provincias/agua-do-arquipelago';
import { anexarIlhas } from './gerar-provincias/anexos';
import { crescerProvincias } from './gerar-provincias/crescer';
import { escreverProvincias, resumir } from './gerar-provincias/escrever';
import { carregarGrade } from './gerar-provincias/grade';
import { medirProvincias } from './gerar-provincias/medir';
import { acharOrfas, relatarOrfas } from './gerar-provincias/orfas';
import { plantarSementes } from './gerar-provincias/sementes';

/**
 * `--sugerir` não escreve mapa nenhum: só lista as ilhas órfãs com a província mais próxima,
 * em JSON pronto pra colar. A sugestão é apenas um ponto de partida para revisão humana,
 * nunca uma decisão automática.
 */
const SUGERIR = process.argv.includes('--sugerir');

const grade = carregarGrade();
const sementes = plantarSementes(grade);
const dono = crescerProvincias(grade, sementes);
anexarIlhas(grade, dono, sementes);
// ⚠️ Depois de anexar e ANTES de medir: a água reivindicada é território, então ela tem de
// entrar na área, no centro e na vizinhança como qualquer pixel de chão. Medir antes daria um
// centro no meio de uma ilhota e um arquipélago com a área de sete cacos.
reivindicarAguaDosArquipelagos(grade, dono, sementes);
relatarOrfas(grade, dono, sementes, acharOrfas(grade, dono), SUGERIR);

const provincias = medirProvincias(grade, dono, sementes);

if (SUGERIR) {
  console.log('\nmodo sugestão: nada foi gravado.');
  process.exit(0);
}

escreverProvincias(grade, dono, provincias);
resumir(grade, provincias);
