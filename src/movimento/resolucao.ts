/**
 * A resolução da rodada: executa todas as ordens juntas, em passos.
 *
 * O princípio, e ele responde quase tudo sozinho:
 *
 * > **A rodada resolve em PASSOS. Dentro de cada passo: primeiro todos PARTEM, depois
 * > todos CHEGAM, e só então se resolve quem ficou junto de quem.**
 *
 * É essa separação que faz a simultaneidade ser real. Se partida e chegada acontecessem
 * hoste por hoste, quem fosse processado primeiro veria um mundo que os outros ainda não
 * mexeram — que é exatamente o defeito que a resolução simultânea existe pra consertar.
 *
 * ⚠️ **Guarnição parada e destacamento em marcha são a MESMA coisa aqui: uma força com
 * posição.** Sem essa unificação, cada linha da tabela de adjudicação viraria um `if`
 * diferente — "hoste contra hoste", "hoste contra quem chegou", "quem chegou contra quem
 * chegou" — e as três teriam que concordar. Uma estrutura só, e o choque não pergunta de
 * onde a força veio.
 */

import { resolverChoque } from '@/combate/batalha';
import { exercitoVazio, forcaDe, retirar, somarLeva } from '@/combate/exercito';
import type { Exercito } from '@/combate/exercito';
import type { OrdemDeMarcha } from './ordens';
import type { Ajustes } from '@/dados/esquema';
import {
  type Cerco,
  type Postura,
  defesaNoAssalto,
  milicianosPerdidos,
  rodadasAteOAssalto,
} from '@/combate/cerco';

/** O recorte do estado que a resolução mexe. Nada além disto. */
export interface EstadoDaResolucao {
  /** Por ID de hoste. A provincia esta em `hoste.posicao`. */
  hostes: Record<string, Exercito>;
  proximaHoste: number;
  /** Por ID de hoste: **uma ordem por hoste por rodada**, agora literalmente. */
  ordens: Record<string, OrdemDeMarcha>;
  /**
   * Hostes que SURTEM nesta rodada, por id. Ver `quemLuta` e `choqueObrigadoEm`.
   *
   * Não é uma ordem de marcha porque não há marcha nenhuma: a hoste fica onde está e
   * obriga quem a cerca a lutar. Some na virada junto com as ordens.
   */
  surtidas: readonly string[];
  /** Cercos em curso, por província sitiada. Sobrevive à virada — cerco leva turnos. */
  cercos: Record<string, Cerco>;
}

/** O que a resolução precisa perguntar e mudar no mundo em volta. */
export interface MundoDaResolucao {
  donoDe: (idProvincia: string) => string;
  trocarDono: (idProvincia: string, idPoder: string) => void;
  /** Quantos milicianos esta província põe em pé. Zero onde não há população. */
  miliciaDe: (idProvincia: string) => number;
  /**
   * Esta província tem obra que obriga a sitiar antes de assaltar?
   *
   * A resolução não conhece catálogo de construções — pergunta e recebe sim ou não. Quem
   * responde é a campanha, lendo o campo `impedeAssaltoImediato` do dado.
   */
  impedeAssaltoImediato: (idProvincia: string) => boolean;
  /**
   * Avisa quantos milicianos a província PERDEU no choque.
   *
   * ⚠️ Perdido não é o mesmo que morto: milícia derrotada **dispersa**, e quem decide a
   * fatia que morreu é a campanha, que é onde os ajustes moram. A resolução não conhece
   * essa fração — se conhecesse, o número de balanço estaria em dois lugares.
   */
  miliciaPerdida: (idProvincia: string, perdidos: number) => void;
}

/**
 * Uma força durante a resolução: guarnição parada ou destacamento em marcha.
 *
 * **Enquanto marcha, ela não está na origem nem no destino**: está onde o passo a deixou.
 * Sem isso, "interceptar no meio do caminho" não teria onde acontecer.
 */
interface Forca {
  /**
   * A hoste de onde esta forca saiu.
   *
   * Guardada para que a que pousa REAPROVEITE a identidade em vez de nascer outra: uma
   * hoste que marcha e a mesma hoste do outro lado, e um id novo a cada passo faria a
   * selecao do jogador se perder toda virada de turno.
   */
  hoste: string;
  poder: string;
  /** Quantos homens de cada terra natal. Fatia proporcional da hoste de origem. */
  origem: Record<string, number>;
  /** Trechos que ainda vai andar. Vazio na guarnição parada. */
  rota: readonly string[];
  posicao: string;
  partiuDe: string;
  /** Morreu num choque. Não some da lista: sair no meio da varredura muda o resultado. */
  viva: boolean;
}

