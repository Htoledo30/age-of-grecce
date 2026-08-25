/**
 * O núcleo: o que todo módulo de regra da campanha recebe — e nada além disso.
 *
 * A `Campanha` deixou de ser a classe que sabe tudo e virou uma **fachada**: ela guarda
 * este núcleo, delega cada regra ao módulo que a escreve e avisa quem desenha. Os módulos
 * são funções livres que recebem o núcleo como primeiro argumento.
 *
 * ⚠️ **Nenhum módulo chama `aoMudar`.** Quem notifica é a fachada, sempre — assim existe
 * um lugar só que sabe quando a tela precisa se redesenhar, e não trinta.
 *
 * O núcleo é `readonly` nas REFERÊNCIAS, não no conteúdo: `Territorios` guarda a tabela
 * viva de donos e `Mobilizacao` guarda o próprio objeto de estado, então trocar qualquer
 * um destes objetos por outro deixaria os dois lendo um mundo que não existe mais.
 */

import type { Ajustes, Construcoes, Economia } from '@/dados/esquema';
import type { Atlas } from '@/mundo/atlas';
import type { Mobilizacao } from '@/combate/mobilizacao/mobilizacao';
import type { EstadoCampanha } from './estado-campanha';
import type { Territorios } from './territorios';

type AjustesDoJogo = Ajustes['jogo'];
/**
 * Que tipo de coisa uma obra faz. É o vocabulário do catálogo, num nome só.
 *
 * A IA valoriza obra por TIPO e não por id de prédio, e é isso que faz um prédio novo com
 * efeito conhecido entrar sozinho na conta dela.
 */
export type TipoDeEfeito = Construcoes['construcoes'][string]['efeito']['tipo'];

export type CatalogoDeConstrucoes = Construcoes['construcoes'];

export interface NucleoDaCampanha {
  readonly atlas: Atlas;
  readonly economia: Economia;
  readonly catalogo: CatalogoDeConstrucoes;
  readonly ajustes: AjustesDoJogo;
  readonly estado: EstadoCampanha;
  readonly territorios: Territorios;
  readonly mobilizacao: Mobilizacao;
  /**
   * Distâncias em saltos a partir de cada capital já consultada.
   *
   * Cache que nunca expira DE PROPÓSITO: o grafo de vizinhança é geografia assada e não
   * muda durante a partida. Trocar a capital só troca a CHAVE consultada; a política —
   * quem é dono do meio do caminho — não entra na conta, e é por isso que o cache é
   * seguro. Uma busca em largura de 196 províncias por capital, uma vez cada.
   */
  readonly saltosPorCapital: Map<string, ReadonlyMap<string, number>>;
}

/** Por que uma ação foi recusada. A interface mostra o motivo em vez de sumir. */
export type Recusa = { pode: true; bonus: number } | { pode: false; motivo: string };

/**
 * Pode ou não pode, com o motivo quando não pode.
 *
 * Igual a `Recusa` sem o `bonus`, que é coisa da mobilização. Toda permissão do jogo
 * devolve o MOTIVO em vez de só esconder o controle: é a interface que escreve a frase.
 */
export type Permissao = { pode: true } | { pode: false; motivo: string };
