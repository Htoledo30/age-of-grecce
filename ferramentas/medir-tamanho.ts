/**
 * O TAMANHO DA INTERFACE, em números e em imagem.
 *
 * Henrique: *"em jogos atualmente se encontra facilmente em acessibilidade formas de aumentar
 * o texto sem perder resolucao ou qualidade, consegue fazer isso aqui?"*. São duas promessas, e
 * cada uma se verifica de um jeito:
 *
 * 1. **aumentar** — o texto tem de crescer em PIXEL DE TELA, não só em px de CSS. A ferramenta
 *    mede o corpo da fonte multiplicado pela escala do palco: é o tamanho com que a letra chega
 *    ao olho. Se 130% não render 1,3x, a promessa é falsa.
 * 2. **sem perder qualidade** — nada pode ser cortado. Com o palco menor, um painel de 1180px
 *    passa a ocupar 80% da largura em vez de 61%, e um que não coubesse sumiria calado. A
 *    ferramenta abre os painéis mais largos e mais altos e mede o transbordo de cada um.
 *
 * uso:  npm run medir-tamanho
 */
import { chromium, type Page } from '@playwright/test';
import { createServer } from 'vite';
import { mkdir } from 'node:fs/promises';

const URL_DEV = 'http://localhost:5173/';
const PASTA = 'capturas/tamanho';
const TAMANHOS = ['pequena', 'normal', 'grande', 'maior'] as const;

/** Os painéis mais largos e mais altos do jogo: se algum não cabe, é um destes. */
const PAINEIS = [
  { nome: 'diplomacia', botao: /Diplomacia/i },
  { nome: 'construcoes', botao: /Constru/i },
  { nome: 'recrutamento', botao: /Recrutar|Exército/i },
  { nome: 'governo', botao: /Governo/i },
] as const;

const servidorNoAr = async (): Promise<boolean> => {
  try {
    return (await fetch(URL_DEV, { signal: AbortSignal.timeout(2000) })).ok;
  } catch {
    return false;
  }
};

/** Abre um painel pelo texto do botão da barra. Devolve se conseguiu. */
async function abrir(pagina: Page, alvo: RegExp): Promise<boolean> {
  return pagina.evaluate((fonte) => {
    const re = new RegExp(fonte, 'i');
    const b = [...document.querySelectorAll('button')].find((x) => re.test(x.textContent || ''));
    if (!b) return false;
    b.click();
    return true;
  }, alvo.source);
}

/**
 * O que passa da borda do palco — em px do palco, que é a unidade em que o painel foi desenhado.
 *
 * ⚠️ Mede TUDO que rola ou tem moldura, e não uma lista de classes: um painel novo entra no
 * jogo sem passar por aqui, e uma ferramenta que só olha o que já conhece envelhece calada.
 */
async function medirFuga(pagina: Page): Promise<string[]> {
  return pagina.evaluate(() => {
    const palcoEl = document.querySelector('#palco');
    if (!palcoEl) return [];
    const limite = palcoEl.getBoundingClientRect();
    const escala = Number((palcoEl as HTMLElement).style.zoom || 1);
    const fora: string[] = [];
    for (const el of palcoEl.querySelectorAll<HTMLElement>('*')) {
      // ⚠️ As camadas do MAPA ficam fora da borda de propósito: um rótulo de província que
      // está a leste da vista é desenhado a leste da vista, e o `overflow: hidden` do palco o
      // apara. Só a INTERFACE tem de caber.
      if (el.hidden || el.id === 'mundo' || el.id === 'ui') continue;
      if (el.closest('[class*="-mapa"]')) continue;
      // O painel lateral FECHADO dorme além da borda e deixa só a asa de puxar. Sempre 310px,
      // em qualquer tamanho — se um dia esse número variar com a escala, aí é defeito.
      if (el.closest(".painel-lateral:not([data-aberto='sim'])")) continue;
      // ⚠️ **Só o painel de FORA responde por caber.** Uma lista que rola tem itens abaixo do
      // corte por definição, e um painel recolhido fica de propósito além da borda; contá-los
      // afogaria o que importa em ruído. Quem tem um ancestral que apara já está resolvido —
      // e o que ele apara SEM barra de rolagem é medido logo abaixo, no lugar certo.
      let apara = false;
      for (let pai = el.parentElement; pai && pai !== palcoEl; pai = pai.parentElement) {
        const est = getComputedStyle(pai);
        if (est.overflow !== 'visible' || est.transform !== 'none') { apara = true; break; }
      }
      const c = el.getBoundingClientRect();
      if (c.width === 0 || c.height === 0) continue;
      const direita = Math.round((c.right - limite.right) / escala);
      const abaixo = Math.round((c.bottom - limite.bottom) / escala);
      const cortado = Math.round((el.scrollHeight - el.clientHeight) * (el.clientHeight > 0 ? 1 : 0));
      const nome = String(el.className || el.tagName).slice(0, 42);
      if (!apara && (direita > 1 || abaixo > 1)) {
        fora.push(`${nome} passa ${Math.max(0, direita)}px à direita, ${Math.max(0, abaixo)}px abaixo`);
      } else if (cortado > 4 && getComputedStyle(el).overflowY === 'hidden') {
        fora.push(`${nome} esconde ${cortado}px sem deixar rolar`);
      }
    }
    return fora;
  });
}

