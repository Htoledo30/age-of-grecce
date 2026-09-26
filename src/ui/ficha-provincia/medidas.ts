/**
 * As QUATRO MEDIDAS: os números pelos quais uma província se decide.
 *
 * ⚠️ **Quatro, e nem uma a mais.** O painel antigo listava sete campos do mesmo tamanho e
 * na mesma cor — povo, humor, região, milícia, população, produção, saldo — e o olho não
 * tinha por onde entrar. Área e número de fronteiras já haviam saído por serem verdadeiras
 * e inúteis; região e povo desceram para a linha de identidade pela mesma razão: dizem o
 * que a terra É, não o que ela vale nem o que ela precisa.
 *
 * O que sobrou responde às quatro perguntas que fazem alguém clicar numa província:
 *
 * - **quanto ela me dá?** (saldo)   — decide investir
 * - **o povo aguenta?** (humor)     — decide imposto e revolta
 * - **quanta gente tem?** (povo)    — decide leva e imposto
 * - **ela se segura?** (milícia)    — decide se o vizinho vem
 *
 * ⚠️ **Número e régua, nunca definição.** A nota embaixo do número diz a FAIXA — "terra
 * grande", "satisfeita" —, e nunca o que a medida significa. Frases como "só ela defende"
 * saíram: quem lê "MILÍCIA 420" já sabe o que é milícia, e escrever a definição ao lado de
 * cada número é conversa de tutorial, não de painel de comando.
 *
 * A referência é a faixa de desenvolvimento do EU4 e a de recursos do Total War: um número
 * grande, um rótulo pequeno e, quando existe régua, uma palavra. O tamanho é a hierarquia.
 */

import { definirTooltip } from '../tooltip';
import type { ConteudoDeTooltip } from '../tooltip';
import { comSinal, moeda, tooltipDaPopulacao, tooltipDoHumor } from './textos';
import type { VistaDaProvincia } from './vista';

/** Como a medida se pinta. Nada de cor sozinha: cada tom tem palavra ao lado. */
type Tom = 'bom' | 'neutro' | 'ruim';

interface Medida {
  rotulo: string;
  valor: string;
  /** O movimento para o próximo turno, no formato da barra do reino: `(+120)`. */
  delta: string;
  nota: string;
  tom: Tom;
  tooltip: ConteudoDeTooltip;
}

/** Monta as quatro medidas desta província, na ordem em que aparecem. */
export function medidasDa(vista: VistaDaProvincia): HTMLElement {
  const grade = document.createElement('dl');
  grade.className = 'ficha__medidas';
  for (const medida of [saldo(vista), humor(vista), povo(vista), milicia(vista)]) {
    grade.appendChild(desenhar(medida));
  }
  return grade;
}

function desenhar(medida: Medida): HTMLElement {
  const caixa = document.createElement('div');
  caixa.className = 'ficha__medida';
  caixa.dataset['tom'] = medida.tom;
  // O rótulo vai para o DOM porque a cor não identifica coisa nenhuma para quem procura uma
  // medida específica — nem o teste de tela, nem o leitor de tela.
  caixa.dataset['medida'] = medida.rotulo;

  const rotulo = document.createElement('dt');
  rotulo.textContent = medida.rotulo;
  const valor = document.createElement('dd');
  valor.className = 'ficha__valor';
  valor.textContent = medida.valor;
  if (medida.delta) {
    const delta = document.createElement('i');
    delta.className = 'ficha__delta';
    delta.textContent = medida.delta;
    valor.appendChild(delta);
  }
  const nota = document.createElement('span');
  nota.className = 'ficha__nota';
  nota.textContent = medida.nota;

  caixa.append(rotulo, valor, nota);
  definirTooltip(caixa, medida.tooltip);
  return caixa;
}

/**
 * O saldo: o que esta terra põe no tesouro depois de pagar as próprias contas.
 *
 * Líquido, e não bruto, porque é o líquido que decide — um Mercado numa terra pobre pode
 * custar mais do que rende, e a província no vermelho tem que gritar.
 */
