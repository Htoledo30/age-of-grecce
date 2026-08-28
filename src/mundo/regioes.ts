/**
 * O NOME de cada região, para a tela — porque o que está no atlas é o **id**.
 *
 * `dados/provincias.json` guarda `"regiao": "atica"`, e isso é correto: id é minúsculo, sem
 * acento e sem espaço, para ser estável e comparável. O erro era mostrá-lo cru — o painel da
 * província escrevia "ATENAS · ATICA", e num jogo que se passa na Grécia a falta do acento
 * é a diferença entre um nome e um identificador de banco de dados.
 *
 * ⚠️ **Tradução de EXIBIÇÃO, e nada mais.** Nenhuma regra procura região por nome; quem não
 * estiver nesta tabela cai no id com a primeira letra maiúscula, que é feio mas nunca some
 * da tela — e uma região nova aparece no jogo no mesmo dia em que é gerada, mesmo que
 * ninguém tenha vindo aqui batizá-la.
 */

const NOMES: Readonly<Record<string, string>> = {
  acaia: 'Acaia',
  acarnania: 'Acarnânia',
  'alta-macedonia': 'Alta Macedônia',
  arcadia: 'Arcádia',
  argolida: 'Argólida',
  atica: 'Ática',
  beocia: 'Beócia',
  bitinia: 'Bitínia',
  calcidica: 'Calcídica',
  caria: 'Cária',
  chipre: 'Chipre',
  cicladas: 'Cíclades',
  corintia: 'Coríntia',
  creta: 'Creta',
  dodecaneso: 'Dodecaneso',
  doride: 'Dóride',
  'egeu-leste': 'Egeu Oriental',
  'egeu-norte': 'Egeu Setentrional',
  elida: 'Élida',
  eolida: 'Eólida',
  epiro: 'Epiro',
  esporades: 'Espórades',
  etolia: 'Etólia',
  eubeia: 'Eubeia',
  focida: 'Fócida',
  frigia: 'Frígia',
  iliria: 'Ilíria',
  ionio: 'Jônio',
  jonia: 'Jônia',
  laconia: 'Lacônia',
  lesbos: 'Lesbos',
  licaonia: 'Licaônia',
  licia: 'Lícia',
  lidia: 'Lídia',
  locrida: 'Lócrida',
  macedonia: 'Macedônia',
  magnesia: 'Magnésia',
  malide: 'Málide',
  megarida: 'Megárida',
  messenia: 'Messênia',
  misia: 'Mísia',
  panfilia: 'Panfília',
  peonia: 'Peônia',
  perrebia: 'Perrébia',
  pisatide: 'Pisátide',
  pisidia: 'Pisídia',
  rodes: 'Rodes',
  saronico: 'Sarônico',
  sicionia: 'Siciônia',
  tessalia: 'Tessália',
  tracia: 'Trácia',
  trifilia: 'Trifília',
  troade: 'Tróade',
};

/** O nome de exibição da região. Cai no id capitalizado quando ela ainda não foi batizada. */
export function nomeDaRegiao(id: string): string {
  const nome = NOMES[id];
  if (nome !== undefined) return nome;
  return id
    .split('-')
    .map((parte) => (parte ? parte[0]?.toUpperCase() + parte.slice(1) : parte))
    .join(' ');
}