/** O que aconteceu na rodada — pra crônica, pra interface e pros testes. */
export interface RelatorioDaRodada {
  /**
   * Quem se moveu, e **por onde**.
   *
   * ⚠️ A trilha é o caminho INTEIRO, com as duas pontas: `trilha[0]` é de onde saiu e
   * `trilha.at(-1)` é onde parou. Guardar origem e destino ao lado dela seria guardar um
   * resumo junto do detalhe, e um dia os dois discordariam. Quem desenha a marcha precisa
   * das paradas do meio: com dois saltos por rodada, a reta entre as pontas passa por
   * fora do caminho que a seta prometeu.
   */
  marchas: readonly { hoste: string; trilha: readonly string[]; homens: number }[];
  /** Choques resolvidos. `provincia` é `null` no encontro na estrada, que não tem lugar. */
  batalhas: readonly {
    provincia: string | null;
    vencedor: string | null;
    perdedores: readonly string[];
    sobreviventes: number;
    /**
     * Que tipo de choque foi.
     *
     * ⚠️ Existe porque um assalto produz **duas** batalhas na mesma província e na mesma
     * rodada — o exército de fora contra o de dentro, e depois o vencedor contra a
     * muralha. Sem distinguir, a crônica escrevia duas linhas iguais e o jogador lia como
     * repetição de um evento só.
     */
    tipo: 'campo' | 'estrada' | 'assalto';
  }[];
  conquistas: readonly { provincia: string; de: string; para: string }[];
  /**
   * Milicianos que a província PERDEU defendendo, por província.
   *
   * Perdidos, não mortos: parte dispersa e volta pra casa. Quem aplica a fração é a
   * campanha.
   */
  milicianosMortos: readonly { provincia: string; mortos: number }[];
  /**
   * Cidades sob cerco ao fim da rodada, com a postura de quem senta.
   *
   * `novo` separa quem acabou de sentar de quem já estava lá. É o que permite contar a
   * notícia uma vez só: um cerco que dura oito rodadas não é oito notícias.
   */
  cercos: readonly { provincia: string; sitiante: string; postura: Postura; novo: boolean }[];
  /**
   * Cercos que ACABARAM nesta rodada, e por qualquer motivo: o sitiante marchou embora,
   * morreu na surtida, foi desfeito no assalto rechaçado.
   *
   * ⚠️ Conquista não entra aqui. A cidade tomada também deixa de estar sitiada, mas a
   * notícia daquele dia é a conquista — dizer as duas coisas seria contar o mesmo fato
   * duas vezes, e a segunda soaria como alívio no dia em que a praça caiu.
   */
  cercosLevantados: readonly { provincia: string; sitiante: string }[];
}

export function resolverRodada(
  estado: EstadoDaResolucao,
  ajustes: Ajustes['jogo']['combate'],
  mundo: MundoDaResolucao,
): RelatorioDaRodada {
  const relatorio: {
    marchas: RelatorioDaRodada['marchas'][number][];
    batalhas: RelatorioDaRodada['batalhas'][number][];
    conquistas: RelatorioDaRodada['conquistas'][number][];
    milicianosMortos: RelatorioDaRodada['milicianosMortos'][number][];
    cercos: RelatorioDaRodada['cercos'][number][];
    cercosLevantados: RelatorioDaRodada['cercosLevantados'][number][];
  } = {
    marchas: [],
    batalhas: [],
    conquistas: [],
    milicianosMortos: [],
    cercos: [],
    cercosLevantados: [],
  };

  // As posturas são lidas ANTES de qualquer coisa: as ordens são consumidas no caminho, e
  // sem isto a cidade não saberia se quem chegou veio assaltar ou sentar.
  const posturas = posturasPorDestino(estado, mundo.donoDe);

  // ⚠️ **Sitiar é declarar que não se quer lutar.** Quem senta na frente da cidade não
  // joga o exército contra a guarnição dela — acampa ao lado e espera. Sem isto, escolher
  // sitiar significava "lute com o exército deles e DEPOIS sente", que é o assalto com um
  // passo a mais: a decisão que a postura devia oferecer não existia.
  const querLutar = (forca: Forca): boolean =>
    quemLuta(forca, mundo.donoDe(forca.posicao), posturas, estado.cercos);

  // ⚠️ Lido ANTES de `partir`, que esvazia o tabuleiro: depois dele não há mais como
  // perguntar onde a hoste que surtiu estava parada.
  const emSurtida = provinciasEmSurtida(estado);
  const choqueObrigado = (provincia: string, presentes: readonly Forca[]): boolean =>
    choqueObrigadoEm(provincia, presentes, emSurtida, estado.cercos, mundo.donoDe);

  const saltosPorRodada = ajustes.saltosPorRodada;
  const forcas = partir(estado);
  for (let passo = 0; passo < saltosPorRodada; passo++) {
    naEstrada(forcas, passo, relatorio.batalhas);
    chegar(forcas, passo);
    naProvincia(forcas, relatorio.batalhas, querLutar, choqueObrigado);
  }
  pousar(estado, forcas, relatorio.marchas);
  resolverCidades(estado, ajustes, mundo, posturas, relatorio);

  // ⚠️ As ordens são da RODADA, não da partida. Se sobrevivessem à virada, executariam de
  // novo, e o sintoma seria tropa andando sozinha. A surtida some pelo mesmo motivo: ela é
  // a decisão de UMA rodada, e uma que ficasse guardada faria a cidade sair para o campo
  // sozinha, todo turno, até morrer.
  estado.ordens = {};
  estado.surtidas = [];
  return relatorio;
}

