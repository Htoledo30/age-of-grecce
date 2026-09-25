/**
 * Grão comprado de fora: **o ouro virando comida.**
 *
 * Era o elo que faltava entre as duas pontas da economia. O exército é limitado pela
 * despensa, o ouro não comprava despensa, e medido em 250 turnos o reino que vencia a
 * expansão terminava com 120 mil moedas paradas e três mil homens em armas. Atenas fazia
 * exatamente isto: vivia do trigo do Mar Negro, pago com a prata do Láurio.
 *
 * Três regras, e as três existem para a compra não substituir a Fazenda:
 *
 * 1. **A porta é uma obra.** Porto e Mercado declaram `importaGrao` no catálogo; sem eles não
 *    há de quem comprar. Cidade sitiada não conta, e cais bloqueado não conta — cortar o
 *    trigo de Atenas é o motivo de se bloquear o Pireu.
 * 2. **Cada ponto custa mais que o anterior.** O ponto `n` custa `n × precoPorPonto` por
 *    turno: comprar resolve o aperto, plantar continua sendo o que se paga sozinho.
 * 3. **Paga-se todo turno, e quem não paga não recebe.** A encomenda é cortada antes da
 *    arrecadação até caber no que o tesouro aguenta — grão fiado seria comida de graça.
 *
 * O que chega entra na conta CIVIL, como a colheita: alimenta o povo e o exército igual.
 */

import type { Ajustes } from '@/dados/esquema';
import type { NucleoDaCampanha, Permissao } from '../nucleo';
import { vivo } from '../governo/poderes';
import { tesouroDe } from '../governo/tesouro';
import { bloqueadaEm } from '../guerra/bloqueio';
import { estaSitiada } from '../guerra/cercos';

type AjustesDaImportacao = Ajustes['jogo']['alimento']['importacao'];

/** O que custam, por turno, `pontos` pontos comprados: 1 + 2 + … + n vezes o preço. */
export function custoDaImportacao(pontos: number, ajustes: AjustesDaImportacao): number {
  if (pontos <= 0) return 0;
  return (ajustes.precoPorPonto * pontos * (pontos + 1)) / 2;
}

/** Quantos pontos as obras deste poder deixam entrar AGORA. */
export function capacidadeDeImportacaoDe(nucleo: NucleoDaCampanha, idPoder: string): number {
  let total = 0;
  for (const idProvincia of nucleo.territorios.provinciasDe(idPoder)) {
    const erguidas = nucleo.estado.construcoes[idProvincia];
    if (erguidas === undefined || estaSitiada(nucleo, idProvincia)) continue;
    for (const [idObra, nivel] of Object.entries(erguidas)) {
      const obra = nucleo.catalogo[idObra];
      const pontos = obra?.importaGrao?.[Math.max(0, Math.min(2, nivel - 1))] ?? 0;
      if (pontos <= 0) continue;
      // Cais bloqueado não é cais — a mesma pergunta que a rede de trocas faz. Ela vem por
      // último porque varre as hostes, e cais é raro.
      if (obra?.ligaPorMar === true && bloqueadaEm(nucleo, idProvincia)) continue;
      total += pontos;
    }
  }
  return total;
}

/** A encomenda que este poder deixou registrada, chegue ou não. */
export function encomendaDe(nucleo: NucleoDaCampanha, idPoder: string): number {
  return nucleo.estado.importacao[idPoder] ?? 0;
}

/** Os pontos que CHEGAM: a encomenda, limitada pelo que as portas deixam passar hoje. */
export function importacaoDe(nucleo: NucleoDaCampanha, idPoder: string): number {
  const encomenda = encomendaDe(nucleo, idPoder);
  if (encomenda <= 0) return 0;
  return Math.min(encomenda, capacidadeDeImportacaoDe(nucleo, idPoder));
}

/** O que o grão que chega custa por turno a este poder. Paga-se só o que chega. */
export function custoDaImportacaoDe(nucleo: NucleoDaCampanha, idPoder: string): number {
  return custoDaImportacao(importacaoDe(nucleo, idPoder), nucleo.ajustes.alimento.importacao);
}

/** Pode encomendar estes pontos? A recusa vem com o motivo, como sempre. */
export function podeDefinirImportacao(
  nucleo: NucleoDaCampanha,
  idPoder: string | null,
  pontos: number,
): Permissao {
  if (idPoder === null) return { pode: false, motivo: 'Nenhum reino escolhido' };
  if (!Number.isInteger(pontos) || pontos < 0) {
    return { pode: false, motivo: 'Quantidade inválida' };
  }
  if (pontos > encomendaDe(nucleo, idPoder) && pontos > capacidadeDeImportacaoDe(nucleo, idPoder)) {
    return { pode: false, motivo: 'Sem Porto ou Mercado para receber mais' };
  }
  return { pode: true };
}

/** Registra a encomenda. Zero apaga o registro: só guarda quem compra. */
export function definirImportacao(
  nucleo: NucleoDaCampanha,
  idPoder: string | null,
  pontos: number,
): void {
  const r = podeDefinirImportacao(nucleo, idPoder, pontos);
  if (!r.pode) throw new Error(r.motivo);
  if (idPoder === null) return;
  if (pontos === 0) delete nucleo.estado.importacao[idPoder];
  else nucleo.estado.importacao[idPoder] = pontos;
}

/**
 * Corta a encomenda de quem não pode pagar, ANTES da arrecadação.
 *
 * ⚠️ **Tem de vir antes, e a ordem é a regra.** A arrecadação não deixa o tesouro descer de
 * zero; sem este corte, quem zerou o cofre comeria o grão e não pagaria nada. Aqui a
 * encomenda desce ponto a ponto até o turno fechar com o tesouro em zero ou mais.
 *
 * `rendaDe` entra como parâmetro porque ela já desconta a importação, e esta função não pode
 * importar a renda sem fechar um ciclo entre os dois módulos.
 */
export function acertarImportacoes(
  nucleo: NucleoDaCampanha,
  rendaDe: (idPoder: string) => number,
): void {
  for (const idPoder of Object.keys(nucleo.estado.importacao).sort()) {
    if (!vivo(nucleo, idPoder)) {
      delete nucleo.estado.importacao[idPoder];
      continue;
    }
    while (encomendaDe(nucleo, idPoder) > 0 && tesouroDe(nucleo, idPoder) + rendaDe(idPoder) < 0) {
      const menos = encomendaDe(nucleo, idPoder) - 1;
      if (menos === 0) delete nucleo.estado.importacao[idPoder];
      else nucleo.estado.importacao[idPoder] = menos;
    }
  }
}
