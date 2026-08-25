/**
 * O que toda função da aplicação recebe: **o jogo e a tela**, num objeto só.
 *
 * O `main.ts` era uma função de mil linhas onde tudo — vistas, eventos, laço, ganchos —
 * enxergava as mesmas variáveis livres por acidente de escopo. Este arquivo troca o
 * acidente por um contrato: quem precisa da campanha recebe `jogo.campanha`, quem precisa
 * saber o que o jogador escolheu recebe `jogo.selecao`.
 *
 * ⚠️ **A seleção é da TELA, não da partida.** Nada aqui vai pro disco: qual província está
 * aberta e qual hoste está compondo uma marcha são estado de interface, e retomar um
 * salvamento não deve reabrir a ficha que estava aberta antes.
 */

import type { Ajustes } from '@/dados/esquema';
import type { Atlas } from '@/mundo/atlas';
import type { Campanha } from '@/campanha/campanha';
import type { CenaMapa } from '@/mapa/cena-mapa';
import type { AcoesProvincia } from '@/ui/acoes-provincia';
import type { AnimacaoDeMarcha } from '@/ui/animacao-de-marcha';
import type { Balanco } from '@/ui/balanco';
import type { BalancoAlimentar } from '@/ui/balanco-alimentar';
import type { BarraTurno } from '@/ui/barra-turno';
import type { JanelaDeBatalha } from '@/ui/batalha';
import type { CercosMapa } from '@/ui/cercos-mapa';
import type { Cronica } from '@/ui/cronica';
import type { DestinosMapa } from '@/ui/destinos-mapa';
import type { ExercitoFicha } from '@/ui/exercito-ficha/exercito-ficha';
import type { FichaProvincia } from '@/ui/ficha-provincia/ficha-provincia';
import type { FimDeJogo } from '@/ui/fim-de-jogo';
import type { Governo } from '@/ui/governo';
import type { HostesMapa } from '@/ui/hostes-mapa';
import type { InicioJogo } from '@/ui/inicio-jogo';
import type { MarchasMapa } from '@/ui/marchas-mapa';
import type { Mercado } from '@/ui/mercado';
import type { PainelFps } from '@/ui/painel-fps';
import type { PainelLateral } from '@/ui/painel-lateral';
import type { Recrutamento } from '@/ui/recrutamento';

/** Todos os pedaços de interface em pé, montados por `montar-tela.ts`. */
export interface Tela {
  ficha: FichaProvincia;
  acoes: AcoesProvincia;
  recrutamento: Recrutamento;
  exercitoFicha: ExercitoFicha;
  barraTurno: BarraTurno;
  governo: Governo;
  balanco: Balanco;
  balancoAlimentar: BalancoAlimentar;
  mercado: Mercado;
  cronica: Cronica;
  batalha: JanelaDeBatalha;
  inicio: InicioJogo;
  fimDeJogo: FimDeJogo;
  hostesMapa: HostesMapa;
  cercosMapa: CercosMapa;
  marchasMapa: MarchasMapa;
  destinosMapa: DestinosMapa;
  animacaoDeMarcha: AnimacaoDeMarcha;
  painelFps: PainelFps;
  lateral: PainelLateral;
}

/** Em que pé o jogo está para quem desenha: menu, escolha de poder, ou campanha. */
export type FaseDoJogo = 'menu' | 'escolha' | 'campanha';

/** O que o jogador tem escolhido AGORA. Tudo efêmero, tudo de tela. */
export class SelecaoDaTela {
  fase: FaseDoJogo = 'menu';

  /** O ID da província escolhida — não uma ficha montada, que envelheceria. */
  provincia: string | null = null;

  /**
   * O ID da HOSTE escolhida, ou `null`.
   *
   * Seleção separada da província de propósito: clicar no marcador escolhe a tropa, clicar
   * no mapa escolhe o chão. São duas coisas diferentes no mesmo lugar.
   *
   * ⚠️ **Guardava a província, e isso passou a mentir.** Desde que sitiar deixou de engajar
   * o exército de dentro, o sitiante e a guarnição ficam na MESMA província — "a hoste
   * daquela província" não identifica nenhuma das duas.
   */
  hoste: string | null = null;

  /**
   * O ID da hoste que está compondo uma marcha, ou `null`.
   *
   * Modo, e não intenção guardada: enquanto ele existe, o mapa mostra destinos e um clique
   * fora deles cancela. Nada é reservado, nada é gasto — a ordem só acontece no clique no
   * destino.
   */
  marchando: string | null = null;

  /** Quantos homens o jogador quer mandar na próxima ordem. O painel é quem escreve. */
  homensParaMarchar = 0;

  /**
   * A ordem de recuo da próxima marcha: sair de campo se a batalha virar.
   *
   * Estado de TELA como o resto: é o que o jogador escolheu enquanto compõe a ordem, e some
   * quando ela é registrada. Quem guarda de verdade é a `OrdemDeMarcha`.
   */
  recuarNaProximaMarcha = false;

  /**
   * O destino HOSTIL já apontado, esperando o jogador dizer o que fazer ao chegar.
   *
   * ⚠️ Só existe para terra alheia. Destino amigo registra a ordem no clique, como sempre —
   * perguntar "assaltar ou sitiar?" para uma marcha dentro do próprio território seria pedir
   * uma decisão que não existe.
   */
  alvoHostil: string | null = null;

  /** Ids das HOSTES que acabaram de chegar; existem só durante o pulso. */
  readonly chegadasRecentes = new Set<string>();

  temporizadorDaChegada: number | undefined = undefined;
}

/** O jogo inteiro visto pela aplicação: regras, mundo, cena e tela. */
export interface Jogo {
  readonly atlas: Atlas;
  readonly campanha: Campanha;
  readonly ajustes: Ajustes;
  readonly cena: CenaMapa;
  readonly tela: Tela;
  readonly selecao: SelecaoDaTela;
}
