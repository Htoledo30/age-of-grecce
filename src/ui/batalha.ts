/**
 * A JANELA DE BATALHA — o jogador assiste, não comanda.
 *
 * No espírito da tela de jogo do Brasfoot: não é tempo real, não tem boneco andando, não tem
 * ordem para dar. É uma tela de resultado **animada**, round a round, com tensão em vez de
 * controle.
 *
 * ⚠️ **Ela não recalcula NADA.** Recebe a lista de rounds que a regra já produziu e a
 * reproduz. É por isso que ela não consegue mentir: não existe uma fórmula para decidir a
 * batalha e outra para animá-la, e a mesma batalha resolvida sem janela — a da IA — dá
 * exatamente o mesmo resultado. Se um número aqui divergir do mapa, o defeito está na regra.
 *
 * ⚠️ **Abre só nas batalhas do jogador.** Assistir à guerra alheia seria transformar a crônica
 * numa fila de janelas.
 *
 * ## O que a refez, e de onde veio
 *
 * A primeira versão eram duas barras empilhadas que encolhiam e uma frase que se apagava a
 * cada round. Três defeitos, e os três são conhecidos:
 *
 * 1. **Duas barras empilhadas não são dois exércitos frente a frente**, são uma lista. A ficha
 *    de previsão do Fire Emblem resolve isso desde 1990 com DUAS COLUNAS ESPELHADAS, campos
 *    idênticos na mesma ordem e na mesma altura — o olho compara sem legenda.
 * 2. **A barra sozinha não conta o golpe.** A regra é do Raph Koster e é curta: *barra é
 *    ESTADO, número é DELTA, e o jogador precisa dos dois.* Barra sozinha diz que você está
 *    mal e não diz o que te acertou; número sozinho diz o golpe e não diz se sobra fôlego.
 *    Daí o **segmento fantasma** — a fatia perdida NESTE round fica desenhada em tom claro por
 *    um instante — e o **estado → estado** na fita: `1.762 → 1.640` em vez de `−122`, que
 *    carrega golpe e acumulado numa leitura só e dispensa a subtração de cabeça.
 * 3. **Uma frase que se apaga não deixa a batalha ter história.** A queixa número um contra
 *    logs de combate é rolagem contínua: o round que decide passa igual aos outros sete. Aqui a
 *    fita ACUMULA, o round da quebra vem em corpo maior, e cada fase tem canal próprio de cor.
 *
 * E o desfecho separa **choque** de **perseguição** na conta final, que é como os wargames de
 * Antiguidade contam uma batalha antiga — porque são coisas diferentes: uma linha que cede
 * perde na fuga muito mais gente do que perdeu segurando, e é essa a lição que o jogador
 * precisa levar para a próxima marcha.
 *
 * ⚠️ **Cor é CATEGORIA, tamanho é GRAVIDADE**, e cor nunca anda sozinha: todo canal tem
 * também uma palavra. Monitor ruim e daltonismo não podem custar a leitura da tela.
 */

import type { Arma } from '@/combate/exercito';
import { ARMAS } from '@/combate/exercito';
import { COR_DA_ARMA, NOME_DA_ARMA } from './armas';
import { criarEstandarte } from './estandartes';
import { iconeGrego } from './icones-gregos';
import { definirTooltip } from './tooltip';

/** Um lado como ele entrou na batalha. */
interface LadoNaTela {
  /** O poder, para o estandarte. Vazio no lado `ninguem` — província tomada sem defensor. */
  id: string;
  nome: string;
  cor: string;
  homens: number;
  /** Multiplicador de resistência: a muralha. 1 é campo aberto. */
  aguento: number;
  /**
   * Quantos homens de cada arma entraram.
   *
   * ⚠️ **Só a composição de PARTIDA**, e é o bastante: as baixas são proporcionais entre os
   * contingentes, então a fatia de cada arma não muda durante a batalha. A barra encolhe
   * inteira e as faixas encolhem com ela — que é exatamente o que a regra faz.
   */
  composicao: Readonly<Record<Arma, number>>;
}

