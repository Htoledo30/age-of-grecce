/**
 * O que a ficha do exército precisa saber sobre a hoste selecionada.
 *
 * A separação que vale, e que deu origem a este painel: **recrutar é uma ação da PROVÍNCIA;
 * dispensar e marchar são ações da HOSTE.** São seleções diferentes e viram painéis
 * diferentes — assim que a hoste marchar, ela deixa de ter relação com o lugar onde foi
 * levantada.
 */

import type { Postura } from '@/combate/cerco';

/** De onde saiu um pedaço da hoste, e se aquela terra ainda é de quem a comanda. */
interface OrigemDaHoste {
  provincia: string;
  nome: string;
  homens: number;
  /** A terra natal destes homens caiu para outro poder. */
  perdida: boolean;
  /** Quem manda nela agora. Só interessa quando `perdida`. */
  donoAtual: string;
}

export interface VistaDoExercito {
  /**
   * Quem ela e. **E a chave de todo comando que a ficha emite.**
   *
   * Era a provincia, e isso passou a mentir quando sitiar deixou de engajar: numa cidade
   * sitiada ha duas hostes, e "a hoste da provincia" nao identifica nenhuma das duas.
   */
  hoste: { id: string };
  /** Onde ela esta. Titulo da ficha e texto do cerco — nunca endereco. */
  provincia: { id: string; nome: string };
  poder: { nome: string; cor: string };
  forca: number;
  manutencao: number;
  /** A hoste está parada em terra que não é do dono dela. */
  emTerraAlheia: boolean;
  /** É do jogador? Só a dele aceita comando. */
  minha: boolean;
  origens: readonly OrigemDaHoste[];
  /** Quantas províncias ela alcança daqui. Zero desabilita a marcha, dizendo por quê. */
  destinos: number;
  /** O jogador já mandou marchar e está escolhendo o destino no mapa. */
  marchando: boolean;
  /**
   * A ordem já registrada para esta hoste nesta rodada, se houver.
   *
   * Enquanto ela existe, a hoste não aceita outra: **uma ordem por hoste por rodada.**
   */
  ordem: { destino: string; homens: number } | null;
  /**
   * O alvo HOSTIL já apontado no mapa, esperando o jogador dizer o que fazer ao chegar.
   *
   * ⚠️ A pergunta só existe para terra alheia, e só depois de o alvo ser escolhido. Perguntar
   * antes seria pedir uma decisão sobre um lugar que o jogador ainda não olhou; perguntar
   * numa marcha dentro do próprio território seria pedir uma decisão que não existe.
   */
  alvo: {
    nome: string;
    /**
     * Quantas rodadas de cerco a muralha do alvo exige antes de um assalto. Zero na cidade
     * aberta.
     *
     * A pergunta é feita ANTES de a hoste sair, e a resposta muda a decisão: contra uma
     * cidade murada, "Assaltar" não é uma escolha que exista naquele dia.
     */
    rodadasDeCercoExigidas: number;
  } | null;
  /**
   * A surtida ao alcance desta hoste: sair para atacar quem cerca a cidade onde ela está.
   *
   * `null` quando não há cerco inimigo ali — e aí não há pergunta a fazer. É a única decisão
   * que o SITIADO tem: sitiar não engaja, então sem isto o exército de dentro fica olhando o
   * de fora para sempre.
   */
  surtida: { contra: string; declarada: boolean } | null;
  /**
   * O cerco que ESTA hoste está conduzindo onde ela está, se houver.
   *
   * Fica na ficha da hoste e não na da província porque quem decide assaltar ou continuar
   * sentado é o comandante, não a cidade.
   */
  cerco: {
    postura: Postura;
    /** Zero libera o assalto; acima disso, é quanto ainda falta de cerco. */
    faltamParaAssaltar: number;
  } | null;
}

export function numero(valor: number): string {
  return valor.toLocaleString('pt-BR');
}
