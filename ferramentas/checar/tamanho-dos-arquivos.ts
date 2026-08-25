/**
 * A trava contra o arquivo-deus.
 *
 * Duas vezes este projeto deixou um arquivo crescer até virar o lugar onde tudo mora —
 * `campanha.ts` chegou a 1.942 linhas e `main.ts` a 1.259 — e nas duas vezes o sintoma foi o
 * mesmo: regra nova entrava ali porque ali já tinha tudo à mão, e cada nova entrada tornava a
 * seguinte mais fácil. **Ninguém decidiu criar um arquivo-deus; ele se formou por comodidade,
 * uma função de cada vez.** Uma trava automática é o que troca essa comodidade por um empurrão
 * na direção certa: passou do teto, o arquivo pede uma pasta com um arquivo por assunto.
 *
 * Dois degraus, de propósito:
 *
 * - **aviso** a partir de {@link AVISO} linhas: ainda passa, mas já é hora de olhar;
 * - **falha** a partir de {@link FALHA} linhas: `npm run verificar` reprova.
 *
 * E um terceiro, mais apertado, para as FACHADAS: `main.ts` e `campanha.ts` já foram os dois
 * arquivos-deus, e a regra combinada com Henrique é que eles não voltam a receber regra
 * nenhuma. Teto próprio é a forma de escrever isso no código em vez de na memória.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { reclamar } from './problemas';

const PASTAS = ['src', 'ferramentas', 'gerador', 'testes'];
const EXTENSOES = ['.ts', '.css'];

/** A partir daqui o arquivo é grande o bastante para merecer uma olhada. */
const AVISO = 300;
/** A partir daqui ele reprova a verificação. */
const FALHA = 400;

/**
 * Tetos próprios: são fachadas e índices, não lugares de regra.
 *
 * Se um destes estourar, a resposta certa quase nunca é levantar o número — é levar a regra
 * nova para o módulo a que ela pertence.
 */
const TETOS_DE_FACHADA = new Map<string, number>([
  ['src/main.ts', 40],
  ['src/campanha/campanha.ts', 220],
]);

export function checarTamanhoDosArquivos(): void {
  const arquivos = PASTAS.flatMap((pasta) => varrer(resolve(pasta)))
    .map((caminho) => ({ caminho: emBarras(caminho), linhas: contarLinhas(caminho) }))
    .sort((a, b) => b.linhas - a.linhas);

  const grandes: string[] = [];
  for (const { caminho, linhas } of arquivos) {
    const teto = TETOS_DE_FACHADA.get(caminho);
    if (teto !== undefined) {
      if (linhas > teto) {
        reclamar(
          `${caminho} tem ${linhas} linhas e o teto de fachada é ${teto} — ` +
            'regra nova nasce em módulo próprio, não aqui',
        );
      }
      continue;
    }
    if (linhas > FALHA) {
      reclamar(
        `${caminho} tem ${linhas} linhas (limite ${FALHA}) — ` +
          'divida em uma pasta com um arquivo por assunto',
      );
    } else if (linhas > AVISO) {
      grandes.push(`${caminho} (${linhas})`);
    }
  }

  const maior = arquivos[0];
  console.log(
    `tamanho: ${arquivos.length} arquivos, maior com ${maior?.linhas ?? 0} linhas ` +
      `(aviso em ${AVISO}, falha em ${FALHA})`,
  );
  for (const grande of grandes) console.log(`  perto do limite: ${grande}`);
}

function varrer(pasta: string): string[] {
  return readdirSync(pasta, { withFileTypes: true }).flatMap((item) => {
    const caminho = join(pasta, item.name);
    if (item.isDirectory()) return varrer(caminho);
    return EXTENSOES.some((ext) => item.name.endsWith(ext)) ? [caminho] : [];
  });
}

/** Conta como `wc -l`: uma linha por quebra, sem contar o vazio depois da última. */
function contarLinhas(caminho: string): number {
  const texto = readFileSync(caminho, 'utf8');
  if (texto.length === 0) return 0;
  const linhas = texto.split('\n');
  return linhas[linhas.length - 1] === '' ? linhas.length - 1 : linhas.length;
}

/** Windows escreve `src\campanha`; a mensagem e a tabela de tetos falam em `src/campanha`. */
function emBarras(caminho: string): string {
  return relative(process.cwd(), caminho).split(sep).join('/');
}
