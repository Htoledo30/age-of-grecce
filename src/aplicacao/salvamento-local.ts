/**
 * O salvamento automático: toda mudança de estado vai pro `localStorage` na hora.
 *
 * **Não existe botão de salvar de propósito** — fechar a janela em qualquer instante preserva
 * a partida, que é o que se espera de um jogo em 2026. O custo é um `JSON.stringify` de um
 * estado pequeno por clique, e ele não se mede.
 */

import type { Campanha } from '@/campanha/campanha';
import { lerSalvamento } from '@/campanha/salvamento';

const CHAVE = 'age-of-grecce:salvamento';

export function salvarCampanha(campanha: Campanha): void {
  if (!campanha.iniciada) return;
  try {
    localStorage.setItem(CHAVE, campanha.serializar());
  } catch (erro) {
    // Sem espaço ou sem permissão: o jogo continua, só não persiste. Avisar no console basta
    // — interromper a partida por causa do salvamento seria pior que perdê-lo.
    console.warn('não foi possível salvar a campanha', erro);
  }
}

/** Apaga a partida guardada. Usado por "recomeçar" e pelo fim de jogo. */
export function esquecerCampanha(): void {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    // sem acesso ao armazenamento não há o que apagar
  }
}

/**
 * Pergunta pelo salvamento UMA vez, no boot, e devolve `true` quando uma partida foi
 * retomada.
 *
 * Salvamento inválido — versão velha, mapa reassado, catálogo mudado — é avisado no console e
 * ignorado: recusar alto é melhor que misturar dois recortes em silêncio, e a partida nova
 * continua a um clique.
 */
export function retomarCampanha(campanha: Campanha): boolean {
  try {
    const salvo = localStorage.getItem(CHAVE);
    if (salvo === null) return false;
    campanha.restaurar(lerSalvamento(salvo));
    return campanha.iniciada;
  } catch (erro) {
    console.warn('salvamento ignorado:', erro);
    return false;
  }
}