/** Uma batalha inteira, pronta para ser reproduzida. */
export interface VistaDaBatalha {
  /** Onde foi, ou `null` no encontro na estrada — a única batalha sem lugar. */
  lugar: string | null;
  tipo: 'campo' | 'estrada' | 'assalto';
  lados: readonly [LadoNaTela, LadoNaTela];
  rounds: readonly { a: number; b: number; fase: 'choque' | 'perseguicao' | 'recuo' }[];
  /** `null` só existe por segurança de tipo: a regra sempre elege um vencedor. */
  vencedor: 'a' | 'b' | null;
  desfecho: 'quebrou' | 'recuou' | 'barrado';
  /**
   * A fração de baixas em que uma linha cede.
   *
   * ⚠️ **É o suspense inteiro desta janela, e ele era invisível.** A batalha não se decide no
   * zero — se decide aqui, e a barra descia rumo a um fim que nunca chega e não quer dizer
   * nada. Com o limiar desenhado, o jogador vê Mégara com 903 de 2.000 e lê a única coisa que
   * importa: **faltam 103 homens para a linha quebrar.** O jogo fabricava esse momento sozinho
   * e a tela que existe para mostrá-lo o escondia.
   */
  limiarDeQuebra: number;
}

/**
 * Como uma linha está, em palavra.
 *
 * ⚠️ **Os degraus são fração DO LIMIAR, e não do exército.** Se fossem absolutos, mudar
 * `limiarDeQuebra` no JSON faria a tela mentir sem que ninguém percebesse — "vergando" a 45%
 * de baixas continuaria escrito enquanto a linha já teria cedido. Presos ao limiar, os quatro
 * nomes seguem a regra para onde ela for.
 */
function estadoDaLinha(homens: number, vivos: number, limiar: number): string {
  if (homens <= 0) return 'sem ninguém';
  const gasto = (homens - vivos) / (homens * limiar);
  if (gasto >= 1) return 'cedeu';
  if (gasto >= 0.75) return 'vergando';
  if (gasto >= 0.4) return 'rangendo';
  return 'firme';
}

/** Milissegundos entre um round e o seguinte quando o jogador manda deixar correr. */
const RITMO = 900;

/**
 * O nome de cada fase, e ele é da Antiguidade de propósito.
 *
 * ⚠️ **Nunca sinônimos entre a ficha e a fita.** Se o cartão diz "aguento" e a narração diz
 * "resistência", o jogador não fecha a conta e conclui que a tela está mentindo. Uma palavra
 * por coisa, no jogo inteiro.
 */
const FASES: Record<string, string> = {
  choque: 'Choque',
  perseguicao: 'Perseguição',
  recuo: 'Retirada',
};

/** Como cada desfecho se chama. Três verbos diferentes para três coisas diferentes. */
const DESFECHOS: Record<string, string> = {
  quebrou: 'A linha quebrou',
  recuou: 'Retirada em ordem',
  barrado: 'Ninguém cedeu',
};

const separarMilhar = (n: number) => n.toLocaleString('pt-BR');

export class JanelaDeBatalha {
  readonly elemento = document.createElement('div');

  private readonly cartao = document.createElement('section');
  private readonly titulo = document.createElement('h2');
  private readonly campo = document.createElement('div');
  private readonly faixaDaFase = document.createElement('p');
  private readonly fita = document.createElement('ol');
  private readonly botoes = document.createElement('div');
  private readonly seguir = document.createElement('button');
  private readonly correr = document.createElement('button');
  private readonly fechar = document.createElement('button');

  private vista: VistaDaBatalha | null = null;
  private round = 0;
  private temporizador: number | undefined;

  /** Chamado quando o jogador fecha a janela — a próxima batalha da fila entra. */
  aoFechar: () => void = () => {};

