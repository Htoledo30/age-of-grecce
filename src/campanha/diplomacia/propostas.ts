/**
 * A MESA DE PROPOSTAS: o que os outros reinos estão te pedindo nesta virada.
 *
 * Henrique jogando: *"não sinto a IA tentando se conectar comigo para oferecer diplomacia,
 * deveria acontecer isso, e aparecer que um reino está querendo negociar comigo e eu ter opção
 * de aceitar ou recusar as propostas"*.
 *
 * ⚠️ **A IA já decidia; ela só não perguntava.** Pacto e comércio saíam de `firmarPacto` e
 * `acordarComercio` direto, e o jogador descobria pela aba de Diplomacia que tinha assinado
 * alguma coisa. A decisão da IA continua exatamente a mesma — o que muda é o destino dela:
 * quando a outra ponta é o jogador, a assinatura vira PEDIDO e espera resposta.
 *
 * ⚠️ **Vale só para acordo que precisa de dois.** Presente, guerra e tributo pago não entram:
 * ninguém pede licença para dar ouro, para declarar guerra ou para começar a pagar. A paz
 * também não, e por um motivo diferente — ela já é decidida pelos dois lados, num passo
 * próprio no fim do turno da IA.
 *
 * A mesa é do TURNO, e quem a esvazia é a JOGADA SEGUINTE da IA, antes de ela pedir de novo.
 * Proposta guardada de uma virada para outra faria o jogador responder a um mundo que já
 * mudou, e faria o mesmo pedido empilhar dez vezes.
 *
 * ⚠️ **Ela era esvaziada em `passarTurno`, e isso apagava TODO pedido antes de o jogador
 * vê-lo.** A ordem real de `virarTurno` é: a IA joga, e só então a campanha vira. O pedido
 * nascia na jogada e morria na virada, dentro da mesma chamada e antes de a tela redesenhar,
 * desde o dia em que a mesa nasceu. Ninguém viu porque o teste de tela injeta o pedido à mão
 * com a IA congelada, o teste unitário guardava *"a virada limpa a mesa"* como se fosse a
 * regra, e `npm run partida` contava os pedidos DENTRO da jogada, antes do apagão. Henrique
 * jogou semanas sem receber uma proposta: *"não sinto a IA tentando se conectar comigo"*
 * continuou verdadeiro depois de a mesa existir. Ver `esvaziarMesa`.
 */

import type { Proposta } from '../estado-campanha';
import type { NucleoDaCampanha, Permissao } from '../nucleo';
import { concederAcesso, podeConcederAcesso } from './acesso-militar';
import { chefeDe } from './liga';
import {
  acordarComercio,
  anexarMembro,
  firmarAlianca,
  formarLiga,
  firmarPacto,
  podeAcordarComercio,
  podeFirmarAlianca,
  podeFirmarPacto,
  podeFormarLiga,
} from './relacoes';

/**
 * Esvazia a mesa. A IA chama isto no começo da jogada dela, e é o ÚNICO lugar que esvazia.
 *
 * ⚠️ Aqui e não em `passarTurno`: a jogada da IA vem ANTES da virada, então limpar na virada
 * apagava o que acabara de ser pedido. Limpar no começo da jogada dá ao pedido a vida certa,
 * o turno inteiro do jogador, e o mesmo reino continua sem empilhar o mesmo pedido, porque a
 * mesa nasce vazia toda vez que ele volta a falar. Devolve se havia alguma coisa nela.
 */
export function esvaziarMesa(nucleo: NucleoDaCampanha): boolean {
  const havia = nucleo.estado.propostas.length > 0;
  nucleo.estado.propostas = [];
  return havia;
}

/** O que está na mesa do jogador agora. Ordenado por quem pede, para a tela não dançar. */
export function propostasAoJogador(nucleo: NucleoDaCampanha): readonly Proposta[] {
  return [...nucleo.estado.propostas].sort(
    (a, b) => a.de.localeCompare(b.de) || a.tipo.localeCompare(b.tipo),
  );
}

/**
 * Registra um pedido — e só se ele fosse aceitável AGORA.
 *
 * ⚠️ **A checagem é aqui e não na resposta**, porque um pedido impossível na mesa é pior que
 * pedido nenhum: o jogador clica "aceitar" e nada acontece. Se o mundo mudar entre o pedido e
 * a resposta, a resposta recusa — e aí ela diz o motivo.
 */
