import type { NivelDeImposto } from './economia';
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
  /** Compatibilidade de saves antigos que guardavam somente o tesouro do jogador. */
  /**
   * Moedas de cada poder, por id. **Todos os 139, não só o jogador.**
   *
   * ⚠️ Era um número só, e isso teria dado à IA um exército de graça: sem cofre próprio,
   * ela recrutaria e manteria tropa sem nada sair de lugar nenhum. A IA joga pelas mesmas
   * regras, e a primeira dessas regras é que dinheiro acaba.
   *
   * Poder sem entrada aqui vale zero, não `undefined`: quem pergunta o tesouro de um
   * poder qualquer tem que receber um número.
   */
  tesouros: Record<string, number>;
  /**
   * Dono ATUAL de cada província, por id. **Sempre completo: as 196 entradas.**
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
   * cada turno ela pode crescer conforme a alimentação do reino. É o que faz mobilizar
   * ter preço contínuo sem condenar uma província a encolher para sempre.
   */
  populacao: Record<string, number>;
  /**
   * De que povo é a população de cada província, em frações que somam 1.
   *
   * ⚠️ **Estado, e não dado fixo** — pela mesma razão que a população é. Nacionalidade
   * muda devagar: gente de fora se instala, uma geração nasce sob
   * outra bandeira. Nada disso acontece ainda; o campo está aqui porque o dia em que
   * acontecer não pode exigir mover o dado de lugar no meio de um salvamento.
   *
   * Só as províncias com ficha autoral. Quem não tem não é simulada.
   */
  nacionalidades: Record<string, Record<string, number>>;
  /**
   * O humor de cada província, de 0 a 100.
   *
   * Vive: anda por turno em direção a um alvo (comida do reino, cerco, domínio
   * estrangeiro, Templo) e despenca no choque da conquista. Na faixa revoltosa a
   * província não paga imposto — e, sob bandeira alheia, arma um levante.
   */
  felicidade: Record<string, number>;
  /**
   * Turnos consecutivos que cada província passou na faixa revoltosa, por id.
   *
   * É o pavio do levante: chega ao limite do ajuste e os rebeldes pegam em armas. Some
   * do registro assim que o humor sai da faixa — revolta não guarda rancor pela metade.
   */
  revoltas: Record<string, number>;
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
   * sitiante a lutar: ele declarou que não quer choque, e sem uma
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
   * Perder a capital obriga o jogador a escolher outra; os demais poderes reassentam a sua
   * automaticamente. Corrupção por distância e circulação de mercadorias consultam este
   * campo, mantendo uma única resposta para todo o jogo.
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
   * O nível de imposto escolhido para cada província. Ausente = normal.
   *
   * Só as diferentes do normal entram no registro: é o diff da decisão, não uma tabela
   * cheia — o padrão não precisa ser escrito pra valer. Substituiu os incentivos de
   * investimento, que saíram do jogo.
   */
  nivelDeImposto: Record<string, NivelDeImposto>;
  /**
   * Construções erguidas, por id de província.
   *
   * Ao contrário do incentivo, isto **nunca sai** daqui: construção é permanente, e é
   * por isso que ela consegue absorver dinheiro que o incentivo não absorve.
   */
  construcoes: Record<string, Record<string, number>>;
  /**
   * Obras em andamento, por id de província. Uma por vez em cada uma.
   *
   * O dinheiro já saiu quando a obra entra aqui: paga-se no início e recebe-se no fim.
   * É isso que faz o custo ser sentido, em vez de o número subir no mesmo instante do
   * clique.
   */
  obras: Record<string, Obra>;
  /**
   * Guerras em curso, pela chave do par de poderes, guardando o TURNO em que começaram.
   *
   * ⚠️ **Paz é a ausência de registro.** São 139 poderes: a tabela cheia seriam 9.591 pares,
   * quase todos dizendo "nada acontece entre estes dois". Guardar só a exceção é a mesma
   * escolha do nível de imposto, e pelo mesmo motivo — o padrão não precisa ser escrito para
   * valer.
   *
   * O turno de início não é enfeite: é ele que responde "há quanto tempo esta guerra dura",
   * que é o que a IA pergunta antes de propor paz.
   */
  guerras: Record<string, number>;
  /**
   * Tréguas, pela mesma chave, guardando o turno ATÉ o qual elas seguram.
   *
   * Existem para a paz significar alguma coisa: sem trégua, fazer as pazes e redeclarar na
   * virada seguinte seria grátis, e a paz viraria uma pausa para respirar no meio do mesmo
   * assalto.
   */
  tregoas: Record<string, number>;
  /**
   * A opinião de cada par de poderes, de −100 a 100, pela mesma chave das guerras.
   *
   * ⚠️ **Um número por PAR, e não um por lado.** Relação recíproca é uma simplificação
   * assumida: Corinto e você têm a mesma opinião um do outro. Dois números por par dobrariam
   * a tabela e a tela para representar uma assimetria que este jogo ainda não usa em decisão
   * nenhuma — no dia em que usar, a chave já é a mesma e a mudança é local.
   *
   * Ausente é ZERO: indiferença é o padrão, e a tabela guarda só quem já se esbarrou. Mesma
   * escolha do nível de imposto e das guerras, pelo mesmo motivo.
   */
  relacoes: Record<string, number>;
  /**
   * Pactos de não-agressão em curso, pela mesma chave, guardando o turno em que VENCEM.
   *
   * Enquanto ele segura, nenhum dos dois declara guerra ao outro — e a opinião sobe, porque a
   * fronteira segura é um fato como qualquer outro. Quem quiser atacar antes do prazo tem de
   * ROMPER, e romper custa a reputação com o mapa inteiro.
   */
  pactos: Record<string, number>;
  /**
   * A reputação de cada poder, de −100 a 0. Zero é quem nunca quebrou promessa.
   *
   * ⚠️ **É o que faz um pacto valer o papel.** Sem ela, assinar e trair na virada seguinte
   * sairia de graça, e o único prejudicado seria o traído — que já não confiava mesmo. Com ela,
   * a traição entra na conta da opinião de TODO MUNDO: o mapa inteiro vê.
   *
   * Sobe sozinha de volta a zero com o tempo. Rancor por promessa quebrada não é eterno.
   */
  reputacao: Record<string, number>;
}

/** Uma construção em andamento. */
export interface Obra {
  construcao: string;
  nivelAlvo: number;
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
