// Abre o jogo no Electron, subindo o servidor de desenvolvimento junto.
//
// Duas decisões que importam:
//
// 1. O servidor do Vite sobe DENTRO deste processo (API do Vite), não como programa
//    separado. Assim ele morre junto com este script — sem servidor órfão segurando a
//    porta depois de fechar o jogo.
// 2. O Electron é lançado pelo caminho do executável, sem passar por `npx` nem por
//    shell. Menos intermediário, e fechar a janela avisa este script na hora.

import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createServer } from 'vite';
import caminhoElectron from 'electron';

const PORTA = 5173;
const URL_DEV = `http://localhost:${PORTA}`;

/**
 * A assinatura do nosso jogo, lida do index.html em vez de escrita aqui.
 *
 * Já foi a string '<title>Sucessão</title>' cravada no código, e ela apodreceu no dia em
 * que o jogo mudou de nome: a checagem passou a dar sempre falso, o script tentava subir
 * um segundo servidor e morria com "port in use" quando havia um no ar. Título é
 * conteúdo — o dono dele é o index.html.
 */
const ASSINATURA = /<title>(.*?)<\/title>/.exec(readFileSync('index.html', 'utf8'))?.[1];

/** Responde e é o nosso jogo? (evita conversar com outro app na mesma porta) */
async function servidorNosso() {
  if (!ASSINATURA) return false;
  try {
    const r = await fetch(URL_DEV, { signal: AbortSignal.timeout(2000) });
    if (!r.ok) return false;
    return (await r.text()).includes(ASSINATURA);
  } catch {
    return false;
  }
}

let servidor = null;

if (await servidorNosso()) {
  console.log('servidor de desenvolvimento já estava no ar — reaproveitando');
} else {
  try {
    servidor = await createServer({ server: { port: PORTA, strictPort: true } });
    await servidor.listen();
    console.log(`servidor pronto em ${URL_DEV}`);
  } catch (erro) {
    console.error(`\nnão consegui subir o servidor em ${URL_DEV}:`);
    console.error(`  ${erro.message}`);
    console.error('a porta pode estar ocupada por outro programa.');
    process.exit(1);
  }
}

// ELECTRON_RUN_AS_NODE faz o binário rodar como Node puro e o processo principal quebra
// (`app` fica indefinido). Alguns terminais definem essa variável — removemos sempre.
const ambiente = { ...process.env, URL_DEV };
delete ambiente.ELECTRON_RUN_AS_NODE;

const electron = spawn(caminhoElectron, ['electron/main.cjs'], {
  stdio: 'inherit',
  env: ambiente,
});

let encerrando = false;
async function encerrar(codigo) {
  if (encerrando) return;
  encerrando = true;
  if (!electron.killed) electron.kill();
  await servidor?.close(); // null quando reaproveitamos servidor de outra pessoa
  process.exit(codigo);
}

electron.on('close', (codigo) => void encerrar(codigo ?? 0));
electron.on('error', (erro) => {
  console.error(`falha ao abrir o Electron: ${erro.message}`);
  void encerrar(1);
});
process.on('SIGINT', () => void encerrar(0));
process.on('SIGTERM', () => void encerrar(0));