  constructor(pai: HTMLElement) {
    this.elemento.className = 'batalha';
    this.elemento.hidden = true;
    this.cartao.className = 'batalha__cartao';
    this.titulo.className = 'batalha__titulo';
    this.campo.className = 'batalha__campo';
    this.faixaDaFase.className = 'batalha__fase';
    this.fita.className = 'batalha__fita';
    this.botoes.className = 'batalha__botoes';

    this.seguir.type = 'button';
    this.seguir.className = 'batalha__botao';
    this.seguir.textContent = 'Continuar';
    this.seguir.addEventListener('click', () => this.avancar());

    this.correr.type = 'button';
    this.correr.className = 'batalha__botao';
    this.correr.textContent = 'Deixar correr';
    this.correr.addEventListener('click', () => this.deixarCorrer());

    this.fechar.type = 'button';
    this.fechar.className = 'batalha__botao batalha__botao--fim';
    this.fechar.textContent = 'Fechar';
    this.fechar.addEventListener('click', () => this.encerrar());

    this.botoes.append(this.seguir, this.correr, this.fechar);
    this.cartao.append(this.titulo, this.campo, this.faixaDaFase, this.fita, this.botoes);
    this.elemento.appendChild(this.cartao);
    pai.appendChild(this.elemento);
  }

  /** Põe uma batalha na tela, parada no round zero. */
  mostrar(vista: VistaDaBatalha): void {
    this.parar();
    this.vista = vista;
    this.round = 0;
    this.elemento.hidden = false;
    this.elemento.dataset['tipo'] = vista.tipo;
    this.titulo.textContent =
      vista.tipo === 'estrada'
        ? 'Encontro na estrada'
        : vista.tipo === 'assalto'
          ? `Assalto a ${vista.lugar ?? ''}`
          : `Batalha em ${vista.lugar ?? ''}`;
    this.desenhar();
  }

  esconder(): void {
    this.parar();
    this.vista = null;
    this.elemento.hidden = true;
  }

  private avancar(): void {
    const vista = this.vista;
    if (!vista) return;
    if (this.round < vista.rounds.length) this.round += 1;
    if (this.round >= vista.rounds.length) this.parar();
    this.desenhar();
  }

  private deixarCorrer(): void {
    if (this.temporizador !== undefined) return;
    this.temporizador = window.setInterval(() => {
      const vista = this.vista;
      if (!vista || this.round >= vista.rounds.length) {
        this.parar();
        return;
      }
      this.avancar();
    }, RITMO);
    this.desenhar();
  }

  private parar(): void {
    if (this.temporizador !== undefined) window.clearInterval(this.temporizador);
    this.temporizador = undefined;
  }

  private encerrar(): void {
    this.esconder();
    this.aoFechar();
  }

  /** Quantos homens cada lado tinha ANTES do round pedido. Round 0 é a composição de entrada. */
  private estadoEm(vista: VistaDaBatalha, round: number): { a: number; b: number } {
    if (round <= 0) return { a: vista.lados[0].homens, b: vista.lados[1].homens };
    const r = vista.rounds[round - 1];
    return r ? { a: r.a, b: r.b } : { a: vista.lados[0].homens, b: vista.lados[1].homens };
  }

  private desenhar(): void {
    const vista = this.vista;
    if (!vista) return;
    const [a, b] = vista.lados;
    const agora = this.estadoEm(vista, this.round);
    const antes = this.estadoEm(vista, this.round - 1);
    const fase = vista.rounds[this.round - 1]?.fase ?? null;
    const acabou = this.round >= vista.rounds.length;

    // ⚠️ **UMA RÉGUA SÓ PARA OS DOIS.** Antes cada barra era normalizada pelo próprio total, e
    // 2.400 contra 2.000 desenhavam a mesma largura — o dado mais elementar de uma batalha, a
    // diferença de tamanho dos exércitos, estava apagado pelo CSS. Com a régua comum, o maior
    // desenha mais linha e a sobra fica à vista. Custa uma divisão.
    const regua = Math.max(a.homens, b.homens, 1);
    // ⚠️ **O desfecho pinta as duas colunas, e é o pagamento da tela.** A batalha terminava
    // com os dois lados desenhados exatamente iguais e a resposta escrita só numa linha de
    // texto lá embaixo — o jogador assistia três rounds de tensão e o fim não tinha imagem.
    // Agora o vencedor acende e o perdedor perde a cor: quem venceu se lê antes de ler.
    const fim = (qual: 'a' | 'b'): 'venceu' | 'perdeu' | null =>
      !acabou || vista.vencedor === null ? null : vista.vencedor === qual ? 'venceu' : 'perdeu';
    this.campo.replaceChildren(
      colunaDoLado(a, 'a', agora.a, antes.a, fase, regua, vista.limiarDeQuebra, fim('a')),
      meioDoCampo(this.round, vista.rounds.length, acabou, fase),
      colunaDoLado(b, 'b', agora.b, antes.b, fase, regua, vista.limiarDeQuebra, fim('b')),
    );

    this.faixaDaFase.dataset['canal'] = acabou ? 'fim' : (fase ?? 'inicio');
    this.faixaDaFase.textContent = acabou
      ? `${DESFECHOS[vista.desfecho] ?? 'Fim'} · ${vista.rounds.length} ${vista.rounds.length === 1 ? 'round' : 'rounds'}`
      : fase === null
        ? 'As linhas se formam'
        : `${FASES[fase] ?? fase} · round ${this.round} de ${vista.rounds.length}`;

    this.fita.replaceChildren(...this.linhasDaFita(vista));
    // ⚠️ Rolar sozinha para o fim é REQUISITO e não conveniência: uma fita que fica no topo
    // enquanto o round novo entra embaixo é uma fita que o jogador para de ler no terceiro round.
    this.fita.scrollTop = this.fita.scrollHeight;

    this.seguir.disabled = acabou;
    this.correr.disabled = acabou || this.temporizador !== undefined;
    this.fechar.hidden = !acabou;
    definirTooltip(this.fechar, {
      titulo: 'A batalha já aconteceu',
      corpo:
        'Esta janela reproduz o que a regra decidiu quando o turno virou. Fechar não muda ' +
        'nada no mapa — o resultado já está lá.',
    });
  }

