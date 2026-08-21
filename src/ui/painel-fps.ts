/** Sobreposição de diagnóstico: FPS, zoom e posição da câmera.
 *  Nasce oculta e aparece com F3 — diagnóstico não faz parte da interface do jogador. */

import type { Camera } from '@/nucleo/camera';
import type { Relogio } from '@/nucleo/tempo';

export class PainelFps {
  private readonly caixa = document.createElement('div');
  private visivel = false;
  private acumulado = 0;

  constructor(pai: HTMLElement) {
    this.caixa.className = 'painel-diagnostico';
    this.caixa.hidden = true;
    pai.appendChild(this.caixa);
  }

  alternar(): void {
    this.visivel = !this.visivel;
    this.caixa.hidden = !this.visivel;
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
