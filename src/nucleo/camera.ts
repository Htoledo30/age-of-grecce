/** Câmera do mapa: converte entre coordenadas do mundo e do palco (1920x1080).
 *
 *  Quando um mundo é definido por `prenderAoMundo`, o zoom mínimo mostra o mapa
 *  inteiro. Em aproximações maiores, a posição é presa aos limites do mundo. */

import { alturaDoPalco, larguraDoPalco } from '@/estilo/escala';

export class Camera {
  /** Ponto do mundo que está no centro da tela. */
  x = 0;
  y = 0;
  zoom = 1;

  zoomMinimo = 0.25;
  zoomMaximo = 8;

  private mundoLargura = 0;
  private mundoAltura = 0;

  /** Define os limites e ajusta o zoom mínimo para o mapa inteiro caber na tela. */
  prenderAoMundo(largura: number, altura: number): void {
    this.mundoLargura = largura;
    this.mundoAltura = altura;
    this.zoomMinimo = Math.min(larguraDoPalco() / largura, alturaDoPalco() / altura);
    this.zoom = Math.min(this.zoomMaximo, Math.max(this.zoom, this.zoomMinimo));
    this.prender();
  }

  mundoParaPalco(mx: number, my: number): { x: number; y: number } {
    return {
      x: (mx - this.x) * this.zoom + larguraDoPalco() / 2,
      y: (my - this.y) * this.zoom + alturaDoPalco() / 2,
    };
  }

  palcoParaMundo(px: number, py: number): { x: number; y: number } {
    return {
      x: (px - larguraDoPalco() / 2) / this.zoom + this.x,
      y: (py - alturaDoPalco() / 2) / this.zoom + this.y,
    };
  }

  /** Move a câmera por um deslocamento medido em pixels do palco. */
  arrastar(dxPalco: number, dyPalco: number): void {
    this.x -= dxPalco / this.zoom;
    this.y -= dyPalco / this.zoom;
    this.prender();
  }

  /** Move a câmera em unidades de mundo. */
  mover(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
    this.prender();
  }

  /** Aproxima/afasta mantendo fixo o ponto do mundo que está sob o cursor. */
  aproximar(fator: number, palcoX: number, palcoY: number): void {
    const antes = this.palcoParaMundo(palcoX, palcoY);
    this.zoom = Math.min(this.zoomMaximo, Math.max(this.zoomMinimo, this.zoom * fator));
    const depois = this.palcoParaMundo(palcoX, palcoY);
    this.x += antes.x - depois.x;
    this.y += antes.y - depois.y;
    this.prender();
  }

  private prender(): void {
    if (this.mundoLargura <= 0 || this.mundoAltura <= 0) return;
    const meiaLargura = larguraDoPalco() / 2 / this.zoom;
    const meiaAltura = alturaDoPalco() / 2 / this.zoom;
    this.x = prenderEixo(this.x, meiaLargura, this.mundoLargura);
    this.y = prenderEixo(this.y, meiaAltura, this.mundoAltura);
  }
}

function prenderEixo(valor: number, meia: number, tamanho: number): number {
  // vista maior que o mapa naquele eixo: centraliza em vez de prender
  if (meia * 2 >= tamanho) return tamanho / 2;
  return Math.min(tamanho - meia, Math.max(meia, valor));
}