  /**
   * A fita inteira até o round atual, reconstruída do zero a cada desenho.
   *
   * ⚠️ **Reconstruir em vez de acrescentar** é o que a mantém honesta: não existe estado de
   * fita a divergir do estado da batalha, e voltar ou reabrir dá exatamente a mesma leitura.
   * São dez linhas de texto; o custo é nenhum e a classe de bug que isso elimina é inteira.
   */
  private linhasDaFita(vista: VistaDaBatalha): readonly HTMLElement[] {
    const [a, b] = vista.lados;
    const linhas: HTMLElement[] = [linhaDaFita('inicio', aberturaDe(vista), null)];

    for (let i = 1; i <= this.round; i += 1) {
      const antes = this.estadoEm(vista, i - 1);
      const agora = this.estadoEm(vista, i);
      const fase = vista.rounds[i - 1]?.fase ?? 'choque';
      const perdaA = antes.a - agora.a;
      const perdaB = antes.b - agora.b;
      const contas: readonly Conta[] = [
        { nome: a.nome, lado: 'a', de: antes.a, para: agora.a },
        { nome: b.nome, lado: 'b', de: antes.b, para: agora.b },
      ];
      // ⚠️ O round da virada nasce MAIOR, e não piscando: tamanho é ênfase, movimento é ruído.
      // É o round em que a linha cede — o único que o jogador precisa lembrar depois.
      const grave = fase !== 'choque';
      linhas.push(linhaDaFita(fase, narrarRound(vista, i, perdaA, perdaB), contas, grave));
    }

    if (this.round >= vista.rounds.length) linhas.push(...this.linhasDoFim(vista));
    return linhas;
  }

