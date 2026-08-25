/**
 * O alarme de tamanho — e por que ele NÃO reprova por linha.
 *
 * Duas vezes este projeto deixou um arquivo virar o lugar onde tudo mora: `campanha.ts`
 * chegou a 1.942 linhas e `main.ts` a 1.259. O sintoma foi o mesmo nas duas vezes — regra
 * nova entrava ali porque ali já tinha tudo à mão, e cada entrada tornava a seguinte mais
 * fácil. **Ninguém decidiu criar um arquivo-deus; ele se formou por comodidade.**
 *
 * A primeira versão desta trava reprovava qualquer arquivo acima de 400 linhas, e isso
 * estava errado: **arquivo-deus se define por MISTURA DE ASSUNTOS, não por quantidade de
 * linhas.** Um `comercio.ts` com comércio, IA, mapa e combate é um arquivo-deus com 200
 * linhas; `provincias.json` com 196 províncias está certo com milhares; e um arquivo por
 * província seria fragmentação inútil. A trava por número reprovou coisa boa — dados,
 * catálogos, esquemas, suítes de teste e componentes coesos — e ia empurrar o projeto a
 * separar cada campo do comentário que o explica só para agradar um contador.
 *
 * Então o número virou o que ele sempre foi de verdade: **um pedido para olhar.** Passou de
 * {@link AVISO}, o arquivo aparece na lista; quem lê decide. Divide-se quando o arquivo
 * reúne assuntos independentes, ou quando um pedaço poderia existir, ser testado e evoluir
 * sozinho. Não se divide para baixar linha.
 *
 * A única reprovação automática que sobrou é a das FACHADAS. Em `main.ts` e `campanha.ts`
 * crescer É o defeito — eles são porta de entrada e lista de comandos, e a regra combinada
 * com Henrique é que não voltam a receber regra nenhuma. Ali o teto é cerca, não alarme.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { reclamar } from './problemas';

const PASTAS = ['src', 'ferramentas', 'gerador', 'testes'];
const EXTENSOES = ['.ts', '.css'];

/** A partir daqui o arquivo entra na lista de "vale uma olhada". Não reprova nada. */
const AVISO = 300;

/**
 * Tetos de fachada — as duas únicas reprovações por tamanho.
 *
 * São arquivos cujo trabalho é APONTAR, não conter. Se um destes estourar, a resposta certa
 * quase nunca é levantar o número: é levar a regra nova para o módulo a que ela pertence.
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
    if (linhas > AVISO) grandes.push(`${caminho} (${linhas})`);
  }

  const maior = arquivos[0];
  console.log(`tamanho: ${arquivos.length} arquivos, maior com ${maior?.linhas ?? 0} linhas`);
  if (grandes.length > 0) {
    console.log(`  ${grandes.length} acima de ${AVISO} linhas — confira se cada um é UM assunto:`);
    for (const grande of grandes) console.log(`    ${grande}`);
  }
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