/**
 * As províncias onde alguém declarou surtida, pelas hostes que a declararam.
 *
 * Por província e não por hoste porque é assim que o choque pensa: participação já é
 * decidida por PODER e por LUGAR (ver `naProvincia`). Se uma hoste do defensor sai para
 * lutar, as outras dele que estão ali saem junto — um exército não assiste ao massacre do
 * vizinho de acampamento por causa de uma ordem diferente.
 */
function provinciasEmSurtida(estado: EstadoDaResolucao): ReadonlySet<string> {
  const provincias = new Set<string>();
  for (const idHoste of [...estado.surtidas].sort()) {
    const hoste = estado.hostes[idHoste];
    if (hoste) provincias.add(hoste.posicao);
  }
  return provincias;
}

/**
 * O choque é OBRIGATÓRIO aqui, mesmo com o sitiante recusando?
 *
 * ⚠️ **É a resposta do defensor ao #32A.** Sitiar é declarar que não se quer lutar, e sem
 * uma forma de obrigar, sitiante e sitiado ficariam acampados lado a lado para sempre — o
 * cerco seria inquebrável por armas, e só a fome (que ainda não existe) o desfaria.
 *
 * O dono da terra obriga o choque de **duas** formas, e as duas exigem um cerco em curso:
 *
 * 1. **surtindo de dentro** — a hoste que está na cidade declara a surtida e sai;
 * 2. **chegando de fora** — o exército de socorro que entra na província sitiada já vem
 *    lutar. Não há o que declarar: mandar tropa para uma cidade cercada é atacar quem a
 *    cerca. Sem isto o socorro entrava e acampava ao lado do inimigo
 *    sem tocá-lo.
 *
 * Obriga TODO MUNDO que estiver ali, e não só os dois interessados: quem está acampado
 * numa província onde a batalha começou está na batalha. Com um sitiante só — que é o caso
 * de hoje — os dois casos dão no mesmo.
 */
function choqueObrigadoEm(
  provincia: string,
  presentes: readonly Forca[],
  emSurtida: ReadonlySet<string>,
  cercos: Record<string, Cerco>,
  donoDe: (idProvincia: string) => string,
): boolean {
  // Sem cerco não há a quem obrigar: quem chega em terra própria sem inimigo sentado nela
  // só está reforçando a guarnição.
  if (cercos[provincia] === undefined) return false;
  if (emSurtida.has(provincia)) return true;
  const dono = donoDe(provincia);
  return presentes.some((f) => f.viva && f.poder === dono && f.posicao !== f.partiuDe);
}

/**
 * FASE PARTIDA — todos saem antes de qualquer um chegar, e o tabuleiro fica vazio.
 *
 * Tira TODAS as hostes do estado, não só as que marcham: quem fica vira uma força de rota
 * vazia. É o que permite o choque tratar guarnição e destacamento pela mesma régua.
 *
 * ⚠️ **A origem fica vazia já aqui**, mesmo com destino a dois trechos. Quem manda a
 * guarnição inteira embora deixa a casa aberta desde o primeiro instante da rodada.
 *
 * ⚠️ **Ordenado por id**, nunca pela ordem do registro: `Object.entries` devolve as chaves
 * na ordem de criação, e percorrer isso cru faria o resultado depender de quem foi
 * recrutado primeiro.
 */
function partir(estado: EstadoDaResolucao): Forca[] {
  const forcas: Forca[] = [];
  // ⚠️ Guarda a lista ANTES de esvaziar o tabuleiro. Esvaziar primeiro e percorrer depois
  // percorre o vazio — nenhuma força parte, e o mapa fica sem exército nenhum.
  const antes = Object.keys(estado.hostes).sort();
  const emPe = { ...estado.hostes };
  // O tabuleiro fica vazio: quem fica volta em `pousar`, com a própria identidade.
  estado.hostes = {};

  for (const id of antes) {
    const hoste = emPe[id];
    if (!hoste) continue;
    const onde = hoste.posicao;
    const ordem = estado.ordens[id];

    if (ordem) {
      // `retirar` já tira proporcionalmente de cada terra natal — é o que faz o
      // destacamento levar uma parcela de cada origem em vez da primeira da lista.
      const partem = retirar(hoste, Math.min(ordem.homens, forcaDe(hoste)));
      if (Object.keys(partem).length > 0) {
        forcas.push({
          // O destacamento e uma hoste NOVA: parte da antiga fica, parte vai, e as duas
          // passam a existir ao mesmo tempo.
          hoste: `h${estado.proximaHoste++}`,
          poder: hoste.poder,
          origem: partem,
          rota: ordem.rota,
          posicao: onde,
          partiuDe: onde,
          viva: true,
        });
      }
    }

    if (forcaDe(hoste) > 0) {
      forcas.push({
        hoste: id,
        poder: hoste.poder,
        origem: { ...hoste.origem },
        rota: [],
        posicao: onde,
        partiuDe: onde,
        viva: true,
      });
    }
  }

  return forcas;
}

