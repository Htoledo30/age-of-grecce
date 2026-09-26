/**
 * A moeda ateniense: **o mesmo desenho em toda tela que fala de ouro.**
 *
 * A barra do topo usa a arte da dracma desde que ela foi feita; Construções e Recrutar usavam
 * um ícone de traço no lugar. Henrique: *"o símbolo da moeda tem que ser o mesmo que aparece na
 * UI principal — fizemos a imagem para ser usada"*.
 */
export function moedaAteniense(classe = ''): HTMLElement {
  const moeda = document.createElement('span');
  moeda.className = classe ? `moeda-ateniense ${classe}` : 'moeda-ateniense';
  moeda.setAttribute('aria-hidden', 'true');
  return moeda;
}
