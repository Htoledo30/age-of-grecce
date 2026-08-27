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
} from './vistas/mapa';
import { vistaDaProvincia, vistaDeAcoes, vistaDeRecrutamento } from './vistas/provincia';
import { vistaDoExercito } from './vistas/exercito';

const ALGARISMOS = ['0', 'I', 'II', 'III'];

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
          capitalPerdida:
            campanha.capitalPerdida(jogador.id) &&
            campanha.provinciasDe(jogador.id).length > 0,
        },
  );

  desenharFicha(jogo);
  tela.acoes.mostrar(vistaDeAcoes(jogo));
  tela.recrutamento.mostrar(vistaDeRecrutamento(jogo));

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
  const previsao = previsaoDaMarcha(jogo);
  tela.marchasMapa.mostrar(previsao.origem, previsao.rotas, ordensNoMapa(jogo));
  tela.destinosMapa.mostrar(destinosDaMarcha(jogo));
  tela.exercitoFicha.mostrar(vistaDoExercito(jogo));

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
 * A ficha e o painel de ações saem da MESMA seleção, sempre juntos: assim não existe estado
 * em que um mostra uma província e o outro, outra.
 */
function desenharFicha(jogo: Jogo): void {
  const { campanha, tela, selecao } = jogo;
  const alvo = selecao.provincia;
  if (alvo === null) {
    tela.ficha.mostrar(null);
    return;
  }
  const renda = campanha.economiaDe(alvo);
  const obra = campanha.obraEm(alvo);
  tela.ficha.mostrar(
    vistaDaProvincia(jogo, alvo),
    // A tropa de origem entra na vista da ficha: é conta da CAMPANHA (origem dos soldados),
    // não da economia pura da terra.
    renda ? { ...renda, tropaDeOrigem: campanha.custoDaTropaDe(alvo) } : null,
    obra
      ? {
          nome:
            `${campanha.construcoesDisponiveis[obra.construcao]?.nome ?? ''} ` +
            `${ALGARISMOS[obra.nivelAlvo] ?? String(obra.nivelAlvo)}`,
          turnosRestantes: obra.turnosRestantes,
        }
      : null,
    campanha.crescimentoDe(alvo),
    campanha.perfilDe(alvo),
    Object.fromEntries(
      campanha.construcoesEm(alvo).map((id) => [id, campanha.nivelDaConstrucaoEm(alvo, id)]),
    ),
  );
}