async function main(): Promise<void> {
  await mkdir(PASTA, { recursive: true });
  const vite = (await servidorNoAr()) ? null : await createServer({ server: { port: 5173, strictPort: true } });
  await vite?.listen();
  const navegador = await chromium.launch({ headless: true });

  console.log('\n════ O TAMANHO DA INTERFACE ════');
  console.log('janela de 1920x1040 (a de um monitor 1080p com barra de tarefas)\n');

  for (const tamanho of TAMANHOS) {
    const contexto = await navegador.newContext({
      viewport: { width: 1920, height: 1040 },
      deviceScaleFactor: 1,
    });
    await contexto.addInitScript(
      (t) => localStorage.setItem('grecce:tamanho-da-interface', t),
      tamanho,
    );
    const pagina = await contexto.newPage();
    await pagina.goto(URL_DEV, { waitUntil: 'load' });
    await pagina.waitForSelector('body[data-pronto="sim"]', { timeout: 15000 });
    await pagina.evaluate(() =>
      (window as never as { inspecao: { comecar: (a: string) => void } }).inspecao.comecar('atenas'),
    );
    await pagina.waitForTimeout(500);

    // Transbordo: qualquer coisa que ultrapasse a borda do palco é conteúdo perdido.
    const transbordos: string[] = [];

    // A própria tela de Opções, que é onde o jogador troca isto — e a única que ele vai ver
    // nos quatro tamanhos seguidos, comparando.
    //
    // ⚠️ **Vem ANTES dos painéis, e a ordem não é gosto.** Escape alterna o menu de pausa, mas
    // uma ficha de província aberta come a tecla primeiro — e o menu nunca chega a vê-la. Com a
    // tela limpa, um Escape basta.
    const menuAberto = (): Promise<boolean> =>
      pagina.evaluate(() => document.querySelector<HTMLElement>('.menu-pausa')?.hidden === false);
    if (!(await menuAberto())) {
      await pagina.keyboard.press('Escape');
      await pagina.waitForTimeout(350);
    }
    if ((await menuAberto()) && (await abrir(pagina, /Opções/i))) {
      await pagina.waitForTimeout(350);
      for (const f of await medirFuga(pagina)) transbordos.push(`opções: ${f}`);
      await pagina.screenshot({ path: `${PASTA}/${tamanho}-opcoes.png` });
    } else {
      transbordos.push('opções: não consegui abrir a tela');
    }
    await pagina.keyboard.press('Escape');
    await pagina.waitForTimeout(200);
    await pagina.keyboard.press('Escape');
    await pagina.waitForTimeout(250);


    const palco = await pagina.evaluate(() => {
      const el = document.querySelector<HTMLElement>('#palco');
      if (!el) return null;
      const escala = Number(el.style.zoom || 1);
      const caixa = el.getBoundingClientRect();
      // O corpo da fonte VISTO: px de CSS x escala do palco = px de tela.
      const barra = document.querySelector('.barra-turno') ?? document.body;
      const corpo = parseFloat(getComputedStyle(barra).fontSize);
      return {
        escala,
        largura: parseFloat(el.style.width),
        altura: parseFloat(el.style.height),
        naTela: { largura: Math.round(caixa.width), altura: Math.round(caixa.height) },
        corpoNaTela: +(corpo * escala).toFixed(2),
        usaTransform: getComputedStyle(el).transform !== 'none',
      };
    });
    if (!palco) throw new Error('sem palco');

    // Construções e Recrutamento pertencem à província selecionada. Antes esta ferramenta
    // clicava programaticamente nos botões ocultos, abria uma moldura sem conteúdo e declarava
    // que ela cabia. Selecionar Atenas faz a medição enxergar a decisão real.
    await pagina.evaluate(() => {
      const insp = (
        window as never as {
          inspecao: {
            centroDe: (p: string) => { x: number; y: number };
            posicionar: (x: number, y: number, z: number) => void;
          };
        }
      ).inspecao;
      const centro = insp.centroDe('atenas');
      insp.posicionar(centro.x, centro.y, 1);
    });
    await pagina.waitForTimeout(400);
    const centroDoPalco = await pagina.evaluate(() => {
      const caixa = document.querySelector('#palco')?.getBoundingClientRect();
      return caixa ? { x: caixa.left + caixa.width / 2, y: caixa.top + caixa.height / 2 } : null;
    });
    if (centroDoPalco) {
      await pagina.mouse.click(centroDoPalco.x, centroDoPalco.y);
      await pagina.waitForTimeout(400);
    }

    for (const painel of PAINEIS) {
      if (!(await abrir(pagina, painel.botao))) {
        transbordos.push(`${painel.nome}: botão não encontrado`);
        continue;
      }
      await pagina.waitForTimeout(350);
      for (const f of await medirFuga(pagina)) transbordos.push(`${painel.nome}: ${f}`);
      await pagina.screenshot({ path: `${PASTA}/${tamanho}-${painel.nome}.png` });
      await pagina.keyboard.press('Escape');
      await pagina.waitForTimeout(200);
    }
    // A ficha de província não tem botão na barra: abre-se clicando na terra. É o painel mais
    // ALTO do jogo, e o recuo dele dispara em 820px de altura — o palco no tamanho maior tem
    // 831. Onze pixels de folga é margem que só a medição enxerga.
    await pagina.evaluate(() => {
      const insp = (window as never as { inspecao: { centroDe: (p: string) => { x: number; y: number }; posicionar: (x: number, y: number, z: number) => void } }).inspecao;
      const centro = insp.centroDe('atenas');
      insp.posicionar(centro.x, centro.y, 1);
    });
    await pagina.waitForTimeout(400);
    const meio = await pagina.evaluate(() => {
      const el = document.querySelector('#palco');
      const c = el?.getBoundingClientRect();
      return c ? { x: c.left + c.width / 2, y: c.top + c.height / 2 } : null;
    });
    if (meio) {
      await pagina.mouse.click(meio.x, meio.y);
      await pagina.waitForTimeout(400);
      for (const f of await medirFuga(pagina)) {
        transbordos.push(`ficha de província: ${f}`);
      }
      await pagina.screenshot({ path: `${PASTA}/${tamanho}-ficha.png` });
      await pagina.keyboard.press('Escape');
      await pagina.waitForTimeout(200);
    }

    await pagina.screenshot({ path: `${PASTA}/${tamanho}-mapa.png` });

    const pct = Math.round((1920 / palco.largura) * 100);
    console.log(`── ${tamanho.toUpperCase()} (${pct}%)`);
    console.log(`   palco ......... ${palco.largura}x${palco.altura}  (escala ${palco.escala.toFixed(3)})`);
    console.log(`   na tela ....... ${palco.naTela.largura}x${palco.naTela.altura} de 1920x1040`);
    console.log(`   texto na tela . ${palco.corpoNaTela}px${palco.usaTransform ? '  ⚠️ USA TRANSFORM' : ''}`);
    console.log(`   transbordo .... ${transbordos.length === 0 ? 'nenhum' : ''}`);
    for (const t of transbordos) console.log(`     ⚠️ ${t}`);
    console.log();
    await contexto.close();
  }

  console.log(`imagens em ${PASTA}/\n`);
  await navegador.close();
  await vite?.close();
}

void main();
