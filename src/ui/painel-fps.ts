/** Sobreposição de diagnóstico: FPS, zoom e posição da câmera.
 *  Some com F3. */

import type { Camera } from '@/nucleo/camera';
import type { Relogio } from '@/nucleo/tempo';

export class PainelFps {
  private readonly caixa = document.createElement('div');
  private visivel = true;
  private acumulado = 0;

  constructor(pai: HTMLElement) {
    this.caixa.className = 'painel-diagnostico';
    pai.appendChild(this.caixa);
  }

  alternar(): void {
    this.visivel = !this.visivel;
    this.caixa.style.display = this.visivel ? '' : 'none';
  }

  atualizar(relogio: Relogio, camera: Camera): void {
    if (!this.visivel) return;
    this.acumulado += relogio.delta;
    if (this.acumulado < 0.2) return;
    this.acumulado = 0;
    this.caixa.textContent =
      `${relogio.fps.toFixed(0)} fps · zoom ${camera.zoom.toFixed(2)} · ` +
      `x ${camera.x.toFixed(0)} y ${camera.y.toFixed(0)}`;
  }
}
