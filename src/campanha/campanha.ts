/**
 * A campanha: dona do estado e **a porta de entrada de todas as regras** — não a dona
 * delas.
 *
 * Cada regra mora no módulo que a escreve (`turno/`, `alimentacao/`, `sociedade/`,
 * `governo/`, `guerra/`, `provincia/`, `estado/`); a fachada guarda o núcleo, delega e
 * avisa quem desenha. Ela já foi o arquivo que sabia tudo, com 1.900 linhas, e isso é
 * exatamente o que não pode voltar a acontecer: **regra nova nasce em módulo próprio**, e o
 * que aparece aqui é uma linha de encaminhamento.
 *
 * As PERGUNTAS ficam nas camadas de `fachada/` — reino, província, guerra. Este arquivo
 * guarda os **COMANDOS**: tudo o que muda o mundo, e por isso tudo o que avisa. É a regra
 * que mantém a tela honesta: **só a fachada chama `aoMudar`**, nenhum módulo chama, e por
 * isso existe um lugar só que sabe quando a interface precisa se redesenhar.
 *
 * **Não importa Pixi e não toca no DOM, de propósito.** É isso que deixa o conjunto de
 * regras inteiro rodar no vitest (que roda em Node, sem navegador) contra os dados de
 * verdade — turno, renda e imposto ficam sob teste sem subir uma tela.
 */

import type { Arma } from '@/combate/exercito';
import type { Postura } from '@/combate/cerco';
import type { NivelDeImposto } from './economia';
import type { EstadoCampanha } from './estado-campanha';
import { efemerosVazios } from './estado/efemeros';
import { restaurarEstado } from './estado/restaurar-estado';
import { ComandosDaDiplomacia } from './fachada/comandos-da-diplomacia';
import { mudarCapital } from './governo/capital';
import { definirImposto } from './governo/decreto-de-imposto';
import { definirImportacao } from './alimentacao/importacao';
import { darOuro } from './governo/tesouro';
import { mudarPostura } from './guerra/cercos';
import { recrutar } from './guerra/levas';
import { cancelarOrdem, ordenarMarcha } from './guerra/marchas';
import { surtir } from './guerra/surtidas';
import { construir, demolir } from './provincia/construcoes';
import { trocarDono } from './provincia/posse';
import { passarTurno } from './turno/passar-turno';

export class Campanha extends ComandosDaDiplomacia {
  // ── A partida ───────────────────────────────────────────────────────────────────────
  /** Escolhe o poder do jogador e abre o turno 1. Só acontece uma vez. */
  comecar(idPoder: string): void {
    if (this.iniciada) throw new Error('a campanha já começou');
    this.poder(idPoder); // valida antes de gravar
    this.nucleo.estado.jogador = idPoder;
    this.nucleo.estado.turno = 1;
    this.aoMudar();
  }

  /** Vira o turno. A ordem das etapas está escrita em `turno/passar-turno.ts`. */
  passarTurno(): void {
    // ⚠️ **A notícia diplomática atravessa a virada, e é a única que atravessa.** Declarar
    // guerra e assinar a paz acontecem ANTES de o turno virar — é o clique do jogador e a
    // decisão da IA, não a resolução das marchas. Se ela fosse apagada junto com o resto, a
    // crônica mostraria a batalha sem nunca ter mostrado a declaração que a causou.
    const diplomacia = this.efemeros.diplomacia;
    this.efemeros = { ...passarTurno(this.nucleo), diplomacia };
    this.aoMudar();
  }

  /** Substitui o estado pelo de um salvamento, depois de conferi-lo contra o mundo. */
  restaurar(salvo: EstadoCampanha): void {
    restaurarEstado(this.nucleo, salvo);
    // Efêmeros não viajam: a notícia da rodada salva pertence à sessão que a viveu.
    this.efemeros = efemerosVazios();
    this.aoMudar();
  }

  // ── Governo ─────────────────────────────────────────────────────────────────────────
  /** Passa uma província de um dono a outro, **sem regra de guerra nenhuma**. */
  trocarDono(idProvincia: string, idPoder: string): void {
    if (trocarDono(this.nucleo, idProvincia, idPoder)) this.aoMudar();
  }

  /** Decreta o nível de imposto: efeito imediato na renda, gradual no humor. */
  definirImposto(idProvincia: string, nivel: NivelDeImposto, porPoder?: string): void {
    definirImposto(this.nucleo, idProvincia, nivel, porPoder ?? this.nucleo.estado.jogador);
    this.aoMudar();
  }

  /** Encomenda grão de fora: pontos de comida pagos em ouro todo turno. */
  definirImportacao(pontos: number, porPoder?: string): void {
    definirImportacao(this.nucleo, porPoder ?? this.nucleo.estado.jogador, pontos);
    this.aoMudar();
  }

