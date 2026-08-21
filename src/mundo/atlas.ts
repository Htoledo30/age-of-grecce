/**
 * O mundo assado, indexado e **imutável**: geografia e identidade, nunca partida.
 *
 * Aqui mora tudo o que `npm run gerar-provincias` produziu e que nenhuma campanha muda —
 * índice, nome, região, área, centro, vizinhança por terra, e a lista de poderes com
 * nome, povo e cor. O dono que vem no arquivo assado é lido como **dono INICIAL**: é a
 * condição de 700 a.C., não a verdade corrente. Quem sabe de quem é a província hoje é a
 * campanha.
 *
 * Existe separado por dois motivos, e os dois são estruturais:
 *
 * 1. **É leitura pura.** Campanha, combate e diplomacia todos precisam perguntar "quem
 *    faz fronteira com quem" e "como se chama isto". Se cada um montar o próprio índice,
 *    a mesma verdade passa a viver em três lugares e um dia dois discordam.
 * 2. **Separa o que muda do que não muda.** O estado da campanha é o que vai pro disco;
 *    o atlas é o que se remonta do arquivo assado a qualquer momento. Guardar geografia
 *    no salvamento seria gravar de novo o que já está em `assets/mundo/`.
 *
 * Não importa Pixi e não toca no DOM: roda no vitest contra o `provincias.json` de
 * verdade.
 */

import type { Provincias } from '@/dados/esquema';

type Provincia = Provincias['provincias'][number];
type Poder = Provincias['poderes'][number];

/**
 * A digital do recorte que uma partida está usando.
 *
 * Serve pra recusar um salvamento feito noutro mapa. Carregar uma campanha gravada sobre
 * um recorte com a fronteira movida não dá erro nenhum por conta própria: dá uma partida
 * silenciosamente errada, com província que mudou de vizinha e dono que aponta pra
 * lugar nenhum.
 */
export interface ImpressaoDigital {
  epoca: string;
  provincias: number;
  poderes: number;
}

export class Atlas {
  private readonly porIdProvincia = new Map<string, Provincia>();
  private readonly porIndiceProvincia = new Map<number, Provincia>();
  private readonly porIdPoder = new Map<string, Poder>();
  /** Componente de terra de cada província. Ilha é componente próprio. */
  private readonly componente = new Map<string, number>();
  private readonly quantosComponentes: number;

  readonly provincias: readonly Provincia[];
  readonly poderes: readonly Poder[];
  readonly impressaoDigital: ImpressaoDigital;

  constructor(dados: Provincias) {
    this.provincias = dados.provincias;
    this.poderes = dados.poderes;

    for (const poder of dados.poderes) this.porIdPoder.set(poder.id, poder);
    for (const p of dados.provincias) {
      this.porIdProvincia.set(p.id, p);
      this.porIndiceProvincia.set(p.indice, p);
    }

    // Conferir a integridade AQUI, uma vez, e não em cada consumidor: dono inexistente e
    // vizinha inexistente são erro de geração, e têm que estourar na carga com o nome do
    // culpado em vez de virar `undefined` no meio de uma regra.
    for (const p of dados.provincias) {
      if (!this.porIdPoder.has(p.dono)) {
        throw new Error(`província "${p.nome}" tem dono inexistente: ${p.dono}`);
      }
      for (const vizinha of p.vizinhas) {
        if (!this.porIdProvincia.has(vizinha)) {
          throw new Error(`província "${p.nome}" aponta pra vizinha inexistente: ${vizinha}`);
        }
      }
    }

    this.quantosComponentes = this.mapearComponentes();

    this.impressaoDigital = {
      epoca: dados.epoca,
      provincias: dados.provincias.length,
      poderes: dados.poderes.length,
    };
  }

  /**
   * Marca cada província com o componente de terra a que ela pertence.
   *
   * É o que distingue "ilha" de "interior" sem nenhuma regra especial: uma província cujo
   * componente tem tamanho 1 não faz fronteira com ninguém, e Creta inteira é um
   * componente de oito. O mar vai precisar disso pra saber onde uma travessia é travessia
   * de verdade, em vez de um atalho por cima de um vizinho terrestre.
   */
  private mapearComponentes(): number {
    let atual = 0;
    for (const inicio of this.provincias) {
      if (this.componente.has(inicio.id)) continue;
      const fila = [inicio.id];
      this.componente.set(inicio.id, atual);
      while (fila.length > 0) {
        const id = fila.pop();
        if (id === undefined) break;
        for (const vizinha of this.provincia(id).vizinhas) {
          if (this.componente.has(vizinha)) continue;
          this.componente.set(vizinha, atual);
          fila.push(vizinha);
        }
      }
      atual += 1;
    }
    return atual;
  }

  existe(idProvincia: string): boolean {
    return this.porIdProvincia.has(idProvincia);
  }

  existePoder(idPoder: string): boolean {
    return this.porIdPoder.has(idPoder);
  }

  /** A província, ou estoura. Id inválido é erro de programação, não caso de uso. */
  provincia(idProvincia: string): Provincia {
    const p = this.porIdProvincia.get(idProvincia);
    if (!p) throw new Error(`província inexistente: ${idProvincia}`);
    return p;
  }

  poder(idPoder: string): Poder {
    const p = this.porIdPoder.get(idPoder);
    if (!p) throw new Error(`poder inexistente: ${idPoder}`);
    return p;
  }

  /** A província com este índice de `provincias.png`, ou `undefined` se for o mar (0). */
  porIndice(indice: number): Provincia | undefined {
    return this.porIndiceProvincia.get(indice);
  }

  nomeDe(idProvincia: string): string {
    return this.provincia(idProvincia).nome;
  }

  vizinhasDe(idProvincia: string): readonly string[] {
    return this.provincia(idProvincia).vizinhas;
  }

  /** Quem governava isto em 700 a.C. A campanha é quem sabe de quem é agora. */
  donoInicial(idProvincia: string): string {
    return this.provincia(idProvincia).dono;
  }

  saoVizinhasPorTerra(a: string, b: string): boolean {
    return this.provincia(a).vizinhas.includes(b);
  }

  /** Nenhuma vizinha por terra: só se chega aqui pelo mar. São 35 das 205. */
  semVizinhaPorTerra(idProvincia: string): boolean {
    return this.provincia(idProvincia).vizinhas.length === 0;
  }

  /** Duas províncias no mesmo pedaço de terra contínuo. */
  mesmoContinente(a: string, b: string): boolean {
    return this.componenteDe(a) === this.componenteDe(b);
  }

  componenteDe(idProvincia: string): number {
    const c = this.componente.get(idProvincia);
    if (c === undefined) throw new Error(`província inexistente: ${idProvincia}`);
    return c;
  }

  /** Quantos pedaços de terra desconexos o mapa tem. Hoje, 38. */
  get componentes(): number {
    return this.quantosComponentes;
  }
}