/**
 * O ENCONTRO NA ESTRADA — duas forças hostis atravessando a mesma aresta em sentidos
 * opostos.
 *
 * Sem esta fase, as duas passariam uma pela outra e trocariam de território sem se tocar,
 * o que abre uma esquiva: adivinhando de onde vem o ataque, bastava marchar pra lá e
 * **nunca ser pego**.
 *
 * ⚠️ **É a única batalha do jogo sem lugar** — não acontece em província nenhuma, e por
 * isso não tem defensor nem terreno. Quem vence **continua a rota**; quem perde some.
 */
function naEstrada(
  forcas: readonly Forca[],
  passo: number,
  batalhas: RelatorioDaRodada['batalhas'][number][],
): void {
  const andando = forcas.filter((f) => f.viva && f.rota[passo] !== undefined);

  for (let i = 0; i < andando.length; i++) {
    for (let j = i + 1; j < andando.length; j++) {
      const a = andando[i];
      const b = andando[j];
      if (!a?.viva || !b?.viva) continue;
      if (a.poder === b.poder) continue;
      // A troca: o destino de um é a origem do outro, nos dois sentidos.
      if (a.rota[passo] !== b.posicao || b.rota[passo] !== a.posicao) continue;
      // Quem vence na estrada CONTINUA: não há província onde parar.
      travarLados([a], [b], null, batalhas, false);
    }
  }
}

/** FASE CHEGADA — todos os sobreviventes avançam um trecho. */
function chegar(forcas: readonly Forca[], passo: number): void {
  for (const forca of forcas) {
    if (!forca.viva) continue;
    const proxima = forca.rota[passo];
    if (proxima === undefined) continue;
    forca.posicao = proxima;
  }
}

/**
 * FASE CHOQUE — quem ficou junto de quem, agora que todos chegaram.
 *
 * Com três ou mais poderes no mesmo lugar, resolve **aos pares, da maior força para a
 * menor**, e o desempate é por id. É provisório e está marcado como tal: combate de três
 * lados de verdade é assunto de diplomacia, que não existe.
 */
function naProvincia(
  forcas: Forca[],
  batalhas: RelatorioDaRodada['batalhas'][number][],
  querLutar: (forca: Forca) => boolean,
  choqueObrigado: (provincia: string, presentes: readonly Forca[]) => boolean,
): void {
  const porProvincia = new Map<string, Forca[]>();
  for (const forca of forcas) {
    if (!forca.viva) continue;
    const lista = porProvincia.get(forca.posicao) ?? [];
    lista.push(forca);
    porProvincia.set(forca.posicao, lista);
  }

  for (const provincia of [...porProvincia.keys()].sort()) {
    const presentes = porProvincia.get(provincia) ?? [];
    // A surtida e o socorro que chega são o **contrário** da postura: em vez de deixar
    // cada força escolher, tiram a escolha de todas. Lido uma vez por província e antes
    // do laço — o que obriga o choque é o estado da chegada, não o que sobrar dele.
    const obrigado = choqueObrigado(provincia, presentes);
    for (;;) {
      const vivas = presentes.filter((f) => f.viva);
      // ⚠️ **Estar junto não é lutar.** Só entram no choque os poderes que QUEREM lutar;
      // quem está sitiando fica ao lado, e um poder sozinho a fim de briga não tem com
      // quem brigar. É isto que deixa sitiante e sitiado ocuparem a mesma província sem
      // se aniquilarem — o que a hoste com identidade própria passou a permitir na
      // estrutura, e que a regra ainda proibia.
      //
      // Participação é decidida por PODER, não por hoste: se alguma força de um poder
      // quer lutar, todas as dele que estão ali lutam. Um exército não assiste ao
      // massacre do vizinho de acampamento por causa de uma ordem diferente.
      const poderes = new Set(vivas.filter((f) => obrigado || querLutar(f)).map((f) => f.poder));
      if (poderes.size < 2) break;

      // Ordena por força, e desempata por id: sem isso o resultado dependeria da ordem em
      // que as forças entraram na lista.
      const ordenadas = [...poderes]
        .map((poder) => ({
          poder,
          forca: vivas.filter((f) => f.poder === poder).reduce((s, f) => s + soma(f.origem), 0),
        }))
        .sort((x, y) => y.forca - x.forca || x.poder.localeCompare(y.poder));

      const maior = ordenadas[0];
      const segunda = ordenadas[1];
      if (!maior || !segunda) break;
      travarLados(
        vivas.filter((f) => f.poder === maior.poder),
        vivas.filter((f) => f.poder === segunda.poder),
        provincia,
        batalhas,
        // ⚠️ Quem lutou numa PROVÍNCIA para ali: a rota que sobrava é cancelada. É o
        // contrário do encontro na estrada, e a diferença tem motivo — lá não existe
        // lugar onde ficar, aqui existe. Deixar o vencedor seguir daria um segundo choque
        // no mesmo passo e quebraria a regra de "todos chegam antes de qualquer choque".
        true,
      );
    }
  }
}

