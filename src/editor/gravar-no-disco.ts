/**
 * O outro lado da ponte: o editor pedindo ao servidor de desenvolvimento que grave.
 *
 * A parte que escreve de fato vive em `ferramentas/vite-gravar-balanco.ts`, e é lá que está o
 * comentário longo sobre por que ela existe. Aqui só se manda o objeto e se traduz a resposta
 * numa frase que cabe no rodapé.
 *
 * ⚠️ **Fora do `npm run dev` isto não responde, e a mensagem tem de dizer isso.** No jogo
 * empacotado o plugin não existe: a rota devolve o `index.html` do próprio jogo, e o
 * `response.json()` estoura num erro de sintaxe que não explica nada a ninguém. Então o
 * primeiro cuidado aqui é reconhecer "isto não é um servidor de desenvolvimento" e dizer a
 * frase certa em vez de vazar um erro de parser.
 */

const ROTA = '/__balanco/gravar';

export interface ResultadoDaGravacao {
  ok: boolean;
  /** Uma frase pronta para o rodapé — em erro, o motivo de verdade. */
  frase: string;
}

export async function gravarNoDisco(
  jogo: unknown,
  construcoes: unknown,
): Promise<ResultadoDaGravacao> {
  try {
    const resposta = await fetch(ROTA, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jogo, construcoes }),
    });
    const tipo = resposta.headers.get('content-type') ?? '';
    if (!tipo.includes('application/json')) {
      return { ok: false, frase: 'Gravar em disco só funciona no npm run dev' };
    }
    const corpo = (await resposta.json()) as { arquivos?: string[]; erro?: string };
    if (!resposta.ok) {
      return { ok: false, frase: `Recusado pelos dados: ${corpo.erro ?? resposta.statusText}` };
    }
    const arquivos = corpo.arquivos ?? [];
    return { ok: true, frase: `Gravado em ${arquivos.join(' e ')}` };
  } catch {
    return { ok: false, frase: 'Gravar em disco só funciona no npm run dev' };
  }
}
