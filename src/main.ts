import '@/estilo/base.css';
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

import { iniciarEscala } from '@/estilo/escala';
import { Entrada } from '@/nucleo/entrada';
import { iniciarLaco } from '@/nucleo/tempo';
import {
  carregarAjustes,
  carregarConstrucoes,
  carregarEconomia,
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
import { MarchasMapa } from '@/ui/marchas-mapa';
import type { OrdemNoMapa, PontoDeMarcha, PrevisaoDeMarcha } from '@/ui/marchas-mapa';
import { HostesMapa } from '@/ui/hostes-mapa';
import type { MarcadorDeHoste } from '@/ui/hostes-mapa';
import { DestinosMapa } from '@/ui/destinos-mapa';
import type { Destino } from '@/ui/destinos-mapa';
import { InicioJogo } from '@/ui/inicio-jogo';
import { BarraTurno } from '@/ui/barra-turno';
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

  // Ação e informação sobre a MESMA província no mesmo canto: as ações empilhadas em
  // cima da ficha. A coluna é quem ancora as duas, porque empilhar por posição absoluta
  // obrigaria a saber a altura da ficha, que muda com o conteúdo.
  const colunaProvincia = document.createElement('div');
  colunaProvincia.className = 'coluna-provincia';
  ui.appendChild(colunaProvincia);
  const acoes = new AcoesProvincia(colunaProvincia);
  // Recrutar é outra mecânica de investir e construir: mexe em gente, não em dinheiro.
  // Bloco próprio, entre o que se PAGA e o que a província É.
  const recrutamento = new Recrutamento(colunaProvincia);
  const ficha = new FichaProvincia(colunaProvincia);
  ficha.usarCatalogo(
    Object.fromEntries(
      Object.entries(carregarConstrucoes().construcoes).map(([id, c]) => [id, c.nome]),
    ),
  );
  // As rotas ficam atrás das peças: possibilidade tracejada, ordem registrada cheia.
  const marchasMapa = new MarchasMapa(ui);
  // Os marcadores ficam numa camada própria sobre o mapa, e não dentro de painel nenhum:
  // eles pertencem ao mundo, e é a câmera que decide onde cada um aparece.
  const hostesMapa = new HostesMapa(ui);
  // Os destinos ficam por cima das hostes: o alvo de uma ordem em curso tem que estar
  // clicável mesmo quando cai sobre uma província que já tem tropa.
  const destinosMapa = new DestinosMapa(ui);
  // A hoste escolhida ganha região própria, em baixo-centro: ela não é a província, e
  // assim que marchar as duas deixam de coincidir.
  const exercitoFicha = new ExercitoFicha(ui);
  const inicio = new InicioJogo(ui);
  const barraTurno = new BarraTurno(ui);
  // A casca de governo já nasce com abas: a segunda (poderes, diplomacia, modos de mapa)
  // vai custar uma linha aqui em vez de uma remodelação de layout.
  const balanco = new Balanco();
  const governo = new Governo(ui, [balanco]);
  // O atlas é a geografia assada, indexada e imutável; a campanha é só as regras. Combate
  // e diplomacia vão ler o MESMO atlas, em vez de cada um montar o próprio índice.
  const atlas = new Atlas(provincias);
  const campanha = new Campanha(atlas, carregarEconomia(), carregarConstrucoes(), ajustes.jogo);
  let fase: 'menu' | 'escolha' | 'campanha' = 'menu';
  /** O ID da província escolhida — não uma ficha montada, que envelheceria. */
  let selecionada: string | null = null;
  /**
   * A província onde está a HOSTE escolhida, ou `null`.
   *
   * Seleção separada da província de propósito: clicar no marcador escolhe a tropa,
   * clicar no mapa escolhe o chão. São duas coisas diferentes no mesmo lugar, e é por
   * isso que dispensar saiu do painel de recrutamento.
   */
  let hosteSelecionada: string | null = null;
  /**
   * A província de onde parte a marcha que o jogador está compondo, ou `null`.
   *
   * Modo, e não intenção guardada: enquanto ele existe, o mapa mostra destinos e um
   * clique fora deles cancela. Nada é reservado, nada é gasto — a ordem só acontece no
   * clique no destino.
   */
  let marchando: string | null = null;
  /** Quantos homens o jogador quer mandar na próxima ordem. O painel é quem escreve. */
  let homensParaMarchar = 0;
  /** Destinos que acabaram de receber tropa; existem só durante o pulso de chegada. */
  let chegadasRecentes = new Set<string>();
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
    );

    acoes.mostrar(vistaDeAcoes());
    recrutamento.mostrar(vistaDeRecrutamento());

    // A hoste selecionada pode ter deixado de existir (dispensada, desertada). Limpar
    // ANTES de montar a vista é o que impede a ficha de descrever um exército que já não
    // está no mapa.
    if (hosteSelecionada !== null && !campanha.exercitoEm(hosteSelecionada)) {
      hosteSelecionada = null;
    }
    // O modo de marcha só vale pela hoste selecionada e enquanto ela existir: dispensar
    // ou trocar de seleção derruba a ordem em composição, em vez de deixá-la apontando
    // pra uma tropa que não está mais ali.
    if (marchando !== null && (marchando !== hosteSelecionada || !campanha.exercitoEm(marchando))) {
      marchando = null;
    }

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
   * Só devolve `null` fora da campanha. Dentro dela o bloco fica sempre na tela, mesmo
   * quando não dá pra agir — dizendo o motivo. Sumir esconderia a existência da mecânica,
   * e o jogador não teria como adivinhar que ela existe.
   */
  function vistaDeAcoes(): VistaDeAcoes | null {
    if (fase !== 'campanha') return null;
    const alvo = selecionada;
    if (!alvo) return { pode: false, motivo: 'Clique numa província sua para investir nela.' };
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
      avaliar: (valor) => campanha.podeInvestir(alvo, valor),
      duracao: ajustes.jogo.economia.investimento.arrecadacoes,
      retorno: (valor) => campanha.retornoDe(alvo, valor),
    };
  }

  /**
   * O que o bloco de recrutamento mostra agora.
   *
   * Mesma regra do bloco de ações: dentro da campanha ele fica sempre na tela, e quando
   * não dá pra recrutar diz o motivo — é assim que o jogador descobre que existe Quartel.
   */
  function vistaDeRecrutamento(): VistaDeRecrutamento | null {
    if (fase !== 'campanha') return null;
    const alvo = selecionada;
    if (!alvo) return { pode: false, motivo: 'Clique numa província sua para reunir tropa.' };
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
      custoPorHomem: ajustes.jogo.combate.custoPorHomem,
      manutencaoPorHomem: ajustes.jogo.combate.manutencaoPorHomem,
      avaliar: (homens) => campanha.podeRecrutar(alvo, homens),
    };
  }

  /** Onde desenhar cada hoste, e de que cor. O centro da província é a âncora. */
  function marcadoresDasHostes(): MarcadorDeHoste[] {
    const meu = campanha.jogador?.id ?? null;
    return campanha.hostes().map(({ provincia, exercito }) => {
      const p = atlas.provincia(provincia);
      const poder = campanha.poder(exercito.poder);
      return {
        provincia,
        x: p.centro.x,
        y: p.centro.y,
        forca: campanha.forcaEm(provincia),
        // A cor é a do DONO DA HOSTE, não a do chão: assim que a tropa pisar em terra
        // alheia as duas deixam de coincidir, e é aí que a cor passa a informar.
        cor: poder.cor,
        nomeDoPoder: poder.nome,
        minha: exercito.poder === meu,
        escolhendoDestino: marchando === provincia,
        temOrdem: campanha.ordemEm(provincia) !== undefined,
        chegadaRecente: chegadasRecentes.has(provincia),
      };
    });
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
    const origem = pontoDe(marchando);
    const poder = campanha.exercitoEm(marchando)?.poder;
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
    return campanha.ordens().flatMap((ordem) => {
      const destino = ordem.rota.at(-1);
      const hoste = campanha.exercitoEm(ordem.origem);
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
    const poder = campanha.exercitoEm(marchando)?.poder;
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
    const onde = hosteSelecionada;
    const exercito = campanha.exercitoEm(onde);
    if (!exercito) return null;
    const poder = campanha.poder(exercito.poder);
    const forca = campanha.forcaEm(onde);
    return {
      provincia: { id: onde, nome: atlas.nomeDe(onde) },
      poder: { nome: poder.nome, cor: poder.cor },
      forca,
      manutencao: Math.round(forca * ajustes.jogo.combate.manutencaoPorHomem),
      emTerraAlheia: campanha.donoDe(onde) !== exercito.poder,
      minha: campanha.jogador?.id === exercito.poder,
      destinos: campanha.alcanceDaHoste(onde).length,
      marchando: marchando === onde,
      ordem: (() => {
        const ordem = campanha.ordemEm(onde);
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
  barraTurno.aoPassarTurno = () => {
    // A ordem desaparece quando resolve; guardar os destinos por alguns quadros dá ao
    // marcador novo uma confirmação de chegada em vez de fazê-lo apenas "teleportar".
    chegadasRecentes = new Set(
      campanha
        .ordens()
        .map((ordem) => ordem.rota.at(-1))
        .filter((id): id is string => id !== undefined),
    );
    campanha.passarTurno();
    if (temporizadorDaChegada !== undefined) window.clearTimeout(temporizadorDaChegada);
    temporizadorDaChegada = window.setTimeout(() => {
      chegadasRecentes.clear();
      repintar();
    }, 900);
  };
  acoes.aoInvestir = (idProvincia, valor) => campanha.investir(idProvincia, valor);
  acoes.aoConstruir = (idProvincia, idConstrucao) => campanha.construir(idProvincia, idConstrucao);
  recrutamento.aoRecrutar = (idProvincia, homens) => campanha.recrutar(idProvincia, homens);
  exercitoFicha.aoDispensar = (idProvincia, homens) => campanha.dispensar(idProvincia, homens);
  exercitoFicha.aoAlternarMarcha = (idProvincia) => {
    marchando = marchando === idProvincia ? null : idProvincia;
    repintar();
  };
  exercitoFicha.aoMudarQuantidade = (homens) => {
    homensParaMarchar = homens;
  };
  exercitoFicha.aoCancelarOrdem = (idProvincia) => campanha.cancelarOrdem(idProvincia);
  destinosMapa.aoEscolher = (destino) => {
    if (marchando === null) return;
    // Registra a ORDEM. Nada se move agora: a marcha acontece na virada do turno, junto
    // com as de todo mundo. A seleção fica onde está, porque a tropa também fica.
    campanha.ordenarMarcha(marchando, destino, homensParaMarchar);
    marchando = null;
    repintar();
  };
  destinosMapa.aoDestacar = (destino) => marchasMapa.destacar(destino);
  hostesMapa.aoSelecionar = (idProvincia) => {
    // Clicar na hoste escolhe as DUAS coisas: a tropa e o chão sob ela. Os dois painéis
    // ficam verdadeiros ao mesmo tempo, e o jogador não precisa clicar duas vezes.
    hosteSelecionada = idProvincia;
    selecionada = idProvincia;
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
      passarTurno: () => campanha.passarTurno(),
      comecar: (idPoder: string) => {
        fase = 'campanha';
        inicio.encerrar();
        campanha.comecar(idPoder);
      },
      construir: (idProvincia: string, idConstrucao: string) =>
        campanha.construir(idProvincia, idConstrucao),
      recrutar: (idProvincia: string, homens: number) => campanha.recrutar(idProvincia, homens),
      forcaEm: (idProvincia: string) => campanha.forcaEm(idProvincia),
      dispensar: (idProvincia: string, homens: number) => campanha.dispensar(idProvincia, homens),
      noExilio: (idPoder: string) => campanha.noExilio(idPoder),
      ordenarMarcha: (origem: string, destino: string, homens: number) =>
        campanha.ordenarMarcha(origem, destino, homens),
      cancelarOrdem: (origem: string) => campanha.cancelarOrdem(origem),
      // Põe uma hoste de qualquer poder no mapa, do nada. Só desenvolvimento: enquanto
      // não há IA, é assim que se monta um inimigo no tabuleiro pra ver a guerra rodar.
      plantarHoste: (idProvincia: string, idPoder: string, homens: number) =>
        campanha.plantarHoste(idProvincia, idPoder, homens),
      rodada: () => campanha.rodada,
      ordens: () => campanha.ordens(),
      alcanceDaHoste: (idProvincia: string) => [...campanha.alcanceDaHoste(idProvincia)],
      populacaoDe: (idProvincia: string) => campanha.populacaoDe(idProvincia),
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