/**
 * Um choque entre dois LADOS, cada um podendo ter várias forças no mesmo lugar.
 *
 * O perdedor some inteiro; o vencedor encolhe proporcionalmente em todas as suas forças.
 * Encolher proporcionalmente e não "a primeira da lista" é o que impede a ordem das
 * chegadas de virar uma regra escondida.
 */
function travarLados(
  ladoA: readonly Forca[],
  ladoB: readonly Forca[],
  provincia: string | null,
  batalhas: RelatorioDaRodada['batalhas'][number][],
  cancelarRota: boolean,
): void {
  // Sem lugar é encontro na estrada; com lugar é choque de campo. O assalto é o único que
  // não passa por aqui: ele é contra a muralha, não contra um exército.
  const tipo = provincia === null ? ('estrada' as const) : ('campo' as const);
  const totalA = ladoA.reduce((s, f) => s + soma(f.origem), 0);
  const totalB = ladoB.reduce((s, f) => s + soma(f.origem), 0);
  const r = resolverChoque(totalA, totalB);

  const vencedores = r.vencedor === 'a' ? ladoA : r.vencedor === 'b' ? ladoB : [];
  const perdedores = r.vencedor === 'a' ? ladoB : r.vencedor === 'b' ? ladoA : [...ladoA, ...ladoB];

  for (const f of perdedores) {
    f.viva = false;
    f.origem = {};
  }
  reduzirLado(vencedores, r.sobreviventes);
  if (cancelarRota) for (const f of vencedores) f.rota = [];

  batalhas.push({
    provincia,
    vencedor: vencedores[0]?.poder ?? null,
    perdedores: [...new Set(perdedores.map((f) => f.poder))].sort(),
    sobreviventes: r.sobreviventes,
    tipo,
  });
}

/** Encolhe um lado até `alvo` homens, proporcionalmente entre as forças e as terras natais. */
function reduzirLado(lado: readonly Forca[], alvo: number): void {
  const total = lado.reduce((s, f) => s + soma(f.origem), 0);
  if (total <= alvo || total === 0) return;

  // Reaproveita `retirar`, que já reparte proporcionalmente e fecha exato no arredondamento.
  const caixa = exercitoVazio('provisorio', 'provisorio', 'provisorio');
  for (const f of lado) {
    for (const [terra, homens] of Object.entries(f.origem)) somarLeva(caixa, terra, homens);
  }
  retirar(caixa, total - alvo);

  // Redistribui o que sobrou de volta, na proporção do que cada força tinha.
  const sobrou = { ...caixa.origem };
  for (const f of lado) {
    const meu = soma(f.origem);
    const nova: Record<string, number> = {};
    for (const [terra, homens] of Object.entries(sobrou)) {
      const parte = Math.floor((homens * meu) / total);
      if (parte > 0) nova[terra] = parte;
    }
    f.origem = nova;
    if (soma(nova) === 0) f.viva = false;
  }

  // O resto do arredondamento vai pra maior força viva, pra soma fechar exata.
  const falta = alvo - lado.reduce((s, f) => s + soma(f.origem), 0);
  const maior = [...lado].filter((f) => f.viva).sort((x, y) => soma(y.origem) - soma(x.origem))[0];
  if (falta > 0 && maior) {
    const terra = Object.keys(sobrou).sort()[0];
    if (terra !== undefined) maior.origem[terra] = (maior.origem[terra] ?? 0) + falta;
  }
}

