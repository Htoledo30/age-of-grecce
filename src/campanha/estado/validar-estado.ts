/**
 * O salvamento conferido contra o MUNDO — o que o Zod da forma não tem como saber.
 *
 * `salvamento.ts` garante que o arquivo tem o formato certo; aqui se confere se ele fala do
 * mundo que está carregado: província que um reassado apagou, construção que saiu do
 * catálogo, hoste à frente do próprio contador.
 *
 * ⚠️ **Falha ALTO.** Misturar dois recortes em silêncio seria pior que recusar o
 * salvamento: a partida continuaria rodando errada, e o sintoma apareceria dez turnos
 * depois em algum número que ninguém consegue explicar.
 */

import type { EstadoCampanha } from '../estado-campanha';
import type { NucleoDaCampanha } from '../nucleo';

export function validarSalvamento(nucleo: NucleoDaCampanha, salvo: EstadoCampanha): void {
  const { atlas, economia, catalogo, ajustes } = nucleo;
  const falhar = (motivo: string): never => {
    throw new Error(`salvamento inválido: ${motivo}`);
  };

  // A tabela de donos tem que ser CHEIA e exata — é a regra escrita no estado.
  for (const p of atlas.provincias) {
    const dono = salvo.dono[p.id];
    if (dono === undefined) falhar(`província sem dono: ${p.id}`);
    else if (!atlas.existePoder(dono)) falhar(`dono inexistente: ${dono} em ${p.id}`);
  }
  if (Object.keys(salvo.dono).length !== atlas.provincias.length) {
    falhar('a tabela de donos tem províncias que o atlas não conhece');
  }

  if (salvo.jogador !== null && !atlas.existePoder(salvo.jogador)) {
    falhar(`jogador inexistente: ${salvo.jogador}`);
  }
  for (const poder of Object.keys(salvo.tesouros)) {
    if (!atlas.existePoder(poder)) falhar(`tesouro de poder inexistente: ${poder}`);
  }
  for (const id of Object.keys(salvo.populacao)) {
    if (!economia.provincias[id]) falhar(`população em província não simulada: ${id}`);
  }
  for (const [id, hoste] of Object.entries(salvo.hostes)) {
    if (!atlas.existe(hoste.posicao)) falhar(`hoste ${id} em província inexistente`);
    if (!atlas.existePoder(hoste.poder)) falhar(`hoste ${id} de poder inexistente`);
    const numero = Number(id.replace(/^h/, ''));
    if (!Number.isInteger(numero) || numero >= salvo.proximaHoste) {
      falhar(`hoste ${id} à frente do contador ${salvo.proximaHoste}`);
    }
    for (const origem of Object.keys(hoste.origem)) {
      if (!atlas.existe(origem)) falhar(`hoste ${id} com origem inexistente: ${origem}`);
    }
  }
  for (const [id, formacao] of Object.entries(salvo.formacoes)) {
    if (!atlas.existe(id)) falhar(`formação em província inexistente: ${id}`);
    if (!atlas.existePoder(formacao.poder)) falhar(`formação de poder inexistente`);
  }
  for (const [idHoste, ordem] of Object.entries(salvo.ordens)) {
    if (!salvo.hostes[idHoste]) falhar(`ordem para hoste inexistente: ${idHoste}`);
    for (const passo of ordem.rota) {
      if (!atlas.existe(passo)) falhar(`ordem por província inexistente: ${passo}`);
    }
  }
  for (const idHoste of salvo.surtidas) {
    if (!salvo.hostes[idHoste]) falhar(`surtida de hoste inexistente: ${idHoste}`);
  }
  for (const [id, cerco] of Object.entries(salvo.cercos)) {
    if (!atlas.existe(id)) falhar(`cerco em província inexistente: ${id}`);
    if (!atlas.existePoder(cerco.sitiante)) falhar(`sitiante inexistente em ${id}`);
  }
  for (const [poder, capital] of Object.entries(salvo.capitais)) {
    if (!atlas.existePoder(poder)) falhar(`capital de poder inexistente: ${poder}`);
    if (!atlas.existe(capital)) falhar(`capital em província inexistente: ${capital}`);
  }
  for (const id of Object.keys(salvo.nivelDeImposto)) {
    if (!economia.provincias[id]) falhar(`imposto em província não simulada: ${id}`);
  }
  for (const [id, construcoes] of Object.entries(salvo.construcoes)) {
    if (!atlas.existe(id)) falhar(`construções em província inexistente: ${id}`);
    for (const construcao of Object.keys(construcoes)) {
      if (!catalogo[construcao]) falhar(`construção fora do catálogo: ${construcao} em ${id}`);
    }
  }
  for (const id of Object.keys(salvo.revoltas)) {
    if (!economia.provincias[id]) falhar(`revolta em província não simulada: ${id}`);
  }
  for (const [id, obra] of Object.entries(salvo.obras)) {
    if (!atlas.existe(id)) falhar(`obra em província inexistente: ${id}`);
    if (!catalogo[obra.construcao]) {
      falhar(`obra de construção fora do catálogo: ${obra.construcao}`);
    }
    if (obra.nivelAlvo > ajustes.construcoes.nivelMaximo) {
      falhar(`obra acima do nível máximo em ${id}`);
    }
  }
}