function saldo(vista: VistaDaProvincia): Medida {
  const e = vista.economia;
  if (!e) {
    return {
      rotulo: 'saldo',
      valor: '—',
      delta: '',
      nota: '',
      tom: 'neutro',
      tooltip: { titulo: 'Sem economia', corpo: 'Esta terra ainda não rende nem custa.' },
    };
  }
  const linhas = [
    `+${moeda(e.impostos)} impostos` + (e.revoltosa ? ' (revolta)' : ''),
    `+${moeda(e.producao)} produção`,
    `+${moeda(e.transito)} trânsito` + (e.cortada ? ' (rota cortada)' : ''),
  ];
  // ⚠️ **A CORRUPÇÃO não aparecia em tela nenhuma** — nem aqui, nem no Governo —, e é a maior
  // mordida silenciosa da economia: numa terra grande e longe da capital ela leva mais de um
  // terço de tudo. O jogador via a renda pequena e não tinha como descobrir por quê, nem que a
  // Ágora e a Estrada existem exatamente para isso.
  //
  // Ela vem junto do humor porque as duas são a mesma espécie de coisa — multiplicadores sobre
  // as três parcelas de cima —, e por isso ficam coladas nelas, antes das despesas de verdade.
  if (e.corrupcao > 0) {
    // As três parcelas chegam aqui LÍQUIDAS (`economia.ts` já multiplicou por 1−corrupção): o
    // que se perdeu é o que falta para o bruto, e não uma fatia do que sobrou.
    const perdido = Math.round(
      ((e.impostos + e.producao + e.transito) * e.corrupcao) / (1 - e.corrupcao),
    );
    linhas.push(
      `corrupção: −${Math.round(e.corrupcao * 100)}% nas três parcelas (−${moeda(perdido)})`,
    );
  }
  // A linha que liga o humor ao dinheiro. Sem ela o jogador vê a felicidade mexer e não
  // descobre onde ela vira moeda.
  if (e.fatorDoHumor !== 1) {
    const p = Math.round((e.fatorDoHumor - 1) * 100);
    linhas.push(`humor: ${p >= 0 ? '+' : '−'}${Math.abs(p)}% nas três parcelas`);
  }
  if (e.manutencao > 0) linhas.push(`−${moeda(e.manutencao)} construções`);
  if (e.tropa > 0) linhas.push(`−${moeda(e.tropa)} tropas`);
  return {
    rotulo: 'saldo',
    valor: comSinal(e.saldo),
    delta: '',
    nota: 'por turno',
    tom: e.saldo < 0 ? 'ruim' : 'bom',
    tooltip: {
      titulo: e.saldo < 0 ? 'No vermelho' : 'Saldo',
      corpo: linhas.join('\n'),
      tom: e.saldo < 0 ? 'perigo' : 'informacao',
    },
  };
}

/**
 * O humor, com a SETA do movimento junto do número.
 *
 * ⚠️ O valor de hoje sozinho engana: 45 caindo para 12 e 45 subindo para 70 são a mesma
 * província na tela e situações opostas na mesa. O jogo calcula o alvo desde o primeiro dia
 * e o painel mostrava só metade — a mesma lição que a mesa diplomática aprendeu com a
 * opinião dos vizinhos.
 */
function humor(vista: VistaDaProvincia): Medida {
  const h = vista.humor;
  if (!h) {
    return {
      rotulo: 'humor',
      valor: '—',
      delta: '',
      nota: '',
      tom: 'neutro',
      tooltip: { titulo: 'Humor', corpo: 'Sem população simulada.' },
    };
  }
  const seta = h.alvo > h.valor ? ' ↑' : h.alvo < h.valor ? ' ↓' : '';
  return {
    rotulo: 'humor',
    valor: `${h.valor}${seta}`,
    delta: '',
    nota: h.faixa.toLowerCase(),
    // A régua vem pronta da vista: os limites das faixas vivem no JSON e mudam.
    tom: h.posicao <= 0.25 ? 'ruim' : h.posicao >= 0.6 ? 'bom' : 'neutro',
    tooltip: tooltipDoHumor(h.valor, h),
  };
}

