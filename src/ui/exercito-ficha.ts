/**
 * A ficha do exército: o que esta hoste é, e o único comando que ela aceita hoje.
 *
 * Arquivo próprio, e essa é a correção que o dono do projeto pediu na revisão: ver e
 * dispensar tropa morava dentro do painel de RECRUTAMENTO, e aquilo só funcionava
 * enquanto exército e Quartel estivessem na mesma província. Assim que a hoste marchar,
 * ela deixa de ter qualquer relação com o lugar onde foi levantada — e um painel
 * chamado "Recrutar" não é o lugar de comandar uma tropa que está a três províncias dali.
 *
 * A separação que vale: **recrutar é uma ação da PROVÍNCIA; dispensar é uma ação da
 * HOSTE.** São seleções diferentes e viram painéis diferentes.
 */

import { definirTooltip } from './tooltip';
import type { Postura } from '@/combate/cerco';
import { rotularComIcone } from './icones-gregos';

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

/** O que a ficha precisa saber sobre a hoste selecionada. */
export interface VistaDoExercito {
  /**
   * Quem ela e. **E a chave de todo comando que a ficha emite.**
   *
   * Era a provincia, e isso passou a mentir quando sitiar deixou de engajar: numa cidade
   * sitiada ha duas hostes, e "a hoste da provincia" nao identifica nenhuma das duas.
   */
  hoste: { id: string };
  /** Onde ela esta. Titulo da ficha e texto do cerco - nunca endereco. */
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
   * ⚠️ A pergunta só existe para terra alheia, e só depois de o alvo ser escolhido.
   * Perguntar antes seria pedir uma decisão sobre um lugar que o jogador ainda não olhou;
   * perguntar numa marcha dentro do próprio território seria pedir uma decisão que não
   * existe.
   */
  alvo: {
    nome: string;
    /**
     * Quantas rodadas de cerco a muralha do alvo exige antes de um assalto. Zero na
     * cidade aberta.
     *
     * A pergunta é feita ANTES de a hoste sair, e a resposta muda a decisão: contra uma
     * cidade murada, "Assaltar" não é uma escolha que exista naquele dia.
     */
    rodadasDeCercoExigidas: number;
  } | null;
  /**
   * A surtida ao alcance desta hoste: sair para atacar quem cerca a cidade onde ela está.
   *
   * `null` quando não há cerco inimigo ali — e aí não há pergunta a fazer. É a única
   * decisão que o SITIADO tem: sitiar não engaja, então sem isto o
   * exército de dentro fica olhando o de fora para sempre.
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

export class ExercitoFicha {
  private readonly raiz = document.createElement('div');
  private readonly titulo = document.createElement('h2');
  private readonly tinta = document.createElement('span');
  private readonly dono = document.createElement('span');
  private readonly forca = document.createElement('p');
  private readonly custo = document.createElement('p');
  private readonly aviso = document.createElement('p');
  private readonly tituloOrigens = document.createElement('h3');
  private readonly origens = document.createElement('dl');
  private readonly quantidade = document.createElement('p');
  private readonly campoHomens = document.createElement('input');
  private readonly atalhos = document.createElement('div');
  private readonly botaoMover = document.createElement('button');
  private readonly instrucao = document.createElement('p');
  private readonly linhaOrdem = document.createElement('p');
  private readonly perguntaDoAlvo = document.createElement('p');
  private readonly seletorDePostura = document.createElement('div');
  private readonly botaoAssaltar = document.createElement('button');
  private readonly botaoSitiar = document.createElement('button');
  private readonly botaoSurtida = document.createElement('button');
  private readonly linhaCerco = document.createElement('p');
  private readonly botaoTrocarPostura = document.createElement('button');
  private readonly botaoCancelar = document.createElement('button');
  /** De quem é a quantidade que está no campo. Trocar de hoste reinicia o campo. */
  private quantidadeDe: string | null = null;
  private readonly botaoDispensar = document.createElement('button');
  private vista: VistaDoExercito | null = null;

