/**
 * Põe a interface de pé — e **a ordem em que ela é montada é a regra de empilhamento.**
 *
 * DOM anterior é desenhado por baixo, então cada `append` aqui decide o que cobre o quê:
 * rota atrás de peça, bandeira de cerco atrás do número de defensores, destino por cima de
 * hoste. Trocar duas linhas deste arquivo não dá erro nenhum — dá um marcador que some
 * atrás de outro.
 */

import type { Construcoes } from '@/dados/esquema';
import { AcoesProvincia } from '@/ui/acoes-provincia';
import { AnimacaoDeMarcha } from '@/ui/animacao-de-marcha';
import { Balanco } from '@/ui/balanco';
import { BalancoAlimentar } from '@/ui/balanco-alimentar';
import { BarraTurno } from '@/ui/barra-turno';
import { JanelaDeBatalha } from '@/ui/batalha';
import { CercosMapa } from '@/ui/cercos-mapa';
import { Cronica } from '@/ui/cronica';
import { DestinosMapa } from '@/ui/destinos-mapa';
import { ExercitoFicha } from '@/ui/exercito-ficha/exercito-ficha';
import { FichaProvincia } from '@/ui/ficha-provincia/ficha-provincia';
import { FimDeJogo } from '@/ui/fim-de-jogo';
import { Governo } from '@/ui/governo';
import { HostesMapa } from '@/ui/hostes-mapa';
import { InicioJogo } from '@/ui/inicio-jogo';
import { MarchasMapa } from '@/ui/marchas-mapa';
import { Mercado } from '@/ui/mercado';
import { PainelFps } from '@/ui/painel-fps';
import { PainelLateral } from '@/ui/painel-lateral';
import { Recrutamento } from '@/ui/recrutamento';
import type { Tela } from './contexto';

export function montarTela(
  ui: HTMLElement,
  coresDosPoderes: boolean,
  catalogo: Construcoes['construcoes'],
): Tela {
  const painelFps = new PainelFps(ui);
  const lateral = new PainelLateral(ui, coresDosPoderes);

  // Identidade primeiro, decisões depois: a província selecionada abre a coluna e as ações
  // seguem abaixo. É a ordem de leitura de uma interface de estratégia, não a ordem em que
  // os sistemas foram implementados.
  const colunaProvincia = document.createElement('div');
  colunaProvincia.className = 'coluna-provincia';
  ui.appendChild(colunaProvincia);
  const ficha = new FichaProvincia(colunaProvincia);
  const acoes = new AcoesProvincia(colunaProvincia);
  // Recrutar é outra mecânica de investir e construir: mexe em gente, não em dinheiro. Por
  // isso permanece num bloco próprio, recolhível, depois das ações da província.
  const recrutamento = new Recrutamento(colunaProvincia);
  ficha.usarCatalogo(
    Object.fromEntries(Object.entries(catalogo).map(([id, c]) => [id, c.nome])),
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
  // A hoste escolhida ganha região própria, em baixo-centro: ela não é a província, e assim
  // que marchar as duas deixam de coincidir.
  const exercitoFicha = new ExercitoFicha(ui);
  // A crônica fica no alto à direita, sozinha: é notícia da rodada inteira, não de uma
  // província nem de uma hoste, e não pertence a nenhuma das colunas.
  const cronica = new Cronica(ui);
  // A janela de batalha para o jogo enquanto está aberta, então ela vem por cima do mapa e
  // dos marcadores, e por baixo do fim de campanha — que é a única coisa mais definitiva.
  const batalha = new JanelaDeBatalha(ui);
  const inicio = new InicioJogo(ui);
  const fimDeJogo = new FimDeJogo(ui);
  const barraTurno = new BarraTurno(ui);

  // A casca de governo já nasce com abas: a segunda (poderes, diplomacia, modos de mapa)
  // vai custar uma linha aqui em vez de uma remodelação de layout.
  const balanco = new Balanco();
  // A segunda aba custou uma linha, como a casca prometia. Ela existe porque a ficha
  // responde metade da conta da comida e a barra a outra metade, e as duas metades não
  // fecham entre si: falta no meio o que a tropa come, que não pertence a província nenhuma.
  const balancoAlimentar = new BalancoAlimentar();
  // A terceira aba: os bens DISTINTOS que o reino alcança. Ela não cabia em lugar nenhum —
  // não é de província (é nacional) nem da barra (é uma lista, não um número).
  const mercado = new Mercado();
  const governo = new Governo(ui, [balanco, balancoAlimentar, mercado]);

  return {
    ficha,
    acoes,
    recrutamento,
    exercitoFicha,
    barraTurno,
    governo,
    balanco,
    balancoAlimentar,
    mercado,
    cronica,
    batalha,
    inicio,
    fimDeJogo,
    hostesMapa,
    cercosMapa,
    marchasMapa,
    destinosMapa,
    animacaoDeMarcha,
    painelFps,
    lateral,
  };
}