/**
 * O povo, e **quanto ele anda no próximo turno** — no formato do tesouro na barra do reino.
 *
 * Pedido de Henrique, e ele tem razão: uma população parada e uma população derretendo são o
 * mesmo `35.000` na tela. O jogo já calculava o próximo passo; faltava escrevê-lo do lado,
 * do jeito que o reino inteiro já escreve o dele.
 */
function povo(vista: VistaDaProvincia): Medida {
  const e = vista.economia;
  if (!e) {
    return {
      rotulo: 'povo',
      valor: '—',
      delta: '',
      nota: '',
      tom: 'neutro',
      tooltip: { titulo: 'População', corpo: 'Sem população simulada.' },
    };
  }
  const c = e.crescimento;
  const passo = c?.crescimento ?? 0;
  return {
    rotulo: 'povo',
    valor: moeda(e.populacao),
    // ⚠️ O passo vai na NOTA, e não ao lado do número: numa coluna de 95 px, "35.000 (+120)"
    // atropelava a medida vizinha. E vai numa LINHA PRÓPRIA, abaixo da faixa: escrito na
    // mesma linha, "+175 · terra grande" quebrava no meio do nome da faixa.
    delta: '',
    // O passo só aparece quando existe: um "+0" solto embaixo da faixa parecia defeito.
    nota:
      c && passo !== 0
        ? `${vista.faixa.toLowerCase()}
${comSinal(passo)}`
        : vista.faixa.toLowerCase(),
    tom: passo < 0 ? 'ruim' : 'neutro',
    tooltip: {
      ...(c ? tooltipDaPopulacao(c) : { titulo: 'População', corpo: '' }),
      // ⚠️ **A composição vem com a CONSEQUÊNCIA junto.** "Eleusina 85% · Ateniense 15%" era
      // cor local até a nacionalidade entrar no humor; agora é a conta que esta terra cobra
      // do dono dela, e o número sozinho não diz isso.
      corpo: [vista.povos, fraseDaEstranheza(vista)].filter((l) => l !== '').join('\n'),
    },
  };
}

/**
 * A milícia: quem defende quando não há exército nenhum aqui.
 *
 * ⚠️ **Não conta as hostes paradas na província** — de propósito. Tropa marcha e vai embora;
 * a milícia é o que a terra tem por si, e é isso que o jogador precisa saber ao decidir se
 * deixa a fronteira desguarnecida. O exército tem ficha própria, e ela fala por ele.
 */
function milicia(vista: VistaDaProvincia): Medida {
  const nenhuma = vista.milicia === 0;
  return {
    rotulo: 'milícia',
    valor: moeda(vista.milicia),
    delta: '',
    nota: nenhuma ? 'indefesa' : '',
    tom: nenhuma ? 'ruim' : 'neutro',
    tooltip: {
      titulo: 'Milícia',
      corpo: nenhuma
        ? 'Ninguém pega em armas aqui: o primeiro soldado que chegar toma a terra.'
        : 'Defende sozinha quando não há exército. A Muralha a multiplica.',
    },
  };
}

/**
 * O que a composição do povo custa a quem manda aqui. Vazia quando não custa nada.
 *
 * Duas frases e não uma: outra cidade da mesma tribo e outra tribo são coisas de peso
 * diferente, e é o degrau entre elas que dá direção à expansão.
 */
function fraseDaEstranheza(vista: VistaDaProvincia): string {
  const e = vista.estranheza;
  if (!e) return '';
  const partes: string[] = [];
  if (e.outroPovo > 0) {
    partes.push(`${Math.round(e.outroPovo * 100)}% é de outro povo que não o de ${vista.poder.nome}`);
  }
  if (e.mesmoPovo > 0) {
    partes.push(`${Math.round(e.mesmoPovo * 100)}% é de outra cidade da mesma tribo`);
  }
  return partes.length === 0 ? '' : `${partes.join('; ')} — e isso pesa no humor.`;
}