  /** Liga e desliga o modo de marcha. Quem sabe para onde dá pra ir é a campanha. */
  aoAlternarMarcha: (idHoste: string) => void = () => {};
  /** Quantos homens o jogador quer mandar. Lida quando ele escolhe o destino no mapa. */
  aoMudarQuantidade: (homens: number) => void = () => {};
  aoCancelarOrdem: (idHoste: string) => void = () => {};
  /** A postura da ordem que está sendo composta. */
  aoEscolherPostura: (postura: Postura) => void = () => {};
  /** A postura de um cerco JÁ em pé. Vale na próxima virada, como toda ordem. */
  aoTrocarPosturaDoCerco: (idProvincia: string, postura: Postura) => void = () => {};
  /** Manda a hoste sitiada sair para lutar. Vale na próxima virada, como toda ordem. */
  aoSurtir: (idHoste: string) => void = () => {};
  aoDispensar: (idHoste: string, homens: number) => void = () => {};

  constructor(pai: HTMLElement) {
    this.raiz.className = 'exercito';
    this.raiz.hidden = true;

    this.titulo.className = 'exercito__titulo';
    rotularComIcone(this.titulo, 'escudo', 'Exército');

    const linhaDono = document.createElement('p');
    linhaDono.className = 'exercito__poder';
    this.tinta.className = 'exercito__tinta';
    this.dono.className = 'exercito__nome-do-poder';
    linhaDono.append(this.tinta, this.dono);

    this.forca.className = 'exercito__forca';
    this.custo.className = 'exercito__custo';
    this.aviso.className = 'exercito__aviso';

    this.tituloOrigens.className = 'exercito__grupo';
    this.tituloOrigens.textContent = 'De onde vieram';
    this.origens.className = 'exercito__origens';

    this.quantidade.className = 'exercito__quantidade';
    this.quantidade.setAttribute('aria-live', 'polite');

    this.campoHomens.className = 'exercito__valor';
    this.campoHomens.type = 'range';
    this.campoHomens.min = '1';
    this.campoHomens.step = '1';
    this.campoHomens.setAttribute('aria-label', 'Quantidade de soldados para mover');
    definirTooltip(this.campoHomens, {
      titulo: 'Força da marcha',
      corpo: 'Quem não marchar permanece defendendo a província.',
      tom: 'perigo',
    });
    this.campoHomens.addEventListener('input', () => {
      this.atualizarQuantidade();
      this.aoMudarQuantidade(Number(this.campoHomens.value));
    });

    this.atalhos.className = 'exercito__atalhos';
    for (const [rotulo, fracao] of [
      ['25%', 0.25],
      ['50%', 0.5],
      ['75%', 0.75],
      ['Todos', 1],
    ] as const) {
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'exercito__atalho';
      botao.textContent = rotulo;
      botao.addEventListener('click', () => {
        const vista = this.vista;
        if (!vista?.minha || vista.forca === 0) return;
        this.campoHomens.value = String(Math.max(1, Math.floor(vista.forca * fracao)));
        this.atualizarQuantidade();
        this.aoMudarQuantidade(Number(this.campoHomens.value));
        botao.blur();
      });
      this.atalhos.appendChild(botao);
    }

    this.botaoCancelar.className = 'botao exercito__botao';
    this.botaoCancelar.type = 'button';
    this.botaoCancelar.textContent = 'Cancelar ordem';
    definirTooltip(this.botaoCancelar, {
      titulo: 'Cancelar ordem',
      corpo: 'Cancela antes da próxima virada.',
    });
    this.botaoCancelar.addEventListener('click', () => {
      const vista = this.vista;
      // ⚠️ A surtida também é ordem aqui. Sem esta segunda condição o botão aparecia e não
      // fazia nada: quem tivesse declarado a surtida ficava preso a ela até a virada.
      if (!vista || (vista.ordem === null && vista.surtida?.declarada !== true)) return;
      this.aoCancelarOrdem(vista.hoste.id);
      this.botaoCancelar.blur();
    });

    this.linhaOrdem.className = 'exercito__ordem';

    // A escolha de postura mora junto da quantidade porque é a mesma decisão: quantos vão,
    // e para quê. Dois botões e não um interruptor: "assaltar" e "sitiar" são coisas
    // diferentes, e um interruptor esconderia metade do vocabulário.
    this.perguntaDoAlvo.className = 'exercito__pergunta';
    this.seletorDePostura.className = 'exercito__postura';
    for (const [botao, postura, rotulo, icone, titulo, corpo] of [
      [
        this.botaoAssaltar,
        'assaltar' as const,
        'Assaltar',
        'lanca' as const,
        'Assaltar a cidade',
        'Ataca agora. Enfrenta a guarnição e depois a milícia.',
      ],
      [
        this.botaoSitiar,
        'sitiar' as const,
        'Sitiar',
        'muralha' as const,
        'Sitiar a cidade',
        'Corta produção e comércio sem atacar a guarnição.',
      ],
    ] as const) {
      botao.className = 'botao exercito__botao exercito__botao--postura';
      botao.type = 'button';
      rotularComIcone(botao, icone, rotulo);
      definirTooltip(botao, { titulo, corpo });
      botao.addEventListener('click', () => {
        this.aoEscolherPostura(postura);
        botao.blur();
      });
      this.seletorDePostura.appendChild(botao);
    }

    this.botaoSurtida.className = 'botao exercito__botao exercito__botao--surtida';
    this.botaoSurtida.type = 'button';
    this.botaoSurtida.addEventListener('click', () => {
      const vista = this.vista;
      if (!vista?.minha || !vista.surtida) return;
      this.aoSurtir(vista.hoste.id);
      this.botaoSurtida.blur();
    });

    this.linhaCerco.className = 'exercito__cerco';
    this.botaoTrocarPostura.className = 'botao exercito__botao';
    this.botaoTrocarPostura.type = 'button';
    this.botaoTrocarPostura.addEventListener('click', () => {
      const vista = this.vista;
      if (!vista?.cerco) return;
      this.aoTrocarPosturaDoCerco(
        vista.provincia.id,
        vista.cerco.postura === 'sitiar' ? 'assaltar' : 'sitiar',
      );
      this.botaoTrocarPostura.blur();
    });

    this.botaoMover.className = 'botao botao--principal exercito__botao';
    this.botaoMover.type = 'button';
    this.botaoMover.addEventListener('click', () => {
      const vista = this.vista;
      if (!vista?.minha) return;
      this.aoAlternarMarcha(vista.hoste.id);
      // `blur` no fim do clique: sem isso o botão fica com foco e a barra de espaço, que
      // passa o turno, dispara um clique sintético nele.
      this.botaoMover.blur();
    });

    this.instrucao.className = 'exercito__instrucao';

    this.botaoDispensar.className = 'botao exercito__botao';
    this.botaoDispensar.type = 'button';
    definirTooltip(this.botaoDispensar, {
      titulo: 'Dispensar hoste',
      corpo: 'Os homens retornam às populações de origem.',
      tom: 'perigo',
    });
    this.botaoDispensar.addEventListener('click', () => {
      const vista = this.vista;
      if (!vista?.minha || vista.forca <= 0) return;
      this.aoDispensar(vista.hoste.id, vista.forca);
      this.botaoDispensar.blur();
    });

    this.raiz.append(
      this.titulo,
      linhaDono,
      this.forca,
      this.custo,
      this.aviso,
      this.tituloOrigens,
      this.origens,
      this.quantidade,
      this.campoHomens,
      this.atalhos,
      this.perguntaDoAlvo,
      this.seletorDePostura,
      this.botaoMover,
      this.instrucao,
      this.linhaOrdem,
      this.botaoCancelar,
      this.botaoSurtida,
      this.linhaCerco,
      this.botaoTrocarPostura,
      this.botaoDispensar,
    );
    pai.appendChild(this.raiz);
  }

