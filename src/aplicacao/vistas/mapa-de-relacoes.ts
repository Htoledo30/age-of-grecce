/**
 * O MODO DE RELAÇÕES: o mapa deixa de responder "de quem é" e passa a responder "o que
 * acham dele".
 *
 * Pedido de Henrique: *"preciso saber qual a relação de um reino com outro reino (...) uma
 * opção que mostra a cor de um reino que eu selecionar e em volta vermelho, amarelo ou verde
 * para demonstrar a relação daquele reino com outros reinos"*.
 *
 * ⚠️ **Nenhuma camada nova, nenhuma geometria nova.** O mapa político já é uma textura de
 * índices lida contra uma paleta de 256×256; trocar o SIGNIFICADO da cor é reescrever a
 * paleta e mais nada. A fronteira, o litoral e a seleção continuam funcionando iguais — e é
 * por isso que este modo custou um arquivo e não um sistema.
 *
 * ## A régua
 *
 * Cinco casos, e cada um responde a uma pergunta diferente:
 *
 * - **o próprio sujeito** — em osso, uma cor que não está na régua. É a âncora, e não uma
 *   resposta: pintá-lo com a tinta dele o misturava às faixas de opinião;
 * - **em guerra** — o vermelho mais escuro. Guerra não é uma opinião muito ruim: é outra
 *   coisa, e misturá-la na régua faria o inimigo declarado parecer um vizinho antipático;
 * - **hostil / neutro / amigo** — vermelho, âmbar e verde, pela opinião. São as três palavras
 *   que Henrique usou, e três faixas se leem de relance onde um gradiente contínuo não se lê;
 * - **sem relação** — cinza. Os 121 poderes sem economia não têm opinião nenhuma, e pintá-los
 *   de âmbar por terem zero faria o mapa inteiro parecer neutro quando ele está mudo.
 */

import type { Campanha } from '@/campanha/campanha';
import type { Atlas } from '@/mundo/atlas';

/**
 * O mínimo de que esta conta precisa.
 *
 * ⚠️ Pede as duas peças e não o `Jogo` inteiro de propósito: assim ela roda no vitest contra
 * uma campanha nua, sem cena, sem tela e sem Pixi. Uma vista que exige o mundo montado é uma
 * vista que só se confere jogando.
 */
type MundoDaRelacao = { campanha: Campanha; atlas: Atlas };

type Cor = readonly [number, number, number];

/** A cor de cada faixa. Fora de `tokens.css` porque quem lê isto é a GPU, não o CSS. */
const EM_GUERRA: Cor = [138, 40, 38];
const HOSTIL: Cor = [178, 84, 58];
const NEUTRO: Cor = [186, 158, 78];
const AMIGO: Cor = [96, 150, 96];
const SEM_RELACAO: Cor = [86, 92, 92];
/**
 * O reino escolhido, em osso.
 *
 * ⚠️ **Não a cor dele, e a diferença importa.** Pintar o sujeito com a própria tinta o
 * misturava à régua: o azul de Atenas parecia mais uma faixa de opinião. Uma cor que não está
 * na escala diz "este aqui é a pergunta, não a resposta".
 */
const O_ESCOLHIDO: Cor = [226, 216, 190];

/** Onde a opinião deixa de ser hostil, e onde ela passa a ser amizade. */
const HOSTIL_ATE = -25;
const AMIGO_ACIMA = 25;

/** O que cada cor quer dizer, para a legenda do painel. Uma fonte só para as duas. */
export const FAIXAS_DE_RELACAO: readonly { rotulo: string; cor: string }[] = [
  { rotulo: 'o escolhido', cor: hex(O_ESCOLHIDO) },
  { rotulo: 'em guerra', cor: hex(EM_GUERRA) },
  { rotulo: `hostil (até ${HOSTIL_ATE})`, cor: hex(HOSTIL) },
  { rotulo: 'indiferente', cor: hex(NEUTRO) },
  { rotulo: `amigo (${AMIGO_ACIMA}+)`, cor: hex(AMIGO) },
  { rotulo: 'sem relação', cor: hex(SEM_RELACAO) },
];

/**
 * A cor de cada província no modo de relações, do ponto de vista de `sujeito`.
 *
 * Devolve uma função e não um mapa pronto: quem repinta percorre as províncias na ordem do
 * assado, e montar um `Record` aqui seria a mesma varredura duas vezes.
 */
export function coresDasRelacoes(
  mundo: MundoDaRelacao,
  sujeito: string,
): (idProvincia: string) => Cor | null {
  const { campanha, atlas } = mundo;
  // A conta é por PODER e não por província: dezessete respostas servem duzentas e quarenta
  // e quatro perguntas, e a opinião não muda de uma terra dele para a outra.
  const porPoder = new Map<string, Cor>();
  const corDoPoder = (idPoder: string): Cor => {
    const guardada = porPoder.get(idPoder);
    if (guardada) return guardada;
    const cor = calcular(campanha, sujeito, idPoder);
    porPoder.set(idPoder, cor);
    return cor;
  };

  return (idProvincia) => {
    if (atlas.ehMar(idProvincia)) return null;
    const dono = campanha.donoDe(idProvincia);
    return dono === '' ? null : corDoPoder(dono);
  };
}

function calcular(campanha: Campanha, sujeito: string, idPoder: string): Cor {
  if (idPoder === sujeito) return O_ESCOLHIDO;
  // ⚠️ Sem ficha não há opinião: a relação desses poderes nunca anda, e mostrá-los como
  // "indiferentes" seria dar por resposta um número que ninguém calculou.
  if (campanha.semEconomia(idPoder) > 0 || campanha.semEconomia(sujeito) > 0) {
    return SEM_RELACAO;
  }
  if (campanha.emGuerra(sujeito, idPoder)) return EM_GUERRA;
  const opiniao = campanha.relacaoEntre(sujeito, idPoder);
  if (opiniao <= HOSTIL_ATE) return HOSTIL;
  return opiniao >= AMIGO_ACIMA ? AMIGO : NEUTRO;
}

function hex(cor: Cor): string {
  return `#${cor.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}
