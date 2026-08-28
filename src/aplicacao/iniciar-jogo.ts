/**
 * O boot: carrega os dados, monta o mundo e a tela, liga os dois e sobe o laço.
 *
 * É a única função que sabe a ORDEM de tudo — e por isso é curta de propósito. Cada etapa
 * chama um módulo que faz uma coisa só: `montar-tela.ts` põe a interface de pé,
 * `ligar-acoes.ts` conecta clique a regra, `salvamento-local.ts` pergunta pelo disco.
 */

import { iniciarEscala } from '@/estilo/escala';
import { Entrada } from '@/nucleo/entrada';
import { iniciarLaco } from '@/nucleo/tempo';
import {
  carregarAjustes,
  carregarConstrucoes,
  carregarEconomia,
  carregarExercitos,
  carregarIa,
  carregarMundo,
  carregarProvincias,
} from '@/dados/carregar';
import { CenaMapa } from '@/mapa/cena-mapa';
import { Tooltips } from '@/ui/tooltip';
import { Campanha } from '@/campanha/campanha';
import { formatarAno } from '@/campanha/estado-campanha';
import { Atlas } from '@/mundo/atlas';
import { iniciarAudio } from '@/audio/motor-de-audio';
import { EditorDeBalanceamento } from '@/editor';

import { SelecaoDaTela } from './contexto';
import type { Jogo } from './contexto';
import { instalarInspecao } from './inspecao-de-desenvolvimento';
import { ligarAcoes } from './ligar-acoes';
import { montarTela } from './montar-tela';
import { retomarCampanha } from './salvamento-local';
import { atualizarInterface } from './atualizar-interface';

function exigir<T extends Element>(seletor: string): T {
  const el = document.querySelector<T>(seletor);
  if (!el) throw new Error(`elemento ausente no index.html: ${seletor}`);
  return el;
}

export async function iniciarJogo(): Promise<void> {
  const palco = exigir<HTMLElement>('#palco');
  const canvas = exigir<HTMLCanvasElement>('#mundo');
  const ui = exigir<HTMLElement>('#ui');

  iniciarEscala(palco);
  // Uma camada única substitui os balões nativos do navegador. Todo componente apenas declara
  // o conteúdo; atraso, posição, moldura e fechamento pertencem a ela.
  new Tooltips(ui);
  const audio = iniciarAudio();

  const mundo = carregarMundo();
  const ajustes = carregarAjustes();
  const provincias = await carregarProvincias(
    new URL('mundo/provincias.json', document.baseURI).href,
  );
  const cena = await CenaMapa.criar(canvas, mundo, ajustes, provincias);
  // A entrada escuta o CANVAS, não o palco: assim clique em painel não vira clique no mapa. O
  // #ui é transparente a ponteiro por padrão e cada painel liga o seu.
  const entrada = new Entrada(canvas);

  const construcoes = carregarConstrucoes();
  const tela = montarTela(ui, cena.coresDosPoderes, audio);
  // Ferramenta isolada em `src/editor/`: fora dali o jogo só sabe que F2 alterna a janela.
  // O perfil salvo entra sobre os dados validados antes de a campanha começar a consultá-los.
  const editor = new EditorDeBalanceamento(ui, ajustes.jogo);

  // O atlas é a geografia assada, indexada e imutável; a campanha é só as regras. Combate e
  // diplomacia vão ler o MESMO atlas, em vez de cada um montar o próprio índice.
  const atlas = new Atlas(provincias);
  const campanha = new Campanha(
    atlas,
    carregarEconomia(),
    construcoes,
    ajustes.jogo,
    carregarExercitos(),
  );

  const jogo: Jogo = {
    atlas,
    campanha,
    ajustes,
    ia: carregarIa(),
    cena,
    tela,
    selecao: new SelecaoDaTela(),
  };
  ligarAcoes(jogo);
  editor.aoAplicar = () => atualizarInterface(jogo);

  // O boot pergunta pelo salvamento UMA vez, depois de a interface estar ligada: retomar já
  // dispara um redesenho, e ele precisa encontrar a tela de pé.
  if (retomarCampanha(campanha)) {
    tela.inicio.oferecerContinuacao(
      `${campanha.jogador?.nome ?? ''} · turno ${campanha.turno} · ${formatarAno(campanha.ano)}`,
    );
  }

  iniciarLaco((relogio) => {
    if (entrada.apertou('F2')) editor.alternar();
    if (entrada.apertou('F3')) tela.painelFps.alternar();
    if (!editor.visivel) cena.atualizar(relogio, entrada);
    // Os marcadores seguem o mundo: reprojetados a cada quadro, arrastar e dar zoom levam a
    // peça junto. A marcha corre no relógio do quadro, ANTES de projetar: assim a peça já sai
    // deste quadro no ponto certo, em vez de ficar um quadro atrás.
    tela.animacaoDeMarcha.avancar(relogio.delta);
    tela.cercosMapa.posicionar(cena.camera);
    tela.hostesMapa.posicionar(cena.camera);
    tela.marchasMapa.posicionar(cena.camera);
    tela.destinosMapa.posicionar(cena.camera);
    tela.painelFps.atualizar(relogio, cena.camera);
    entrada.novoQuadro();
  });

  if (import.meta.env.DEV) instalarInspecao(jogo);

  // sinal pro Playwright saber que a cena já desenhou o primeiro quadro
  document.body.dataset['pronto'] = 'sim';
}
