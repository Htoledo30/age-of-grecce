/**
 * Print automático do jogo rodando — é o que me permite VER o próprio trabalho
 * sem depender de ninguém mandar screenshot.
 *
 * Sobe o servidor, abre um navegador em 1920x1080, espera a cena desenhar,
 * salva o PNG em capturas/ e relata qualquer erro de console.
 *
 * uso: npm run capturar -- [nome] [--espera=1000] [--visivel] [--afastar]
 *      [--andar=tecla:milissegundos]
 *
 * Sem --visivel o navegador roda oculto e renderiza por SOFTWARE (SwiftShader), o que
 * trava o requestAnimationFrame em ~20/s. Serve pra conferir layout e erro, NUNCA pra
 * medir desempenho. Com --visivel abre janela de verdade e usa a GPU: aí o FPS é real.
 */

import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import type { ViteDevServer } from 'vite';

const PORTA = 5173;
const URL_DEV = `http://localhost:${PORTA}`;
const LARGURA = 1920;
const ALTURA = 1080;

const argumentos = process.argv.slice(2);
const nome = argumentos.find((a) => !a.startsWith('--')) ?? 'prova';
const espera = Number(argumentos.find((a) => a.startsWith('--espera='))?.split('=')[1] ?? 800);
const visivel = argumentos.includes('--visivel');
const afastar = argumentos.includes('--afastar');
/** --em=x,y --zoom=n : aponta a câmera pra um ponto do mundo antes do print. */
const em = argumentos.find((a) => a.startsWith('--em='))?.split('=')[1];
const zoomPedido = Number(argumentos.find((a) => a.startsWith('--zoom='))?.split('=')[1] ?? 1.2);
/**
 * --clicar=x,y : clica nessa posição da TELA (1920x1080). Pode repetir, e os cliques
 * saem na ordem em que foram escritos — é assim que se testa um painel: um clique liga
 * o botão, o seguinte escolhe alguma coisa no mapa.
 */
const cliques = argumentos
  .filter((a) => a.startsWith('--clicar='))
  .map((a) => a.split('=')[1] ?? '');
const andar = argumentos.find((a) => a.startsWith('--andar='))?.slice('--andar='.length);

async function servidorNoAr(): Promise<boolean> {
  try {
    const r = await fetch(URL_DEV, { signal: AbortSignal.timeout(2000) });
    return r.ok;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  // O servidor sobe DENTRO deste processo (API do Vite), nunca como programa separado.
  //
  // Já foi `spawn('npx', ..., { shell: true })`, e no Windows isso deixava servidor
  // órfão: matar o filho matava só o cmd.exe intermediário, e o Vite continuava
  // segurando a porta 5173 — a próxima abertura do jogo falhava com "port in use".
  // Dentro do processo não há intermediário nenhum pra perder de vista.
  let vite: ViteDevServer | null = null;
  if (!(await servidorNoAr())) {
    vite = await createServer({ server: { port: PORTA, strictPort: true } });
    await vite.listen();
  }

  try {
    await capturar();
  } finally {
    // finally, e não no fim do caminho feliz: qualquer erro no meio da captura deixaria
    // o servidor no ar exatamente como antes.
    await vite?.close();
  }
}

async function capturar(): Promise<void> {
  const navegador = await chromium.launch({
    headless: !visivel,
    args: visivel ? ['--start-maximized', '--force-device-scale-factor=1'] : [],
  });
  const contexto = await navegador.newContext({
    viewport: { width: LARGURA, height: ALTURA },
    deviceScaleFactor: 1,
  });
  const pagina = await contexto.newPage();

  const problemas: string[] = [];
  pagina.on('console', (msg) => {
    if (msg.type() === 'error') problemas.push(`console: ${msg.text()}`);
  });
  pagina.on('pageerror', (e) => problemas.push(`exceção: ${e.message}`));

  await pagina.goto(URL_DEV, { waitUntil: 'load' });
  await pagina.waitForSelector('body[data-pronto="sim"]', { timeout: 15_000 });
  if (em) {
    // objeto em vez de tupla: com tupla o compilador vê `number | undefined` e o lint
    // rejeita a asserção que resolveria — os dois ficam felizes assim
    const [x = 0, y = 0] = em.split(',').map(Number);
    await pagina.evaluate(
      (alvo: { x: number; y: number; zoom: number }) =>
        (
          window as unknown as {
            inspecao: { posicionar: (a: number, b: number, c: number) => void };
          }
        ).inspecao.posicionar(alvo.x, alvo.y, alvo.zoom),
      { x, y, zoom: zoomPedido },
    );
  }
  if (afastar) {
    await pagina.mouse.move(LARGURA / 2, ALTURA / 2);
    for (let i = 0; i < 30; i++) {
      await pagina.mouse.wheel(0, 1_000);
      await pagina.waitForTimeout(25);
    }
  }
  if (andar) {
    const [tecla = 's', duracaoTexto = '1000'] = andar.split(':');
    const duracao = Number(duracaoTexto);
    await pagina.keyboard.down(tecla);
    await pagina.waitForTimeout(duracao);
    await pagina.keyboard.up(tecla);
  }
  for (const clique of cliques) {
    const [cx = 0, cy = 0] = clique.split(',').map(Number);
    await pagina.mouse.click(cx, cy);
    // o laço do jogo só vê o clique no quadro seguinte; sem esta folga, dois cliques
    // seguidos chegariam juntos e um deles se perderia
    await pagina.waitForTimeout(200);
  }
  await pagina.waitForTimeout(espera);

  const pasta = resolve('capturas');
  mkdirSync(pasta, { recursive: true });
  const arquivo = resolve(pasta, `${nome}.png`);
  await pagina.screenshot({ path: arquivo });

  const erroFatal = await pagina.evaluate(() => document.body.dataset['erro'] ?? null);

  await navegador.close();

  console.log(`captura salva: ${arquivo}`);
  console.log(
    visivel
      ? 'modo GPU: o FPS da captura é real'
      : 'modo oculto: o FPS da captura NÃO é real (renderização por software)',
  );
  if (erroFatal) problemas.push(`falha na inicialização: ${erroFatal}`);
  if (problemas.length > 0) {
    console.error(`\n${problemas.length} problema(s):`);
    for (const p of problemas) console.error(`  - ${p}`);
    process.exitCode = 1;
  } else {
    console.log('sem erros de console');
  }
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