/** Põe as forças sobreviventes no chão, fundindo as do mesmo poder que pararam juntas. */
function pousar(
  estado: EstadoDaResolucao,
  forcas: readonly Forca[],
  marchas: RelatorioDaRodada['marchas'][number][],
): void {
  for (const forca of forcas) {
    if (!forca.viva || soma(forca.origem) === 0) continue;
    // Fundir as do mesmo poder que pararam juntas e POLITICA, nao obrigacao da estrutura:
    // duas hostes ja cabem no mesmo lugar. A que fica e a de menor id, pra que o resultado
    // nao dependa de quem chegou primeiro.
    const juntas = Object.keys(estado.hostes)
      .sort()
      .map((id) => estado.hostes[id])
      .find((h) => h !== undefined && h.posicao === forca.posicao && h.poder === forca.poder);
    const naChegada = juntas ?? exercitoVazio(forca.hoste, forca.poder, forca.posicao);
    for (const [terra, homens] of Object.entries(forca.origem)) somarLeva(naChegada, terra, homens);
    estado.hostes[naChegada.id] = naChegada;
    if (forca.posicao !== forca.partiuDe) {
      // `rota` é o plano inteiro e `posicao` é onde a força de fato parou — quem foi
      // barrado num choque na estrada parou antes do fim. Cortar a rota na posição atual
      // é o que faz a trilha ser o andado, e não o pretendido.
      const andados = forca.rota.indexOf(forca.posicao);
      marchas.push({
        // O id de quem FICOU de pe aqui - fundida ou nao, e ela que o mapa desenha. Era a
        // provincia de chegada, e isso deixou de identificar a peca no dia em que duas
        // hostes passaram a poder parar no mesmo lugar.
        hoste: naChegada.id,
        trilha: [forca.partiuDe, ...forca.rota.slice(0, andados + 1)],
        homens: soma(forca.origem),
      });
    }
  }
}

function soma(origem: Record<string, number>): number {
  let total = 0;
  for (const homens of Object.values(origem)) total += homens;
  return total;
}

/**
 * Esta força quer lutar aqui?
 *
 * Três respostas, nesta ordem:
 *
 * 1. **em casa, sempre.** Quem está na própria terra não escolhe — não existe postura de
 *    "deixar passar";
 * 2. **com ordem desta rodada, o que a ordem disser.** `assaltar` engaja, `sitiar` não;
 * 3. **sem ordem, o cerco em curso manda** — e quem não tem nem uma coisa nem outra senta.
 *
 * ⚠️ Nada disto vale onde o choque foi OBRIGADO: a surtida e o socorro que chega tiram a
 * escolha de todo mundo que está ali. Ver `choqueObrigadoEm`.
 *
 * ⚠️ As posturas são indexadas por província de DESTINO, não por hoste. Dois poderes
 * marchando para o mesmo lugar compartilham a entrada, e o segundo herda a postura do
 * primeiro. É limitação antiga e só aparece em guerra de três lados; quando aparecer, a
 * ordem tem que passar a carregar a postura até aqui em vez de um mapa por destino.
 */
function quemLuta(
  forca: Forca,
  donoDaProvincia: string,
  posturas: Map<string, Postura>,
  cercos: Record<string, Cerco>,
): boolean {
  if (donoDaProvincia === forca.poder) return true;
  const pelaOrdem = posturas.get(forca.posicao);
  if (pelaOrdem) return pelaOrdem === 'assaltar';
  const cerco = cercos[forca.posicao];
  if (cerco?.sitiante === forca.poder) return cerco.postura === 'assaltar';
  // Chegou em terra alheia sem dizer nada: senta. Mesmo padrão que a cidade já usava —
  // quem não declarou não joga o exército contra ninguém por conta própria.
  return false;
}

/**
 * A postura que cada hoste levava ao chegar, por província de destino.
 *
 * Lida antes de qualquer fase porque as ordens são consumidas no caminho — e sem ela a
 * cidade não teria como saber se quem apareceu na fronteira veio assaltar ou sentar.
 */
function posturasPorDestino(
  estado: EstadoDaResolucao,
  donoDe: (idProvincia: string) => string,
): Map<string, Postura> {
  const posturas = new Map<string, Postura>();
  for (const idHoste of Object.keys(estado.ordens).sort()) {
    const ordem = estado.ordens[idHoste];
    const destino = ordem?.rota.at(-1);
    if (!ordem || destino === undefined) continue;
    // ⚠️ **Marchar para casa não declara postura nenhuma.** A postura só significa alguma
    // coisa em terra alheia (ver `ordens.ts`), e como a entrada é compartilhada por
    // DESTINO, uma marcha em território próprio contaminava o inimigo sentado ali: mandar
    // qualquer hoste para a cidade sitiada rebaixava o assalto do sitiante a cerco, sem
    // que nada tivesse sido lutado. Ficou reservado ao socorro (#33A), que agora chega
    // lutando por outra razão.
    const poder = estado.hostes[idHoste]?.poder;
    if (poder !== undefined && donoDe(destino) === poder) continue;
    posturas.set(destino, ordem.postura);
  }
  return posturas;
}

/**
 * AS CIDADES — o que acontece com quem ficou de pé em terra alheia.
 *
 * Substituiu a conquista instantânea, e a diferença é o jogo inteiro: antes, sobrar de pé
 * numa província alheia era ser dono dela. Agora sobrar de pé é ficar com o CAMPO, e a
 * cidade continua sendo um problema por resolver.
 *
 * ⚠️ **Província alheia realmente vazia continua caindo sem batalha.** Sem gente não há
 * quem feche portão nenhum — é fronteira desprotegida, e é o que dá peso a decidir se a
 * guarnição marcha ou fica. As 200 sem economia configurada caem assim.
 */
