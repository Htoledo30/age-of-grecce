/**
 * A IA — a porta única. **"Jogue o turno de quem não é o jogador."**
 *
 * Chamada uma vez por virada, ANTES de `passarTurno`, porque as ordens deste jogo são
 * simultâneas: se a IA decidisse depois, ela estaria vendo as cartas do jogador.
 *
 * ⚠️ **Ela fica FORA de `passarTurno`, e é decisão de arquitetura.** A IA é um jogador, não
 * uma regra da campanha — e a diferença aparece no dia em que 372 testes que viram turnos
 * passariam a ter dezessete poderes agindo dentro deles. Um teste sobre fome deixaria de ser
 * sobre fome. Aqui, quem quer IA pede IA.
 *
 * ## O que ela pode fazer, e o que ela não pode
 *
 * ⚠️ **Ela chama a MESMA fachada `Campanha` que a tela chama**, com o poder dito em voz alta
 * (`porPoder`). Não existe caminho de serviço: se ela precisar de uma pergunta que a fachada
 * não responde, a pergunta entra na fachada. É o que garante que ela jogue este jogo em vez
 * de um parecido com este — e é o que faz cada defeito que ela encontra ser um defeito de
 * verdade.
 *
 * ⚠️ **Nada de sorte.** Ordem por id do começo ao fim: a mesma partida, com as mesmas
 * decisões do jogador, dá o mesmo mapa. Sem isso não há salvamento confiável nem regressão —
 * a mesma regra que a batalha carrega escrita no cabeçalho dela.
 *
 * ⚠️ **Ela decide do zero a cada turno.** Não guarda plano de uma virada para a outra, e por
 * isso não mexe no salvamento. Quando alguma decisão precisar de memória — *"estou
 * comprometido a tomar Mégara"* —, a memória entra no estado e vai para o disco junto.
 *
 * ## Onde ela está
 *
 * Primeira etapa: **ela cuida da casa.** Constrói e decreta imposto. Não levanta tropa, não
 * marcha, não defende — isso é a etapa 2, e vem depois de esta rodar duzentos turnos sem
 * susto. A ordem é assim de propósito: nenhum exército se mexe, então um erro aparece numa
 * província só, e não numa guerra em cascata.
 */

import type { Campanha } from '@/campanha/campanha';
import type { Ia } from '@/dados/esquema';
import { obraEscolhida } from './economia/construir';
import { decretosEscolhidos } from './economia/imposto';
import { estiloDe } from './estilo';

/** O que a IA fez num turno. Serve à ferramenta de partida e aos testes, não ao jogo. */
export interface LanceDaIa {
  poder: string;
  obra: { provincia: string; construcao: string } | null;
  decretos: readonly { provincia: string; nivel: string }[];
}

/**
 * Joga o turno de todos os poderes que não são o jogador.
 *
 * ⚠️ **Só os poderes com economia completa.** Das 196 províncias desenhadas, 25 são
 * simuladas; os outros 121 poderes não têm ficha, não arrecadam e não teriam com que decidir.
 * Soltar a IA neles faria um vizinho engolir meia Grécia vazia de graça, e o mapa viraria
 * sopa antes de o jogo começar.
 */
export function jogarIA(campanha: Campanha, dados: Ia): readonly LanceDaIa[] {
  const lances: LanceDaIa[] = [];
  for (const idPoder of poderesDaIa(campanha)) {
    const estilo = estiloDe(dados, idPoder);

    // O imposto primeiro: ele muda a renda deste mesmo turno, e a obra precisa saber com
    // quanto conta. Ao contrário, a IA decretaria em cima de uma decisão que ela já tomou.
    const decretos = decretosEscolhidos(campanha, idPoder, estilo);
    for (const decreto of decretos) {
      campanha.definirImposto(decreto.provincia, decreto.nivel, idPoder);
    }

    const obra = obraEscolhida(campanha, idPoder, estilo);
    if (obra) campanha.construir(obra.provincia, obra.construcao, idPoder);

    lances.push({
      poder: idPoder,
      obra: obra ? { provincia: obra.provincia, construcao: obra.construcao } : null,
      decretos,
    });
  }
  return lances;
}

/** Quem a IA dirige: vivo, com economia completa, e que não seja o jogador. */
export function poderesDaIa(campanha: Campanha): readonly string[] {
  const jogador = campanha.jogador?.id;
  return campanha
    .poderesVivos()
    .filter((id) => id !== jogador && campanha.semEconomia(id) === 0)
    .sort();
}
