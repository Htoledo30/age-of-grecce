/**
 * A ponte que faltava entre o editor de balanceamento e os arquivos de dados.
 *
 * Henrique, depois de descobrir que o editor guardava tudo só no navegador: *"uai, quando eu
 * mudo no editor que o chat criou não muda no repositório?"* — e ele estava certo em reclamar.
 * O editor (F2) fazia a parte difícil: mexer no número e ver o jogo responder na hora, sem
 * recarregar. O que faltava era a saída. Os valores viviam em `localStorage`, então não iam
 * para o git, não iam para a outra máquina, e **nenhuma ferramenta os enxergava** —
 * `npm run partida`, os testes e o `npm run economia` leem `dados/*.json`.
 *
 * Este plugin dá ao editor um botão que grava de verdade: ele recebe os ajustes já mexidos e
 * escreve `dados/ajustes.json` e `dados/construcoes.json`. Daí em diante é um arquivo como
 * qualquer outro — entra no `git diff`, viaja no `git push`, e as ferramentas medem o mundo
 * que ele está jogando.
 *
 * ⚠️ **Só existe durante o `npm run dev`.** `apply: 'serve'` mantém isto fora do `vite build`,
 * então o jogo empacotado não carrega uma rota que escreve em disco. É ferramenta de autoria
 * na máquina do autor, e não parte do jogo.
 *
 * ⚠️ **E ele VALIDA antes de escrever, com o mesmo esquema que o jogo usa para carregar.** Um
 * editor que pode corromper os dados do jogo é pior que nenhum editor: bastaria um campo fora
 * do lugar para a próxima partida não abrir. Se o Zod recusar, nada é escrito e o motivo volta
 * para a tela.
 *
 * ⚠️ **Grava o objeto inteiro, e não uma lista de campos.** O editor já mantém `ajustes.jogo`
 * e `construcoes.construcoes` mexidos em memória — é deles que o jogo lê enquanto se joga.
 * Mandar o objeto pronto e trocá-lo dentro do arquivo dispensa um mapa de "id do campo →
 * caminho no JSON", que é justamente o tipo de tabela paralela que envelhece torto quando
 * alguém acrescenta um campo novo ao editor e esquece do outro lado. Medido antes de escrever
 * a primeira linha: ida e volta pelo esquema não perde um campo sequer dos dois arquivos.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { ZodError } from 'zod';

import { Ajustes, Construcoes } from '../src/dados/esquema';

/** A rota. Prefixo com dois sublinhados, como as rotas internas do próprio vite. */
const ROTA = '/__balanco/gravar';

interface Encomenda {
  jogo?: unknown;
  construcoes?: unknown;
}

/**
 * O motivo da recusa numa linha que cabe no rodapé do editor.
 *
 * ⚠️ O `message` cru de um `ZodError` é o JSON inteiro da lista de problemas, com quebras de
 * linha e aspas escapadas — na tela isso não informa nada. O que importa é QUAL campo e por
 * quê, então sai o caminho pontilhado e a queixa, e no máximo dois de uma vez.
 */
function motivo(erro: unknown): string {
  if (!(erro instanceof ZodError)) return erro instanceof Error ? erro.message : String(erro);
  const queixas = erro.issues.slice(0, 2).map((i) => `${i.path.join('.')}: ${i.message}`);
  const resto = erro.issues.length - queixas.length;
  return queixas.join(' · ') + (resto > 0 ? ` · e mais ${resto}` : '');
}

/** Lê o arquivo, troca UMA chave da raiz e devolve o texto pronto — o resto fica intacto. */
function comChaveTrocada(caminho: string, chave: string, valor: unknown): string {
  const atual = JSON.parse(readFileSync(resolve(caminho), 'utf8')) as Record<string, unknown>;
  return `${JSON.stringify({ ...atual, [chave]: valor }, null, 2)}\n`;
}

export function gravarBalanco(): Plugin {
  return {
    name: 'grecce:gravar-balanco',
    // ⚠️ Só no servidor de desenvolvimento. Ver o comentário no topo.
    apply: 'serve',
    configureServer(servidor) {
      servidor.middlewares.use(ROTA, (requisicao, resposta) => {
        if (requisicao.method !== 'POST') {
          resposta.statusCode = 405;
          resposta.end();
          return;
        }
        const pedacos: Buffer[] = [];
        requisicao.on('data', (pedaco: Buffer) => pedacos.push(pedaco));
        requisicao.on('end', () => {
          const responder = (codigo: number, corpo: unknown): void => {
            resposta.statusCode = codigo;
            resposta.setHeader('content-type', 'application/json; charset=utf-8');
            resposta.end(JSON.stringify(corpo));
          };
          try {
            const encomenda = JSON.parse(Buffer.concat(pedacos).toString('utf8')) as Encomenda;
            // ⚠️ Monta os DOIS textos antes de escrever qualquer um: se o segundo não
            // validar, o primeiro não pode já estar no disco. Ou grava os dois, ou nenhum.
            const escritas: { caminho: string; texto: string }[] = [];
            if (encomenda.jogo !== undefined) {
              const texto = comChaveTrocada('dados/ajustes.json', 'jogo', encomenda.jogo);
              Ajustes.parse(JSON.parse(texto));
              escritas.push({ caminho: 'dados/ajustes.json', texto });
            }
            if (encomenda.construcoes !== undefined) {
              const texto = comChaveTrocada(
                'dados/construcoes.json',
                'construcoes',
                encomenda.construcoes,
              );
              Construcoes.parse(JSON.parse(texto));
              escritas.push({ caminho: 'dados/construcoes.json', texto });
            }
            for (const { caminho, texto } of escritas) writeFileSync(resolve(caminho), texto);
            responder(200, { arquivos: escritas.map((e) => e.caminho) });
          } catch (erro) {
            responder(400, { erro: motivo(erro) });
          }
        });
      });
    },
  };
}