export function proporAoJogador(nucleo: NucleoDaCampanha, proposta: Proposta): boolean {
  const jogador = nucleo.estado.jogador;
  if (jogador === null || proposta.de === jogador) return false;
  if (!avaliar(nucleo, proposta, jogador).pode) return false;
  // Um pedido por reino e por tipo: insistir na mesma virada é ruído, não diplomacia.
  if (
    nucleo.estado.propostas.some((p) => p.de === proposta.de && p.tipo === proposta.tipo)
  ) {
    return false;
  }
  nucleo.estado.propostas.push(proposta);
  return true;
}

/** Esta proposta ainda pode ser aceita? É a mesma permissão do acordo que ela pede. */
function avaliar(
  nucleo: NucleoDaCampanha,
  proposta: Proposta,
  jogador: string,
): Permissao {
  switch (proposta.tipo) {
    case 'pacto':
      return podeFirmarPacto(nucleo, jogador, proposta.de, proposta.turnos ?? 0);
    case 'alianca':
      return podeFirmarAlianca(nucleo, jogador, proposta.de, proposta.turnos ?? 0);
    case 'liga':
      // ⚠️ Quem lidera é QUEM PEDE: o jogador é o membro, e é ele que se dobra.
      return podeFormarLiga(nucleo, proposta.de, jogador);
    case 'anexacao':
      // ⚠️ **O único pedido que tira um reino do mapa**, e por isso é o único que exige o sim.
      // A permissão aqui só checa que ele é mesmo o chefe; o SIM é o clique do jogador.
      return chefeDe(nucleo, jogador) === proposta.de
        ? { pode: true }
        : { pode: false, motivo: 'ele não lidera a sua liga' };
    case 'comercio':
      return podeAcordarComercio(nucleo, jogador, proposta.de);
    case 'acesso':
      // ⚠️ Quem concede é o JOGADOR: o pedido é para atravessar a terra dele.
      return podeConcederAcesso(nucleo, jogador, proposta.de, proposta.turnos ?? 0);
  }
}

/**
 * O jogador aceita. Devolve a recusa quando o mundo mudou entre o pedido e o clique.
 *
 * Aceitar TIRA a proposta da mesa em qualquer caso: um pedido que não vale mais não fica lá
 * esperando um segundo clique que também não vai funcionar.
 */
export function aceitarProposta(
  nucleo: NucleoDaCampanha,
  de: string,
  tipo: Proposta['tipo'],
): Permissao {
  const jogador = nucleo.estado.jogador;
  if (jogador === null) return { pode: false, motivo: 'a campanha ainda não começou' };
  const proposta = nucleo.estado.propostas.find((p) => p.de === de && p.tipo === tipo);
  if (!proposta) return { pode: false, motivo: 'esta proposta não está mais na mesa' };
  recusarProposta(nucleo, de, tipo);

  const veredito = avaliar(nucleo, proposta, jogador);
  if (!veredito.pode) return veredito;
  switch (tipo) {
    case 'pacto':
      firmarPacto(nucleo, jogador, de, proposta.turnos ?? 0);
      break;
    case 'alianca':
      firmarAlianca(nucleo, jogador, de, proposta.turnos ?? 0);
      break;
    case 'liga':
      formarLiga(nucleo, de, jogador);
      break;
    case 'anexacao':
      // ⚠️ Aceitar aqui é entregar o reino. O jogador sabe — a frase da mesa diz isso com
      // todas as letras — e recusar não custa nada, como em toda proposta.
      anexarMembro(nucleo, de, jogador);
      break;
    case 'comercio':
      acordarComercio(nucleo, jogador, de);
      break;
    case 'acesso':
      concederAcesso(nucleo, jogador, de, proposta.turnos ?? 0);
      break;
  }
  return { pode: true };
}

/**
 * O jogador recusa — e recusar **não custa nada**.
 *
 * ⚠️ Decisão de desenho, e ela é o que faz a mesa ser jogável. Se dizer não abalasse a
 * opinião, a resposta certa seria nunca abrir a aba; e um sistema que pune quem o usa é um
 * sistema que ninguém usa. O que custa é romper o que já foi assinado, e isso já tem preço.
 */
export function recusarProposta(
  nucleo: NucleoDaCampanha,
  de: string,
  tipo: Proposta['tipo'],
): boolean {
  const antes = nucleo.estado.propostas.length;
  nucleo.estado.propostas = nucleo.estado.propostas.filter(
    (p) => !(p.de === de && p.tipo === tipo),
  );
  return nucleo.estado.propostas.length < antes;
}
