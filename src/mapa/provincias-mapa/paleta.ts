/**
 * A paleta de donos: **conquistar território é escrever quatro bytes aqui.**
 *
 * O chuveirinho lê a cor do dono nesta textura de 256×256, endereçada pelo índice da
 * província. Nada de regerar imagem, nada de remontar geometria, nada de polígono.
 *
 * O envio para a GPU é drenado uma vez por quadro, e não a cada escrita: `update()` reenvia
 * 256 KB, e sem essa guarda vinte conquistas numa virada de turno seriam vinte envios.
 */

import { BufferImageSource } from 'pixi.js';

/** Lado da paleta. 256×256 endereça 65.536 províncias, o teto do formato do índice. */
const LADO = 256;

/** Índice reservado: mar, e a terra que nenhuma província reivindicou. */
export const NENHUMA = 0;

export function separarCor(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

export class PaletaDeDonos {
  private readonly bytes = new Uint8Array(LADO * LADO * 4);
  private readonly corDoPoder = new Map<string, [number, number, number]>();
  /** A paleta mudou desde o último envio? Drenada uma vez por quadro. */
  private suja = false;

  readonly fonte: BufferImageSource;

  constructor(poderes: readonly { id: string; cor: string }[]) {
    for (const poder of poderes) this.corDoPoder.set(poder.id, separarCor(poder.cor));
    this.fonte = new BufferImageSource({
      resource: this.bytes,
      width: LADO,
      height: LADO,
      format: 'rgba8unorm',
      scaleMode: 'nearest',
      alphaMode: 'no-premultiply-alpha',
    });
  }

  escrever(indice: number, idPoder: string): void {
    const cor = this.corDoPoder.get(idPoder);
    if (!cor) throw new Error(`poder inexistente: ${idPoder}`);
    const base = indice * 4;
    this.bytes[base] = cor[0];
    this.bytes[base + 1] = cor[1];
    this.bytes[base + 2] = cor[2];
    this.bytes[base + 3] = 255;
    this.suja = true;
  }

  /** Manda a paleta pra GPU, se ela mudou. */
  aplicar(): void {
    if (!this.suja) return;
    this.suja = false;
    this.fonte.update();
  }
}
