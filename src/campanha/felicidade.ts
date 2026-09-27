/**
 * A felicidade em movimento: o humor de cada província deixou de ser só leitura.
 *
 * O modelo é **alvo e aproximação**, o mesmo das ordens públicas de Total War: cada
 * província tem um ALVO — a base mais o que a situação dela soma e subtrai — e o humor
 * anda alguns pontos por turno em direção a ele. Nada salta, com uma exceção declarada:
 * o choque da conquista, que derruba o humor no dia em que a cidade cai.
 *
 * O que empurra o alvo hoje: fome LOCAL, cerco e domínio estrangeiro sobre a própria
 * província, Templo, nível de imposto e guarnição do dono. Nacionalidade além da distinção
 * entre domínio original e estrangeiro continua fora do sistema.
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
  /**
   * Que fatia do povo daqui não reconhece o dono, e quão estranha ela o acha.
   *
   * As duas frações vão de 0 a 1 e somam no máximo 1 — o que sobra é a fatia que se
   * reconhece no rei. Ver `sociedade/nacionalidade.ts`.
   */
  estranheza: { mesmoPovo: number; outroPovo: number };
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
  /** O reino dono está em guerra com alguém — pesa em toda a terra dele, não só na frente. */
  reinoEmGuerra: boolean;
  /** A estrada até a capital foi cortada: ninguém governa o que não alcança. */
  isoladaDaCapital: boolean;
  /**
   * O tamanho da cidade, de 1 (vila) para cima — é o nível populacional que a alimentação
   * já calcula. Zero onde não há gente contada.
   */
  tamanho: number;
  /** O tesouro do reino está vazio com tropa para pagar: a deserção começa. */
  cofreVazio: boolean;
  /** Quantas vezes o povo conquistado do reino supera o povo do rei. Ver `nacionalidade.ts`. */
  razaoDePovoConquistado: number;
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

  // ⚠️ **O TAMANHO entra sempre que a cidade é maior que uma vila**, e é ele que tira o humor
  // do mesmo lugar em todo o mapa. Sem esta parcela o jogo inteiro cabia em meia dúzia de
  // valores de humor — 80% das províncias viviam em seis números —, e era isso que Henrique
  // sentia como *"todo travado"*. Metrópole é mais difícil de governar que vila.
  const doTamanho = ajustes.alvo.porTamanho[Math.max(0, situacao.tamanho - 1)] ?? 0;
  if (situacao.tamanho > 0 && doTamanho !== 0) {
    parcelas.push({ rotulo: 'tamanho da cidade', pontos: doTamanho });
  }

  if (situacao.passaFome) parcelas.push({ rotulo: 'fome', pontos: ajustes.alvo.fome });
  if (situacao.sitiada) parcelas.push({ rotulo: 'cidade sitiada', pontos: ajustes.alvo.sitiada });
  // ⚠️ **Duas parcelas e não uma, porque são duas coisas diferentes** — e o jogador precisa
  // ver qual delas está pesando. Uma linha só somando "estrangeiro −23" esconderia que 5 vêm
  // de vizinhos da mesma tribo e 18 de gente de outra.
  // A FATIA vai no rótulo: "de outro povo (85%)" diz o tamanho do problema, e −18 sozinho
  // não diz. É a mesma ideia da guarnição, que já mostra o quanto dela está de pé.
  const daCidade = Math.round(situacao.estranheza.mesmoPovo * ajustes.alvo.outraCidade);
  if (daCidade !== 0) {
    parcelas.push({ rotulo: fatia('de outra cidade', situacao.estranheza.mesmoPovo), pontos: daCidade });
  }
  const doPovo = Math.round(situacao.estranheza.outroPovo * ajustes.alvo.povoEstrangeiro);
  if (doPovo !== 0) {
    parcelas.push({ rotulo: fatia('de outro povo', situacao.estranheza.outroPovo), pontos: doPovo });
  }
  if (situacao.reinoEmGuerra) {
    parcelas.push({ rotulo: 'reino em guerra', pontos: ajustes.alvo.reinoEmGuerra });
  }
  // ⚠️ **Os dois casos extremos que Henrique pediu além da fome**: o reino que não paga e o
  // império que conquistou gente demais. São eles, somados à fome, ao cerco e ao confisco, que
  // levam a terra ao fundo da régua depois da fase crítica — e só eles.
  if (situacao.cofreVazio) {
    parcelas.push({ rotulo: 'cofre vazio', pontos: ajustes.alvo.cofreVazio });
  }
  const demais = ajustes.alvo.dominioDemais;
  const estrangeira = situacao.estranheza.mesmoPovo + situacao.estranheza.outroPovo > 0.5;
  const excesso = situacao.razaoDePovoConquistado - demais.limiar;
  if (estrangeira && excesso > 0) {
    const pontos = Math.max(demais.maximo, Math.round(excesso * demais.porExcesso));
    if (pontos !== 0) parcelas.push({ rotulo: 'povo conquistado demais', pontos });
  }
  if (situacao.isoladaDaCapital) {
    parcelas.push({ rotulo: 'sem estrada à capital', pontos: ajustes.alvo.isoladaDaCapital });
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
    const indice = Math.max(0, Math.min(2, nivel - 1));
    if (efeito?.tipo === 'felicidade') {
      const pontos = efeito.pontos[indice] ?? 0;
      if (pontos !== 0) parcelas.push({ rotulo: construcao?.nome ?? id, pontos });
    }
    const desgosto = construcao?.humor?.[indice] ?? 0;
    if (desgosto !== 0) parcelas.push({ rotulo: construcao?.nome ?? id, pontos: desgosto });
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

/** A faixa em que este humor caiu. A última fecha em 100, então sempre existe uma. */
function faixaDe(valor: number, ajustes: AjustesFelicidade) {
  return ajustes.faixas.find((f) => valor <= f.ate) ?? ajustes.faixas[ajustes.faixas.length - 1];
}

/**
 * Quanto a província rende pelo humor dela. 1 é o normal.
 *
 * ⚠️ **É a consequência que faltava.** A greve fiscal da faixa revoltosa era a única coisa
 * que o humor fazia em todo o jogo: acima de 20 o número não mexia em nada, e por isso o
 * Templo não se pagava e o imposto alto não doía.
 *
 * ⚠️ **Uma RETA, e não degraus por faixa.** Com o fator preso à faixa, o Templo subia o alvo
 * de 50 para 55 e não mudava nada — os dois caem em "Neutra" — e a obra continuava inútil.
 * Na reta, cada ponto de humor vale dinheiro. As faixas seguem sendo a leitura da tela e o
 * gatilho do levante; o dinheiro é contínuo.
 */
export function fatorDeRendaDoHumor(valor: number, ajustes: AjustesFelicidade): number {
  const r = ajustes.renda;
  return Math.max(r.minimo, Math.min(r.maximo, 1 + (valor - r.centro) * r.porPonto));
}

/**
 * Quantos turnos nesta faixa até o povo pegar em armas, ou `null` se ela nunca ferve.
 *
 * Duas faixas fervem: a revoltosa, rápido, e a insatisfeita, devagar. É essa diferença que
 * separa a província que dá trabalho da província que se perde.
 */
export function turnosAteOLevante(valor: number, ajustes: AjustesFelicidade): number | null {
  return faixaDe(valor, ajustes)?.levanteEm ?? null;
}

/**
 * O povo está no FUNDO da régua — a faixa mais baixa que existe.
 *
 * ⚠️ **É o portão da revolta contra o PRÓPRIO rei, e Henrique escolheu que fosse só ele.** A
 * faixa de cima ("Insatisfeita") já acende o pavio de quem vive sob bandeira estrangeira; a
 * terra de sempre só pega em armas no fundo do poço. A consequência aceita: o Confisco sozinho
 * não derruba ninguém até aqui — precisa somar guerra, fome ou cerco.
 */
export function noFundoDaRegua(valor: number, ajustes: AjustesFelicidade): boolean {
  const fundo = ajustes.faixas[0];
  return fundo !== undefined && valor <= fundo.ate;
}

/** "de outro povo (85%)" — o rótulo com o tamanho da fatia que ele descreve. */
function fatia(rotulo: string, fracao: number): string {
  return `${rotulo} (${Math.round(fracao * 100)}%)`;
}
