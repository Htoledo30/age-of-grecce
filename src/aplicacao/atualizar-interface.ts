/**
 * Redesenha a interface a partir do estado, **inteira, sempre.**
 *
 * Sem diferença incremental de propósito: refazer custa menos que comparar, e é isso que
 * garante que a tela nunca discorde da campanha. Toda vista é montada na hora; nada aqui
 * guarda resultado.
 */

import type { Jogo } from './contexto';
import { vistaDoAlimento, vistaDoBalanco, vistaDoMercado } from './vistas/governo';
import { vistaDaDiplomacia } from './vistas/mesa-diplomatica';
import {
  destinosDaMarcha,
  marcadoresDasHostes,
  marcasDeCerco,
  ordensNoMapa,
  previsaoDaMarcha,
  rotasEmFoco,
} from './vistas/mapa';
import {
  vistaDaProvincia,
  vistaDeAcoes,
  vistaDeConstrucoes,
  vistaDeRecrutamento,
} from './vistas/provincia';
import { vistaDoExercito } from './vistas/exercito';

export function atualizarInterface(jogo: Jogo): void {
  const { campanha, tela, selecao } = jogo;
  const jogador = campanha.jogador;

  tela.barraTurno.mostrar(
    jogador === null
      ? null
      : {
          poder: jogador,
          ano: campanha.ano,
          turno: campanha.turno,
          tesouro: campanha.tesouro,
          renda: campanha.renda,
          manutencao: campanha.manutencao,
          saldoDeComida: campanha.alimentacao.saldo,
          categoriaDeComida: campanha.alimentacao.categoria,
          provincias: campanha.provinciasDe(jogador.id).length,
          // Espelha a regra da virada: o exilado sem chão não tem o que assentar, e o botão
          // não pode travar o único caminho dele — jogar até reconquistar.
          pedidos: campanha.propostas().length,
          capitalPerdida:
            campanha.capitalPerdida(jogador.id) &&
            campanha.provinciasDe(jogador.id).length > 0,
        },
  );

  desenharProvincia(jogo);

  // A hoste selecionada pode ter deixado de existir (dispensada, desertada). Limpar ANTES de
  // montar a vista é o que impede a ficha de descrever um exército que já não está no mapa.
  if (selecao.hoste !== null && !campanha.hoste(selecao.hoste)) selecao.hoste = null;
  // O modo de marcha só vale pela hoste selecionada e enquanto ela existir: dispensar ou
  // trocar de seleção derruba a ordem em composição, em vez de deixá-la apontando pra uma
  // tropa que não está mais ali.
  if (
    selecao.marchando !== null &&
    (selecao.marchando !== selecao.hoste || !campanha.hoste(selecao.marchando))
  ) {
    selecao.marchando = null;
  }
  // Sem marcha em composição não há alvo apontado: os dois vivem e morrem juntos.
  if (selecao.marchando === null) selecao.alvoHostil = null;

  const naCampanha = selecao.fase === 'campanha';
  tela.cercosMapa.mostrar(naCampanha ? marcasDeCerco(jogo) : []);
  tela.hostesMapa.mostrar(naCampanha ? marcadoresDasHostes(jogo) : []);
  tela.hostesMapa.selecionar(selecao.hoste);
  // ⚠️ **A busca de rotas roda UMA vez por desenho.** Ver `rotasEmFoco`: rodava três, e com um
  // Porto erguido cada uma varria o mapa inteiro — foi o que fez o jogo travar ao mover tropa.
  const foco = rotasEmFoco(jogo);
  const previsao = previsaoDaMarcha(jogo, foco);
  tela.marchasMapa.mostrar(previsao.origem, previsao.rotas, ordensNoMapa(jogo));
  tela.destinosMapa.mostrar(destinosDaMarcha(jogo, foco));
  tela.exercitoFicha.mostrar(vistaDoExercito(jogo, foco));

  // A janela de governo se redesenha junto com o resto, mas só quando está aberta: fechada,
  // montar as tabelas seria trabalho jogado fora a cada turno.
  //
  // ⚠️ **As TRÊS abas, não só a primeira.** Só o Balanço se redesenhava, e as outras duas
  // ficavam paradas no que era verdade quando a janela abriu — conquistar uma província com
  // a janela aberta mudava a tabela de moedas e deixava a comida e o mercado mentindo.
  // ⚠️ **A diplomacia é JANELA PRÓPRIA e se redesenha sozinha.** Ela estava dentro da trava do
  // Governo, e o efeito era o pior possível: declarar guerra pela janela aberta não repintava
  // nada — o botão sumia do mundo mas não da tela, e o jogador via a lista jurando paz com quem
  // ele acabara de atacar. Só não acontecia com a janela do Governo aberta por acaso.
  if (tela.diplomacia.visivel) tela.diplomacia.desenhar(vistaDaDiplomacia(jogo));

  if (!tela.governo.visivel) return;
  const doBalanco = vistaDoBalanco(jogo);
  if (doBalanco) tela.balanco.desenhar(doBalanco);
  tela.balancoAlimentar.desenhar(vistaDoAlimento(jogo));
  tela.mercado.desenhar(vistaDoMercado(jogo));
}

/**
 * O painel da província inteiro — moldura, ficha e comandos — sai da MESMA seleção, sempre
 * junto: assim não existe estado em que um pedaço mostra uma província e o outro, outra.
 *
 * ⚠️ **A moldura some com o conteúdo.** Ficha e comandos escondidos dentro de um painel
 * visível deixariam uma caixa vazia com friso no canto da tela, e um jogo de estratégia não
 * pode ter moldura sem nada dentro: quem vê procura o que está lá.
 */
function desenharProvincia(jogo: Jogo): void {
  const { tela, selecao } = jogo;
  const alvo = selecao.provincia;
  tela.painelProvincia.hidden = alvo === null || selecao.fase !== 'campanha';
  tela.ficha.mostrar(alvo === null ? null : vistaDaProvincia(jogo, alvo));
  tela.acoes.mostrar(vistaDeAcoes(jogo));

  // As janelas só se redesenham abertas: montar a grade de construções a cada virada com
  // ela fechada é trabalho jogado fora. Vista nula fecha a janela — a província deixou de
  // ser do jogador enquanto ele lia.
  if (tela.construcoes.visivel) tela.construcoes.desenhar(vistaDeConstrucoes(jogo));
  if (tela.recrutamento.visivel) tela.recrutamento.mostrar(vistaDeRecrutamento(jogo));
}
