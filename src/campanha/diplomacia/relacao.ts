/**
 * A RELAÇÃO entre dois poderes, de −100 a +100 — **e ela é o humor do povo, outra vez.**
 *
 * ⚠️ **A mecânica é deliberadamente a MESMA da felicidade, e isso é o desenho, não preguiça.**
 * O jogador já aprendeu uma vez que existe um VALOR caminhando em direção a um ALVO, e que o
 * alvo é uma soma de parcelas com nome que ele pode abrir e ler: `−12 domínio estrangeiro`,
 * `+12 guarnição`, `−15 sitiada`. Pedir que ele aprenda uma segunda máquina para dizer a mesma
 * coisa sobre reinos seria inventar vocabulário novo para uma ideia que ele já tem.
 *
 * Três consequências caem de graça dessa escolha:
 *
 * 1. **Nada salta.** Opinião anda alguns pontos por turno; ninguém vira aliado de um dia para
 *    o outro nem odeia você porque uma fronteira mudou de lugar.
 * 2. **O passado se apaga sozinho.** O valor caminha PARA o alvo — então o efeito de uma
 *    conquista antiga vai sumindo enquanto os fatos não a renovam. Não existe rancor eterno
 *    guardado numa tabela; existe uma situação atual e a distância até ela.
 * 3. **O choque cabe.** Assim como a conquista derruba o humor no dia em que a cidade cai, um
 *    ato diplomático empurra a opinião na hora — presente para cima, tomar a terra dele para
 *    baixo — e a partir dali ela recomeça a caminhar. É por aqui que TODA ação diplomática
 *    futura entra, sem regra nova nenhuma.
 *
 * ## O que o alvo NÃO tem
 *
 * ⚠️ **Nenhuma parcela existe que o jogador não consiga ver no mapa.** Fronteira comum, guerra
 * em curso, trégua, e a terra dele que está na sua mão — as quatro são visíveis, e é por isso
 * que a opinião nunca vai parecer arbitrária. Pacto, comércio e tributo entraram depois, cada
 * um como mais uma linha nesta mesma lista, sem mecânica nova nenhuma — e a aliança entrará
 * pela mesma porta.
 *
 * ⚠️ **E ela só existe entre os poderes COM FICHA**, decisão de Henrique. Opinião de um poder
 * que não arrecada, não recruta e não decide nada é um número que não vira decisão nenhuma —
 * seriam 9.591 pares em que nada acontece.
 */

import type { Ajustes } from '@/dados/esquema';

type AjustesDiplomacia = Ajustes['jogo']['diplomacia'];

/** O que decide a opinião de um poder sobre outro. Tudo visível no mapa. */
export interface SituacaoDaRelacao {
  emGuerra: boolean;
  /** Turnos de trégua ainda em pé. Guerra recente ainda dói. */
  tregoa: number;
  /** Províncias DELE que encostam nas minhas. Vizinho é atrito. */
  fronteira: number;
  /**
   * Terras que eu tenho e que eram DELE em 700 a.C.
   *
   * ⚠️ É a memória da conquista sem guardar memória nenhuma: enquanto a bandeira estiver na
   * minha mão, ele lembra. Devolver a terra apaga a mágoa sozinho, e é assim que uma paz com
   * cessão de província vai poder existir sem regra nova.
   */
  terrasTomadas: number;
  /** Há pacto de não-agressão em pé? Fronteira garantida é um fato como qualquer outro. */
  temPacto: boolean;
  /**
   * Há ALIANÇA em pé?
   *
   * ⚠️ Vale mais que o pacto na conta, e tem de valer: quem entra nas suas guerras sem
   * perguntar não é apenas alguém que prometeu não te atacar. Ver `alianca.ts`.
   */
  temAlianca: boolean;
  /** Há acordo de comércio? Dinheiro entrando dos dois lados é um fato como qualquer outro. */
  temAcordo: boolean;
  /**
   * Há tributo correndo entre os dois?
   *
   * ⚠️ **É um fato do PAR, e não de um lado só** — como tudo nesta conta, que é um número por
   * par e não um por lado. Ouro atravessando a fronteira todo turno acalma a relação: enquanto
   * ele corre, um dos dois já decidiu que não marcha, e o outro já decidiu que aceita ser pago.
   * Que a humilhação seja de quem paga e o lucro de quem recebe é uma assimetria que este jogo
   * ainda não usa em decisão nenhuma — no dia em que usar, a chave do par já é a mesma.
   */
  temTributo: boolean;
  /**
   * A pior reputação do par, de −100 a 0.
   *
   * ⚠️ **A PIOR das duas**, e não a soma nem a média: o que envenena uma relação é haver um
   * quebrador de promessas nela. Se você traiu alguém, todo mundo passa a olhar torto para
   * você — e é exatamente isso que faz o pacto valer o papel em que está escrito.
   */
  reputacao: number;
  /**
   * Os dois são da MESMA TRIBO grega — dois jônios, dois dórios?
   *
   * ⚠️ **É a única parcela positiva que a geografia produz sozinha**, e ela existe por causa de
   * um número medido: antes dela, **250 dos 306 pares de poderes ficavam em zero para sempre**.
   * A conta só sabia produzir aproximação por assinatura — comércio, pacto, tributo —, e
   * assinatura ninguém oferece a quem não conhece. Sem uma razão para gostar de alguém do outro
   * lado do mar, 82% da mesa era indiferença permanente.
   *
   * A tribo é a razão certa porque já está escrita nas fichas e porque é o que a Grécia de 700
   * a.C. realmente tinha no lugar de nação: o dório de Corinto reconhece o dório de Argos, e o
   * jônio de Atenas reconhece o jônio de Eretria através do Egeu inteiro.
   */
  mesmoPovo: boolean;
  /**
   * Com quantos reinos os DOIS estão em guerra ao mesmo tempo.
   *
   * ⚠️ **O inimigo do meu inimigo, e ele não existia.** É o motor mais básico do gênero e não
   * havia uma linha dele: dois reinos podiam sangrar contra o mesmo agressor por cinquenta
   * turnos e continuar indiferentes um ao outro. Ao contrário da tribo, esta parcela é VIVA —
   * ela aparece quando a guerra começa e some quando ela acaba, o que faz a aliança de
   * conveniência ser exatamente isso.
   */
  inimigosComuns: number;
  /**
   * Há quantos turnos estes dois não se enfrentam.
   *
   * ⚠️ **Existe porque a fronteira era veneno permanente.** Vizinhança dá `−5` por província e
   * nada cicatrizava: dois vizinhos que nunca se bateram continuavam em `−20` no turno
   * trezentos, e a IA não abre comércio com opinião negativa — o vizinho, que é o parceiro
   * natural, era estruturalmente o pior parceiro possível.
   *
   * Quem nunca guerreou conta desde o começo da campanha: nunca ter lutado É a paz mais longa
   * que existe. Quem guerreou conta do fim da trégua, e é assim que a ferida sara sozinha sem
   * apagar a memória da terra tomada, que essa só se apaga devolvendo.
   */
  turnosDePaz: number;
}

