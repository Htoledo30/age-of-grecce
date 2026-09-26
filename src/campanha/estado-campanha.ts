import type { VinculoDaLiga } from './diplomacia/liga';
import type { PoderLivre } from './sociedade/independencia';
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
   * Os reinos que NASCERAM nesta partida — hoje, os que saíram de uma independência.
   *
   * ⚠️ **Mora no estado, e não no atlas, porque tem de sobreviver ao salvamento.** O atlas é o
   * mundo de 700 a.C., igual em toda partida; um reino que se libertou existe só nesta. Sem
   * este registro, carregar o jogo devolveria províncias pertencentes a um poder que ninguém
   * conhece — e o mapa estouraria na primeira pintura.
   */
  poderesNascidos: PoderLivre[];
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
   * Ordens de marcha ativas, pelo id da hoste que as recebeu.
   *
   * Uma por hoste — e é por isso que mandar PARTE da tropa cria a hoste que a leva: sem um id
   * novo, a segunda ordem sobrescreveria a primeira. Ver `guerra/marchas.ts`.
   *
   * Mover não move ninguém no clique: a ordem fica aqui, revisável e cancelável, e só avança
   * quando o turno vira — junto com as de todo mundo. Uma viagem distante do jogador conserva
   * os trechos restantes; ordens comuns acabam na resolução.
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
   * Quantos pontos de comida cada poder ENCOMENDOU de fora, por turno. Ausente = nenhum.
   *
   * É a ordem, e não o que chega: com o cais bloqueado entra menos, e a encomenda volta a
   * valer inteira quando a frota sai. Ver `alimentacao/importacao.ts`.
   */
  importacao: Record<string, number>;
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
   * Alianças em curso, pela mesma chave, guardando o turno em que VENCEM.
   *
   * ⚠️ **É o único acordo que obriga a FAZER.** Todo o resto do arquivo é promessa de não
   * fazer — não atacar, não fechar a estrada, não cobrar. Enquanto ela vale, a guerra de um é a
   * guerra do outro, e a entrada é automática. Ver `diplomacia/alianca.ts`.
   */
  aliancas: Record<string, number>;
  /**
   * As ligas em curso, **pelo ID DO MEMBRO**.
   *
   * ⚠️ **A chave é o membro, e não o par, porque é a tabela que garante a regra**: um membro tem
   * um chefe só. Guardado pelo par, nada impediria dois chefes cobrando o mesmo reino, e a
   * convocação de guerra andaria por uma corrente de suseranias.
   *
   * Ver `diplomacia/liga.ts`: o membro mantém governo, terra, exército e despensa; o que o
   * chefe leva é tributo, as guerras e a paz entre os dois.
   */
  ligas: Record<string, VinculoDaLiga>;
  /**
   * Acessos militares em curso, por `concedente>beneficiário`, guardando o turno em que vencem.
   *
   * ⚠️ **A única chave DIRECIONAL do arquivo.** Guerra, trégua, pacto e comércio valem igual
   * para os dois lados; deixar Atenas passar por Mégara não deixa Mégara passar por Atenas. Os
   * dois sentidos podem existir ao mesmo tempo, cada um com o seu prazo.
   */
  acessos: Record<string, number>;
  /**
   * O que a IA está PEDINDO ao jogador, e que espera um sim ou um não.
   *
   * ⚠️ **Existe porque a IA assinava com o jogador sem perguntar.** Pacto e comércio eram
   * decisão dela e fato consumado dele — Henrique: *"não sinto a IA tentando se conectar
   * comigo para oferecer diplomacia, deveria acontecer isso, e aparecer que um reino está
   * querendo negociar comigo e eu ter opção de aceitar ou recusar"*. A decisão da IA continua
   * a mesma; o que mudou é que, quando a outra ponta é o jogador, ela vira pedido.
   *
   * Some sozinha na virada: proposta é do turno em que foi feita. Uma mesa que acumulasse
   * pedidos velhos faria o jogador responder a um mundo que não existe mais.
   */
  propostas: Proposta[];
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
  /**
   * Acordos de comércio em pé, pela mesma chave dos pares, guardando o turno em que foram
   * assinados.
   *
   * Não têm prazo: duram enquanto os dois quiserem. Quem declara guerra os desfaz, e é isso que
   * transforma comércio numa razão de dinheiro para não atacar alguém.
   */
  acordos: Record<string, number>;
  /**
   * Tributos em curso, pela mesma chave dos pares.
   *
   * ⚠️ **É o único registro do par que precisa saber de que LADO a coisa está**, e por isso é o
   * único que guarda um objeto em vez de um número: guerra, trégua, pacto e comércio valem
   * igual para os dois, mas alguém paga o tributo e alguém o recebe. A chave continua a mesma
   * — o lado mora no valor, e não numa segunda tabela.
   */
  tributos: Record<string, Tributo>;
}

/**
 * Os tipos de pedido que cabem na mesa — a lista é UMA, e o salvamento lê daqui.
 *
 * ⚠️ **Eram duas listas, e a do salvamento tinha metade.** O esquema de leitura conhecia só
 * `pacto`, `comercio` e `acesso`; a IA já punha `alianca`, `liga` e `anexacao` na mesa. Como o
 * autosave grava sem validar e a leitura valida, uma aliança pedida na hora do salvamento
 * fazia o boot seguinte recusar o arquivo inteiro — e a campanha sumia. Ficou invisível
 * enquanto a mesa era apagada na mesma virada em que nascia; no dia em que o pedido passou a
 * sobreviver até o turno do jogador, virou perda de partida.
 */
export const TIPOS_DE_PROPOSTA = [
  'pacto',
  'alianca',
  'liga',
  'anexacao',
  'comercio',
  'acesso',
  'paz',
] as const;

/** O que um reino está pedindo ao jogador nesta virada. */
export interface Proposta {
  /** Quem pede. */
  de: string;
  tipo: (typeof TIPOS_DE_PROPOSTA)[number];
  /** O prazo pedido, quando o acordo tem prazo. */
  turnos?: number | undefined;
}

/** Um tributo em curso: quem sangra, quanto, e até quando. */
export interface Tributo {
  /** Quem tira do cofre todo turno. O outro nome do par é quem recebe. */
  pagador: string;
  /** O turno em que ele vence. Vencido, acaba sem culpa de ninguém e a conversa recomeça. */
  ate: number;
  /**
   * Moedas por turno, **congeladas no dia da assinatura.**
   *
   * ⚠️ **É o número fixo que faz o tributo ter história.** Recalculado todo turno sobre a renda
   * de quem paga, ele encolheria junto com o reino e ninguém jamais deixaria de pagar — o
   * calote seria impossível e a decisão, morta. Fixo, ele vira as duas coisas que interessam:
   * **quem perde província afunda** e não paga mais, e **quem cresce o supera** e um dia olha
   * para a linha do cofre e vê troco onde antes havia uma sangria.
   */
  ouro: number;
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
