/**
 * A felicidade em movimento: o humor de cada província deixou de ser só leitura.
 *
 * O modelo é **alvo e aproximação**, o mesmo das ordens públicas de Total War: cada
 * província tem um ALVO — a base mais o que a situação dela soma e subtrai — e o humor
 * anda alguns pontos por turno em direção a ele. Nada salta, com uma exceção declarada:
 * o choque da conquista, que derruba o humor no dia em que a cidade cai.
 *
 * O que empurra o alvo hoje: a comida do REINO (mesa farta acalma, fome revolta), o
 * cerco e o domínio estrangeiro sobre a PRÓPRIA província, e o Templo erguido nela.
 * Imposto alto/baixo, nacionalidade e presença militar são futuros do GDD — entram NESTA
 * conta quando existirem, em vez de inventar o próprio modificador.
 *
 * A consequência mora na primeira faixa: província **Revoltosa** não paga imposto, e —
 * quando vive sob bandeira alheia — arma um levante depois de alguns turnos. Ver
 * `Campanha.atualizarFelicidade`.
 */

import type { Ajustes, Construcoes } from '@/dados/esquema';

type AjustesFelicidade = Ajustes['jogo']['felicidade'];
type Catalogo = Construcoes['construcoes'];

/** A situação que decide o alvo de uma província. */
export interface SituacaoDaProvincia {
  /**
   * ESTA província está passando fome — dependente num reino de saldo civil negativo,
   * ou sitiada com a despensa vencida. Fome é local: a cidade farta do outro lado do
   * reino não azeda porque uma vizinha distante passa aperto.
   */
  passaFome: boolean;
  sitiada: boolean;
  /** O dono atual não é o dono de 700 a.C. */
  dominioEstrangeiro: boolean;
  /** Construções erguidas ali, com nível — o Templo entra por aqui. */
  construcoes: Readonly<Record<string, number>>;
  /**
   * O peso do nível de imposto escolhido, já resolvido em pontos.
   *
   * Vem de fora (nível → humor via `ajustes.json`): imposto baixo acalma, alto revolta —
   * é a metade social da alavanca que o GDD pede.
   */
  humorDoImposto: number;
  /**
   * Fração da população desta terra que está em armas AQUI, do próprio dono.
   *
   * Fração e não homens: quinhentos soldados são uma ocupação numa vila de 5.000 e uma ronda
   * numa metrópole de 35.000.
   */
  guarnicao: number;
}

/** Uma parcela do alvo, com nome: é o que deixa a ficha explicar a conta inteira. */
export interface ParcelaDoAlvo {
  rotulo: string;
  pontos: number;
}

/**
 * A conta do alvo, parcela a parcela — a mesma legibilidade da barra de comida.
 *
 * Só entram as parcelas que valem alguma coisa: listar "cerco 0" numa cidade em paz
 * seria ruído. A base entra sempre, porque é dela que as outras somam e subtraem.
 */
export function parcelasDoAlvo(
  situacao: SituacaoDaProvincia,
  catalogo: Catalogo,
  ajustes: AjustesFelicidade,
): readonly ParcelaDoAlvo[] {
  const parcelas: ParcelaDoAlvo[] = [{ rotulo: 'base', pontos: ajustes.alvoBase }];

  if (situacao.passaFome) parcelas.push({ rotulo: 'fome', pontos: ajustes.alvo.fome });
  if (situacao.sitiada) parcelas.push({ rotulo: 'cidade sitiada', pontos: ajustes.alvo.sitiada });
  if (situacao.dominioEstrangeiro) {
    parcelas.push({ rotulo: 'domínio estrangeiro', pontos: ajustes.alvo.dominioEstrangeiro });
  }
  if (situacao.humorDoImposto !== 0) {
    parcelas.push({ rotulo: 'nível de imposto', pontos: situacao.humorDoImposto });
  }
  // ⚠️ **Tropa na porta acalma o povo, e é a única coisa que o jogador pode fazer HOJE contra
  // o descontentamento.** Templo leva turnos, imposto baixo custa renda, e o domínio
  // estrangeiro não sai enquanto a terra não assimilar. Proporcional até a guarnição cheia,
  // para que cem homens numa vila já valham alguma coisa — e com teto, porque a partir de um
  // ponto mais lança na rua não acalma mais ninguém.
  const ordem = Math.min(1, situacao.guarnicao / ajustes.alvo.guarnicaoPlena);
  if (ordem > 0) {
    const pontos = Math.round(ajustes.alvo.guarnicao * ordem);
    if (pontos !== 0) parcelas.push({ rotulo: 'guarnição', pontos });
  }

  for (const [id, nivel] of Object.entries(situacao.construcoes)) {
    const construcao = catalogo[id];
    const efeito = construcao?.efeito;
    if (efeito?.tipo === 'felicidade') {
      const pontos = efeito.pontos[Math.max(0, Math.min(2, nivel - 1))] ?? 0;
      if (pontos !== 0) parcelas.push({ rotulo: construcao?.nome ?? id, pontos });
    }
  }

  return parcelas;
}

/** Para onde o humor desta província caminha, de 0 a 100: a soma das parcelas, contida. */
export function alvoDeFelicidade(
  situacao: SituacaoDaProvincia,
  catalogo: Catalogo,
  ajustes: AjustesFelicidade,
): number {
  const soma = parcelasDoAlvo(situacao, catalogo, ajustes).reduce(
    (total, parcela) => total + parcela.pontos,
    0,
  );
  return Math.max(0, Math.min(100, soma));
}

/** Um passo do humor em direção ao alvo. Gradual por regra: nunca passa do alvo. */
export function aproximarFelicidade(atual: number, alvo: number, passo: number): number {
  if (atual < alvo) return Math.min(alvo, atual + passo);
  if (atual > alvo) return Math.max(alvo, atual - passo);
  return atual;
}

/** O humor está na faixa revoltosa — a primeira das faixas com nome? */
export function revoltosa(valor: number, ajustes: AjustesFelicidade): boolean {
  return valor <= (ajustes.faixas[0]?.ate ?? 0);
}
