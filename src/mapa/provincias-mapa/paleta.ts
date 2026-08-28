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

  /**
   * Pinta o índice com a cor do dono.
   *
   * ⚠️ **Dono vazio é ZONA MARÍTIMA, e ela fica TRANSPARENTE.** A água não é de ninguém: ela
   * não recebe cor política, e o mar desenhado por baixo aparece inteiro. É o que faz o mapa
   * continuar sendo um mapa de reinos mesmo com 48 zonas navegáveis dentro dele.
   */
  escrever(indice: number, idPoder: string): void {
    const base = indice * 4;
    if (idPoder === '') {
      this.bytes[base] = 0;
      this.bytes[base + 1] = 0;
      this.bytes[base + 2] = 0;
      this.bytes[base + 3] = 0;
      this.suja = true;
      return;
    }
    const cor = this.corDoPoder.get(idPoder);
    if (!cor) throw new Error(`poder inexistente: ${idPoder}`);
    this.bytes[base] = cor[0];
    this.bytes[base + 1] = cor[1];
    this.bytes[base + 2] = cor[2];
    this.bytes[base + 3] = 255;
    this.suja = true;
  }

  /**
   * Pinta o índice com uma cor QUALQUER, fora da tabela de donos.
   *
   * ⚠️ **É o que faz o mapa ter mais de um assunto sem ter mais de uma camada.** O modo de
   * relações não pergunta "de quem é esta terra?", e sim "o que o dono dela acha daquele
   * reino?" — mesma textura, mesma fronteira, mesma malha; só o significado da cor muda.
   * `null` apaga o índice, e é o cinza do mar e de quem não entra na conta.
   */
  escreverCor(indice: number, cor: readonly [number, number, number] | null): void {
    const base = indice * 4;
    this.bytes[base] = cor?.[0] ?? 0;
    this.bytes[base + 1] = cor?.[1] ?? 0;
    this.bytes[base + 2] = cor?.[2] ?? 0;
    this.bytes[base + 3] = cor === null ? 0 : 255;
    this.suja = true;
  }

  /** Manda a paleta pra GPU, se ela mudou. */
  aplicar(): void {
    if (!this.suja) return;
    this.suja = false;
    this.fonte.update();
  }
}