function resolverCidades(
  estado: EstadoDaResolucao,
  ajustes: Ajustes['jogo']['combate'],
  mundo: MundoDaResolucao,
  posturas: Map<string, Postura>,
  relatorio: {
    batalhas: RelatorioDaRodada['batalhas'][number][];
    conquistas: RelatorioDaRodada['conquistas'][number][];
    milicianosMortos: RelatorioDaRodada['milicianosMortos'][number][];
    cercos: RelatorioDaRodada['cercos'][number][];
    cercosLevantados: RelatorioDaRodada['cercosLevantados'][number][];
  },
): void {
  // Quem está em cada província depois da marcha. O cerco depende disto: ele acaba
  // quando o SITIANTE sai, não quando o dono aparece — e agora os dois podem estar ali ao
  // mesmo tempo, porque sitiar deixou de obrigar o choque.
  const presentes = new Map<string, string[]>();
  for (const idHoste of Object.keys(estado.hostes).sort()) {
    const hoste = estado.hostes[idHoste];
    if (!hoste) continue;
    const lista = presentes.get(hoste.posicao) ?? [];
    lista.push(hoste.poder);
    presentes.set(hoste.posicao, lista);
  }
  const estaAli = (provincia: string, poder: string | undefined): boolean =>
    poder !== undefined && (presentes.get(provincia) ?? []).includes(poder);

  // ⚠️ **Os cercos de ANTES desta varredura**, guardados à parte porque o laço reescreve
  // `estado.cercos` enquanto anda. Sem a foto, a contagem de rodadas leria o que ela mesma
  // acabou de escrever — e dois exércitos sentados na mesma cidade fariam o relógio andar
  // duas vezes numa rodada só.
  const antes = { ...estado.cercos };

  // ⚠️ **Um caminho só para apagar cerco**, e ele conta a notícia junto. O cerco morre em
  // três lugares diferentes — o sitiante saiu, o assalto foi rechaçado, a cidade caiu — e
  // com três `delete` soltos a crônica ia esquecer de um deles em silêncio.
  const levantar = (provincia: string): void => {
    const cerco = estado.cercos[provincia];
    if (!cerco) return;
    delete estado.cercos[provincia];
    relatorio.cercosLevantados.push({ provincia, sitiante: cerco.sitiante });
  };

  const tomar = (provincia: string, poder: string): void => {
    const de = mundo.donoDe(provincia);
    mundo.trocarDono(provincia, poder);
    relatorio.conquistas.push({ provincia, de, para: poder });
    delete estado.cercos[provincia];
  };

  // Por hoste e nao por provincia: a chave mudou, e o lugar agora vive dentro dela.
  for (const idHoste of Object.keys(estado.hostes).sort()) {
    const hoste = estado.hostes[idHoste];
    if (!hoste) continue;
    const provincia = hoste.posicao;

    // Terra própria: o cerco acaba se o sitiante não estiver mais aqui — ele marchou
    // embora, morreu, ou foi expulso. Levantar o cerco é consequência, não regra separada.
    //
    // ⚠️ **Chegar não basta para levantá-lo.** Antes, a presença do dono apagava o cerco
    // na hora, porque era impossível os dois estarem no mesmo lugar: o choque sempre
    // resolvia isso antes. Agora o sitiante pode continuar acampado com o exército do
    // dono do lado, e apagar o cerco aqui teria dado ao defensor uma forma de quebrá-lo
    // sem lutar — bastava mandar qualquer hoste voltar para casa.
    if (hoste.poder === mundo.donoDe(provincia)) {
      if (!estaAli(provincia, estado.cercos[provincia]?.sitiante)) levantar(provincia);
      continue;
    }

    const milicianos = mundo.miliciaDe(provincia);
    // Cidade sem quem feche o portão cai ao primeiro ingresso — mas exército do dono
    // acampado ali É quem fecha o portão, mesmo com a milícia zerada. Sem esta condição,
    // sentar numa província despovoada tomava a cidade por cima do exército que a
    // defendia.
    if (milicianos <= 0 && !estaAli(provincia, mundo.donoDe(provincia))) {
      tomar(provincia, hoste.poder);
      continue;
    }

    // A ordem desta rodada manda; sem ordem, o cerco em curso continua como estava; sem
    // nem uma coisa nem outra, senta-se. Sitiar é o padrão de propósito: quem chegou sem
    // dizer nada não joga o exército contra a muralha por conta própria.
    const cerco = antes[provincia];
    const meu = cerco !== undefined && cerco.sitiante === hoste.poder;
    const pedida = posturas.get(provincia) ?? (meu ? cerco.postura : 'sitiar');

    // ⚠️ **A MURALHA BARRA O ASSALTO DE HOJE, e o que sobra é sentar.** Cidade aberta cai
    // no primeiro assalto; contra a fortificada é preciso ter passado algumas rodadas na
    // frente dela. A regra vive aqui e não só na interface porque a postura também chega
    // pela ordem de marcha — e uma ordem que a tela não deixaria dar continuaria podendo
    // vir da IA, de um salvamento antigo ou do gancho de inspeção.
    const faltam = rodadasAteOAssalto(
      mundo.impedeAssaltoImediato(provincia),
      meu ? cerco.rodadas : 0,
      ajustes.cerco,
    );
    const postura: Postura = pedida === 'assaltar' && faltam > 0 ? 'sitiar' : pedida;

    if (postura === 'assaltar') {
      assaltar(estado, provincia, hoste, milicianos, ajustes, mundo, relatorio, tomar, levantar);
      continue;
    }

    // ⚠️ **Sitiar NUNCA toma a cidade.** O exército acampa na divisa e fica. Enquanto
    // estiver ali a província não produz nem comercia — e é só isso que o cerco faz. Quem
    // toma é o assalto, e é essa separação que dá sentido a ter duas posturas: antes o
    // cerco acumulava progresso e abria os portões sozinho, o que fazia dele um assalto
    // lento em vez de outra coisa.
    // O relógio anda com o cerco: mais uma rodada para quem já estava sentado aqui, e zero
    // para quem acabou de chegar ou tomou o lugar de outro sitiante. Herdar o tempo do
    // exército anterior daria a praça de graça a quem chegasse depois do trabalho feito.
    const atual: Cerco = {
      sitiante: hoste.poder,
      postura: 'sitiar',
      rodadas: meu ? cerco.rodadas + 1 : 0,
    };
    estado.cercos[provincia] = atual;
    relatorio.cercos.push({ provincia, sitiante: hoste.poder, postura: 'sitiar', novo: !meu });
  }

  // Cerco sem sitiante em cima não existe: quem marchou embora ou morreu soltou a cidade.
  for (const provincia of Object.keys(estado.cercos)) {
    const sitiante = estado.cercos[provincia]?.sitiante;
    const emCima = Object.values(estado.hostes).some(
      (h) => h.posicao === provincia && h.poder === sitiante,
    );
    if (!emCima) levantar(provincia);
  }
}

