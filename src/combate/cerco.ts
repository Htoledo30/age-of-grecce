/**
 * O cerco: o que acontece quando um exército pisa numa cidade que não se entrega.
 *
 * Antes disto, província alheia com gente dentro caía no instante em que alguém chegava —
 * a milícia saía a campo, morria, e o mapa mudava de cor no mesmo turno. Não existia
 * estado intermediário, e por isso não existia guerra: existia uma sequência de trocas de
 * dono.
 *
 * ⚠️ **A milícia deixou de lutar no campo e passou a segurar a cidade.** É a mudança que
 * torna tudo o mais possível. O choque em campo aberto é exército contra exército; quem
 * vence fica com o CAMPO, e a cidade continua sendo um problema por resolver. São duas
 * perguntas em vez de uma, e é da segunda que nascem cerco, bloqueio e socorro.
 *
 * ⚠️ **SITIAR NUNCA TOMA A CIDADE.** Só o assalto toma. Esta é a regra central e ela já
 * esteve errada: o cerco acumulava progresso e abria os portões sozinho, o que fazia dele
 * um assalto lento em vez de outra coisa — e então escolher postura era só escolher a
 * velocidade da mesma conquista.
 *
 * Sitiar é **ficar na porta**. O exército acampa na divisa, não entra, e enquanto estiver
 * ali a província não produz nem comercia. É o que se faz quando não se tem gente para
 * tomar a praça: aperta o inimigo, empobrece-o, e espera — juntando uma leva atrás da
 * outra até valer o assalto. Quem senta paga por isso ficando parado em terra alheia
 * enquanto o dono junta gente para o socorro.
 *
 * ⚠️ **SITIAR TAMBÉM É NÃO LUTAR.** Quem senta não engaja o exército que estiver na
 * província: os dois ficam acampados no mesmo lugar, e é por isso que a hoste precisou
 * ganhar identidade própria antes — enquanto a província era a chave, duas forças no
 * mesmo território eram impossíveis, e a resolução brigava até sobrar um poder só. Sitiar
 * queria dizer "lute com o exército deles e DEPOIS sente", que é o assalto com um passo a
 * mais. A regra vive em `quemLuta`, em `resolucao.ts`.
 *
 * | postura      | toma a cidade? | luta com o exército? | custo em homens | o que faz                           |
 * | ------------ | -------------- | -------------------- | --------------- | ----------------------------------- |
 * | **Assaltar** | sim, no turno  | sim, antes da cidade | alto            | choque de campo e depois a muralha  |
 * | **Sitiar**   | **nunca**      | **não**              | nenhum          | corta produção e comércio, e espera |
 *
 * ⚠️ **A MURALHA DECIDE SE O ASSALTO PODE SER HOJE.** Cidade aberta cai no primeiro
 * assalto — é o que diferencia uma província fortificada de uma que não é. Contra uma obra
 * marcada com `impedeAssaltoImediato` no catálogo, é preciso estar sentado na frente dela
 * por algumas rodadas antes de poder ir para cima: escada, aríete e rampa não se
 * improvisam no dia em que se chega. É por isso que `Cerco` conta rodadas — e só por
 * isso.
 *
 * Quem defende a própria terra luta sempre — não existe postura de deixar passar. A
 * escolha do sitiado é a **surtida**: sair para atacar quem o cerca.
 *
 * ⚠️ **A surtida é a resposta ao "sitiar não é lutar".** Sem ela o cerco seria inquebrável
 * por armas — o sitiante recusa o choque, e o defensor não teria como forçá-lo. O dono da
 * terra força de duas maneiras: surtindo de dentro ou chegando de fora com socorro. A
 * milícia não vai junto: ela é da cidade, e sair da muralha para o campo é justamente
 * abrir mão do que a muralha dá. A regra vive em `choqueObrigadoEm`, em `resolucao.ts`.
 */

import type { Ajustes } from '@/dados/esquema';

type AjustesCerco = Ajustes['jogo']['combate']['cerco'];

/** O que o sitiante está fazendo neste turno. */
export type Postura = 'assaltar' | 'sitiar';

/**
 * Um cerco em curso, guardado por província sitiada.
 *
 * ⚠️ **Limite conhecido: um sitiante por província.** Se dois poderes diferentes sentarem
 * na frente da mesma cidade, o segundo sobrescreve o registro do primeiro — e a contagem
 * de rodadas dele recomeça do zero, como se ninguém estivesse ali antes. Hoje isso é
 * inalcançável jogando (só a mão do desenvolvedor planta duas hostes inimigas no mesmo
 * lugar), mas vira problema real no dia em que houver IA. O conserto, quando vier, é este
 * registro passar a ser uma lista por província em vez de um cerco só.
 */
export interface Cerco {
  /** Quem sitia. Não é o dono da província — é quem está sentado em cima dela. */
  sitiante: string;
  /**
   * A postura desta rodada. Trocável enquanto o cerco estiver de pé.
   *
   * O cerco não anda em direção a nada: ele dura enquanto o exército ficar ali, e acaba
   * quando ele sai, morre ou assalta.
   */
  postura: Postura;
  /**
   * Há quantas rodadas COMPLETAS este exército está sentado aqui. Zero na rodada em que
   * ele chega.
   *
   * ⚠️ **Isto não é progresso de cerco, e a diferença é a regra inteira.** Não existe
   * barra enchendo nem cidade que abre os portões sozinha ao fim da contagem — se
   * existisse, o cerco voltaria a ser um assalto lento, que é justamente o erro que a
   * separação entre as duas posturas desfez. O número responde uma pergunta só: **já dá
   * para assaltar aquela muralha?** Cidade aberta não pergunta nada e cai no primeiro
   * assalto.
   *
   * Zera quando o sitiante sai, morre ou é substituído por outro poder: quem chega
   * recomeça o trabalho, não herda o tempo de quem estava ali.
   */
  rodadas: number;
}

/**
 * Quantas rodadas de cerco ainda faltam para poder assaltar esta cidade. Zero libera.
 *
 * Uma função e não dois números soltos porque a resposta é consultada em três lugares — a
 * resolução, o botão do cerco e a escolha de postura ao ordenar a marcha — e três contas
 * iguais escritas à mão acabariam discordando no dia em que o valor mudasse.
 */
export function rodadasAteOAssalto(
  impedeAssaltoImediato: boolean,
  rodadasDeCerco: number,
  ajustes: AjustesCerco,
): number {
  if (!impedeAssaltoImediato) return 0;
  return Math.max(0, ajustes.rodadasParaAssaltarMuralha - rodadasDeCerco);
}

/**
 * Quanto vale a milícia no assalto.
 *
 * A ficha mostra a força real: não existe um segundo multiplicador escondido por toda
 * cidade ocupar uma posição defensiva. A construção Muralha já melhora a milícia antes
 * daqui e ainda compra tempo de cerco.
 */
export function defesaNoAssalto(milicianos: number): number {
  return milicianos;
}

/**
 * Quantos milicianos se perderam, sabendo quanto da DEFESA sobrou.
 *
 * Como a força mostrada e a força combatida são a mesma, defesa restante já está em
 * homens. Não há multiplicador escondido para desfazer.
 */
export function milicianosPerdidos(
  milicianos: number,
  defesaRestante: number,
): number {
  const vivos = Math.min(milicianos, Math.floor(defesaRestante));
  return Math.max(0, milicianos - vivos);
}
