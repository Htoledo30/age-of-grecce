import '@/estilo/base.css';
import '@/ui/icones-gregos.css';
import '@/ui/painel-fps.css';
import '@/ui/painel-lateral.css';
import '@/ui/ficha-provincia.css';
import '@/ui/acoes-provincia.css';
import '@/ui/governo.css';
import '@/ui/inicio-jogo.css';
import '@/ui/controles.css';
import '@/ui/barra-turno.css';
import '@/ui/recrutamento.css';
import '@/ui/exercito-ficha.css';
import '@/ui/marchas-mapa.css';
import '@/ui/hostes-mapa.css';
import '@/ui/destinos-mapa.css';
import '@/ui/cercos-mapa.css';
import '@/ui/cronica.css';
import '@/ui/tooltip.css';

import { iniciarEscala } from '@/estilo/escala';
import { Entrada } from '@/nucleo/entrada';
import { iniciarLaco } from '@/nucleo/tempo';
import {
  carregarAjustes,
  carregarConstrucoes,
  carregarEconomia,
  carregarExercitos,
  carregarMundo,
  carregarProvincias,
} from '@/dados/carregar';
import { CenaMapa } from '@/mapa/cena-mapa';
import { PainelFps } from '@/ui/painel-fps';
import { PainelLateral } from '@/ui/painel-lateral';
import { AcoesProvincia } from '@/ui/acoes-provincia';
import { Governo } from '@/ui/governo';
import { Balanco } from '@/ui/balanco';
import type { VistaDeAcoes } from '@/ui/acoes-provincia';
import { FichaProvincia } from '@/ui/ficha-provincia';
import type { VistaDaProvincia } from '@/ui/ficha-provincia';
import { Recrutamento } from '@/ui/recrutamento';
import type { VistaDeRecrutamento } from '@/ui/recrutamento';
import { ExercitoFicha } from '@/ui/exercito-ficha';
import type { VistaDoExercito } from '@/ui/exercito-ficha';
import { AnimacaoDeMarcha } from '@/ui/animacao-de-marcha';
import type { TrechoDeMarcha } from '@/ui/animacao-de-marcha';
import { MarchasMapa } from '@/ui/marchas-mapa';
import type { OrdemNoMapa, PontoDeMarcha, PrevisaoDeMarcha } from '@/ui/marchas-mapa';
import { HostesMapa } from '@/ui/hostes-mapa';
import type { MarcadorDeHoste } from '@/ui/hostes-mapa';
import { DestinosMapa } from '@/ui/destinos-mapa';
import type { Destino } from '@/ui/destinos-mapa';
import { forcaDe } from '@/combate/exercito';
import type { Exercito } from '@/combate/exercito';
import { CercosMapa } from '@/ui/cercos-mapa';
import type { MarcaDeCerco } from '@/ui/cercos-mapa';
import { Cronica } from '@/ui/cronica';
import type { LinhaDaCronica } from '@/ui/cronica';
import { InicioJogo } from '@/ui/inicio-jogo';
import { BarraTurno } from '@/ui/barra-turno';
import { Tooltips } from '@/ui/tooltip';
import { Campanha } from '@/campanha/campanha';
import { Atlas } from '@/mundo/atlas';

function exigir<T extends Element>(seletor: string): T {
  const el = document.querySelector<T>(seletor);
  if (!el) throw new Error(`elemento ausente no index.html: ${seletor}`);
  return el;
}

