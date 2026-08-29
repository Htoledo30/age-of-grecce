/**
 * A ALIANÇA: **o topo da escada, e o único acordo que te mete numa guerra que não é tua.**
 *
 * Pedido de Henrique depois do diagnóstico da mesa: *"vamos de aliança então!"*. Ela era o
 * degrau que faltava, e a falta dela tinha forma — o pacto de não-agressão é só uma promessa de
 * NÃO fazer, e nenhum acordo do jogo obrigava alguém a FAZER alguma coisa. Dois reinos podiam
 * sangrar cinquenta turnos contra o mesmo agressor lado a lado sem que um levantasse um homem
 * pelo outro.
 *
 * ## O que ela é
 *
 * 1. **Ela é um pacto que também obriga.** Enquanto vale, nenhum dos dois declara guerra ao
 *    outro — como o pacto — e, além disso, **a guerra de um vira a guerra do outro**.
 * 2. **A entrada é automática.** Quando o aliado declara guerra, você entra junto no mesmo
 *    turno, sem perguntar. ⚠️ Não é falta de agência: a agência foi ASSINAR, e ela continua
 *    existindo depois em `romperAlianca` — se a guerra não te serve, rompe. Uma "convocação"
 *    que se pode recusar de graça seria uma aliança que não obriga, ou seja, um pacto com nome
 *    pomposo. O preço de sair é o mesmo de romper qualquer promessa: o choque na opinião do
 *    traído e a REPUTAÇÃO caindo com o mapa inteiro.
 * 3. **Só o aliado DIRETO entra.** Aliado de aliado não é aliado, e sem esta linha uma
 *    escaramuça de fronteira viraria guerra mundial em três turnos.
 * 4. **Promessa que já existe segura a convocação.** Ninguém é arrastado contra quem já tem
 *    pacto, trégua ou aliança — o papel assinado antes continua valendo, e a aliança não pode
 *    fazer você quebrar de graça uma promessa que te custaria reputação quebrar sozinho. Quem
 *    quiser entrar mesmo assim rompe o que atrapalha, e paga por isso.
 * 5. **A paz é de cada um.** Entrar na guerra do aliado é automático; sair dela não. Cada par
 *    faz a sua paz, e é isso que impede uma aliança de virar um bloco que só existe inteiro.
 *
 * ## Por que ela não canibaliza o pacto
 *
 * Pelo mesmo motivo que o tributo não canibaliza o pacto: **ela pede muito mais confiança e
 * cobra um preço que o pacto não cobra.** O pacto é de graça e só te impede de atacar; a
 * aliança te põe em guerras que você não escolheu. Quem quer segurança sem risco assina pacto —
 * e é a resposta certa para quase todo mundo.
 */

import type { NucleoDaCampanha, Permissao } from '../nucleo';
import { ladosDoPar, parDe } from './par';

/** Até que turno a aliança segura. `undefined` quando não há uma em pé. */
export function aliancaAte(
  nucleo: NucleoDaCampanha,
  a: string,
  b: string,
): number | undefined {
  const ate = nucleo.estado.aliancas[parDe(a, b)];
  return ate !== undefined && ate > nucleo.estado.turno ? ate : undefined;
}

/** Com quem este poder está aliado agora, em ordem de id. */
export function aliadosDe(nucleo: NucleoDaCampanha, idPoder: string): readonly string[] {
  const aliados: string[] = [];
  for (const par of Object.keys(nucleo.estado.aliancas).sort()) {
    const lados = ladosDoPar(par);
    if (lados === undefined) continue;
    const [a, b] = lados;
    const outro = a === idPoder ? b : b === idPoder ? a : undefined;
    if (outro !== undefined && aliancaAte(nucleo, idPoder, outro) !== undefined) {
      aliados.push(outro);
    }
  }
  return aliados.sort();
}