  /** `null` esconde a ficha — é o estado em que nenhuma hoste está selecionada. */
  mostrar(vista: VistaDoExercito | null): void {
    this.vista = vista;
    this.raiz.hidden = vista === null;
    if (!vista) return;

    rotularComIcone(this.titulo, 'escudo', `Exército em ${vista.provincia.nome}`);
    this.tinta.style.background = vista.poder.cor;
    this.dono.textContent = vista.poder.nome;
    this.forca.textContent = `${numero(vista.forca)} homens`;
    this.custo.textContent = `custa ${numero(vista.manutencao)} por turno`;

    // Estar em terra alheia ainda não faz nada — não há guerra. Mas é um fato que o
    // jogador precisa ver desde já, senão a primeira marcha vai parecer que não aconteceu.
    if (vista.emTerraAlheia) this.aviso.textContent = 'em território que não é seu';

    // As origens são o que torna dispensar uma decisão em vez de um botão: uma hoste
    // levantada em província que caiu devolve aquela gente ao inimigo.
    this.origens.replaceChildren(
      ...vista.origens.flatMap((o) => {
        const dt = document.createElement('dt');
        dt.textContent = o.nome;
        const dd = document.createElement('dd');
        dd.textContent = o.perdida
          ? `${numero(o.homens)} · voltam para ${o.donoAtual}`
          : numero(o.homens);
        if (o.perdida) {
          dt.className = 'exercito__perdida';
          dd.className = 'exercito__perdida';
          definirTooltip(dd, {
            titulo: 'Terra natal perdida',
            corpo:
              'Dispensados, estes homens retornam para quem atualmente controla sua ' +
              'província de origem.',
            tom: 'perigo',
          });
        }
        return [dt, dd];
      }),
    );

    // Só a hoste do jogador aceita comando. A do vizinho continua com ficha — saber a
    // força de quem está do outro lado da fronteira é informação, não ação.
    this.botaoMover.hidden = !vista.minha;
    rotularComIcone(this.botaoDispensar, 'capacete', `Dispensar ${numero(vista.forca)}`);

    // Uma ordem em pé tranca o resto: uma por hoste por rodada. Em vez de esconder os
    // controles, mostra-se a ordem e o jeito de desfazê-la.
    //
    // ⚠️ **A surtida conta como ordem.** Ela não é marcha nenhuma, mas ocupa a rodada da
    // hoste do mesmo jeito, e por isso tranca os mesmos controles e é desfeita pelo mesmo
    // botão de cancelar. Duas maneiras diferentes de desfazer "o que esta hoste vai fazer"
    // seriam duas maneiras de o jogador se perder.
    const surtida = vista.surtida;
    const vaiSurtir = surtida?.declarada === true;
    const temOrdem = vista.ordem !== null || vaiSurtir;
    this.linhaOrdem.hidden = !temOrdem;
    this.botaoCancelar.hidden = !temOrdem;
    if (vista.ordem) {
      this.linhaOrdem.textContent = `${numero(vista.ordem.homens)} marcham para ${vista.ordem.destino} ao passar o turno`;
    } else if (surtida && vaiSurtir) {
      this.linhaOrdem.textContent = `a hoste sai para atacar ${surtida.contra} ao passar o turno`;
    }

    // O botão só existe para quem está sitiado: é a decisão de DENTRO, e some assim que a
    // cidade se solta. Some também durante a escolha de destino, que é a outra decisão.
    this.botaoSurtida.hidden = !vista.minha || surtida === null || temOrdem || vista.marchando;
    if (surtida) {
      rotularComIcone(this.botaoSurtida, 'capacete', `Surtida contra ${surtida.contra}`);
      definirTooltip(this.botaoSurtida, {
        titulo: 'Atacar o sitiante',
        corpo: 'Vencendo, o cerco termina. A milícia fica na cidade.',
        tom: 'perigo',
      });
    }

    // A barra reinicia com a força inteira quando o jogador troca de hoste — mandar tudo
    // é o caso comum. O `max` vem antes do valor para o navegador não limitá-lo ao padrão 100.
    this.campoHomens.max = String(vista.forca);
    if (this.quantidadeDe !== vista.hoste.id) {
      this.quantidadeDe = vista.hoste.id;
      this.campoHomens.value = String(vista.forca);
      this.aoMudarQuantidade(vista.forca);
    }
    this.atualizarQuantidade();
    this.quantidade.hidden = !vista.minha || temOrdem;
    this.campoHomens.hidden = !vista.minha || temOrdem;
    this.atalhos.hidden = !vista.minha || temOrdem;

    // Nada de sumir em silêncio: sem destino, o botão fica na tela dizendo o motivo. É
    // assim que o jogador descobre que a marcha só passa por território dele.
    const semDestino = vista.destinos === 0;
    this.botaoMover.hidden = !vista.minha || temOrdem;
    this.botaoMover.disabled = semDestino;
    const rotuloMover = semDestino
      ? 'Mover · sem caminho pelo seu território'
      : vista.marchando
        ? 'Escolhendo destino — cancelar'
        : 'Mover';
    rotularComIcone(this.botaoMover, 'lanca', rotuloMover);
    definirTooltip(this.botaoMover, {
      titulo: 'Ordenar marcha',
      corpo: semDestino
        ? 'Não há destino alcançável pelo seu território.'
        : 'A ordem será resolvida na próxima virada.',
    });

    // ⚠️ **Enquanto se escolhe destino, o painel encolhe.** Ele fica em baixo-direita, por
    // cima do mapa, e cresceu com o seletor de postura até cobrir um destino clicável —
    // o jogador via o alvo e o clique não chegava nele. Some o que não é a decisão do
    // momento: de onde os homens vieram e o botão de dispensar. Nada disso desaparece de
    // vez, e é o próprio botão "Mover" que traz tudo de volta ao cancelar.
    // Fica só o que É a decisão: quantos vão, para quê, e para onde. O cabeçalho de força
    // é redundante aqui — a linha da quantidade já diz "1.000 de 1.000 marcham".
    this.forca.hidden = vista.marchando;
    this.custo.hidden = vista.marchando;
    this.aviso.hidden = vista.marchando || !vista.emTerraAlheia;
    this.tituloOrigens.hidden = vista.marchando;
    this.origens.hidden = vista.marchando;
    this.botaoDispensar.hidden = vista.marchando || !vista.minha;

    // O seletor só aparece com um alvo hostil apontado: é a pergunta "o que fazer ao
    // chegar em Elêusis?", e ela não faz sentido sem o Elêusis.
    this.seletorDePostura.hidden = vista.alvo === null;
    this.perguntaDoAlvo.hidden = vista.alvo === null;
    if (vista.alvo) {
      // ⚠️ **Contra cidade murada, assaltar não é escolha daquele dia.** O botão continua
      // na tela, desabilitado e dizendo por quê: escondê-lo faria a diferença entre uma
      // cidade aberta e uma fortificada parecer defeito da interface. A pergunta em cima
      // conta a mesma coisa em palavras, porque é ela que o jogador lê primeiro.
      const muralha = vista.alvo.rodadasDeCercoExigidas;
      // ⚠️ **O motivo vai na PERGUNTA, não no rótulo do botão.** Os dois botões dividem
      // uma grade de duas colunas, e um rótulo comprido vaza por cima do vizinho — foi o
      // que a captura mostrou. Em cima há linha inteira para escrever a frase toda.
      this.perguntaDoAlvo.textContent =
        muralha > 0
          ? `${vista.alvo.nome} é murada: exige ${muralha} ${muralha === 1 ? 'rodada' : 'rodadas'} de cerco antes de um assalto`
          : `${vista.alvo.nome}: o que fazer ao chegar?`;
      this.botaoAssaltar.disabled = muralha > 0;
    }

    const cerco = vista.cerco;
    this.linhaCerco.hidden = cerco === null;
    this.botaoTrocarPostura.hidden = cerco === null || !vista.minha;
    if (cerco) {
      this.linhaCerco.textContent =
        cerco.postura === 'sitiar'
          ? `Acampado diante de ${vista.provincia.nome} — sem produção nem comércio lá dentro`
          : `Assaltando ${vista.provincia.nome} na próxima virada`;
      // A muralha tranca o assalto até o cerco ter durado o bastante. O botão fica na
      // tela dizendo quanto falta — some em silêncio seria o jogador achando que o
      // comando sumiu.
      const faltam = cerco.faltamParaAssaltar;
      const trancado = cerco.postura === 'sitiar' && faltam > 0;
      this.botaoTrocarPostura.disabled = trancado;
      rotularComIcone(
        this.botaoTrocarPostura,
        cerco.postura === 'sitiar' ? 'lanca' : 'muralha',
        cerco.postura !== 'sitiar'
          ? 'Voltar a sitiar'
          : trancado
            ? `Passar ao assalto · faltam ${faltam}`
            : 'Passar ao assalto',
      );
      definirTooltip(this.botaoTrocarPostura, {
        titulo: trancado ? 'A muralha ainda segura' : cerco.postura === 'sitiar' ? 'Passar ao assalto' : 'Voltar a sitiar',
        corpo: trancado
          ? `Faltam ${faltam} ${faltam === 1 ? 'rodada' : 'rodadas'} para assaltar.`
          : 'A nova postura vale na próxima virada.',
      });
    }

    // Com o alvo apontado, a instrução some: a pergunta acima já diz o que falta fazer.
    this.instrucao.hidden = !vista.marchando || vista.alvo !== null;
    this.instrucao.textContent = vista.marchando
      ? `Clique num dos ${numero(vista.destinos)} destinos marcados no mapa. Clicar em outro lugar cancela.`
      : '';
  }

  private atualizarQuantidade(): void {
    const vista = this.vista;
    if (!vista) return;
    this.quantidade.textContent = `${numero(Number(this.campoHomens.value))} de ${numero(vista.forca)} marcham`;
  }
}

function numero(valor: number): string {
  return valor.toLocaleString('pt-BR');
}