  /**
   * O fecho: quem venceu, como, e **o choque contado separado da perseguição.**
   *
   * ⚠️ É a lição inteira desta janela, e é a que os wargames de Antiguidade sempre contaram
   * separada: uma linha que cede perde na fuga muito mais gente do que perdeu segurando. Somar
   * as duas numa baixa única esconderia justamente o que o jogador precisa levar para a
   * próxima marcha — que o preço não está em lutar, está em quebrar.
   */
  private linhasDoFim(vista: VistaDaBatalha): readonly HTMLElement[] {
    const [a, b] = vista.lados;
    const perdas = { a: { choque: 0, fuga: 0 }, b: { choque: 0, fuga: 0 } };
    for (let i = 1; i <= vista.rounds.length; i += 1) {
      const antes = this.estadoEm(vista, i - 1);
      const agora = this.estadoEm(vista, i);
      const onde = vista.rounds[i - 1]?.fase === 'choque' ? 'choque' : 'fuga';
      perdas.a[onde] += antes.a - agora.a;
      perdas.b[onde] += antes.b - agora.b;
    }

    const vencedor = vista.vencedor === 'a' ? a : vista.vencedor === 'b' ? b : null;
    const fecho =
      vista.desfecho === 'barrado'
        ? 'Ninguém cedeu, e o dia acabou. O chão fica com quem não saiu.'
        : vencedor
          ? `${vencedor.nome} fica com o campo.`
          : 'O dia acabou sem dono.';

    const linhas = [linhaDaFita('fim', fecho, null, true)];
    for (const [lado, dados] of [
      ['a', { nome: a.nome, perda: perdas.a }],
      ['b', { nome: b.nome, perda: perdas.b }],
    ] as const) {
      const total = dados.perda.choque + dados.perda.fuga;
      const detalhe =
        dados.perda.fuga > 0
          ? `${separarMilhar(dados.perda.choque)} no choque · ${separarMilhar(dados.perda.fuga)} na debandada`
          : `${separarMilhar(dados.perda.choque)} no choque`;
      linhas.push(
        linhaDaFita(
          'baixas',
          `${dados.nome} perdeu ${separarMilhar(total)}: ${detalhe}.`,
          null,
          false,
          lado,
        ),
      );
    }
    return linhas;
  }
}

interface Conta {
  nome: string;
  lado: 'a' | 'b';
  de: number;
  para: number;
}

/**
 * Uma linha da fita: o texto, e as contas `de → para` embaixo.
 *
 * ⚠️ **`1.762 → 1.640`, e nunca `−122` sozinho.** Um delta solto não diz se foi arranhão ou
 * catástrofe; o estado ao lado diz as duas coisas de uma vez e poupa a subtração de cabeça.
 * O canal vira `data-canal` e a cor mora no CSS: uma classe por canal semântico, jamais cor
 * escrita por evento — assim o léxico inteiro se muda num arquivo só.
 */
function linhaDaFita(
  canal: string,
  texto: string,
  contas: readonly Conta[] | null,
  grave = false,
  lado?: string,
): HTMLElement {
  const linha = document.createElement('li');
  linha.className = 'batalha__linha';
  linha.dataset['canal'] = canal;
  if (grave) linha.dataset['grave'] = 'sim';
  if (lado !== undefined) linha.dataset['lado'] = lado;

  const frase = document.createElement('span');
  frase.className = 'batalha__frase';
  frase.textContent = texto;
  linha.appendChild(frase);

  if (contas) {
    const conta = document.createElement('span');
    conta.className = 'batalha__contas';
    for (const c of contas) {
      const item = document.createElement('span');
      item.className = 'batalha__conta';
      item.dataset['lado'] = c.lado;
      const perdeu = c.de - c.para;
      item.textContent =
        perdeu > 0
          ? `${c.nome} ${separarMilhar(c.de)} → ${separarMilhar(c.para)}`
          : `${c.nome} ${separarMilhar(c.para)} intactos`;
      conta.appendChild(item);
    }
    linha.appendChild(conta);
  }
  return linha;
}

/**
 * Uma coluna do campo: um exército, de cima a baixo, na MESMA ordem dos dois lados.
 *
 * ⚠️ **Campos idênticos, mesma ordem, mesma altura** — a ficha de previsão do Fire Emblem, que
 * o gênero inteiro copia desde 1990 porque funciona: o olho compara linha por linha e a
 * assimetria salta sem que ninguém precise explicar. Sem isso, dois exércitos empilhados são
 * uma lista, e não um confronto.
 */
