/**
 * A IA formando LIGA — **e ela é a decisão mais cara da mesa, dos dois lados.**
 *
 * Para o chefe, uma liga é renda e exército emprestado sem os custos de conquistar: nada de
 * povo estrangeiro no humor, nada de corrupção por distância, nada de guarnição. Para o membro
 * é obediência comprada com proteção — e ele só a compra quando a alternativa é pior.
 *
 * ⚠️ **Como na aliança: a RAZÃO é do par, a VONTADE é de cada um.** O chefe precisa de um
 * candidato que valha a pena e o membro precisa de um motivo para se dobrar; mas ninguém entra
 * numa liga com quem pretende atacar, e isso se pergunta nos dois sentidos.
 *
 * ## Os três portões
 *
 * 1. **O chefe tem de ser MUITO maior.** Ninguém se dobra a um igual, e um chefe que não
 *    protege não vale o tributo. É a mesma vantagem de porte que segura o membro dentro da liga
 *    depois — ver `parcelasDoDesejo`.
 * 2. **O membro tem de ter razão**: ele está ameaçado, ou é pequeno demais para se defender.
 * 3. **E a opinião tem de alcançar `opiniaoMinima`**, que é a mais alta da mesa inteira. Servir
 *    pede mais confiança que qualquer acordo — inclusive que a aliança.
 */

import type { Campanha } from '@/campanha/campanha';
import type { EstiloDeIa, Ia } from '@/dados/esquema';
import { estiloDe } from '../estilo';
import { estaAmeacado, forcaTotalDe } from '../percepcao/ameaca';

/**
 * Quantas vezes maior o chefe precisa ser, em províncias, para alguém se dobrar a ele.
 *
 * ⚠️ Não é balanço solto: é a mesma ideia da vantagem de porte que segura o membro dentro da
 * liga. Um chefe que não é claramente maior não protege ninguém, e a liga viraria um acordo
 * entre iguais — que é o que a ALIANÇA já é, e de graça.
 */
const VEZES_MAIOR = 2;

/** Este poder se dobraria àquele — e não apenas gosta dele? */
function temRazaoParaServir(campanha: Campanha, membro: string, chefe: string): boolean {
  const meu = campanha.provinciasDe(membro).length;
  const dele = campanha.provinciasDe(chefe).length;
  if (dele < meu * VEZES_MAIOR) return false;
  // Ameaçado, ou fraco demais em armas para se defender sozinho: os dois compram proteção.
  return estaAmeacado(campanha, membro) || forcaTotalDe(campanha, chefe) > forcaTotalDe(campanha, membro) * VEZES_MAIOR;
}

/**
 * Este poder ACEITA servir na liga daquele? Razão e vontade, as duas.
 *
 * ⚠️ **É a mesma pergunta que a IA faz a si mesma antes de entrar numa liga — e a proposta do
 * jogador pulava as duas.** `aoFormarLiga` só olhava a regra (a opinião mínima), e o jogador
 * punha na liga um reino que nenhuma IA convidaria. A balança da liga vem depois; até lá, a
 * pergunta é esta, nas duas direções.
 */
export function aceitaServir(
  campanha: Campanha,
  membro: string,
  chefe: string,
  estilo: EstiloDeIa,
): boolean {
  return (
    temRazaoParaServir(campanha, membro, chefe) &&
    campanha.relacaoEntre(membro, chefe) > estilo.relacaoParaDeclarar
  );
}

/**
 * O reino que este poder poria na liga dele AGORA, ou `null`.
 *
 * ⚠️ **Só entre vizinhos que já não vão se atacar.** Ao contrário da aliança, que faz sentido
 * através do mar por um inimigo em comum, a liga é sobre mandar em quem está do lado: quem não
 * te alcança não te protege, e quem não te alcança tu não sustenta.
 */
export function ligaEscolhida(
  campanha: Campanha,
  idPoder: string,
  estilo: EstiloDeIa,
  dados: Ia,
): string | null {
  // Quem já serve a alguém não lidera, e quem lidera não entra na liga de outro.
  if (campanha.chefeDe(idPoder) !== undefined) return null;

  let escolhido: string | null = null;
  let melhor = 0;
  // Em ordem de id: a mesma partida forma as mesmas ligas em qualquer máquina.
  for (const outro of [...campanha.poderesComFicha()].sort()) {
    if (outro === idPoder) continue;
    if (!campanha.podeFormarLiga(outro, idPoder).pode) continue;
    // Ninguém convida quem pretende atacar, e ninguém serve a quem pretende atacá-lo.
    if (campanha.relacaoEntre(idPoder, outro) <= estilo.relacaoParaDeclarar) continue;
    if (!aceitaServir(campanha, outro, idPoder, estiloDe(dados, outro))) continue;
    // Entre dois candidatos, o que rende mais: a liga é, antes de tudo, renda.
    const renda = campanha.rendaDe(outro);
    if (renda <= melhor) continue;
    melhor = renda;
    escolhido = outro;
  }
  return escolhido;
}

/**
 * O nível de tributo que este chefe cobraria deste membro agora, ou `null` se já é o certo.
 *
 * ⚠️ **É a mesma política do imposto de uma província, e de propósito.** Aperta quem está
 * contente, alivia quem está prestes a sair. Sem isto o chefe cobraria para sempre o nível com
 * que a liga nasceu, e o botão mais interessante da liga seria só do jogador.
 */
export function tributoEscolhidoDaLiga(
  campanha: Campanha,
  membro: string,
  niveis: Readonly<Record<string, { desejo: number }>>,
  limiarDaRevolta: number,
): string | null {
  const vinculo = campanha.ligaDe(membro);
  if (vinculo === undefined) return null;
  const nomes = Object.keys(niveis).sort((a, b) => niveis[a]!.desejo - niveis[b]!.desejo);
  const maisLeve = nomes[0];
  const maisPesado = nomes.at(-1);
  if (maisLeve === undefined || maisPesado === undefined) return null;

  // Perto da revolta, alivia. Longe dela e contente, aperta. No meio, deixa como está.
  const perto = vinculo.desejoDeSair >= limiarDaRevolta * 0.7;
  const folgado = vinculo.desejoDeSair <= limiarDaRevolta * 0.35;
  const desejado = perto ? maisLeve : folgado ? maisPesado : vinculo.tributo;
  return desejado === vinculo.tributo ? null : desejado;
}

/**
 * O membro que este chefe pediria para anexar agora, ou `null`.
 *
 * ⚠️ **Só quem já aceitaria.** Pedir a quem diria não seria pedir para ouvir não — e o
 * jogador, que recebe o pedido como proposta, veria uma pergunta que ele nunca vai responder
 * sim. `aceitaSerAnexado` é o portão, e ele é o desejo de sair no chão.
 */
export function anexacaoEscolhida(campanha: Campanha, idPoder: string): string | null {
  for (const membro of campanha.membrosDe(idPoder)) {
    if (campanha.aceitaSerAnexado(membro)) return membro;
  }
  return null;
}
