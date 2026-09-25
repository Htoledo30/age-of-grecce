/**
 * A província como o painel precisa vê-la — **um objeto só, montado inteiro.**
 *
 * Já foram seis parâmetros posicionais em `mostrar(...)`, e o sexto era um `Record` de
 * níveis de construção que ninguém adivinhava sem abrir o arquivo. Um objeto nomeado é o
 * que deixa o painel crescer sem que a chamada vire um enigma.
 *
 * ⚠️ **Dados, nunca frases.** Quem escreve "35.000 habitantes · Terra grande" é a tela; a
 * vista entrega o número e o nome da faixa. É essa divisão que permite mudar o texto do
 * painel sem tocar na aplicação — e que impede a aplicação de decidir tipografia.
 */

import type { CrescimentoPopulacional } from '@/populacao/crescimento';

/** Um produto da terra e o grau dela nele. */
interface ProdutoDaTerra {
  nome: string;
  nivel: number;
}

/** Uma construção já de pé, com o nível a que chegou. */
interface ConstrucaoErguida {
  nome: string;
  nivel: number;
}

/** O dinheiro da província, decomposto como a barra de saldo precisa explicar. */
interface EconomiaDaProvincia {
  populacao: number;
  crescimento: (CrescimentoPopulacional & { limitadoPelaAlimentacao: boolean }) | null;
  /** Impostos + produção + trânsito − construções − tropas. É o número da medida. */
  saldo: number;
  impostos: number;
  /**
   * Fração que a corrupção comeu das TRÊS parcelas, de 0 a 1.
   *
   * ⚠️ **Das três, e não só do imposto** — `economia.ts` a aplica a impostos, produção e
   * trânsito antes de eles chegarem aqui, porque corrupção é o que se perde entre a província
   * e o tesouro e não pergunta de onde veio a moeda. Os números acima já são o que sobrou.
   */
  corrupcao: number;
  producao: number;
  transito: number;
  manutencao: number;
  /** O que as tropas levantadas AQUI custam por turno. */
  tropa: number;
  /** O imposto é zero por revolta, e não por conta. */
  revoltosa: boolean;
  /**
   * O quanto o HUMOR multiplica as três parcelas. 1 é o normal.
   *
   * Na tela porque é a consequência que o humor não tinha: sem esta linha, o jogador vê o
   * número da felicidade mexer e não descobre onde ele vira dinheiro.
   */
  fatorDoHumor: number;
  /** O trânsito é zero porque a rota até a capital foi cortada. */
  cortada: boolean;
  produto: ProdutoDaTerra;
  secundario: ProdutoDaTerra | null;
  construcoes: readonly ConstrucaoErguida[];
}

export interface VistaDaProvincia {
  nome: string;
  regiao: string;
  /**
   * É ZONA MARÍTIMA — água, e não terra.
   *
   * ⚠️ **Ela não tem dono, povo, economia nem milícia**, e por isso quase todo o resto desta
   * vista vem vazio. O painel a trata como o que ela é: um lugar com nome por onde se passa,
   * onde se luta e que não se conquista.
   */
  mar: boolean;
  poder: { id: string; nome: string; povo: string; cor: string };
  /** É terra do jogador? Decide se o painel oferece comando ou só leitura. */
  minha: boolean;
  /** É a sede do reino a que pertence — do jogador ou de quem for. */
  capital: boolean;
  /** O povo que mora aqui, já composto: "Eleusina 85% · Ateniense 15%". */
  povos: string;
  /**
   * Que fatia deste povo não se reconhece no dono, e quão estranha ela o acha.
   *
   * Fica na ficha porque virou consequência: desde que a nacionalidade entrou no humor, "quem
   * mora aqui" deixou de ser cor local e passou a ser a conta que o jogador paga. `null` onde
   * não há povo simulado.
   */
  estranheza: { mesmoPovo: number; outroPovo: number } | null;
  /**
   * O nome da faixa de população: a RÉGUA do número de habitantes.
   *
   * "35.000 habitantes" sozinho não diz nada — grande comparado com quê? A faixa responde,
   * e é a mesma que decide quanto a terra come da mesa do reino.
   */
  faixa: string;
  /**
   * Quantos milicianos a província põe em pé se alguém vier.
   *
   * Fica na tela porque decide: é o número que diz se o vizinho consegue tomar isto, e é
   * o que a Muralha compra.
   */
  milicia: number;
  /**
   * A conta do humor, e **em que degrau da régua ele está** — `posicao` vai de 0 (revoltosa)
   * a 1 (muito feliz).
   *
   * ⚠️ A posição vem pronta porque a COR da medida sai dela, e a tela não pode cravar
   * "abaixo de 40 é vermelho": esses limites vivem em `ajustes.json` e mudam. `null` onde
   * não há simulação.
   */
  humor: {
    valor: number;
    faixa: string;
    posicao: number;
    alvo: number;
    parcelas: readonly { rotulo: string; pontos: number }[];
  } | null;
  /**
   * Quem está sitiando esta província, e em que pé a despensa dela está.
   *
   * Fica no painel porque é a metade da mecânica que acontece COM o jogador: a renda dele
   * cai, o relógio da fome corre, e ele precisa saber por quê e até quando.
   */
  cerco: {
    sitiante: string;
    mantimentosRestantes: number;
    fomeAtiva: boolean;
  } | null;
  /**
   * Quem tem frota na água que banha este cais. `null` quando ninguém tem.
   *
   * ⚠️ **Um Porto que para de funcionar sem dizer por quê lê-se como defeito do jogo.** É a
   * mesma razão pela qual a ficha distingue "em revolta" de "rota cortada": o zero precisa de
   * uma frase. Ver `campanha/guerra/bloqueio.ts`.
   */
  bloqueio: { por: string } | null;
  /** A obra em andamento, se houver. */
  obra: { nome: string; turnosRestantes: number } | null;
  /** `null` nas províncias que ainda não têm economia autoral. */
  economia: EconomiaDaProvincia | null;
}