function colunaDoLado(
  lado: LadoNaTela,
  qual: 'a' | 'b',
  vivos: number,
  antes: number,
  fase: string | null,
  regua: number,
  limiar: number,
  fim: 'venceu' | 'perdeu' | null,
): HTMLElement {
  const coluna = document.createElement('div');
  coluna.className = 'batalha__lado';
  coluna.dataset['lado'] = qual;
  if (fim) coluna.dataset['fim'] = fim;
  // ⚠️ **O golpe deste round marca a coluna que o levou.** A barra já encolhia e o fantasma já
  // mostrava a fatia perdida, mas nada acontecia com o NÚMERO — e o número é onde o olho está
  // parado enquanto os rounds correm. Um lampejo de 300 ms no lado que apanhou é o que faz o
  // round ser um acontecimento em vez de uma atualização.
  if (antes - vivos > 0) coluna.dataset['golpe'] = 'sim';

  // ⚠️ **O ESTANDARTE, e é o que faltava para isto ser um confronto.** Duas colunas espelhadas
  // resolvem a comparação, mas não a IDENTIDADE: os dois lados eram dois nomes na mesma fonte,
  // e a única tela em que dois povos se enfrentam era a única sem uma insígnia. Henrique, sobre
  // a lista de diplomacia: *"ser humano é melhor em decorar imagem do que nomes"* — e aqui vale
  // dobrado, porque a batalha é o momento em que ele mais precisa saber de que lado torcer.
  const cabeca = document.createElement('div');
  cabeca.className = 'batalha__cabeca';
  const nome = document.createElement('h3');
  nome.className = 'batalha__nome';
  nome.textContent = lado.nome;
  if (lado.id === '') cabeca.appendChild(nome);
  else {
    const pano = criarEstandarte({ id: lado.id, nome: lado.nome, cor: lado.cor }, 'reino');
    // Fincados: o da esquerda pende para fora, o da direita também. São duas hastes plantadas
    // no campo, e não dois ícones alinhados numa barra de ferramentas.
    cabeca.append(...(qual === 'a' ? [pano, nome] : [nome, pano]));
  }
  coluna.appendChild(cabeca);

  const estado = document.createElement('p');
  estado.className = 'batalha__estado';
  const vivosTexto = document.createElement('span');
  vivosTexto.className = 'batalha__vivos';
  vivosTexto.textContent = separarMilhar(vivos);
  const total = document.createElement('span');
  total.className = 'batalha__total';
  total.textContent = `de ${separarMilhar(lado.homens)}`;
  estado.append(vivosTexto, total);
  coluna.appendChild(estado);

  // ⚠️ **A palavra, e não a porcentagem.** "45% de baixas" obriga a decorar a régua; "vergando"
  // responde a pergunta que o jogador está fazendo, que é se aquela linha aguenta mais um
  // empurrão. E é a palavra MUDANDO que vira o evento — duas escadas em velocidades diferentes
  // contam a batalha inteira sem um número na tela.
  // ⚠️ **A palavra em versalete, a conta em caixa normal — e antes era tudo maiúscula.**
  // `FIRME · FALTAM 209 PARA QUEBRAR` é uma frase inteira gritada em corpo 12: caixa alta serve
  // a UMA palavra, e a partir da segunda ela custa exatamente a legibilidade de que a frase
  // precisa para ser lida de relance. É a mesma lição que a mesa de diplomacia já tinha
  // aprendido. A palavra é o estado; a conta é o suspense, e ela é o número mais importante
  // desta tela depois dos dois grandes.
  const firmeza = document.createElement('p');
  firmeza.className = 'batalha__firmeza';
  const palavra = estadoDaLinha(lado.homens, vivos, limiar);
  firmeza.dataset['estado'] = palavra;
  const restam = Math.max(0, vivos - Math.ceil(lado.homens * (1 - limiar)));
  const rotulo = document.createElement('span');
  rotulo.className = 'batalha__firmeza-palavra';
  rotulo.textContent = palavra;
  firmeza.appendChild(rotulo);
  if (palavra !== 'cedeu' && palavra !== 'sem ninguém') {
    const conta = document.createElement('span');
    conta.className = 'batalha__firmeza-conta';
    conta.textContent = `faltam ${separarMilhar(restam)} para quebrar`;
    firmeza.appendChild(conta);
  }
  coluna.appendChild(firmeza);

  const trilho = document.createElement('div');
  trilho.className = 'batalha__trilho';
  const cheio = document.createElement('div');
  cheio.className = 'batalha__cheio';
  cheio.style.width = `${(vivos / regua) * 100}%`;
  // A cor do PODER pinta o fundo; as faixas das armas vão por cima. Um exército só de leves
  // continua sendo uma barra lisa — a divisão só aparece em quem misturou.
  cheio.style.background = lado.cor;
  if (fase === 'perseguicao') cheio.dataset['fase'] = 'perseguicao';
  const presentes = ARMAS.filter((arma) => (lado.composicao[arma] ?? 0) > 0);
  if (presentes.length > 1) {
    for (const arma of presentes) {
      const faixa = document.createElement('div');
      faixa.className = 'batalha__faixa';
      faixa.style.flex = String(lado.composicao[arma] ?? 0);
      faixa.style.background = COR_DA_ARMA[arma];
      cheio.appendChild(faixa);
    }
  }
  trilho.appendChild(cheio);

  // ⚠️ **O SEGMENTO FANTASMA**: a fatia perdida NESTE round, desenhada logo à direita do que
  // sobrou. É o único efeito desta tela e é um `<div>` — e faz o jogador ler o golpe como
  // FRAÇÃO DO TODO, sem número nenhum. A barra sozinha diz que ele está mal; o fantasma diz
  // o quanto disso aconteceu agora.
  const perdeuAgora = antes - vivos;
  if (perdeuAgora > 0) {
    const fantasma = document.createElement('div');
    fantasma.className = 'batalha__fantasma';
    fantasma.style.width = `${(perdeuAgora / regua) * 100}%`;
    fantasma.style[qual === 'a' ? 'left' : 'right'] = `${(vivos / regua) * 100}%`;
    trilho.appendChild(fantasma);
  }

  // ⚠️ **O TRAÇO DO LIMIAR, desenhado desde o round zero e nos DOIS lados.** É o que transforma
  // a barra numa contagem com destino: ela não desce rumo ao zero, desce rumo a este filete. E
  // ele existe dos dois lados de propósito — a virada é possível nas duas direções, e ver a
  // própria distância até o traço encolher é o que impede a tela de virar contagem regressiva
  // de um lado só.
  if (lado.homens > 0) {
    const traco = document.createElement('div');
    traco.className = 'batalha__limiar';
    traco.style[qual === 'a' ? 'left' : 'right'] = `${((lado.homens * (1 - limiar)) / regua) * 100}%`;
    definirTooltip(traco, {
      titulo: 'Onde a linha cede',
      corpo: `Passando de ${Math.round(limiar * 100)}% de baixas, esta linha quebra e corre — e é na fuga que morre gente.`,
    });
    trilho.appendChild(traco);
  }
  coluna.appendChild(trilho);

  if (lado.aguento > 1) {
    const muro = document.createElement('p');
    muro.className = 'batalha__muro';
    muro.textContent = `muralha ×${lado.aguento}`;
    definirTooltip(muro, {
      titulo: 'A muralha',
      corpo: `Multiplica o que cada homem daqui aguenta antes de virar baixa. Ela é modificador VISÍVEL: não some dentro do número da defesa.`,
    });
    coluna.appendChild(muro);
  }

  if (presentes.length > 0) {
    const armas = document.createElement('ul');
    armas.className = 'batalha__armas';
    // Ordem fixa: quem olha precisa reconhecer a mesma leitura em toda batalha, e não
    // descobrir a ordem de cada uma.
    for (const arma of presentes) {
      const quantos = lado.composicao[arma] ?? 0;
      const vivosDaArma = lado.homens > 0 ? Math.round((quantos * vivos) / lado.homens) : 0;
      const item = document.createElement('li');
      const rotulo = document.createElement('span');
      rotulo.textContent = NOME_DA_ARMA[arma].toLowerCase();
      const marca = document.createElement('span');
      marca.className = 'batalha__marca-arma';
      marca.style.background = COR_DA_ARMA[arma];
      const quantia = document.createElement('span');
      quantia.className = 'batalha__quantia';
      quantia.textContent = separarMilhar(vivosDaArma);
      item.append(marca, rotulo, quantia);
      armas.appendChild(item);
    }
    coluna.appendChild(armas);
  }

  return coluna;
}