async function iniciar(): Promise<void> {
  const palco = exigir<HTMLElement>('#palco');
  const canvas = exigir<HTMLCanvasElement>('#mundo');
  const ui = exigir<HTMLElement>('#ui');

  iniciarEscala(palco);
  // Uma camada única substitui os balões nativos do navegador. Todo componente apenas
  // declara o conteúdo; atraso, posição, moldura e fechamento pertencem a ela.
  new Tooltips(ui);

  const mundo = carregarMundo();
  const ajustes = carregarAjustes();
  const provincias = await carregarProvincias(
    new URL('mundo/provincias.json', document.baseURI).href,
  );
  const cena = await CenaMapa.criar(canvas, mundo, ajustes, provincias);
  // A entrada escuta o CANVAS, não o palco: assim clique em painel não vira clique no
  // mapa. O #ui é transparente a ponteiro por padrão e cada painel liga o seu.
  const entrada = new Entrada(canvas);
  const painel = new PainelFps(ui);

  const lateral = new PainelLateral(ui, cena.coresDosPoderes);
  lateral.aoTrocarCores = (ligadas) => cena.mostrarCoresDosPoderes(ligadas);

  // Identidade primeiro, decisões depois: a província selecionada abre a coluna e as
  // ações seguem abaixo. É a ordem de leitura de uma interface de estratégia, não a
  // ordem em que os sistemas foram implementados.
  const colunaProvincia = document.createElement('div');
  colunaProvincia.className = 'coluna-provincia';
  ui.appendChild(colunaProvincia);
  const ficha = new FichaProvincia(colunaProvincia);
  const acoes = new AcoesProvincia(colunaProvincia);
  // Recrutar é outra mecânica de investir e construir: mexe em gente, não em dinheiro.
  // Por isso permanece num bloco próprio, recolhível, depois das ações da província.
  const recrutamento = new Recrutamento(colunaProvincia);
  ficha.usarCatalogo(
    Object.fromEntries(
      Object.entries(carregarConstrucoes().construcoes).map(([id, c]) => [id, c.nome]),
    ),
  );
  // As rotas ficam atrás das peças: possibilidade tracejada, ordem registrada cheia.
  const marchasMapa = new MarchasMapa(ui);
  // A bandeira de cerco vem ANTES das hostes: DOM anterior é desenhado por baixo, e o
  // número de homens do defensor tem que ficar legível por cima da chama.
  const cercosMapa = new CercosMapa(ui);
  // Os marcadores ficam numa camada própria sobre o mapa, e não dentro de painel nenhum:
  // eles pertencem ao mundo, e é a câmera que decide onde cada um aparece.
  const hostesMapa = new HostesMapa(ui);
  // A marcha é ILUSTRAÇÃO: a campanha já resolveu a rodada, e isto só atrasa a peça no
  // caminho pra que a ordem dada na rodada anterior aconteça diante do jogador.
  const animacaoDeMarcha = new AnimacaoDeMarcha();
  // Os destinos ficam por cima das hostes: o alvo de uma ordem em curso tem que estar
  // clicável mesmo quando cai sobre uma província que já tem tropa.
  const destinosMapa = new DestinosMapa(ui);
  // A hoste escolhida ganha região própria, em baixo-centro: ela não é a província, e
  // assim que marchar as duas deixam de coincidir.
  const exercitoFicha = new ExercitoFicha(ui);
  // A crônica fica no alto à direita, sozinha: é notícia da rodada inteira, não de uma
  // província nem de uma hoste, e não pertence a nenhuma das colunas.
  const cronica = new Cronica(ui);
  const inicio = new InicioJogo(ui);
  const barraTurno = new BarraTurno(ui);
  // A casca de governo já nasce com abas: a segunda (poderes, diplomacia, modos de mapa)
  // vai custar uma linha aqui em vez de uma remodelação de layout.
  const balanco = new Balanco();
  const governo = new Governo(ui, [balanco]);
  // O atlas é a geografia assada, indexada e imutável; a campanha é só as regras. Combate
  // e diplomacia vão ler o MESMO atlas, em vez de cada um montar o próprio índice.
  const atlas = new Atlas(provincias);
  const campanha = new Campanha(
    atlas,
    carregarEconomia(),
    carregarConstrucoes(),
    ajustes.jogo,
    carregarExercitos(),
  );
  let fase: 'menu' | 'escolha' | 'campanha' = 'menu';
  /** O ID da província escolhida — não uma ficha montada, que envelheceria. */
  let selecionada: string | null = null;
  /**
   * O ID da HOSTE escolhida, ou `null`.
   *
   * Seleção separada da província de propósito: clicar no marcador escolhe a tropa,
   * clicar no mapa escolhe o chão. São duas coisas diferentes no mesmo lugar, e é por
   * isso que dispensar saiu do painel de recrutamento.
   *
   * ⚠️ **Guardava a província, e isso passou a mentir.** Desde que sitiar deixou de
   * engajar o exército de dentro, o sitiante e a guarnição ficam na MESMA província —
   * "a hoste daquela província" não identifica nenhuma das duas.
   */
  let hosteSelecionada: string | null = null;
  /**
   * O ID da hoste que está compondo uma marcha, ou `null`.
   *
   * Modo, e não intenção guardada: enquanto ele existe, o mapa mostra destinos e um
   * clique fora deles cancela. Nada é reservado, nada é gasto — a ordem só acontece no
   * clique no destino.
   */
  let marchando: string | null = null;
  /** Quantos homens o jogador quer mandar na próxima ordem. O painel é quem escreve. */
  let homensParaMarchar = 0;
  /** Destinos que acabaram de receber tropa; existem só durante o pulso de chegada. */
  /**
   * O destino HOSTIL já apontado, esperando o jogador dizer o que fazer ao chegar.
   *
   * ⚠️ Só existe para terra alheia. Destino amigo registra a ordem no clique, como sempre
   * — perguntar "assaltar ou sitiar?" para uma marcha dentro do próprio território seria
   * pedir uma decisão que não existe.
   */
  let alvoHostil: string | null = null;
  /** Ids das HOSTES que acabaram de chegar; existem só durante o pulso. */
  const chegadasRecentes = new Set<string>();
  let temporizadorDaChegada: number | undefined;

  /**
   * Monta a ficha de uma província juntando as duas verdades: o atlas diz o que ela É, a
   * campanha diz de quem ela É AGORA.
   *
   * Montar isto a cada desenho, em vez de guardar o resultado, é o que garante que
   * conquistar uma província atualize a ficha dela no mesmo instante.
   */
  function vistaDaProvincia(id: string): VistaDaProvincia {
    const p = atlas.provincia(id);
    const poder = campanha.poder(campanha.donoDe(id));
    return {
      nome: p.nome,
      regiao: p.regiao,
      poder: { nome: poder.nome, povo: poder.povo, cor: poder.cor },
      milicia: campanha.miliciaEm(id),
      cerco: (() => {
        const cerco = campanha.cercoEm(id);
        return cerco ? { sitiante: campanha.poder(cerco.sitiante).nome } : null;
      })(),
    };
  }

  /**
   * Redesenha a barra a partir do estado, inteira, sempre.
   *
   * Sem diferença incremental de propósito: são cinco números, refazer custa menos que
   * comparar, e é isso que garante que a tela nunca discorde da campanha.
   */
  function repintar(): void {
    const jogador = campanha.jogador;
    barraTurno.mostrar(
      jogador === null
        ? null
        : {
            poder: jogador,
            ano: campanha.ano,
            turno: campanha.turno,
            tesouro: campanha.tesouro,
            renda: campanha.renda,
            manutencao: campanha.manutencao,
            provincias: campanha.provinciasDe(jogador.id).length,
          },
    );

    // A ficha e o painel de investir são desenhados a partir da MESMA seleção, sempre
    // juntos: assim não existe estado em que um mostra uma província e o outro, outra.
    const obraNaFicha = selecionada ? campanha.obraEm(selecionada) : undefined;
    ficha.mostrar(
      selecionada ? vistaDaProvincia(selecionada) : null,
      selecionada ? campanha.economiaDe(selecionada) : null,
      obraNaFicha
        ? {
            nome: campanha.construcoesDisponiveis[obraNaFicha.construcao]?.nome ?? '',
            turnosRestantes: obraNaFicha.turnosRestantes,
          }
        : null,
      selecionada ? campanha.crescimentoDe(selecionada) : null,
      selecionada ? campanha.perfilDe(selecionada) : null,
    );

    acoes.mostrar(vistaDeAcoes());
    recrutamento.mostrar(vistaDeRecrutamento());

    // A hoste selecionada pode ter deixado de existir (dispensada, desertada). Limpar
    // ANTES de montar a vista é o que impede a ficha de descrever um exército que já não
    // está no mapa.
    if (hosteSelecionada !== null && !campanha.hoste(hosteSelecionada)) {
      hosteSelecionada = null;
    }
    // O modo de marcha só vale pela hoste selecionada e enquanto ela existir: dispensar
    // ou trocar de seleção derruba a ordem em composição, em vez de deixá-la apontando
    // pra uma tropa que não está mais ali.
    if (marchando !== null && (marchando !== hosteSelecionada || !campanha.hoste(marchando))) {
      marchando = null;
    }
    // Sem marcha em composição não há alvo apontado: os dois vivem e morrem juntos.
    if (marchando === null) alvoHostil = null;

    cercosMapa.mostrar(fase === 'campanha' ? marcasDeCerco() : []);
    hostesMapa.mostrar(fase === 'campanha' ? marcadoresDasHostes() : []);
    hostesMapa.selecionar(hosteSelecionada);
    const previsao = previsaoDaMarcha();
    marchasMapa.mostrar(previsao.origem, previsao.rotas, ordensNoMapa());
    destinosMapa.mostrar(destinosDaMarcha());
    exercitoFicha.mostrar(vistaDoExercito());

    // A janela de governo se redesenha junto com o resto, mas só quando está aberta:
    // fechada, montar a tabela seria trabalho jogado fora a cada turno.
    const doBalanco = vistaDoBalanco();
    if (governo.visivel && doBalanco) balanco.desenhar(doBalanco);
  }

  /**
   * O que o bloco de ações mostra agora.
   *
   * Sem seleção, não existe alvo nem decisão: o bloco some para devolver o mapa ao
   * jogador. Com uma província selecionada ele permanece visível mesmo quando não dá pra
   * agir, explicando o impedimento em vez de esconder a existência da mecânica.
   */
  function vistaDeAcoes(): VistaDeAcoes | null {
    if (fase !== 'campanha') return null;
    const alvo = selecionada;
    if (!alvo) return null;
    const nomeDoAlvo = atlas.nomeDe(alvo);
    // O portão é a PROVÍNCIA, não uma ação: estar sem dinheiro não pode esconder a lista
    // de construções, senão o jogador quebrado deixa de ver o que existe pra comprar.
    const r = campanha.podeAgirEm(alvo);
    if (!r.pode) return { pode: false, motivo: `${nomeDoAlvo}: ${r.motivo}.` };
    const erguidas = campanha.construcoesEm(alvo);
    const obra = campanha.obraEm(alvo);
    return {
      pode: true,
      provincia: { id: alvo, nome: nomeDoAlvo },
      construcoes: Object.entries(campanha.construcoesDisponiveis).map(([id, c]) => {
        const conta = campanha.retornoDaConstrucaoEm(alvo, id);
        const impactoPopulacional = campanha.impactoPopulacionalDaConstrucaoEm(alvo, id);
        const r = campanha.podeConstruir(alvo, id);
        return {
          id,
          nome: c.nome,
          custo: c.custo,
          turnos: c.turnos,
          erguida: erguidas.includes(id),
          emObra: obra?.construcao === id ? obra.turnosRestantes : null,
          recusa: r.pode ? null : r.motivo,
          motivo: c.motivo,
          ganhoPorTurno: conta?.ganhoPorTurno ?? 0,
          turnosParaPagar: conta?.turnosParaPagar ?? Number.POSITIVE_INFINITY,
          promessa:
            c.efeito.tipo === 'capacidade'
              ? c.efeito.promessa
              : c.efeito.tipo === 'populacao'
                ? `${c.efeito.promessa} Aqui: +${impactoPopulacional?.antes ?? 0} → +${impactoPopulacional?.depois ?? 0} habitantes por turno.`
                : null,
        };
      }),
      bonusAtual: campanha.investimentoEm(alvo)?.percentual ?? 0,
      arrecadacoesRestantes: campanha.investimentoEm(alvo)?.arrecadacoesRestantes ?? 0,
      maximo: Math.min(campanha.tesouro, ajustes.jogo.economia.investimento.maximo),
      avaliar: (valor) => campanha.podeInvestir(alvo, valor),
      duracao: ajustes.jogo.economia.investimento.arrecadacoes,
      retorno: (valor) => campanha.retornoDe(alvo, valor),
    };
  }

  /**
   * O que o bloco de recrutamento mostra agora.
   *
   * Mesma regra do bloco de ações: sem província selecionada, some. Quando há alvo, mas
   * não dá pra recrutar, diz o motivo — é assim que o jogador descobre que existe Quartel.
   */
  function vistaDeRecrutamento(): VistaDeRecrutamento | null {
    if (fase !== 'campanha') return null;
    const alvo = selecionada;
    if (!alvo) return null;
    const naProvincia = campanha.podeAgirEm(alvo);
    if (!naProvincia.pode)
      return { pode: false, motivo: `${atlas.nomeDe(alvo)}: ${naProvincia.motivo}.` };
    if (!campanha.podeRecrutarEm(alvo)) {
      return {
        pode: false,
        motivo: `${atlas.nomeDe(alvo)}: é preciso um Quartel aqui para reunir tropa.`,
      };
    }
    return {
      pode: true,
      provincia: { id: alvo, nome: atlas.nomeDe(alvo) },
      populacao: campanha.populacaoDe(alvo),
      disponivel: campanha.disponivelParaLevaEm(alvo),
      maximo: campanha.maximoParaLevaEm(alvo),
      emFormacao: campanha.formacaoEm(alvo)?.homens ?? 0,
      custoPorHomem: ajustes.jogo.combate.custoPorHomem,
      manutencaoPorHomem: ajustes.jogo.combate.manutencaoPorHomem,
      avaliar: (homens) => campanha.podeRecrutar(alvo, homens),
    };
  }

  /**
   * Onde desenhar cada hoste, e de que cor. **Uma peça por HOSTE, não por província.**
   *
   * ⚠️ Era uma por província, e por isso o segundo exército sumia do mapa: numa cidade
   * sitiada existem duas hostes, e a peça que aparecia era a de menor id — a guarnição do
   * defensor. Era daí que vinham as três coisas erradas de uma vez: o marcador do sitiante
   * não existia, a marcha dele terminava no centro da cidade e a cor era a do inimigo.
   */
  function marcadoresDasHostes(): MarcadorDeHoste[] {
    const meu = campanha.jogador?.id ?? null;
    // `campanha.hostes()` já vem ordenado por id: a ordem no DOM não pode depender de
    // quem foi recrutado primeiro.
    const emArmas = campanha.hostes().map((exercito) => {
      const poder = campanha.poder(exercito.poder);
      const onde = pontoDaHoste(exercito);
      const cerco = campanha.cercoEm(exercito.posicao);
      const formacao = campanha.formacaoEm(exercito.posicao);
      // A leva engrossa o marcador da hoste do MESMO poder. Numa cidade sitiada a leva é
      // do defensor, e somá-la ao acampamento do sitiante contaria recrutas do inimigo.
      const leva = formacao?.poder === exercito.poder ? formacao.homens : 0;
      return {
        id: exercito.id,
        provincia: exercito.posicao,
        x: onde.x,
        y: onde.y,
        forca: forcaDe(exercito),
        emFormacao: leva,
        // A cor é a do DONO DA HOSTE, não a do chão: assim que a tropa pisar em terra
        // alheia as duas deixam de coincidir, e é aí que a cor passa a informar.
        cor: poder.cor,
        nomeDoPoder: poder.nome,
        minha: exercito.poder === meu,
        escolhendoDestino: marchando === exercito.id,
        temOrdem: campanha.ordemDaHoste(exercito.id) !== undefined,
        chegadaRecente: chegadasRecentes.has(exercito.id),
        sitiando: cerco?.sitiante === exercito.poder,
      };
    });

    // Leva sem hoste do mesmo poder no lugar: peça própria, com chave sintética. A
    // formação vive por província no estado e só ganha id de hoste ao ficar pronta.
    const levas = campanha.formacoes().flatMap(({ provincia, formacao }) => {
      // Comparado por ID de poder, não por nome: dois poderes podem chamar-se parecido, e
      // o nome é texto de interface.
      const jaTemPeca = campanha.hostesEm(provincia).some((h) => h.poder === formacao.poder);
      if (jaTemPeca) return [];
      const poder = campanha.poder(formacao.poder);
      const centro = atlas.provincia(provincia).centro;
      return [
        {
          id: `formacao:${provincia}`,
          provincia,
          x: centro.x,
          y: centro.y,
          forca: 0,
          emFormacao: formacao.homens,
          cor: poder.cor,
          nomeDoPoder: poder.nome,
          minha: formacao.poder === meu,
          escolhendoDestino: false,
          temOrdem: false,
          chegadaRecente: false,
          sitiando: false,
        },
      ];
    });

    return [...emArmas, ...levas];
  }

  /** As cidades sob cerco, para a bandeira de fogo. */
  function marcasDeCerco(): MarcaDeCerco[] {
    return campanha.cercos().map(({ provincia, cerco }) => {
      const centro = atlas.provincia(provincia).centro;
      return {
        provincia,
        x: centro.x,
        y: centro.y,
        postura: cerco.postura,
      };
    });
  }

  /**
   * As marchas que a rodada acabou de resolver, no formato que a animação anda.
   *
   * A chave é a província de CHEGADA porque é lá que o marcador existe agora — a peça que
   * anda é a que já chegou nas regras.
   */
  function trechosDaRodada(): TrechoDeMarcha[] {
    return campanha.rodada.marchas.flatMap((marcha) => {
      const destino = marcha.trilha.at(-1);
      if (destino === undefined) return [];
      const hoste = campanha.hoste(marcha.hoste);
      // A última parada é onde a PEÇA vai ficar, não o centro da província: quem chega
      // sitiando acampa na divisa, e a marcha tem que terminar exatamente ali — senão a
      // peça anda até o centro e salta pra divisa no quadro seguinte. Era isto que
      // parecia "o exército marcha pro meio da província": a peça ia ao centro porque
      // quem respondia pela chegada era a hoste do DEFENSOR.
      const pontos = marcha.trilha.map((id, i) =>
        i === marcha.trilha.length - 1 && hoste !== undefined ? pontoDaHoste(hoste) : pontoDe(id),
      );
      return [{ hoste: marcha.hoste, pontos }];
    });
  }

  /**
   * Onde a PEÇA de uma hoste fica desenhada.
   *
   * Normalmente o centro da província. Mas **quem sitia acampa na divisa**, não dentro da
   * cidade: o exército está do lado de fora dos muros, e desenhá-lo no centro diria que ele
   * já tomou o lugar — que é exatamente o que sitiar não faz.
   *
   * A divisa é aproximada pelo meio do caminho entre os dois centros, o da província
   * sitiada e o da província vizinha de onde ele veio. Não é a fronteira geométrica exata,
   * e não precisa ser: o que a peça tem que dizer é "estou na porta, vindo dali".
   */
  function pontoDaHoste(hoste: Exercito): PontoDeMarcha {
    const centro = atlas.provincia(hoste.posicao).centro;
    const cerco = campanha.cercoEm(hoste.posicao);
    if (!cerco || cerco.sitiante !== hoste.poder) return { x: centro.x, y: centro.y };

    // Ordenado por id: sem isso a peça pularia de uma divisa pra outra conforme a ordem
    // em que as vizinhas aparecem.
    const daBase = atlas
      .provincia(hoste.posicao)
      .vizinhas.filter((v) => campanha.donoDe(v) === hoste.poder)
      .sort()[0];
    if (daBase === undefined) return { x: centro.x, y: centro.y };

    const base = atlas.provincia(daBase).centro;
    // 0,55 e não 0,5: um fio para dentro do território sitiado, pra ler como "pressionando
    // esta província" em vez de "parado em cima da linha".
    return {
      x: base.x + (centro.x - base.x) * 0.55,
      y: base.y + (centro.y - base.y) * 0.55,
    };
  }

  function pontoDe(idProvincia: string): PontoDeMarcha {
    const centro = atlas.provincia(idProvincia).centro;
    return { x: centro.x, y: centro.y };
  }

  /** Rotas ainda possíveis enquanto o jogador aponta um destino. */
  function previsaoDaMarcha(): {
    origem: PontoDeMarcha | null;
    rotas: PrevisaoDeMarcha[];
  } {
    if (fase !== 'campanha' || marchando === null) return { origem: null, rotas: [] };
    const hoste = campanha.hoste(marchando);
    if (!hoste) return { origem: null, rotas: [] };
    const origem = pontoDe(hoste.posicao);
    const poder = hoste.poder;
    const rotas = [...campanha.rotasDaHoste(marchando)].map(([destino, rota]) => ({
      destino,
      pontos: [origem, ...rota.map(pontoDe)],
      hostil: poder !== undefined && campanha.donoDe(destino) !== poder,
    }));
    return { origem, rotas };
  }

  /** Ordens comprometidas continuam desenhadas até a resolução da rodada. */
  function ordensNoMapa(): OrdemNoMapa[] {
    if (fase !== 'campanha') return [];
    return campanha.ordens().flatMap(({ idHoste, ordem }) => {
      const destino = ordem.rota.at(-1);
      const hoste = campanha.hoste(idHoste);
      if (!destino || !hoste) return [];
      const poder = campanha.poder(hoste.poder);
      return [
        {
          origem: ordem.origem,
          destino,
          pontos: [pontoDe(ordem.origem), ...ordem.rota.map(pontoDe)],
          homens: ordem.homens,
          cor: poder.cor,
          minha: hoste.poder === campanha.jogador?.id,
          hostil: campanha.donoDe(destino) !== hoste.poder,
        },
      ];
    });
  }

  /** Para onde a marcha em composição pode ir. Vazio fora do modo de marcha. */
  function destinosDaMarcha(): Destino[] {
    if (marchando === null) return [];
    const poder = campanha.hoste(marchando)?.poder;
    return campanha.alcanceDaHoste(marchando).map((id) => {
      const p = atlas.provincia(id);
      return {
        provincia: id,
        nome: p.nome,
        x: p.centro.x,
        y: p.centro.y,
        hostil: poder !== undefined && campanha.donoDe(id) !== poder,
      };
    });
  }

  /** A hoste escolhida, como a ficha dela precisa vê-la. */
  function vistaDoExercito(): VistaDoExercito | null {
    if (fase !== 'campanha' || hosteSelecionada === null) return null;
    const exercito = campanha.hoste(hosteSelecionada);
    if (!exercito) return null;
    const onde = exercito.posicao;
    const poder = campanha.poder(exercito.poder);
    const forca = forcaDe(exercito);
    return {
      hoste: { id: exercito.id },
      provincia: { id: onde, nome: atlas.nomeDe(onde) },
      poder: { nome: poder.nome, cor: poder.cor },
      forca,
      manutencao: Math.round(forca * ajustes.jogo.combate.manutencaoPorHomem),
      emTerraAlheia: campanha.donoDe(onde) !== exercito.poder,
      minha: campanha.jogador?.id === exercito.poder,
      destinos: campanha.alcanceDaHoste(exercito.id).length,
      marchando: marchando === exercito.id,
      alvo:
        alvoHostil === null
          ? null
          : {
              nome: atlas.nomeDe(alvoHostil),
              // Zero na cidade aberta. É a mesma conta do botão do cerco em pé — a
              // campanha responde as duas, para a tela nunca prometer um assalto que a
              // resolução vai converter em cerco.
              rodadasDeCercoExigidas: campanha.assaltoEm(alvoHostil).faltam,
            },
      // A decisão de quem está DENTRO. Só existe onde há cerco inimigo, e a campanha é
      // quem sabe: `sitianteDaHosteDe` já devolve `undefined` quando o cerco é da própria
      // hoste — um sitiante não surte contra si mesmo.
      surtida: (() => {
        const sitiante = campanha.sitianteDaHosteDe(exercito.id);
        if (sitiante === undefined) return null;
        return {
          contra: campanha.poder(sitiante).nome,
          declarada: campanha.surtidaDe(exercito.id),
        };
      })(),
      cerco: (() => {
        const cerco = campanha.cercoEm(onde);
        // Só é O cerco desta hoste se for ela quem está sentada: uma tropa de passagem por
        // uma cidade que outro poder sitia não comanda coisa nenhuma.
        return cerco && cerco.sitiante === exercito.poder
          ? { postura: cerco.postura, faltamParaAssaltar: campanha.assaltoEm(onde).faltam }
          : null;
      })(),
      ordem: (() => {
        const ordem = campanha.ordemDaHoste(exercito.id);
        if (!ordem) return null;
        const destino = ordem.rota[ordem.rota.length - 1];
        return destino === undefined
          ? null
          : { destino: atlas.nomeDe(destino), homens: ordem.homens };
      })(),
      origens: Object.entries(exercito.origem)
        .map(([id, homens]) => {
          const donoAgora = campanha.donoDe(id);
          return {
            provincia: id,
            nome: atlas.nomeDe(id),
            homens,
            perdida: donoAgora !== exercito.poder,
            donoAtual: campanha.poder(donoAgora).nome,
          };
        })
        .sort((a, b) => b.homens - a.homens),
    };
  }

  /** A tabela do balanço, montada do estado — a mesma verdade que a barra e a ficha. */
  function vistaDoBalanco(): null | Parameters<typeof balanco.desenhar>[0] {
    const jogador = campanha.jogador;
    if (!jogador) return null;
    return {
      poder: jogador,
      ano: campanha.ano,
      turno: campanha.turno,
      tesouro: campanha.tesouro,
      linhas: campanha.provinciasDe(jogador.id).map((id) => {
        const e = campanha.economiaDe(id);
        const obra = campanha.obraEm(id);
        return {
          nome: campanha.nomeDe(id),
          economia: e
            ? {
                produto: e.produto.nome,
                nivel: e.nivel,
                impostos: e.impostos,
                producao: e.producao,
                comercio: e.comercio,
                total: e.total,
                bonus: e.bonus,
              }
            : null,
          construcoes: campanha
            .construcoesEm(id)
            .map((c) => campanha.construcoesDisponiveis[c]?.nome ?? c),
          obra: obra
            ? {
                nome: campanha.construcoesDisponiveis[obra.construcao]?.nome ?? obra.construcao,
                turnosRestantes: obra.turnosRestantes,
              }
            : null,
        };
      }),
    };
  }

  barraTurno.aoAbrirGoverno = () => {
    const vista = vistaDoBalanco();
    if (!vista) return;
    balanco.desenhar(vista);
    governo.alternar();
  };

  // O mapa se repinta junto com a interface: mudou o dono nas regras, mudou a cor na
  // tela, no mesmo instante e pela mesma verdade.
  campanha.aoMudar = () => {
    cena.pintarDonos((id) => campanha.donoDe(id));
    repintar();
  };
  barraTurno.aoPassarTurno = () => virarTurno();

  /**
   * O relatório da rodada em frases. **É o único lugar que escreve a notícia.**
   *
   * Fica aqui e não na crônica porque montar a frase exige o que só a campanha e o atlas
   * sabem: o nome da província, o nome do poder e quem é o jogador. A crônica recebe
   * texto pronto e desenha — ela não conhece regra nenhuma.
   *
   * ⚠️ **O tom é do ponto de vista do JOGADOR.** A mesma batalha é ganho para um lado e
   * perda para o outro; uma crônica que pintasse tudo de neutro obrigaria a ler o nome do
   * vencedor para saber se a notícia é boa. Hoje toda batalha é dele — quando a IA
   * existir, é aqui que se decide o que ainda vale ser contado.
   */
  function noticiasDaRodada(): LinhaDaCronica[] {
    const eu = campanha.jogador?.id ?? null;
    const nomeDoPoder = (id: string): string => campanha.poder(id).nome;
    const linhas: LinhaDaCronica[] = [];
    const relatorio = campanha.rodada;

    for (const batalha of relatorio.batalhas) {
      // ⚠️ Um assalto produz DUAS batalhas na mesma província: o exército de fora contra o
      // de dentro, e depois o vencedor contra a muralha. Se as duas linhas dissessem
      // "Batalha em Elêusis", o jogador leria repetição em vez de sequência.
      const onde =
        batalha.provincia === null
          ? 'Encontro na estrada'
          : batalha.tipo === 'assalto'
            ? `Assalto a ${atlas.nomeDe(batalha.provincia)}`
            : `Batalha em ${atlas.nomeDe(batalha.provincia)}`;
      if (batalha.vencedor === null) {
        linhas.push({
          tom: 'perda',
          icone: 'lanca',
          // Forças iguais não deixam ninguém em pé: é o único resultado sem vencedor, e
          // sem esta linha o jogador veria as duas peças sumirem sem explicação.
          texto: `${onde} — aniquilação mútua: ninguém ficou de pé.`,
        });
        continue;
      }
      const perdedores = batalha.perdedores.map(nomeDoPoder).join(', ');
      linhas.push({
        tom: batalha.vencedor === eu ? 'ganho' : 'perda',
        icone: 'lanca',
        texto: `${onde} — ${nomeDoPoder(batalha.vencedor)} venceu ${perdedores}; ${batalha.sobreviventes.toLocaleString('pt-BR')} continuam de pé.`,
      });
    }

    for (const morte of relatorio.milicianosMortos) {
      // ⚠️ **De quem era essa milícia?** Do dono de ANTES da rodada. Perguntar ao estado
      // atual erra justamente no caso mais comum — a cidade que acabou de ser tomada, cuja
      // milícia morreu defendendo o dono anterior. Sem isto, conquistar Elêusis pintava a
      // morte da milícia dela como perda do jogador.
      const tomada = relatorio.conquistas.find((c) => c.provincia === morte.provincia);
      const deQuemEra = tomada ? tomada.de : campanha.donoDe(morte.provincia);
      linhas.push({
        tom: deQuemEra === eu ? 'perda' : 'neutro',
        icone: 'capacete',
        texto: `A milícia de ${atlas.nomeDe(morte.provincia)} perdeu ${morte.mortos.toLocaleString('pt-BR')} defensores.`,
      });
    }

    for (const conquista of relatorio.conquistas) {
      linhas.push({
        tom: conquista.para === eu ? 'ganho' : 'perda',
        icone: 'territorio',
        texto: `${atlas.nomeDe(conquista.provincia)} passou de ${nomeDoPoder(conquista.de)} para ${nomeDoPoder(conquista.para)}.`,
      });
    }

    // Só os cercos NOVOS: um cerco que dura oito rodadas não é oito notícias. Quem quer
    // saber que ele continua olha a bandeira no mapa ou a ficha da província.
    for (const cerco of relatorio.cercos.filter((c) => c.novo)) {
      linhas.push({
        tom: cerco.sitiante === eu ? 'ganho' : 'perda',
        icone: 'fogo',
        texto: `${nomeDoPoder(cerco.sitiante)} sitia ${atlas.nomeDe(cerco.provincia)} — sem produção nem comércio lá dentro.`,
      });
    }

    for (const cerco of relatorio.cercosLevantados) {
      linhas.push({
        tom: cerco.sitiante === eu ? 'perda' : 'ganho',
        icone: 'escudo',
        texto: `O cerco de ${atlas.nomeDe(cerco.provincia)} acabou: ${nomeDoPoder(cerco.sitiante)} não está mais na frente dela.`,
      });
    }

    return linhas;
  }

  /**
   * Vira o turno e põe as marchas em movimento.
   *
   * ⚠️ **O gancho de inspeção passa por aqui também.** Se ele chamasse `campanha.passarTurno`
   * direto, captura e teste de tela exercitariam um jogo sem marcha — justamente o caminho
   * que não existe pra quem joga.
   */
  function virarTurno(): void {
    campanha.passarTurno();
    cronica.mostrar(campanha.turno, noticiasDaRodada());
    // ⚠️ A animação começa DEPOIS de resolver e ANTES de repintar, e a ordem importa:
    // só depois de resolver se sabe quem de fato andou (quem foi barrado na estrada parou
    // no meio), e é o `repintar` seguinte que põe cada peça no começo da própria trilha.
    // Nenhum quadro é pintado entre as duas coisas, porque isto tudo é uma tarefa só.
    animacaoDeMarcha.comecar(trechosDaRodada(), ajustes.animacao.segundosPorSaltoDeMarcha);
    repintar();
  }
  acoes.aoInvestir = (idProvincia, valor) => campanha.investir(idProvincia, valor);
  acoes.aoConstruir = (idProvincia, idConstrucao) => campanha.construir(idProvincia, idConstrucao);
  recrutamento.aoRecrutar = (idProvincia, homens) => campanha.recrutar(idProvincia, homens);
  exercitoFicha.aoDispensar = (idHoste, homens) => campanha.dispensarHoste(idHoste, homens);
  exercitoFicha.aoAlternarMarcha = (idHoste) => {
    marchando = marchando === idHoste ? null : idHoste;
    repintar();
  };
  exercitoFicha.aoMudarQuantidade = (homens) => {
    homensParaMarchar = homens;
  };
  exercitoFicha.aoCancelarOrdem = (idHoste) => campanha.cancelarOrdem(idHoste);
  exercitoFicha.aoSurtir = (idHoste) => campanha.surtir(idHoste);
  // Confirma a ordem contra o alvo já apontado. É aqui que assaltar e sitiar deixam de
  // ser um ajuste e viram a decisão que fecha a ordem.
  exercitoFicha.aoEscolherPostura = (postura) => {
    if (marchando === null || alvoHostil === null) return;
    campanha.ordenarMarcha(marchando, alvoHostil, homensParaMarchar, undefined, postura);
    marchando = null;
    alvoHostil = null;
    repintar();
  };
  exercitoFicha.aoTrocarPosturaDoCerco = (idProvincia, postura) => {
    campanha.mudarPostura(idProvincia, postura);
  };
  destinosMapa.aoEscolher = (destino) => {
    if (marchando === null) return;
    // Terra alheia não vira ordem no clique: primeiro o jogador diz o que fazer ao
    // chegar. Apontar de novo troca o alvo, e clicar fora cancela tudo.
    const poder = campanha.hoste(marchando)?.poder;
    if (poder !== undefined && campanha.donoDe(destino) !== poder) {
      alvoHostil = destino;
      repintar();
      return;
    }
    // Destino amigo: registra a ORDEM. Nada se move agora — a marcha acontece na virada
    // do turno, junto com as de todo mundo.
    campanha.ordenarMarcha(marchando, destino, homensParaMarchar);
    marchando = null;
    repintar();
  };
  // Enquanto marcha, a peça está entre duas províncias; quem responde onde ela está é a
  // animação, e a camada só desenha.
  hostesMapa.ondeEstaMarchando = (idHoste) => animacaoDeMarcha.posicaoDe(idHoste);
  // O pulso de chegada dispara quando a peça ASSENTA, não quando o turno vira: antes ele
  // acontecia enquanto a hoste ainda estaria a caminho, e confirmava uma chegada que o
  // jogador ainda não tinha visto.
  animacaoDeMarcha.aoChegar = (hostes) => {
    for (const id of hostes) chegadasRecentes.add(id);
    repintar();
    if (temporizadorDaChegada !== undefined) window.clearTimeout(temporizadorDaChegada);
    temporizadorDaChegada = window.setTimeout(() => {
      chegadasRecentes.clear();
      repintar();
    }, ajustes.animacao.segundosDoPulsoDeChegada * 1000);
  };
  destinosMapa.aoDestacar = (destino) => marchasMapa.destacar(destino);
  hostesMapa.aoSelecionar = (idHoste) => {
    // Clicar na hoste escolhe as DUAS coisas: a tropa e o chão sob ela. Os dois painéis
    // ficam verdadeiros ao mesmo tempo, e o jogador não precisa clicar duas vezes.
    //
    // A peça de uma leva em formação não é hoste ainda: ela não aceita comando, então só
    // o chão é escolhido. Clicar nela não pode acender uma ficha de exército vazia.
    const hoste = campanha.hoste(idHoste);
    hosteSelecionada = hoste ? idHoste : null;
    selecionada = hoste?.posicao ?? idHoste.replace('formacao:', '');
    repintar();
  };

  inicio.aoPedirEscolha = () => {
    fase = 'escolha';
    selecionada = null;
    ficha.mostrar(null);
    const atenas = provincias.provincias.find((p) => p.id === 'atenas');
    if (!atenas) throw new Error('província de Atenas ausente dos dados');
    cena.posicionar(atenas.centro.x, atenas.centro.y, ajustes.camera.zoomMaximo);
  };
  inicio.aoComecarCampanha = (idPoder) => {
    if (idPoder !== 'atenas') return;
    // Partida nova não herda marcha nenhuma: o que estivesse andando descreve um mundo
    // que deixou de existir.
    animacaoDeMarcha.parar();
    // Nem notícia: a crônica da partida anterior fala de um mundo que deixou de existir.
    cronica.esconder();
    fase = 'campanha';
    inicio.encerrar();
    campanha.comecar(idPoder);
  };
  cena.aoSelecionar = (indice) => {
    const provincia = indice === null ? null : (atlas.porIndice(indice) ?? null);
    if (fase === 'escolha') {
      if (!provincia) {
        inicio.selecionar(null);
        return;
      }
      const dono = campanha.poder(campanha.donoDe(provincia.id));
      inicio.selecionar({ poder: dono, provincias: campanha.provinciasDe(dono.id).length });
      return;
    }
    if (fase !== 'campanha') return;
    // Clicar fora dos destinos cancela a marcha em vez de recusar com mensagem: os alvos
    // legais estão desenhados, e reclamar de cada clique errado seria ruído.
    marchando = null;
    alvoHostil = null;
    selecionada = provincia?.id ?? null;
    // Clicar no mapa é escolher CHÃO: solta a hoste. Sem isto, a ficha do exército
    // ficaria em pé descrevendo uma tropa que o jogador não está mais olhando.
    hosteSelecionada = null;
    repintar();
  };

  iniciarLaco((relogio) => {
    if (entrada.apertou('F3')) painel.alternar();
    cena.atualizar(relogio, entrada);
    // Os marcadores seguem o mundo: reprojetados a cada quadro, arrastar e dar zoom
    // levam a peça junto.
    // A marcha corre no relógio do quadro, antes de projetar: assim a peça já sai deste
    // quadro no ponto certo, em vez de ficar um quadro atrás.
    animacaoDeMarcha.avancar(relogio.delta);
    cercosMapa.posicionar(cena.camera);
    hostesMapa.posicionar(cena.camera);
    marchasMapa.posicionar(cena.camera);
    destinosMapa.posicionar(cena.camera);
    painel.atualizar(relogio, cena.camera);
    entrada.novoQuadro();
  });

  // gancho de inspeção: só existe em desenvolvimento, é o que deixa a ferramenta de
  // captura apontar a câmera pra qualquer ponto do mundo
  if (import.meta.env.DEV) {
    (window as unknown as { inspecao?: unknown }).inspecao = {
      posicionar: (x: number, y: number, zoom: number) => cena.posicionar(x, y, zoom),
      calibrarFronteira: (largura?: number, forca?: number, cor?: string) =>
        cena.calibrarFronteira(largura, forca, cor),
      // deixa o teste de tela afirmar sobre a VERDADE da campanha, e não sobre o texto
      // que por acaso está desenhado nela
      campanha: () => ({
        jogador: campanha.jogador?.id ?? null,
        ano: campanha.ano,
        turno: campanha.turno,
        tesouro: campanha.tesouro,
        renda: campanha.renda,
        provincias: campanha.jogador ? campanha.provinciasDe(campanha.jogador.id).length : 0,
        poderesVivos: campanha.poderesVivos().length,
      }),
      donoDe: (idProvincia: string) => campanha.donoDe(idProvincia),
      darOuro: (valor: number) => campanha.darOuro(valor),
      passarTurno: () => virarTurno(),
      comecar: (idPoder: string) => {
        animacaoDeMarcha.parar();
        fase = 'campanha';
        inicio.encerrar();
        campanha.comecar(idPoder);
      },
      construir: (idProvincia: string, idConstrucao: string) =>
        campanha.construir(idProvincia, idConstrucao),
      recrutar: (idProvincia: string, homens: number) => campanha.recrutar(idProvincia, homens),
      forcaEm: (idProvincia: string, idPoder?: string) =>
        campanha.forcaEm(idProvincia, idPoder ?? campanha.donoDe(idProvincia)),
      formacaoEm: (idProvincia: string) => campanha.formacaoEm(idProvincia),
      dispensar: (idProvincia: string, homens: number) => campanha.dispensar(idProvincia, homens),
      hostesEm: (idProvincia: string) =>
        campanha.hostesEm(idProvincia).map((h) => ({
          id: h.id,
          poder: h.poder,
          forca: forcaDe(h),
        })),
      noExilio: (idPoder: string) => campanha.noExilio(idPoder),
      // `porPoder` opcional: a ordem pertence ao dono da HOSTE, e é assim que se monta
      // um inimigo no tabuleiro enquanto a IA não existe.
      ordenarMarcha: (
        idHoste: string,
        destino: string,
        homens: number,
        porPoder?: string,
        postura?: 'assaltar' | 'sitiar',
      ) =>
        campanha.ordenarMarcha(
          idHoste,
          destino,
          homens,
          porPoder ?? campanha.jogador?.id ?? null,
          postura ?? 'sitiar',
        ),
      cancelarOrdem: (idHoste: string) => campanha.cancelarOrdem(idHoste),
      surtir: (idHoste: string, porPoder?: string) =>
        campanha.surtir(idHoste, porPoder ?? campanha.jogador?.id ?? null),
      // Põe uma hoste de qualquer poder no mapa, do nada. Só desenvolvimento: enquanto
      // não há IA, é assim que se monta um inimigo no tabuleiro pra ver a guerra rodar.
      plantarHoste: (idProvincia: string, idPoder: string, homens: number) =>
        campanha.plantarHoste(idProvincia, idPoder, homens),
      rodada: () => campanha.rodada,
      miliciaEm: (idProvincia: string) => campanha.miliciaEm(idProvincia),
      ordens: () => campanha.ordens(),
      alcanceDaHoste: (idHoste: string) => [...campanha.alcanceDaHoste(idHoste)],
      populacaoDe: (idProvincia: string) => campanha.populacaoDe(idProvincia),
      // Estes três existem para o teste de tela conferir se o que está DESENHADO bate com
      // o que as regras dizem, em vez de cravar o número. Balanço muda; a ligação, não.
      crescimentoDe: (idProvincia: string) => campanha.crescimentoDe(idProvincia)?.crescimento ?? 0,
      disponivelParaLevaEm: (idProvincia: string) => campanha.disponivelParaLevaEm(idProvincia),
      economiaDe: (idProvincia: string) => campanha.economiaDe(idProvincia),
      // Conquista crua, sem regra de guerra nenhuma: é o que deixa a fatia de propriedade
      // ser vista e testada antes de existir exército.
      conquistar: (idProvincia: string, idPoder: string) =>
        campanha.trocarDono(idProvincia, idPoder),
    };
  }

  // sinal pro Playwright saber que a cena já desenhou o primeiro quadro
  document.body.dataset['pronto'] = 'sim';
}

iniciar().catch((erro: unknown) => {
  console.error(erro);
  document.body.dataset['erro'] = String(erro);
});
