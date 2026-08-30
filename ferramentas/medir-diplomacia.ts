/**
 * O PESO da aba de diplomacia, em números — para o redesenho ter antes e depois.
 *
 * Henrique: *"tá tudo muito confuso, muita informação"*. "Confuso" não se mede olhando, e
 * "melhor" não se prova por opinião. Esta ferramenta abre a aba, escolhe um vizinho e conta:
 * quantas AÇÕES existem, quantas estão disponíveis, quantas FRASES de prosa o jogador atravessa
 * antes de decidir, e quantos pixels de conteúdo ficam escondidos abaixo do corte.
 *
 * uso:  npm run medir-diplomacia
 */
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const URL_DEV = 'http://localhost:5173/';
const servidorNoAr = async (): Promise<boolean> => {
  try {
    return (await fetch(URL_DEV, { signal: AbortSignal.timeout(2000) })).ok;
  } catch {
    return false;
  }
};

async function main(): Promise<void> {
  const vite = (await servidorNoAr()) ? null : await createServer({ server: { port: 5173, strictPort: true } });
  await vite?.listen();
  const navegador = await chromium.launch({ headless: true });
  const pagina = await (await navegador.newContext({ viewport: { width: 1920, height: 1000 }, deviceScaleFactor: 1 })).newPage();
  await pagina.goto(URL_DEV, { waitUntil: 'load' });
  await pagina.waitForSelector('body[data-pronto="sim"]', { timeout: 15000 });
  await pagina.evaluate(() => (window as never as { inspecao: { comecar: (a: string) => void } }).inspecao.comecar('atenas'));
  await pagina.waitForTimeout(400);
  await pagina.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => /Diplomacia/i.test(x.textContent || ''));
    b?.click();
  });
  await pagina.waitForTimeout(300);
  await pagina.evaluate(() => {
    document.querySelector<HTMLElement>('[data-painel="diplomacia"] [data-poder="eleusis"]')?.click();
  });
  await pagina.waitForTimeout(300);

  const m = await pagina.evaluate(() => {
    const painel = document.querySelector('[data-painel="diplomacia"]');
    if (!painel) return null;
    const botoes = [...painel.querySelectorAll('button')];
    const acoes = botoes.filter((b) => b.dataset['acao'] !== undefined);
    const habilitados = acoes.filter((b) => !b.disabled);
    // Prosa: todo texto FORA de um botão com cinco palavras ou mais.
    // ⚠️ Pilha explícita e não recursão: uma função nomeada dentro de `page.evaluate` faz o
    // esbuild injetar o auxiliar `__name`, que não existe na página — e o erro (`__name is not
    // defined`) não diz nada sobre a causa.
    const prosa: string[] = [];
    const pilha: Node[] = [painel];
    while (pilha.length > 0) {
      const no = pilha.pop();
      if (!no) continue;
      if (no.nodeType === Node.TEXT_NODE) {
        const t = (no.textContent || '').trim();
        if (t.split(/\s+/).length >= 5 && !no.parentElement?.closest('button')) prosa.push(t);
        continue;
      }
      no.childNodes.forEach((f) => pilha.push(f));
    }
    const rolaveis = [...painel.querySelectorAll('*')]
      .filter((e) => e.scrollHeight > e.clientHeight + 4)
      .map((e) => ({ classe: e.className, visivel: e.clientHeight, total: e.scrollHeight }));
    const janela = (painel.querySelector('.diplomacia__janela') ?? painel).getBoundingClientRect();
    return {
      botoesTotais: botoes.length,
      acoes: acoes.length,
      acoesHabilitadas: habilitados.length,
      frases: prosa.length,
      palavrasDeProsa: prosa.reduce((s, t) => s + t.split(/\s+/).length, 0),
      prosa,
      rolaveis,
      alturaDaJanela: Math.round(janela.height),
      // quanto do conteudo esta escondido abaixo do corte
      escondido: rolaveis.reduce((s, r) => s + (r.total - r.visivel), 0),
    };
  });

  console.log('\n════ O PESO DA ABA DE DIPLOMACIA ════\n');
  console.log('botões no painel .............', m?.botoesTotais);
  console.log('  deles, AÇÕES ...............', m?.acoes, `(${m?.acoesHabilitadas} disponíveis)`);
  console.log('frases de prosa (5+ palavras)', m?.frases);
  console.log('palavras de prosa ...........', m?.palavrasDeProsa);
  console.log('altura da janela ............', m?.alturaDaJanela, 'px');
  console.log('conteúdo ESCONDIDO (rolagem)', m?.escondido, 'px');
  console.log('\no que rola, e quanto:');
  for (const r of m?.rolaveis ?? []) {
    console.log(`  · ${String(r.classe).padEnd(32)} mostra ${r.visivel} de ${r.total}`);
  }
  console.log('\nas frases:');
  for (const f of m?.prosa ?? []) console.log('  ·', f.length > 96 ? f.slice(0, 96) + '…' : f);
  console.log();
  await navegador.close();
  await vite?.close();

}

void main();
