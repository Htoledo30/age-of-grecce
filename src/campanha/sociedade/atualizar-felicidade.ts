/**
 * O humor de cada província anda um passo rumo ao alvo, e o pavio das revoltas corre.
 *
 * Um passo por turno, nunca um salto: o único movimento brusco de humor é o choque da
 * conquista, e ele mora no caminho da conquista, não aqui.
 */

import { aproximarFelicidade, turnosAteOLevante } from '../felicidade';
import type { NucleoDaCampanha } from '../nucleo';
import { alvoDeFelicidadeEm } from './humor';
import { acenderPavioEm } from './processar-revoltas';
import type { Levante } from './processar-revoltas';
import { recuperacaoDaOrdem } from '../provincia/beneficios-das-construcoes';

/** Anda o humor de todas as províncias simuladas e devolve os levantes que nasceram. */
export function atualizarFelicidade(nucleo: NucleoDaCampanha): readonly Levante[] {
  const levantes: Levante[] = [];
  for (const id of Object.keys(nucleo.economia.provincias)) {
    const atual = nucleo.estado.felicidade[id];
    if (atual === undefined) continue;
    const alvo = alvoDeFelicidadeEm(nucleo, id);
    // O Templo acelera somente a RECUPERAÇÃO. Se fome, cerco ou imposto empurram o alvo para
    // baixo, ele não amortece a queda: templo não apaga a causa material da desordem.
    const bonus =
      atual < alvo
        ? recuperacaoDaOrdem(
            nucleo.catalogo,
            nucleo.estado.construcoes[id] ?? {},
          )
        : 0;
    const novo = aproximarFelicidade(
      atual,
      alvo,
      nucleo.ajustes.felicidade.passoPorTurno + bonus,
    );
    nucleo.estado.felicidade[id] = novo;

    // ⚠️ **Duas faixas fervem, e em ritmos diferentes.** A revoltosa acende rápido; a
    // insatisfeita, devagar — é a diferença entre a província que dá trabalho e a que se
    // perde. As de cima não fervem, e subir até elas apaga o pavio: revolta não guarda
    // rancor pela metade.
    //
    // ⚠️ **NINGUÉM SE LEVANTA ENQUANTO AS COISAS MELHORAM**, e é por isso que o alvo entra
    // na conta junto com o humor de hoje. Henrique achou jogando: *"sempre que tento
    // conquistar alguma província que o humor dela já está baixo, a chance de em duas
    // rodadas ela já se revoltar é muito alta"*. Era uma corrida impossível — o choque da
    // queda joga a cidade para o fundo de uma vez, ela sobe quatro pontos por turno, e o
    // pavio de três turnos queimava antes. Com o alvo na conta, a cidade que está a caminho
    // de um lugar melhor não pega em armas: quem ferve é quem vai FICAR fervendo.
    const prazo = turnosAteOLevante(Math.max(novo, alvo), nucleo.ajustes.felicidade);
    if (prazo === null) {
      delete nucleo.estado.revoltas[id];
      continue;
    }
    const levante = acenderPavioEm(nucleo, id, prazo);
    if (levante) levantes.push(levante);
  }
  return levantes;
}
