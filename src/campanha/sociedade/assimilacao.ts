/**
 * A terra conquistada: **o começo é o que importa, e o tempo resolve o resto.**
 *
 * O desenho de Henrique, nas palavras dele: *"quando a terra for conquistada, o início é o mais
 * crítico, precisa cuidar para não acontecer a revolta, e com o tempo, se cuidou, [...] os
 * espartanos devagar vão se tornando atenienses. [...] Depois da fase crítica, revolta só em
 * casos extremos: falta de comida, dinheiro, e a população conquistada MUITO superior."* E o
 * porquê: *"não quero os jogadores nem a IA perdendo muito tempo com essa mecânica — o foco é
 * conquistar"*.
 *
 * Duas peças, e as duas moram aqui:
 *
 * 1. **A FASE CRÍTICA.** Por `revolta.faseCritica` turnos depois da queda, a terra estrangeira
 *    se levanta já na faixa "Insatisfeita": é quando guarnição, Templo e imposto baixo fazem
 *    diferença. Passado o prazo ela só pega em armas no fundo da régua, como a do próprio rei —
 *    e o fundo só se alcança somando causa óbvia: fome, cofre vazio, cerco, confisco.
 * 2. **A ASSIMILAÇÃO.** Fora da fase crítica, em paz com o dono, cada fatia estrangeira passa
 *    devagar à nacionalidade dele. A régua é a composição do povo que a ficha já mostra, e ela
 *    muda o futuro sem drama: a terra que virou ateniense deixa de pesar como estrangeira para
 *    Atenas — e passa a pesar como estrangeira para quem um dia a retomar.
 */

import type { NucleoDaCampanha } from '../nucleo';
import { estaSitiada } from '../guerra/cercos';
import { donoDe } from '../provincia/consultas';
import { nacionalidadeDoPoder } from './nacionalidade';

/** Fatia abaixo da qual uma nacionalidade some da província: vira o povo do dono. */
const FATIA_MINIMA = 0.001;

/** Quantos turnos de fase crítica ainda restam aqui. Zero quando não há, ou já passou. */
export function faseCriticaEm(nucleo: NucleoDaCampanha, idProvincia: string): number {
  const desde = nucleo.estado.conquistadaEm[idProvincia];
  if (desde === undefined) return 0;
  const prazo = nucleo.ajustes.felicidade.revolta.faseCritica;
  return Math.max(0, desde + prazo - nucleo.estado.turno);
}

/**
 * Um passo de assimilação em todas as províncias simuladas.
 *
 * ⚠️ **Só assimila quem está em paz com o dono** — fora da fase crítica, sem cerco e com humor
 * de `humorMinimo` para cima. É o "se cuidou" do desenho: a terra maltratada não vira do rei.
 */
export function assimilar(nucleo: NucleoDaCampanha): void {
  const ajustes = nucleo.ajustes.felicidade.assimilacao;
  if (ajustes.porTurno <= 0) return;
  for (const idProvincia of Object.keys(nucleo.economia.provincias).sort()) {
    const povos = nucleo.estado.nacionalidades[idProvincia];
    if (povos === undefined) continue;
    const doDono = nacionalidadeDoPoder(nucleo, donoDe(nucleo, idProvincia));
    if (doDono === undefined) continue;
    if (faseCriticaEm(nucleo, idProvincia) > 0 || estaSitiada(nucleo, idProvincia)) continue;
    if ((nucleo.estado.felicidade[idProvincia] ?? 0) < ajustes.humorMinimo) continue;

    const triboDoDono = nucleo.economia.nacionalidades[doDono]?.povo;
    let ganho = 0;
    for (const [id, fracao] of Object.entries(povos).sort((a, b) => a[0].localeCompare(b[0]))) {
      if (id === doDono) continue;
      const mesmaTribo = nucleo.economia.nacionalidades[id]?.povo === triboDoDono;
      const taxa = Math.min(1, ajustes.porTurno * (mesmaTribo ? ajustes.mesmaTribo : 1));
      const resto = fracao * (1 - taxa);
      if (resto < FATIA_MINIMA) {
        ganho += fracao;
        delete povos[id];
      } else {
        ganho += fracao - resto;
        povos[id] = resto;
      }
    }
    if (ganho > 0) povos[doDono] = (povos[doDono] ?? 0) + ganho;
  }
}
