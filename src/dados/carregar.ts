/** Carrega e valida os arquivos de dados do jogo. */

import brutoAjustes from '../../dados/ajustes.json';
import brutoConstrucoes from '../../dados/construcoes.json';
import brutoEconomia from '../../dados/economia.json';
import brutoExercitos from '../../dados/exercitos.json';
import brutoMundo from '../../dados/mundo.json';
import { Ajustes, Construcoes, Economia, Exercitos, Mundo, Provincias } from './esquema';

export function carregarMundo(): Mundo {
  return validar(Mundo, brutoMundo, 'dados/mundo.json');
}

export function carregarAjustes(): Ajustes {
  return validar(Ajustes, brutoAjustes, 'dados/ajustes.json');
}

export function carregarEconomia(): Economia {
  return validar(Economia, brutoEconomia, 'dados/economia.json');
}

export function carregarExercitos(): Exercitos {
  return validar(Exercitos, brutoExercitos, 'dados/exercitos.json');
}

export function carregarConstrucoes(): Construcoes {
  return validar(Construcoes, brutoConstrucoes, 'dados/construcoes.json');
}

/**
 * O recorte político é ASSADO, e por isso mora em `assets/`, junto com o resto da arte
 * do mapa — e por isso é buscado em tempo de execução em vez de importado.
 *
 * `assets/` é o diretório público do Vite: arquivo de lá é copiado cru pro build e
 * **não pode ser importado de JavaScript**. Importar funciona no servidor de
 * desenvolvimento e quebra (ou duplica o arquivo) no empacotamento — o Vite chega a
 * avisar, e o aviso é fácil de não ver no meio do log.
 */
export async function carregarProvincias(endereco: string): Promise<Provincias> {
  const resposta = await fetch(endereco);
  if (!resposta.ok) {
    throw new Error(`não achei ${endereco}: HTTP ${resposta.status} — rode \`npm run gerar-provincias\``);
  }
  return validar(Provincias, await resposta.json(), 'assets/mundo/provincias.json');
}

/**
 * Falha alto e com endereço. Um número errado num arquivo de ajuste tem que dizer qual
 * campo está errado — senão vira bug silencioso de gameplay meses depois.
 */
function validar<T>(
  esquema: {
    safeParse: (v: unknown) => { success: true; data: T } | { success: false; error: ErroZod };
  },
  bruto: unknown,
  arquivo: string,
): T {
  const r = esquema.safeParse(bruto);
  if (!r.success) {
    const detalhe = r.error.issues
      .map((i) => `  ${i.path.join('.') || '(raiz)'}: ${i.message}`)
      .join('\n');
    throw new Error(`${arquivo} inválido:\n${detalhe}`);
  }
  return r.data;
}

interface ErroZod {
  issues: Array<{ path: PropertyKey[]; message: string }>;
}