/**
 * O MEIO DO CAMPO: onde os dois se encontram.
 *
 * ⚠️ **Era o lugar mais vazio da tela, e devia ser o mais cheio.** Um glifo de espadas em corpo
 * 20 e um `0/3` em corpo 12, numa coluna de 64 px entre os dois exércitos — o centro de uma
 * janela de batalha ocupado por duas marcas que ninguém olha. Agora ele carrega o relógio da
 * batalha: o round como NÚMERO grande, o total embaixo, e as espadas mudando de cor com a fase
 * — bronze no choque, sangue na perseguição, fogo na retirada. É o único ponto da tela que se
 * move em toda rodada, e é para ele que o olho volta entre um lado e o outro.
 */
function meioDoCampo(
  round: number,
  total: number,
  acabou: boolean,
  fase: string | null,
): HTMLElement {
  const meio = document.createElement('div');
  meio.className = 'batalha__meio';
  meio.dataset['fase'] = acabou ? 'fim' : (fase ?? 'inicio');

  // ⚠️ **Lanças de verdade, e não um glifo de fonte.** Eram `⚔` e `·` — caracteres Unicode,
  // que cada fonte desenha do seu jeito e nenhuma desenha bem: no cartão saía um risco fino e
  // pálido no ponto mais central da tela. O projeto já tem vocabulário próprio em
  // `icones-gregos.ts` e a lança estava lá desde sempre. Duas, uma espelhada, cruzam no meio do
  // campo; no fim elas dão lugar ao escudo, que é quem ficou com ele.
  const marca = document.createElement('span');
  marca.className = 'batalha__cruzada';
  if (acabou) marca.appendChild(iconeGrego('escudo'));
  else marca.append(iconeGrego('lanca'), iconeGrego('lanca'));

  const numero = document.createElement('span');
  numero.className = 'batalha__round';
  numero.textContent = acabou ? 'fim' : String(round);

  meio.append(marca, numero);
  if (!acabou) {
    const de = document.createElement('span');
    de.className = 'batalha__round-total';
    de.textContent = `de ${total}`;
    meio.appendChild(de);
  }
  return meio;
}

