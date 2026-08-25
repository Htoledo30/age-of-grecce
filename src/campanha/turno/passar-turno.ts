/**
 * A virada do turno — **a ordem está escrita porque errá-la não dá erro nenhum**, só um
 * número torto em silêncio.
 *
 * 1. **Arrecada e paga a folha** antes de tudo: a renda pertence ao mundo como o jogador o
 *    deixou, e quem recruta neste turno paga a manutenção deste turno.
 * 2. **Alimenta** com o mapa ainda intacto: quem conquista passa a contar para o novo reino
 *    somente no turno seguinte, assim como a renda.
 * 3. **Resolve marchas e batalhas.** Resolver antes de arrecadar daria ao agressor um
 *    pagamento no mesmo instante da tomada.
 * 4. **Assenta capitais** sobre a rodada resolvida: a queda vira notícia, e quem não é o
 *    jogador reassenta a sua. A do jogador fica caída — e é ela que trava a PRÓXIMA virada.
 * 5. **Anda o humor e os levantes**, antes do crescimento: quem se revoltou hoje não cresce.
 * 6. **Cresce** com a população restante depois da folha militar.
 * 7. **Anda as obras**, para que qualquer efeito concluído comece a valer no turno seguinte.
 * 8. **Conclui as levas** por último: recruta pago nesta rodada não pode defendê-la, atacar
 *    nem engrossar uma hoste que já recebeu ordem.
 */

import { avancarAno } from '../estado-campanha';
import type { NucleoDaCampanha } from '../nucleo';
import type { EfemerosDaCampanha } from '../estado/efemeros';
import { alimentar } from '../alimentacao/aplicar-fome';
import { crescerPopulacao } from '../alimentacao/crescimento';
import { assentarCapitais, capitalPerdida } from '../governo/capital';
import { atualizarFelicidade } from '../sociedade/atualizar-felicidade';
import { donoDe } from '../provincia/consultas';
import { arrecadar } from './arrecadar';
import { pagarTropa } from './pagar-tropa';
import { processarObras } from './processar-obras';
import { resolverMarchas } from './resolver-marchas';

/** Vira o turno e devolve tudo o que virou notícia. */
export function passarTurno(nucleo: NucleoDaCampanha): EfemerosDaCampanha {
  const jogador = nucleo.estado.jogador;
  if (jogador === null) throw new Error('a campanha ainda não começou');
  // A capital caída trava a virada do JOGADOR: o GDD manda escolher outra antes de
  // continuar, e deixar o mundo andar com a pergunta aberta faria dela um detalhe.
  // ⚠️ Só trava quem TEM onde escolher: o exilado, sem chão nenhum, precisa que o mundo
  // ande — é marchando e assaltando que ele volta a ter uma capital pra assentar.
  if (capitalPerdida(nucleo, jogador) && nucleo.territorios.temTerritorio(jogador)) {
    throw new Error('a capital caiu: assente outra antes de passar o turno');
  }

  arrecadar(nucleo);
  pagarTropa(nucleo);
  const fome = alimentar(nucleo);

  const rodada = resolverMarchas(nucleo);
  const quedasDeCapital = assentarCapitais(nucleo, rodada.conquistas);
  const revoltas = atualizarFelicidade(nucleo);
  crescerPopulacao(nucleo);
  processarObras(nucleo);

  nucleo.estado.ano = avancarAno(nucleo.estado.ano, nucleo.ajustes.anosPorTurno);
  nucleo.estado.turno += 1;
  nucleo.mobilizacao.concluirFormacoes(nucleo.estado.turno, (id) => donoDe(nucleo, id));

  return { rodada, fome, quedasDeCapital, revoltas };
}
