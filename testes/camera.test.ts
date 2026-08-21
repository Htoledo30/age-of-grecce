import { describe, expect, it } from 'vitest';
import { Camera } from '../src/nucleo/camera';
import { ALTURA_BASE, LARGURA_BASE } from '../src/estilo/escala';

describe('Camera', () => {
  it('o centro da câmera cai no centro do palco', () => {
    const c = new Camera();
    c.x = 500;
    c.y = 300;
    c.zoom = 2;
    expect(c.mundoParaPalco(500, 300)).toEqual({ x: LARGURA_BASE / 2, y: ALTURA_BASE / 2 });
  });

  it('converter ida e volta devolve o mesmo ponto', () => {
    const c = new Camera();
    c.x = 1234;
    c.y = -87;
    c.zoom = 0.63;
    const palco = c.mundoParaPalco(2000, 900);
    const volta = c.palcoParaMundo(palco.x, palco.y);
    expect(volta.x).toBeCloseTo(2000, 6);
    expect(volta.y).toBeCloseTo(900, 6);
  });

  it('aproximar mantém fixo o ponto do mundo sob o cursor', () => {
    const c = new Camera();
    const cursor = { x: 300, y: 200 };
    const antes = c.palcoParaMundo(cursor.x, cursor.y);
    c.aproximar(1.5, cursor.x, cursor.y);
    const depois = c.palcoParaMundo(cursor.x, cursor.y);
    expect(depois.x).toBeCloseTo(antes.x, 6);
    expect(depois.y).toBeCloseTo(antes.y, 6);
  });

  it('respeita zoom máximo', () => {
    const c = new Camera();
    c.zoomMaximo = 4;
    for (let i = 0; i < 50; i++) c.aproximar(2, 0, 0);
    expect(c.zoom).toBe(4);
  });

  it('respeita zoom máximo já ao prender a câmera ao mundo', () => {
    const c = new Camera();
    c.zoomMaximo = 0.4;
    c.prenderAoMundo(12_288, 8_256);
    expect(c.zoom).toBe(0.4);
  });

  it('o zoom mínimo é o que faz o mapa inteiro caber na tela', () => {
    const c = new Camera();
    c.prenderAoMundo(4096, 4096);
    expect(c.zoomMinimo).toBeCloseTo(ALTURA_BASE / 4096, 6);
    for (let i = 0; i < 50; i++) c.aproximar(0.5, 0, 0);
    expect(c.zoom).toBeCloseTo(ALTURA_BASE / 4096, 6);
  });

  it('a vista nunca sai do mapa', () => {
    const c = new Camera();
    c.prenderAoMundo(4096, 4096);
    c.zoom = 1;
    c.arrastar(99_999, 99_999);
    expect(c.x).toBe(LARGURA_BASE / 2);
    expect(c.y).toBe(ALTURA_BASE / 2);
    c.arrastar(-99_999, -99_999);
    expect(c.x).toBe(4096 - LARGURA_BASE / 2);
    expect(c.y).toBe(4096 - ALTURA_BASE / 2);
  });

  it('quando a vista é maior que o mapa num eixo, centraliza nele', () => {
    const c = new Camera();
    c.prenderAoMundo(4096, 1000);
    c.zoom = c.zoomMinimo;
    c.arrastar(0, 5000);
    expect(c.y).toBeCloseTo(500, 6);
  });
});
