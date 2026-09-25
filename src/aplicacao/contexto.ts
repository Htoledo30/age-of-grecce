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

import type { Ajustes, Ia } from '@/dados/esquema';
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
import type { ExercitoFicha } from '@/ui/exercito-ficha/exercito-ficha';
import type { FichaProvincia } from '@/ui/ficha-provincia/ficha-provincia';
import type { FimDeJogo } from '@/ui/fim-de-jogo';
import type { Governo } from '@/ui/governo';
import type { RotulosMapa } from '@/ui/rotulos-mapa';
import type { HostesMapa } from '@/ui/hostes-mapa';
import type { InicioJogo } from '@/ui/inicio-jogo';
import type { MarchasMapa } from '@/ui/marchas-mapa';
import type { Diplomacia } from '@/ui/diplomacia';
import type { Mercado } from '@/ui/mercado';
import type { PainelFps } from '@/ui/painel-fps';
import type { PainelLateral } from '@/ui/painel-lateral';
import type { JanelaDeConstrucoes } from '@/ui/construcoes';
import type { Recrutamento } from '@/ui/recrutamento';
import type { MenuPausa } from '@/ui/menu-pausa';

/** Todos os pedaços de interface em pé, montados por `montar-tela.ts`. */
export interface Tela {
  /** A moldura que segura ficha e comandos. Some inteira quando não há província escolhida. */
  painelProvincia: HTMLElement;
  ficha: FichaProvincia;
  acoes: AcoesProvincia;
  construcoes: JanelaDeConstrucoes;
  recrutamento: Recrutamento;
  exercitoFicha: ExercitoFicha;
  barraTurno: BarraTurno;
  governo: Governo;
  balanco: Balanco;
  balancoAlimentar: BalancoAlimentar;
  mercado: Mercado;
  diplomacia: Diplomacia;
  cronica: Cronica;
  batalha: JanelaDeBatalha;
  inicio: InicioJogo;
  fimDeJogo: FimDeJogo;
  rotulosMapa: RotulosMapa;
  hostesMapa: HostesMapa;
  cercosMapa: CercosMapa;
  marchasMapa: MarchasMapa;
  animacaoDeMarcha: AnimacaoDeMarcha;
  painelFps: PainelFps;
  lateral: PainelLateral;
  pausa: MenuPausa;
}

/** Em que pé o jogo está para quem desenha: menu, escolha de poder, ou campanha. */
export type FaseDoJogo = 'menu' | 'escolha' | 'campanha';

/** O que o jogador tem escolhido AGORA. Tudo efêmero, tudo de tela. */
export class SelecaoDaTela {
  fase: FaseDoJogo = 'menu';

  /** O ID da província escolhida — não uma ficha montada, que envelheceria. */
  provincia: string | null = null;

  /**
   * De quem é o ponto de vista do MODO DE RELAÇÕES, ou `null` quando o mapa está político.
   *
   * ⚠️ **Estado de tela, e por isso não vai para o disco.** Modo de mapa é como o jogador
   * está olhando, não o que o mundo é: salvar isto faria retomar uma partida devolver o mapa
   * pintado de uma pergunta que ele já respondeu. Ver `vistas/mapa-de-relacoes.ts`.
   */
  relacoesDe: string | null = null;

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
   * Modo, e não intenção guardada: enquanto ele existe, **qualquer província do mapa é um
   * destino** e o clique nela é a ordem. Nada é reservado, nada é gasto até o clique.
   */
  marchando: string | null = null;

  /**
   * A província sob o PONTEIRO enquanto o jogador escolhe destino.
   *
   * ⚠️ **É o campo que substitui os 199 botões de destino, e ele nasceu de uma medição.**
   * A tela desenhava, de uma vez, a rota até TODOS os destinos alcançáveis — quatro sem
   * Porto, cento e noventa e nove com ele, porque o mar abre o mapa inteiro. Medido com GPU
   * de verdade na máquina do Henrique: o quadro ia de 7 ms para **405 ms — 2,4 quadros por
   * segundo** —, e a conta era 100% PINTURA das polilinhas. Com as camadas escondidas e todo
   * o JavaScript rodando igual, o quadro voltava aos mesmos 7 ms: a busca de rotas custa
   * 0,1 ms e nunca foi o problema.
   *
   * Henrique, jogando: *"não faz sentido já ter todas as rotas à mostra, ou pontos. igual em
   * age of history 2: eu clico na minha tropa e movo ela para onde eu quiser só selecionando
   * uma província/zona"*. Com uma rota por vez — a do lugar para onde ele está olhando — o
   * mesmo quadro custa 21 ms. O desenho que ele pediu e o conserto do travamento são a mesma
   * mudança, e não duas.
   */
  destinoApontado: string | null = null;

  /**
   * Por que o último clique de destino não virou ordem. Vazio quando não houve recusa.
   *
   * ⚠️ **Existe porque, sem os botões, não existe mais "clicar fora".** Antes os alvos legais
   * estavam desenhados e um clique em qualquer outro lugar cancelava em silêncio — o que era
   * certo, porque o jogador não podia errar. Agora o mapa inteiro aceita o clique, e clicar
   * em Corinto sem guerra declarada precisa de RESPOSTA: `avaliarOrdem` já sabe dizer *"não
   * há caminho livre até Corinto"* e *"Corinto não está em guerra com você — declare antes de
   * marchar"*, e esses motivos nunca tinham onde aparecer.
   */
  recusaDaMarcha = '';

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
  /** QUEM é cada IA. Lido uma vez no boot, como o resto dos dados. */
  readonly ia: Ia;
  readonly cena: CenaMapa;
  readonly tela: Tela;
  readonly selecao: SelecaoDaTela;
}
