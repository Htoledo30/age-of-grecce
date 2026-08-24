/**
 * A milícia: quem defende a província sem ter sido recrutado.
 *
 * ⚠️ **Derivada da população, calculada na hora e NUNCA guardada.** Um campo `guarnicao`
 * no estado seria um segundo manancial humano escondido. O manancial é um só: a
 * população.
 *
 * Três propriedades nascem dessa escolha, sem nenhuma regra escrita para elas:
 *
 * 1. **Perder uma batalha em casa custa imposto e custa leva futura**, porque miliciano
 *    morto sai da mesma população que paga tributo e que fornece recruta.
 * 2. **Mobilizar esvazia a muralha.** Recrutar 2.000 em Atenas derruba a população e a
 *    milícia junto: o exército que se levanta sai de quem defenderia.
 * 3. **Ela é o que torna o CERCO possível.** Sem defensor, província alheia cai no
 *    instante em que alguém pisa nela e não existe estado intermediário. Com milícia, a
 *    cidade resiste enquanto o invasor fica com o campo — e isso é o cerco.
 *
 * ⚠️ **Ela é fraca de propósito.** 120 dos 148 poderes começam com uma província só, e
 * uma milícia forte tornaria a primeira conquista impossível para 81% do mapa. Ela existe
 * para não ser ignorada, não para segurar invasão de verdade.
 */

import type { Ajustes, Construcoes } from '@/dados/esquema';

type AjustesCombate = Ajustes['jogo']['combate'];
type Catalogo = Construcoes['construcoes'];

/**
 * Multiplicador das obras que fortalecem a defesa local.
 *
 * A construção multiplica a derivação, e não acrescenta uma guarnição escondida.
 */
function fatorDaMilicia(
  construcoes: Readonly<Record<string, number>>,
  catalogo: Catalogo,
): number {
  let fator = 1;
  for (const [id, nivel] of Object.entries(construcoes)) {
    const construcao = catalogo[id];
    if (!construcao) throw new Error(`construção inexistente na província: ${id}`);
    if (construcao.efeito.tipo === 'milicia') {
      fator *= construcao.efeito.fatores[Math.max(0, Math.min(2, nivel - 1))] ?? 1;
    }
  }
  return fator;
}

/**
 * Quantos milicianos esta província põe em pé para se defender.
 *
 * Zero onde não há população — mesma resposta honesta que a economia já dá para província
 * sem ficha, em vez de inventar um número.
 */
export function miliciaDe(
  populacao: number,
  construcoes: Readonly<Record<string, number>>,
  catalogo: Catalogo,
  ajustes: AjustesCombate,
): number {
  if (populacao <= 0) return 0;
  return Math.floor(populacao * ajustes.milicia.fracao * fatorDaMilicia(construcoes, catalogo));
}

/**
 * Quantos milicianos morrem quando a defesa é derrotada.
 *
 * ⚠️ **Milícia derrotada DISPERSA; só os mortos saem da população.** Aniquilar a milícia
 * inteira mataria de uma vez a fatia da cidade que pega em armas, e uma província que
 * perde uma batalha ficaria arruinada para o resto da campanha. Quem não morre volta pra
 * casa — são os mesmos lavradores.
 */
export function mortosDaMilicia(milicianos: number, ajustes: AjustesCombate): number {
  return Math.floor(milicianos * ajustes.milicia.fracaoMorta);
}