/**
 * O ASSALTO — resolve no turno, contra a milícia com o bônus da muralha.
 *
 * ⚠️ **A milícia perdida é contada em HOMENS, não em unidades de defesa.** A defesa é
 * gente multiplicada pela muralha; sem desfazer a multiplicação, um assalto rechaçado
 * faria a população encolher pelo dobro do que de fato caiu.
 */
function assaltar(
  estado: EstadoDaResolucao,
  provincia: string,
  hoste: Exercito,
  milicianos: number,
  ajustes: Ajustes['jogo']['combate'],
  mundo: MundoDaResolucao,
  relatorio: {
    batalhas: RelatorioDaRodada['batalhas'][number][];
    conquistas: RelatorioDaRodada['conquistas'][number][];
    milicianosMortos: RelatorioDaRodada['milicianosMortos'][number][];
  },
  tomar: (provincia: string, poder: string) => void,
  levantar: (provincia: string) => void,
): void {
  const dono = mundo.donoDe(provincia);
  const atacantes = forcaDe(hoste);
  const defesa = defesaNoAssalto(milicianos, ajustes.cerco);
  const choque = resolverChoque(atacantes, defesa);

  const perder = (perdidos: number): void => {
    if (perdidos <= 0) return;
    mundo.miliciaPerdida(provincia, perdidos);
    relatorio.milicianosMortos.push({ provincia, mortos: perdidos });
  };

  if (choque.vencedor === 'a') {
    retirar(hoste, atacantes - choque.sobreviventes);
    perder(milicianos);
    relatorio.batalhas.push({
      provincia,
      vencedor: hoste.poder,
      perdedores: [dono],
      sobreviventes: choque.sobreviventes,
      tipo: 'assalto',
    });
    tomar(provincia, hoste.poder);
    return;
  }

  // Rechaçado: o exército de assalto se desfaz diante da muralha, e a cidade fica.
  delete estado.hostes[hoste.id];
  levantar(provincia);
  perder(
    choque.vencedor === 'b'
      ? milicianosPerdidos(milicianos, choque.sobreviventes, ajustes.cerco)
      : milicianos,
  );
  relatorio.batalhas.push({
    provincia,
    vencedor: choque.vencedor === 'b' ? dono : null,
    perdedores: choque.vencedor === 'b' ? [hoste.poder] : [hoste.poder, dono],
    sobreviventes:
      choque.vencedor === 'b' ? Math.floor(choque.sobreviventes / ajustes.cerco.bonusDeMuralha) : 0,
    tipo: 'assalto',
  });
}
