/**
 * Quem quer lutar, e quem é OBRIGADO a lutar.
 *
 * ⚠️ **Sitiar é declarar que não se quer lutar.** Quem senta na frente da cidade não joga o
 * exército contra a guarnição dela — acampa ao lado e espera. Sem isto, escolher sitiar
 * significava "lute com o exército deles e DEPOIS sente", que é o assalto com um passo a mais:
 * a decisão que a postura devia oferecer não existia.
 */

import type { Cerco, Postura } from '@/combate/cerco';
import type { Forca } from './forcas';
import type { EstadoDaResolucao } from './relatorio';

/** Ordens de poderes diferentes nunca compartilham a postura. */
export function chaveDaPostura(provincia: string, poder: string): string {
  return JSON.stringify([provincia, poder]);
}

/**
 * A postura que cada hoste levava ao chegar, por província de destino.
 *
 * Lida antes de qualquer fase porque as ordens são consumidas no caminho — e sem ela a cidade
 * não teria como saber se quem apareceu na fronteira veio assaltar ou sentar.
 */
export function posturasPorDestino(
  estado: EstadoDaResolucao,
  donoDe: (idProvincia: string) => string,
  saltosPorRodada: number,
): Map<string, Postura> {
  const posturas = new Map<string, Postura>();
  for (const idHoste of Object.keys(estado.ordens).sort()) {
    const ordem = estado.ordens[idHoste];
    const destino = ordem?.rota.at(-1);
    if (!ordem || destino === undefined) continue;
    // ⚠️ **Só quem CHEGA nesta rodada declara postura.** Um reforço ainda a dois turnos de
    // distância, mandado para sitiar, rebaixava o assalto já liberado de quem estava na frente
    // da cidade — e regravava o cerco do zero, sem que ninguém tivesse chegado.
    if (ordem.rota.length > saltosPorRodada) continue;
    // Reforço do dono não altera a postura de quem cerca a cidade.
    const poder = estado.hostes[idHoste]?.poder;
    if (poder === undefined || donoDe(destino) === poder) continue;
    const chave = chaveDaPostura(destino, poder);
    // Reforços do mesmo poder participam do assalto já ordenado.
    const cerco = estado.cercos[destino];
    const assaltoEmCurso = cerco?.sitiante === poder && cerco.postura === 'assaltar';
    if (ordem.postura === 'assaltar' || assaltoEmCurso || !posturas.has(chave)) {
      posturas.set(chave, assaltoEmCurso ? 'assaltar' : ordem.postura);
    }
  }
  return posturas;
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
 * As posturas são separadas por poder e destino: uma bandeira não comanda a outra.
 */
export function quemLuta(
  forca: Forca,
  donoDaProvincia: string,
  posturas: Map<string, Postura>,
  cercos: Record<string, Cerco>,
  /**
   * Esta posição é ÁGUA? No mar todo encontro é batalha, e não há escolha a fazer.
   *
   * ⚠️ **É o desenho de Henrique:** *"caso se encontre no mar com outro exército em alguma
   * zona, se for inimigo eles batalham sem conquistar nada, só se matam"*. E cai sozinho da
   * mecânica: sitiar é declarar que se espera a cidade cair pela fome, e no mar não há
   * cidade, não há despensa e não há o que esperar. Sem isto, duas frotas inimigas ficariam
   * ancoradas lado a lado no mesmo golfo para sempre.
   */
  ehMar = false,
): boolean {
  if (ehMar) return true;
  if (donoDaProvincia === forca.poder) return true;
  const pelaOrdem = posturas.get(chaveDaPostura(forca.posicao, forca.poder));
  if (pelaOrdem) return pelaOrdem === 'assaltar';
  // ⚠️ **No meio do caminho, a postura é a da própria marcha.** A ordem longa não registra
  // postura no destino (ver `posturasPorDestino`), e sem esta linha o exército que vai assaltar
  // lá adiante atravessava calado o inimigo que o esperava numa província do caminho — os dois
  // marchando e nenhum lutando. A cidade do caminho continua fora disto: ela só lê `posturas`.
  const destino = forca.ordem?.rota.at(-1);
  if (forca.ordem && destino !== undefined && destino !== forca.posicao) {
    return forca.ordem.postura === 'assaltar';
  }
  const cerco = cercos[forca.posicao];
  if (cerco?.sitiante === forca.poder) return cerco.postura === 'assaltar';
  // Chegou em terra alheia sem dizer nada: senta. Mesmo padrão que a cidade já usava — quem
  // não declarou não joga o exército contra ninguém por conta própria.
  return false;
}

/**
 * As províncias onde alguém declarou surtida, pelas hostes que a declararam.
 *
 * Por província e não por hoste porque é assim que o choque pensa: participação já é decidida
 * por PODER e por LUGAR. Se uma hoste do defensor sai para lutar, as outras dele que estão ali
 * saem junto — um exército não assiste ao massacre do vizinho de acampamento por causa de uma
 * ordem diferente.
 */
export function provinciasEmSurtida(estado: EstadoDaResolucao): ReadonlySet<string> {
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
 * ⚠️ **É a resposta do defensor.** Sitiar é declarar que não se quer lutar, e sem uma forma de
 * obrigar, sitiante e sitiado ficariam acampados lado a lado para sempre — o cerco seria
 * inquebrável por armas, e só a fome o desfaria.
 *
 * O dono da terra obriga o choque de **duas** formas, e as duas exigem um cerco em curso:
 *
 * 1. **surtindo de dentro** — a hoste que está na cidade declara a surtida e sai;
 * 2. **chegando de fora** — o exército de socorro que entra na província sitiada já vem lutar.
 *    Não há o que declarar: mandar tropa para uma cidade cercada é atacar quem a cerca. Sem
 *    isto o socorro entrava e acampava ao lado do inimigo sem tocá-lo.
 *
 * Obriga TODO MUNDO que estiver ali, e não só os dois interessados: quem está acampado numa
 * província onde a batalha começou está na batalha.
 */
export function choqueObrigadoEm(
  provincia: string,
  presentes: readonly Forca[],
  emSurtida: ReadonlySet<string>,
  cercos: Record<string, Cerco>,
  donoDe: (idProvincia: string) => string,
): boolean {
  // Sem cerco não há a quem obrigar: quem chega em terra própria sem inimigo sentado nela só
  // está reforçando a guarnição.
  if (cercos[provincia] === undefined) return false;
  if (emSurtida.has(provincia)) return true;
  const dono = donoDe(provincia);
  return presentes.some((f) => f.viva && f.poder === dono && f.posicao !== f.partiuDe);
}