/** A linha de abertura: quem trouxe quantos, e o que havia de pedra no caminho. */
function aberturaDe(vista: VistaDaBatalha): string {
  const [a, b] = vista.lados;
  const muro = b.aguento > 1 ? ', atrás de muralha' : '';
  return `${a.nome} traz ${separarMilhar(a.homens)}; ${b.nome} tem ${separarMilhar(b.homens)}${muro}.`;
}

/**
 * O que se diz de cada round.
 *
 * Texto e não número solto: a barra já mostra quanto encolheu, e a frase existe para dizer o
 * que aquilo FOI — a linha segurando, a linha cedendo, a caçada, a saída ordenada.
 *
 * ⚠️ **Ator, verbo, alvo — nunca voz passiva.** A margem esquerda é o que o olho varre; se ela
 * for ocupada pela vítima, o jogador lê a fita inteira sem saber quem bateu em quem.
 *
 * ⚠️ **E nenhum adjetivo que finja ser dado.** "Golpe devastador" que não corresponde a um
 * estado do sistema é ruído, e ruído ensina o jogador a ignorar o texto.
 */
function narrarRound(
  vista: VistaDaBatalha,
  round: number,
  perdaA: number,
  perdaB: number,
): string {
  const [a, b] = vista.lados;
  const fase = vista.rounds[round - 1]?.fase;

  if (fase === 'recuo') {
    const quemSaiu = vista.vencedor === 'a' ? b.nome : a.nome;
    // Duas saídas usam a mesma fase e contam histórias diferentes: uma é ordem dada antes da
    // marcha, a outra é o dia que acabou sem ninguém ceder. Dizer "recuou" nas duas faria a
    // tela chamar de covardia uma linha que aguentou o dia inteiro.
    return vista.desfecho === 'barrado'
      ? `${quemSaiu} gasta o dia e não passa: sai de campo sem ser caçado, mas o chão fica com o outro.`
      : `${quemSaiu} sai de campo antes de a linha ceder: paga o preço da retirada e escapa da perseguição.`;
  }
  if (fase === 'perseguicao') {
    const perdedor = vista.vencedor === 'a' ? b.nome : a.nome;
    const vencedor = vista.vencedor === 'a' ? a.nome : b.nome;
    return `A linha de ${perdedor} cede e corre. ${vencedor} caça os fugitivos — é aqui que morre gente.`;
  }
  if (perdaA > perdaB * 1.3) return `${b.nome} leva a melhor no empurrão; ${a.nome} recua um passo.`;
  if (perdaB > perdaA * 1.3) return `${a.nome} ganha terreno; a linha de ${b.nome} range.`;
  return 'As duas linhas se seguram, e ninguém cede.';
}