  /** Assenta a capital do jogador aqui, cobrando o custo da mudança voluntária. */
  mudarCapital(idProvincia: string): void {
    mudarCapital(this.nucleo, idProvincia);
    this.aoMudar();
  }

  /** Ergue uma construção. Paga à vista e entrega depois; não existe cancelar. */
  /** Derruba uma construção e libera o slot. Não devolve moeda — ver `demolir`. */
  demolir(idProvincia: string, idConstrucao: string, porPoder?: string): void {
    demolir(this.nucleo, idProvincia, idConstrucao, porPoder ?? this.nucleo.estado.jogador);
    this.aoMudar();
  }

  construir(idProvincia: string, idConstrucao: string, porPoder?: string): void {
    construir(this.nucleo, idProvincia, idConstrucao, porPoder ?? this.nucleo.estado.jogador);
    this.aoMudar();
  }

  // ── Guerra ──────────────────────────────────────────────────────────────────────────
  /** Põe gente em armas: cobra o ouro e tira os homens da população da província. */
  recrutar(idProvincia: string, homens: number, arma: Arma = 'leve', porPoder?: string): void {
    recrutar(this.nucleo, idProvincia, homens, arma, porPoder ?? this.nucleo.estado.jogador);
    this.aoMudar();
  }

  /** Manda gente pra casa: cada um volta à SUA província de origem. */
  dispensar(idProvincia: string, homens: number): void {
    this.nucleo.mobilizacao.dispensar(idProvincia, homens);
    this.aoMudar();
  }

  /** O mesmo, dizendo QUAL hoste. É o que a interface usa. */
  dispensarHoste(idHoste: string, homens: number): void {
    this.nucleo.mobilizacao.dispensarDe(idHoste, homens);
    this.aoMudar();
  }

  /** Registra a ordem de marcha. **Nada se move agora.** */
  ordenarMarcha(
    idHoste: string,
    destino: string,
    homens: number,
    porPoder: string | null = this.nucleo.estado.jogador,
    postura: Postura = 'sitiar',
    /** `null` (o padrão) é lutar até a linha ceder. Ver `OrdemDeMarcha.recuarAos`. */
    recuarAos: number | null = null,
  ): void {
    ordenarMarcha(this.nucleo, idHoste, destino, homens, porPoder, postura, recuarAos);
    this.aoMudar();
  }

  /** Desfaz a ordem desta hoste — e a surtida junto, que é a mesma decisão. */
  cancelarOrdem(idHoste: string): void {
    if (cancelarOrdem(this.nucleo, idHoste)) this.aoMudar();
  }

  /** Registra a surtida: o sitiado sai para atacar quem o cerca. */
  surtir(idHoste: string, porPoder: string | null = this.nucleo.estado.jogador): void {
    if (surtir(this.nucleo, idHoste, porPoder)) this.aoMudar();
  }

  /** Troca a postura de um cerco já em pé. Vale na PRÓXIMA virada, como toda ordem. */
  mudarPostura(
    idProvincia: string,
    postura: Postura,
    porPoder: string | null = this.nucleo.estado.jogador,
  ): void {
    if (mudarPostura(this.nucleo, idProvincia, postura, porPoder)) this.aoMudar();
  }

  // ── Ganchos de DESENVOLVIMENTO ──────────────────────────────────────────────────────
  // Nenhuma mecânica chama o que está aqui embaixo: são atalhos pra montar um cenário sem
  // jogar quinze turnos à mão. O gancho que os expõe vive atrás de `import.meta.env.DEV`.

  /** Põe ouro no tesouro. */
  darOuro(valor: number, idPoder: string | null = this.nucleo.estado.jogador): void {
    if (idPoder === null) return;
    darOuro(this.nucleo, idPoder, valor);
    this.aoMudar();
  }

  /** Tira gente de uma província, para pôr uma terra em crise sem esperar a fome. */
  matarPopulacao(idProvincia: string, quantos: number): void {
    this.nucleo.estado.populacao[idProvincia] = Math.max(
      0,
      this.populacaoDe(idProvincia) - quantos,
    );
    this.aoMudar();
  }

  /** Põe uma hoste de qualquer poder no mapa, pra montar um inimigo sem a IA existir. */
  plantarHoste(
    idProvincia: string,
    idPoder: string,
    homens: number,
    arma: Arma = 'leve',
    qualidade = 1,
  ): string {
    const id = this.nucleo.mobilizacao.plantar(idProvincia, idPoder, homens, arma, qualidade);
    this.aoMudar();
    return id;
  }
}
