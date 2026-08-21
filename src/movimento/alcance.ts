/**
 * Até onde uma hoste pode ir a partir de onde está.
 *
 * Função pura sobre o grafo de terra do atlas — nenhum estado mora aqui, e é isso que
 * deixa o alcance inteiro ficar sob teste no vitest contra o recorte de verdade.
 *
 * A regra desta fatia, e ela é do dono do projeto: **a tropa anda livre, mas só pelo
 * território dele.** Não é "só pra província vizinha": é qualquer província sua que se
 * alcance por terra **atravessando apenas províncias suas**.
 *
 * A diferença entre as duas leituras não é detalhe. "Qualquer província minha" deixaria
 * uma hoste da Ática aparecer numa ilha do outro lado do Egeu sem nunca ter navegado —
 * teletransporte disfarçado de regra. Exigir o caminho inteiro em terra própria faz o
 * mapa continuar mandando: um reino partido em dois pedaços não move tropa entre eles,
 * e é exatamente por isso que porto e mar vão importar quando existirem.
 */

import type { Atlas } from '@/mundo/atlas';

/**
 * As províncias alcançáveis dentro de `saltos`, **com a rota até cada uma**.
 *
 * A ordem guarda a rota, e não só o destino: sem ela, "interceptar no meio do caminho" não
 * teria como saber por onde a hoste passou. Ver
 * `documentacao/design/resolucao-da-rodada.md`.
 *
 * A origem não entra no resultado — ficar parado não é destino.
 */
export function rotasDe(
  atlas: Atlas,
  origem: string,
  ehDoPoder: (idProvincia: string) => boolean,
  saltos: number,
): ReadonlyMap<string, readonly string[]> {
  const rotas = new Map<string, readonly string[]>();
  if (!atlas.existe(origem) || saltos <= 0) return rotas;

  // Largura de verdade, e não profundidade: a PRIMEIRA vez que se chega a uma província é
  // pelo caminho mais curto. Sem isso, uma província vizinha poderia ser registrada com
  // rota de dois trechos e gastar um ponto de movimento à toa.
  const visitadas = new Set<string>([origem]);
  let fronteira: readonly { onde: string; rota: readonly string[] }[] = [
    { onde: origem, rota: [] },
  ];

  for (let salto = 0; salto < saltos; salto++) {
    const seguinte: { onde: string; rota: readonly string[] }[] = [];
    for (const atual of fronteira) {
      // Ordenar antes de percorrer: a vizinhança vem do arquivo assado, e depender da
      // ordem dele faria a rota escolhida mudar sem ninguém mexer em regra nenhuma.
      for (const vizinha of [...atlas.vizinhasDe(atual.onde)].sort()) {
        if (visitadas.has(vizinha)) continue;
        visitadas.add(vizinha);
        if (!ehDoPoder(vizinha)) continue;
        const rota = [...atual.rota, vizinha];
        rotas.set(vizinha, rota);
        seguinte.push({ onde: vizinha, rota });
      }
    }
    fronteira = seguinte;
  }

  return rotas;
}

/**
 * Todas as províncias alcançáveis, **sem limite de saltos**.
 *
 * Continua servindo para a pergunta "este reino é contínuo a partir daqui?" — que é
 * diferente de "aonde a hoste chega nesta rodada".
 */
export function alcanceDe(
  atlas: Atlas,
  origem: string,
  ehDoPoder: (idProvincia: string) => boolean,
): ReadonlySet<string> {
  const alcancadas = new Set<string>();
  if (!atlas.existe(origem)) return alcancadas;

  const visitadas = new Set<string>([origem]);
  const fila: string[] = [origem];

  while (fila.length > 0) {
    const atual = fila.pop();
    if (atual === undefined) break;
    for (const vizinha of atlas.vizinhasDe(atual)) {
      if (visitadas.has(vizinha)) continue;
      visitadas.add(vizinha);
      // Território alheio não é só um destino proibido: ele também não deixa PASSAR.
      // Sem esta linha, uma hoste atravessaria o reino inimigo e sairia do outro lado.
      if (!ehDoPoder(vizinha)) continue;
      alcancadas.add(vizinha);
      fila.push(vizinha);
    }
  }

  return alcancadas;
}
