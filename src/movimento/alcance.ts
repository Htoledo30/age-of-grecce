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
 * teria como saber por onde a hoste passou.
 *
 * A origem não entra no resultado — ficar parado não é destino.
 *
 * **Território alheio entra como destino terminal**: dá pra marchar contra ele, mas a rota
 * acaba ali. Só o próprio território deixa a hoste seguir adiante.
 */
export function rotasDe(
  atlas: Atlas,
  origem: string,
  /**
   * Esta terra deixa a hoste PASSAR? Território próprio sempre; terra de quem concedeu
   * acesso militar, também.
   *
   * ⚠️ **O nome mudou de "é minha" para "dá passagem" quando o acesso militar existiu**, e a
   * diferença não é cosmética: a rota passa por onde há licença, mas a licença não faz a
   * terra sua. Quem pergunta "meu reino é contínuo?" continua sendo `alcanceDe`, que só
   * conhece território próprio.
   */
  daPassagem: (idProvincia: string) => boolean,
  saltos: number,
  /**
   * Desta terra dá para EMBARCAR? Falso por padrão: sem responder isto, o mar não existe.
   *
   * ⚠️ **Embarcar exige Porto na província de onde se sai** — decisão de Henrique, e é o que
   * impede exército nascendo no meio do Egeu. Desembarcar é livre em qualquer costa, e
   * navegar de zona em zona também: o preço é a viagem, cobrada em turnos.
   */
  podeEmbarcarDe: (idProvincia: string) => boolean = () => false,
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
      const jaNoMar = atlas.ehMar(atual.onde);
      for (const vizinha of [...atlas.vizinhasDe(atual.onde)].sort()) {
        if (visitadas.has(vizinha)) continue;
        const paraOMar = atlas.ehMar(vizinha);
        // ⚠️ **A porta do mar é o Porto.** Sair de terra para a água só a partir de uma
        // província com Porto; de água para água a hoste já embarcou e segue navegando.
        if (paraOMar && !jaNoMar && !podeEmbarcarDe(atual.onde)) continue;
        visitadas.add(vizinha);
        const rota = [...atual.rota, vizinha];
        rotas.set(vizinha, rota);
        // ⚠️ **Terra SEM PASSAGEM é destino, mas não é caminho.** Ela entra no mapa de rotas
        // — marchar contra o vizinho é o ponto — e NÃO entra na fronteira da busca: a rota
        // termina ali. Sem isso, uma hoste atravessaria o reino inimigo e sairia do outro
        // lado sem que nada acontecesse, que é teletransporte com outro nome. Com acesso
        // militar concedido, a terra passa a dar passagem e a rota segue — que é exatamente
        // o que a licença compra.
        //
        // ⚠️ **O mar é caminho para todo mundo**, e é o que faz a travessia existir: ninguém
        // é dono da água, então ela nunca seria "sua" e a rota morreria no primeiro golfo.
        if (paraOMar || daPassagem(vizinha)) seguinte.push({ onde: vizinha, rota });
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
      // ⚠️ Esta função responde "o reino é contínuo POR TERRA daqui", e a resposta não pode
      // mudar porque uma zona de água encosta nas duas metades. Quem quer a travessia usa
      // `rotasDe`, que sabe do Porto.
      if (atlas.ehMar(vizinha)) continue;
      // Território alheio não é só um destino proibido: ele também não deixa PASSAR.
      // Sem esta linha, uma hoste atravessaria o reino inimigo e sairia do outro lado.
      if (!ehDoPoder(vizinha)) continue;
      alcancadas.add(vizinha);
      fila.push(vizinha);
    }
  }

  return alcancadas;
}