/**
 * De quantos turnos é uma década.
 *
 * O jogo anda um ano por turno (`anosPorTurno`), então a década é a unidade em que uma paz se
 * conta na boca de quem a viveu — e é ela que aparece no rótulo da parcela.
 */
const TURNOS_DA_DECADA = 10;

/** Uma parcela do alvo, com nome — a mesma legibilidade da conta da felicidade. */
export interface ParcelaDaRelacao {
  rotulo: string;
  pontos: number;
}

/**
 * A conta do alvo, parcela a parcela.
 *
 * Só entram as que valem alguma coisa: listar "fronteira 0" entre dois reinos que não se
 * tocam seria ruído. A base entra sempre, porque é dela que as outras somam e subtraem — e ela
 * é ZERO de propósito: dois reinos que nunca se esbarraram não se amam nem se odeiam.
 */
export function parcelasDaRelacao(
  situacao: SituacaoDaRelacao,
  ajustes: AjustesDiplomacia,
): readonly ParcelaDaRelacao[] {
  const alvo = ajustes.alvo;
  const parcelas: ParcelaDaRelacao[] = [{ rotulo: 'indiferença', pontos: alvo.base }];

  if (situacao.emGuerra) parcelas.push({ rotulo: 'em guerra', pontos: alvo.guerra });
  else if (situacao.tregoa > 0) {
    parcelas.push({ rotulo: 'guerra recente', pontos: alvo.tregoa });
  }

  if (situacao.fronteira > 0) {
    // Com teto: o vigésimo quilômetro de divisa não incomoda mais que o primeiro, e sem o
    // teto um império grande odiaria automaticamente todo vizinho grande.
    const pontos = Math.max(
      alvo.fronteiraMaxima,
      situacao.fronteira * alvo.porProvinciaDeFronteira,
    );
    parcelas.push({ rotulo: `fronteira comum (${situacao.fronteira})`, pontos });
  }

  // ⚠️ Uma OU a outra, nunca as duas: a aliança já contém a não-agressão, e somar as duas
  // pagaria duas vezes pela mesma promessa.
  if (situacao.temAlianca) {
    parcelas.push({ rotulo: 'aliança', pontos: ajustes.alianca.pontos });
  } else if (situacao.temPacto) {
    parcelas.push({ rotulo: 'pacto de não-agressão', pontos: ajustes.pacto.pontos });
  }

  if (situacao.temAcordo) {
    parcelas.push({ rotulo: 'acordo de comércio', pontos: alvo.acordoDeComercio });
  }

  if (situacao.temTributo) {
    parcelas.push({ rotulo: 'tributo em curso', pontos: ajustes.tributo.pontos });
  }

  if (situacao.reputacao < 0) {
    parcelas.push({ rotulo: 'promessa quebrada', pontos: situacao.reputacao });
  }

  if (situacao.mesmoPovo) {
    parcelas.push({ rotulo: 'mesma gente', pontos: alvo.mesmoPovo });
  }

  if (situacao.inimigosComuns > 0) {
    // Com teto, como a fronteira: o quinto inimigo em comum não aproxima mais que o primeiro.
    const pontos = Math.min(
      alvo.inimigoComumMaximo,
      situacao.inimigosComuns * alvo.porInimigoComum,
    );
    parcelas.push({ rotulo: `inimigo em comum (${situacao.inimigosComuns})`, pontos });
  }

  // ⚠️ Em guerra não há paz que conte: a parcela sumiria no turno seguinte de qualquer jeito,
  // e mostrá-la ao lado de "em guerra −60" seria a conta se contradizendo na cara do jogador.
  if (!situacao.emGuerra) {
    const decadas = Math.floor(situacao.turnosDePaz / TURNOS_DA_DECADA);
    const pontos = Math.min(alvo.pazMaxima, decadas * alvo.porDecadaDePaz);
    if (pontos > 0) parcelas.push({ rotulo: `paz de ${decadas} décadas`, pontos });
  }

  if (situacao.terrasTomadas > 0) {
    const pontos = Math.max(
      alvo.terraTomadaMaxima,
      situacao.terrasTomadas * alvo.porTerraTomada,
    );
    parcelas.push({ rotulo: `terra dele na sua mão (${situacao.terrasTomadas})`, pontos });
  }

  return parcelas;
}

