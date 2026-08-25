/**
 * Validações do nosso domínio — o que lint e compilador não conseguem ver.
 * Roda junto com `npm run verificar`.
 *
 * O alvo aqui é sempre o mesmo: pegar a incoerência ENTRE arquivos. Cada arquivo sozinho já é
 * validado pelo esquema Zod; o que escapa é a moldura do jogo divergindo da moldura do mapa
 * gerado, a arte faltando depois de um `gerar-mapa` interrompido, ou um arquivo de código
 * crescendo até virar o lugar onde tudo mora.
 *
 * Este arquivo é só o ROTEIRO. Cada checagem vive em `checar/`, uma por assunto.
 */

import { checarArte } from './checar/arte';
import { checarConstrucoes } from './checar/construcoes';
import { checarEconomia } from './checar/economia';
import { lerMapaGerado } from './checar/mapa-gerado';
import { checarAjustes, checarMundo } from './checar/mundo-e-ajustes';
import { problemas } from './checar/problemas';
import { checarProvincias } from './checar/provincias';
import { checarTamanhoDosArquivos } from './checar/tamanho-dos-arquivos';

const mapa = lerMapaGerado();
checarMundo(mapa);
checarAjustes();
checarArte(mapa);
checarProvincias(mapa);
checarEconomia();
checarConstrucoes();
checarTamanhoDosArquivos();

const encontrados = problemas();
if (encontrados.length > 0) {
  console.error(`\n${encontrados.length} problema(s) nos dados:`);
  for (const p of encontrados) console.error(`  - ${p}`);
  process.exit(1);
}
console.log('dados: tudo certo');
