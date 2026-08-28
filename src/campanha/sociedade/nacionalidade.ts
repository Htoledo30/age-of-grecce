/**
 * QUÃO ESTRANGEIRO É O REI AQUI — a pergunta que "domínio estrangeiro" fazia mal.
 *
 * A regra que existia era binária e cega: *"o dono de hoje é o mesmo de 700 a.C.?"*. Ela dava
 * o mesmo −12 para Atenas mandando em Elêusis — a dez quilômetros, jônia como ela, com 15% de
 * atenienses já morando lá — e para Atenas mandando na Beócia. E dava zero para Mégara
 * segurando Salamina, que é 20% ateniense. **A província sabia que tinha mudado de bandeira, e
 * não sabia de quem era o povo dela.**
 *
 * ## Duas camadas, e é o degrau entre elas que dá direção ao mapa
 *
 * Os dados já traziam as duas, e nenhuma regra as usava:
 *
 * - a **nacionalidade**, que é a cidade — ateniense, eleusina, megarense —, com FRAÇÃO da
 *   população em cada uma. Elêusis é 85% eleusina e 15% ateniense;
 * - o **povo**, que é a tribo grega da nacionalidade: jônio, dório, beócio, lócrio.
 *
 * Daí saem três degraus, e eles são a régua inteira:
 *
 * 1. **o meu próprio povo** — Atenas em Maratona. Não custa nada, e é o que torna barato
 *    unificar a Ática;
 * 2. **outra cidade da minha tribo** — Atenas em Elêusis. Incomoda; não é estrangeiro;
 * 3. **outra tribo** — Atenas em Mégara, jônio sobre dório. Este é o preço de império.
 *
 * ⚠️ **E é PROPORCIONAL à fatia do povo, não um carimbo na província.** Mégara segurando
 * Salamina paga pelos 20% de atenienses que vivem lá; Atenas segurando a mesma Salamina paga
 * pelos 80% de megarenses. A mesma terra cobra preços diferentes de donos diferentes, que é
 * exatamente o que uma cidade mista faz.
 *
 * ⚠️ **Sem dado, sem resposta.** As 171 províncias sem ficha não têm nacionalidade nenhuma:
 * elas devolvem zero e não recebem parcela. Inventar um povo para elas seria dar por
 * resposta um número que ninguém escreveu.
 */

import type { NucleoDaCampanha } from '../nucleo';
import { donoDe } from '../provincia/consultas';

/** Que fatia do povo daqui é estranha ao dono, e quão estranha. Frações de 0 a 1. */
export interface EstranhezaDoDominio {
  /** Outra cidade, a mesma tribo. Atenas em Elêusis. */
  mesmoPovo: number;
  /** Outra tribo. Atenas em Mégara. */
  outroPovo: number;
}

const NENHUMA: EstranhezaDoDominio = { mesmoPovo: 0, outroPovo: 0 };

/**
 * A nacionalidade do próprio poder — o povo DELE, e não o de quem ele governa.
 *
 * ⚠️ **Sai das terras que ele tinha em 700 a.C., e não das de hoje.** O povo de Atenas é
 * ateniense por mais Beócia que ela conquiste; derivar do território corrente faria a
 * identidade de um reino mudar junto com a fronteira dele, e um conquistador viraria aos
 * poucos o povo que ele conquistou.
 */
function nacionalidadeDoPoder(
  nucleo: NucleoDaCampanha,
  idPoder: string,
): string | undefined {
  const contagem = new Map<string, number>();
  for (const provincia of nucleo.atlas.terras) {
    if (provincia.dono !== idPoder) continue;
    const maior = majoritaria(nucleo.economia.provincias[provincia.id]?.nacionalidades);
    if (maior !== undefined) contagem.set(maior, (contagem.get(maior) ?? 0) + 1);
  }
  // Ordenado por id antes de comparar: com duas nacionalidades empatadas ganha a de menor id,
  // e a mesma campanha responde igual em qualquer máquina.
  let escolhida: string | undefined;
  let melhor = 0;
  for (const [id, quantas] of [...contagem].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (quantas > melhor) {
      melhor = quantas;
      escolhida = id;
    }
  }
  return escolhida;
}

/**
 * A TRIBO deste poder — jônio, dório, beócio, lócrio —, ou `undefined` se ele não tem ficha.
 *
 * ⚠️ **Exportada para a DIPLOMACIA, e não para a felicidade.** Aqui dentro o povo serve para
 * medir quanto um dono é estranho a quem ele governa; lá fora ele responde outra pergunta, e
 * mais simples: dois reinos são da mesma gente? Medido antes de existir, **82% dos 306 pares
 * de poderes ficavam em opinião zero para sempre** — a única parcela que a geografia produzia
 * era fronteira comum, então quem não te encosta não tinha como ter opinião nenhuma sobre ti.
 * A tribo já estava escrita no dado e não decidia nada fora da felicidade.
 */
export function povoDoPoder(nucleo: NucleoDaCampanha, idPoder: string): string | undefined {
  const nacionalidade = nacionalidadeDoPoder(nucleo, idPoder);
  if (nacionalidade === undefined) return undefined;
  return nucleo.economia.nacionalidades[nacionalidade]?.povo;
}

/**
 * O quanto o dono de hoje é estranho ao povo desta terra.
 *
 * As duas frações somam no máximo 1, e o que sobra é a fatia que se reconhece no rei.
 */
export function estranhezaEm(
  nucleo: NucleoDaCampanha,
  idProvincia: string,
): EstranhezaDoDominio {
  const povos = nucleo.estado.nacionalidades[idProvincia];
  if (povos === undefined) return NENHUMA;
  const doDono = nacionalidadeDoPoder(nucleo, donoDe(nucleo, idProvincia));
  if (doDono === undefined) return NENHUMA;
  const triboDoDono = nucleo.economia.nacionalidades[doDono]?.povo;

  let mesmoPovo = 0;
  let outroPovo = 0;
  for (const [id, fracao] of Object.entries(povos)) {
    if (id === doDono) continue;
    const tribo = nucleo.economia.nacionalidades[id]?.povo;
    if (tribo !== undefined && tribo === triboDoDono) mesmoPovo += fracao;
    else outroPovo += fracao;
  }
  return { mesmoPovo, outroPovo };
}

/**
 * A maioria do povo daqui não reconhece o dono? É o portão do LEVANTE.
 *
 * ⚠️ **Maioria, e não "existe um estrangeiro".** Mégara tem 20% de atenienses em Salamina, e
 * uma cidade não pega em armas contra o próprio governo por causa de um quinto dela. O que
 * levanta é a terra governada por quem o povo dela não é.
 */
export function povoEstranhoManda(nucleo: NucleoDaCampanha, idProvincia: string): boolean {
  const { mesmoPovo, outroPovo } = estranhezaEm(nucleo, idProvincia);
  return mesmoPovo + outroPovo > 0.5;
}

function majoritaria(povos: Readonly<Record<string, number>> | undefined): string | undefined {
  if (povos === undefined) return undefined;
  let escolhida: string | undefined;
  let melhor = 0;
  for (const [id, fracao] of Object.entries(povos).sort((a, b) => a[0].localeCompare(b[0]))) {
    if (fracao > melhor) {
      melhor = fracao;
      escolhida = id;
    }
  }
  return escolhida;
}