/** Para onde a opinião caminha, de −100 a 100: a soma das parcelas, contida. */
export function alvoDaRelacao(
  situacao: SituacaoDaRelacao,
  ajustes: AjustesDiplomacia,
): number {
  const soma = parcelasDaRelacao(situacao, ajustes).reduce((t, p) => t + p.pontos, 0);
  return conter(soma);
}

/** Um passo da opinião em direção ao alvo. Gradual por regra: nunca passa do alvo. */
export function aproximarRelacao(atual: number, alvo: number, passo: number): number {
  if (atual < alvo) return Math.min(alvo, atual + passo);
  if (atual > alvo) return Math.max(alvo, atual - passo);
  return atual;
}

/**
 * O que um presente em ouro VALE para quem o recebe, em pontos de opinião.
 *
 * ⚠️ **Medido no bolso DELE, e não numa tabela fixa.** Quinhentas moedas para Plateia, que
 * arrecada 118 por turno, são quatro turnos de renda — uma fortuna. As mesmas quinhentas para
 * Argos, que arrecada dois mil, são troco, e troco é quase ofensa. Um número fixo trataria as
 * duas coisas como a mesma, e faria o reino rico comprar o mapa com o dinheiro do lanche.
 *
 * ⚠️ **E satura.** A curva é a mesma da perseguição da cavalaria: os primeiros turnos de renda
 * compram quase todo o efeito e o resto rende pouco. Sem isso, dobrar o presente dobraria a
 * amizade, e o cofre gordo viraria um botão de comprar o mundo.
 */
export function pontosDoPresente(
  ouro: number,
  rendaDoRecebedor: number,
  ajustes: AjustesDiplomacia,
): number {
  if (ouro <= 0) return 0;
  // Reino sem renda mede o presente contra uma moeda: para quem não tem nada, tudo é muito.
  const turnosDeRenda = ouro / Math.max(1, rendaDoRecebedor);
  const meia = ajustes.presente.meiaRenda;
  return Math.round(
    ajustes.presente.pontosMaximos * (turnosDeRenda / (turnosDeRenda + meia)),
  );
}

/**
 * O presente aplicado: empurra a opinião, **mas só até certa altura acima do alvo.**
 *
 * ⚠️ **É o freio que impede o ouro de comprar amizade.** Sem teto, dez presentes seguidos
 * levariam qualquer inimigo a +100 e a diplomacia viraria uma loja. Com ele, o ouro cobre a
 * distância até um ponto e para: **presente compra TEMPO, não amizade.** Quem quer o número
 * lá em cima muda os FATOS — assina pacto, abre comércio, devolve a terra tomada.
 */
export function comPresente(
  atual: number,
  alvo: number,
  pontos: number,
  ajustes: AjustesDiplomacia,
): number {
  const teto = alvo + ajustes.presente.tetoAcimaDoAlvo;
  return conter(Math.min(Math.max(atual, atual + pontos), Math.max(atual, teto)));
}

/**
 * O choque de um ato: a opinião salta AGORA e volta a caminhar a partir dali.
 *
 * ⚠️ É por esta porta que toda ação diplomática entra — presente, traição de pacto, aliança
 * honrada, terra devolvida. A regra é uma só, e nova ação nenhuma precisa de mecânica nova:
 * ela empurra o número e deixa o tempo fazer o resto.
 */
export function comChoque(atual: number, pontos: number): number {
  return conter(atual + pontos);
}

function conter(valor: number): number {
  return Math.max(-100, Math.min(100, Math.round(valor)));
}
