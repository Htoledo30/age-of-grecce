import type { Investimento } from './economia';
import type { Cerco } from '@/combate/cerco';
import type { Exercito } from '@/combate/exercito';
import type { LevaEmFormacao } from '@/combate/formacao-de-leva';
import type { OrdemDeMarcha } from '@/movimento/ordens';

/**
 * O estado mínimo de uma campanha — e nada além do mínimo.
 *
 * Quem eu sou, que ano é, que turno é, quanto tenho, **de quem é cada província**, e o
 * que está em curso nelas.
 *
 * A regra que vale desde já, mesmo sem salvamento existir: **este objeto é, e vai
 * continuar sendo, exatamente o que um dia vai pro disco.** O que não estiver nele é
 * efêmero por definição. Manter essa disciplina agora é o que faz salvar/carregar ser
 * barato depois em vez de virar uma caça a estado escondido.
 */
export interface EstadoCampanha {
  /**
   * Quem o jogador escolheu, ou `null` enquanto ele ainda está olhando o mapa.
   *
   * É este campo que distingue "abertura" de "partida em curso". Existe uma tela de menu
   * separada na interface, mas a campanha já existe por baixo dela desde que o jogo abre,
   * ainda sem jogador. Assim menu e mapa não mantêm duas cópias do estado da partida.
   */
  jogador: string | null;
  /** Negativo é a.C.: 700 a.C. é -700. Não existe ano 0. */
  ano: number;
  /** 0 na abertura; vira 1 quando o jogador escolhe um poder. */
  turno: number;
  /** Tesouro do jogador. Vira uma tabela por poder quando a IA entrar. */
  /**
   * Moedas de cada poder, por id. **Todos os 148, não só o jogador.**
   *
   * ⚠️ Era um número só, e isso teria dado à IA um exército de graça: sem cofre próprio,
   * ela recrutaria e manteria tropa sem nada sair de lugar nenhum. Ver `DECISOES.md` #63
   * e #97 — a IA joga pelas mesmas regras, e a primeira dessas regras é que dinheiro
   * acaba.
   *
   * Poder sem entrada aqui vale zero, não `undefined`: quem pergunta o tesouro de um
   * poder qualquer tem que receber um número.
   */
  tesouros: Record<string, number>;
  /**
   * Dono ATUAL de cada província, por id. **Sempre completo: as 205 entradas.**
   *
   * O `dono` do arquivo assado passa a significar dono INICIAL — a condição de 700 a.C. —
   * e esta tabela é a verdade corrente. Quem pergunta "de quem é isto?" pergunta aqui.
   *
   * ⚠️ **Tabela cheia, e não um diff contra o assado.** O diff é menor e é armadilha: se
   * o `provincias.json` for reassado com uma fronteira movida, o diff mistura dois
   * recortes em silêncio e a partida continua rodando errada. A tabela cheia, conferida
   * contra o atlas na carga, falha alto.
   */
  dono: Record<string, string>;
  /**
   * Habitantes de cada província AGORA, por id. Só as que têm economia configurada.
   *
   * ⚠️ **População é estado, não dado fixo.** O `dados/economia.json` guarda a população
   * INICIAL, de 700 a.C.; esta tabela é a de agora, e ela encolhe quando o poder põe
   * gente em armas — quem marcha deixa de ser tributado e deixa de lavrar. Ao fim de
   * cada turno ela cresce até a capacidade definida pela população inicial. É o que faz
   * mobilizar ter preço contínuo sem condenar uma província a encolher para sempre.
   */
  populacao: Record<string, number>;
  /**
   * De que povo é a população de cada província, em frações que somam 1.
   *
   * ⚠️ **Estado, e não dado fixo** — pela mesma razão que a população é. Nacionalidade
   * muda devagar (`DECISOES.md` #71): gente de fora se instala, uma geração nasce sob
   * outra bandeira. Nada disso acontece ainda; o campo está aqui porque o dia em que
   * acontecer não pode exigir mover o dado de lugar no meio de um salvamento.
   *
   * Só as províncias com ficha autoral. Quem não tem não é simulada.
   */
  nacionalidades: Record<string, Record<string, number>>;
  /**
   * O humor de cada província, de 0 a 100.
   *
   * ⚠️ **Ainda não faz nada** — o patch 0.0.7 do `ROADMAP.md` é que liga imposto, fome,
   * conquista e nacionalidade a este número. Existe agora porque a região de teste
   * precisa começar completa, e porque um valor inicial escrito à mão é o único jeito de
   * o patch 0.0.7 ter de onde partir.
   */
  felicidade: Record<string, number>;
  /**
   * O que cada província tem guardado, por produto.
   *
   * ⚠️ **Provincial, nunca do poder** (`DECISOES.md` #49). O império não tem um celeiro
   * central: cada terra guarda o que colheu, e é por isso que conquistar uma província
   * captura o que estava nela — e que sitiar dói.
   *
   * Ninguém consome nem produz ainda: o patch 0.0.3 enche isto por turno e o 0.0.4 esvazia.
   */
  estoques: Record<string, Record<string, number>>;
  /**
   * Exércitos em pé, pela província onde estão.
   *
   * Um por província: é o modelo que o mapa pede — tropa salta de vizinha em vizinha, sem
   * peça com pontos de movimento.
   *
   * ⚠️ **A chave é o ID DA HOSTE, não a província.** Já foi a província, e isso impedia
   * estruturalmente duas hostes no mesmo lugar. Fundir as do mesmo poder que se encontram
   * continua acontecendo — mas agora por POLÍTICA, em `pousar`, e não porque a estrutura
   * obrigava.
   */
  hostes: Record<string, Exercito>;
  /**
   * Próximo número livre de hoste. É o que dá identidade sem sorteio.
   *
   * Vive no estado e não numa variável de módulo porque vai pro disco junto: retomar um
   * salvamento tem que continuar a contagem de onde parou, senão a próxima leva nasceria
   * com o id de uma hoste que ainda existe.
   */
  proximaHoste: number;
  /**
   * Levas pagas que ainda estão em formação, pela província onde aparecerão.
   *
   * Ficam fora de `hostes` de propósito: já existem no mundo e aparecem no mapa, mas
   * não podem marchar, lutar nem engrossar uma hoste veterana antes do turno indicado.
   */
  formacoes: Record<string, LevaEmFormacao>;
  /**
   * Ordens de marcha registradas nesta RODADA, pelo id da hoste que as recebeu.
   *
   * Uma por hoste. Mover não muda o mapa no clique: a ordem fica aqui, revisável e
   * cancelável, e só acontece quando o turno vira — junto com as de todo mundo.
   *
   * ⚠️ **Esvaziado no fim da resolução.** Se uma ordem sobrevivesse à virada, executaria
   * de novo, e o sintoma seria tropa andando sozinha.
   */
  ordens: Record<string, OrdemDeMarcha>;
  /**
   * Hostes que vão SURTIR nesta rodada, por id.
   *
   * Surtir é o sitiado sair para atacar quem o cerca. É a única coisa que obriga o
   * sitiante a lutar: ele declarou que não quer choque (`DECISOES.md` #32A), e sem uma
   * decisão do defensor os dois ficam acampados lado a lado até o fim dos tempos.
   *
   * ⚠️ **Vive ao lado das ordens e some junto com elas na virada**, pelo mesmo motivo: é
   * decisão da rodada. E é excludente com a ordem de marcha — quem sai para lutar em casa
   * não marcha no mesmo turno.
   */
  surtidas: string[];
  /**
   * A capital de cada poder, por id de poder.
   *
   * ⚠️ **Só o estado, por enquanto.** A capital ainda não faz nada: o fluxo de perdê-la e
   * escolher outra é o patch 0.0.9 do `ROADMAP.md`. O campo existe agora porque vários
   * sistemas futuros vão perguntar qual é — ineficiência administrativa, prioridade
   * alimentar em escassez, revolta, comércio interno — e cada um inventar a própria
   * resposta seria a mesma verdade em quatro lugares.
   *
   * Ver `capitais.ts` para a regra de derivação inicial.
   */
  capitais: Record<string, string>;
  /**
   * Cercos em curso, por província sitiada.
   *
   * Ao contrário das ordens, isto sobrevive à virada enquanto o sitiante permanecer ali.
   * Sitiar não acumula progresso nem toma a cidade: bloqueia produção e comércio até o
   * exército sair, morrer ou escolher assaltar.
   */
  cercos: Record<string, Cerco>;
  /**
   * Incentivos de exploração em curso, por id de província.
   *
   * Produto, nível e comércio-base são autorais e ficam nos dados — investir compra
   * trabalho temporário, não muda o que a terra tem. Uma província some daqui quando o
   * incentivo dela acaba. (População já foi autoral também, e deixou de ser: ela é
   * estado desde que recrutar passou a custá-la.)
   */
  investimentos: Record<string, Investimento>;
  /**
   * Construções erguidas, por id de província.
   *
   * Ao contrário do incentivo, isto **nunca sai** daqui: construção é permanente, e é
   * por isso que ela consegue absorver dinheiro que o incentivo não absorve.
   */
  construcoes: Record<string, string[]>;
  /**
   * Obras em andamento, por id de província. Uma por vez em cada uma.
   *
   * O dinheiro já saiu quando a obra entra aqui: paga-se no início e recebe-se no fim.
   * É isso que faz o custo ser sentido, em vez de o número subir no mesmo instante do
   * clique.
   */
  obras: Record<string, Obra>;
}

/** Uma construção em andamento. */
export interface Obra {
  construcao: string;
  turnosRestantes: number;
}

/**
 * Escreve o ano como se lê em voz alta.
 *
 * `-700` → `700 a.C.`, `-1` → `1 a.C.`, `1` → `1 d.C.`
 */
export function formatarAno(ano: number): string {
  return ano < 0 ? `${-ano} a.C.` : `${ano} d.C.`;
}

/**
 * Avança o calendário pulando o ano zero.
 *
 * Não existe ano 0: depois de 1 a.C. vem 1 d.C. Com um turno por ano e começando em 700
 * a.C. ninguém chega lá tão cedo, mas isso custa três linhas e é exatamente o tipo de
 * coisa que quem descobre é o jogador, não o programador.
 */
export function avancarAno(ano: number, anos: number): number {
  const bruto = ano + anos;
  if (ano < 0 && bruto >= 0) return bruto + 1;
  return bruto;
}
