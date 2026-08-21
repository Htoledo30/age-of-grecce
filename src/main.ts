import '@/estilo/base.css';
import '@/ui/painel-fps.css';
import '@/ui/painel-lateral.css';
import '@/ui/ficha-provincia.css';
import '@/ui/acoes-provincia.css';
import '@/ui/governo.css';
import '@/ui/inicio-jogo.css';
import '@/ui/controles.css';
import '@/ui/barra-turno.css';

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
import type { InfoProvincia } from '@/mapa/provincias-mapa';
import { PainelFps } from '@/ui/painel-fps';
import { PainelLateral } from '@/ui/painel-lateral';
import { AcoesProvincia } from '@/ui/acoes-provincia';
import { Governo } from '@/ui/governo';
import { Balanco } from '@/ui/balanco';
import type { VistaDeAcoes } from '@/ui/acoes-provincia';
import { FichaProvincia } from '@/ui/ficha-provincia';
import { InicioJogo } from '@/ui/inicio-jogo';
import { BarraTurno } from '@/ui/barra-turno';
import { Campanha } from '@/campanha/campanha';

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
  const provincias = await carregarProvincias(new URL('mundo/provincias.json', document.baseURI).href);
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
  const ficha = new FichaProvincia(colunaProvincia);
  ficha.usarCatalogo(
    Object.fromEntries(
      Object.entries(carregarConstrucoes().construcoes).map(([id, c]) => [id, c.nome]),
    ),
  );
  const inicio = new InicioJogo(ui, provincias);
  const barraTurno = new BarraTurno(ui);
  // A casca de governo já nasce com abas: a segunda (poderes, diplomacia, modos de mapa)
  // vai custar uma linha aqui em vez de uma remodelação de layout.
  const balanco = new Balanco();
  const governo = new Governo(ui, [balanco]);
  const campanha = new Campanha(
    provincias,
    carregarEconomia(),
    carregarConstrucoes(),
    ajustes.jogo,
  );
  let fase: 'menu' | 'escolha' | 'campanha' = 'menu';
  let selecionada: InfoProvincia | null = null;

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
            provincias: campanha.provinciasDe(jogador.id).length,
          },
    );

    // A ficha e o painel de investir são desenhados a partir da MESMA seleção, sempre
    // juntos: assim não existe estado em que um mostra uma província e o outro, outra.
    const obraNaFicha = selecionada ? campanha.obraEm(selecionada.id) : undefined;
    ficha.mostrar(
      selecionada,
      selecionada ? campanha.economiaDe(selecionada.id) : null,
      obraNaFicha
        ? {
            nome: campanha.construcoesDisponiveis[obraNaFicha.construcao]?.nome ?? '',
            turnosRestantes: obraNaFicha.turnosRestantes,
          }
        : null,
    );

    acoes.mostrar(vistaDeAcoes());

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
    // O portão é a PROVÍNCIA, não uma ação: estar sem dinheiro não pode esconder a lista
    // de construções, senão o jogador quebrado deixa de ver o que existe pra comprar.
    const r = campanha.podeAgirEm(alvo.id);
    if (!r.pode) return { pode: false, motivo: `${alvo.nome}: ${r.motivo}.` };
    const erguidas = campanha.construcoesEm(alvo.id);
    const obra = campanha.obraEm(alvo.id);
    return {
      pode: true,
      provincia: { id: alvo.id, nome: alvo.nome },
      construcoes: Object.entries(campanha.construcoesDisponiveis).map(([id, c]) => {
        const conta = campanha.retornoDaConstrucaoEm(alvo.id, id);
        const r = campanha.podeConstruir(alvo.id, id);
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
        };
      }),
      bonusAtual: campanha.investimentoEm(alvo.id)?.percentual ?? 0,
      arrecadacoesRestantes: campanha.investimentoEm(alvo.id)?.arrecadacoesRestantes ?? 0,
      avaliar: (valor) => campanha.podeInvestir(alvo.id, valor),
      duracao: ajustes.jogo.economia.investimento.arrecadacoes,
      retorno: (valor) => campanha.retornoDe(alvo.id, valor),
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

  campanha.aoMudar = repintar;
  barraTurno.aoPassarTurno = () => campanha.passarTurno();
  acoes.aoInvestir = (idProvincia, valor) => campanha.investir(idProvincia, valor);
  acoes.aoConstruir = (idProvincia, idConstrucao) => campanha.construir(idProvincia, idConstrucao);

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
  cena.aoSelecionar = (provincia) => {
    if (fase === 'escolha') {
      inicio.selecionar(provincia);
      return;
    }
    if (fase !== 'campanha') return;
    selecionada = provincia;
    repintar();
  };

  iniciarLaco((relogio) => {
    if (entrada.apertou('F3')) painel.alternar();
    cena.atualizar(relogio, entrada);
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
      }),
    };
  }

  // sinal pro Playwright saber que a cena já desenhou o primeiro quadro
  document.body.dataset['pronto'] = 'sim';
}

iniciar().catch((erro: unknown) => {
  console.error(erro);
  document.body.dataset['erro'] = String(erro);
});
