/**
 * Os dois SVG que viram a arte do mapa: o visual e o de navegação.
 *
 * O de navegação não é ilustração — é dado: preto é terra, branco é mar, e é essa imagem
 * que o resto do gerador lê para saber onde a terra está.
 */

import {
  ALTURA_MAPA,
  LARGURA_FAIXA_COSTEIRA,
  LARGURA_LINHA_COSTEIRA,
  RESOLUCAO_ALTURA,
  RESOLUCAO_ARTE,
  TAMANHO,
} from './moldura';

export function svgMapa(costa: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${RESOLUCAO_ARTE}" height="${RESOLUCAO_ALTURA}" viewBox="0 0 ${TAMANHO} ${ALTURA_MAPA}">
  <defs>
    <linearGradient id="mar" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#879d9a"/><stop offset="1" stop-color="#718986"/>
    </linearGradient>
    <linearGradient id="terra" x1="0" y1="0" x2="0.8" y2="1">
      <stop offset="0" stop-color="#d8c9a5"/><stop offset="1" stop-color="#bfae86"/>
    </linearGradient>
    <pattern id="ondas" width="96" height="96" patternUnits="userSpaceOnUse">
      <path d="M8 52 Q24 44 40 52 T72 52" fill="none" stroke="#e1dac5" stroke-width="3" opacity=".12"/>
    </pattern>
    <pattern id="tracos-terra" width="240" height="200" patternUnits="userSpaceOnUse" patternTransform="rotate(-7)">
      <path d="M18 62 l28 -8 M26 72 l24 -7 M132 140 l30 -9 M141 151 l25 -7" fill="none" stroke="#665a43" stroke-width="2" stroke-linecap="round" opacity=".11"/>
      <circle cx="188" cy="42" r="3" fill="#665a43" opacity=".1"/>
      <circle cx="74" cy="164" r="2.5" fill="#665a43" opacity=".09"/>
    </pattern>
    <filter id="papel" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency=".006 .018" numOctaves="3" seed="73" result="ruido"/>
      <feBlend in="SourceGraphic" in2="ruido" mode="soft-light"/>
    </filter>
  </defs>
  <rect width="${TAMANHO}" height="${ALTURA_MAPA}" fill="url(#mar)"/>
  <rect width="${TAMANHO}" height="${ALTURA_MAPA}" fill="url(#ondas)"/>
  <path d="${costa}" fill="none" stroke="#b6c3b9" stroke-width="${LARGURA_FAIXA_COSTEIRA}" stroke-linejoin="round" stroke-linecap="round" opacity=".65"/>
  <path d="${costa}" fill="url(#terra)" fill-rule="evenodd" stroke="#4b4435" stroke-width="${LARGURA_LINHA_COSTEIRA}" stroke-linejoin="round"/>
  <path d="${costa}" fill="url(#tracos-terra)" fill-rule="evenodd"/>
  <rect width="${TAMANHO}" height="${ALTURA_MAPA}" fill="#b79f72" opacity=".14" filter="url(#papel)"/>
  <rect x="13" y="13" width="${TAMANHO - 26}" height="${ALTURA_MAPA - 26}" fill="none" stroke="#2a2118" stroke-width="8" opacity=".65"/>
</svg>`;
}

export function svgNavegacao(costa: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${TAMANHO}" height="${ALTURA_MAPA}" viewBox="0 0 ${TAMANHO} ${ALTURA_MAPA}">
  <rect width="${TAMANHO}" height="${ALTURA_MAPA}" fill="#000"/>
  <path d="${costa}" fill="#fff" fill-rule="evenodd" stroke="#fff" stroke-width="${LARGURA_LINHA_COSTEIRA}" stroke-linejoin="round" stroke-linecap="round"/>
</svg>`;
}
