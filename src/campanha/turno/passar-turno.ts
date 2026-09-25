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

import { limparAcessosVencidos } from '../diplomacia/acesso-militar';
import { avancarAno } from '../estado-campanha';
import type { NucleoDaCampanha } from '../nucleo';
import type { EfemerosDaCampanha } from '../estado/efemeros';
import { alimentar } from '../alimentacao/aplicar-fome';
import { acertarImportacoes } from '../alimentacao/importacao';
import { rendaDe } from '../provincia/renda';
import { crescerPopulacao } from '../alimentacao/crescimento';
import { assentarCapitais, capitalPerdida } from '../governo/capital';
import { atualizarFelicidade } from '../sociedade/atualizar-felicidade';
import { donoDe } from '../provincia/consultas';
import { arrecadar } from './arrecadar';
import { pagarTropa } from './pagar-tropa';
import { processarObras } from './processar-obras';
import { resolverMarchas } from './resolver-marchas';
import { andarLigas, limparLigasMortas } from './andar-ligas';

/** Vira o turno e devolve tudo o que virou notícia. */
import {
  acertarTributos,
  andarRelacoes,
  andarReputacao,
  limparGuerrasMortas,
  limparTregoas,
} from '../diplomacia/relacoes';
import { poderesComFicha } from '../governo/poderes';

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

  // ⚠️ ANTES de arrecadar, e a ordem é o desenho: a renda já carrega o tributo dentro dela, nos
  // dois sentidos, então o que precisa acontecer primeiro é decidir quais tributos ainda existem
  // neste turno. Quem perdeu a terra que sustentava a promessa quebra aqui, e não paga mais.
  acertarTributos(nucleo);
  // Pela mesma razão, e depois dos tributos porque eles mudam a renda: o grão que o tesouro não
  // consegue pagar deixa de ser encomendado antes de a conta fechar.
  acertarImportacoes(nucleo, (id) => rendaDe(nucleo, id));
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
  // Depois de o turno andar, e não antes: a trégua que vence NESTE turno já não segura mais.
  // Sem esta limpeza o registro cresceria para sempre com pares que não significam mais nada.
  limparTregoas(nucleo);
  // A licença de passagem vence como a trégua, e some pela mesma razão.
  limparAcessosVencidos(nucleo);
  // ⚠️ A mesa de propostas NÃO se limpa aqui. A IA joga ANTES desta virada, e limpar agora
  // apagava o pedido dela antes de o jogador vê-lo. Quem esvazia é a jogada seguinte da IA,
  // ver `diplomacia/propostas.ts`.
  // A opinião anda um passo por turno, como o humor do povo — e pelos mesmos motivos.
  andarRelacoes(nucleo, poderesComFicha(nucleo));
  // A reputação volta devagar para zero e os pactos vencidos somem.
  andarReputacao(nucleo);
  // E a guerra contra quem não existe mais acaba sozinha: ver `limparGuerrasMortas`.
  limparGuerrasMortas(nucleo);
  // ⚠️ A liga anda DEPOIS da limpeza das guerras: quem perdeu o chão sai dela sem revolta e sem
  // preço, e só então o desejo de quem sobrou dá o passo do turno.
  limparLigasMortas(nucleo);
  const revoltasDaLiga = andarLigas(nucleo);

  // ⚠️ A notícia diplomática NÃO nasce aqui: ela é anotada quando a guerra é declarada, antes
  // de o turno virar. A fachada a carrega por cima desta lista — ver `Campanha.passarTurno`.
  return { rodada, fome, quedasDeCapital, revoltas, revoltasDaLiga, diplomacia: [] };
}