/**
 * Esta aliança pode ser assinada?
 *
 * ⚠️ **A opinião É a aceitação**, como no pacto: perguntar depois "e você aceita?" contaria a
 * mesma confiança duas vezes. O que muda são os números — aliança pede muito mais, porque o que
 * se assina aqui não é uma promessa de não fazer, é um cheque em branco de guerra.
 */
export function podeAliar(
  nucleo: NucleoDaCampanha,
  a: string,
  b: string,
  turnos: number,
  emGuerra: (a: string, b: string) => boolean,
  vivo: (id: string) => boolean,
  opiniao: number,
): Permissao {
  if (a === b) return { pode: false, motivo: 'não se faz aliança consigo mesmo' };
  if (!vivo(a) || !vivo(b)) return { pode: false, motivo: 'este poder não está mais no jogo' };
  if (emGuerra(a, b)) return { pode: false, motivo: 'vocês estão em guerra' };
  if (aliancaAte(nucleo, a, b) !== undefined) {
    return { pode: false, motivo: 'já existe uma aliança em pé' };
  }
  const prazo = nucleo.ajustes.diplomacia.alianca.prazos.find((p) => p.turnos === turnos);
  if (!prazo) return { pode: false, motivo: 'este prazo não existe' };
  if (opiniao < prazo.opiniaoMinima) {
    return {
      pode: false,
      motivo: `aliança é guerra emprestada: ${prazo.turnos} turnos exigem opinião ${prazo.opiniaoMinima}`,
    };
  }
  return { pode: true };
}

/** Assina. Quem chama já checou `podeAliar`. */
export function assinarAlianca(
  nucleo: NucleoDaCampanha,
  a: string,
  b: string,
  turnos: number,
): void {
  nucleo.estado.aliancas[parDe(a, b)] = nucleo.estado.turno + turnos;
}

/** Apaga o registro. O preço de quem rompeu é cobrado por quem chama. */
export function apagarAlianca(nucleo: NucleoDaCampanha, a: string, b: string): boolean {
  if (nucleo.estado.aliancas[parDe(a, b)] === undefined) return false;
  delete nucleo.estado.aliancas[parDe(a, b)];
  return true;
}

/** Aliança vencida some na virada, como o pacto. */
export function limparAliancasVencidas(nucleo: NucleoDaCampanha): void {
  for (const [par, ate] of Object.entries(nucleo.estado.aliancas)) {
    if (ate <= nucleo.estado.turno) delete nucleo.estado.aliancas[par];
  }
}

/**
 * Quem é ARRASTADO para a guerra que `de` acaba de declarar a `contra`.
 *
 * Os dois lados convocam: os aliados de quem declarou entram contra o alvo, e os aliados do
 * alvo entram contra quem declarou. Cada convocado vem com o inimigo que lhe cabe.
 *
 * ⚠️ **Quem já tem papel assinado com o inimigo não é arrastado.** Pacto, trégua ou aliança com
 * o alvo seguram a convocação — ver a regra 4 no topo do arquivo. É por isso que esta função
 * recebe `jaPrometido` de fora: quem sabe o que existe entre dois poderes é `relacoes.ts`, e a
 * aliança não vai reimplementar essa consulta para discordar dela um dia.
 */
export function convocadosPor(
  nucleo: NucleoDaCampanha,
  de: string,
  contra: string,
  jaPrometido: (a: string, b: string) => boolean,
): readonly { poder: string; inimigo: string }[] {
  const convocados: { poder: string; inimigo: string }[] = [];
  const chamar = (lado: string, inimigo: string): void => {
    for (const aliado of aliadosDe(nucleo, lado)) {
      if (aliado === inimigo) continue;
      if (jaPrometido(aliado, inimigo)) continue;
      convocados.push({ poder: aliado, inimigo });
    }
  };
  chamar(de, contra);
  chamar(contra, de);
  // Em ordem, para a mesma partida declarar as mesmas guerras em qualquer máquina.
  return convocados.sort(
    (x, y) => x.poder.localeCompare(y.poder) || x.inimigo.localeCompare(y.inimigo),
  );
}
