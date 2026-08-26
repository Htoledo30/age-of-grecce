/**
 * O que a IA VÊ de tomável — a lista das terras alheias na porta dela.
 *
 * Camada de percepção, mesma regra de `ameaca.ts`: **lê e não escreve, e não decide nada.**
 * Ela devolve os fatos separados — quanto a terra rende, que bem novo ela traz, quem a
 * defende — e é `guerra/marchar.ts` que os pesa com o estilo do poder. A separação não é
 * cerimônia: um mercador e um guerreiro olham para a MESMA Corinto e chegam a respostas
 * diferentes, e isso só funciona se o olhar for um só.
 *
 * ⚠️ **Ela não enxerga nada que o jogador não enxergue.** Milícia, hostes e produto da terra
 * estão todos na ficha que a tela abre com um clique. No dia em que houver névoa, é esta
 * camada que muda — e é por isso que ela existe separada.
 *
 * ⚠️ **Só entra terra de poder COM ECONOMIA, e isso é uma limitação assumida.** Das 196
 * províncias desenhadas, 25 são simuladas; as outras 171 não têm ficha, não têm população e
 * portanto não têm milícia — caem no primeiro soldado que pisar nelas. Esparta é uma delas.
 * Uma IA autorizada a comê-las dobraria de tamanho em cinco turnos sem levar uma batalha, e o
 * teatro desenhado afundaria num mapa de terra grátis. **O jogador ainda pode fazer isso**, e
 * é um buraco conhecido: o conserto é dar ficha àquelas províncias, não proibir a IA de jogar.
 */

import type { Campanha } from '@/campanha/campanha';

/** Uma terra alheia ao alcance do reino, com o que se sabe dela. */
export interface Oportunidade {
  provincia: string;
  dono: string;
  /** O que ela põe no cofre por turno hoje, com o dono atual. Pode ser negativo. */
  renda: number;
  /** O que os bens INÉDITOS dela acrescentariam à minha rede de trocas, por turno. */
  bemNovo: number;
  /** É a capital do dono? Tomá-la vale muito mais do que a renda dela diz. */
  capital: boolean;
  /** Homens do DONO parados ali. Não conta terceiros acampados. */
  defensores: number;
  milicia: number;
  /**
   * Cai sem batalha: não há milícia nem exército do dono para fechar o portão.
   *
   * É a mesma regra que a rodada aplica, e não um atalho da IA — ver `cidades.ts`.
   */
  vazia: boolean;
}

/**
 * As terras alheias que este poder alcança, em ordem de id.
 *
 * "Alcança" é vizinhança de alguma coisa minha: uma província do reino ou o lugar onde uma
 * hoste minha está parada. A segunda metade importa e é fácil de esquecer — um exército
 * acampado em terra tomada abre a fronteira SEGUINTE, e sem ela a IA conquistava uma província
 * e parava, sem enxergar o que estava à frente do próprio acampamento.
 *
 * A ordem é por id de propósito: quem ordena por valor é quem decide, e o valor depende do
 * estilo. Aqui a lista precisa ser sempre a mesma para a mesma partida.
 */
export function oportunidadesDe(campanha: Campanha, idPoder: string): readonly Oportunidade[] {
  const minhas = new Set(campanha.provinciasDe(idPoder));
  const meusPontos = new Set(minhas);
  for (const hoste of campanha.hostes()) {
    if (hoste.poder === idPoder) meusPontos.add(hoste.posicao);
  }

  const alcancadas = new Set<string>();
  for (const ponto of [...meusPontos].sort()) {
    for (const vizinha of campanha.vizinhasDe(ponto)) {
      if (!minhas.has(vizinha)) alcancadas.add(vizinha);
    }
  }

  const ausentes = new Map(campanha.bensAusentes(idPoder).map((b) => [b.id, b.troca]));
  const oportunidades: Oportunidade[] = [];
  for (const provincia of [...alcancadas].sort()) {
    const dono = campanha.donoDe(provincia);
    // ⚠️ Poder sem economia fica de fora — ver o cabeçalho. Não é a IA sendo tímida: é o
    // mapa não estar desenhado o suficiente para aquela conquista significar alguma coisa.
    if (dono === idPoder || campanha.semEconomia(dono) > 0) continue;

    const milicia = campanha.miliciaEm(provincia);
    const defensores = campanha.forcaEm(provincia, dono);
    oportunidades.push({
      provincia,
      dono,
      renda: campanha.economiaDe(provincia)?.total ?? 0,
      bemNovo: bensInediosEm(campanha, provincia, ausentes),
      capital: campanha.capitalDe(dono) === provincia,
      defensores,
      milicia,
      vazia: milicia <= 0 && defensores <= 0,
    });
  }
  return oportunidades;
}

/**
 * O que esta terra acrescentaria à rede — **só o que ainda não circula.**
 *
 * ⚠️ **É o bem DISTINTO que paga, e é isso que faz a conquista não ser uma soma.** A segunda
 * província de azeite não rende azeite de novo; a única de mármore ao alcance rende mármore
 * pela primeira vez. Sem esta pergunta a IA trataria toda terra como a mesma terra — e um
 * mercador que não persegue o bem que lhe falta não é um mercador.
 */
function bensInediosEm(
  campanha: Campanha,
  provincia: string,
  ausentes: ReadonlyMap<string, number>,
): number {
  const principal = campanha.economiaDe(provincia)?.produto.id;
  const secundario = campanha.perfilDe(provincia)?.secundario.id;
  let ganho = 0;
  for (const bem of new Set([principal, secundario])) {
    if (bem !== undefined) ganho += ausentes.get(bem) ?? 0;
  }
  return ganho;
}
