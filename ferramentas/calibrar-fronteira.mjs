// Compara variações da linha de fronteira lado a lado, num navegador só.
//
// Espessura de traço não se resolve escolhendo número: se resolve olhando duas opções
// juntas. Este script abre o jogo uma vez, aponta a câmera pro mesmo lugar e troca a
// linha pelo gancho de inspeção, salvando um recorte por variação em capturas/calibre/.
//
// uso: node ferramentas/calibrar-fronteira.mjs

import { mkdirSync } from 'node:fs';
import { createServer } from 'vite';
import { chromium } from '@playwright/test';

const PORTA = 5199;
const LARGURA = 1920;
const ALTURA = 1080;

/** [rótulo, largura em px, força, cor] */
const VARIACOES = [
  ['a-atual', 1.3, 0.55, '#4a3f33'],
  ['b-media', 1.8, 0.8, '#3f342a'],
  ['c-forte', 2.2, 0.95, '#382d24'],
  ['d-grossa', 2.8, 1.0, '#33291f'],
];

/** [rótulo, x, y, zoom] — os dois extremos, que é onde a linha se julga. */
const VISTAS = [
  ['perto', 4525, 4264, 3.5],
  ['medio', 4525, 4264, 1.2],
  ['longe', 6144, 4128, 0.14],
];

const servidor = await createServer({ server: { port: PORTA, strictPort: true } });
await servidor.listen();

const navegador = await chromium.launch({ headless: false, args: ['--force-device-scale-factor=1'] });
const pagina = await navegador.newPage({ viewport: { width: LARGURA, height: ALTURA } });
await pagina.goto(`http://localhost:${PORTA}`);
await pagina.waitForSelector('body[data-pronto="sim"]');
await pagina.waitForTimeout(1500);

mkdirSync('capturas/calibre', { recursive: true });

for (const [vista, x, y, zoom] of VISTAS) {
  for (const [nome, largura, forca, cor] of VARIACOES) {
    // roda DENTRO da página, então `window` é o do navegador e não o do Node — daí o
    // globalThis, que o lint entende nos dois lados
    await pagina.evaluate(
      (a) => {
        const inspecao = globalThis.inspecao;
        inspecao.posicionar(a.x, a.y, a.zoom);
        inspecao.calibrarFronteira(a.largura, a.forca, a.cor);
      },
      { x, y, zoom, largura, forca, cor },
    );
    await pagina.waitForTimeout(350);
    const arquivo = `capturas/calibre/${vista}-${nome}.png`;
    await pagina.screenshot({ path: arquivo });
    console.log(`${arquivo}  largura ${largura}px  forca ${forca}  ${cor}`);
  }
}

await navegador.close();
await servidor.close();
